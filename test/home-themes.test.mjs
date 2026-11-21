// 🤖 Both homepage themes in a real browser: axe-core (WCAG 2.2 AA, contrast included) finds
// nothing at 390 and 1280 px in Light, Dark and Auto, and the switch changes the theme live.
// Needs a local Chromium, playwright-core and axe-core, which this repo does not install:
//   HOME_THEMES_PLAYWRIGHT=/path/to/node_modules/playwright-core/index.mjs
//   HOME_THEMES_AXE=/path/to/node_modules/axe-core/axe.min.js   (axe-core 4.14.0: the test checks the version)
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
  // Pinned: a newer axe can add rules (4.14 is the one that caught a list of carousel groups), so a different
  // version is a failure to update this line on purpose, not a quiet change in what is checked.
  const axeVersion = axe.match(/axe v([\d.]+)/)?.[1];
  assert.equal(axeVersion, '4.14.0', `HOME_THEMES_AXE is axe-core ${axeVersion}; this test is pinned to 4.14.0`);
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
      assert.equal(ground, used === 'light' ? 'rgb(250, 248, 244)' : 'rgb(16, 28, 35)', `${width} ${theme} hero ground`);
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] })).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 5).join(', ')}`));
      assert.deepEqual(violations, [], `${width} ${theme} (system ${scheme})`);
      await ctx.close();
    }
    // Moving, with the hero's attributes open and every chapter at its last step: axe again, in both themes.
    for (const width of [390, 1280]) for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      await ctx.addInitScript(t => localStorage.setItem('carlos-theme', t), theme);
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => { document.querySelector('.story-hero').classList.add('is-open'); document.querySelectorAll('.ch.is-live').forEach(c => { c.dataset.step = '3'; }); });
      await page.waitForTimeout(1600);
      await page.addScriptTag({ content: axe });
      // (the story's own sections: the apps carousel below keeps moving, and is checked still, above)
      const violations = await page.evaluate(async () => (await window.axe.run({ include: [['.story-hero'], ['.story-u'], ['.ch-1'], ['.ch-2']] }, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] })).violations.map(v => `${v.id}: ${v.nodes.map(n => n.target.join(' ')).slice(0, 5).join(', ')}`));
      assert.deepEqual(violations, [], `${width} ${theme} moving, attributes open`);
      await ctx.close();
    }
    // The story homepage replaced the old hero (stage 1, 2026-11-21): its frosted pane, drawn background, held height
    // and rotating word are gone, and with them the checks that measured them.
    // A successful copy moves nothing, in the hero or the closing box: the button says "Copied" at the same size, and
    // the sentence after it is for screen readers only (it is in the polite status, visually hidden). Every element
    // keeps its place and size on the page. (Reduced motion keeps the replay, the fizz and the sun still, so only Copy can move
    // anything.)
    for (const width of [390, 1280]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      const layout = () => page.evaluate(() => ({
        boxes: [...document.querySelectorAll('.c-hero *, .rw-end .paste, .rw-end .paste *')].filter(el => !el.closest('.pb-copy > *, .pb-done, .hero-bg-wrap') && el.getClientRects().length)
          .map(el => { const r = el.getBoundingClientRect(); return [el.tagName, r.left + scrollX, r.top + scrollY, r.width, r.height].map(v => typeof v === 'number' ? Math.round(v * 2) / 2 : v).join(' '); }) }));
      for (const box of ['.c-hero .paste', '.rw-end .paste']) {
        const before = await layout();
        await page.locator(`${box} .pb-copy`).click(); await page.waitForTimeout(600);
        const after = await layout();
        assert.ok(await page.locator(box).evaluate(el => el.classList.contains('is-copied')), `${width} ${box}: copied`);
        assert.equal(await page.locator(`${box} .pb-copy span`).textContent(), 'Copied');
        assert.equal(await page.locator(`${box} .pb-done`).textContent(), 'Copied. Paste it into your agent.', `${width} ${box}: screen readers still hear it`);
        assert.ok(await page.locator(`${box} .pb-done`).evaluate(el => el.getBoundingClientRect().width <= 1 && getComputedStyle(el).clipPath === 'inset(50%)'), `${width} ${box}: not shown`);
        assert.deepEqual(after.boxes.filter((b, i) => b !== before.boxes[i]), [], `${width} ${box}: nothing moved`);
      }
      await ctx.close();
    }
    // Narrow phones to a small laptop, moving and still: nothing on the page is wider than the screen, the paste
    // lines' URLs stay inside their boxes, the replay's title bar fits its controls, and the hero's attributes, once
    // open, stay on the page.
    for (const width of [320, 360, 390, 430, 1024]) for (const reducedMotion of ['reduce', 'no-preference']) {
      const ctx = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'load' });
      if (reducedMotion === 'no-preference') await page.evaluate(() => document.querySelector('.story-hero').classList.add('is-open'));
      await page.waitForTimeout(reducedMotion === 'reduce' ? 0 : 1400);
      const r = await page.evaluate(() => {
        const urls = [...document.querySelectorAll('.paste')].filter(b => { const u = b.querySelector('.pb-url').getBoundingClientRect(), br = b.getBoundingClientRect(), cs = getComputedStyle(b); return u.right > br.right - parseFloat(cs.paddingRight) + 0.5; }).length;
        const words = [...document.querySelectorAll('.story-hero.is-live .attrs li')].filter(li => { const q = li.getBoundingClientRect(); return q.left < -0.5 || q.right > innerWidth + 0.5; }).map(li => li.textContent);
        const bar = document.querySelector('.rp-bar');
        return { page: document.documentElement.scrollWidth - innerWidth, urls, words, bar: bar.scrollWidth - bar.clientWidth };
      });
      assert.deepEqual(r, { page: 0, urls: 0, words: [], bar: 0 }, `${width} ${reducedMotion}: everything fits`);
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

// 🤖 The replay's top bar holds still (Paul, 2026-11-13: "the buttons jump to the right when I click them"): every
// press of back, forward, slower, faster, Pause and Play leaves every control exactly where it was, at 390 and 1280.
// The carousel starts in a browser whose scroll-behavior has no 'instant' (older Safari), so it is never left flat.
// Needs only Playwright and a Chromium (HOME_THEMES_PLAYWRIGHT, HOME_THEMES_CHROME; HOME_THEMES_CHROME_ARGS optional).
const skipBar = !(pw && chrome) && 'set HOME_THEMES_PLAYWRIGHT and HOME_THEMES_CHROME to run';
test('the replay bar never moves a control; the apps ring lets go smoothly and starts without scroll-behavior "instant"', { skip: skipBar, timeout: 360000 }, async () => {
  const base = process.env.STARTER_SCRATCH || tmpdir(); assert.ok(!/^\/tmp(?:\/|$)/.test(resolve(base)), 'use disk scratch');
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'home-bar-'));
  const { chromium } = await import(pw);
  const env = { ...process.env, CARLOS_START_DEMO: '1', CARLOS_START_SITE_ORIGIN: 'https://carlosframework.com', CARLOS_START_CONSOLE_ORIGIN: 'https://console.carloku.com', CARLOS_START_ACCOUNT_URL: 'https://console.carloku.com/', CARLOS_START_CLAIM: 'off' };
  execFileSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', `--output=${dir}`, '--quiet'], { env, stdio: 'pipe' });
  const server = createServer(async (req, res) => {
    let file = join(dir, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''));
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: chrome, args: (process.env.HOME_THEMES_CHROME_ARGS || '').split(' ').filter(Boolean) });
  try {
    for (const width of [390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto(url, { waitUntil: 'networkidle' });
      // measured from the bar's own edge: the whole panel floats a little with the hero (its own gentle motion)
      const where = () => page.evaluate(() => { const bar = document.querySelector('.rp-bar').getBoundingClientRect(); return [...document.querySelectorAll('.rp-bar :is(button, .rp-pause, output)')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [e.className || e.tagName, r.left - bar.left, r.width]; }); });
      // within half a pixel: the floating panel's sub-pixel transform can tip a rounding, never a visible jump
      const same = (a, b) => a.length === b.length && a.every(([n, x, w], i) => n === b[i][0] && Math.abs(x - b[i][1]) < 0.5 && Math.abs(w - b[i][2]) < 0.5);
      const start = await where();
      assert.ok(start.length >= 6, `${width}: ${start}`);
      for (const sel of ['.rp-fwd', '.rp-fwd', '.rp-back', '.rp-slower', '.rp-slower', '.rp-slower', '.rp-faster', '.rp-faster', '.rp-faster', '.rp-faster', '.rp-pause', '.rp-pause']) {
        await page.click(sel, { force: true });
        await page.waitForTimeout(220); // the press-down's release (a transform, which moves nothing else)
        const now = await where();
        assert.ok(same(now, start), `${width}: ${sel} moved a control: ${JSON.stringify(start)} -> ${JSON.stringify(now)}`);
      }
      await page.close();
    }
    // Letting go (Paul, 2026-11-13: "it snaps back then animates in"): real pointer events a frame apart, the row's
    // offset recorded every frame from release to rest. One settle, one way, from where it was let go, nothing popped
    // until it has come to rest. A small drag held still goes back; half an app goes on; a quick flick goes on.
    {
      const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.click('.ap-play'); await page.mouse.move(1, 1);
      await page.evaluate(() => scrollTo({ top: document.querySelector('.rw-apps').getBoundingClientRect().top + scrollY - 40 })); await page.waitForTimeout(500);
      for (const [label, per, moves, hold, on] of [['small drag, held still', 15, 6, 160, 0], ['half an app', 27, 10, 160, 1], ['a flick', 30, 4, 0, 1]]) {
        const r = await page.evaluate(async ([per, moves, hold]) => {
          const t = document.querySelector('.ap-track'), box = t.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + 200;
          const frame = () => new Promise(f => requestAnimationFrame(f)), slides = [...t.querySelectorAll('.ap-slide')], before = slides.indexOf(t.querySelector('.is-up'));
          const fire = (type, cx) => t.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: cx, clientY: y }));
          fire('pointerdown', x); for (let k = 1; k <= moves; k++) { await frame(); fire('pointermove', x - per * k); }
          if (hold) await new Promise(f => setTimeout(f, hold));
          fire('pointerup', x - per * moves);
          const trace = [t.scrollLeft], popped = [];
          for (let k = 0; k < 90; k++) { await frame(); trace.push(t.scrollLeft); popped.push(!!t.querySelector('.is-up')); }
          await new Promise(f => setTimeout(f, 400));
          const step = slides[1].offsetLeft - slides[0].offsetLeft, set = 8 * step, real = [trace[0]];
          for (let k = 1; k < trace.length; k++) { const d = trace[k] - trace[k - 1]; real.push(real[k - 1] + (Math.abs(Math.abs(d) - set) < 3 ? 0 : d)); } // the copy-to-real swap is no movement
          const dir = Math.sign(real[real.length - 1] - real[0]);
          const upNow = t.querySelector('.is-up');
          return { moved: ((slides.indexOf(upNow) - before) % 8 + 8) % 8, oneWay: real.every((v, k) => !k || (v - real[k - 1]) * dir >= -0.5),
            firstStep: Math.abs(real[2] - real[1]), poppedEarly: popped.some((p, k) => p && Math.abs(real[k + 1] - real[real.length - 1]) > 1) };
        }, [per, moves, hold]);
        assert.equal(r.moved, on, `${label}: ${JSON.stringify(r)}`);
        assert.ok(r.oneWay, `${label}: one way from where it was let go, no jump`);
        assert.ok(!r.poppedEarly, `${label}: nothing pops until it has settled`);
      }
      // the replay keeps its whole conversation for screen readers at every point of the loop (Astra, 9174009)
      for (const ms of [0, 3000, 9000, 26000]) {
        await page.evaluate(() => document.querySelector('.rp-pause input').checked = false);
        const hidden = await page.evaluate(async ms => { await new Promise(f => setTimeout(f, ms ? 300 : 0)); return [...document.querySelectorAll('.rp-log li, .rp-scene1, .rp-qs li')].filter(e => getComputedStyle(e).visibility === 'hidden' || getComputedStyle(e).display === 'none').length; }, ms);
        assert.equal(hidden, 0, `nothing in the replay is hidden from screen readers (${ms})`);
      }
      await page.close();
    }
    // The replay's sessions (2026-11-13): tabs by click and keyboard (APG tablist), the next session at the end of one,
    // held by Pause; under reduced motion nothing moves on, and the tabs still choose the picture. Replay time is run on
    // Playwright's clock, so a whole session takes no real time.
    {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await ctx.newPage();
      await page.clock.install(); await page.goto(url, { waitUntil: 'load' });
      const st = () => page.evaluate(() => ({ open: [...document.querySelectorAll('.rp-session')].filter(s => !s.hidden).map(s => s.dataset.slug).join(), sel: [...document.querySelectorAll('.rp-dot')].map(t => (t.getAttribute('aria-selected') === 'true' ? 1 : 0)).join(''), tabindex: [...document.querySelectorAll('.rp-dot')].map(t => t.tabIndex).join(), focus: document.activeElement && document.activeElement.id }));
      const slugs = await page.evaluate(() => [...document.querySelectorAll('.rp-session')].map(s => s.dataset.slug));
      assert.ok(slugs.includes((await st()).open), 'one session open to start');
      // a random one each visit (the first only without JavaScript)
      const firsts = new Set();
      for (let k = 0; k < 12; k++) { await page.reload({ waitUntil: 'load' }); firsts.add((await st()).open); }
      assert.ok(firsts.size > 1, `a random first session: ${[...firsts]}`);
      // the row under the title bar names the session showing
      const title = () => page.evaluate(() => document.querySelector('.rp-now-name').textContent);
      assert.equal(await title(), await page.evaluate(() => document.querySelector('.rp-dot[aria-selected="true"]').getAttribute('aria-label')));
      await page.click('.rp-dot:nth-child(2)');
      assert.deepEqual(await st(), { open: slugs[1], sel: slugs.map((_, k) => (k === 1 ? 1 : 0)).join(''), tabindex: slugs.map((_, k) => (k === 1 ? 0 : -1)).join(), focus: `rp-tab-${slugs[1]}` });
      await page.keyboard.press('ArrowRight'); assert.equal((await st()).open, slugs[2]); assert.equal((await st()).focus, `rp-tab-${slugs[2]}`);
      await page.keyboard.press('End'); assert.equal((await st()).open, slugs[slugs.length - 1]);
      await page.clock.runFor(300); assert.equal(await title(), await page.evaluate(() => document.querySelector('.rp-dot:last-child').getAttribute('aria-label')), 'the title follows');
      await page.keyboard.press('ArrowRight'); assert.equal((await st()).open, slugs[0], 'wraps round');
      await page.keyboard.press('Home'); assert.equal((await st()).open, slugs[0]);
      await page.click('.rp-faster'); // 2x: the status page is about 44 s of replay time (the clock still runs every frame)
      await page.clock.runFor(50000); assert.equal((await st()).open, slugs[1], 'the next session at the end of one');
      await page.click('.rp-pause'); await page.clock.runFor(120000); assert.equal((await st()).open, slugs[1], 'Pause holds it');
      await ctx.close();
      const rctx = await browser.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' }); const still = await rctx.newPage();
      await still.clock.install(); await still.goto(url, { waitUntil: 'load' });
      const shown = () => still.evaluate(() => [...document.querySelectorAll('.rp-session')].filter(s => !s.hidden).map(s => s.dataset.slug).join());
      const startedOn = await shown(); await still.clock.runFor(120000);
      assert.equal(await shown(), startedOn, 'reduced motion: nothing moves on by itself');
      assert.equal(await still.evaluate(() => document.querySelector('.rp-dotrow').hidden), false);
      await still.click('.rp-dot:nth-child(3)'); assert.equal(await shown(), slugs[2], 'and the tabs still choose');
      // the dots: each named and titled with its session
      assert.equal(await still.evaluate(() => [...document.querySelectorAll('.rp-dot')].every(d => d.title && d.title === d.getAttribute('aria-label'))), true);
      await rctx.close();
    }
    // the ring in a browser whose scroll-behavior is only 'auto' or 'smooth'
    const page = await browser.newPage({ viewport: { width: 1257, height: 800 } });
    await page.addInitScript(() => { const o = Element.prototype.scrollTo; Element.prototype.scrollTo = function (a, ...r) { if (a && typeof a === 'object' && a.behavior && !['auto', 'smooth'].includes(a.behavior)) throw new TypeError('Type error'); return o.call(this, a, ...r); }; });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto(url, { waitUntil: 'networkidle' });
    const ring = await page.evaluate(() => { const t = document.querySelector('.ap-track'); return { live: document.querySelector('.rw-apps').classList.contains('is-live'), popped: !!t.querySelector('.is-up'), turned: [...t.querySelectorAll('.ap-slide')].some(s => /rotateY/.test(s.style.transform)) }; });
    assert.deepEqual(errors, []); assert.deepEqual(ring, { live: true, popped: true, turned: true });
    await page.close();
  } finally {
    await browser.close(); server.close(); await rm(dir, { recursive: true, force: true });
  }
});
