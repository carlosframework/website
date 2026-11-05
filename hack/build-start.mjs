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
export const renderMarkdown = text => md.render(text);
export const escapeHTML = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pasteLine = config => `Follow the directions on ${config.siteOrigin}/start`;
export function hostsHTML(config,copy) {
 const siteHost=new URL(config.siteOrigin).hostname, apiHost=new URL(config.apiOrigin).hostname;
 const hosts={siteHost,apiHost,host:siteHost};
 const text=escapeHTML(copy[siteHost===apiHost?'start.hosts.one':'start.hosts.two'])
  .replace(/\{(siteHost|apiHost|host)\}/g,(_,key)=>`<code>${escapeHTML(hosts[key])}</code>`);
 return `<p class="start-hosts">${text}</p>`;
}
export function promptHTML(config,copy,id) {
 return `<div class="start-prompt"><pre><code id="${id}">${escapeHTML(pasteLine(config))}</code></pre><button type="button" class="copy-button primary" hidden data-copy-target="${id}" data-original="${escapeHTML(copy['copy.label'])}" data-copied="${escapeHTML(copy['copy.done'])}" data-copy-fallback="${escapeHTML(copy['copy.fallback'])}" data-copy-status="${id}-status" aria-label="${escapeHTML(copy['copy.aria'])}"><span>${escapeHTML(copy['copy.label'])}</span></button>${hostsHTML(config,copy)}<p id="${id}-status" class="copy-status" role="status" aria-live="polite"></p></div>`;
}
export async function buildStart(outputDir,config) {
 const original=await read('src/start/index.html');
 let home=await read('src/index.html');
 let html=original, agent;
 if(config.enabled) {
  const copy=JSON.parse(await read('src/_data/start-copy.json'));
  const region=/<!-- start-demo:hero -->[\s\S]*?<!-- \/start-demo:hero -->/;
  if(!region.test(home)) throw configError('homepage hero marker is missing');
  const human='<!-- 👨 Constellation selected and copy supplied in chat -->';
  const hero=`<span class="start-authorship">🤖</span><p class="hero-promise"><strong>${escapeHTML(copy['home.hero.promise'])}</strong></p><p class="hero-demo-intro">${escapeHTML(copy['home.hero.intro'])}</p>${promptHTML(config,copy,'home-prompt')}<div class="actions"><a href="/start/">${escapeHTML(copy['home.hero.action'])}</a><a href="#architecture"><span>Learn more</span>&nbsp;↓</a></div>`;
  home=home.replace(human,'').replace(/<p class="hero-subtitle">[\s\S]*?<\/p>/,p=>human+p+'<!-- /👨 -->').replace(region,()=>hero)
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
 home=home.replaceAll('<!-- start-demo:hero -->','').replaceAll('<!-- /start-demo:hero -->','');
 // Remove previously generated or accidentally passthrough-copied source, also on watch rebuilds.
 const dir=join(outputDir,'start');await mkdir(dir,{recursive:true});
 for(const e of await readdir(dir)) if(!['start.css','start-tabs.js'].includes(e)) await rm(join(dir,e),{recursive:true,force:true});
 await writeFile(join(outputDir,'index.html'),home);
 await writeFile(join(dir,'index.html'),html);
 if(!config.enabled) return;
 await writeFile(join(dir,'index.md'),agent);
 const downloads=join(dir,'starter',config.starterVersion);await mkdir(downloads,{recursive:true});
 for(const file of ['source.tar.gz','manifest.json','source.json']) await copyFile(`src/start/starter/${config.starterVersion}/${file}`,join(downloads,file));
}
