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
 for (const key of ['CARLOS_START_SITE_ORIGIN','CARLOS_START_CONSOLE_ORIGIN','CARLOS_START_ACCOUNT_URL']) {
  assert.throws(() => loadStartConfig({...env,[key]:undefined}), /The start page could not be built:/);
 }
 for (const bad of ['http://example.com','https://user:SECRET@example.com','https://example.com/path','https://example.com?x','https://example.com#x','https://example.com/../','https://example.com\\evil',' https://example.com']) {
  assert.throws(() => loadStartConfig({...env,CARLOS_START_SITE_ORIGIN:bad}), e => e.message.startsWith('The start page could not be built:') && !e.message.includes('SECRET'));
 }
 assert.throws(() => loadStartConfig({...env,CARLOS_START_ACCOUNT_URL:'https://other.example.com/'}));
 assert.throws(() => loadStartConfig({CARLOS_START_DEMO:'0'}));
 assert.throws(() => loadStartConfig({CARLOS_START_CLAIM_DRAFT:'1'}));
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
