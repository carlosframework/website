import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from '/tmp/carlos-benefits-browser/node_modules/playwright/index.mjs';
const root=path.resolve('_site');
const html=await fs.readFile(path.join(root,'index.html'),'utf8');
const performance=JSON.parse(await fs.readFile('prototypes/performance-copy.json','utf8'));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage();
for(const option of ['a','b','c']){
 const result=await page.evaluate(({html,option,performance})=>{
  const d=new DOMParser().parseFromString(html,'text/html');
  const q=s=>d.querySelector(s);
  const intro=q('.architecture-intro'), numbers=q('.numbers-section'), how=q('#how'), benefits=q('#benefits'), proof=q('.proof-section');
  const statistics=[...numbers.querySelectorAll('.number-stat')].map(n=>n.innerHTML);
  const escape=text=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const copy=id=>escape(performance.find(s=>s.id===id).text);
  const metric=(headline,detail)=>{
   const [,prefix,value,suffix]=copy(headline).match(/^(.*?)([\d.]+×?)(.*)$/);
   return `<strong>${prefix?`<em>${prefix}</em>`:''}${value}</strong><span>${suffix}</span><small>${copy(detail)}</small>`;
  };
  const throughput=metric('s01','s02');
  const firstRender=metric('s03','s04');
  const newMetrics=`<li>${throughput}</li><li>${firstRender}</li>`;
  const principles=[...how.querySelectorAll('.architecture-principles li')];
  const labels=['Architecture','Simplicity','Performance'];
  const descriptions=[principles[1].querySelector('p').innerHTML,principles[0].querySelector('p').innerHTML,'Faster to build, deploy, and run'];
  const icons=[principles[1].querySelector('svg').outerHTML,principles[0].querySelector('svg').outerHTML,benefits.querySelector('#benefit-speed svg').outerHTML];
  const tabs=(id,labels,icons,panels,legend,extra='')=>`<fieldset class="side-tabs ${extra}"><legend>${legend}</legend>${labels.map((l,i)=>`<input type="radio" name="${id}" id="${id}-${i}" ${i===0?'checked':''}>`).join('')}<div class="tab-labels">${labels.map((l,i)=>`<label for="${id}-${i}">${icons[i]}<span>${l}</span></label>`).join('')}</div><div class="tab-panels">${panels.join('')}</div></fieldset>`;
  const combined=d.createElement('section');
  combined.className='chapter how compact-differences';combined.id='how';
  combined.innerHTML=how.querySelector('.chapter-heading').outerHTML;
  combined.querySelector('h2').id='differences-title';combined.setAttribute('aria-labelledby','differences-title');
  if(option==='c'){
   const capability=[...numbers.querySelectorAll('.capabilities-list li')];
   const capabilities=indices=>`<ul class="riff-capabilities">${indices.map(i=>capability[i].outerHTML).join('')}</ul>`;
   const securityCapabilities=capabilities([5]).replace('</ul>', ['Defence against common security threats','Auditing at every step'].map(text=>`<li>${capability[5].querySelector('.capability-plus').outerHTML}<span>${text}</span></li>`).join('')+'</ul>');
   const stat=i=>`<div class="riff-stat">${statistics[i]}</div>`;
   const compactStat=i=>`<p class="riff-support">${statistics[i]}</p>`;
   const security=benefits.querySelector('#benefit-security');
   const backup=[...benefits.querySelectorAll('.outcome-card li')].find(n=>n.textContent.includes('Back up with 1–2s'));
   if(!backup)throw new Error('Expected approved backup-latency copy');
   const backupText=escape(backup.textContent);
   const backupSuffix=backupText.split(' latency ')[1];
   if(!backupSuffix)throw new Error('Expected backup latency explanation');
   const resilience=benefits.querySelector('#benefit-deployments')||[...benefits.querySelectorAll('.outcome-card')].find(n=>n.querySelector('h4')?.textContent==='Robust deployments');
   const zeroDowntime=[...resilience.querySelectorAll('li')].find(n=>n.textContent.includes('zero downtime')).textContent;
   const encryption=[...security.querySelectorAll('li')].find(n=>n.textContent.includes('E2EE')).textContent;
   combined.innerHTML+=`<div class="riff-grid">
    <article class="riff-column"><h3>Better</h3>${stat(0)}<div class="riff-detail">${compactStat(1)}${capabilities([2,3])}</div></article>
    <article class="riff-column"><h3>Faster</h3>${stat(2)}<div class="riff-detail"><p class="riff-support">${copy('s03').replace('4.5×','<strong>4.5×</strong>')}</p><p class="riff-support">${copy('s07').replace('5×','<strong>5×</strong>')}</p></div></article>
    <article class="riff-column"><h3>Harder</h3><div class="riff-stat riff-security">${security.querySelector('svg').outerHTML}<span>Customer isolation</span><small>${escape(security.querySelector('li').textContent)}</small></div><div class="riff-detail">${securityCapabilities}<p class="riff-support riff-extra">${escape(encryption)}</p></div></article>
    <article class="riff-column"><h3>Stronger</h3><div class="riff-stat riff-backup"><strong>1–2s</strong><span>backup latency</span><small>${backupSuffix}</small></div><div class="riff-detail">${capabilities([1,4])}<p class="riff-support riff-extra">${escape(zeroDowntime)}</p></div></article>
   </div>`;
  } else if(option==='a'){
   combined.innerHTML+=`<div class="difference-columns">${labels.map((l,i)=>`<article class="difference-column"><h3>${l}</h3><p>${descriptions[i]}</p></article>`).join('')}</div><ul class="compact-metrics metrics-five">${[2,0,1].map(i=>`<li>${statistics[i]}</li>`).join('')}${newMetrics}</ul>`;
  } else {
   const order=[2,0,1];
   combined.innerHTML+=tabs('differences',labels,icons,labels.map((l,i)=>`<article class="tab-panel difference-panel"><h3>${l}</h3><p>${descriptions[i]}</p><ul class="compact-metrics"><li>${statistics[order[i]]}</li>${i===2?newMetrics:''}</ul></article>`),'What makes CARLOS different?','difference-tabs');
  }
  if(option!=='c')combined.innerHTML+='<p class="metric-source">Based on real world data from Team Tito</p>';
  const caps=numbers.querySelector('.capabilities-list').cloneNode(true);caps.className='compact-capabilities';if(option!=='c')combined.append(caps);
  const comparisons=d.createElement('section');comparisons.className='comparison-section';
  comparisons.innerHTML='<h3>How it works</h3>'+[...how.querySelectorAll('.stack-example')].map(n=>n.outerHTML).join('')+[...how.querySelectorAll('.stack-explanation')].map(n=>n.outerHTML).join('');
  comparisons.querySelectorAll('.stack-example>h3').forEach(h=>{const n=d.createElement('h4');n.innerHTML=h.innerHTML;h.replaceWith(n);});
  comparisons.querySelectorAll('.stack-comparison h4').forEach(h=>{const n=d.createElement('h5');n.innerHTML=h.innerHTML;h.replaceWith(n);});
  combined.append(comparisons);
  const method=d.createElement('section');method.className='measurement-section';
  // Keep the JavaScript method and source links; replace the obsolete curl spot check.
  method.innerHTML='<h3>How we measured</h3>'+`<p>${copy('s05')}</p><p>${copy('s06')}</p>`+(option==='c'?`<p>${copy('s07')}: ${copy('s08')}</p><p>${copy('s02')} ${copy('s04')}</p>`:'')+numbers.querySelector('.numbers-method>p').outerHTML+numbers.querySelector('.numbers-method>p:last-child').outerHTML;
  const disclosure=d.createElement('details');disclosure.className='measurement-disclosure';
  disclosure.innerHTML='<summary>Numbers based on real data from Tito. The agents insisted on measuring everything. <span>See how</span></summary>';
  disclosure.append(method);
  combined.append(disclosure);
  numbers.remove();how.remove();intro.after(combined);
  benefits.classList.add('listed-benefits');
  combined.after(benefits);benefits.after(proof);
  const nav=d.createElement('nav');nav.className='preview-switch';nav.setAttribute('aria-label','Architecture / Simplicity / Performance');
  nav.innerHTML=`<a href="/option-a.html#how" ${option==='a'?'aria-current="page"':''}>A</a><a href="/option-b.html#how" ${option==='b'?'aria-current="page"':''}>B</a><a href="/option-c.html#how" ${option==='c'?'aria-current="page"':''}>C</a>`;
  d.body.prepend(nav);d.body.classList.add('preview-options');
  const noindex=d.createElement('meta');noindex.name='robots';noindex.content='noindex,nofollow';d.head.append(noindex);
  const css=d.createElement('link');css.rel='stylesheet';css.href='/options.css';d.head.append(css);
  return {html:'<!doctype html>\n'+d.documentElement.outerHTML};
 },{html,option,performance});
 await fs.writeFile(path.join(root,`option-${option}.html`),result.html);
}
let css=await fs.readFile('prototypes/options.css','utf8');
await fs.writeFile(path.join(root,'options.css'),css);
await browser.close();
console.log('Built options A, B and C; production homepage unchanged.');
