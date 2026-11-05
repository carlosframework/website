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
import { addDisclaimer } from '../hack/add-disclaimer.mjs';
const read=p=>readFile(p,'utf8');
const env={CARLOS_START_DEMO:'1',CARLOS_START_CLAIM_DRAFT:'1',CARLOS_START_SITE_ORIGIN:'https://site.example.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.example.com',CARLOS_START_ACCOUNT_URL:'https://console.example.com/'};
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
 assert.doesNotMatch(html.split('id="for-your-agent"')[1],/<details|\bhidden\b|display:\s*none/);
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
 assert.deepEqual(await files(join(dir,'start')),['index.html']);
 await addFooter(dir);await addDisclaimer(dir);
 const baseline=JSON.parse(await read('test/fixtures/start-baseline.json'));
 for(const name of ['index.html','start/index.html']) {
  const bytes=await readFile(join(dir,name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),baseline[name],name);
 }
}));
test('claim-off builds identical Markdown and visible HTML without claim instructions or Keep it',()=>scratch(async dir=>{
 await buildStart(dir,config);
 const normalHTML=await read(join(dir,'start/index.html'));
 const normalHome=await read(join(dir,'index.html'));
 const off=loadStartConfig({...env,CARLOS_START_CLAIM_DRAFT:undefined,CARLOS_START_CLAIM:'off'});
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
 for(const text of copy['start.claim']) assert.ok(!html.includes(text));
 const withoutAgent=text=>text.replace(/<!-- agent-content -->[\s\S]*?<!-- \/agent-content -->/,'');
 assert.equal(withoutAgent(html),withoutAgent(normalHTML).replace(`<h2>${copy['start.claim'][0]}</h2>\n<p>${copy['start.claim'][1]}</p>\n`,''));
 assert.equal(await read(join(dir,'index.html')),normalHome);
}));
test('enabled build refuses unmerged or incomplete claims and invalid origins',()=>scratch(async dir=>{
 await assert.rejects(buildStart(dir,loadStartConfig({...env,CARLOS_START_CLAIM_DRAFT:undefined})),/producerMerged/);
 for(const key of ['CARLOS_START_SITE_ORIGIN','CARLOS_START_CONSOLE_ORIGIN','CARLOS_START_ACCOUNT_URL']) assert.throws(()=>loadStartConfig({...env,[key]:undefined}));
}));
test('Eleventy refuses claim-off without the demo or together with claim-draft',()=>scratch(async dir=>{
 const {spawnSync}=await import('node:child_process');
 const clean={...process.env};for(const key of Object.keys(clean)) if(key.startsWith('CARLOS_START_')) delete clean[key];
 for(const [inputs,message] of [
  [{CARLOS_START_CLAIM:'off'},/requires CARLOS_START_DEMO=1/],
  [{...env,CARLOS_START_CLAIM:'off'},/mutually exclusive/],
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
 assert.doesNotMatch(inventory.join('\n'),/start\/agent|start\/starter\/v1\/main.go|start-config|start-copy|start-claim-contract/);
 build(true,{CARLOS_START_CLAIM:'off',CARLOS_START_CLAIM_DRAFT:''});
 const markdown=await read(join(dir,'start/index.md'));
 const html=await read(join(dir,'start/index.html'));
 assert.match(markdown,/Claiming is not available on this deployment/);
 assert.doesNotMatch(markdown,/claims|flowToken/);
 assert.doesNotMatch(html,/claims|flowToken|Keep it/);
 assert.equal(html.split('<!-- agent-content -->')[1].split('<!-- /agent-content -->')[0],renderMarkdown(markdown));
 build(false);
 const baseline=JSON.parse(await read('test/fixtures/start-baseline.json'));
 for(const name of Object.keys(baseline)) assert.equal(createHash('sha256').update(await readFile(join(dir,name))).digest('hex'),baseline[name]);
 assert.deepEqual(await files(join(dir,'start')),['index.html','start-tabs.js','start.css']);
 assert.doesNotMatch(await read(join(dir,'llms.txt')),/New small apps/);
}));
