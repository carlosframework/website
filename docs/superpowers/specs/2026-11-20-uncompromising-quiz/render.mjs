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
const names = ['1-intro', '2a-stack-empty', '2b-stack-pile',
  '3a-one-database-asked', '3b-one-database-absolutely', '3c-one-database-absolutely-not',
  '4a-asleep-asked', '4b-asleep-absolutely', '4c-asleep-absolutely-not',
  '7a-pager-asked', '7b-pager-absolutely', '7c-pager-absolutely-not',
  '6a-hello-asked', '6b-hello-absolutely', '6c-hello-absolutely-not',
  '8-contact-sheet', '9-result', '10-share-images', '11-without-script'];
const shots = async (p, dir, q) => { const fs = await p.$$('.f'); if (fs.length !== names.length) throw new Error(`${fs.length} frames, ${names.length} names`);
  for (let i = 0; i < fs.length; i++) await fs[i].screenshot({ path: path.join(here, `${dir}-${names[i]}.jpg`), type: 'jpeg', quality: q }); };
let p = await b.newPage({ viewport: { width: 1328, height: 800 } });
p.on('pageerror', e => { throw e; });
await p.goto(url);
await shots(p, 'desktop', 80);
for (const s of await p.$$('.fullshares .share')) await s.screenshot({ path: path.join(here, `share-${await s.getAttribute('data-k')}.jpg`), type: 'jpeg', quality: 84 });
p = await b.newPage({ viewport: { width: 438, height: 900 }, deviceScaleFactor: 2 });
await p.goto(url + '?m');
await shots(p, 'mobile-390', 72);
await b.close();
