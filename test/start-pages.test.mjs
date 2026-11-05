import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStart, escapeHTML } from '../hack/build-start.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
const read=p=>readFile(p,'utf8');
const copy=JSON.parse(await read('src/_data/start-copy.json'));
const env={CARLOS_START_DEMO:'1',CARLOS_START_CLAIM_DRAFT:'1',CARLOS_START_SITE_ORIGIN:'https://carlosframework.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.carloku.com',CARLOS_START_ACCOUNT_URL:'https://console.carloku.com/'};
const base=process.env.STARTER_SCRATCH||tmpdir();assert.ok(!/^\/tmp(?:\/|$)/.test(base),'use disk scratch');
async function pages(fn,origin) {await mkdir(base,{recursive:true});const dir=await mkdtemp(join(base,'start-pages-'));try{await buildStart(dir,loadStartConfig({...env,...(origin?{CARLOS_START_SITE_ORIGIN:origin}:{})}));await fn(await read(join(dir,'index.html')),await read(join(dir,'start/index.html')));}finally{await rm(dir,{recursive:true,force:true});}}
test('enabled hero uses approved copy, one primary paste action and preserved subtitle',()=>pages(async(home,start)=>{
 const hero=home.match(/<section class="hero">[\s\S]*?<\/section>/)[0];
 assert.doesNotMatch(hero,/\b\d+\s*[x×]/i);
 assert.equal((hero.match(/class="[^"]*\bprimary\b/g)||[]).length,1);
 for(const id of ['home.hero.promise','home.hero.intro','home.hero.action']) assert.ok(hero.includes(escapeHTML(copy[id])),id);
 assert.match(hero,/<span class="start-authorship">🤖<\/span><p class="hero-promise"><strong>/);
 const source=await read('src/index.html');
 assert.ok(hero.includes(source.match(/<p class="hero-subtitle">[\s\S]*?<\/p>/)[0]));
 assert.match(hero,/<!-- 👨 Constellation selected and copy supplied in chat --><p class="hero-subtitle">/);
 assert.ok(home.includes(`<meta name="description" content="${copy['home.meta.description']}">`));
 assert.ok(home.includes(`<meta property="og:description" content="${copy['home.og.description']}">`));
 assert.match(hero,/<a href="\/start\/">See how it works<\/a>/);
 assert.match(hero,/<a href="#architecture"><span>Learn more<\/span>&nbsp;↓<\/a>/);
 for(const html of [home,start]) {
  assert.ok(html.includes(`>${copy['start.prompt']}</code>`));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const m of html.matchAll(/data-copy-target="([^"]+)"/g)) assert.ok(ids.includes(m[1]));
  assert.match(html,/class="copy-button primary" hidden/);
  for(const id of ['copy.label','copy.done','copy.aria','copy.fallback']) assert.ok(html.includes(escapeHTML(copy[id])),id);
  assert.match(html,/role="status" aria-live="polite"/);
 }
}));
test('dev builds share a dev-origin paste line',()=>pages((home,start)=>{
 for(const html of [home,start]) {assert.ok(html.includes('>Follow the directions on https://dev.example.com/start</code>'));assert.ok(!html.includes('>Follow the directions on https://carlosframework.com/start</code>'));}
},'https://dev.example.com'));
test('start order, approved text arrays, complete instructions and unchanged account block',()=>pages(async(_,start)=>{
 const positions=['<h1>','class="intro"','id="start-prompt"','<ol>','Keep it','href="#account"','id="account"','id="for-your-agent"','<!-- agent-content -->'].map(s=>start.indexOf(s));
 assert.ok(positions.every((p,i)=>p>=0 && (!i||p>positions[i-1])));
 for(const [id,value] of Object.entries(copy).filter(([id])=>id.startsWith('start.')&&!['start.prompt','start.config.error'].includes(id))) for(const text of [value].flat()) assert.ok(start.includes(escapeHTML(text)),id);
 const account=(await read('src/start/index.html')).match(/<div class="start-tabs">[\s\S]*?(?=<\/div><\/section><\/main>)/)[0];assert.ok(start.includes(account));
 const section=start.split('id="for-your-agent"')[1];assert.doesNotMatch(section,/<details|\bhidden\b/);assert.match(section,/GOOS=linux GOARCH=arm64/);
}));
test('approved copy archive and starter UI bytes agree exactly',async()=>{
 const rows=JSON.parse(await read('copy-review/start-demo-2026-11-05/strings.json'));
 assert.deepEqual(copy,Object.fromEntries(rows.map(r=>[r.id,r.text])));
 const go=await read('src/start/starter/v1/main.go');assert.doesNotMatch(go,/DRAFT copy/);
 for(const row of rows.filter(r=>r.id.startsWith('starter.'))) assert.ok(go.includes(JSON.stringify(row.text)),row.id);
});
test('clipboard enhancement has no API client and exposes reviewed fallback',async()=>{
 const js=await read('src/start/start-tabs.js');assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|https?:\/\/|localStorage/);
 assert.match(js,/button\.hidden = false/);assert.match(js,/dataset\.copyFallback/);assert.match(js,/selectNodeContents\(code\)/);assert.match(js,/dataset\.copyStatus/);
});
