#!/usr/bin/env node
// 🤖 Release from an immutable export. Importing this module performs no I/O.
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadStartConfig } from '../src/_data/start-config.mjs';

const usage = 'usage: node hack/release-start.mjs --console <origin> --account <account> --app <app> --channel <channel> --site-origin <origin> --console-origin <origin> --account-url <url> [--allow-unmerged-dev] [--claim-draft | --claim-off] [--execute] [--temporary --ttl <duration>]';
const values = new Set(['console','account','app','channel','site-origin','console-origin','account-url','ttl']);
const switches = new Set(['allow-unmerged-dev','claim-draft','claim-off','execute','temporary']);

export function parseReleaseArgs(argv) {
 const options = {};
 for (let i = 0; i < argv.length; i++) {
  const name = argv[i].slice(2);
  if (!argv[i].startsWith('--') || (!values.has(name) && !switches.has(name))) throw new Error(`unknown argument; ${usage}`);
  if (Object.hasOwn(options,name)) throw new Error(`duplicate --${name}`);
  if (switches.has(name)) options[name] = true;
  else {
   const value = argv[++i];
   if (!value || value.startsWith('-') || value.trim() !== value || /[\u0000-\u001f\u007f]/.test(value)) throw new Error(`--${name} requires a value`);
   options[name] = value;
  }
 }
 // Match carlos deploy: --ttl also implies --temporary; omission uses its 7d default.
 if (options.ttl) {
  const day = /^(\d+)d$/i.exec(options.ttl);
  const durations = [...options.ttl.toLowerCase().matchAll(/(\d+(?:\.\d+)?)(ms|us|µs|ns|h|m|s)/g)];
  const seconds = day ? Number(day[1])*86400 : durations.reduce((n,m) => n+Number(m[1])*({h:3600,m:60,s:1,ms:0.001,us:0.000001,'µs':0.000001,ns:0.000000001}[m[2]]),0);
  if ((!day && durations.map(m => m[0]).join('') !== options.ttl.toLowerCase()) || seconds < 3600 || seconds > 30*86400) throw new Error('--ttl must be a duration from 1h to 30d');
  options.temporary = true;
 }
 for (const name of ['console','account','app','site-origin','console-origin','account-url',...(options.temporary ? [] : ['channel'])]) {
  if (!options[name]) throw new Error(`--${name} is required; ${usage}`);
 }
 const origin = value => {
  let url;
  try { url = new URL(value); } catch { throw new Error('--console requires an HTTPS origin'); }
  if (url.protocol !== 'https:' || url.username || url.password || (value !== url.origin && value !== url.origin+'/')) throw new Error('--console requires an HTTPS origin');
  return url.origin;
 };
 options.console = origin(options.console);
 loadStartConfig(releaseEnvironment(options,{}));
 return options;
}

export function releaseEnvironment(options, inherited = process.env) {
 const env = {...inherited};
 for (const key of Object.keys(env)) if (key.startsWith('CARLOS_START_')) delete env[key];
 // Explicit destinations must not inherit local direct-mode or destination selection.
 for (const key of ['CARLOS_DESTINATION','CARLOS_DEPLOYMENT_BUCKET','CARLOS_DEPLOYMENT_DIR']) delete env[key];
 Object.assign(env,{CARLOS_START_DEMO:'1',CARLOS_START_SITE_ORIGIN:options['site-origin'],CARLOS_START_CONSOLE_ORIGIN:options['console-origin'],CARLOS_START_ACCOUNT_URL:options['account-url']});
 if (options['claim-draft']) env.CARLOS_START_CLAIM_DRAFT = '1';
 if (options['claim-off']) env.CARLOS_START_CLAIM = 'off';
 return env;
}

export function validateReleaseTree(status, merged, allowUnmerged) {
 if (status.trim()) throw new Error('release requires a clean tree, including untracked files');
 if (!merged && !allowUnmerged) throw new Error('HEAD must be reachable from origin/main; dev previews require --allow-unmerged-dev');
 return !merged ? 'WARNING: --allow-unmerged-dev permits this unmerged commit for a development preview only.' : '';
}

export function deployArgs(options,version) {
 return ['deploy','--console',options.console,'--account',options.account,'--app',options.app,
  '--kind','static',...(options.channel ? ['--channel',options.channel] : []),
  '--version',version,'--no-prompt',...(options.temporary ? ['--temporary'] : []),
  ...(options.ttl ? ['--ttl',options.ttl] : []),'_site'];
}

export function channelVersion(output,channel) {
 // carlos channels exposes a table, not a JSON flag. Refuse unreadable/ambiguous rows.
 const rows = output.replace(/\x1b\[[0-9;]*m/g,'').split('\n').map(line => line.trim().split(/\s+/)).filter(row => row[0] === channel);
 if (rows.length !== 1 || !/^[a-zA-Z0-9._-]+$/.test(rows[0][1] || '') || rows[0][1] === 'ERROR') throw new Error('cannot determine the current channel version for rollback');
 return rows[0][1];
}

const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
function run(command,args,cwd,env,capture = false) {
 const result = spawnSync('nice',['-n','10',command,...args],{cwd,env,encoding:'utf8',stdio:capture ? ['ignore','pipe','pipe'] : ['ignore','inherit','inherit'],timeout:600_000,maxBuffer:16*1024*1024});
 if (result.error || result.status !== 0) throw new Error(`${command} failed (${result.error?.message || result.signal || result.status})${capture ? ': '+result.stderr : ''}`);
 return result.stdout || '';
}
function verifyCacheBust(dir) {
 for (const entry of readdirSync(dir,{withFileTypes:true})) {
  const file = join(dir,entry.name);
  if (entry.isDirectory()) verifyCacheBust(file);
  else if (entry.name.endsWith('.html') && readFileSync(file,'utf8').includes('?v=0"')) throw new Error('unversioned asset remains after cache busting');
 }
}

export function releaseStart(argv,root = resolve(import.meta.dirname,'..')) {
 const options = parseReleaseArgs(argv);
 const env = releaseEnvironment(options);
 const git = args => run('git',args,root,env,true).trim();
 const status = git(['status','--porcelain=v1','--untracked-files=all']);
 const commit = git(['rev-parse','HEAD']);
 const ancestor = spawnSync('git',['merge-base','--is-ancestor',commit,'origin/main'],{cwd:root,env,encoding:'utf8'});
 if (ancestor.error || ![0,1].includes(ancestor.status)) throw new Error('cannot check origin/main ancestry; refresh the local origin/main ref before releasing');
 const warning = validateReleaseTree(status,ancestor.status === 0,options['allow-unmerged-dev']);
 if (warning) console.warn(warning);
 if (options['claim-draft']) console.warn('WARNING: --claim-draft builds a development preview with claiming unavailable; do not publish it as a public release.');
 const version = git(['rev-parse','--short',commit]);
 const cache = join(homedir(),'.cache');
 mkdirSync(cache,{recursive:true});
 const scratch = mkdtempSync(join(cache,'carlos-start-release-'));
 try {
  const exported = join(scratch,'export');
  const work = join(scratch,'scratch');
  mkdirSync(exported); mkdirSync(work);
  const archive = join(scratch,'source.tar');
  run('git',['archive','--format=tar',`--output=${archive}`,commit],root,env);
  run('tar',['-xf',archive,'-C',exported],root,env);
  const buildEnv = {...env,STARTER_SCRATCH:work,TMPDIR:work};
  run('npm',['ci'],exported,buildEnv);
  run('npm',['run','check:start'],exported,buildEnv);
  run('npm',['run','check'],exported,buildEnv);
  run(process.execPath,['hack/cache-bust.mjs',version],exported,buildEnv);
  verifyCacheBust(join(exported,'_site'));
  let previousVersion = null;
  if (!options.temporary) {
   const channels = run('carlos',['channels','--console',options.console,'--account',options.account,'--app',options.app],exported,buildEnv,true);
   previousVersion = channelVersion(channels,options.channel);
  }
  const record = {commit,version,console:options.console,account:options.account,app:options.app,channel:options.channel || null,siteOrigin:options['site-origin'],temporary:Boolean(options.temporary),previousVersion};
  // Printed outside the disposable export so the operator can retain rollback evidence.
  console.log(JSON.stringify(record));
  const args = deployArgs(options,version);
  console.log(`cd ${quote(exported)} && ${['carlos',...args].map(quote).join(' ')}`);
  if (options.execute) run('carlos',args,exported,buildEnv);
  else console.log('Preview only. The export is removed; rerun with --execute to build and deploy.');
  return record;
 } finally {
  rmSync(scratch,{recursive:true,force:true});
 }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
 try { releaseStart(process.argv.slice(2)); }
 catch (error) { console.error(error.message); process.exitCode = 1; }
}
