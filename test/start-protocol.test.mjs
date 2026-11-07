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
 // Kept apps use the console supplied by the person, not the demo API origin.
 const kept=markdown.split('## After you keep it')[1];
 for(const command of ['carlos auth login','carlos apps source pull','carlos deploy']) assert.ok(kept.includes(`${command} --console '<console>'`));
 assert.ok(!kept.includes(split.apiOrigin));
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
test('claim-off renders without a contract and preserves shared sections', () => {
 const off={...config,claimOff:true};
 const markdown=renderAgent(template,off,undefined,manifest);
 assert.doesNotMatch(markdown,/claims|flowToken|Contract producer|claim contract/);
 assert.deepEqual([...markdown.matchAll(/```json\n([\s\S]*?)\n```/g)].map(m=>JSON.parse(m[1]).operation),['create','job-status','update']);
 assert.ok(!markdown.includes(contract.producerCommit));
 assert.doesNotMatch(markdown.split('## After you keep it')[0],/Give the person the exact secret claim link|carlos auth|carlos deploy/);
 assert.match(markdown,/Do not share the claim link\./);
 const sections=markdown.split(/(?=^## \d+\.)/m);
 const normal=rendered.split(/(?=^## \d+\.)/m);
 assert.equal(sections.length,11);
 assert.match(sections[0],/go directly to \[After you keep it\]\(#after-you-keep-it\)/);
 assert.match(sections[0],/Do not create a new demo or a new app/);
 for(const n of [1,2,3,4,6,7]) assert.equal(sections[n],normal[n],`section ${n}`);
 assert.match(sections[9],/Claiming is not available on this deployment/);
 assert.match(sections[9],/Do not attempt any claim request, even if a response says `claimAvailable` is true/);
 assert.match(sections[9],/demo cannot be kept and ends at the returned `expiresAt`/);
 assert.match(sections[9],/Keep the create response's `claimToken` private and use it only as the update bearer/);
 assert.equal(sections[10].split('\n## After you keep it')[0],`## 10. For a permanent app\n\nPoint the person to the [account path](${config.accountUrl}) and stop.\n`);
 assert.equal(markdown.split('## After you keep it')[1],rendered.split('## After you keep it')[1]);
 assert.throws(()=>renderAgent(template,{...off,enabled:false},undefined,manifest),/CARLOS_START_DEMO=1/);
});
const section = (markdown, n) => markdown.split(/(?=^## \d+\.)/m)[n];
for(const claimOff of [false,true]) test(`private response storage, cleanup and lost-token rules: claim ${claimOff?'off':'on'}`,()=>{
 const markdown=renderAgent(template,{...config,claimOff},claimOff?undefined:contract,manifest);
 const create=section(markdown,5);
 const directives=[
  'Before sending the create, run `umask 077; d=$(mktemp -d)` and, in the same command, have your HTTP tool write the reply body directly to `$d/create.json` (for example `curl -o`), so the token never appears in tool output.',
  "Use this or your platform's equivalent private directory.",
  'Permissions must be owner-only before the secret is written, never set afterwards.',
  'Do not use a fixed filename in a shared directory.',
  'Check the directory is outside the source tree and any repository before the create.',
  'If you can only write inside your workspace or a repository, or cannot write files, do not put the response there.',
  'Keep it in private agent state and tell the person that updates stop working if this session loses it.',
  'Do not display that file or any secret in it: no `cat`, debug prints, `curl -v` or `--trace`, and no token typed on a command line.',
  'Read single fields as you need them, and pass the bearer from a header file in the same directory (`curl -H @file`).',
  'Reading the non-secret fields `jobId`, `name`, `statusUrl`, `expiresAt` and `claimAvailable` into the transcript is fine.',
  'Do not use `-L` or `--location`; treat any 3xx as a refusal and stop.',
  'Validate returned URLs by the rules below before using them.',
  'Save the response before the first poll.',
  `Keep later replies beside it, never over it: \`update-<n>.json\` for each update reply${claimOff?'':' and \`flow.json\` for a claim start'}.`,
  'Never overwrite `create.json`.',
  '"Private state" in these directions means this directory, or private agent state in the no-file fallback above.',
  "Retain each returned status URL in its reply file so a superseded job can use the newer job's URL.",
  `In the message with the first live URL, give the person the directory path and say it holds this demo's private key and can be deleted after \`expiresAt\`${claimOff?'':' or once the app is claimed'}.`,
  'If automatic waiting stops without a live URL, give the path in that report.',
  'If your session is ending first, leave it and remind the person.',
 ];
 for(const text of directives) assert.ok(create.includes(text),text);
 assert.ok(markdown.indexOf(directives[0])<markdown.indexOf('GET the returned `statusUrl` without Authorization.'));
 assert.ok(create.includes('`-q` first to disable curlrc settings, `-o "$d/create.json"` for the body'));
 assert.ok(create.includes("`-w '%{http_code}'` for only the status code"));
 const onOnly=[
  'The claim link you give them remains the way to keep the app.',
  'The only permitted repeat is the claim link in your message to the person.',
  'Read `flowToken` from `flow.json` for subsequent claim requests; preserve it if a later reply omits it.',
  'Delete it yourself when you record 200 `claimed`, when the person says the browser claim finished, or when an update or claim start returns 401 for this token.',
  'Also delete it on any later turn after `expiresAt`, but if a reserved claim is pending, keep `flow.json` until status is final or until expiry plus 24 hours.',
  'Do not delete it after `aborted`.',
 ];
 for(const text of onOnly) assert.equal(create.includes(text),!claimOff,text);
 assert.equal(create.includes('Delete it yourself on any later turn after `expiresAt` or when an update returns 401 for this token.'),claimOff);
 assert.ok(section(markdown,7).includes('Lost token after a successful create: if the private file is gone, you cannot update this demo. Do not send the request without Authorization, because that makes a new app. Say so plainly.'));
 assert.doesNotMatch(markdown,/Do not print the token again|Delete it only after|one private file|same private file/);
 // Reject contradictory instructions even when all required sentences remain present.
 assert.doesNotMatch(markdown,/(?:^|[.!?]\s+)(?:If [^.!?\n]+, )?(?:make|send|submit)\s+(?:(?:one|a|another|new)\s+)*anonymous create/im);
 assert.doesNotMatch(markdown,/(?:^|[.!?]\s+)(?:Run|Use)\s+`?cat`?\s+on|paste the token into your next reply|(?:print|display) (?:the|full) (?:token|response body)/im);
 assert.doesNotMatch(markdown,/—/);
});
test('claim links require a private session while the live URL is always shared',()=>{
 const off=renderAgent(template,{...config,claimOff:true},undefined,manifest);
 const privacy='Treat the conversation as private only if it is a direct session with this person and nothing suggests others can read it. If you are replying in a pull request, issue, commit, code review, team channel or group chat, if your replies or logs are copied to one, or if the person has said the session is shared, it is not private. Then share the live URL, do not post the claim link, and ask how to give it to them privately. If there is no private route, say so, and tell them the demo cannot be kept from here unless they can open the private file themselves.';
 for(const n of [5,8]) {
  const text=section(rendered,n);
  assert.ok(text.includes(privacy));
  assert.ok(text.includes('The live URL is public; never withhold it pending a private route.'));
  assert.ok(text.includes('When `claimAvailable` is true and the conversation is private, give the person the exact claim link in the same message as the first live URL.'));
  assert.ok(text.includes('Label it as a private link to keep the app, not to be shared or posted.'));
  assert.ok(text.includes('When `claimAvailable` is false, do not share the claim link; say the demo cannot be kept.'));
  assert.doesNotMatch(text,/unless (?:they|the person) ha(?:ve|s) said|Do not skip|hand over both links there/);
  assert.match(section(off,n),/Do not share the claim link\./);
  assert.doesNotMatch(section(off,n),/give the person the exact claim link|include the exact claim link|Treat the conversation as private|hand over/);
 }
 assert.ok(section(rendered,5).includes('Do not repeat the claim link in later messages, including refusal explanations; refer to the private link in your first message. Repeat it only when the person asks for it privately or section 9 tells you to hand it over. Every handover must follow the privacy rule above.'));
 assert.ok(section(rendered,9).includes('unless they have already used the link, ask whether the person wants to keep it, then ask for their email.'));
 assert.ok(section(rendered,9).includes('Hand over that exact console-origin link privately.'));
 assert.match(section(off,8),/Tell the person the demo cannot be kept\./);
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
function audit(trace, {claimOff=false}={}) {
 let asked=false, confirmed=false, creates=0, token, flow, live, permanent, selected, accounts=[], claimAvailable=false, claimed=false, lost=false, stop=false, repairs=0, lastPoll=-Infinity, retry=0;
 let keep=false, email, claimURL, sharedClaimURL, browser=false, expiry, lastRequest, serverClaimed=false;
 let pendingRetry, retried=false, createRetryUsed=false, updateRetryUsed=false, claimRetryUsed=false, codeAllowed=false, aborted=false;
 let saved=false;
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
  if(e.kind==='save-response') {
   assert.ok(lastRequest?.url.endsWith('/api/demo/apps') && token, 'save requires a create response');
   assert.equal(e.file,'create.json'); saved=true;
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
    assert.ok(confirmed && !lost && !stop && !claimed, 'publish forbidden after lost token or stopped demo');
    assert.equal(e.headers['Content-Type'],'application/gzip');
    assert.ok(e.headers['X-Carlos-Client']);
    if(e.headers.Authorization) { assert.equal(e.headers.Authorization,`Bearer ${token}`); assert.ok(++repairs<=2); }
    else if(!retried) assert.equal(++creates,1);
   }
   if(e.method==='GET') {
    assert.ok(saved, 'polling before saving create response');
    assert.ok(e.at-lastPoll>=retry); assert.ok(e.at<=300); lastPoll=e.at;
    if(u.pathname.includes('/jobs/')) assert.equal(e.headers.Authorization,undefined);
    else {assert.ok(flow);assert.equal(e.headers.Authorization,`Bearer ${flow}`);}
   }
   if(u.pathname.endsWith('/select')) {assert.ok(selected);assert.equal(e.body.accountId,selected);assert.equal(e.body.flowToken,flow);}
   if(u.pathname.endsWith('/verify')) {assert.ok(codeAllowed);assert.equal(e.body.flowToken,flow);}
   if(u.pathname.startsWith('/api/demo/claims') && e.method==='POST') {
    assert.ok(claimAvailable && keep && email && !stop && !claimed && !lost, 'claim forbidden after lost token or stopped demo');
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
   if(e.body?.claimToken) {token=e.body.claimToken;expiry=e.body.expiresAt;saved=false;claimAvailable=!claimOff && e.body.claimAvailable===true;claimURL=e.body.claimUrl;secrets.add(token);secrets.add(e.body.claimUrl);}
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
  if(e.kind==='lost-token') {lost=true;token=undefined;flow=undefined;}
  if(e.kind==='open-saved-claim-link') {
   assert.ok(lost && claimAvailable && sharedClaimURL);
   assert.equal(e.url,sharedClaimURL);
   assert.equal(e.ifClaimingAvailable,true);
  }
  if(e.kind==='public') for(const secret of secrets) assert.ok(!e.text.includes(secret));
  if(e.kind==='share') {
   assert.equal(e.url,e.permanent?permanent:live);
   if(e.claimUrl!==undefined) {
    assert.equal(e.private,true,'every claim-link share must be private');
    assert.ok(claimAvailable,'claim link unavailable');
    assert.equal(e.claimUrl,claimURL);
    assert.equal(e.claimLabel,'Private link to keep the app, not to be shared or posted');
    if(sharedClaimURL) assert.ok(e.requestedPrivately || e.section9Handover,'claim-link repeat needs a private request or section 9 handover');
   }
   if(!e.permanent && claimAvailable && !sharedClaimURL) {
    if(e.private===false) {
     assert.equal(e.claimUrl,undefined);
     assert.equal(e.askedPrivateRoute,true,'ask for a private route without withholding the live URL');
    } else assert.equal(e.claimUrl,claimURL,'first private live share needs the claim link');
   }
   if(e.claimUrl!==undefined) sharedClaimURL=e.claimUrl;
  }
  if(e.kind==='install') assert.ok(permanent && e.optIn);
  if(e.kind==='account') assert.equal(e.url,config.accountUrl);
 }
}
const transcripts=JSON.parse(read('test/fixtures/start-protocol.json'));
for(const f of transcripts) test(`transcript: ${f.name}`,()=>{
 const markdown=f.claimOff?renderAgent(template,{...config,claimOff:true},undefined,manifest):rendered;
 for(const section of f.sections) assert.ok(markdown.includes(section),section);
 if(f.serverMemberships!==undefined) {
  const index=f.events.findIndex(e=>e.kind==='request' && e.url.endsWith('/verify'));
  const reply=f.events[index+1];
  assert.equal(reply.body.state,f.serverMemberships>1?'account_required':'claiming');
  if(f.serverMemberships>1) assert.equal(reply.body.accounts.length,f.serverMemberships);
  else assert.equal(reply.body.phase,'reserved');
 }
 audit(f.events,{claimOff:f.claimOff});
 for(const bad of f.reject ?? []) assert.throws(()=>audit(bad,{claimOff:f.claimOff}));
});

test('lost saved token uses browser recovery and rejects creates, updates and API claims',()=>{
 const fixture=transcripts.find(f=>f.name==='lost saved token uses the first claim link without another create');
 const events=fixture.events;
 for(const directive of fixture.sections) assert.ok(section(rendered,9).includes(directive));
 const lost=events.findIndex(e=>e.kind==='lost-token');
 assert.ok(lost>0);
 assert.ok(!events.slice(lost).some(e=>e.kind==='request'));
 assert.equal(events.filter(e=>e.kind==='request' && e.method==='POST').length,1);
 assert.equal(events.at(-1).kind,'open-saved-claim-link');
 const boundary=events.slice(0,lost+1);
 const create=events.find(e=>e.kind==='request');
 const update=structuredClone(create);
 update.headers.Authorization='Bearer synthetic-demo-token';
 const claim=transcripts.find(f=>f.name==='one account').events.find(e=>e.kind==='request' && e.url.endsWith('/api/demo/claims'));
 for(const request of [create,update]) assert.throws(()=>audit([...boundary,request]),/publish forbidden after lost token/);
 assert.throws(()=>audit([...boundary,claim]),/claim forbidden after lost token/);
 const omitted=structuredClone(events);
 delete omitted.find(e=>e.kind==='share').claimUrl;
 assert.throws(()=>audit(omitted),/first private live share needs the claim link/);
 const unavailable=structuredClone(events.slice(0,events.findIndex(e=>e.kind==='keep')));
 unavailable.find(e=>e.kind==='response' && e.body?.claimToken).body.claimAvailable=false;
 assert.throws(()=>audit(unavailable),/claim link unavailable/);
 delete unavailable.find(e=>e.kind==='share').claimUrl;
 audit(unavailable);
});

for(const claimOff of [false,true]) {
 test(`polling requires saving the create response: claim ${claimOff?'off':'on'}`,()=>{
  const events=structuredClone(transcripts.find(f=>f.name==='novice').events);
  audit(events,{claimOff});
  assert.throws(()=>audit(events.filter(e=>e.kind!=='save-response'),{claimOff}),/polling before saving create response/);
  const late=events.filter(e=>e.kind!=='save-response');
  late.push({kind:'save-response',file:'create.json'});
  assert.throws(()=>audit(late,{claimOff}),/polling before saving create response/);
 });
 test(`lost token forbids create and update without Authorization: claim ${claimOff?'off':'on'}`,()=>{
  const events=structuredClone(transcripts.find(f=>f.name==='novice').events);
  const create=events.find(e=>e.kind==='request');
  const boundary=[...events,{kind:'lost-token'}];
  const update={...structuredClone(create),intent:'update'};
  assert.equal(update.headers.Authorization,undefined);
  for(const request of [create,update]) assert.throws(()=>audit([...boundary,request],{claimOff}),/publish forbidden after lost token/);
 });
}
test('every claim-link share is private, including a requested repeat',()=>{
 const events=transcripts.find(f=>f.name==='lost saved token uses the first claim link without another create').events;
 const first=events.findIndex(e=>e.kind==='share');
 const boundary=events.slice(0,first+1);
 const repeat={...events[first],requestedPrivately:true};
 audit([...boundary,repeat]);
 assert.throws(()=>audit([...boundary,{...repeat,private:false}]),/every claim-link share must be private/);
 assert.throws(()=>audit([...boundary,{...repeat,requestedPrivately:false}]),/claim-link repeat needs a private request or section 9 handover/);
 audit([...boundary,{...repeat,requestedPrivately:false,section9Handover:true}]);
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
