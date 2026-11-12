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
