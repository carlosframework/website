// 🤖 Build-time only: the quiz page (/uncompromising/), its three result pages and its pictures, all from
// src/_data/quiz-copy.json (one string per copy-review id, the way src/_data/start-copy.json feeds the homepage).
// Runs from eleventy.config.js after buildStart and before the shared footer goes in.
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import nunjucks from 'nunjucks';
import { homePromptHTML, themeSwitchHTML } from './build-start.mjs';
import { pictures } from './quiz-pictures.mjs';
import { character, defs, liveCharacter } from '../src/uncompromising/character.mjs';
import { KEYS, THINGS, PULL } from '../src/uncompromising/state.mjs';
import { configError } from '../src/_data/start-config.mjs';
const read = p => readFile(p, 'utf8');
const templates = new nunjucks.Environment(null, { autoescape: true, throwOnUndefined: true });

export const loadQuizCopy = async () => JSON.parse(await read('src/_data/quiz-copy.json'));
export function quizText(copy) {
  return id => { if (typeof copy[id] !== 'string') throw configError(`quiz copy ${id} is missing`); return copy[id]; };
}
// The site's drawn wordmark, as in the header of every other page.
const wordmark = '<svg class="wordmark" viewBox="11 11 499 118" width="79" height="18" fill="none" stroke="currentColor" stroke-width="18" aria-hidden="true" focusable="false"><path d="M77,44 A20,20 0 0 0 57,24 H43 A20,20 0 0 0 23,44 V96 A20,20 0 0 0 43,116 H57 A20,20 0 0 0 77,96"/><path transform="translate(86,0)" d="M25,117 L45,23 H55 L75,117 M33,80 H67"/><path transform="translate(172,0)" d="M23,117 V23 H53 A23,23 0 0 1 53,69 H23 M50,69 L77,117"/><path transform="translate(258,0)" d="M23,23 V117 H77"/><path transform="translate(335,0)" d="M23,44 A20,20 0 0 1 43,24 H57 A20,20 0 0 1 77,44 V96 A20,20 0 0 1 57,116 H43 A20,20 0 0 1 23,96 Z"/><path transform="translate(421,0)" d="M77,39 A16,16 0 0 0 61,23 H39 A16,16 0 0 0 23,39 V54 A16,16 0 0 0 39,70 H61 A16,16 0 0 1 77,86 V101 A16,16 0 0 1 61,117 H39 A16,16 0 0 1 23,101 V98"/></svg>';
// The "one" brick that ends up inside the character at the end (centred on it).
const oneBrick = t => `<rect x="-23" y="-11" width="46" height="22" rx="1"/><text x="0" y="4.2" text-anchor="middle">${t('quiz.pic.result.one').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}</text>`;

export function quizContext(config, copy, startCopy) {
  const t = quizText(copy);
  const statements = KEYS.map((key, i) => ({
    key, n: i + 1,
    heading: t('quiz.step.heading').replace('{n}', i + 1),
    progress: t('quiz.bar.progress').replace('{n}', i + 1),
  }));
  const things = THINGS.map(slug => ({ slug, name: t(`quiz.stack.thing.${slug}`) }));
  // What quiz.js needs and cannot read from the markup: the reactions, the brick names and the sentences with numbers in them.
  const data = {
    s: Object.fromEntries(KEYS.map(k => [k, { yes: t(`quiz.s.${k}.yes`), no: t(`quiz.s.${k}.no`) }])),
    things: Object.fromEntries(things.map(x => [x.slug, x.name])), pull: PULL,
    text: Object.fromEntries(['quiz.bar.progress', 'quiz.bar.stack', 'quiz.bar.result', 'quiz.stack.count', 'quiz.stack.count.one', 'quiz.pile.label',
      'quiz.pile.aria', 'quiz.pile.aria.one', 'quiz.pile.gone', 'quiz.result.count', 'quiz.result.fresh', 'quiz.result.share.text',
      'quiz.result.share.text.most', 'quiz.result.share.text.few', 'quiz.result.share.copied', 'quiz.meta.title'].map(id => [id, t(id)])),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  // Links point at the configured site; the paste line is the homepage's, with the quiz's own lead-in.
  const origin = config.siteOrigin;
  const introCell = `<svg viewBox="0 0 200 200" focusable="false">${defs()}${character(100, 100, 62, { seed: 1 })}</svg>`;
  return { t, origin, statements, things, data: json, wordmark, introCell, liveCell: liveCharacter(oneBrick(t)),
    paste: homePromptHTML(config, startCopy, 'quiz-prompt', undefined, t('quiz.result.cta')), themeSwitch: themeSwitchHTML(startCopy) };
}

// The character on each result page, in the verdict's mood.
const resultCell = {
  all: () => character(100, 104, 70, { wake: 1, seed: 2, flat: 0.98 }),
  most: () => character(100, 104, 70, { seed: 2, flat: 0.98 }),
  few: () => character(100, 174 - 70 * 0.56 * 0.98, 70, { sad: 1, sx: 1.3, sy: 0.56, seed: 2, flat: 0.98 }),
};

export async function buildQuiz(outputDir, config) {
  const copy = await loadQuizCopy(), startCopy = JSON.parse(await read('src/_data/start-copy.json'));
  const ctx = quizContext(config, copy, startCopy);
  const dir = join(outputDir, 'uncompromising');
  const pics = join(dir, 'pictures');
  await rm(pics, { recursive: true, force: true }); await mkdir(pics, { recursive: true });
  for (const [name, svg] of Object.entries(pictures(ctx.t))) await writeFile(join(pics, `${name}.svg`), svg);
  await writeFile(join(dir, 'index.html'), templates.renderString(await read('src/_includes/quiz.njk'), ctx));
  const result = await read('src/_includes/quiz-result.njk');
  for (const kind of ['all', 'most', 'few']) {
    await mkdir(join(dir, kind), { recursive: true });
    const svg = `<svg viewBox="0 0 200 190" focusable="false">${defs()}<line x1="0" y1="174" x2="200" y2="174" stroke="currentColor" stroke-opacity=".3"/>${resultCell[kind]()}</svg>`;
    await writeFile(join(dir, kind, 'index.html'), templates.renderString(result, { ...ctx, kind, cell: svg }));
  }
}
