// 🤖 Check the published bytes against the real platform validator, then build and run offline.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '..');
const source = join(root, 'src/start/starter/v1');
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'usage: npm run check:starter -- --platform <checkout> (requires STARTER_SCRATCH or TMPDIR on disk, outside /tmp)');
assert.equal(args[0], '--platform');
const platform = resolve(args[1]);
const base = process.env.STARTER_SCRATCH || tmpdir();
assert.ok(!/^\/tmp(?:\/|$)/.test(base), 'set STARTER_SCRATCH or disk TMPDIR');
mkdirSync(base, { recursive: true });
const scratch = mkdtempSync(join(base, 'check-'));
const hash = b => createHash('sha256').update(b).digest('hex');
const env = { ...process.env, TMPDIR: scratch, GOWORK:'off', GOTOOLCHAIN:'local', GOENV:'off', GOFLAGS:'', GOPROXY:'off', GOSUMDB:'off', CGO_ENABLED:'0' };
for (const key of ['GOOS','GOARCH','GOEXPERIMENT','GOCACHEPROG']) delete env[key];
function run(command, argv, cwd = root, extra = {}) {
 const result = spawnSync('nice', ['-n','10',command,...argv], { cwd, env:{...env,...extra}, encoding:'utf8', stdio:['ignore','pipe','pipe'], timeout:300_000, maxBuffer:8*1024*1024 });
 if (result.stdout) process.stdout.write(result.stdout);
 if (result.stderr) process.stderr.write(result.stderr);
 assert.equal(result.status, 0, `${command} ${argv.join(' ')} failed: ${result.error || result.signal || result.status}`);
 return result.stdout.trim();
}
try {
 run(process.execPath,['--test','test/starter-pack.test.mjs']);
 const manifest = JSON.parse(readFileSync(join(source,'manifest.json'),'utf8'));
 const lock = readFileSync(join(platform,'internal/demobuild/toolchain.lock.json'));
 assert.equal(hash(lock), 'a858eb184a5255068a4a56470e3549a2a7d4718635a90fe69f40e9faff3948c5');
 assert.equal(manifest.lockSHA256, hash(lock));
 const commit = existsSync(join(platform,'.commit')) ? readFileSync(join(platform,'.commit'),'utf8').trim() : run('git',['rev-parse','HEAD'],platform);
 assert.equal(manifest.platformCommit,commit);
 const archive = join(scratch,'source.tar.gz');
 run('python3',['-B',join(root,'hack/pack-starter.py'),source,archive]);
 const published = readFileSync(join(source,'source.tar.gz'));
 const repacked = readFileSync(archive);
 assert.equal(hash(published),manifest.archiveSHA256);
 // 🤖 Deflate bytes can vary across zlib versions; the tar and gzip metadata cannot.
 for (const bytes of [published,repacked]) {
  assert.deepEqual([...bytes.subarray(0,8)],[31,139,8,0,0,0,0,0]);
  assert.equal(bytes[9],255);
 }
 assert.deepEqual(gunzipSync(repacked),gunzipSync(published));
 for (const file of ['go.mod','go.sum']) assert.deepEqual(readFileSync(join(source,file)),readFileSync(join(platform,'internal/console/testdata/demo',file)));
 assert.match(run('go',['version']),/^go version go1\.26\.10 /);
 const overlay = join(scratch,'overlay.json');
 writeFileSync(overlay,JSON.stringify({Replace:{[join(platform,'internal/demobuild/website_starter_contract_test.go')]:join(root,'test/starter/website_starter_contract_test.go.txt')}}));
 run('go',['test',`-overlay=${overlay}`,'-mod=readonly','./internal/demobuild','-run','^TestWebsiteStarterContract$','-count=1','-v'],platform,{WEBSITE_STARTER_ARCHIVE:join(source,'source.tar.gz')});
 const app = join(scratch,'app');
 mkdirSync(app);
 for (const {path,digest} of manifest.files.map(f=>({path:f.path,digest:f.sha256}))) {
  assert.ok(!path.startsWith('/') && !path.split('/').includes('..'));
  const bytes = readFileSync(join(source,path)); assert.equal(hash(bytes),digest);
  mkdirSync(resolve(app,path,'..'),{recursive:true}); writeFileSync(join(app,path),bytes);
 }
 const original = ['go.mod','go.sum'].map(f=>readFileSync(join(app,f)));
 const local = join(scratch,'shop');
 run('go',['build','-mod=readonly','-trimpath','-buildvcs=false','-o',local,'.'],app);
 assert.ok(statSync(local).size<=33_554_432);
 console.log(`local binary: ${statSync(local).size} bytes (cap 33554432)`);
 const arm = join(scratch,'shop-linux-arm64');
 run('go',['build','-mod=readonly','-trimpath','-buildvcs=false','-o',arm,'.'],app,{GOOS:'linux',GOARCH:'arm64'});
 assert.ok(statSync(arm).size<=33_554_432);
 const elf=readFileSync(arm);
 assert.equal(elf.subarray(0,4).toString('hex'),'7f454c46'); assert.equal(elf.readUInt16LE(18),183);
 console.log(`linux/arm64 binary: ${statSync(arm).size} bytes (cap 33554432)`);
 cpSync(join(root,'test/starter/main_test.go.txt'),join(app,'main_test.go'));
 run('go',['test','-mod=readonly','-run','^TestStarterFlagsAndPersistence$','-count=1','-v','.'],app,{STARTER_BINARY:local,STARTER_RUNTIME_DIR:base});
 for (const [i,file] of ['go.mod','go.sum'].entries()) assert.deepEqual(readFileSync(join(app,file)),original[i]);
 console.log(`starter check passed; modules unchanged; archive SHA-256 ${manifest.archiveSHA256}`);
} finally {
 rmSync(scratch,{recursive:true,force:true});
}
