// 🤖 Takes the storyboard screenshots: node render.mjs <dir holding node_modules with playwright-core> [chromium path]
// Reads storyboard.html from this folder over file://, starts no server, writes JPG files beside itself.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(process.argv[2] || '.', 'node_modules') + path.sep);
const { chromium } = require('playwright-core');
const b = await chromium.launch({ executablePath: process.argv[3] || '/usr/bin/chromium' });
const url = 'file://' + path.join(here, 'storyboard.html');
const names = ['0a-hero-before', '0b-hero-after', '0c-hero-alternative', '1-lightweight', '1i-interlude', '2-secure', '3-cost-effective', '4-replicated', '5-available', '6-open',
  '7-the-turn', '8a-objections-scale', '8b-objections-sign-on', '8c-objections-shared-services', '9-how-it-works', '10-what-you-get-and-start'];
const shots = async (p, dir, q) => { const fs = await p.$$('.f'); if (fs.length !== names.length) throw new Error(`${fs.length} frames, ${names.length} names`);
  for (let i = 0; i < fs.length; i++) await fs[i].screenshot({ path: path.join(here, `${dir}-${names[i]}.jpg`), type: 'jpeg', quality: q }); };
let p = await b.newPage({ viewport: { width: 1328, height: 800 } });
await p.goto(url);
await shots(p, 'desktop', 80);
// contact sheets: every frame at once
await p.addStyleTag({ content: 'body{display:grid;grid-template-columns:1280px 1280px;gap:16px;padding:16px;width:2608px}.f{margin:0}' });
await p.setViewportSize({ width: 2608, height: 800 });
await p.screenshot({ path: path.join(here, 'storyboard-desktop.jpg'), fullPage: true, type: 'jpeg', quality: 62 });
p = await b.newPage({ viewport: { width: 438, height: 900 }, deviceScaleFactor: 2 });
await p.goto(url + '?m');
await shots(p, 'mobile-390', 72);
p = await b.newPage({ viewport: { width: 1700, height: 900 } });
await p.goto(url + '?m');
await p.addStyleTag({ content: 'body{display:grid;grid-template-columns:repeat(4,390px);gap:16px;padding:16px;width:1656px;align-items:start}.f{margin:0}' });
await p.screenshot({ path: path.join(here, 'storyboard-390.jpg'), fullPage: true, type: 'jpeg', quality: 76 });
await b.close();
