import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStart, escapeHTML, homeApps } from '../hack/build-start.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
const read=p=>readFile(p,'utf8');
const copy=JSON.parse(await read('src/_data/start-copy.json'));
const env={CARLOS_START_DEMO:'1',CARLOS_START_SITE_ORIGIN:'https://carlosframework.com',CARLOS_START_CONSOLE_ORIGIN:'https://console.carloku.com',CARLOS_START_ACCOUNT_URL:'https://console.carloku.com/'};
const base=process.env.STARTER_SCRATCH||tmpdir();assert.ok(!/^\/tmp(?:\/|$)/.test(base),'use disk scratch');
async function pages(fn,overrides={}) {await mkdir(base,{recursive:true});const dir=await mkdtemp(join(base,'start-pages-'));try{await buildStart(dir,loadStartConfig({...env,...overrides}));await fn(await read(join(dir,'index.html')),await read(join(dir,'start/index.html')));}finally{await rm(dir,{recursive:true,force:true});}}
const plain=html=>html.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]*>/g,'').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/&quot;/g,'"');
test('enabled homepage has hero B, its replay and the approved rework sections',()=>pages(async(home,start)=>{
 // the hero: its section ends after the replay's pane (the panel and its dots)
 const hero=home.match(/<section class="c-hero hv hv-b">[\s\S]*?<\/figure>[\s\S]*?<\/div>\s*<\/div>\n<\/div><\/section>/)[0];
 assert.equal(plain(hero.match(/<h1>([\s\S]*?)<\/h1>/)[1]),"You’re already using agents.");
 assert.ok(hero.includes('<span class="nw">using agents.</span>'));
 const sub=hero.match(/<p class="sub">([\s\S]*?)<\/p>/)[1];
 assert.equal(plain(sub),'Now you want to ship faster, build better and save money.');
 for(const word of ['faster','better','save money']) assert.ok(sub.includes(`<em>${word}</em>`));
 assert.ok(sub.includes('<em>save money</em>.'));
 assert.match(hero,/<!-- 👨 Paul's words, verbatim --><h1>/);
 // The answer, the line about CARLOS (one fixed sentence for screen readers), then the invitation.
 const ask=hero.match(/<p class="ask hv-ask">([\s\S]*?)<\/p>/)[1];
 assert.equal(plain(ask.replace(/<span class="hv-rot-line"[\s\S]*?web apps\.<\/span>/,'')),'You want CARLOS. A system for building better web apps. Read on, or try it now:');
 assert.match(ask,/<span class="hv-rot-line" aria-hidden="true">A system for building <span class="hv-rot" data-words="better remarkable faster accessible secure private simple resilient portable distributable decentralisable agent-ready"><span class="hv-rot-word">better<\/span><\/span> web apps\.<\/span>/);
 assert.match(hero,/<a href="#architecture">Read on<\/a>/);
 assert.doesNotMatch(home,/class="hero-tools"|class="hero-wordmark"|class="hero-subtitle"|class="parts"|class="riff-grid"|id="ready"/);
 assert.match(hero,/<div class="paste v-soft hv-paste">/);
 // One drawn background behind the hero only, hidden from assistive technology.
 assert.match(home,/<section class="c-hero hv hv-b"><div class="hero-bg-wrap" aria-hidden="true"><canvas class="hero-bg"><\/canvas><\/div><div class="c-hero-inner">/);
 assert.equal((home.match(/<canvas/g)||[]).length,1);
 assert.ok(hero.includes(escapeHTML(copy['home.paste.label'])));
 assert.doesNotMatch(hero,/pb-works/);
 assert.match(hero,/<details class="hv-cloud"><summary>Using a cloud agent\?<\/summary><!-- 👨 Paul's words, verbatim --><p class="start-hosts">/);
 assert.match(hero,/<figure class="rp" aria-label="A real run of this journey, sped up" data-thinking="Thinking">/);
 // Real sessions to tab through (2026-11-13): one panel per session, only the first open without JavaScript; each
 // is excerpts of its run, and its live line links to the app's permanent example copy in a new tab.
 const {sessions}=JSON.parse(await read('src/home/replays/sessions.json'));
 assert.ok(sessions.length>=5);
 // Under the window, one dot per session: the sessions' tablist, each dot named and titled with its session (Paul,
 // 2026-11-13). The row under the title bar names the session showing and where it is among them.
 const dots=home.match(/<\/figure>\s*<div class="rp-dotrow" role="tablist" aria-label="([^"]+)" hidden>([\s\S]*?)<\/div>\s*<\/div>/);
 assert.ok(dots,'the dots sit under the window, outside the panel');
 assert.equal(dots[1],copy['home.replay.tabs']);
 assert.deepEqual([...dots[2].matchAll(/<button type="button" role="tab" class="rp-dot" id="rp-tab-([a-z-]+)" aria-controls="rp-session-\1" aria-selected="(true|false)" tabindex="(0|-1)" aria-label="([^"]+)" title="\4"><\/button>/g)].map(m=>[m[1],m[2],m[3],m[4]]),
  sessions.map(({slug},i)=>[slug,String(!i),i?'-1':'0',copy[`home.replay.${slug}.tab`]]));
 assert.match(hero,/<div class="rp-col">\s*(?:<!--[\s\S]*?-->\s*)?<figure class="rp"/);
 assert.ok(hero.includes(`<div class="rp-now"><span class="rp-now-name">${copy[`home.replay.${sessions[0].slug}.tab`]}</span> <span class="rp-now-count" data-format="${copy['home.apps.position']}">1 of ${sessions.length}</span></div>`));
 assert.doesNotMatch(home,/class="rp-tabs"|class="rp-tab"/);
 // each line's text as quoted: without its stamp, its stamp read aloud, or the live chip (checked on their own below)
 const quoted=html=>plain(html.replace(/<span class="rp-time"[^>]*>[^<]*<\/span>|<span class="rp-sr">[^<]*<\/span>|<span class="rp-live"[^>]*>[^<]*<\/span>/g,'')).replace(/\s+/g,' ').trim();
 const mss=x=>`${Math.floor(x/60)}:${String(x%60).padStart(2,'0')}`;
 const words=x=>{const m=Math.floor(x/60),sec=x%60,o=[];if(m) o.push(copy[`home.replay.time.${m===1?'minute':'minutes'}`].replace('{n}',m));if(sec||!m) o.push(copy[`home.replay.time.${sec===1?'second':'seconds'}`].replace('{n}',sec));return o.join(' ');};
 sessions.forEach(({slug,url,shot,times},i)=>{
  const c=k=>copy[`home.replay.${slug}.${k}`], host=new URL(url).host;
  const panel=hero.match(new RegExp(`<div class="rp-session" id="rp-session-${slug}" role="tabpanel" aria-labelledby="rp-tab-${slug}" data-slug="${slug}"( hidden)?>([\\s\\S]*?)</div>\\s*</div>\\s*</div>`));
  assert.ok(panel,slug); assert.equal(!!panel[1],i>0,`${slug}: only the first open`);
  const p=panel[2];
  assert.equal(quoted(p.match(/class="rp-you rp-s1">[\s\S]*?<p>([\s\S]*?)<\/p>/)[1]),copy['home.replay.you.1']);
  assert.equal(plain(p.match(/class="rp-agent rp-s2">[\s\S]*?<p>([\s\S]*?)<\/p>/)[1]),c('agent.1'));
  assert.deepEqual([...p.match(/<ol class="rp-qs">([\s\S]*?)<\/ol>/)[1].matchAll(/<li>([^<]+)<\/li>/g)].map(m=>plain(m[1])),['q1','q2','q3'].map(c).filter(Boolean));
  assert.equal(quoted(p.match(/class="rp-you rp-s3">[\s\S]*?<p>([\s\S]*?)<\/p>/)[1]),c('you.2'));
  assert.deepEqual([...p.matchAll(/class="rp-agent rp-s(\d)"[\s\S]*?<p>([\s\S]*?)<\/p>/g)].slice(1).map(m=>[m[1],quoted(m[2])]),[['4',c('plan')],['5',c('p1')],['6',c('p2')],['7',c('p3')],['8',`${c('p4')} ${host}`]]);
  // the live line: the permanent example app, in a new tab, never the expired demo address
  assert.ok(p.includes(`<a class="rp-url" href="${url}" target="_blank" rel="noopener noreferrer">${host} <svg`),slug);
  assert.doesNotMatch(p,/trycarlos\.com/);
  // the agent's real working time at each line (sessions.json), seen as m:ss and read in words; the live line says when
  assert.equal(times.length,8);
  assert.deepEqual([...p.matchAll(/<span class="rp-time" aria-hidden="true">([^<]+)<\/span>/g)].map(m=>m[1]),times.slice(0,7).map(mss),slug);
  assert.deepEqual([...p.matchAll(/<span class="rp-sr"> ([^<]+)<\/span>/g)].map(m=>m[1]),[...times.slice(0,7).map(x=>copy['home.replay.time.at'].replace('{time}',words(x))),copy['home.replay.time.live'].replace('{time}',words(times[7]))],slug);
  assert.ok(p.includes(`<span class="rp-live" aria-hidden="true">${copy['home.replay.time.live'].replace('{time}',mss(times[7]))}</span>`),slug);
  assert.ok(p.includes(`<div class="rp-app-bar" aria-hidden="true"><span></span>${host}</div>`),slug);
  assert.ok(p.includes(`<img src="/home/replays/${slug}-390.jpg" width="${shot[0]}" height="${shot[1]}" alt="${escapeHTML(c('shot.alt'))}" decoding="async"${i?' loading="lazy"':''}>`),slug);
 });
 assert.doesNotMatch(hero,/panaderia|green-bean-72/);
 // The mockup's furniture stays behind.
 assert.doesNotMatch(home,/🤖|class="robot"|hv-draft|rw-draft|rw-draftbar|rw-claim|hero-switch|hv-a\b|hero-current|notes\.html|DRAFT COPY|noindex/);
 const body=home.match(/<div class="rw">[\s\S]*<\/div>\n?<\/main>/)[0];
 assert.match(body,/<section class="rw-what" id="architecture"/);
 assert.deepEqual([...body.matchAll(/<section class="(rw-[a-z]+)"/g)].map(m=>m[1]),['rw-apps','rw-what','rw-tools','rw-get','rw-who','rw-end']);
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
  // the final figure is real text; the count-up is a visual-only overlay beside it
  assert.ok(body.includes(`<p class="rw-fig" data-count-from="${{ship:1,build:250,save:0}[k]}"><span class="rw-fig-final">${escapeHTML(copy[`home.get.${k}.figure`])}</span><span class="rw-fig-run" aria-hidden="true"></span></p>`),k);
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
 for(const asset of ['/home/hero.css','/home/sections.css','/home/apps.css','/home/stacks.css','/home/theme.css','/home/hero.js','/home/hero-bg.js','/home/replay.js','/home/apps.js','/home/figures.js','/home/stacks.js']) assert.ok(home.includes(`="${asset}?v=0"`),asset);
 // The theme is set before anything is drawn: theme.js first in <head>, blocking, ahead of every stylesheet.
 const head=home.match(/<head>[\s\S]*?<\/head>/)[0];
 assert.ok(head.includes('<script src="/home/theme.js?v=0"></script>'));
 assert.ok(head.indexOf('/home/theme.js')<head.indexOf('/start/start.css') && head.indexOf('/home/theme.js')<head.indexOf('/home/hero.css'));
 // Auto, Light and Dark as icons in the footer, Auto pressed until the script reads the remembered choice.
 assert.match(home,/<footer><div class="theme-switch" role="group" aria-label="Theme" hidden>/);
 for(const k of ['auto','light','dark']) assert.ok(home.includes(`<button type="button" data-theme-set="${k}" aria-pressed="${k==='auto'}" aria-label="${copy[`home.theme.${k}`]}" title="${copy[`home.theme.${k}`]}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">`),k);
 assert.doesNotMatch(home.match(/<header[\s\S]*?<\/header>/)[0],/theme-switch|masthead-end/);
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
// 🤖 The apps carousel directly under the hero: Paul's heading and subtitle, one slide per screenshot with the Apps
// page's own name, line and link (except where sources.json overrides them, explicitly), a row that scrolls and
// snaps without JavaScript, and controls that wait for the script.
test('enabled homepage has the apps carousel under the hero',()=>pages(async(home)=>{
 const sources=JSON.parse(await read('src/home/apps/sources.json'));
 const appsPage=await read('src/apps/index.html');
 const heroEnd=home.indexOf('</div></section>',home.indexOf('class="rp-dotrow"'));
 const section=home.match(/<section class="rw-apps"[\s\S]*?<\/div><\/section>/)[0];
 assert.ok(heroEnd>0 && home.indexOf('<section class="rw-apps"')>heroEnd);
 assert.match(home.slice(heroEnd),/^<\/div><\/section>\s*<div class="rw">\s*<section class="rw-apps"/,'the first section after the hero');
 assert.match(section,/^<section class="rw-apps" aria-roledescription="carousel" aria-labelledby="rw-apps-title" data-carousel>/);
 assert.ok(section.includes(`<!-- 👨 Paul's words, verbatim --><h2 id="rw-apps-title">What kinds of apps can be built using CARLOS?</h2>\n    <p class="ap-sub">CARLOS excels at producing fast, accessible websites and apps that can be deployed easily, locally, on-prem, or on-cloud, as well as providing APIs, CLIs, MCPs, and backends for native apps.</p><!-- /👨 -->`));
 assert.equal(copy['home.apps.heading'],'What kinds of apps can be built using CARLOS?');
 const slides=[...section.matchAll(/<li class="ap-slide"[\s\S]*?<\/li>/g)].map(m=>m[0]);
 assert.equal(slides.length,sources.apps.length);
 assert.ok(slides.length>=6);
 slides.forEach((slide,i)=>{
  const {app,url,gallery={},logoSpells}=sources.apps[i];
  const card=appsPage.match(new RegExp(`<li class="app-card">(?:(?!</li>)[\\s\\S])*?<h2>([^<]+)</h2>(?:</div>)?<p>([^<]+)</p>(?:(?!</li>)[\\s\\S])*?href="${url.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')}"`))
  assert.ok(card,app);
  const [,pageName,about]=card;
  assert.ok(card[0].includes(`<img src="/apps/logos/${app}.`),`${app}: matched by its logo's file name`);
  const name=gallery.name??pageName, href=gallery.url??url;
  assert.ok(slide.includes(`role="group" aria-roledescription="slide" aria-label="${i+1} of ${slides.length}" data-name="${escapeHTML(name)}"`),app);
  // a real screenshot, sized, with alt text, 360 and 720 wide for 1x and 2x screens, in AVIF and WebP with a JPEG fallback
  const sizes='(min-width: 1000px) 40vw, (min-width: 640px) 58vw, 88vw', set=type=>`/home/apps/${app}-360.${type} 360w, /home/apps/${app}-720.${type} 720w, /home/apps/${app}-960.${type} 960w`;
  assert.ok(slide.includes(`<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}"><img src="/home/apps/${app}-360.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="360" height="225" alt="${escapeHTML(copy['home.apps.shot.alt'].replace('{app}',name))}" loading="lazy" decoding="async" draggable="false">`),app);
  // the screenshot is not a link: the address is the card's only link
  assert.doesNotMatch(slide,/<a [^>]*>(?:(?!<\/a>)[\s\S])*<picture/,app);
  if(logoSpells) {
   // the wordmark stands in for its letters: the name is never printed beside a logo that already spells it
   const h3=slide.match(/<h3 class="ap-spelled">([\s\S]*?)<\/h3>/)[1];
   assert.ok(h3.includes(`<span class="ap-logo is-wordmark"><img src="/apps/logos/${app}.svg" alt="${logoSpells}" width="60" height="20"`),app);
   assert.equal(plain(h3).replace(/\s+/g,' ').trim(),name.replace(logoSpells,'').replace(/\s+/g,' ').trim(),app);
   assert.doesNotMatch(slide,/<h3>/,app);
  } else assert.ok(slide.includes(`<h3>${escapeHTML(name)}</h3>`),app);
  assert.ok(slide.includes(`<p class="ap-about">${escapeHTML(about.replace(/'/g,'’'))}</p>`),app);
  // the way out: the app's own site, in a new tab, without handing it this page
  assert.match(slide,new RegExp(`<a class="ap-link" href="${href.replace(/[.*+?^${}()|[\]\\/]/g,'\\$&')}" target="_blank" rel="noopener noreferrer">[^<]+ <svg viewBox="0 0 24 24" aria-hidden="true">`),app);
  assert.equal((slide.match(/<a /g)||[]).length,1,`${app}: one link per slide`);
 });
 // Without JavaScript: a sideways row that snaps, every app reachable by Tab; the controls stay hidden until home/apps.js.
 const css=await read('src/home/apps.css');
 assert.match(css,/\.rw \.ap-track \{[^}]*overflow-x: auto;[^}]*scroll-snap-type: x mandatory;/);
 assert.match(css,/\.rw \.ap-slide \{[^}]*scroll-snap-align: start;/);
 // With the script the current app comes to rest in the middle (the script, not the browser, settles it); a drag turns snapping off until it ends.
 // live, the script brings the row to rest itself (the browser's snap points are off by a pixel or more)
 assert.match(css,/\.rw \.rw-apps\.is-live \.ap-track \{ will-change: scroll-position; scroll-behavior: auto; scroll-snap-type: none; \}/);
 assert.match(css,/\.rw \.ap-track\.is-dragging \{ scroll-snap-type: none;/);
 // the stage turns under a drag; a vertical wheel or a finger moving up and down stays the page's
 assert.match(css,/\.rw \.ap-track \{[^}]*overflow-x: auto; overflow-y: hidden;/);
 assert.match(css,/\.rw \.rw-apps\.is-live \.ap-track \{ cursor: grab; touch-action: pan-y;[^}]*user-select: none; \}/);
 assert.match(css,/\.rw \.rw-apps\.is-live \.ap-link \{ cursor: pointer; \}/);
 assert.doesNotMatch(css,/\.ap-link::after/,'no link stretched over the card');
 // The pop brings the whole card forward; only the popping and sinking classes carry a transition (so the
 // cards never lag the turning row), and none under reduced motion.
 assert.match(css,/\.rw \.rw-apps\.is-live \.ap-slide\.is-up \{ z-index: 1; transition: transform 0\.32s/);
 assert.match(css,/\.rw \.rw-apps\.is-live \.ap-slide\.is-sinking \{ transition: transform 0\.2s/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\) \{[^\n]*\.rw \.rw-apps\.is-live \.ap-slide\.is-up, \.rw \.rw-apps\.is-live \.ap-slide\.is-sinking \{ transition: none; \}/);
 assert.match(css,/\.rw \.ap-ctrl\[hidden\], \.rw \.ap-dots\[hidden\] \{ display: none; \}/);
 assert.match(css,/@media \(prefers-reduced-motion: no-preference\) \{ \.rw \.ap-track \{ scroll-behavior: smooth; \} \}/);
 // Under the row, centred: previous, the dots with the quiet pause right after the last one, next.
 const ctrl=section.match(/<div class="ap-ctrl" hidden>[\s\S]*?<\/button>\s*<\/div>\s*<\/div>?/)?.[0]||section.slice(section.indexOf('<div class="ap-ctrl" hidden>'));
 assert.ok(ctrl.startsWith('<div class="ap-ctrl" hidden>'));
 assert.ok(ctrl.indexOf('class="ap-prev"')<ctrl.indexOf('class="ap-dots"') && ctrl.indexOf('class="ap-dots"')<ctrl.indexOf('class="ap-play"') && ctrl.indexOf('class="ap-play"')<ctrl.indexOf('class="ap-next"'));
 assert.match(section,/<div class="ap-dotrow"><div class="ap-dots" role="group" aria-label="Choose an app" hidden>/);
 assert.doesNotMatch(section.match(/<div class="ap-head">[\s\S]*?<\/div>\s*<ul/)[0],/<button/,'no controls beside the heading');
 // The pause is an icon with the replay's approved words as its name and tooltip; the status line is the only live region.
 assert.ok(section.includes(`<button type="button" class="ap-play" data-pause="${copy['home.replay.pause']}" data-play="${copy['home.replay.play']}" aria-label="${copy['home.replay.pause']}" title="${copy['home.replay.pause']}"><svg class="ap-ic-pause" viewBox="0 0 16 16" aria-hidden="true" focusable="false">`));
 for(const k of ['prev','next']) assert.ok(section.includes(`<button type="button" class="ap-${k}" aria-label="${copy['home.apps.'+k]}" title="${copy['home.apps.'+k]}">`),k);
 assert.match(section,/<p class="ap-status" aria-live="polite" aria-atomic="true" data-format="\{app\}, \{n\} of \{total\}"><\/p>/);
 assert.ok(section.includes(`<a class="rw-more" href="/apps/">${copy['home.apps.all']} `));
 assert.doesNotMatch(section,/—/);
}));
// 🤖 Paul's 2026-11-13 edits, as the carousel shows them, and the rules that keep the overrides honest.
// 🤖 The replay plays at reading pace by default, with a quiet speed control before Pause (Paul, 2026-11-13).
test('enabled homepage replay has a speed control, and reading-pace timing in its stylesheet',()=>pages(async(home)=>{
 const bar=home.match(/<div class="rp-bar">[\s\S]*?<\/label><\/div>/)[0];
 assert.ok(bar.includes(`<span class="rp-speed" role="group" aria-label="${copy['home.replay.speed']}" hidden><button type="button" class="rp-slower" aria-label="${copy['home.replay.slower']}" title="${copy['home.replay.slower']}">`));
 assert.ok(bar.includes(`<output class="rp-rate" aria-live="polite" data-format="{rate}×">1.5×</output><button type="button" class="rp-faster" aria-label="${copy['home.replay.faster']}" title="${copy['home.replay.faster']}">`));
 assert.ok(bar.indexOf('class="rp-speed"')<bar.indexOf('class="rp-pause"'),'beside Pause, before it');
 // back and forward a turn, hidden until home/replay.js plays the chat; the thinking dots' name for screen readers
 assert.ok(bar.includes(`<span class="rp-steps" hidden><button type="button" class="rp-back" aria-label="${copy['home.replay.back']}" title="${copy['home.replay.back']}">`));
 assert.ok(bar.includes(`<button type="button" class="rp-fwd" aria-label="${copy['home.replay.fwd']}" title="${copy['home.replay.fwd']}">`));
 assert.ok(bar.indexOf('class="rp-steps"')<bar.indexOf('class="rp-speed"'));
 assert.ok(home.includes(`<figure class="rp" aria-label="${copy['home.replay.figure.aria']}" data-thinking="${copy['home.replay.thinking']}">`));
 const css=await read('src/home/hero.css');
 const cycle=Number(css.match(/\.rp \{ --rp-cycle: ([\d.]+)s; \}/)[1]);
 // the CSS-only loop plays the first session (without JavaScript only it is shown)
 const first=JSON.parse(await read('src/home/replays/sessions.json')).sessions[0], f=k=>copy[`home.replay.${first.slug}.${k}`];
 const words={1:copy['home.replay.you.1'],2:[f('agent.1'),f('q1'),f('q2'),f('q3')].filter(Boolean).join(' '),3:f('you.2'),4:f('plan'),5:f('p1'),6:f('p2'),7:f('p3'),8:`${f('p4')} ${new URL(first.url).host}`};
 const line=k=>{const m=css.match(new RegExp(`@keyframes rp-k${k} \\{ 0%, ([\\d.]+)% \\{ opacity: 0;[^}]*\\} ([\\d.]+)%, ([\\d.]+)% \\{ opacity: 1;`));return {from:m[1]*cycle/100,full:m[2]*cycle/100};};
 for(let k=1;k<=9;k++) {
  const {from,full}=line(k);
  // at full contrast within about a quarter of a second, never sitting grey
  assert.ok(full-from<=0.31,`line ${k} fades in over ${(full-from).toFixed(2)} s`);
  // the line before it had time to be read at 200 words a minute
  if(k>1 && k<=9 && k!==4) { const n=words[k-1].split(/\s+/).length; assert.ok(from-line(k-1).from>=n*0.3,`line ${k-1}: ${n} words get ${(from-line(k-1).from).toFixed(1)} s`); }
 }
 const scene2=Number(css.match(/@keyframes rp-scene1 \{ 0%, ([\d.]+)%/)[1])*cycle/100;
 assert.ok(scene2-line(3).from>=words[3].split(/\s+/).length*0.3,'the last line of the first scene is read before it goes');
 assert.match(css,/\.rp-agent p \{ color: light-dark\(#2b3036, #dfe6ee\); \}/);
 assert.match(css,/@media \(prefers-reduced-motion: reduce\) \{\n  \.rp \*, \.rp \{ animation: none !important; \}\n[^@]*?\.rp-pause, \.rp-speed, \.rp-steps, \.rp-loading, \.rp-think, \.rp-caret \{ display: none !important; \}/);
}));
test('apps carousel overrides are explicit and checked against the Apps page',()=>pages(async(home)=>{
 const section=home.match(/<section class="rw-apps"[\s\S]*?<\/div><\/section>/)[0];
 const slide=name=>section.match(new RegExp(`<li class="ap-slide"[^>]*data-name="${name}">[\\s\\S]*?</li>`))?.[0];
 assert.match(slide('The new Tito'),/<h3 class="ap-spelled"><span>The new<\/span> <span class="ap-logo is-wordmark"><img src="\/apps\/logos\/tito.svg" alt="Tito"/);
 assert.match(slide('The new Tito'),/href="https:\/\/go\.tito\.io\/home"[^>]*>go\.tito\.io /);
 assert.match(slide('The new Tito'),/alt="The new Tito’s website"/);
 assert.match(slide('Jelly'),/<h3 class="ap-spelled"><span class="ap-logo is-wordmark"><img src="\/apps\/logos\/jelly.svg" alt="Jelly"[^>]*><\/span><\/h3>/);
 assert.match(slide('Jelly'),/href="https:\/\/letsjelly\.dev"/);
 assert.match(slide('Amadan'),/<h3>Amadan<\/h3>/);
 assert.doesNotMatch(section,/>amadan<|"amadan"|data-name="Tito"/);
 assert.ok(section.includes('<button type="button" aria-label="Amadan"'));
 // The Oficina apps have no public pages of their own (each goes to the shared sign-in), so Oficina is one slide.
 assert.equal((section.match(/data-name="Oficina"/g)||[]).length,1);
 const appsPage=await read('src/apps/index.html'), base=JSON.parse(await read('src/home/apps/sources.json'));
 const tweak=(app,patch)=>({...base,apps:base.apps.map(a=>a.app===app?patch(structuredClone(a)):a)});
 for(const [why,sources,message] of [
  ['an override that repeats the Apps page is stale',tweak('amadan',a=>({...a,gallery:{name:'Amadan',why:'x'}})),/matches the Apps page/],
  ['an override needs a reason',tweak('amadan',a=>({...a,gallery:{name:'Amadan'}})),/without a reason/],
  ['only names and urls can be overridden',tweak('amadan',a=>({...a,gallery:{name:'Amadan',about:'x',why:'x'}})),/unknown keys about/],
  ['the base url must still be the Apps page link',tweak('tito',a=>({...a,url:'https://ti.to'})),/links tito to https:\/\/go\.tito\.io\/home/],
  ['a wordmark must spell part of the name',tweak('tito',a=>({...a,logoSpells:'Titto'})),/does not contain "Titto"/],
  ['only a wordmark can spell the name',tweak('eleven',a=>({...a,logoSpells:'Eleven'})),/not a wordmark/],
  ['no unknown keys',tweak('eleven',a=>({...a,nmae:'x'})),/unknown keys nmae/],
 ]) assert.throws(()=>homeApps(appsPage,sources),message,why);
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
test('start points agents at its Markdown twin, in the head and at the top of For your agent',()=>pages(async(_,start)=>{
 assert.ok(start.match(/<head>[\s\S]*?<\/head>/)[0].includes('<link rel="alternate" type="text/markdown" href="/start/index.md">'));
 const section=start.split('id="for-your-agent"')[1];
 assert.ok(section.indexOf('<p class="agent-md">These instructions as Markdown: <a href="/start/index.md">/start/index.md</a></p>')>=0);
 assert.ok(section.indexOf('class="agent-md"')<section.indexOf('<!-- agent-content -->'),'above the instructions, outside the twin');
}));
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
  "home.end.paste.works": "Try it with your preferred agent setup",
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
 const later={'what.prop1.body':'Web server, database engine, background jobs and interface, compiled into a single binary.','get.ship.figure.note':'faster shipping to production','get.build.figure':'20 ms','get.build.figure.note':'Average response time, down from 250ms','get.ship.item2':'Roll releases to a few customers first','end.paste.works':'Try it with your preferred agent setup','get.save.figure.note':'less to run than a traditional web app','get.save.figure':'80%','tools.heading':'To make it easy, we built an agent-first modern web framework to build apps and a platform to deploy them on','tools.platform.body':'Get your CARLOS apps online with HTTPS, backups, provisioning, observability and analytics. Static sites work great too.','tools.skill.lead':'Try CARLOS with zero effort.','tools.skill.body':'The CARLOS skill has everything it needs to build and deploy a sample app and get it live right now.','what.heading':'CARLOS is a system for building better quality, more resilient, secure web apps that deploy easily.','hero.gloss':'A system for building better web apps.'};
 for(const s of result.strings) if(later[s.id]) s.text=later[s.id];
 // Paul, 2026-11-12: the replay no longer needs its "A real run, sped up" badge. Removed, not reworded.
 // The re-recorded run 4 (2026-11-12) replaces the replay's quotations, alt text and caption: verbatim from
 // ~/.cache/start-recording/replay4.json, trimmed with "…". Pending Paul's OK through the coordinator.
 const run4={'replay.agent.1':"I’ve read the CARLOS start page. … I have a few questions.",'replay.agent.q2':"How should it look and feel?",'replay.agent.q3':"How much have you built before?",'replay.agent.p1':"Now writing the app code.",'replay.agent.p2':"Everything works: orders save, they’re grouped by collection day with a per-day “To bake” total, and bad input is rejected. …",'replay.agent.p3':"The page looks right on both phone and desktop. …",'replay.agent.p4':"Your pre-order page for Panadería Carlos is online:",'replay.url':"green-bean-72.dev.trycarlos.com",'replay.shot.alt':"The live page: a cream and brown bakery page with a bread icon, the serif heading “Panadería Carlos”, “Order today, collect mañana.” and menu cards for Pan de pueblo, Magdalenas and Ensaimada.",'replay.caption':"Excerpts from one recorded run, 12 November 2026."};
 for(const s of result.strings) if(run4[s.id]) s.text=run4[s.id];
 // 2026-11-13: the bakery run gave way to real sessions in tabs (home.replay.<slug>.*, pending copy review);
 // its quotations, address, alt text and caption date are superseded, not reworded.
 const removed=new Set(['replay.badge','replay.agent.q4','hero.gloss.word.cheaper','replay.agent.1','replay.agent.q1','replay.agent.q2','replay.agent.q3','replay.agent.plan','replay.you.2','replay.agent.p1','replay.agent.p2','replay.agent.p3','replay.agent.p4','replay.url','replay.shot.alt','replay.caption']);
 for(const id of removed) if(id.startsWith('replay.') && id!=='replay.caption') assert.ok(!Object.hasOwn(copy,`home.${id}`),id);
 assert.ok(!Object.hasOwn(copy,'home.replay.agent.q4'));
 assert.ok(!Object.hasOwn(copy,'home.replay.badge'));
 result.strings=result.strings.filter(s=>!removed.has(s.id));
 // Every approved string is in the copy data under its review id, exactly as approved.
 for(const {id,text} of result.strings) assert.equal(copy[`home.${id}`],text,id);
 // Approved later, verbatim, through the coordinator: the closing line under the best practices.
 assert.equal(copy['home.typical.closing.lead'],'CARLOS is a set of strong opinions, not rules.');
 assert.equal(copy['home.typical.closing.body'],'They’re the defaults we believe make web apps better for everyone, and for their agents.');
 await pages(async home=>{
  const text=visible(home);
  assert.doesNotMatch(home,/rp-badge|A real run, sped up/);
  const sample=['hero.gloss','hero.cloud.summary','what.button','what.prop2.body','practice.4.aria','tools.heading','tools.skill.body','get.ship.item1','get.ship.item2','get.build.item2','get.save.item1','get.build.figure.note','stacks.sub','stacks.reset','stacks.balloon.file-storage','stacks.after.base','who.by','end.heading','end.paste.works','end.hand.link','typical.closing.lead','typical.closing.body'];
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
