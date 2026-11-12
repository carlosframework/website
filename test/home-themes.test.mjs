// 🤖 Both homepage themes in a real browser: axe-core (WCAG 2.2 AA, contrast included) finds
// nothing at 390 and 1280 px in Light, Dark and Auto, and the switch changes the theme live.
// Needs a local Chromium, playwright-core and axe-core, which this repo does not install:
//   HOME_THEMES_PLAYWRIGHT=/path/to/node_modules/playwright-core/index.mjs
//   HOME_THEMES_AXE=/path/to/node_modules/axe-core/axe.min.js
//   HOME_THEMES_CHROME=/path/to/chrome
// Without all three it is skipped.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const { HOME_THEMES_PLAYWRIGHT: pw, HOME_THEMES_AXE: axePath, HOME_THEMES_CHROME: chrome } = process.env;
const skip = !(pw && axePath && chrome) && 'set HOME_THEMES_PLAYWRIGHT, HOME_THEMES_AXE and HOME_THEMES_CHROME to run';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

test('homepage themes pass axe in Light, Dark and Auto, and the switch works', { skip, timeout: 240000 }, async () => {
  const base = process.env.STARTER_SCRATCH || tmpdir(); assert.ok(!/^\/tmp(?:\/|$)/.test(resolve(base)), 'use disk scratch');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'home-themes-'));
  const { chromium } = await import(pw);
  const axe = await readFile(axePath, 'utf8');
  const env = { ...process.env, CARLOS_START_DEMO: '1', CARLOS_START_SITE_ORIGIN: 'https://carlosframework.com', CARLOS_START_CONSOLE_ORIGIN: 'https://console.carloku.com', CARLOS_START_ACCOUNT_URL: 'https://console.carloku.com/', CARLOS_START_CLAIM: 'off' };
  execFileSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', `--output=${dir}`, '--quiet'], { env, stdio: 'pipe' });
  const server = createServer(async (req, res) => {
    let file = join(dir, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''));
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: chrome });
  try {
    for (const width of [390, 1280]) for (const [theme, scheme] of [['light', 'dark'], ['dark', 'light'], ['auto', 'light'], ['auto', 'dark']]) {
      // A remembered theme that disagrees with the system wins; Auto follows the system.
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' });
      if (theme !== 'auto') await ctx.addInitScript(t => localStorage.setItem('carlos-theme', t), theme);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const used = theme === 'auto' ? scheme : theme;
      assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), theme === 'auto' ? 'light dark' : theme, `${width} ${theme}`);
      const ground = await page.evaluate(() => getComputedStyle(document.querySelector('.c-hero')).backgroundColor);
      assert.equal(ground, used === 'light' ? 'rgb(250, 248, 244)' : 'rgb(15, 22, 28)', `${width} ${theme} hero ground`);
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] })).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 5).join(', ')}`));
      assert.deepEqual(violations, [], `${width} ${theme} (system ${scheme})`);
      await ctx.close();
    }
    // The glass panes over the drawn background: axe cannot see through backdrop-filter, so measure it. For
    // several moments of the background, the panes are captured with their text made transparent, and each
    // piece of text is compared with the worst of the pixels under its own line boxes.
    for (const width of [390, 1280]) for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      await ctx.addInitScript(t => localStorage.setItem('carlos-theme', t), theme);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const drawn = await page.evaluate(() => !document.querySelector('.c-hero').classList.contains('nogl'));
      if (!drawn) { await ctx.close(); continue; }   // no WebGL in this browser: the CSS gradient is covered by axe above
      await page.locator('.rp-pause').click();
      await page.addStyleTag({ content: `.rp-log li, .rp-app, .rp-scene1 { animation: none !important; opacity: 1 !important; transform: none !important; }
        .hide-text, .hide-text * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-decoration-color: transparent !important; }
        .hide-text svg, .hide-text .pb-caret, .hide-text .rp-dots, .hide-text .rp-app, .hide-text .pb-copy { visibility: hidden !important; } .hide-text .hv-rot-word { background: none !important; }
        .scene-a .rp-scene2, .scene-b .rp-scene1 { display: none !important; }` });
      for (const scene of ['scene-a', 'scene-b']) for (const t of [12, 61, 120, 240]) {
        const items = await page.evaluate(([scene, t]) => {
          document.body.classList.remove('scene-a', 'scene-b'); document.body.classList.add(scene); window.__heroBg.set(t);
          document.querySelectorAll('.is-sheen').forEach(e => e.classList.remove('is-sheen'));
          return [...document.querySelectorAll('.c-hero .hv-col *, .c-hero .rp-bar *, .c-hero .rp-log *, .c-hero .rp-cap')]
            .filter(el => !el.closest('.rp-app, .pb-copy, svg') && !el.closest('details:not([open]) > :not(summary)') && getComputedStyle(el).visibility !== 'hidden')
            .flatMap(el => [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => {
              const cs = getComputedStyle(el), r = document.createRange(); r.selectNodeContents(n);
              return { text: n.textContent.trim().slice(0, 40), color: cs.color, large: parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700),
                rects: [...r.getClientRects()].filter(q => q.width > 2 && q.height > 2).map(q => [q.left, q.top + scrollY, q.width, q.height]) };
            })).filter(i => i.rects.length);
        }, [scene, t]);
        await page.waitForTimeout(200);
        const hero = await page.evaluate(() => { const r = document.querySelector('.c-hero').getBoundingClientRect(); return { y: r.top + scrollY, h: r.height }; });
        await page.evaluate(() => document.querySelector('.c-hero').classList.add('hide-text'));
        const shot = await page.screenshot({ fullPage: true, clip: { x: 0, y: hero.y, width, height: hero.h } });
        await page.evaluate(() => document.querySelector('.c-hero').classList.remove('hide-text'));
        const low = await page.evaluate(async ([b64, items, top]) => {
          const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
          const c = new OffscreenCanvas(img.width, img.height), x = c.getContext('2d'); x.drawImage(img, 0, 0);
          const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
          return items.map(i => {
            const [fr, fg, fb] = i.color.match(/[\d.]+/g).map(Number), lf = L(fr, fg, fb), rs = [];
            for (const [l, tp, w, h] of i.rects) {
              const X = Math.max(0, Math.round(l)), Y = Math.max(0, Math.round(tp - top)), W = Math.min(img.width - X, Math.round(w)), H = Math.min(img.height - Y, Math.round(h));
              if (W < 1 || H < 1) continue;
              const d = x.getImageData(X, Y, W, H).data;
              for (let k = 0; k < d.length; k += 4) { const lb = L(d[k], d[k + 1], d[k + 2]); rs.push((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05)); }
            }
            rs.sort((a, b) => a - b);
            return { text: i.text, need: i.large ? 3 : 4.5, r: rs[Math.floor(rs.length * 0.005)] };   // the worst half percent of the pixels under the text
          }).filter(v => v.r !== undefined && v.r < v.need);
        }, [shot.toString('base64'), items, hero.y]);
        assert.deepEqual(low, [], `${width} ${theme} background moment ${t} (${scene})`);
      }
      await ctx.close();
    }
    // The switch: visible, pressed state follows, the page changes at once and remembers.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    assert.ok(await page.locator('.theme-switch').isVisible());
    await page.getByRole('button', { name: 'Light' }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    assert.equal(await page.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.masthead')).backgroundColor), 'rgb(250, 248, 244)');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    await page.getByRole('button', { name: 'Auto' }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), undefined);
    assert.equal(await page.evaluate(() => localStorage.getItem('carlos-theme')), null);
    await ctx.close();
  } finally {
    await browser.close(); server.close(); await rm(dir, { recursive: true, force: true });
  }
});
