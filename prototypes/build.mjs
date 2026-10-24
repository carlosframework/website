import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '/tmp/carlos-benefits-browser/node_modules/playwright/index.mjs';
const root=path.resolve('_site');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage();
for(const option of ['a','b']){
 const result=await page.evaluate(({html,option})=>{
  const d=new DOMParser().parseFromString(html,'text/html');
  const q=s=>d.querySelector(s);
  const intro=q('.architecture-intro'), numbers=q('.numbers-section'), how=q('#how'), benefits=q('#benefits'), proof=q('.proof-section');
  const statistics=[...numbers.querySelectorAll('.number-stat')].map(n=>n.innerHTML);
  const principles=[...how.querySelectorAll('.architecture-principles li')];
  const labels=['Architecture','Simplicity','Performance'];
  const descriptions=[principles[1].querySelector('p').innerHTML,principles[0].querySelector('p').innerHTML,'Faster to build, deploy, and run'];
  const icons=[principles[1].querySelector('svg').outerHTML,principles[0].querySelector('svg').outerHTML,benefits.querySelector('#benefit-speed svg').outerHTML];
  const tabs=(id,labels,icons,panels,legend,extra='')=>`<fieldset class="side-tabs ${extra}"><legend>${legend}</legend>${labels.map((l,i)=>`<input type="radio" name="${id}" id="${id}-${i}" ${i===0?'checked':''}>`).join('')}<div class="tab-labels">${labels.map((l,i)=>`<label for="${id}-${i}">${icons[i]}<span>${l}</span></label>`).join('')}</div><div class="tab-panels">${panels.join('')}</div></fieldset>`;
  const combined=d.createElement('section');
  combined.className='chapter how compact-differences';combined.id='how';
  combined.innerHTML=how.querySelector('.chapter-heading').outerHTML;
  combined.querySelector('h2').id='differences-title';combined.setAttribute('aria-labelledby','differences-title');
  if(option==='a'){
   combined.innerHTML+=`<div class="difference-columns">${labels.map((l,i)=>`<article class="difference-column"><h3>${l}</h3><p>${descriptions[i]}</p></article>`).join('')}</div><ul class="compact-metrics">${[2,0,1].map(i=>`<li>${statistics[i]}</li>`).join('')}</ul>`;
  } else {
   const order=[2,0,1];
   combined.innerHTML+=tabs('differences',labels,icons,labels.map((l,i)=>`<article class="tab-panel difference-panel"><h3>${l}</h3><p>${descriptions[i]}</p><ul class="compact-metrics"><li>${statistics[order[i]]}</li></ul></article>`),'What makes CARLOS different?','difference-tabs');
  }
  combined.innerHTML+='<p class="metric-source">Based on real world data from Team Tito</p>';
  const caps=numbers.querySelector('.capabilities-list').cloneNode(true);caps.className='compact-capabilities';combined.append(caps);
  const comparisons=d.createElement('details');comparisons.className='compact-disclosure comparison-disclosure';
  comparisons.innerHTML='<summary>How it works</summary>'+[...how.querySelectorAll('.stack-example')].map(n=>n.outerHTML).join('')+[...how.querySelectorAll('.stack-explanation')].map(n=>n.outerHTML).join('');
  combined.append(comparisons);
  const method=numbers.querySelector('.numbers-method').cloneNode(true);method.classList.add('compact-disclosure');
  const response=numbers.querySelector('.numbers-response').cloneNode(true);method.querySelector('summary').after(response);
  combined.append(method);
  numbers.remove();how.remove();intro.after(combined);
  const groupLabels=['Build better apps','Run them efficiently','Stay in control'];
  const groups=[...benefits.querySelectorAll('.benefit-group')];
  const groupIcons=groups.map(g=>g.querySelector('.outcome-icon').outerHTML);
  groups.forEach(g=>g.classList.add('tab-panel'));
  benefits.innerHTML=benefits.querySelector('.chapter-heading').outerHTML+tabs('benefits',groupLabels,groupIcons,groups.map(g=>g.outerHTML),'What does better mean?');
  benefits.classList.add('tabbed-benefits');
  combined.after(benefits);benefits.after(proof);
  const nav=d.createElement('nav');nav.className='preview-switch';nav.setAttribute('aria-label','Architecture / Simplicity / Performance');
  nav.innerHTML=`<a href="/option-a.html#how" ${option==='a'?'aria-current="page"':''}>A</a><a href="/option-b.html#how" ${option==='b'?'aria-current="page"':''}>B</a>`;
  d.body.prepend(nav);d.body.classList.add('preview-options');
  const noindex=d.createElement('meta');noindex.name='robots';noindex.content='noindex,nofollow';d.head.append(noindex);
  const css=d.createElement('link');css.rel='stylesheet';css.href='/options.css';d.head.append(css);
  return '<!doctype html>\n'+d.documentElement.outerHTML;
 },{html,option});
 await fs.writeFile(path.join(root,`option-${option}.html`),result);
}
await fs.copyFile('prototypes/options.css',path.join(root,'options.css'));
await browser.close();
console.log('Built option-a.html and option-b.html; production homepage unchanged.');
