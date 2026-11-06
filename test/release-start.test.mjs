import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseReleaseArgs, releaseEnvironment, validateReleaseTree, deployArgs, channelVersion } from '../hack/release-start.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';

const input = {
 console:'https://release.example.com',account:'test-account',app:'shop',channel:'canary/dev',
 'site-origin':'https://site.example.com','console-origin':'https://console.example.com','account-url':'https://console.example.com/account',
};
const argv = (values = input) => Object.entries(values).flatMap(([key,value]) => [`--${key}`,value]);
test('all release and build destinations are explicit, with preview as the default',() => {
 const options = parseReleaseArgs(argv());
 assert.deepEqual(options,input);
 assert.equal(options.execute,undefined);
 assert.deepEqual(deployArgs(options,'abc1234'),['deploy','--console',input.console,'--account',input.account,'--app',input.app,'--kind','static','--channel',input.channel,'--version','abc1234','--no-prompt','_site']);
});
for (const name of Object.keys(input)) test(`requires --${name}`,() => {
 const incomplete = {...input}; delete incomplete[name];
 assert.throws(() => parseReleaseArgs(argv(incomplete)),new RegExp(`--${name} is required`));
});
test('rejects unknown, duplicate, positional, missing, blank and control-character arguments',() => {
 for (const extra of [['--unknown'],['--console',input.console],['--execute','--execute'],['site'],['--ttl'],['--ttl',''],['--ttl','--execute'],['--ttl',' 1d'],['--ttl','1d\n'],['--execute=yes']]) assert.throws(() => parseReleaseArgs([...argv(),...extra]));
});
test('rejects non-HTTPS, credentials, query, fragment and path in console and site origins',() => {
 for (const key of ['console','site-origin','console-origin','api-origin']) {
  for (const bad of ['http://example.com','https://user:secret@example.com','https://example.com/path','https://example.com?query','https://example.com#fragment','https://example.com\\evil']) assert.throws(() => parseReleaseArgs(argv({...input,[key]:bad})));
 }
 assert.throws(() => parseReleaseArgs(argv({...input,'account-url':'https://other.example.com/'})));
});
test('optional API origin passes only to the build and cannot inherit an ambient origin',()=>{
 const inherited={CARLOS_START_API_ORIGIN:'https://wrong.example.com'};
 const defaults=releaseEnvironment(parseReleaseArgs(argv()),inherited);
 assert.equal(defaults.CARLOS_START_API_ORIGIN,undefined);
 assert.equal(loadStartConfig(defaults).apiOrigin,input['console-origin']);
 const options=parseReleaseArgs([...argv(),'--api-origin','https://api.example.com']);
 const env=releaseEnvironment(options,inherited);
 assert.equal(env.CARLOS_START_API_ORIGIN,'https://api.example.com');
 assert.equal(loadStartConfig(env).apiOrigin,'https://api.example.com');
 assert.equal(loadStartConfig(env).consoleOrigin,input['console-origin']);
 assert.deepEqual(deployArgs(options,'abc1234'),deployArgs(input,'abc1234'));
 for(const extra of [['--api-origin'],['--api-origin',''],['--api-origin','--execute'],['--api-origin','https://one.example.com','--api-origin','https://two.example.com']]) assert.throws(()=>parseReleaseArgs([...argv(),...extra]));
});
test('temporary deployment does not require a channel and forwards TTL and execute explicitly',() => {
 const values = {...input}; delete values.channel;
 const options = parseReleaseArgs([...argv(values),'--temporary','--ttl','2d','--execute','--allow-unmerged-dev']);
 assert.equal(options.execute,true);
 const command = deployArgs(options,'abc1234');
 assert.ok(!command.includes('--channel'));
 assert.deepEqual(command.slice(-4),['--temporary','--ttl','2d','_site']);
 assert.ok(!command.includes('--allow-unmerged-dev'));
});
test('TTL implies temporary, defaults stay with CLI, and valid bounds match CLI help',() => {
 const values = {...input}; delete values.channel;
 assert.equal(parseReleaseArgs([...argv(values),'--temporary']).ttl,undefined);
 for (const ttl of ['1h','1h30m','1d','30d','720h']) assert.equal(parseReleaseArgs([...argv(values),'--ttl',ttl]).temporary,true);
 for (const ttl of ['0d','31d','59m','721h','1.5d','garbage','1hgarbage','Infinityd']) assert.throws(() => parseReleaseArgs([...argv(values),'--ttl',ttl]));
});
test('ambient live origins and claim switches are removed',() => {
 const inherited = {CARLOS_START_CLAIM:'off',CARLOS_START_LIVE_ORIGIN:'https://never.example.com',CARLOS_START_SITE_ORIGIN:'https://wrong.example.com',CARLOS_DESTINATION:'flagship',CARLOS_DEPLOYMENT_BUCKET:'bucket',CARLOS_DEPLOYMENT_DIR:'/private',PATH:'/bin'};
 const options = parseReleaseArgs(argv());
 const env = releaseEnvironment(options,inherited);
 assert.equal(env.CARLOS_START_CLAIM,undefined);
 assert.equal(env.CARLOS_START_LIVE_ORIGIN,undefined);
 assert.equal(env.CARLOS_START_SITE_ORIGIN,input['site-origin']);
 assert.equal(env.CARLOS_START_DEMO,'1');
 assert.equal(env.CARLOS_DESTINATION,undefined);
 assert.equal(env.CARLOS_DEPLOYMENT_BUCKET,undefined);
 assert.equal(env.CARLOS_DEPLOYMENT_DIR,undefined);
 assert.equal(env.PATH,'/bin');
});
test('claim-off passes through only to the build',() => {
 const options=parseReleaseArgs([...argv(),'--claim-off']);
 assert.equal(options['claim-off'],true);
 const env=releaseEnvironment(options,{});
 assert.equal(env.CARLOS_START_CLAIM,'off');
 assert.ok(!deployArgs(options,'abc1234').includes('--claim-off'));
 assert.throws(()=>parseReleaseArgs([...argv(),'--claim-off','--claim-off']),/duplicate --claim-off/);
});
test('clean merged commits pass; unmerged commits require an override and a warning',() => {
 assert.equal(validateReleaseTree('',true,false),'');
 assert.throws(() => validateReleaseTree('',false,false),/origin\/main/);
 assert.match(validateReleaseTree('',false,true),/WARNING.*unmerged.*development preview/);
});
test('dirty or untracked trees are refused even for dev exports',() => {
 for (const status of [' M package.json','M  package.json','?? untracked']) {
  for (const allow of [false,true]) assert.throws(() => validateReleaseTree(status,true,allow),/clean tree/);
 }
});
test('rollback version comes from the exact channel row, without relying on a tag',() => {
 const table = 'Using console\nCHANNEL VERSION PROMOTED TAG DIGESTS\ncanary/other xyz123 2026-11-05 v1 ok\ncanary/dev abc1234 2026-11-05 v2 ok\n';
 assert.equal(channelVersion(table,'canary/dev'),'abc1234');
 assert.equal(channelVersion('\x1b[32mcanary/dev\x1b[0m abc1234 2026-11-05','canary/dev'),'abc1234');
 for (const bad of ['', 'canary/dev ERROR: unavailable','canary/dev ERROR unavailable','canary/dev abc\ncanary/dev def','canary/dev']) assert.throws(() => channelVersion(bad,'canary/dev'));
});
