// 🤖 "How uncompromising are you?": turns the page's numbered list into one step per screen. Without this script
// the page is the list, complete. With it: an intro, the stack picker, twelve statements and a result, each with an
// address (#stack, #1 to #12, #result) so Back and Forward walk the steps; answers and the pile kept in
// sessionStorage and sent nowhere; keys (1, 2, arrows, Page Up and Down); focus on each step's heading; reactions in a
// status region. The character and the pile move only when motion is allowed. Spec: website branch story-proposal-20261117,
// docs/superpowers/specs/2026-11-20-uncompromising-quiz.md.
import { KEYS, STEPS, empty, clean, pile, toggleThing, startFresh, answer, verdict, stepOf, keyOf, next, prev, fill } from './state.mjs';
import { MOODS, livePaths } from './character.mjs';
import { createPile } from './pile.mjs';

const form = document.getElementById('qz');
const D = JSON.parse(document.getElementById('qz-data').textContent), T = D.text;
const STORE = 'carlos-quiz';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const still = () => reduce.matches;
const $ = (sel, root = form) => root.querySelector(sel), $$ = (sel, root = form) => [...root.querySelectorAll(sel)];

let state = load();
function load() { try { return clean(JSON.parse(sessionStorage.getItem(STORE))); } catch { return empty(); } }
function save() { try { sessionStorage.setItem(STORE, JSON.stringify(state)); } catch { /* private mode: this visit only */ } }

// ---- from list to steps -----------------------------------------------------------------------------------------
form.classList.add('q-on');
for (const el of $$('.q-js[hidden]')) if (!el.matches('.q-next')) el.hidden = false;
for (const el of $$('.q-st .q-say')) el.textContent = '';
$('.q-end-slot').replaceWith($('.q-end'));
form.addEventListener('submit', e => e.preventDefault());
const bar = $('.q-bar'), stage = $('.q-stage'), ul = $('.q-pile');
const steps = Object.fromEntries($$('.q-step').map(el => [el.dataset.step, el]));
const pileView = createPile(ul, { names: D.things, still });

// ---- the character (src/uncompromising/character.mjs: provisional, swapped there) ---------------------------------
const cellSvg = $('.q-cell-svg'), cellParts = {
  body: $('.q-cell-body', cellSvg), wall: $('.q-wall', cellSvg), ring1: $('.q-ring1', cellSvg), ring2: $('.q-ring2', cellSvg),
  glow: $$('.q-glow', cellSvg), core: $('.q-core', cellSvg), one: $('.q-one-in', cellSvg),
};
let mood = { ...MOODS.rest }, moodName = 'rest', tween = 0;
function draw(m) {
  const p = livePaths(m);
  for (const k of ['body', 'wall', 'ring1', 'ring2']) cellParts[k].setAttribute('d', p[k]);
  cellParts.glow.forEach((el, i) => el.setAttribute('d', p.glow[i]));
  for (const [k, v] of Object.entries(p.core)) cellParts.core.setAttribute(k, v);
  cellParts.one.setAttribute('transform', `translate(0 ${p.centre.toFixed(1)})`);
}
// Change the character's shape over about 400 ms (eased out, once), or at once under reduced motion.
function setMood(name, ms = 400) {
  const to = MOODS[name] ?? MOODS.rest, from = { ...mood };
  stage.dataset.mood = name === 'swell' ? 'wake' : name; moodName = name;
  cancelAnimationFrame(tween);
  if (still() || !ms) { mood = { ...to }; draw(mood); return Promise.resolve(); }
  return new Promise(done => {
    const t0 = performance.now();
    const step = now => {
      const q = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - q, 3);
      mood = Object.fromEntries(Object.keys(to).map(k => [k, from[k] + (to[k] - from[k]) * e]));
      draw(mood);
      if (q < 1) tween = requestAnimationFrame(step); else done();
    };
    tween = requestAnimationFrame(step);
  });
}

// ---- rendering a step -------------------------------------------------------------------------------------------
let now = null;
const answered = key => state.answers[key];
const plural = (n, one, many) => (n === 1 ? T[one] : fill(T[many], { n }));
function showPile(how = 'none') {
  const left = pile(state);
  pileView.show(left, how);
  ul.setAttribute('aria-label', plural(left.length, 'quiz.pile.aria.one', 'quiz.pile.aria'));
  const label = $('.q-pile-label');
  label.textContent = now === 'stack' ? (left.length ? plural(left.length, 'quiz.stack.count.one', 'quiz.stack.count') : '') : (state.fresh ? '' : fill(T['quiz.pile.label'], { n: left.length }));
  stage.classList.toggle('is-empty', !left.length);
}
// The current step's two pictures, and the next step's, are fetched; the rest wait.
function fetchPictures(step) {
  for (const s of [step, next(step)]) {
    const el = steps[s]; if (!el?.matches('.q-st')) continue;
    for (const img of $$('img[data-src]', el)) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
    const fact = $('.q-img-fact', el); if (fact) fact.loading = 'eager';
  }
}
function picture(el, key, value) {
  const which = value === 'no' ? '.q-img-fact' : value === 'yes' && $('.q-img-yes', el) ? '.q-img-yes' : '.q-img-joke';
  for (const img of $$('.q-img', el)) { const on = img.matches(which); img.classList.toggle('is-on', on); img.setAttribute('aria-hidden', String(!on)); }
}
function reaction(el, key, value) {
  const say = $('.q-say', el), gone = $('.q-gone', el), nextBtn = $('.q-next', el);
  for (const b of $$('.q-a', el)) b.setAttribute('aria-pressed', String(b.dataset.a === value));
  el.classList.toggle('is-answered', !!value);
  say.textContent = value ? D.s[key][value] : '';
  const pulled = value === 'no' && state.pulled[key];
  gone.hidden = !pulled;
  gone.innerHTML = '';
  if (pulled) {
    const [before, after] = T['quiz.pile.gone'].split('{thing}');
    const s = document.createElement('s'); s.textContent = D.things[pulled];
    gone.append(document.createTextNode(before), s, document.createTextNode(fill(after, { n: pile(state).length })));
  }
  nextBtn.hidden = !value;
}
function bars(step) {
  const n = Number(step), ticks = $$('.q-ticks i', bar), text = $('.q-prog-text', bar);
  ticks.forEach((i, k) => { i.className = step === 'result' || (n && k < n - 1) ? 'on' : n && k === n - 1 ? 'now' : ''; });
  $('.q-ticks', bar).hidden = step === 'stack';
  text.textContent = step === 'stack' ? T['quiz.bar.stack'] : step === 'result' ? T['quiz.bar.result'] : fill(T['quiz.bar.progress'], { n });
}
function render(step, { focus = false, from = null } = {}) {
  now = step;
  const kind = step === 'intro' ? 'intro' : step === 'stack' ? 'stack' : step === 'result' ? 'result' : 'st';
  form.dataset.step = step; form.dataset.kind = kind;
  for (const [s, el] of Object.entries(steps)) el.classList.toggle('is-now', s === step);
  bars(step);
  stage.classList.toggle('is-fresh', state.fresh);
  stage.classList.remove('is-merged', 'is-ending');
  if (kind === 'stack') for (const box of $$('input[name="stack"]')) box.checked = state.stack.includes(box.value);
  if (kind === 'st') {
    const key = keyOf(step), el = steps[step];
    reaction(el, key, answered(key)); picture(el, key, answered(key));
    fetchPictures(step);
  }
  if (kind !== 'intro') { pileView.preload(); }
  showPile();
  if (kind === 'result') result(from === '12' || from === 12);
  else setMood(kind === 'st' && answered(keyOf(step)) ? (answered(keyOf(step)) === 'no' ? 'wake' : 'sad') : 'rest', from ? 400 : 0);
  if (focus) { scrollTo(0, 0); $(step === 'intro' ? '.q-title' : '.q-h', steps[step])?.focus({ preventScroll: true }); }
}

// ---- moving between steps ---------------------------------------------------------------------------------------
function go(step) {
  if (step === 'intro') { history.pushState(null, '', location.pathname + location.search); render('intro', { focus: true, from: now }); }
  else location.hash = step;
}
addEventListener('hashchange', () => render(stepOf(location.hash), { focus: true, from: now }));
$('.q-start').addEventListener('click', () => go('stack'));
$('.q-back', bar).addEventListener('click', () => go(prev(now)));
for (const b of $$('.q-next')) b.addEventListener('click', () => go(next(now)));

// The picker: each tick drops a brick, each untick lifts it out.
for (const box of $$('input[name="stack"]')) box.addEventListener('change', () => {
  state = toggleThing(state, box.value, box.checked); save();
  showPile(box.checked ? 'drop' : 'leave');
});
$('.q-done').addEventListener('click', () => { if (!state.stack.length) state = startFresh(state); save(); go('1'); });
$('.q-fresh').addEventListener('click', () => { state = startFresh(state); save(); go('1'); });

// An answer: the character first, then the picture, then the brick. One thing moves at a time; each is under half a second.
let pending = [];
function choose(value) {
  const key = keyOf(now), el = steps[now];
  if (!key || answered(key) === value) return;
  pending.forEach(clearTimeout); pending = [];
  state = answer(state, key, value); save();
  reaction(el, key, value);
  setMood(value === 'no' ? 'wake' : 'sad');
  const gap = still() ? 0 : 350;
  pending.push(setTimeout(() => picture(el, key, value), gap));
  pending.push(setTimeout(() => showPile(value === 'no' ? 'leave' : 'drop'), gap * 2));
  $('.q-next', el).focus();
}
for (const b of $$('.q-a')) b.addEventListener('click', () => choose(b.dataset.a));

// ---- the result ---------------------------------------------------------------------------------------------------
let ending = null;
function result(animate) {
  const v = verdict(state), el = steps.result;
  for (const s of $$('[data-v]', el)) s.hidden = s.dataset.v !== v;
  $('.q-count', el).textContent = state.fresh || !state.stack.length ? T['quiz.result.fresh'] : fill(T['quiz.result.count'], { before: state.stack.length });
  $('.q-share-status', el).textContent = '';
  // What is left of the pile drops into one block; the block slides across the floor to the character; it takes it
  // in, swells and settles. About two seconds, once; any key or tap skips it. Under reduced motion, the last still.
  const block = $('.q-block', stage), finish = () => {
    if (!ending) return;
    ending.timers.forEach(clearTimeout); ending = null;
    removeEventListener('keydown', skip, true); removeEventListener('pointerdown', skip, true);
    block.className = 'q-block'; block.style.transform = '';
    stage.classList.remove('is-ending'); stage.classList.add('is-merged');
    setMood('wake', 0);
  };
  const skip = e => { if (e.type === 'keydown' && ['Tab', 'Shift'].includes(e.key)) return; finish(); };
  if (ending) finish();
  if (!animate || still() || !pile(state).length) { ending = { timers: [] }; finish(); return; }
  ending = { timers: [] };
  addEventListener('keydown', skip, true); addEventListener('pointerdown', skip, true);
  stage.classList.add('is-ending');
  const at = pileView.gather(), s = stage.getBoundingClientRect(), c = $('.q-cell', stage).getBoundingClientRect();
  const later = (ms, f) => ending.timers.push(setTimeout(f, ms));
  later(480, () => {
    block.style.transform = `translate(${at.x - s.left}px, ${at.y - s.top}px)`; block.classList.add('is-on');
    later(60, () => { block.classList.add('is-moving'); block.style.transform = `translate(${c.left + c.width / 2 - s.left}px, ${c.bottom - s.top - 30}px)`; });
  });
  later(1150, () => { block.classList.add('is-in'); setMood('swell', 380).then(() => { if (ending) setMood('wake', 420).then(finish); }); });
}
$('.q-again').addEventListener('click', () => {
  state = empty(); save();
  for (const box of $$('input[name="stack"]')) box.checked = false;
  go('intro');
});
$('.q-share').addEventListener('click', async () => {
  const v = verdict(state), status = $('.q-share-status');
  const url = new URL(`/uncompromising/${v}/`, location.href).href;
  const text = T[v === 'all' ? 'quiz.result.share.text' : `quiz.result.share.text.${v}`];
  status.textContent = '';
  if (navigator.share) {
    try { await navigator.share({ title: T['quiz.meta.title'], text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(`${text} ${url}`); status.textContent = T['quiz.result.share.copied']; } catch { status.textContent = url; }
});

// ---- keys ---------------------------------------------------------------------------------------------------------
addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || ending) return;
  const t = e.target, typing = t.matches?.('input:not([type="checkbox"]), textarea, select, [contenteditable]');
  if (typing) return;
  const onControl = t.matches?.('button, a, input, summary');
  const key = keyOf(now), stepKind = form.dataset.kind;
  const nav = to => { e.preventDefault(); go(to); };
  if (stepKind === 'st' && !e.shiftKey && (e.key === '1' || e.key === '2')) { e.preventDefault(); choose(e.key === '1' ? 'yes' : 'no'); return; }
  if (stepKind === 'st' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && t.matches?.('.q-a')) {
    e.preventDefault(); const [a, b] = $$('.q-a', steps[now]); (t === a ? b : a).focus(); return;
  }
  if (e.shiftKey) return;
  if ((e.key === 'ArrowUp' || e.key === 'PageUp') && now !== 'intro') return nav(prev(now));
  if (e.key === 'ArrowDown' || e.key === 'PageDown') {
    if (now === 'intro') return nav('stack');
    if (stepKind === 'st' && answered(key)) return nav(next(now));
  }
  if (now === 'intro' && e.key === 'Enter' && !onControl) return nav('stack');
});
reduce.addEventListener('change', () => { if (still()) { pileView.settle(); draw(mood = { ...MOODS[moodName] ?? MOODS.rest }); } });

render(stepOf(location.hash));
