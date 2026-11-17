// 🤖 Takes the storyboard screenshots: node render.mjs <dir holding node_modules with playwright-core> [chromium path]
// Reads storyboard.html from this folder over file://, starts no server, writes PNG/JPG files beside itself.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(process.argv[2] || '.', 'node_modules') + path.sep);
const { chromium } = require('playwright-core');
const b = await chromium.launch({ executablePath: process.argv[3] || '/usr/bin/chromium' });
const url = 'file://' + path.join(here, 'storyboard.html');
const names = ['0-header', '1a-the-pile', '1b-one-file', '2-twenty-years', '3-your-agent', '4a-every-customer', '4b-asleep', '5-6-real-and-start'];
let p = await b.newPage({ viewport: { width: 1328, height: 800 } });
await p.goto(url);
const fs = await p.$$('.f');
for (let i = 0; i < fs.length; i++) await fs[i].screenshot({ path: path.join(here, `frame-${names[i]}.jpg`), type: 'jpeg', quality: 82 });
// contact sheet: all eight at once, two across
await p.addStyleTag({ content: 'body{display:grid;grid-template-columns:1280px 1280px;gap:16px;padding:16px;width:2608px}.f{margin:0}' });
await p.setViewportSize({ width: 2608, height: 800 });
await p.screenshot({ path: path.join(here, 'storyboard-desktop.jpg'), fullPage: true, type: 'jpeg', quality: 72 });
p = await b.newPage({ viewport: { width: 1700, height: 900 } });
await p.goto(url + '?m');
await p.addStyleTag({ content: 'body{display:grid;grid-template-columns:repeat(4,390px);gap:16px;padding:16px;width:1656px}.f{margin:0}' });
await p.screenshot({ path: path.join(here, 'storyboard-390.jpg'), fullPage: true, type: 'jpeg', quality: 78 });
await b.close();
