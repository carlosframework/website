import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { loadStartConfig } from '../src/_data/start-config.mjs';
import { renderAgent, validateClaimContract, publicClaimOperation } from '../hack/start-content.mjs';
const read = p => readFileSync(p, 'utf8');
const contract = JSON.parse(read('src/_data/start-claim-contract.json'));
const manifest = JSON.parse(read('src/start/starter/v1/manifest.json'));
const env = { CARLOS_START_DEMO:'1', CARLOS_START_SITE_ORIGIN:'https://site.example.com', CARLOS_START_CONSOLE_ORIGIN:'https://console.example.com', CARLOS_START_ACCOUNT_URL:'https://console.example.com/' };
const config = loadStartConfig(env);
const template = read('src/start/agent.md');
const rendered = renderAgent(template, config, contract, manifest);
const examples = [...rendered.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m => JSON.parse(m[1]));
test('claim appendix omits private provenance and HTML bodies after the development directions',()=>{
 assert.deepEqual(publicClaimOperation({
  evidence:'private', cliEvidence:'private', movedEvidence:'private',
  nested:{source:'internal/console/example.go:123',keep:'public'},
  responses:[{status:200,body:'<!doctype html><html><body>Private page</body></html>'},
   {status:200,body:{state:'claimed'}}],
 }),{nested:{keep:'public'},responses:[{status:200},{status:200,body:{state:'claimed'}}]});
 assert.doesNotMatch(rendered,/"\w*[Ee]vidence"|[\w./-]+\.(?:go|html|js|md):\d+|<!doctype html|<html/i);
 assert.ok(rendered.indexOf('## Appendix: claim wire examples')>rendered.indexOf('for the normal account workflow.'));
 assert.ok(rendered.indexOf('"operation": "start"')>rendered.indexOf('## Appendix: claim wire examples'));
 assert.ok(contract.browser.responses.some(r=>r.body.includes('<!doctype html>')));
 assert.ok(contract.complete.consumedUpdate.evidence);
 const off={...config,claimOff:true};
 assert.equal(renderAgent(template,off,contract,manifest),renderAgent(template,off,undefined,manifest));
});
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
 const off=renderAgent(template,{...split,claimOff:true},undefined,manifest);
 assert.ok(off.includes(`POST ${split.apiOrigin}/api/demo/apps`));
 assert.doesNotMatch(off,/\/api\/demo\/claims|flowToken/);
 assert.ok(off.includes(`[account path](${split.accountUrl})`));
});
test('claim gate requires a merged 40-hex producer SHA', () => {
 assert.equal(contract.producerMerged,true);
 assert.equal(contract.producerCommit,'0eea2abb6e7ae1a396c0377637929bfabde92d12');
 assert.throws(() => validateClaimContract({...contract,producerMerged:false},config), /producerMerged/);
 validateClaimContract({...contract,producerMerged:true}, {...config});
 for (const sha of ['', 'main', '1234']) assert.throws(() => validateClaimContract({...contract,producerMerged:true,producerCommit:sha},config));
 for (const field of ['start','verify','chooseAccount','status','browser','complete']) {
  const broken=structuredClone(contract); delete broken[field]; assert.throws(() => validateClaimContract(broken,config));
 }
 const broken=structuredClone(contract); broken.status.responses=[]; assert.throws(() => validateClaimContract(broken,config));
 assert.doesNotMatch(rendered,/DRAFT FOR AGENTS|unmerged producer|test-only|stub/);
});
test('claim-off requires an enabled demo and refuses unsupported claim modes', () => {
 const off={...env,CARLOS_START_CLAIM:'off'};
 assert.equal(loadStartConfig(off).claimOff,true);
 assert.equal(loadStartConfig(off).claimContractRevision,'');
 assert.equal(config.claimOff,false);
 assert.equal(loadStartConfig({...env,CARLOS_START_CLAIM:''}).claimOff,false);
 assert.throws(()=>loadStartConfig({...off,CARLOS_START_DEMO:undefined}),/requires CARLOS_START_DEMO=1/);
 assert.throws(()=>loadStartConfig({...off,CARLOS_START_DEMO:''}),/requires CARLOS_START_DEMO=1/);
 for(const value of ['on','0','1','OFF',' off']) assert.throws(()=>loadStartConfig({...off,CARLOS_START_CLAIM:value}),/must be unset or off/);
});
test('claim-off renders without a contract and preserves all other instruction bytes', () => {
 const off={...config,claimOff:true};
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
 assert.equal(sections[5],normal[5].replace(/, including `flowToken`, the emailed code and the person's email address|, `flowToken`, the emailed code, the person's email address/g,'').replace('Give the person the exact secret claim link once, privately, as recovery information; explain that it is unavailable when `claimAvailable` is false. If you have no private channel, ask them to use a private session before exposing it.','Do not share the claim link.'));
 assert.match(sections[9],/Claiming is not available on this deployment/);
 assert.match(sections[9],/Do not attempt any claim request, even if a response says `claimAvailable` is true/);
 assert.match(sections[9],/demo cannot be kept and ends at the returned `expiresAt`/);
 assert.match(sections[9],/Keep the create response's `claimToken` private and use it only as the update bearer/);
 assert.equal(sections[10],`## 10. For a permanent app\n\nPoint the person to the [account path](${config.accountUrl}) and stop.\n`);
 assert.throws(()=>renderAgent(template,{...off,enabled:false},undefined,manifest),/CARLOS_START_DEMO=1/);
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
 for (const op of ['start','verify','chooseAccount','status','browser','complete']) assert.deepEqual(examples.find(e=>e.operation===op).contract,JSON.parse(JSON.stringify(publicClaimOperation(contract[op])).replaceAll('{{consoleOrigin}}',config.consoleOrigin)));
 for (const fixture of JSON.parse(read('test/fixtures/start-wire.json'))) {
  const expected=JSON.parse(JSON.stringify(fixture).replaceAll('{{consoleOrigin}}',config.consoleOrigin).replaceAll('{{apiOrigin}}',config.apiOrigin));
  assert.deepEqual(examples.find(e=>e.operation===fixture.operation),expected);
 }
 const publish=examples.find(e=>e.operation==='create');
 assert.deepEqual(Object.keys(publish.response.body).sort(),['claimAvailable','claimToken','claimUrl','expiresAt','jobId','name','statusUrl'].sort());
 assert.equal(typeof publish.response.body.expiresAt,'number');
 assert.equal(typeof contract.start.responses[0].body.expiresAt,'string');
 assert.deepEqual(Object.keys(examples.find(e=>e.operation==='update').response.body).sort(),['expiresAt','jobId','name','statusUrl']);
});
// These are authored protocol transcripts, not evidence of an LLM or live API run.
function audit(trace) {
 let asked=false, confirmed=false, creates=0, token, flow, live, permanent, selected, accounts=[], claimAvailable=false, claimed=false, lost=false, stop=false, repairs=0, lastPoll=-Infinity, retry=0;
 let keep=false, email, claimURL, browser=false, expiry, lastRequest, serverClaimed=false;
 let pendingRetry, retried=false, createRetryUsed=false, updateRetryUsed=false, claimRetryUsed=false, codeAllowed=false, aborted=false;
 const secrets=new Set();
 for (const e of trace) {
  if(e.kind==='ask') asked=true;
  if(e.kind==='confirm') { assert.ok(asked); confirmed=true; }
  if(e.kind==='build') assert.ok(confirmed);
  if(e.kind==='keep') {assert.ok(claimAvailable);keep=e.wanted;}
  if(e.kind==='email') {assert.ok(keep);email=e.address;secrets.add(email);}
  if(e.kind==='restart-claim') {
   assert.ok(aborted && e.consent && e.now<expiry);
   stop=false;flow=undefined;aborted=false;claimRetryUsed=false;codeAllowed=false;
  }
  if(e.kind==='rejected-url') stop=true;
  if(e.kind==='ask-code' || e.kind==='code-coming') assert.ok(codeAllowed && !stop);
  if(e.kind==='expiry') assert.equal(e.value,expiry);
  if(e.kind==='server-claim-completed') serverClaimed=true;
  if(e.kind==='browser-link') {assert.ok(keep && claimAvailable && e.private && !flow);assert.equal(e.url,claimURL);browser=true;}
  if(e.kind==='browser-result') {
   assert.ok(browser);
   if(e.state==='claimed') {
    const reply=contract.complete.response.body;
    for(const key of ['accountId','app','url']) assert.equal(e[key],reply[key]);
    const html=contract.browser.responses.find(r=>r.when==='claimed').body;
    assert.ok(html.includes(`href="${e.url}"`));
    permanent=e.url;claimed=true;
   }
  }
  if(e.kind==='choose') { assert.ok(accounts.some(a=>a.id===e.accountId)); selected=e.accountId; }
  if(e.kind==='request') {
   retried=false;
   if(pendingRetry) {
    assert.ok(!stop);
    assert.equal(e.url,pendingRetry.request.url);
    assert.equal(e.method,pendingRetry.request.method);
    assert.deepEqual(e.headers,pendingRetry.request.headers);
    assert.deepEqual(e.body,pendingRetry.request.body);
    assert.ok(e.at>=pendingRetry.at && e.at<=300);
    retried=true;
    pendingRetry=undefined;
   }
   lastRequest=e;
   const u=new URL(e.url); assert.equal(u.origin,config.consoleOrigin); assert.equal(e.redirect,'error');
   if(e.method==='POST' && u.pathname==='/api/demo/apps') {
    assert.ok(confirmed && !lost && !stop && !claimed);
    assert.equal(e.headers['Content-Type'],'application/gzip');
    assert.ok(e.headers['X-Carlos-Client']);
    if(e.headers.Authorization) { assert.equal(e.headers.Authorization,`Bearer ${token}`); assert.ok(++repairs<=2); }
    else if(!retried) assert.equal(++creates,1);
   }
   if(e.method==='GET') {
    assert.ok(e.at-lastPoll>=retry); assert.ok(e.at<=300); lastPoll=e.at;
    if(u.pathname.includes('/jobs/')) assert.equal(e.headers.Authorization,undefined);
    else {assert.ok(flow);assert.equal(e.headers.Authorization,`Bearer ${flow}`);}
   }
   if(u.pathname.endsWith('/select')) {assert.ok(selected);assert.equal(e.body.accountId,selected);assert.equal(e.body.flowToken,flow);}
   if(u.pathname.endsWith('/verify')) {assert.ok(codeAllowed);assert.equal(e.body.flowToken,flow);}
   if(u.pathname.startsWith('/api/demo/claims') && e.method==='POST') {
    assert.ok(claimAvailable && keep && email && !stop && !claimed);
    assert.equal(e.headers['Content-Type'],'application/json');
    if(e.body?.code) secrets.add(e.body.code);
   }
   if(u.pathname==='/api/demo/claims') {assert.equal(e.body.email,email);if(!flow) assert.equal(e.body.flowToken,undefined);}
   if(e.body?.claimToken) assert.equal(e.body.claimToken,token);
  }
  if(e.kind==='response') {
   const path=lastRequest && new URL(lastRequest.url).pathname;
   const operation=['start','verify','chooseAccount','status'].find(name=>contract[name].path===path);
   if(operation) {
    const replies=examples.find(example=>example.operation===operation).contract.responses;
    assert.ok(replies.some(r=>r.status===e.status && isDeepStrictEqual(r.body,e.body)
     && (!e.headers || isDeepStrictEqual(r.headers,e.headers))),`${operation}: response must match the merged fixture`);
   }
   if(serverClaimed && path==='/api/demo/apps') assert.deepEqual({status:e.status,body:e.body},contract.complete.consumedUpdate.response);
   if(e.body?.claimToken) {token=e.body.claimToken;expiry=e.body.expiresAt;claimAvailable=e.body.claimAvailable===true;secrets.add(token);secrets.add(e.body.claimUrl);secrets.add(e.body.statusUrl);}
   if(e.body?.state==='browser_required') {claimURL=e.body.claimUrl;assert.equal(e.body.flowToken,undefined);}
   if(path==='/api/demo/claims') codeAllowed=e.status===202 && e.body?.state==='email_required';
   if(e.body?.flowToken) {flow=e.body.flowToken;secrets.add(flow);}
   if(e.body?.state==='live') live=e.body.url;
   if(e.status===200 && e.body?.state==='claimed') {permanent=e.body.url;claimed=true;}
   if(e.body?.state==='account_required' && e.body.accounts) accounts=e.body.accounts;
   retry=Math.max(e.retryAfter??e.body?.retryAfter??5,e.body?.retryAfter??0);
   if(e.body?.state==='aborted') {stop=true;aborted=true;}
   if(e.body?.code==='cap') stop=true;
   if([401,404,410,429].includes(e.status)) stop=true;
   if(e.status>=500 && e.status<=599) {
    const publish=path==='/api/demo/apps';
    const update=publish && Boolean(lastRequest.headers.Authorization);
    const create=publish && !update;
    const claimStart=path==='/api/demo/claims';
    const json503=e.status===503 && e.body!==null && typeof e.body==='object' && !Array.isArray(e.body);
    const allowed=create ? json503 && !createRetryUsed : update ? !updateRetryUsed : claimStart && e.status===503 && !claimRetryUsed;
    if(allowed) {
     if(create) createRetryUsed=true;
     if(update) updateRetryUsed=true;
     if(claimStart) claimRetryUsed=true;
     pendingRetry={request:lastRequest,at:lastRequest.at+(e.retryAfter??(publish?15:5))};
    } else {stop=true;if(create) lost=true;}
   }
  }
  if(e.kind==='lost') lost=true;
  if(e.kind==='public') for(const secret of secrets) assert.ok(!e.text.includes(secret));
  if(e.kind==='share') assert.equal(e.url,e.permanent?permanent:live);
  if(e.kind==='install') assert.ok(permanent && e.optIn);
  if(e.kind==='account') assert.equal(e.url,config.accountUrl);
 }
}
const transcripts=JSON.parse(read('test/fixtures/start-protocol.json'));
for(const f of transcripts) test(`transcript: ${f.name}`,()=>{
 for(const section of f.sections) assert.ok(rendered.includes(section),section);
 if(f.serverMemberships!==undefined) {
  const index=f.events.findIndex(e=>e.kind==='request' && e.url.endsWith('/verify'));
  const reply=f.events[index+1];
  assert.equal(reply.body.state,f.serverMemberships>1?'account_required':'claiming');
  if(f.serverMemberships>1) assert.equal(reply.body.accounts.length,f.serverMemberships);
  else assert.equal(reply.body.phase,'reserved');
 }
 audit(f.events);
 for(const bad of f.reject ?? []) assert.throws(()=>audit(bad));
});

for(const keymail of [false,true]) test(`claimAvailable with no mailer: ${keymail?'Keymail browser handoff':'email-code refusal'}`,()=>{
 const fixture=transcripts.find(f=>f.mailReady===false && f.keymailAddress===keymail);
 assert.ok(fixture);
 const events=fixture.events;
 const created=events.find(e=>e.kind==='response' && e.body?.claimToken);
 assert.equal(created.body.claimAvailable,true);
 const start=events.findIndex(e=>e.kind==='request' && e.url.endsWith('/api/demo/claims'));
 assert.ok(start>0);
 assert.equal(events[start].body.email,keymail?'person@keymail.example.com':'person@example.com');
 assert.ok(events.slice(0,start).some(e=>e.kind==='email' && e.address===events[start].body.email));
 const reply=events[start+1];
 assert.equal(reply.status,keymail?200:503);
 assert.equal(reply.body.state,keymail?'browser_required':undefined);
 assert.equal(reply.body.flowToken,undefined);
 assert.ok(!events.some(e=>['ask-code','code-coming'].includes(e.kind)));
 assert.ok(!events.slice(start+2).some(e=>e.kind==='request' && e.url.endsWith('/api/demo/apps')));
 const section=rendered.split('## 9. Claim only when available')[1].split('## 10.')[0];
 for(const directive of fixture.sections) assert.ok(section.includes(directive),directive);
 // Mutate the parsed trace at the decision boundary, before the one allowed retry.
 const before=events.slice(0,start+1), after=events.slice(0,start+2);
 assert.throws(()=>audit([...before,{kind:'code-coming'}]));
 assert.throws(()=>audit([...after,{kind:'ask-code'}]));
 assert.throws(()=>audit([...after,structuredClone(events.find(e=>e.kind==='request' && e.url.endsWith('/api/demo/apps')))]));
 if(keymail) {
  const handoff=events[start+2];
  assert.equal(handoff.kind,'browser-link');
  assert.equal(handoff.private,true);
  assert.equal(handoff.url,reply.body.claimUrl);
  assert.match(section,/Keymail returns 200 `browser_required`.*with no flow token/);
 } else {
  assert.deepEqual(reply.body,{error:'unavailable'});
  assert.deepEqual(reply.headers,{'Cache-Control':'no-store','Content-Type':'application/json'});
  assert.equal(reply.retryAfter,undefined);
  assert.equal(events.filter(e=>e.kind==='request' && e.url.endsWith('/api/demo/claims')).length,2);
  assert.equal(events.find(e=>e.kind==='expiry').value,created.body.expiresAt);
  assert.ok(events.some(e=>e.kind==='public' && e.text.includes('cannot be claimed now') && e.text.includes('demo keeps running with its original expiry')));
 }
});

test('browser email refusal and completion match the rebound contract',()=>{
 const refusal=contract.browser.forms.prove.responses.find(r=>r.status===503);
 assert.equal(contract.browser.forms.prove.path,'/demo/claim/prove');
 assert.equal(refusal.headers['Content-Type'],'text/html; charset=utf-8');
 assert.equal(refusal.headers['Cache-Control'],'no-store');
 assert.equal(refusal.headers['Referrer-Policy'],'origin');
 assert.ok(refusal.headers['Content-Security-Policy']);
 assert.equal(refusal.headers['Retry-After'],undefined);
 assert.ok(refusal.body.includes('<p role="alert">unavailable</p>'));
 assert.doesNotMatch(refusal.body,/name="code"|Check your email/);
 const complete=contract.browser.responses.find(r=>r.when==='claimed').body.replaceAll('{{consoleOrigin}}',config.consoleOrigin);
 assert.ok(complete.includes(`carlos auth login --console ${config.consoleOrigin}`));
 assert.doesNotMatch(complete,/carlos login/);
 const browser=examples.find(e=>e.operation==='browser').contract;
 assert.deepEqual(browser.forms.prove.responses[0],publicClaimOperation(refusal));
 assert.ok(browser.semantics.includes('303 to /auth/signin?next=%2Fdemo%2Fclaim'));
});
