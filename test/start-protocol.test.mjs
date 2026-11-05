import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
import { renderAgent, validateClaimContract } from '../hack/start-content.mjs';
const read = p => readFileSync(p, 'utf8');
const contract = JSON.parse(read('src/_data/start-claim-contract.json'));
const manifest = JSON.parse(read('src/start/starter/v1/manifest.json'));
const env = { CARLOS_START_DEMO:'1', CARLOS_START_CLAIM_DRAFT:'1', CARLOS_START_SITE_ORIGIN:'https://site.example.com', CARLOS_START_CONSOLE_ORIGIN:'https://console.example.com', CARLOS_START_ACCOUNT_URL:'https://console.example.com/' };
const config = loadStartConfig(env);
const template = read('src/start/agent.md');
const rendered = renderAgent(template, config, contract, manifest);
const examples = [...rendered.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m => JSON.parse(m[1]));
test('default off, explicit origins, strict HTTPS inputs and safe diagnostics', () => {
 assert.equal(loadStartConfig({}).enabled, false);
 assert.equal(config.apiOrigin,config.consoleOrigin);
 assert.equal(loadStartConfig({...env,CARLOS_START_API_ORIGIN:''}).apiOrigin,config.consoleOrigin);
 assert.equal(loadStartConfig({...env,CARLOS_START_API_ORIGIN:'https://api.example.com/'}).apiOrigin,'https://api.example.com');
 for (const key of ['CARLOS_START_SITE_ORIGIN','CARLOS_START_CONSOLE_ORIGIN','CARLOS_START_ACCOUNT_URL']) {
  assert.throws(() => loadStartConfig({...env,[key]:undefined}), /The start page could not be built:/);
 }
 for (const bad of ['http://example.com','https://user:SECRET@example.com','https://example.com/path','https://example.com?x','https://example.com#x','https://example.com/../','https://example.com\\evil',' https://example.com']) {
  for(const key of ['CARLOS_START_SITE_ORIGIN','CARLOS_START_CONSOLE_ORIGIN','CARLOS_START_API_ORIGIN']) assert.throws(() => loadStartConfig({...env,[key]:bad}), e => e.message.startsWith('The start page could not be built:') && !e.message.includes('SECRET'));
 }
 assert.throws(() => loadStartConfig({...env,CARLOS_START_ACCOUNT_URL:'https://other.example.com/'}));
 assert.throws(() => loadStartConfig({CARLOS_START_DEMO:'0'}));
 assert.throws(() => loadStartConfig({CARLOS_START_CLAIM_DRAFT:'1'}));
});
test('API calls and status validation use API origin; browser claims and CLI retain console origin',()=>{
 const split=loadStartConfig({...env,CARLOS_START_API_ORIGIN:'https://api.example.com:8443'});
 const markdown=renderAgent(template,split,contract,manifest);
 assert.ok(markdown.includes(`The sole API origin is \`${split.apiOrigin}\``));
 const urls=[...markdown.matchAll(/https:\/\/[^\s`"<>]+\/api\/demo\/[^\s`"<>]+/g)].map(m=>new URL(m[0]));
 assert.ok(urls.length>=6);
 for(const url of urls) assert.equal(url.origin,split.apiOrigin);
 const examples=[...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>JSON.parse(m[1]));
 for(const operation of ['create','update']) {
  const example=examples.find(e=>e.operation===operation);
  assert.equal(example.request.url,`${split.apiOrigin}/api/demo/apps`);
  assert.equal(new URL(example.response.body.statusUrl).origin,split.apiOrigin);
 }
 assert.equal(examples.find(e=>e.operation==='create').response.body.claimUrl,`${split.consoleOrigin}/demo/claim#synthetic-demo-token`);
 for(const operation of ['start','verify','chooseAccount','status']) {
  const fixture=examples.find(e=>e.operation===operation).contract;
  assert.equal(new URL(fixture.path,split.apiOrigin).origin,split.apiOrigin);
  assert.equal(fixture.path,contract[operation].path);
 }
 assert.equal(examples.find(e=>e.operation==='start').contract.responses.find(r=>r.body.state==='browser_required').body.claimUrl,`${split.consoleOrigin}/demo/claim#synthetic-demo-token`);
 assert.ok(markdown.includes(`exact host \`api.example.com:8443\``));
 assert.ok(markdown.includes(`Validate returned status URLs as HTTPS with the exact configured API origin \`${split.apiOrigin}\`, and returned claim URLs as HTTPS with the exact configured console origin \`${split.consoleOrigin}\`, no userinfo; reject unexpected origins.`));
 assert.match(markdown,/Preserve accepted URLs byte-for-byte, including the claim fragment/);
 assert.match(markdown,/Never follow a credential-bearing redirect to another origin/);
 for(const command of ['carlos auth login','carlos auth whoami','carlos deploy']) assert.ok(markdown.includes(`${command} --console ${split.consoleOrigin}`));
 assert.ok(markdown.includes(`[account path](${split.accountUrl})`));
 const off=renderAgent(template,{...split,claimOff:true,claimDraft:false},undefined,manifest);
 assert.ok(off.includes(`POST ${split.apiOrigin}/api/demo/apps`));
 assert.doesNotMatch(off,/\/api\/demo\/claims|flowToken/);
 assert.ok(off.includes(`[account path](${split.accountUrl})`));
});
test('claim gate requires merged SHA unless both explicit draft switches are set', () => {
 assert.equal(contract.producerMerged,false);
 assert.throws(() => validateClaimContract(contract,{...config,claimDraft:false}), /producerMerged/);
 validateClaimContract({...contract,producerMerged:true}, {...config,claimDraft:false});
 for (const sha of ['', 'main', '1234']) assert.throws(() => validateClaimContract({...contract,producerMerged:true,producerCommit:sha},config));
 for (const field of ['start','verify','chooseAccount','status','browser','complete']) {
  const broken=structuredClone(contract); delete broken[field]; assert.throws(() => validateClaimContract(broken,config));
 }
 const broken=structuredClone(contract); broken.status.responses=[]; assert.throws(() => validateClaimContract(broken,config));
 assert.match(rendered,/Claiming is not yet available on this deployment's merged code/);
});
test('claim-off requires an enabled demo and refuses draft or unsupported claim modes', () => {
 const off={...env,CARLOS_START_CLAIM_DRAFT:undefined,CARLOS_START_CLAIM:'off'};
 assert.equal(loadStartConfig(off).claimOff,true);
 assert.equal(loadStartConfig(off).claimContractRevision,'');
 assert.equal(config.claimOff,false);
 assert.equal(loadStartConfig({...env,CARLOS_START_CLAIM:''}).claimOff,false);
 assert.throws(()=>loadStartConfig({...off,CARLOS_START_DEMO:undefined}),/requires CARLOS_START_DEMO=1/);
 assert.throws(()=>loadStartConfig({...off,CARLOS_START_DEMO:''}),/requires CARLOS_START_DEMO=1/);
 assert.throws(()=>loadStartConfig({...env,CARLOS_START_CLAIM:'off'}),/mutually exclusive/);
 for(const value of ['on','0','1','OFF',' off']) assert.throws(()=>loadStartConfig({...off,CARLOS_START_CLAIM:value}),/must be unset or off/);
});
test('claim-off renders without a contract and preserves all other instruction bytes', () => {
 const off={...config,claimOff:true,claimDraft:false};
 const markdown=renderAgent(template,off,undefined,manifest);
 assert.doesNotMatch(markdown,/claims|flowToken|Contract producer|claim contract/);
 assert.deepEqual([...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>JSON.parse(m[1]).operation),['create','job-status','update']);
 assert.ok(!markdown.includes(contract.producerCommit));
 assert.doesNotMatch(markdown,/Give the person the exact secret claim link|carlos auth|carlos deploy/);
 assert.match(markdown,/Do not share the claim link\./);
 const sections=markdown.split(/(?=^## \d+\.)/m);
 const normal=rendered.split(/(?=^## \d+\.)/m);
 assert.equal(sections.length,11);
 assert.equal(sections[0],'# 🤖 Agent directions: make a small app\n\n');
 for(const n of [1,2,3,4,6,7,8]) assert.equal(sections[n],normal[n],`section ${n}`);
 assert.equal(sections[5],normal[5].replace('Give the person the exact secret claim link once, privately, as recovery information; explain that it is unavailable when `claimAvailable` is false. If you have no private channel, ask them to use a private session before exposing it.','Do not share the claim link.'));
 assert.match(sections[9],/Claiming is not available on this deployment/);
 assert.match(sections[9],/Do not attempt any claim request, even if a response says `claimAvailable` is true/);
 assert.match(sections[9],/demo cannot be kept and ends at the returned `expiresAt`/);
 assert.match(sections[9],/Keep the create response's `claimToken` private and use it only as the update bearer/);
 assert.equal(sections[10],`## 10. For a permanent app\n\nPoint the person to the [account path](${config.accountUrl}) and stop.\n`);
 assert.throws(()=>renderAgent(template,{...off,enabled:false},undefined,manifest),/CARLOS_START_DEMO=1/);
 assert.throws(()=>renderAgent(template,{...off,claimDraft:true},contract,manifest),/mutually exclusive/);
});
test('claim gate rejects missing status fields, completion drift and missing merge evidence',()=>{
 for(const [state,key] of [['claiming','phase'],['claiming','retryAfter'],['claiming','recoveryPending'],['claimed','url'],['claimed','accountId'],['email_required','expiresAt']]) {
  const broken=structuredClone(contract); delete broken.status.responses.find(r=>r.body.state===state).body[key]; assert.throws(()=>validateClaimContract(broken,config));
 }
 const missing=structuredClone(contract);delete missing.producerMerged;assert.throws(()=>validateClaimContract(missing,config));
 const drift=structuredClone(contract);drift.complete.response.body.url='https://different.example.com';assert.throws(()=>validateClaimContract(drift,config));
});
test('render substitutes only known placeholders and fixtures round trip as JSON', () => {
 assert.equal(renderAgent('unchanged\n{{siteOrigin}}\n',config,contract,manifest),'unchanged\nhttps://site.example.com\n');
 assert.throws(() => renderAgent('{{unknown}}',config,contract,manifest));
 for (const op of ['start','verify','chooseAccount','status','browser','complete']) assert.deepEqual(examples.find(e=>e.operation===op).contract,JSON.parse(JSON.stringify(contract[op]).replaceAll('{{consoleOrigin}}',config.consoleOrigin))); 
 const publish=examples.find(e=>e.operation==='create');
 assert.deepEqual(Object.keys(publish.response.body).sort(),['claimAvailable','claimToken','claimUrl','expiresAt','jobId','name','statusUrl'].sort());
 assert.equal(typeof publish.response.body.expiresAt,'number');
 assert.equal(typeof contract.start.responses[0].body.expiresAt,'string');
 assert.deepEqual(Object.keys(examples.find(e=>e.operation==='update').response.body).sort(),['expiresAt','jobId','name','statusUrl']);
});
// These are authored protocol transcripts, not evidence of an LLM or live API run.
function audit(trace) {
 let asked=false, confirmed=false, creates=0, token, flow, live, permanent, selected, accounts=[], claimAvailable=false, claimed=false, lost=false, stop=false, repairs=0, lastPoll=-Infinity, retry=0;
 const secrets=new Set();
 for (const e of trace) {
  if(e.kind==='ask') asked=true;
  if(e.kind==='confirm') { assert.ok(asked); confirmed=true; }
  if(e.kind==='build') assert.ok(confirmed);
  if(e.kind==='choose') { assert.ok(accounts.some(a=>a.id===e.accountId)); selected=e.accountId; }
  if(e.kind==='request') {
   const u=new URL(e.url); assert.equal(u.origin,config.consoleOrigin); assert.equal(e.redirect,'error');
   if(e.method==='POST' && u.pathname==='/api/demo/apps') {
    assert.ok(confirmed && !lost && !stop && !claimed);
    assert.equal(e.headers['Content-Type'],'application/gzip');
    assert.ok(e.headers['X-Carlos-Client']);
    if(e.headers.Authorization) { assert.equal(e.headers.Authorization,`Bearer ${token}`); assert.ok(++repairs<=2); }
    else assert.equal(++creates,1);
   }
   if(e.method==='GET') {
    assert.ok(e.at-lastPoll>=retry); assert.ok(e.at<=300); lastPoll=e.at;
    if(u.pathname.includes('/jobs/')) assert.equal(e.headers.Authorization,undefined);
    else assert.equal(e.headers.Authorization,`Bearer ${flow}`);
   }
   if(u.pathname.endsWith('/select')) {assert.ok(selected);assert.equal(e.body.accountId,selected);assert.equal(e.body.flowToken,flow);}
   if(u.pathname.endsWith('/verify')) assert.equal(e.body.flowToken,flow);
   if(u.pathname.startsWith('/api/demo/claims') && e.method==='POST') {
    assert.ok(claimAvailable && !stop && !claimed);
    assert.equal(e.headers['Content-Type'],'application/json');
    if(e.body?.code) secrets.add(e.body.code);
   }
   if(e.body?.claimToken) assert.equal(e.body.claimToken,token);
  }
  if(e.kind==='response') {
   if(e.body?.claimToken) {token=e.body.claimToken;claimAvailable=e.body.claimAvailable===true;secrets.add(token);secrets.add(e.body.claimUrl);secrets.add(e.body.statusUrl);}
   if(e.body?.flowToken) {flow=e.body.flowToken;secrets.add(flow);}
   if(e.body?.state==='live') live=e.body.url;
   if(e.body?.state==='claimed') {permanent=e.body.url;claimed=true;}
   if(e.body?.state==='account_required' && e.body.accounts) accounts=e.body.accounts;
   retry=Math.max(e.retryAfter??5,e.body?.retryAfter??0);
   if([401,404,410,429,503].includes(e.status)) stop=true;
  }
  if(e.kind==='lost') lost=true;
  if(e.kind==='public') for(const secret of secrets) assert.ok(!e.text.includes(secret));
  if(e.kind==='share') assert.equal(e.url,e.permanent?permanent:live);
  if(e.kind==='install') assert.ok(permanent && e.optIn);
  if(e.kind==='account') assert.equal(e.url,config.accountUrl);
 }
}
for(const f of JSON.parse(read('test/fixtures/start-protocol.json'))) test(`transcript: ${f.name}`,()=>{
 for(const section of f.sections) assert.ok(rendered.includes(section),section);
 audit(f.events);
 for(const bad of f.reject ?? []) assert.throws(()=>audit(bad));
});
