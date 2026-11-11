// 🤖 Build-time only. HTML and Markdown share exactly one rendered instruction source.
import { readFile, writeFile, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
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
const external = 'target="_blank" rel="noopener noreferrer"';
function homePromptHTML(config,copy) {
 const id='home-prompt';
 const line=pasteLine(config), url=`${config.siteOrigin}/start`;
 // Keep the production URL together; other origins may wrap only at URL separators.
 const production=config.siteOrigin==='https://carlosframework.com';
 const caret='<span class="pb-caret" aria-hidden="true"></span>';
 // The caret rides inside the last unbreakable piece, so it never wraps onto a line alone.
 const parts=url.split(/(?<=[./])/);
 const urlHTML=production?escapeHTML(url)+caret:parts.map((part,i)=>`<span>${escapeHTML(part)}${i===parts.length-1?caret:''}</span>`).join('<wbr>');
 return `<div class="paste v-soft">
<p class="pb-to">${escapeHTML(copy['home.paste.label'])}</p>
<p class="pb-line"><svg class="pb-sign" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5 10 8l-5 4.5"/></svg><span class="pb-text"><span id="${id}">${escapeHTML(line.slice(0,-url.length))}<span class="pb-url${production?'':' pb-url-wrap'}">${urlHTML}</span></span></span></p>
<div class="pb-foot"><p class="pb-works">${escapeHTML(copy['home.paste.works'])}</p><button type="button" class="copy-button pb-copy" hidden data-copy-target="${id}" data-original="${escapeHTML(copy['copy.label'])}" data-copied="${escapeHTML(copy['copy.done'])}" data-copy-success="${escapeHTML(copy['home.paste.done'])}" data-copy-fallback="${escapeHTML(copy['copy.fallback'])}" data-copy-status="${id}-status" aria-label="${escapeHTML(copy['copy.aria'])}"><svg class="ic-copy" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg><svg class="ic-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg><span>${escapeHTML(copy['copy.label'])}</span></button></div>
<p class="pb-done" id="${id}-status" role="status" aria-live="polite"></p></div>${hostsHTML(config,copy)}`;
}
function homeHeroHTML(config,copy) {
 const heading=escapeHTML(copy['home.hero.heading']).replace(/using agents\./,text=>`<span class="nw">${text}</span>`);
 const sub=escapeHTML(copy['home.hero.subheading']).replace(/ship faster,|build better|save money\./g,text=>`<span class="nw">${text}</span>`).replace(/faster|better|save money/g,text=>`<em>${text}</em>`);
 const ask=escapeHTML(copy['home.hero.ask']).replace(/^Read on/,text=>`<a href="#architecture">${text}</a>`);
 return `<!-- /👨 --><section class="c-hero"><div class="c-hero-inner">${human}<h1>${heading}</h1><p class="sub">${sub}</p><p class="ask"><span>${escapeHTML(copy['home.hero.answer'])}</span> <span>${ask}</span></p><!-- /👨 -->${homePromptHTML(config,copy)}</div></section>`;
}
function homePartsHTML(original,copy) {
 // Preserve the existing human-authored heading, architecture sentence and credit.
 const heading=original.match(/<h2 id="promise-title">[\s\S]*?<\/h2>/)[0];
 const sentence=original.match(/class="arch-text">([^<]*)/)[1].replace('The CARLOS architecture',`<a href="/attributes/" ${external}>The CARLOS architecture</a>`);
 const foot=original.match(/<p class="architecture-inspiration">[\s\S]*?<\/p>/)[0].replace('architecture-inspiration','px-foot');
 const icons={
  skill:'<path d="M6 7h20a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H14l-6 5v-5H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M11 13h10M11 17h6"/>',
  rastrillo:'<path d="M16 4 4 10l12 6 12-6z"/><path d="m4 16 12 6 12-6M4 22l12 6 12-6"/>',
  platform:'<rect x="5" y="6" width="22" height="8" rx="2"/><rect x="5" y="18" width="22" height="8" rx="2"/><path d="M10 10h.01M10 22h.01M15 10h7M15 22h7"/>',
 };
 const links={
  skill:[['start','https://github.com/carlosframework/skills/blob/main/skills/getting-started/SKILL.md'],['build','https://github.com/carlosframework/skills/blob/main/skills/building-carlos-apps/SKILL.md']],
  rastrillo:[['site','https://rastrillo.org'],['design','https://rastrillo.org/design-system/']],
  platform:[['start','https://carloku.com'],['self','/platform/self-host/']],
 };
 const arrow='<svg class="px-ext" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M15 3h6v6M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>';
 const card=kind=>{
  const text=key=>escapeHTML(copy[`home.parts.${kind}.${key}`]);
  return `<li class="px px-${kind}"><svg class="px-ic" viewBox="0 0 32 32" aria-hidden="true">${icons[kind]}</svg><div class="px-content">${human}<h3>${text('title')}</h3><!-- /👨 -->${kind==='rastrillo'?human:''}<p class="px-is">${text('is')}</p>${kind==='rastrillo'?'<!-- /👨 -->':''}<p class="px-why">${text('why')}</p></div>${human}<p class="px-links">${links[kind].map(([key,url])=>`<a href="${url}" ${external}>${text(key)}${arrow}</a>`).join(' ')}</p><!-- /👨 --></li>`;
 };
 return `<section class="parts" id="architecture" aria-labelledby="promise-title"><div class="parts-layout"><div class="parts-heading">${human}${heading}<p class="px-intro">${sentence}<!-- /👨 --> ${escapeHTML(copy['home.parts.intro'])}</p></div><ol class="px-flow" role="list">${card('skill')}${card('rastrillo')}${card('platform')}</ol>${human}${foot}</div></section>`;
}
export async function buildStart(outputDir,config) {
 const original=await read('src/start/index.html');
 let home=await read('src/index.html');
 let html=original, agent;
 if(config.enabled) {
  const copy=JSON.parse(await read('src/_data/start-copy.json'));
  const heroRegion=/<!-- start-demo:hero -->[\s\S]*?<!-- \/start-demo:hero -->/;
  const partsRegion=/<!-- start-demo:parts -->[\s\S]*?<!-- \/start-demo:parts -->/;
  if(!heroRegion.test(home) || !partsRegion.test(home)) throw configError('homepage demo marker is missing');
  home=home.replace(heroRegion,()=>homeHeroHTML(config,copy))
   .replace(partsRegion,original=>homePartsHTML(original,copy))
   .replace(/<meta name="description" content="[^"]*">/,()=>`<meta name="description" content="${escapeHTML(copy['home.meta.description'])}">`)
   .replace(/<meta property="og:description" content="[^"]*">/,()=>`<meta property="og:description" content="${escapeHTML(copy['home.og.description'])}">`)
   .replace('</head>','<link rel="stylesheet" href="/start/start.css?v=0">\n<script src="/start/start-tabs.js?v=0" defer></script>\n</head>');
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
   .replace('</head>','<link rel="stylesheet" href="/start/start.css?v=0">\n</head>');
 }
 home=home.replace(/<!-- \/?start-demo:(?:hero|parts) -->/g,'');
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
 if(!config.enabled) return;
 await writeFile(join(dir,'index.md'),agent);
 const downloads=join(dir,'starter',config.starterVersion);await mkdir(downloads,{recursive:true});
 for(const file of ['source.tar.gz','manifest.json','source.json']) await copyFile(`src/start/starter/${config.starterVersion}/${file}`,join(downloads,file));
}
