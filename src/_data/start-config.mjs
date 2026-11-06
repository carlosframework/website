// 🤖 Deployment values are build inputs, never inferred from a request.
import { readFileSync } from 'node:fs';
export const configError = detail => new Error(`The start page could not be built: ${detail}`);
export const productionDefaults = Object.freeze({siteOrigin:'https://carlosframework.com',consoleOrigin:'https://console.carloku.com',accountUrl:'https://console.carloku.com/'});
export function loadStartConfig(env = process.env) {
 const flag = key => {
  if (env[key] === undefined || env[key] === '') return false;
  if (env[key] !== '1') throw configError(`${key} must be unset or 1`);
  return true;
 };
 const enabled = flag('CARLOS_START_DEMO');
 if (env.CARLOS_START_CLAIM !== undefined && env.CARLOS_START_CLAIM !== '' && env.CARLOS_START_CLAIM !== 'off') throw configError('CARLOS_START_CLAIM must be unset or off');
 const claimOff = env.CARLOS_START_CLAIM === 'off';
 if (claimOff && !enabled) throw configError('CARLOS_START_CLAIM=off requires CARLOS_START_DEMO=1');
 const config = {enabled,claimOff,...productionDefaults,apiOrigin:productionDefaults.consoleOrigin,starterVersion:'v1',claimContractRevision:''};
 if (!enabled) return config;
 for(const [field,key] of Object.entries({siteOrigin:'CARLOS_START_SITE_ORIGIN',consoleOrigin:'CARLOS_START_CONSOLE_ORIGIN',apiOrigin:'CARLOS_START_API_ORIGIN',accountUrl:'CARLOS_START_ACCOUNT_URL'})) {
  const raw=field==='apiOrigin' && (env[key]===undefined || env[key]==='') ? config.consoleOrigin : env[key]; let u;
  try {u=new URL(raw);} catch {throw configError(`${key} requires an explicit HTTPS URL`);}
  if (!raw || raw.trim()!==raw || /[\s\\<>"'`{}]/u.test(raw) || u.protocol!=='https:' || u.username || u.password || raw.includes('?') || raw.includes('#')) throw configError(`${key} is not an allowed HTTPS URL`);
  if(field!=='accountUrl' && raw!==u.origin && raw!==u.origin+'/') throw configError(`${key} must be an origin without a path`);
  config[field]=field==='accountUrl'?u.href:u.origin;
 }
 if(new URL(config.accountUrl).origin!==config.consoleOrigin) throw configError('CARLOS_START_ACCOUNT_URL must use CARLOS_START_CONSOLE_ORIGIN');
 if (!claimOff) {
  const contract=JSON.parse(readFileSync(new URL('./start-claim-contract.json',import.meta.url),'utf8'));
  config.claimContractRevision=contract.producerCommit;
 }
 return config;
}
export default () => loadStartConfig();
