// 🤖 Regenerate enabled output and the disabled site after footer injection.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { buildStart } from './build-start.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';

const base=process.env.STARTER_SCRATCH || process.env.TMPDIR;
assert.ok(base && !/^\/tmp(?:\/|$)/.test(resolve(base)), 'set STARTER_SCRATCH or disk TMPDIR');
const path='test/fixtures/start-enabled-baseline.json';
const baseline=JSON.parse(await readFile(path,'utf8'));
delete baseline.commit;
baseline.generatedBy='npm run update:start-baselines';
await mkdir(base,{recursive:true});
const dir=await mkdtemp(join(base,'start-baselines-'));
try {
 const disabledPath='test/fixtures/start-baseline.json';
 const disabled=JSON.parse(await readFile(disabledPath,'utf8'));
 const clean={...process.env};
 for(const key of Object.keys(clean)) if(key.startsWith('CARLOS_START_')) delete clean[key];
 execFileSync(process.execPath,['node_modules/@11ty/eleventy/cmd.cjs',`--output=${dir}`],{env:clean,stdio:'pipe'});
 for(const name of Object.keys(disabled)) {
  disabled[name]=createHash('sha256').update(await readFile(join(dir,name))).digest('hex');
 }
 await writeFile(disabledPath,JSON.stringify(disabled,null,2)+'\n');
 for(const entry of baseline.cases) {
  await buildStart(dir,loadStartConfig(entry.env));
  for(const name of Object.keys(entry.hashes)) {
   entry.hashes[name]=createHash('sha256').update(await readFile(join(dir,name))).digest('hex');
  }
 }
 await writeFile(path,JSON.stringify(baseline,null,2)+'\n');
} finally {
 await rm(dir,{recursive:true,force:true});
}
