// 🤖 One substitution pass; JSON examples remain mechanically comparable to the fixture.
import { configError } from '../src/_data/start-config.mjs';
export function validateClaimContract(c, config) {
 if (!/^[a-f0-9]{40}$/.test(c?.producerCommit ?? '')) throw configError('claim producerCommit must be a 40-hex SHA');
 if (typeof c.producerMerged !== 'boolean') throw configError('claim producerMerged must be a boolean');
 if (c.producerMerged !== true && !(config.enabled && config.claimDraft === true)) throw configError('claim producerMerged must be true; draft builds require both explicit switches');
 if (config.claimContractRevision && config.claimContractRevision !== c.producerCommit) throw configError('claim producer revision mismatch');
 const paths={start:'/api/demo/claims',verify:'/api/demo/claims/verify',chooseAccount:'/api/demo/claims/select',status:'/api/demo/claims/status',browser:'/demo/claim#<claimToken>'};
 for(const [name,path] of Object.entries(paths)) {
  const op=c[name];
  if(!op || op.path!==path || op.method!==(name==='status'||name==='browser'?'GET':'POST') || !op.auth || !op.evidence || !Array.isArray(op.responses) || !op.responses.length || op.responses.some(r=>!Number.isInteger(r.status)||r.body===undefined)) throw configError(`claim fixture ${name} is incomplete`);
 }
 for(const [name,keys] of Object.entries({start:['claimToken','email'],verify:['flowToken','code'],chooseAccount:['flowToken','accountId']})) {
  if(keys.some(k=>typeof c[name].request?.[k]!=='string')) throw configError(`claim request ${name} is incomplete`);
 }
 const requireReply=(operation,state,status,fields)=>{
  const replies=c[operation].responses.filter(r=>r.body?.state===state);
  if(!replies.length || replies.some(r=>r.status!==status || Object.entries(fields).some(([key,type])=>typeof r.body[key]!==type || (type==='string' && !r.body[key])))) throw configError(`claim ${operation} ${state} fixture is incomplete`);
 };
 requireReply('start','email_required',202,{flowToken:'string',expiresAt:'string'});
 requireReply('start','browser_required',200,{claimUrl:'string'});
 requireReply('status','claiming',202,{phase:'string',retryAfter:'number',recoveryPending:'boolean'});
 requireReply('status','claimed',200,{accountId:'string',app:'string',url:'string',next:'string'});
 requireReply('status','aborted',200,{});
 for(const state of ['email_required','account_required']) requireReply('status',state,200,{expiresAt:'string'});
 const completed=c.status.responses.find(r=>r.body?.state==='claimed');
 if(JSON.stringify(completed)!==JSON.stringify(c.complete?.response)) throw configError('claim completion fixtures disagree');
 if(c.limits?.proofSeconds!==900 || c.limits?.transferSeconds!==300 || c.limits?.statusAfterOriginalExpirySeconds!==86400) throw configError('claim lifetime fixture is incomplete');
 const states=c.status.responses.map(r=>r.body?.state);
 if(!['claiming','claimed','aborted','email_required','account_required'].every(s=>states.includes(s)) || c.complete?.response?.body?.next!=='cli_login' || !c.complete?.evidence || c.complete.credentialIssued!==false || !c.start.resend?.flowToken || !c.producerPlan || c.limits?.jsonBytes!==4096) throw configError('claim completion or limits fixture is incomplete');
 if(c.start.responses[0]?.body?.state!=='email_required' || typeof c.start.responses[0]?.body?.expiresAt!=='string' || !c.start.responses[0]?.body?.flowToken || !c.verify.responses.some(r=>r.body.state==='account_required' && r.body.accounts?.every(a=>a.id&&a.name&&a.role))) throw configError('claim proof fixture is incomplete');
}
export function renderAgent(template, config, claimContract, starter) {
 if(!config.enabled) throw configError('agent instructions require CARLOS_START_DEMO=1');
 if(config.claimOff && config.claimDraft) throw configError('claim-off and claim-draft are mutually exclusive');
 if(!config.claimOff) validateClaimContract(claimContract,config);
 if(config.starterVersion!=='v1' || !/^[a-f0-9]{64}$/.test(starter?.archiveSHA256 ?? '') || starter?.schema!==1 || !starter.files?.length) throw configError('starter manifest is incomplete');
 const values={siteOrigin:config.siteOrigin,consoleOrigin:config.consoleOrigin,apiOrigin:config.apiOrigin,apiHost:new URL(config.apiOrigin).host,accountUrl:config.accountUrl,starterVersion:config.starterVersion,starterSHA256:starter.archiveSHA256};
 // Preserve the existing instructions when both services share an origin.
 values.urlValidation=config.apiOrigin===config.consoleOrigin
  ? 'Validate returned status and claim URLs as HTTPS with the exact configured console origin, no userinfo; reject unexpected origins.'
  : `Validate returned status URLs as HTTPS with the exact configured API origin \`${config.apiOrigin}\`, and returned claim URLs as HTTPS with the exact configured console origin \`${config.consoleOrigin}\`, no userinfo; reject unexpected origins.`;
 if(!config.claimOff) {
  values.producerCommit=claimContract.producerCommit;
  values.claimExamples=['start','verify','chooseAccount','status','browser','complete'].map(operation=>'```json\n'+JSON.stringify({operation,contract:claimContract[operation]},null,2)+'\n```').join('\n\n');
  values.claimNote=claimContract.producerMerged===true?'The claim contract is pinned to the merged producer below. Check claimAvailable before offering to claim.':"DRAFT FOR AGENTS: Claiming is not yet available on this deployment's merged code. These claim examples describe an unmerged producer. Do not attempt them here, even if an unexpected response says claimAvailable is true.";
  values.claimExamples=values.claimExamples.replaceAll('{{consoleOrigin}}',config.consoleOrigin);
 }
 template=template.replace(/\{\{#(claimOn|claimOff)\}\}([\s\S]*?)\{\{\/\1\}\}/g,(_,mode,body)=>(mode==='claimOff')===Boolean(config.claimOff)?body:'');
 // Resolve fixture origins separately, then substitute the template once.
 const result=template.replace(/\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g,(_,key)=>{
  if(!Object.hasOwn(values,key)) throw configError(`unknown agent placeholder ${key}`);
  return values[key];
 });
 if(/\{\{/.test(result)) throw configError('unresolved agent placeholder');
 return result;
}
