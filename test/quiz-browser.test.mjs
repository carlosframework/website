// 🤖 The quiz in a real browser: keys (Enter, 1, 2, arrows, Page Up and Down), focus on each step's heading, the
// reaction read from a status region, the pile as a list, answers kept across a reload, Back and Forward, reduced
// motion (the physics engine is never fetched), no script (the plain list), and no horizontal scroll at 390 px.
// Needs a local Chromium and playwright-core, which this repo does not install:
//   QUIZ_PLAYWRIGHT=/path/to/node_modules/playwright-core/index.mjs QUIZ_CHROME=/path/to/chrome
// Without both it is skipped.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join, extname, normalize, resolve } from 'node:path';
import { tmpdir } from 'node:os';
const { QUIZ_PLAYWRIGHT: pw, QUIZ_CHROME: chrome } = process.env;
const skip = !(pw && chrome) && 'set QUIZ_PLAYWRIGHT and QUIZ_CHROME to run';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

test('the quiz by keyboard, with storage, reduced motion and without script', { skip, timeout: 180000 }, async () => {
  const base = process.env.STARTER_SCRATCH || tmpdir(); assert.ok(!/^\/tmp(?:\/|$)/.test(resolve(base)), 'use disk scratch');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'quiz-browser-'));
  const { chromium } = await import(pw);
  const env = { ...process.env, CARLOS_START_DEMO: '1', CARLOS_START_SITE_ORIGIN: 'https://carlosframework.com', CARLOS_START_CONSOLE_ORIGIN: 'https://console.carloku.com', CARLOS_START_ACCOUNT_URL: 'https://console.carloku.com/', CARLOS_START_CLAIM: 'off' };
  execFileSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', `--output=${dir}`, '--quiet'], { env, stdio: 'pipe' });
  const server = createServer(async (req, res) => {
    let file = join(dir, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''));
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/uncompromising/`;
  const browser = await chromium.launch({ executablePath: chrome });
  try {
    for (const width of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 800 }, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      const errors = [], fetched = [];
      page.on('pageerror', e => errors.push(e.message)); page.on('request', r => fetched.push(new URL(r.url()).pathname));
      await page.goto(url, { waitUntil: 'networkidle' });
      const focused = () => page.evaluate(() => document.activeElement?.textContent.trim());
      const now = () => page.evaluate(() => document.getElementById('qz').dataset.step);
      const at = step => page.waitForFunction(x => document.getElementById('qz').dataset.step === x, step, { timeout: 5000 });
      // Enter starts; the picker's heading takes focus.
      await page.keyboard.press('Enter');
      await at('stack');
      assert.equal(await focused(), 'First, what are you running today?');
      for (const thing of ['Rails', 'Postgres', 'Redis']) await page.getByRole('checkbox', { name: thing, exact: true }).check();
      assert.equal(await page.locator('.q-pile li').count(), 3);
      await page.getByRole('button', { name: 'That’s my stack' }).click();
      await at('1');
      assert.match(await focused(), /^Statement 1 of 12 I prefer corporations/);
      // 2 answers "Absolutely not": the fact in the status region, the top brick gone from the list, Next focused.
      await page.keyboard.press('2');
      await page.waitForFunction(() => document.querySelectorAll('.q-pile li').length === 2);
      assert.equal(await page.locator('.is-now .q-a[data-a="no"]').getAttribute('aria-pressed'), 'true');
      assert.match(await page.locator('.is-now [role="status"]').textContent(), /SQLite file you can take with you.*Redis out of your pile\. 2 left\./s);
      assert.equal(await page.locator('.q-pile').getAttribute('aria-label'), 'Your stack, 2 things');
      assert.equal(await focused(), 'NextEnter');
      // Arrows move between the answers without choosing; 1 changes the answer and puts the brick back.
      await page.locator('.is-now .q-a[data-a="yes"]').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.a), 'no');
      assert.equal(await page.locator('.is-now .q-a[data-a="no"]').getAttribute('aria-pressed'), 'true');
      await page.keyboard.press('1');
      await page.waitForFunction(() => document.querySelectorAll('.q-pile li').length === 3);
      assert.equal(await page.locator('.is-now .q-gone').isHidden(), true);
      // Page Down goes on once a statement is answered, and not before; Page Up goes back.
      await page.keyboard.press('PageDown'); await at('2');
      await page.keyboard.press('PageDown'); await page.waitForTimeout(150); assert.equal(await page.evaluate(() => location.hash), '#2', 'not answered: Page Down stays');
      await page.keyboard.press('2');
      await page.keyboard.press('PageUp'); await at('1');
      // The browser's own Back and Forward walk the steps; a reload keeps the answers and the pile.
      await page.goBack(); await at('2');
      await page.reload({ waitUntil: 'networkidle' });
      await at('2');
      assert.equal(await page.locator('.is-now .q-a[data-a="no"]').getAttribute('aria-pressed'), 'true');
      assert.deepEqual(await page.locator('.q-pile li').allTextContents(), ['Rails', 'Postgres']);
      // Keys are ignored while a modifier is held.
      await page.keyboard.press('Control+1');
      assert.equal(await page.locator('.is-now .q-a[data-a="yes"]').getAttribute('aria-pressed'), 'false');
      // The result: the verdict and the count of what was picked, not what is left.
      await page.goto(url + '#result', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.q-verdict span:not([hidden])').textContent(), 'You might be compromising. That’s fine. We’ll be here.');
      assert.equal(await page.locator('.q-count').textContent(), '3 things to run, patch and pay for. With CARLOS: 1.');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}: no sideways scroll`);
      // Under reduced motion the physics engine is never fetched.
      assert.ok(!fetched.some(p => p.includes('matter')), 'Matter.js stayed home');
      assert.deepEqual(errors, []);
      await ctx.close();
    }
    // Without script: the twelve statements with their facts and pictures, and no controls that could not work.
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.q-list > li').count(), 12);
    assert.equal(await page.locator('.q-say:visible').count(), 12);
    assert.equal(await page.locator('.q-a:visible, .q-start:visible, .q-stack:visible, .q-bar:visible').count(), 0);
    assert.equal(await page.locator('.q-img-fact').first().getAttribute('alt') !== '', true);
    assert.equal(await page.locator('.paste').isVisible(), true);
    await ctx.close();
  } finally {
    await browser.close(); server.close(); await rm(dir, { recursive: true, force: true });
  }
});
