import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '/tmp/carlos-benefits-browser/node_modules/playwright/index.mjs';
const root=path.resolve('_site');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage();
let attributeCount=0;
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
  const comparisons=d.createElement('section');comparisons.className='comparison-section';
  comparisons.innerHTML='<h3>How it works</h3>'+[...how.querySelectorAll('.stack-example')].map(n=>n.outerHTML).join('')+[...how.querySelectorAll('.stack-explanation')].map(n=>n.outerHTML).join('');
  comparisons.querySelectorAll('.stack-example>h3').forEach(h=>{const n=d.createElement('h4');n.innerHTML=h.innerHTML;h.replaceWith(n);});
  comparisons.querySelectorAll('.stack-comparison h4').forEach(h=>{const n=d.createElement('h5');n.innerHTML=h.innerHTML;h.replaceWith(n);});
  combined.append(comparisons);
  const method=d.createElement('section');method.className='measurement-section';
  method.innerHTML='<h3>How we measured</h3>'+numbers.querySelector('.numbers-response').outerHTML+[...numbers.querySelectorAll('.numbers-method>p')].map(n=>n.outerHTML).join('');
  const responseHeading=method.querySelector('.numbers-response h3');const responseTitle=d.createElement('h4');responseTitle.innerHTML=responseHeading.innerHTML;responseHeading.replaceWith(responseTitle);
  combined.append(method);
  numbers.remove();how.remove();intro.after(combined);
  const groupLabels=['Build better apps','Run them efficiently','Stay in control'];
  const groups=[...benefits.querySelectorAll('.benefit-group')];
  const attributes=groups.flatMap(g=>[...g.querySelectorAll('.outcome-card')]);
  const inputs=attributes.map((a,i)=>`<input type="radio" name="attributes" id="attribute-${i}" aria-describedby="attribute-group-${groups.findIndex(g=>g.contains(a))}" ${i===0?'checked':''}>`).join('');
  let n=0;
  const groupedLabels=groups.map((g,i)=>`<div class="attribute-tab-group"><h3 id="attribute-group-${i}">${groupLabels[i]}</h3>${[...g.querySelectorAll('.outcome-card')].map(a=>`<label for="attribute-${n++}">${a.querySelector('svg').outerHTML}<span>${a.querySelector('h4').innerHTML}</span></label>`).join('')}</div>`).join('');
  const panels=attributes.map(a=>{const panel=a.cloneNode(true);panel.classList.add('tab-panel');const heading=panel.querySelector('h4');const title=d.createElement('h3');title.innerHTML=heading.innerHTML;heading.replaceWith(title);return panel.outerHTML;}).join('');
  benefits.innerHTML=benefits.querySelector('.chapter-heading').outerHTML+`<fieldset class="side-tabs attribute-tabs"><legend>What does better mean?</legend>${inputs}<div class="tab-labels">${groupedLabels}</div><div class="tab-panels">${panels}</div></fieldset>`;
  benefits.classList.add('tabbed-benefits');
  combined.after(benefits);benefits.after(proof);
  const nav=d.createElement('nav');nav.className='preview-switch';nav.setAttribute('aria-label','Architecture / Simplicity / Performance');
  nav.innerHTML=`<a href="/option-a.html#how" ${option==='a'?'aria-current="page"':''}>A</a><a href="/option-b.html#how" ${option==='b'?'aria-current="page"':''}>B</a>`;
  d.body.prepend(nav);d.body.classList.add('preview-options');
  const noindex=d.createElement('meta');noindex.name='robots';noindex.content='noindex,nofollow';d.head.append(noindex);
  const css=d.createElement('link');css.rel='stylesheet';css.href='/options.css';d.head.append(css);
  return {html:'<!doctype html>\n'+d.documentElement.outerHTML,attributeCount:attributes.length};
 },{html,option});
 await fs.writeFile(path.join(root,`option-${option}.html`),result.html);
 attributeCount=result.attributeCount;
}
let css=await fs.readFile('prototypes/options.css','utf8');
for(let i=0;i<attributeCount;i++){
 css+=`\n.attribute-tabs>#attribute-${i}:checked~.tab-panels>.tab-panel:nth-child(${i+1}){display:block}.attribute-tabs>#attribute-${i}:checked~.tab-labels label[for="attribute-${i}"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);color:var(--accent)}.attribute-tabs>#attribute-${i}:focus-visible~.tab-labels label[for="attribute-${i}"]{outline:2px solid var(--accent);outline-offset:3px}`;
}
await fs.writeFile(path.join(root,'options.css'),css);
await browser.close();
console.log('Built option-a.html and option-b.html; production homepage unchanged.');
