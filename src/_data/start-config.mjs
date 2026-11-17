// 🤖 Deployment values are build inputs, never inferred from a request.
// The production site is the default: with no CARLOS_START_* variables, a build is the live homepage and /start with
// the production origins. (A plain build with the demo off shipped the old homepage twice, on 2026-11-14 and
// 2026-11-16.) CARLOS_START_DEMO=0 builds the old page on purpose; the origin variables override one origin each.
import { readFileSync } from 'node:fs';
export const configError = detail => new Error(`The start page could not be built: ${detail}`);
export const productionDefaults = Object.freeze({siteOrigin:'https://carlosframework.com',consoleOrigin:'https://console.carloku.com',accountUrl:'https://console.carloku.com/'});
export function loadStartConfig(env = process.env) {
 const demo = env.CARLOS_START_DEMO;
 if (demo !== undefined && demo !== '' && demo !== '1' && demo !== '0') throw configError('CARLOS_START_DEMO must be unset, 1 or 0');
 const enabled = demo !== '0';
 if (env.CARLOS_START_CLAIM !== undefined && env.CARLOS_START_CLAIM !== '' && env.CARLOS_START_CLAIM !== 'off') throw configError('CARLOS_START_CLAIM must be unset or off');
 const claimOff = env.CARLOS_START_CLAIM === 'off';
 if (claimOff && !enabled) throw configError('CARLOS_START_CLAIM=off requires the demo (CARLOS_START_DEMO=0 turns it off)');
 const config = {enabled,claimOff,...productionDefaults,apiOrigin:productionDefaults.consoleOrigin,starterVersion:'v1',claimContractRevision:''};
 if (!enabled) return config;
 for(const [field,key] of Object.entries({siteOrigin:'CARLOS_START_SITE_ORIGIN',consoleOrigin:'CARLOS_START_CONSOLE_ORIGIN',apiOrigin:'CARLOS_START_API_ORIGIN',accountUrl:'CARLOS_START_ACCOUNT_URL'})) {
  const unset=env[key]===undefined || env[key]==='';
  // unset: the production origin, except that the API follows the console and the account URL is the console's root
  const raw=!unset ? env[key] : field==='apiOrigin' ? config.consoleOrigin : field==='accountUrl' ? config.consoleOrigin+'/' : productionDefaults[field]; let u;
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
