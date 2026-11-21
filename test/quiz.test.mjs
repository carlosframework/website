// 🤖 The quiz (/uncompromising/): its rules (which brick an answer pulls, the verdict, what storage may hold), and its
// build (the page as served works without script, every word comes from src/_data/quiz-copy.json, every fact picture
// has the character in it and no joke picture does, and each result page carries its own preview).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, readdir, mkdtemp, rm, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { KEYS, THINGS, empty, clean, pile, toggleThing, startFresh, answer, verdict, stepOf, next, prev, fill } from '../src/uncompromising/state.mjs';
import { buildQuiz, loadQuizCopy } from '../hack/build-quiz.mjs';
import { AMBER } from '../src/uncompromising/character.mjs';
import { loadStartConfig } from '../src/_data/start-config.mjs';
const read = p => readFile(p, 'utf8');
const config = loadStartConfig({ CARLOS_START_DEMO: '1', CARLOS_START_SITE_ORIGIN: 'https://site.example.com', CARLOS_START_CONSOLE_ORIGIN: 'https://console.example.com', CARLOS_START_ACCOUNT_URL: 'https://console.example.com/' });
const base = process.env.STARTER_SCRATCH || tmpdir();
assert.ok(!/^\/tmp(?:\/|$)/.test(resolve(base)), 'use disk scratch');
async function built(fn) { await mkdir(base, { recursive: true }); const dir = await mkdtemp(join(base, 'quiz-')); try { await buildQuiz(dir, config); await fn(join(dir, 'uncompromising')); } finally { await rm(dir, { recursive: true, force: true }); } }
const stack = (...things) => things.reduce((s, t) => toggleThing(s, t, true), empty());
const allNo = s => KEYS.reduce((x, k) => answer(x, k, 'no'), s);

test('"Absolutely not" pulls the brick its fact is about, else the top one; "Absolutely" puts it back', () => {
  let s = stack('rails', 'postgres', 'redis', 'cdn');
  s = answer(s, 'onedb', 'no');
  assert.equal(s.pulled.onedb, 'postgres');
  assert.deepEqual(pile(s), ['rails', 'redis', 'cdn']);
  s = answer(s, 'data', 'no');   // no brick named for this fact: the top one goes
  assert.equal(s.pulled.data, 'cdn');
  s = answer(s, 'onedb', 'yes');   // a changed answer puts the brick back
  assert.equal(s.pulled.onedb, undefined);
  assert.deepEqual(pile(s), ['rails', 'postgres', 'redis']);
  // Heroku goes with whichever of idle servers and lock-in comes first.
  let h = answer(answer(stack('heroku', 'rails'), 'idle', 'no'), 'lockin', 'no');
  assert.deepEqual([h.pulled.idle, h.pulled.lockin], ['heroku', 'rails']);
  // An empty pile, or starting fresh, pulls nothing.
  h = allNo(startFresh(empty()));
  assert.deepEqual(h.pulled, {}); assert.equal(h.fresh, true);
});

test('the verdict: all twelve, 7 to 11, 0 to 6 "Absolutely not"', () => {
  const n = count => KEYS.reduce((s, k, i) => answer(s, k, i < count ? 'no' : 'yes'), empty());
  assert.equal(verdict(n(12)), 'all');
  assert.equal(verdict(n(11)), 'most');
  assert.equal(verdict(n(7)), 'most');
  assert.equal(verdict(n(6)), 'few');
  assert.equal(verdict(empty()), 'few');
});

test('changing the stack keeps the answers and works their pulls out again; new bricks land on top', () => {
  let s = answer(stack('rails', 'redis'), 'pager', 'no');
  assert.equal(s.pulled.pager, 'redis');
  s = toggleThing(s, 'redis', false);
  assert.equal(s.answers.pager, 'no'); assert.equal(s.pulled.pager, 'rails');
  s = toggleThing(s, 'docker', true);
  assert.deepEqual(s.stack, ['rails', 'docker']);
});

test('storage is checked: junk, unknown things and impossible pulls are dropped', () => {
  assert.deepEqual(clean('nonsense'), empty());
  const s = clean({ stack: ['rails', 'rails', 'nope', 'postgres'], fresh: true, answers: { onedb: 'no', data: 'maybe' }, pulled: { onedb: 'postgres', data: 'rails', yaml: 'kubernetes' } });
  assert.deepEqual(s.stack, ['rails', 'postgres']);
  assert.equal(s.fresh, false);
  assert.deepEqual(s.answers, { onedb: 'no' });
  assert.deepEqual(s.pulled, { onedb: 'postgres' });
});

test('every step has an address, and Back and Next walk them in order', () => {
  assert.equal(stepOf(''), 'intro'); assert.equal(stepOf('#3'), '3'); assert.equal(stepOf('#13'), 'intro'); assert.equal(stepOf('#result'), 'result');
  assert.equal(next('intro'), 'stack'); assert.equal(next('stack'), '1'); assert.equal(next('12'), 'result'); assert.equal(next('result'), 'result');
  assert.equal(prev('1'), 'stack'); assert.equal(prev('intro'), 'intro');
  assert.equal(fill('{thing} out of your pile. {n} left.', { thing: 'Postgres', n: 8 }), 'Postgres out of your pile. 8 left.');
  assert.equal(THINGS.length, 16); assert.equal(KEYS.length, 12);
});

test('the page as served is the twelve statements with their facts and pictures, and nothing that needs script', () => built(async dir => {
  const html = await read(join(dir, 'index.html')), copy = await loadQuizCopy();
  const items = [...html.matchAll(/<li class="q-step q-st" data-step="(\d+)" data-key="(\w+)">([\s\S]*?)<\/li>/g)];
  assert.deepEqual(items.map(m => m[2]), KEYS);
  for (const [, n, key, li] of items) {
    assert.ok(li.includes(copy[`quiz.s.${key}.q`].replace(/’/g, '’')), `statement ${n}`);
    assert.match(li, new RegExp(`<p class="q-say">${copy[`quiz.s.${key}.no`].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</p>`), `fact ${n} shows without script`);
    assert.match(li, new RegExp(`<img class="q-img q-img-fact" src="/uncompromising/pictures/${key}-fact\\.svg" alt="[^"]+"`), `fact picture ${n}`);
    assert.match(li, /<span class="q-sr">Statement \d+ of 12 <\/span>/);
  }
  // Everything that only works with script is hidden until quiz.js unhides it: answers, picker, bar, result, pile.
  for (const tag of html.matchAll(/<[a-z]+\b[^>]*\bclass="[^"]*\bq-js\b[^"]*"[^>]*>/g)) assert.match(tag[0], /\shidden[\s>]/, tag[0]);
  assert.match(html, new RegExp(`<p class="q-lede q-nojs">${copy['quiz.noscript.body']}</p>`));
  assert.match(html, /Follow the directions on https:\/\/site\.example\.com<span class="pb-brk"><\/span>|Follow the directions on <span class="pb-url/);
  assert.ok(html.includes(copy['quiz.result.cta']), 'the paste line has the quiz\'s lead-in');
  assert.match(html, /<footer>.*theme-switch/s);
  assert.doesNotMatch(html, /\{\{|\{%|undefined/);
}));

test('every word comes from the copy file, by id', () => built(async dir => {
  const copy = await loadQuizCopy();
  const files = async d => (await Promise.all((await readdir(d, { withFileTypes: true })).map(e => e.isDirectory() ? files(join(d, e.name)) : read(join(d, e.name))))).flat();
  const out = (await files(dir)).join('\n');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // The homepage link is drafted with the rest of the deck but goes in last (the spec's slice 5).
  const later = ['quiz.hero.link'];
  for (const [id, text] of Object.entries(copy)) {
    if (later.includes(id)) continue;
    const has = t => out.includes(t) || out.includes(esc(t)) || out.includes(JSON.stringify(t).slice(1, -1));
    // A sentence with a number in it ("{n} of 12") is found by its words either side of the number.
    const found = /\{\w+\}/.test(text) ? (has(text) || text.split(/\{\w+\}/).filter(p => p.trim()).every(has)) : has(text);
    assert.ok(found, `${id} is not used`);
  }
}));

test('twenty-five pictures; every fact has the character in it and no joke does', () => built(async dir => {
  const names = (await readdir(join(dir, 'pictures'))).sort();
  assert.equal(names.length, 25);
  for (const name of names) {
    const svg = await read(join(dir, 'pictures', name));
    assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="0 0 400 280"/);
    assert.doesNotMatch(svg, /<image|<script|href="http/);
    assert.ok(svg.length < 12000, `${name} is ${svg.length} bytes`);
    assert.equal(svg.includes(AMBER), name.endsWith('-fact.svg'), `${name}: the character belongs in the facts only`);
    if (/idle-joke|pager-joke|backups-fact/.test(name)) {
      assert.match(svg, /class="slow /, `${name} has its one slow thing`);
      assert.match(svg, /@media \(prefers-reduced-motion:reduce\)\{\.slow\{animation:none!important\}\}/, `${name}: it stops under reduced motion`);
    }
  }
}));

test('each result page carries its own title, description and share image, and links back to the test', () => built(async dir => {
  const copy = await loadQuizCopy();
  for (const kind of ['all', 'most', 'few']) {
    const html = await read(join(dir, kind, 'index.html'));
    assert.ok(html.includes(`<title>${copy[`quiz.page.${kind}.title`]}</title>`));
    assert.match(html, new RegExp(`<meta property="og:image" content="https://site\\.example\\.com/uncompromising/share/${kind}\\.png">`));
    assert.ok(html.includes(`<h1 class="q-title">${copy[`quiz.result.${kind}`]}</h1>`));
    assert.match(html, /<a class="q-btn q-big" href="\/uncompromising\/">/);
    await readFile(`src/uncompromising/share/${kind}.png`);
  }
}));
