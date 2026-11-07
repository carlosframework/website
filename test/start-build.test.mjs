import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStart, renderMarkdown } from '../hack/build-start.mjs';
import { renderAgent } from '../hack/start-content.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
import { addFooter } from '../hack/add-footer.mjs';
const read=p=>readFile(p,'utf8');
const env={CARLOS_START_DEMO:'1',CARLOS_START_SITE_ORIGIN:'https://site.example.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.example.com',CARLOS_START_ACCOUNT_URL:'https://console.example.com/'};
const config=loadStartConfig(env);
const base=process.env.STARTER_SCRATCH || tmpdir();
assert.ok(!/^\/tmp(?:\/|$)/.test(base),'use disk scratch');
async function scratch(fn) {await mkdir(base,{recursive:true});const dir=await mkdtemp(join(base,'start-build-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}}
async function files(dir) {const result=[];for(const e of await readdir(dir,{withFileTypes:true})){if(e.isDirectory())result.push(...(await files(join(dir,e.name))).map(p=>e.name+'/'+p));else result.push(e.name);}return result.sort();}
test('one rendered Markdown source, complete visible HTML twin and explicit starter inventory',()=>scratch(async dir=>{
 await buildStart(dir,config);
 const markdown=await read(join(dir,'start/index.md'));
 const contract=JSON.parse(await read('src/_data/start-claim-contract.json'));
 const starter=JSON.parse(await read('src/start/starter/v1/manifest.json'));
 assert.equal(markdown,renderAgent(await read('src/start/agent.md'),config,contract,starter));
 const html=await read(join(dir,'start/index.html'));
 assert.equal(html.split('<!-- agent-content -->')[1].split('<!-- /agent-content -->')[0],renderMarkdown(markdown));
 assert.match(html,/<section[^>]*id="for-your-agent"/);
 assert.ok(html.indexOf('Paste this line')<html.indexOf('id="for-your-agent"'));
 assert.doesNotMatch(html.split('id="for-your-agent"')[1],/<details|<[^>]*\bhidden\b|<[^>]*display:\s*none/);
 assert.doesNotMatch(markdown,/\{\{/);
 assert.deepEqual(await files(join(dir,'start/starter')),['v1/manifest.json','v1/source.json','v1/source.tar.gz']);
 for(const file of ['manifest.json','source.json','source.tar.gz']) assert.deepEqual(await readFile(join(dir,'start/starter/v1',file)),await readFile('src/start/starter/v1/'+file));
 assert.doesNotMatch((await files(dir)).join('\n'),/agent\.md|start-config|claim-contract|go\.mod|templates\/|main\.go/);
 assert.equal(renderMarkdown('<script>bad()</script>\n'),'<p>&lt;script&gt;bad()&lt;/script&gt;</p>\n');
}));
test('disabled pages match original build bytes; reused output loses all anonymous files',()=>scratch(async dir=>{
 await buildStart(dir,config);
 await writeFile(join(dir,'start/agent.md'),'stale raw template');
 await mkdir(join(dir,'start/agent'),{recursive:true});
 await writeFile(join(dir,'start/agent/index.html'),'stale accidental Eleventy output');
 await buildStart(dir,loadStartConfig({}));
 assert.deepEqual(await files(join(dir,'start')),['index.html','start-tabs.js','start.css']);
 await addFooter(dir);
 const baseline=JSON.parse(await read('test/fixtures/start-baseline.json'));
 for(const name of ['index.html','start/index.html']) {
  const bytes=await readFile(join(dir,name));
  assert.doesNotMatch(bytes.toString(),/start-hosts|If your agent has limited network access/);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),baseline[name],name);
 }
}));
test('kept-app deep link and copy commands survive either claim mode',()=>scratch(async dir=>{
 for(const claimOff of [false,true]) {
  await buildStart(dir,{...config,claimOff});
  const markdown=await read(join(dir,'start/index.md'));
  const html=await read(join(dir,'start/index.html'));
  assert.ok(markdown.indexOf('](#after-you-keep-it)')<markdown.indexOf('## 1. Ask before building'));
  assert.match(markdown,/^## After you keep it \{#after-you-keep-it\}$/m);
  assert.equal((html.match(/id="after-you-keep-it"/g)||[]).length,1);
  const section=html.match(/<section class="start-keep"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(section,/<details|\bhidden\b/);
  const commands=[...markdown.split('{#after-you-keep-it}')[1].matchAll(/```sh\n([\s\S]*?)\n```/g)].map(m=>m[1]);
  assert.equal(commands.length,3);
  assert.match(commands[0],/^carlos auth login --console '<console>'$/);
  assert.match(commands[1],/carlos apps source pull --console '<console>' --account-id '<sqid>' --app '<app>'/);
  assert.match(commands[1],/tar --no-same-owner --no-same-permissions/);
  assert.match(commands[2],/CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -trimpath -buildvcs=false -o app \./);
  assert.match(commands[2],/--channel edge --kind binary --target linux-arm64 --version v1 --swap hold --no-assets \.\/app$/);
  assert.doesNotMatch(commands.join('\n'),/apps create|\/api\/demo/);
  for(const [i,command] of commands.entries()) {
   const escaped=command.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll("'",'&#39;');
   assert.ok(section.includes(`<code id="start-keep-step-${i+1}">${escaped}</code>`));
   assert.ok(section.includes(`data-copy-target="start-keep-step-${i+1}"`));
  }
 }
}));
test('claim-off matches regenerated enabled baselines',()=>scratch(async dir=>{
 const baseline=JSON.parse(await read('test/fixtures/start-enabled-baseline.json'));
 for(const {env,hashes} of baseline.cases) {
  await buildStart(dir,loadStartConfig(env));
  const original=new Map();
  for(const name of await files(dir)) original.set(name,await readFile(join(dir,name)));
  for(const [name,hash] of Object.entries(hashes)) {
   const text=original.get(name);
   assert.equal(createHash('sha256').update(text).digest('hex'),hash,`${name}, ${JSON.stringify(env)}`);
  }
  await buildStart(dir,loadStartConfig({...env,CARLOS_START_API_ORIGIN:env.CARLOS_START_CONSOLE_ORIGIN}));
  assert.deepEqual(await files(dir),[...original.keys()]);
  for(const [name,bytes] of original) assert.deepEqual(await readFile(join(dir,name)),bytes,name);
 }
}));
test('claim-off builds identical Markdown and visible HTML without claim instructions or Keep it',()=>scratch(async dir=>{
 await buildStart(dir,config);
 const normalHTML=await read(join(dir,'start/index.html'));
 const normalHome=await read(join(dir,'index.html'));
 const off=loadStartConfig({...env,CARLOS_START_CLAIM:'off'});
 await buildStart(dir,off);
 const markdown=await read(join(dir,'start/index.md'));
 const html=await read(join(dir,'start/index.html'));
 const starter=JSON.parse(await read('src/start/starter/v1/manifest.json'));
 const contract=JSON.parse(await read('src/_data/start-claim-contract.json'));
 const copy=JSON.parse(await read('src/_data/start-copy.json'));
 assert.equal(markdown,renderAgent(await read('src/start/agent.md'),off,undefined,starter));
 assert.equal(html.split('<!-- agent-content -->')[1].split('<!-- /agent-content -->')[0],renderMarkdown(markdown));
 for(const text of [markdown,html]) {
  assert.doesNotMatch(text,/claims|flowToken|Contract producer/);
  assert.ok(!text.includes(contract.producerCommit));
 }
 const withoutAgent=text=>text.replace(/<!-- agent-content -->[\s\S]*?<!-- \/agent-content -->/,'');
 for(const text of copy['start.claim']) assert.ok(!withoutAgent(html).includes(text));
 assert.equal(withoutAgent(html),withoutAgent(normalHTML).replace(`<h2>${copy['start.claim'][0]}</h2>\n<p>${copy['start.claim'][1]}</p>\n`,''));
 assert.equal(await read(join(dir,'index.html')),normalHome);
}));
test('enabled build accepts the merged contract and refuses invalid origins',()=>scratch(async dir=>{
 await buildStart(dir,config);
 for(const key of ['CARLOS_START_SITE_ORIGIN','CARLOS_START_CONSOLE_ORIGIN','CARLOS_START_ACCOUNT_URL']) assert.throws(()=>loadStartConfig({...env,[key]:undefined}));
}));
test('Eleventy refuses claim-off without the demo',()=>scratch(async dir=>{
 const {spawnSync}=await import('node:child_process');
 const clean={...process.env};for(const key of Object.keys(clean)) if(key.startsWith('CARLOS_START_')) delete clean[key];
 for(const [inputs,message] of [
  [{CARLOS_START_CLAIM:'off'},/requires CARLOS_START_DEMO=1/],
 ]) {
  const result=spawnSync(process.execPath,['node_modules/@11ty/eleventy/cmd.cjs',`--output=${dir}`],{env:{...clean,...inputs},encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stdout+result.stderr,message);
 }
}));

test('Eleventy integration: enabled then disabled rebuild keeps main pages byte-identical',()=>scratch(async dir=>{
 const {spawnSync}=await import('node:child_process');
 const build=(enabled,overrides={})=>{
  const clean={...process.env};for(const key of Object.keys(clean)) if(key.startsWith('CARLOS_START_')) delete clean[key];
  const result=spawnSync(process.execPath,['node_modules/@11ty/eleventy/cmd.cjs',`--output=${dir}`],{env:{...clean,...(enabled?env:{}),...overrides},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr+'\n'+result.stdout);
 };
 build(true);
 assert.match(await read(join(dir,'llms.txt')),/New small apps/);
 assert.ok((await read(join(dir,'start/index.md'))).includes('https://site.example.com/start/starter/v1/source.tar.gz'));
 let inventory=await files(dir);
 assert.ok(inventory.includes('docs/cli.md'));
 assert.ok(inventory.includes('.well-known/agent-skills/index.json'));
 assert.doesNotMatch(inventory.join('\n'),/start\/agent|start\/starter\/v1\/main.go|start-config|start-copy|start-claim-contract|ai-disclaimer/);
 for(const name of inventory.filter(name=>name.endsWith('.html'))) {
  const page=await read(join(dir,name));
  assert.doesNotMatch(page,/ai-disclaimer|site-footer:disclosure|Before you continue\.\.\.|CARLOS is an AI-enabled project|full disclosure of AI use/);
 }
 build(true,{CARLOS_START_CLAIM:'off',});
 const markdown=await read(join(dir,'start/index.md'));
 const html=await read(join(dir,'start/index.html'));
 assert.match(markdown,/Claiming is not available on this deployment/);
 assert.doesNotMatch(markdown,/claims|flowToken/);
 assert.doesNotMatch(html,/claims|flowToken|<h2>Keep it<\/h2>/);
 assert.equal(html.split('<!-- agent-content -->')[1].split('<!-- /agent-content -->')[0],renderMarkdown(markdown));
 build(false);
 const baseline=JSON.parse(await read('test/fixtures/start-baseline.json'));
 for(const name of Object.keys(baseline)) assert.equal(createHash('sha256').update(await readFile(join(dir,name))).digest('hex'),baseline[name]);
 assert.deepEqual(await files(join(dir,'start')),['index.html','start-tabs.js','start.css']);
 assert.doesNotMatch(await read(join(dir,'llms.txt')),/New small apps/);
}));

test('enabled homepage preserves everything outside the two sections and metadata',()=>scratch(async dir=>{
 await buildStart(dir,config);
 const source=await read('src/index.html'), home=await read(join(dir,'index.html'));
 const regions=[...source.matchAll(/<!-- start-demo:(hero|parts) -->([\s\S]*?)<!-- \/start-demo:\1 -->/g)];
 assert.equal(regions.length,2);
 const rest=source.slice(source.indexOf('<!-- /start-demo:parts -->')+'<!-- /start-demo:parts -->'.length);
 assert.ok(home.endsWith(rest));
 assert.equal(home.match(/<header[\s\S]*?<\/header>/)[0],source.match(/<header[\s\S]*?<\/header>/)[0]);
 assert.doesNotMatch(home,/start-demo:(hero|parts)/);
 await buildStart(dir,loadStartConfig({}));
 assert.equal(await read(join(dir,'index.html')),source.replace(/<!-- \/?start-demo:(?:hero|parts) -->/g,''));
}));
