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
    // The hero's held height is its content plus one line, never more, at any size and pixel density, before and
    // after resizes (a hero locked while stylesheets were still loading once stood ten screens tall in Safari).
    for (const [w, h] of [[1440, 900], [1728, 1117], [390, 844]]) for (const dpr of [1, 2]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'load' });
      const sane = async label => {
        const m = await page.evaluate(() => { const hero = document.querySelector('.c-hero'), inner = hero.querySelector('.c-hero-inner'), room = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.1;
          return { hero: hero.getBoundingClientRect().height, inner: inner.getBoundingClientRect().height, room }; });
        assert.ok(m.hero <= Math.ceil(m.inner + m.room) + 1, `${label}: hero ${m.hero} against content ${m.inner} + ${m.room}`);
        return m.hero;
      };
      const first = await sane(`${w}x${h} @${dpr}`);
      await page.waitForTimeout(1500);
      assert.equal(await sane(`${w}x${h} @${dpr} later`), first, 'steady while it runs');
      for (const [nw, nh] of [[w - 160, h], [w, h - 120], [w, h]]) { await page.setViewportSize({ width: nw, height: nh }); await page.waitForTimeout(300); await sane(`${nw}x${nh} @${dpr}`); }
      assert.equal(await sane('back'), first, 'back to where it started');
      await ctx.close();
    }
    // Copy's note, a failed copy and the opened hosts line grow the glass pane, never the hero: the background
    // keeps its size on the page (the slow-device guard may still change its drawing resolution) and the next section
    // does not move.
    for (const width of [390, 1280]) for (const copies of [true, false]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 }, permissions: copies ? ['clipboard-read', 'clipboard-write'] : [] });
      const page = await ctx.newPage();
      if (!copies) await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } }));
      await page.goto(url, { waitUntil: 'networkidle' });
      // side by side, the replay pane and the top of the text pane are held too
      const where = () => page.evaluate(wide => { const c = document.querySelector('.hero-bg'); return { next: document.querySelector('.rw-what').getBoundingClientRect().top + scrollY, hero: document.querySelector('.c-hero').getBoundingClientRect().height, canvas: [c.clientWidth, c.clientHeight],
        ...(wide ? { replay: document.querySelector('.c-hero .rp').offsetTop, text: document.querySelector('.c-hero .hv-col').offsetTop } : {}) }; }, width >= 1024);
      const before = await where();
      await page.locator('.c-hero .pb-copy').click(); await page.waitForTimeout(600);
      assert.ok(await page.locator('.c-hero .paste').evaluate(el => el.classList.contains('is-copied') || el.classList.contains('copy-failed')), 'the copy note shows');
      assert.deepEqual(await where(), before, `${width} after Copy (${copies ? 'copied' : 'failed'})`);
      await page.locator('.hv-cloud summary').click(); await page.waitForTimeout(400);
      assert.deepEqual(await where(), before, `${width} with the hosts line open`);
      await ctx.close();
    }
    // A window made taller at the same width grows the replay (it is sized from the screen's height): the held
    // height follows, so nothing overflows the hero onto the section below. And back again.
    for (const [w, h0, h1] of [[900, 300, 900], [1280, 520, 1000], [390, 500, 900]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h0 } });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'load' });
      const fits = async label => {
        const m = await page.evaluate(() => { const hero = document.querySelector('.c-hero').getBoundingClientRect(), inner = document.querySelector('.c-hero-inner').getBoundingClientRect(), rp = document.querySelector('.c-hero .rp').getBoundingClientRect(), next = document.querySelector('.rw-what').getBoundingClientRect();
          return { hero: hero.bottom, inner: inner.bottom, replay: rp.bottom, next: next.top }; });
        assert.ok(m.inner <= m.hero + 1 && m.replay <= m.hero + 1 && m.hero <= m.next + 1, `${label}: ${JSON.stringify(m)}`);
      };
      await fits(`${w}x${h0}`);
      await page.setViewportSize({ width: w, height: h1 }); await page.waitForTimeout(300); await fits(`${w}x${h0} to ${w}x${h1}`);
      await page.setViewportSize({ width: w, height: h0 }); await page.waitForTimeout(300); await fits(`back to ${w}x${h0}`);
      await ctx.close();
    }
    // At rest the side-by-side panes sit exactly as centred (the hold changes nothing until something grows).
    for (const width of [1280, 1440]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'load' });
      const held = await page.evaluate(() => [...document.querySelectorAll('.c-hero-inner > *')].map(c => c.offsetTop));
      const centred = await page.evaluate(() => { const inner = document.querySelector('.c-hero-inner'); [...inner.children].forEach(c => { c.style.alignSelf = ''; c.style.marginTop = ''; }); return [...inner.children].map(c => c.offsetTop); });
      assert.deepEqual(held, centred, `${width}: resting layout unchanged`);
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
      const st = () => page.evaluate(() => ({ open: [...document.querySelectorAll('.rp-session')].filter(s => !s.hidden).map(s => s.dataset.slug).join(), sel: [...document.querySelectorAll('.rp-tab')].map(t => (t.getAttribute('aria-selected') === 'true' ? 1 : 0)).join(''), tabindex: [...document.querySelectorAll('.rp-tab')].map(t => t.tabIndex).join(), focus: document.activeElement && document.activeElement.id }));
      const slugs = await page.evaluate(() => [...document.querySelectorAll('.rp-session')].map(s => s.dataset.slug));
      assert.ok(slugs.includes((await st()).open), 'one session open to start');
      // a random one each visit (the first only without JavaScript)
      const firsts = new Set();
      for (let k = 0; k < 12; k++) { await page.reload({ waitUntil: 'load' }); firsts.add((await st()).open); }
      assert.ok(firsts.size > 1, `a random first session: ${[...firsts]}`);
      // the strip: the chosen tab scrolled into view, a fade at an end while more tabs lie beyond it
      const strip = () => page.evaluate(() => { const t = document.querySelector('.rp-tabs'), a = t.querySelector('[aria-selected="true"]').getBoundingClientRect(), b = t.getBoundingClientRect(); return { inView: a.left >= b.left - 1 && a.right <= b.right + 1, left: t.classList.contains('more-left'), right: t.classList.contains('more-right'), overflows: t.scrollWidth > t.clientWidth }; });
      await page.click('.rp-tab:nth-child(2)');
      assert.deepEqual(await st(), { open: slugs[1], sel: slugs.map((_, k) => (k === 1 ? 1 : 0)).join(''), tabindex: slugs.map((_, k) => (k === 1 ? 0 : -1)).join(), focus: `rp-tab-${slugs[1]}` });
      await page.keyboard.press('ArrowRight'); assert.equal((await st()).open, slugs[2]); assert.equal((await st()).focus, `rp-tab-${slugs[2]}`);
      await page.keyboard.press('End'); assert.equal((await st()).open, slugs[slugs.length - 1]);
      await page.waitForTimeout(600); { const s = await strip(); assert.ok(s.inView, 'the last tab scrolled into view'); if (s.overflows) assert.deepEqual([s.left, s.right], [true, false]); }
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
      assert.equal(await still.evaluate(() => document.querySelector('.rp-tabs').hidden), false);
      await still.click('.rp-tab:nth-child(3)'); assert.equal(await shown(), slugs[2], 'and the tabs still choose');
      // at 390 the nine tabs overflow: a vertical wheel over the strip still scrolls the page
      const box = await still.locator('.rp-tabs').boundingBox(); await still.mouse.move(box.x + 100, box.y + 12);
      const y0 = await still.evaluate(() => scrollY); await still.mouse.wheel(0, 150); await still.waitForTimeout(300);
      assert.ok((await still.evaluate(() => scrollY)) > y0, 'vertical scrolling stays the page’s');
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
