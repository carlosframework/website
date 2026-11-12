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
test('enabled homepage has hero B, its replay and the approved rework sections',()=>pages(async(home,start)=>{
 const hero=home.match(/<section class="c-hero hv hv-b">[\s\S]*?<\/figure>\n<\/div><\/section>/)[0];
 assert.equal(plain(hero.match(/<h1>([\s\S]*?)<\/h1>/)[1]),"You’re already using agents.");
 assert.ok(hero.includes('<span class="nw">using agents.</span>'));
 const sub=hero.match(/<p class="sub">([\s\S]*?)<\/p>/)[1];
 assert.equal(plain(sub),'Now you want to ship faster, build better and save money.');
 for(const word of ['faster','better','save money']) assert.ok(sub.includes(`<em>${word}</em>`));
 assert.ok(sub.includes('<em>save money</em>.'));
 assert.match(hero,/<!-- 👨 Paul's words, verbatim --><h1>/);
 // The answer, the line about CARLOS (one fixed sentence for screen readers), then the invitation.
 const ask=hero.match(/<p class="ask hv-ask">([\s\S]*?)<\/p>/)[1];
 assert.equal(plain(ask.replace(/<span class="hv-rot-line"[\s\S]*?web apps\.<\/span>/,'')),'You want CARLOS. A system for better web apps. Read on, or try it now:');
 assert.match(ask,/<span class="hv-rot-line" aria-hidden="true">A system for <span class="hv-rot" data-words="better remarkable faster accessible secure private simple resilient cheaper portable distributable decentralisable agent-ready"><span class="hv-rot-word">better<\/span><\/span> web apps\.<\/span>/);
 assert.match(hero,/<a href="#architecture">Read on<\/a>/);
 assert.doesNotMatch(home,/class="hero-tools"|class="hero-wordmark"|class="hero-subtitle"|class="parts"|class="riff-grid"|id="ready"/);
 assert.match(hero,/<div class="paste v-soft hv-paste">/);
 assert.ok(hero.includes(escapeHTML(copy['home.paste.label'])));
 assert.doesNotMatch(hero,/pb-works/);
 assert.match(hero,/<details class="hv-cloud"><summary>Using a cloud agent\?<\/summary><!-- 👨 Paul's words, verbatim --><p class="start-hosts">/);
 assert.match(hero,/<figure class="rp" aria-label="A real run of this journey, sped up">/);
 assert.match(hero,/<img src="\/home\/replay-panaderia-390\.png" width="780" height="1420" alt="The live page: Panadería Carlos, “Order today, collect mañana\.”, and a menu of Pan de pueblo, Magdalenas and Ensaimada\." decoding="async">/);
 // The mockup's furniture stays behind.
 assert.doesNotMatch(home,/🤖|class="robot"|hv-draft|rw-draft|rw-draftbar|rw-claim|hero-switch|hv-a\b|hero-current|notes\.html|DRAFT COPY|noindex/);
 const body=home.match(/<div class="rw">[\s\S]*<\/div>\n?<\/main>/)[0];
 assert.match(body,/<section class="rw-what" id="architecture"/);
 assert.deepEqual([...body.matchAll(/<section class="(rw-[a-z]+)"/g)].map(m=>m[1]),['rw-what','rw-tools','rw-get','rw-who','rw-end']);
 assert.match(body,/<h2 id="rw-what-title">CARLOS is a system for building better quality, more resilient, secure web apps that deploy easily\.<\/h2>\s*<p class="rw-what-sub">Inspired by UNIX principles, CARLOS deploys full stack web apps as single processes rather than sprawling containerised services, using fast compiled languages\. This unlocks a slew of benefits\.<\/p>/);
 assert.match(body,/<p class="rw-follow">It’s defined by an <a href="https:\/\/spec\.carlosframework\.com" target="_blank" rel="noopener noreferrer">open specification<\/a>\.<\/p>/);
 assert.match(body,/<p class="rw-closing"><strong>CARLOS is a set of strong opinions, not rules\.<\/strong> They’re the defaults we believe make web apps better for everyone, and for their agents\.<\/p>/);
 assert.ok(body.indexOf('class="rw-practice"')<body.indexOf('class="rw-closing"') && body.indexOf('class="rw-closing"')<body.indexOf('<section class="rw-tools"'));
 const source=await read('src/index.html');
 assert.ok(body.includes(source.match(/<p class="architecture-inspiration">[\s\S]*?<\/p>/)[0].replace('architecture-inspiration','rw-foot')));
 for(const href of ['https://github.com/carlosframework/skills/blob/main/skills/getting-started/SKILL.md','https://github.com/carlosframework/skills/blob/main/skills/building-carlos-apps/SKILL.md','https://rastrillo.org','https://rastrillo.org/design-system/','https://carloku.com']) assert.ok(body.includes(`href="${href}" target="_blank" rel="noopener noreferrer"`),href);
 for(const href of ['/platform/self-host/','/attributes/','/case-studies/tito/','/case-studies/jelly/','/case-studies/eleven/','/start/#account']) assert.ok(body.includes(`href="${href}"`),href);
 // "What you get" shows the headline figures; the number-free alternatives stay in the copy data.
 for(const k of ['ship','build','save']) {
  assert.ok(body.includes(`<p class="rw-fig">${escapeHTML(copy[`home.get.${k}.figure`])}</p>`),k);
  assert.ok(!body.includes(copy[`home.get.${k}.alt`]),k);
 }
 // The closing paste box repeats the hero's, with the line under it and no second host note.
 const end=body.match(/<section class="rw-end"[\s\S]*?<\/section>/)[0];
 assert.match(end,/<span id="end-prompt">/);
 assert.ok(end.includes(`<p class="pb-works">${escapeHTML(copy['home.end.paste.works'])}</p>`));
 // The interactive stacks: labels for screen readers from the copy, the view switch hidden until its script runs.
 const panel=body.match(/<article class="ipanel[\s\S]*?<\/article>/)[0];
 assert.match(panel,/<span class="seg" role="group" aria-label="Compare CARLOS with" hidden>/);
 for(const id of ['stacks.tower.aria','stacks.services.aria','stacks.after.aria']) assert.ok(panel.includes(`aria-label="${escapeHTML(copy['home.'+id])}"`),id);
 assert.deepEqual([...panel.matchAll(/<li class="balloon" data-job="([^"]+)"[\s\S]*?<span class="sr">([^<]+)<\/span><\/li>/g)].map(m=>`${m[1]}:${m[2]}`),['hosting:Hosting','database:Database','auth:Auth','email:Email','payments:Payments','file-storage:File storage','workers:Workers','search:Search','webhooks:Webhooks']);
 assert.match(panel,/<li class="micro" data-k="0" style="--k:0"><span class="sr">Microservices<\/span><\/li>/);
 assert.match(panel,/<li class="micro" data-k="5" style="--k:5" data-label="Microservices" aria-hidden="true"><\/li>/);
 assert.doesNotMatch(hero+body,/—/);
 // Spec links keep their visible text as the name (WCAG 2.5.3) and carry the approved longer label as a description.
 for(const [ref,aria] of [['1.ref','1.aria'],['2.ref','2.aria'],['2.ref2','2.aria2'],['3.ref','3.aria'],['4.ref','4.aria']]) assert.ok(body.includes(`aria-describedby="practice-${aria.replace('.','-')}">${escapeHTML(copy['home.practice.'+ref])}</a><span id="practice-${aria.replace('.','-')}" hidden>${escapeHTML(copy['home.practice.'+aria])}</span>`),aria);
 for(const asset of ['/home/hero.css','/home/sections.css','/home/stacks.css','/home/theme.css','/home/hero.js','/home/stacks.js']) assert.ok(home.includes(`="${asset}?v=0"`),asset);
 // The theme is set before anything is drawn: theme.js first in <head>, blocking, ahead of every stylesheet.
 const head=home.match(/<head>[\s\S]*?<\/head>/)[0];
 assert.ok(head.includes('<script src="/home/theme.js?v=0"></script>'));
 assert.ok(head.indexOf('/home/theme.js')<head.indexOf('/start/start.css') && head.indexOf('/home/theme.js')<head.indexOf('/home/hero.css'));
 // Auto, Light and Dark in the header, Auto pressed until the script reads the remembered choice.
 assert.ok(home.includes(`<div class="theme-switch" role="group" aria-label="${copy['home.theme.label']}" hidden><button type="button" data-theme-set="auto" aria-pressed="true">${copy['home.theme.auto']}</button><button type="button" data-theme-set="light" aria-pressed="false">${copy['home.theme.light']}</button><button type="button" data-theme-set="dark" aria-pressed="false">${copy['home.theme.dark']}</button></div>`));
 // The stacks' Pause reuses the replay's approved words.
 assert.ok(panel.includes(`<button type="button" class="ipause" data-pause="${copy['home.replay.pause']}" data-play="${copy['home.replay.play']}" hidden>${copy['home.replay.pause']}</button>`));
 assert.ok(home.includes(`<meta name="description" content="${copy['home.meta.description']}">`));
 assert.ok(home.includes(`<meta property="og:description" content="${copy['home.og.description']}">`));
 for(const html of [home,start]) {
  assert.doesNotMatch(html,/this section was generated by AI|start-authorship|Written by AI for your agent/);
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
 for(const [id,value] of Object.entries(copy).filter(([id])=>id.startsWith('start.')&&!id.startsWith('start.hosts.')&&!['start.prompt','start.config.error'].includes(id))) for(const text of [value].flat()) assert.ok(start.includes(id==='start.terms_line'?text:escapeHTML(text)),id);
 const account=(await read('src/start/index.html')).match(/<div class="start-tabs">[\s\S]*?(?=<\/div><\/section><\/main>)/)[0];assert.ok(start.includes(account));
 const section=start.split('id="for-your-agent"')[1];assert.doesNotMatch(section,/<details|<[^>]*\bhidden\b/);assert.match(section,/GOOS=linux GOARCH=arm64/);
}));
test('approved copy archive and starter UI bytes agree exactly',async()=>{
 assert.ok(!Object.hasOwn(copy,'start.authorship'));
 const rows=JSON.parse(await read('copy-review/start-demo-2026-11-05/strings.json'));
 // Paul's later reviews supersede the 2026-11-05 archive, string by string.
 const later=JSON.parse(await read('copy-review/start-2026-11-07/result.json'));
 const approved=new Map(later.strings.map(s=>[s.id,s.text]));
 for(const row of rows) if(approved.has(row.id)) row.text=approved.get(row.id);
 // Paul, 2026-11-07: no robot marker anywhere on this site. The approved
 // words stand; only a leading marker from the archive is dropped.
 for(const {id,text} of rows) {
  // Paul, 2026-11-07: remove start.authorship entirely; it no longer renders.
  if(id==='start.authorship') continue;
  if(id.startsWith('home.hero.') || id.startsWith('start.hosts.')) continue;
  assert.deepEqual(copy[id],typeof text==='string'?text.replace(/^🤖 /,''):text,id);
 }
 const go=await read('src/start/starter/v1/main.go');assert.doesNotMatch(go,/DRAFT copy/);
 for(const row of rows.filter(r=>r.id.startsWith('starter.'))) assert.ok(go.includes(JSON.stringify(row.text)),row.id);
});
test('clipboard enhancement has no API client and exposes reviewed fallback',async()=>{
 const js=await read('src/start/start-tabs.js');assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|https?:\/\/|localStorage/);
 assert.match(js,/button\.hidden = false/);assert.match(js,/dataset\.copyFallback/);assert.match(js,/selectNodeContents\(code\)/);assert.match(js,/dataset\.copyStatus/);
});

test('homepage and host copy matches Paul’s approved copy review verbatim',()=>{
 assert.ok(!Object.keys(copy).some(key=>key.startsWith('home.parts.join.')));
 const approved={
  "start.hosts.two": "Make sure your agent has access to {siteHost} and {apiHost}",
  "start.hosts.one": "Make sure your agent has access to {host}",
  "home.hero.heading": "You’re already using agents.",
  "home.hero.subheading": "Now you want to ship faster, build better and save money.",
  "home.hero.answer": "You want CARLOS.",
  "home.hero.ask": "Read on, or try it now:",
  "home.paste.label": "Paste this into your agent and it can take things from there",
  "home.end.paste.works": "Try it in with your preferred agent setup",
  "home.paste.done": "Copied. Paste it into your agent.",
  "home.parts.intro": "Three parts make it work:",
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
 assert.ok(!Object.hasOwn(copy,'home.paste.works'));
 assert.deepEqual(Object.keys(copy).filter(key=>key.startsWith("home.hero.")&&!key.startsWith("home.hero.gloss")).sort(),["home.hero.answer","home.hero.ask","home.hero.cloud.summary","home.hero.heading","home.hero.subheading"]);
});

// Visible text: text nodes outside script, style and comments, plus the attributes people hear or read.
const visible=html=>{
 const body=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style)\b[\s\S]*?<\/\1>/g,'').replace(/<head>[\s\S]*?<\/head>/,'');
 const attrs=[...body.matchAll(/\s(?:alt|aria-label|title|data-label|data-words|data-copied|data-original|data-copy-success|data-copy-fallback)="([^"]*)"/g)].map(m=>m[1]);
 return [plain(body),...attrs.map(plain)].join('\n');
};
test('homepage carries Paul’s 2026-11-12 approved copy byte for byte, with curly quotes in visible text',async()=>{
 const result=JSON.parse(await read('copy-review/home-2026-11-12/result.json'));
 const strings=JSON.parse(await read('copy-review/home-2026-11-12/strings.json'));
 assert.equal(result.action,'approve');
 assert.deepEqual(result.strings.map(s=>s.id),strings.map(s=>s.id));
 // Paul's later verbatim rewrites (2026-11-12, after the review) replace the reviewed text.
 const later={'tools.heading':'To make it easy, we built an agent-first modern web framework to build apps and a platform to deploy them on','tools.platform.body':'Get your CARLOS apps online with HTTPS, backups, provisioning, observability and analytics. Static sites work great too.','tools.skill.lead':'Try CARLOS with zero effort.','tools.skill.body':'The CARLOS skill has everything it needs to build and deploy a sample app and get it live right now.','what.heading':'CARLOS is a system for building better quality, more resilient, secure web apps that deploy easily.'};
 for(const s of result.strings) if(later[s.id]) s.text=later[s.id];
 // Every approved string is in the copy data under its review id, exactly as approved.
 for(const {id,text} of result.strings) assert.equal(copy[`home.${id}`],text,id);
 // Approved later, verbatim, through the coordinator: the closing line under the best practices.
 assert.equal(copy['home.typical.closing.lead'],'CARLOS is a set of strong opinions, not rules.');
 assert.equal(copy['home.typical.closing.body'],'They’re the defaults we believe make web apps better for everyone, and for their agents.');
 await pages(async home=>{
  const text=visible(home);
  const sample=['hero.gloss','hero.cloud.summary','replay.agent.1','replay.agent.q3','replay.you.2','replay.caption','what.button','what.prop2.body','practice.4.aria','tools.heading','tools.skill.body','get.ship.item1','get.ship.item2','get.build.item2','get.save.item1','get.build.figure.note','stacks.sub','stacks.reset','stacks.balloon.file-storage','stacks.after.base','who.by','end.heading','end.paste.works','end.hand.link','typical.closing.lead','typical.closing.body'];
  for(const id of sample) assert.ok(text.includes(copy[`home.${id}`]),id);
  // Every approved string shown on the page; the alternatives to the figures are kept for a one-line switch.
  for(const {id,text:value} of result.strings) if(!/^get\.[a-z]+\.alt/.test(id) && !id.startsWith('hero.gloss.word.')) assert.ok(text.includes(value),id);
  for(const {id,text:value} of result.strings.filter(s=>s.id.startsWith('hero.gloss.word.'))) assert.ok(home.includes(`data-words="`) && home.match(/data-words="([^"]*)"/)[1].split(' ').includes(value),id);
  assert.doesNotMatch(text,/['"]/,'straight quotes in visible text');
  assert.doesNotMatch(home,/&#39;|&quot;(?![^<]*>)/);
 });
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
