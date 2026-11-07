import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStart, escapeHTML } from '../hack/build-start.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
const read=p=>readFile(p,'utf8');
const copy=JSON.parse(await read('src/_data/start-copy.json'));
const env={CARLOS_START_DEMO:'1',CARLOS_START_SITE_ORIGIN:'https://carlosframework.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.carloku.com',CARLOS_START_ACCOUNT_URL:'https://console.carloku.com/'};
const base=process.env.STARTER_SCRATCH||tmpdir();assert.ok(!/^\/tmp(?:\/|$)/.test(base),'use disk scratch');
async function pages(fn,overrides={}) {await mkdir(base,{recursive:true});const dir=await mkdtemp(join(base,'start-pages-'));try{await buildStart(dir,loadStartConfig({...env,...overrides}));await fn(await read(join(dir,'index.html')),await read(join(dir,'start/index.html')));}finally{await rm(dir,{recursive:true,force:true});}}
const plain=html=>html.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,'').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"');
test('enabled homepage has the approved centred hero and three parts',()=>pages(async(home,start)=>{
 const hero=home.match(/<section class="c-hero">[\s\S]*?<\/section>/)[0];
 assert.equal(plain(hero.match(/<h1>([\s\S]*?)<\/h1>/)[1]),'Want to ship faster, build better apps with AI, and save on running costs?');
 for(const phrase of ['build better apps','with AI,','running costs?']) assert.ok(hero.includes(`<span class="nw">${phrase}</span>`));
 assert.match(hero,/<!-- 👨 Paul's words, verbatim --><h1>/);
 assert.ok(plain(hero).includes('CARLOS does all that and more. Read on, or try it now with your agent'));
 assert.match(hero,/<a href="#architecture">Read on<\/a>/);
 assert.doesNotMatch(home,/class="hero-tools"|class="hero-wordmark"|class="hero-subtitle"/);
 assert.match(hero,/<span class="robot">🤖<\/span><div class="paste v-soft">/);
 for(const key of ['home.paste.label','home.paste.works']) assert.ok(hero.includes(escapeHTML(copy[key])));
 const parts=home.match(/<section class="parts"[\s\S]*?<\/section>/)[0];
 assert.match(parts,/id="architecture"/);
 assert.match(parts,/<ol class="px-flow" role="list">/);
 assert.equal((parts.match(/<li class="px px-/g)||[]).length,3);
 assert.equal((parts.match(/class="px-join"/g)||[]).length,2);
 for(const [key,value] of Object.entries(copy).filter(([key])=>key.startsWith('home.parts.'))) assert.ok(parts.includes(escapeHTML(value)),key);
 assert.match(parts,/<a href="\/attributes\/" target="_blank" rel="noopener noreferrer">The CARLOS architecture<\/a>/);
 const source=await read('src/index.html');
 assert.ok(parts.includes(source.match(/<h2 id="promise-title">[\s\S]*?<\/h2>/)[0]));
 assert.ok(plain(parts).includes(plain(source.match(/<span class="arch-text">([^<]*)/)[1])));
 assert.ok(parts.includes(source.match(/<p class="architecture-inspiration">[\s\S]*?<\/p>/)[0].replace('architecture-inspiration','px-foot')));
 for(const href of ['https://github.com/carlosframework/skills/blob/main/skills/getting-started/SKILL.md','https://github.com/carlosframework/skills/blob/main/skills/building-carlos-apps/SKILL.md','https://rastrillo.org','https://rastrillo.org/design-system/','https://carloku.com','/platform/self-host/']) assert.ok(parts.includes(`href="${href}" target="_blank" rel="noopener noreferrer"`));
 assert.doesNotMatch(hero+parts,/style=|—/);
 assert.ok(home.includes(`<meta name="description" content="${copy['home.meta.description']}">`));
 assert.ok(home.includes(`<meta property="og:description" content="${copy['home.og.description']}">`));
 for(const html of [home,start]) {
  assert.ok(plain(html).includes(copy['start.prompt']));
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
  for(const m of html.matchAll(/data-copy-target="([^"]+)"/g)) assert.ok(ids.includes(m[1]));
  assert.match(html,/class="copy-button [^"]+" hidden/);
  for(const id of ['copy.label','copy.done','copy.aria','copy.fallback','home.paste.done']) assert.ok(html.includes(escapeHTML(copy[id])),id);
  assert.match(html,/role="status" aria-live="polite"/);
 }
}));
test('development paste URL wraps only at separators and copies the generated line',()=>pages((home,start)=>{
 const url='https://tmp-pj4lpm.bab.dev.oncarlos.com/start';
 const prompt=home.match(/<span id="home-prompt">([\s\S]*?)<\/p>/)[1];
 assert.ok(plain(prompt).includes(`Follow the directions on ${url}`));
 assert.match(prompt,/class="pb-url pb-url-wrap"/);
 assert.match(prompt,/<wbr>/);
 for(const match of prompt.matchAll(/(.)<\/span><wbr>/g)) assert.match(match[1],/[./]/);
 assert.ok(start.includes(`>Follow the directions on ${url}</code>`));
},{CARLOS_START_SITE_ORIGIN:'https://tmp-pj4lpm.bab.dev.oncarlos.com'}));
for(const [name,overrides,hosts] of [
 ['production defaults',{},['carlosframework.com','console.carloku.com']],
 ['dev defaults',{CARLOS_START_SITE_ORIGIN:'https://dev.example.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.dev.example.com',CARLOS_START_ACCOUNT_URL:'https://console.dev.example.com/'},['dev.example.com','console.dev.example.com']],
 ['separate API',{CARLOS_START_SITE_ORIGIN:'https://dev.example.com',CARLOS_START_API_ORIGIN:'https://api.dev.example.com'},['dev.example.com','api.dev.example.com']],
 ['shared site and API',{CARLOS_START_API_ORIGIN:'https://carlosframework.com'},['carlosframework.com']],
 ['shared hostname with distinct ports',{CARLOS_START_SITE_ORIGIN:'https://dev.example.com:8443',CARLOS_START_API_ORIGIN:'https://dev.example.com:9443'},['dev.example.com']],
 ['escaped hosts',{CARLOS_START_SITE_ORIGIN:'https://site&dev.example.com',CARLOS_START_API_ORIGIN:'https://api&dev.example.com'},['site&dev.example.com','api&dev.example.com']],
]) test(`host note appears once directly under each paste line: ${name}`,()=>pages((home,start)=>{
 const expected=`<p class="start-hosts">Make sure your agent has access to ${hosts.map(host=>`<code>${escapeHTML(host)}</code>`).join(' and ')}</p>`;
 for(const [html,id] of [[home,'home-prompt'],[start,'start-prompt']]) {
  assert.equal((html.match(/class="start-hosts"/g)||[]).length,1);
  assert.ok(html.includes(`<!-- 👨 Paul's words, verbatim -->${expected}`));
  assert.ok(html.indexOf(`id="${id}"`)<html.indexOf(expected));
  const site=loadStartConfig({...env,...overrides}).siteOrigin;
  assert.ok(plain(html).includes(`Follow the directions on ${site}/start`));
 }
},overrides));
test('start order, approved text arrays, complete instructions and unchanged account block',()=>pages(async(_,start)=>{
 const positions=['<h1>','class="intro"','id="start-prompt"','<ol>','Keep it','href="#account"','id="account"','id="for-your-agent"','<!-- agent-content -->'].map(s=>start.indexOf(s));
 assert.ok(positions.every((p,i)=>p>=0 && (!i||p>positions[i-1])));
 for(const [id,value] of Object.entries(copy).filter(([id])=>id.startsWith('start.')&&!id.startsWith('start.hosts.')&&!['start.prompt','start.config.error'].includes(id))) for(const text of [value].flat()) assert.ok(start.includes(escapeHTML(text)),id);
 const account=(await read('src/start/index.html')).match(/<div class="start-tabs">[\s\S]*?(?=<\/div><\/section><\/main>)/)[0];assert.ok(start.includes(account));
 const section=start.split('id="for-your-agent"')[1];assert.doesNotMatch(section,/<details|<[^>]*\bhidden\b/);assert.match(section,/GOOS=linux GOARCH=arm64/);
}));
test('approved copy archive and starter UI bytes agree exactly',async()=>{
 const rows=JSON.parse(await read('copy-review/start-demo-2026-11-05/strings.json'));
 // Paul's later reviews supersede the 2026-11-05 archive, string by string.
 const later=JSON.parse(await read('copy-review/start-2026-11-07/result.json'));
 const approved=new Map(later.strings.map(s=>[s.id,s.text]));
 for(const row of rows) if(approved.has(row.id)) row.text=approved.get(row.id);
 for(const {id,text} of rows) {
  if(id.startsWith('home.hero.') || id.startsWith('start.hosts.')) continue;
  assert.deepEqual(copy[id],text,id);
 }
 const go=await read('src/start/starter/v1/main.go');assert.doesNotMatch(go,/DRAFT copy/);
 for(const row of rows.filter(r=>r.id.startsWith('starter.'))) assert.ok(go.includes(JSON.stringify(row.text)),row.id);
});
test('clipboard enhancement has no API client and exposes reviewed fallback',async()=>{
 const js=await read('src/start/start-tabs.js');assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|https?:\/\/|localStorage/);
 assert.match(js,/button\.hidden = false/);assert.match(js,/dataset\.copyFallback/);assert.match(js,/selectNodeContents\(code\)/);assert.match(js,/dataset\.copyStatus/);
});

test('homepage and host copy matches Paul’s approved November 7 brief verbatim',()=>{
 const approved={
  "start.hosts.two": "Make sure your agent has access to {siteHost} and {apiHost}",
  "start.hosts.one": "Make sure your agent has access to {host}",
  "home.hero.heading": "Want to ship faster, build better apps with AI, and save on running costs?",
  "home.hero.answer": "CARLOS does all that and more.",
  "home.hero.ask": "Read on, or try it now with your agent",
  "home.paste.label": "For your agent",
  "home.paste.works": "Works with Claude Code, Codex and Cursor",
  "home.paste.done": "Copied. Paste it into your agent.",
  "home.parts.intro": "Three parts make it work:",
  "home.parts.join.builds": "builds your app with",
  "home.parts.join.runs": "runs on",
  "home.parts.skill.title": "The skill",
  "home.parts.skill.is": "Instructions your coding agent reads before it starts.",
  "home.parts.skill.why": "It teaches your agent to build and ship apps the CARLOS way, so you don’t have to learn how first.",
  "home.parts.skill.start": "Get started",
  "home.parts.skill.build": "Build apps",
  "home.parts.rastrillo.title": "Rastrillo",
  "home.parts.rastrillo.is": "The Go web framework your app is built on.",
  "home.parts.rastrillo.why": "It gives your agent ready-made parts for many kinds of apps, so it writes less from scratch.",
  "home.parts.rastrillo.site": "rastrillo.org",
  "home.parts.rastrillo.design": "Fiesta design system",
  "home.parts.platform.title": "CARLOS Platform",
  "home.parts.platform.is": "Where your app runs: hosted on Carloku or on your own hardware.",
  "home.parts.platform.why": "It puts your app online with HTTPS, backs up its data as it changes, and puts it to sleep when nobody is using it.",
  "home.parts.platform.start": "Start with Carloku",
  "home.parts.platform.self": "or self-host"
};
 for(const [key,value] of Object.entries(approved)) assert.equal(copy[key],value,key);
 assert.deepEqual(Object.keys(copy).filter(key=>key.startsWith("home.hero.")).sort(),["home.hero.answer","home.hero.ask","home.hero.heading"]);
});

test('clipboard success, reset, failure and retry keep both paste boxes usable',async()=>{
 const {runInNewContext}=await import('node:vm');
 for(const kind of ['paste','start-prompt']) {
  const classes=new Set(), label={textContent:'Copy'}, status={textContent:''};
  const code={textContent:'Follow the directions on https://carlosframework.com/start'};
  let click, timer, selected, written, fail=false;
  const box={classList:{add:(...names)=>names.forEach(n=>classes.add(n)),remove:(...names)=>names.forEach(n=>classes.delete(n))}};
  const button={hidden:true,dataset:{copyTarget:'prompt',copyStatus:'status',original:copy['copy.label'],copied:copy['copy.done'],copySuccess:copy['home.paste.done'],copyFallback:copy['copy.fallback']},querySelector:()=>label,closest:selector=>{assert.ok(selector.includes('.'+kind));return box;},addEventListener:(event,handler)=>{assert.equal(event,'click');click=handler;}};
  runInNewContext(await read('src/start/start-tabs.js'),{
   document:{querySelectorAll:()=>[button],getElementById:id=>id==='prompt'?code:status,createRange:()=>({selectNodeContents:node=>{selected=node;}})},
   navigator:{clipboard:{writeText:async text=>{if(fail) throw Error('denied');written=text;}}},
   getSelection:()=>({removeAllRanges(){},addRange(){}}),
   clearTimeout:()=>{timer=undefined;},setTimeout:callback=>{timer=callback;return 1;},
  });
  assert.equal(button.hidden,false);
  await click();
  assert.equal(written,code.textContent);
  assert.equal(label.textContent,'Copied');assert.equal(status.textContent,'Copied. Paste it into your agent.');assert.ok(classes.has('is-copied'));
  timer();assert.equal(label.textContent,'Copy');assert.equal(status.textContent,'');assert.ok(!classes.has('is-copied'));
  fail=true;await click();assert.equal(selected,code);assert.equal(status.textContent,copy['copy.fallback']);assert.ok(classes.has('copy-failed'));assert.ok(!classes.has('is-copied'));
  fail=false;await click();assert.ok(classes.has('is-copied'));assert.ok(!classes.has('copy-failed'));assert.equal(status.textContent,copy['home.paste.done']);
 }
});
