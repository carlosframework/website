// 🤖 Build-time only. HTML and Markdown share exactly one rendered instruction source.
import { readFile, writeFile, mkdir, readdir, rm, copyFile, cp } from 'node:fs/promises';
import { join } from 'node:path';
import markdownIt from 'markdown-it';
import nunjucks from 'nunjucks';
import { renderAgent } from './start-content.mjs';
import { configError } from '../src/_data/start-config.mjs';
const read=p=>readFile(p,'utf8');
const md=markdownIt({html:false,linkify:false,typographer:false});
const templates=new nunjucks.Environment(null,{autoescape:true,throwOnUndefined:true});
export function renderMarkdown(text) {
 // The explicit Markdown anchor survives copy edits and needs no browser script.
 const boundary=/^## (.+) \{#after-you-keep-it\}$/m.exec(text);
 if(!boundary) return md.render(text);
 const before=text.slice(0,boundary.index);
 const section=text.slice(boundary.index).replace(boundary[0],`## ${boundary[1]}`);
 const tokens=md.parse(section,{});
 tokens[0].attrSet('id','start-keep-title');
 let step=0;
 for(const token of tokens) {
  if(token.type!=='fence' || token.info!=='sh') continue;
  const id=`start-keep-step-${++step}`;
  // Reuse the account pathway's code and Copy controls, including no-JS fallback.
  token.type='html_block';
  token.content=`<div class="code-wrap"><pre><code id="${id}">${escapeHTML(token.content.trimEnd())}</code></pre><button type="button" class="copy-button" data-copy-target="${id}" data-original="Copy" data-copied="Copied"><span>Copy</span></button></div>\n`;
 }
 return md.render(before)+`<section class="start-keep" id="after-you-keep-it" aria-labelledby="start-keep-title">\n${md.renderer.render(tokens,md.options,{})}</section>\n`;
}
export const escapeHTML = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pasteLine = config => `Follow the directions on ${config.siteOrigin}/start`;
export function hostsHTML(config,copy) {
 const siteHost=new URL(config.siteOrigin).hostname, apiHost=new URL(config.apiOrigin).hostname;
 const hosts={siteHost,apiHost,host:siteHost};
 const text=escapeHTML(copy[siteHost===apiHost?'start.hosts.one':'start.hosts.two'])
  .replace(/\{(siteHost|apiHost|host)\}/g,(_,key)=>`<code>${escapeHTML(hosts[key])}</code>`);
 return `<!-- 👨 Paul's words, verbatim --><p class="start-hosts">${text}</p><!-- /👨 -->`;
}
export function promptHTML(config,copy,id) {
 return `<div class="start-prompt"><pre><code id="${id}">${escapeHTML(pasteLine(config))}</code></pre><button type="button" class="copy-button primary" hidden data-copy-target="${id}" data-original="${escapeHTML(copy['copy.label'])}" data-copied="${escapeHTML(copy['copy.done'])}" data-copy-success="${escapeHTML(copy['home.paste.done'])}" data-copy-fallback="${escapeHTML(copy['copy.fallback'])}" data-copy-status="${id}-status" aria-label="${escapeHTML(copy['copy.aria'])}"><span>${escapeHTML(copy['copy.label'])}</span></button>${hostsHTML(config,copy)}<p id="${id}-status" class="copy-status" role="status" aria-live="polite"></p></div>`;
}
const human = "<!-- 👨 Paul's words, verbatim -->";
// The homepage for enabled demo builds: hero B and the sections of the approved
// 2026-11-12 rework. Markup lives in src/_includes/home-{hero,body}.njk.
// Set to false to show the number-free "What you get" alternatives (home.get.*.alt).
export const homeFigures = true;
function homePromptHTML(config,copy,id,works) {
 const line=pasteLine(config), url=`${config.siteOrigin}/start`;
 // Keep the production URL together; other origins may wrap only at URL separators.
 const production=config.siteOrigin==='https://carlosframework.com';
 const caret='<span class="pb-caret" aria-hidden="true"></span>';
 // The caret rides inside the last unbreakable piece, so it never wraps onto a line alone.
 const parts=url.split(/(?<=[./])/);
 const urlHTML=production?escapeHTML(url)+caret:parts.map((part,i)=>`<span>${escapeHTML(part)}${i===parts.length-1?caret:''}</span>`).join('<wbr>');
 const lineHTML=`<p class="pb-line"><svg class="pb-sign" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5 10 8l-5 4.5"/></svg><span class="pb-text"><span id="${id}">${escapeHTML(line.slice(0,-url.length))}<span class="pb-url${production?'':' pb-url-wrap'}">${urlHTML}</span></span></span></p>`;
 const button=`<button type="button" class="copy-button pb-copy" hidden data-copy-target="${id}" data-original="${escapeHTML(copy['copy.label'])}" data-copied="${escapeHTML(copy['copy.done'])}" data-copy-success="${escapeHTML(copy['home.paste.done'])}" data-copy-fallback="${escapeHTML(copy['copy.fallback'])}" data-copy-status="${id}-status" aria-label="${escapeHTML(copy['copy.aria'])}"><svg class="ic-copy" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg><svg class="ic-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>${escapeHTML(copy['copy.label'])}</span></button>`;
 // The hero's box is one calm row; the closing box keeps the line under it.
 const body=works===undefined?`<div class="hv-row">${lineHTML}${button}</div>`:`${lineHTML}\n<div class="pb-foot"><p class="pb-works">${escapeHTML(works)}</p>${button}</div>`;
 return `<div class="paste v-soft${works===undefined?' hv-paste':''}">
${human}<p class="pb-to">${escapeHTML(copy['home.paste.label'])}</p><!-- /👨 -->
${body}
<p class="pb-done" id="${id}-status" role="status" aria-live="polite"></p></div>`;
}
// Wraps the first occurrence of needle in already-escaped text; a copy edit that drops it fails the build.
function wrap(text,needle,open,close) {
 const html=escapeHTML(text), at=html.indexOf(escapeHTML(needle));
 if(at<0) throw configError(`homepage copy no longer contains "${needle}"`);
 return html.slice(0,at)+open+escapeHTML(needle)+close+html.slice(at+escapeHTML(needle).length);
}
// A balloon's label as if printed on it: letters laid round the front of a sphere, so they
// narrow, dip and tilt towards the edges, within about 65% of the balloon's width.
export function balloonSVG(label) {
 const wide=c=>'iltfrj'.includes(c)?0.55:'mwMW'.includes(c)?1.45:c===' '?0.5:c!==c.toLowerCase()?1.2:1;
 const lines=label.length>9?label.split(' '):[label];
 const out=[];
 lines.forEach((line,n)=>{
  const y0=(n-(lines.length-1)/2)*17, ws=[...line].map(wide), per=Math.min(10.5,78/ws.reduce((a,b)=>a+b,0));
  let ang=-ws.reduce((a,b)=>a+b,0)*per/2;
  [...line].forEach((c,i)=>{
   const th=(ang+ws[i]*per/2)*Math.PI/180; ang+=ws[i]*per;
   out.push(`<text transform="translate(${(52*Math.sin(th)).toFixed(1)} ${(y0+15*(1-Math.cos(th))).toFixed(1)}) rotate(${(th*180/Math.PI*0.3).toFixed(1)}) scale(${Math.cos(th).toFixed(2)} 1)" fill-opacity="1" style="filter:brightness(${(1-0.35*(1-Math.cos(th))).toFixed(2)})">${escapeHTML(c)}</text>`);
  });
 });
 return `<svg viewBox="-50 -50 100 100" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
}
// The apps carousel under the hero: names, one-line descriptions, logos and links come straight from the
// Apps page, so the two pages never disagree; src/home/apps/sources.json picks the apps that have a screenshot.
const unescapeHTML=text=>text.replace(/&(amp|lt|gt|quot|#39);/g,(_,e)=>({amp:'&',lt:'<',gt:'>',quot:'"','#39':"'"}[e]));
// The homepage keeps curly quotes; the Apps page's lines are approved copy, so only the apostrophes change.
const curl=text=>text.replace(/(?<=\w)'(?=\w)/g,'’');
export function homeApps(appsPage,sources) {
 const cards=[...appsPage.matchAll(/<li class="app-card">([\s\S]*?)<\/li>/g)].map(([,card])=>({
  name:card.match(/<h2>([^<]+)<\/h2>/)?.[1],
  about:card.match(/<\/h2>(?:<\/div>)?<p>([^<]+)<\/p>/)?.[1],
  logo:card.match(/<img src="([^"]+)"/)?.[1],
  wordmark:card.includes('wordmark-logo'),
  url:card.match(/<div class="app-links"><a href="([^"]+)"/)?.[1],
 }));
 return sources.apps.map(({app,url},i)=>{
  const card=cards.find(c=>c.name?.toLowerCase()===app);
  if(!card || !card.about || !card.logo) throw configError(`apps carousel: ${app} is not on the Apps page with a description and logo`);
  if(card.url!==url) throw configError(`apps carousel: the Apps page links ${app} to ${card.url}, not ${url}`);
  return {slug:app,name:unescapeHTML(card.name),about:curl(unescapeHTML(card.about)),logo:card.logo,wordmark:card.wordmark,url,
   host:new URL(url).host.replace(/^www\./,''),shot:`/home/apps/${app}`,width:sources.size[0],height:sources.size[1],n:i+1};
 });
}
const balloonTints=['#dcbcb2','#dccba8','#c3c6d6','#d2bcd9','#e3bf9f','#cfcac1','#dbaeb0','#c6bcd4','#cbb9a4']; // soft, no greens
async function homeHTML(config,copy,original) {
 const t=id=>{if(typeof copy[`home.${id}`]!=='string') throw configError(`homepage copy home.${id} is missing`);return copy[`home.${id}`];};
 const c=key=>{if(typeof copy[key]!=='string') throw configError(`homepage copy ${key} is missing`);return copy[key];};
 const words=Object.keys(copy).filter(key=>key.startsWith('home.hero.gloss.word.')).map(key=>copy[key]);
 const gloss=t('hero.gloss'), at=gloss.indexOf(words[0]);
 if(at<0) throw configError('the hero line no longer contains its first rotating word');
 const balloons=Object.keys(copy).filter(key=>key.startsWith('home.stacks.balloon.')).map((key,i)=>({job:key.slice('home.stacks.balloon.'.length),label:copy[key],tint:balloonTints[i%balloonTints.length],delay:(-0.9*i).toFixed(1),svg:balloonSVG(copy[key])}));
 // Preserve the existing human-authored credit line.
 const foot=original.match(/<p class="architecture-inspiration">[\s\S]*?<\/p>/)?.[0];
 if(!foot) throw configError('homepage credit line is missing');
 const html={
  heading:escapeHTML(c('home.hero.heading')).replace(/using agents\./,text=>`<span class="nw">${text}</span>`),
  sub:escapeHTML(c('home.hero.subheading')).replace(/ship faster,|build better|save money\./g,text=>`<span class="nw">${text}</span>`).replace(/faster|better|save money/g,text=>`<em>${text}</em>`),
  ask:escapeHTML(c('home.hero.ask')).replace(/^Read on/,text=>`<a href="#architecture">${text}</a>`),
  whatHeading:escapeHTML(t('what.heading')),
  whatFollow:wrap(t('what.follow'),'open specification','<a href="https://spec.carlosframework.com" target="_blank" rel="noopener noreferrer">','</a>'),
  toolsFoot:`${human}${foot.replace('architecture-inspiration','rw-foot')}<!-- /👨 -->`,
 };
 const apps=homeApps(await read('src/apps/index.html'),JSON.parse(await read('src/home/apps/sources.json')));
 const context={t,c,html,human,figures:homeFigures,balloons,apps,hosts:hostsHTML(config,copy),
  questions:Object.keys(copy).filter(key=>/^home\.replay\.agent\.q\d+$/.test(key)).map(key=>copy[key]),
  gloss:{before:gloss.slice(0,at),word:words[0],after:gloss.slice(at+words[0].length),words:words.join(' ')},
  heroPaste:homePromptHTML(config,copy,'home-prompt'),endPaste:homePromptHTML(config,copy,'end-prompt',t('end.paste.works'))};
 const render=async name=>templates.renderString(await read(`src/_includes/${name}`),context).trim();
 return {hero:await render('home-hero.njk'),body:await render('home-body.njk')};
}
// theme.js runs first and without defer, so a remembered Light or Dark is set before the first paint.
const homeHead=['<script src="/home/theme.js?v=0"></script>'].concat(['/start/start.css','/home/hero.css','/home/sections.css','/home/apps.css','/home/stacks.css','/home/theme.css'].map(href=>`<link rel="stylesheet" href="${href}?v=0">`))
 .concat(['/start/start-tabs.js','/home/hero.js','/home/hero-bg.js','/home/apps.js','/home/figures.js','/home/stacks.js'].map(src=>`<script src="${src}?v=0" defer></script>`)).join('\n');
// Auto, Light or Dark: three quiet icons at the end of the footer's meta row (hack/add-footer.mjs places them),
// hidden until theme.js wires them. The labels are the accessible names and the tooltips.
const themeIcons={
 auto:'<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" stroke="none"/>',
 light:'<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
 dark:'<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.5 6.5 0 0 0 10.1 10.1z"/>',
};
function themeSwitchHTML(copy) {
 const t=key=>escapeHTML(copy[`home.theme.${key}`]);
 return `<div class="theme-switch" role="group" aria-label="${t('label')}" hidden>${['auto','light','dark'].map(k=>`<button type="button" data-theme-set="${k}" aria-pressed="${k==='auto'}" aria-label="${t(k)}" title="${t(k)}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${themeIcons[k]}</svg></button>`).join('')}</div>`;
}
export async function buildStart(outputDir,config) {
 const original=await read('src/start/index.html');
 let home=await read('src/index.html');
 let html=original, agent;
 if(config.enabled) {
  const copy=JSON.parse(await read('src/_data/start-copy.json'));
  const heroRegion=/<!-- start-demo:hero -->[\s\S]*?<!-- \/start-demo:hero -->/;
  const bodyRegion=/<!-- start-demo:body -->[\s\S]*?<!-- \/start-demo:body -->/;
  if(!heroRegion.test(home) || !bodyRegion.test(home)) throw configError('homepage demo marker is missing');
  const page=await homeHTML(config,copy,home.match(bodyRegion)[0]);
  home=home.replace(heroRegion,()=>page.hero)
   .replace(bodyRegion,()=>page.body)
   .replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${escapeHTML(copy['home.meta.description'])}">`)
   .replace(/<meta property="og:description" content="[^"]*">/,()=>`<meta property="og:description" content="${escapeHTML(copy['home.og.description'])}">`)
   .replace('<footer></footer>',()=>`<footer>${themeSwitchHTML(copy)}</footer>`)
   .replace('</head>',`${homeHead}\n</head>`);
  const contract=config.claimOff ? undefined : JSON.parse(await read('src/_data/start-claim-contract.json'));
  const starter=JSON.parse(await read(`src/start/starter/${config.starterVersion}/manifest.json`));
  agent=renderAgent(await read('src/start/agent.md'),config,contract,starter);
  const account=original.match(/<div class="start-tabs">[\s\S]*?(?=<\/div><\/section><\/main>)/)?.[0];
  if(!account) throw configError('account tabs marker is missing');
  const main=templates.renderString(await read('src/_includes/start.njk'),{copy,config,accountHTML:account,agentHTML:renderMarkdown(agent),promptHTML:promptHTML(config,copy,'start-prompt')});
  html=original.replace(/<main>[\s\S]*?<\/main>/,()=>main)
   .replace(/<title>[^<]*<\/title>/,()=>`<title>${escapeHTML(copy['start.title'])}</title>`)
   .replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${escapeHTML(copy['start.meta.description'])}">\n<meta property="og:description" content="${escapeHTML(copy['start.meta.description'])}">`)
   .replace(/<link rel="canonical" href="[^"]*">/,()=>`<link rel="canonical" href="${escapeHTML(config.siteOrigin)}/start/">`)
   // The same instructions as Markdown, for agents that do not ask for it by Accept header.
   .replace('</head>','<link rel="stylesheet" href="/start/start.css?v=0">\n<link rel="alternate" type="text/markdown" href="/start/index.md">\n</head>');
 }
 home=home.replace(/<!-- \/?start-demo:(?:hero|body) -->/g,'');
 // Remove previously generated or accidentally passthrough-copied source, also on watch rebuilds.
 const dir=join(outputDir,'start');await mkdir(dir,{recursive:true});
 for(const e of await readdir(dir)) if(!['start.css','start-tabs.js'].includes(e)) await rm(join(dir,e),{recursive:true,force:true});
 await writeFile(join(outputDir,'index.html'),home);
 await writeFile(join(dir,'index.html'),html);
 for(const [source,target,marker] of [
  ['src/home.css','home.css','\n/* 🤖 Enabled demo invitation;'],
  ['src/start/start.css','start/start.css','\n/* 🤖 Shared paste line'],
 ]) {
  const css=await read(source);
  await writeFile(join(outputDir,target),config.enabled?css:css.split(marker)[0]);
 }
 await copyFile(config.enabled?'src/start/start-tabs.js':'src/_includes/start-account-tabs.js',join(dir,'start-tabs.js'));
 // The homepage's own assets ship only with the page that uses them.
 const assets=join(outputDir,'home');await rm(assets,{recursive:true,force:true});
 if(config.enabled) await cp('src/home',assets,{recursive:true});
 if(!config.enabled) return;
 await writeFile(join(dir,'index.md'),agent);
 const downloads=join(dir,'starter',config.starterVersion);await mkdir(downloads,{recursive:true});
 for(const file of ['source.tar.gz','manifest.json','source.json']) await copyFile(`src/start/starter/${config.starterVersion}/${file}`,join(downloads,file));
}
