// 🤖 The story homepage, stage 1 (src/_includes/home-story.njk, hack/story-svg.mjs, src/home/story.{css,js}, sun.css).
// The built page carries every story string from src/_data/story-copy.json, is complete as a still (no script, reduced
// motion), and draws the character by its rules. The browser half needs the same three variables as
// test/home-themes.test.mjs (HOME_THEMES_PLAYWRIGHT, HOME_THEMES_CHROME; axe is not needed here) and is skipped without them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, mkdir, stat } from 'node:fs/promises';
import { join, resolve, extname, normalize } from 'node:path';
import { tmpdir } from 'node:os';
import { buildStart, storyContext, storyAttributes, storyGroups } from '../hack/build-start.mjs';
import { sun, cloud, INSIDE } from '../hack/story-svg.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
const read = p => readFile(p, 'utf8');
const story = JSON.parse(await read('src/_data/story-copy.json'));
const await_css = { sun: await read('src/home/sun.css'), story: await read('src/home/story.css') };
const env = { CARLOS_START_DEMO: '1', CARLOS_START_SITE_ORIGIN: 'https://carlosframework.com', CARLOS_START_CONSOLE_ORIGIN: 'https://console.carloku.com', CARLOS_START_ACCOUNT_URL: 'https://console.carloku.com/' };
const base = process.env.STARTER_SCRATCH || tmpdir(); assert.ok(!/^\/tmp(?:\/|$)/.test(resolve(base)), 'use disk scratch');
async function built() {
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'home-story-'));
  try { await buildStart(dir, loadStartConfig(env)); return await read(join(dir, 'index.html')); } finally { await rm(dir, { recursive: true, force: true }); }
}
const home = await built();
const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const plain = html => html.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]*>/g, '').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');
const hero = home.match(/<section class="c-hero hv story-hero"[\s\S]*?<\/div><\/section>/)[0];

test('the copy file: story ids only, no straight quotes or em dashes, every string on the page', () => {
  const ids = Object.keys(story).filter(k => k !== '//');
  assert.ok(ids.length > 40);
  for (const id of ids) {
    assert.match(id, /^story\.[a-z0-9.-]+$/, id);
    assert.doesNotMatch(story[id], /['"]|—/, `${id}: curly quotes, no em dashes`);
    // shown as text, or carried as the label, the status line or the button text the page uses
    assert.ok(home.includes(esc(story[id])) || plain(home).includes(story[id]), `${id} is on the page`);
  }
  // nothing on the page reads a story id that is not in the file
  assert.deepEqual(storyAttributes.map(a => `story.attr.${a}`).filter(id => !ids.includes(id)), []);
});

test('the hero: one sentence, the word, the eleven attributes as a real list straight after it, then the paste line', () => {
  const h1 = hero.match(/<h1 id="story-title">([\s\S]*?)<\/h1>/)[1];
  assert.equal(plain(h1), story['story.hero.heading']);
  assert.ok(h1.includes(`<span class="unc">${story['story.hero.word']}</span>`), 'the fizzing word is plain text until story.js makes it a button');
  // the list is the next element after the headline, always in the page, in Paul's order
  const after = hero.slice(hero.indexOf('</h1>') + 5);
  assert.match(after, /^\s*<ul class="attrs" id="story-attrs" role="list">/);
  const words = [...hero.match(/<ul class="attrs"[\s\S]*?<\/ul>/)[0].matchAll(/<li style="([^"]*)">([^<]+)<\/li>/g)];
  assert.deepEqual(words.map(m => m[2]), storyAttributes.map(a => story[`story.attr.${a}`]));
  assert.deepEqual(storyAttributes, ['secure', 'private', 'exciting', 'accessible', 'lower-cost', 'globally-distributed', 'deployable', 'decentralisable', 'resilient', 'lightweight', 'open']);
  words.forEach((m, i) => assert.match(m[1], new RegExp(`^--x:\\d+;--y:\\d+;--s:\\d+px;--mx:\\d+;--my:\\d+;--i:${i}$`)));
  // then "with CARLOS", the paste box (the approved one, with its Copy), the line under it and the hosts note
  const order = ['<h1', 'class="attrs"', 'class="with"', 'id="home-prompt"', 'class="story-under"', 'class="hv-cloud"'].map(s => hero.indexOf(s));
  assert.ok(order.every((p, i) => p > 0 && (!i || p > order[i - 1])), order.join());
  assert.ok(hero.includes(`<p class="with">${story['story.hero.with']}</p>`));
  // the sun is decoration: the words say what it is
  assert.match(hero, /<div class="sky" aria-hidden="true">/);
  assert.equal((hero.match(/<h1/g) || []).length, 1);
  assert.equal((home.match(/<h1/g) || []).length, 1, 'one headline on the page');
});

test('a still by default: nothing is live, open, stepped or hidden until the script runs', () => {
  const story$ = home.slice(home.indexOf('<section class="c-hero hv story-hero"'), home.indexOf('<div class="rw">'));
  // (a sun's own "is-live" only lets it breathe, which its stylesheet allows only with motion)
  assert.deepEqual([...story$.matchAll(/<section class="([^"]+)"/g)].map(m => m[1]), ['c-hero hv story-hero', 'story-u', 'ch ch-1', 'ch ch-2']);
  assert.doesNotMatch(story$, /\bis-(open|shown|retry|still)\b/);
  assert.doesNotMatch(story$.replace(/<div class="ch-step" data-step="\d">/g, ''), /data-step=/);
  // the actions need the script, so they wait for it; so does the bar; the words and the pictures never wait
  assert.equal((story$.match(/<button type="button" class="ch-act" data-act="(poke|try)" aria-describedby="ch[12]-status" hidden>/g) || []).length, 2);
  assert.match(story$, /<div class="story-bar" hidden>/);
  assert.doesNotMatch(hero.match(/<ul class="attrs"[^>]*>/)[0], /hidden|aria-hidden/);
});

test('the sections: what uncompromising means, then two chapters told in steps, then the replay, then the rework', () => {
  const ids = [...home.matchAll(/<section class="([^"]+)" id="([^"]+)" aria-labelledby="([^"]+)"/g)].map(m => [m[2], m[3]]);
  assert.deepEqual(ids.slice(0, 3), [['uncompromising', 'u-title'], ['everything-inside', 'ch1-title'], ['one-each', 'ch2-title']]);
  const u = home.match(/<section class="story-u"[\s\S]*?<\/div><\/section>/)[0];
  assert.deepEqual([...u.matchAll(/<p(?: class="[^"]+")?>([^<]+)<\/p>/g)].map(m => m[1]), ['p1', 'p2', 'p3', 'p4'].map(k => esc(story[`story.u.${k}`])));
  // the four groups hold the eleven words, each once
  assert.deepEqual(storyGroups.flatMap(g => g.words).sort(), [...storyAttributes].sort());
  for (const g of storyGroups) assert.ok(u.includes(`<span class="u-for">${esc(story[`story.u.group.${g.id}`])}</span><ul class="u-words" role="list">${g.words.map(w => `<li>${esc(story[`story.attr.${w}`])}</li>`).join('')}</ul>`), g.id);
  assert.ok(u.includes(`<div class="u-draw" role="img" aria-label="${esc(story['story.u.figure'])}">`));
  for (const [n, steps] of [[1, 3], [2, 3]]) {
    const ch = home.match(new RegExp(`<section class="ch ch-${n}"[\\s\\S]*?</div></section>`))[0];
    assert.deepEqual([...ch.matchAll(/<div class="ch-step" data-step="(\d)">/g)].map(m => +m[1]), Array.from({ length: steps }, (_, i) => i + 1));
    assert.ok(ch.includes(`<div class="ch-pic" role="img" aria-label="${esc(story[`story.c${n}.figure`])}">`));
    assert.match(ch, /<svg class="ch-svg c\d-svg" viewBox="0 0 700 620" aria-hidden="true" focusable="false">/);
    // the result of each action is said in words, in a polite status
    assert.match(ch, new RegExp(`<p class="ch-status" id="ch${n}-status" role="status" aria-live="polite" data-said="${esc(story[n === 1 ? 'story.c1.poked' : 'story.c2.stopped']).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"></p>`));
  }
  assert.ok(home.indexOf('id="one-each"') < home.indexOf('class="story-replay"') && home.indexOf('class="story-replay"') < home.indexOf('<section class="rw-apps"'));
  assert.match(home, /<p class="ch-eye">secure<span aria-hidden="true"> · <\/span>private<\/p>/);
});

test('the character: four circles on one centre, in the spec’s proportions, and only CSS states', () => {
  const g = sun(0, 0, 100, { state: 'rest' });
  assert.deepEqual([...g.matchAll(/<circle (?:class="([^"]+)" )?r="([\d.]+)"/g)].map(m => [m[1] || 'glow', +m[2]]),
    [['glow', 175], ['glow', 150], ['glow', 128], ['glow', 108], ['sun-pulse', 100], ['sun-ring', 100], ['sun-body', 60], ['sun-core', 23]]);
  assert.doesNotMatch(g, /<path|<ellipse|<text|gradient|filter|cx=|cy=/, 'circles only, all centred: nothing that reads as a face');
  // no level pair: the one place it divides is on a slant
  const each = home.match(/<svg class="ch-svg c2-svg"[\s\S]*?<\/svg>/)[0];
  assert.match(each, /<g class="sun c2-divide" data-state="rest" transform="translate\(350 150\) rotate\(-24\)">/);
  // chapter 1: thirteen parts in the pile; four go in, labelled from the copy
  const inside = home.match(/<svg class="ch-svg c1-svg"[\s\S]*?<\/svg>/)[0];
  assert.equal((inside.match(/class="slab-front"/g) || []).length, 13);
  assert.equal((inside.match(/<g class="c1-part"/g) || []).length, INSIDE.length);
  for (const k of ['interface', 'web', 'jobs', 'database']) assert.ok(inside.includes(`>${esc(story[`story.c1.part.${k}`])}</text>`), k);
  // the hero cloud places every attribute, once, inside the sky
  assert.deepEqual(Object.keys(cloud).sort(), [...storyAttributes].sort());
  for (const [k, [x, y, s, mx, my]] of Object.entries(cloud)) assert.ok([x, y, mx, my].every(v => v >= 0 && v <= 100) && s >= 18 && s <= 26, k);
  // every move is a transform or an opacity: no keyframes animate anything else
  for (const css of Object.values(await_css)) for (const m of css.matchAll(/@keyframes ([\w-]+) \{((?:[^{}]*\{[^{}]*\})+)\s*\}/g))
    assert.deepEqual([...new Set([...m[2].matchAll(/([a-z-]+)\s*:/g)].map(p => p[1]))].filter(p => !['transform', 'opacity'].includes(p)), [], m[1]);
});

test('reduced motion: every animation and every unconditional transition sits behind prefers-reduced-motion', () => {
  for (const [name, css] of Object.entries(await_css)) {
    // remove the no-preference blocks (balanced braces), then nothing may animate, and no transition may apply to a
    // state that exists without the script's "is-live" (which the script adds only when motion is allowed)
    let rest = '', i = 0;
    for (const m of css.matchAll(/@media \(prefers-reduced-motion: no-preference\) \{/g)) {
      rest += css.slice(i, m.index);
      let depth = 1, j = m.index + m[0].length;
      for (; depth; j++) depth += css[j] === '{' ? 1 : css[j] === '}' ? -1 : 0;
      i = j;
    }
    rest += css.slice(i);
    assert.doesNotMatch(rest, /animation\s*:/, `${name}: an animation outside no-preference`);
    for (const rule of rest.matchAll(/([^{}]+)\{([^{}]*transition\s*:[^{}]*)\}/g)) assert.match(rule[1], /is-live|is-retry/, `${name}: ${rule[1].trim()} transitions without motion allowed`);
  }
});

test('storyContext refuses copy that would break the page', () => {
  assert.throws(() => storyContext({ ...story, 'story.hero.heading': 'Build better apps' }), /no longer contains "uncompromising"/);
  const { 'story.attr.open': _, ...missing } = story;
  assert.throws(() => storyContext(missing), /story copy story\.attr\.open is missing/);
  assert.throws(() => storyContext({ ...story, 'home.x': 'y' }), /outside story\.\*: home\.x/);
  assert.doesNotThrow(() => storyContext(story));
});

// ---------- in a browser ----------
const { HOME_THEMES_PLAYWRIGHT: pw, HOME_THEMES_CHROME: chrome } = process.env;
const skip = !(pw && chrome) && 'set HOME_THEMES_PLAYWRIGHT and HOME_THEMES_CHROME to run';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
test('in a browser: the hero opens by itself, by hover, by keyboard and by tap; the chapters step with the scroll; stills without motion or script', { skip, timeout: 240000 }, async () => {
  await mkdir(base, { recursive: true });
  const dir = await mkdtemp(join(base, 'home-story-site-'));
  execFileSync(process.execPath, ['node_modules/@11ty/eleventy/cmd.cjs', `--output=${dir}`, '--quiet'], { env: { ...process.env, ...env, CARLOS_START_CLAIM: 'off' }, stdio: 'pipe' });
  const server = createServer(async (req, res) => {
    let file = join(dir, normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, ''));
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const { chromium } = await import(pw);
  const browser = await chromium.launch({ executablePath: chrome });
  try {
    const errors = [];
    const open = async (opts = {}) => {
      const ctx = await browser.newContext({ viewport: { width: opts.width || 1280, height: 800 }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference', javaScriptEnabled: !opts.noscript, hasTouch: !!opts.touch, isMobile: !!opts.touch, permissions: ['clipboard-read', 'clipboard-write'] });
      const page = await ctx.newPage(); page.on('pageerror', e => errors.push(e.message));
      if (!opts.realtime) await page.clock.install();
      await page.goto(url, { waitUntil: 'load' });
      return { ctx, page };
    };
    const state = page => page.evaluate(() => ({ live: document.querySelector('.story-hero').classList.contains('is-live'), open: document.querySelector('.story-hero').classList.contains('is-open'),
      expanded: document.querySelector('button.unc')?.getAttribute('aria-expanded') ?? null, sun: document.querySelector('.sky .sun').dataset.state }));

    // Motion allowed: a button, once by itself a second after load, for four seconds.
    let { ctx, page } = await open();
    assert.deepEqual(await state(page), { live: true, open: false, expanded: 'false', sun: 'rest' });
    assert.equal(await page.locator('h1').evaluate(h => h.querySelector('button.unc .sr-only').textContent), story['story.hero.word']);
    assert.equal(await page.locator('h1 button.unc').getAttribute('aria-controls'), 'story-attrs');
    await page.clock.runFor(1100); assert.deepEqual(await state(page), { live: true, open: true, expanded: 'true', sun: 'swell' });
    await page.clock.runFor(4100); assert.equal((await state(page)).open, false, 'closes after four seconds');
    // hover holds it open; leaving closes it
    await page.locator('button.unc').hover(); await page.clock.runFor(6000); assert.equal((await state(page)).open, true, 'held by hover');
    await page.mouse.move(5, 790); assert.equal((await state(page)).open, false);
    // keyboard: focus opens, Escape closes; screen readers have the list throughout
    await page.keyboard.press('Tab'); for (let k = 0; k < 10 && !(await page.evaluate(() => document.activeElement?.matches('button.unc'))); k++) await page.keyboard.press('Tab');
    assert.equal((await state(page)).open, true, 'keyboard focus opens');
    await page.keyboard.press('Escape'); assert.equal((await state(page)).open, false, 'Escape closes');
    assert.equal(await page.locator('#story-attrs li').count(), 11);
    await ctx.close();
    // the chapters: the step at the middle of the screen sets the picture (real time: the observer reports on real frames)
    ({ ctx, page } = await open({ realtime: true }));
    for (const [n, s] of [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [2, 3]]) {
      await page.evaluate(([n, s]) => { const el = document.querySelector(`.ch-${n} .ch-step[data-step="${s}"]`), r = el.getBoundingClientRect(); scrollTo({ top: scrollY + r.top + r.height / 2 - innerHeight * 0.52, behavior: 'instant' }); }, [n, s]);
      await page.waitForTimeout(300);
      assert.equal(await page.locator(`.ch-${n}`).getAttribute('data-step'), String(s), `chapter ${n} step ${s}`);
    }
    // its actions: the poke squishes and springs back, and says so
    await page.locator('.ch-1 .ch-act').scrollIntoViewIfNeeded();
    await page.locator('.ch-1 .ch-act').click();
    assert.equal(await page.locator('#c1-sun').getAttribute('data-state'), 'squish');
    await page.waitForTimeout(600); assert.equal(await page.locator('#c1-sun').getAttribute('data-state'), 'rest');
    assert.equal(await page.locator('#ch1-status').textContent(), story['story.c1.poked']);
    await page.locator('.ch-2 .ch-act').click(); await page.waitForTimeout(150);
    assert.equal(await page.locator('#ch2-status').textContent(), story['story.c2.stopped']);
    // the bar shows once the hero's box is off screen, and copies the same line
    await page.waitForTimeout(500);
    assert.equal(await page.locator('.story-bar').isVisible(), true, 'the bar is offered');
    await page.locator('.story-bar-copy').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), await page.locator('#home-prompt').textContent());
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.waitForTimeout(800);
    assert.equal(await page.locator('.story-bar').isVisible(), false, 'not while the hero box is on screen');
    await ctx.close();

    // Touch: plays once by itself; a tap plays it again
    ({ ctx, page } = await open({ width: 390, touch: true }));
    await page.clock.runFor(6000); assert.equal((await state(page)).open, false);
    await page.locator('button.unc').tap(); assert.equal((await state(page)).open, true, 'a tap replays');
    await page.clock.runFor(4200); assert.equal((await state(page)).open, false);
    await ctx.close();

    // Reduced motion, and no script: the still page. A plain list under the headline, no button, the last step drawn.
    for (const opts of [{ reduce: true }, { noscript: true }]) {
      ({ ctx, page } = await open(opts));
      const r = await page.evaluate(() => ({ live: document.querySelectorAll('.story-hero.is-live, .ch.is-live').length, button: !!document.querySelector('button.unc'), steps: [...document.querySelectorAll('.ch')].map(c => c.dataset.step ?? null),
        list: getComputedStyle(document.querySelector('#story-attrs')).position, words: [...document.querySelectorAll('#story-attrs li')].filter(li => getComputedStyle(li).opacity === '1').length,
        dots: getComputedStyle(document.querySelector('.c1-dot')).opacity, request: getComputedStyle(document.querySelector('.c2-request')).strokeDashoffset }));
      assert.deepEqual(r, { live: 0, button: false, steps: [null, null], list: 'static', words: 11, dots: '1', request: '0px' }, JSON.stringify(opts));
      await ctx.close();
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close(); server.close(); await rm(dir, { recursive: true, force: true });
  }
});
