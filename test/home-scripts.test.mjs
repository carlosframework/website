// 🤖 The homepage's two scripts in a VM with a small fake DOM: motion preference changes,
// pause, a grab released before the physics arrives, parallel swipes, and the theme switch.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
const read = p => readFile(p, 'utf8');
const stacksJS = await read('src/home/stacks.js'), heroJS = await read('src/home/hero.js'), themeJS = await read('src/home/theme.js');
const matterJS = await read('src/home/matter-0.20.0.min.js');

class ClassList { constructor() { this.s = new Set(); } add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); } contains(c) { return this.s.has(c); } toggle(c, f = !this.s.has(c)) { f ? this.s.add(c) : this.s.delete(c); return f; } toString() { return [...this.s].join(' '); } }
class El {
  constructor(cls = '', rect = { left: 0, top: 0, width: 100, height: 40 }) {
    this.classList = new ClassList(); cls.split(' ').filter(Boolean).forEach(c => this.classList.add(c));
    this.dataset = {}; this.attrs = {}; this.hidden = false; this.rect = rect; this.l = {}; this.qs = {}; this.parent = null; this.textContent = '';
    const style = {}; this.style = Object.assign(style, { removeProperty: k => { delete style[k]; }, setProperty: (k, v) => { style[k] = v; } });
  }
  get className() { return this.classList.toString(); } set className(v) { this.classList = new ClassList(); v.split(' ').filter(Boolean).forEach(c => this.classList.add(c)); }
  addEventListener(t, f) { (this.l[t] ||= []).push(f); }
  fire(t, e = {}) { for (const f of this.l[t] || []) f(e); }
  querySelector(s) { return (this.qs[s] || [])[0] || null; }
  querySelectorAll(s) { return this.qs[s] || []; }
  getBoundingClientRect() { const r = this.rect; return { ...r, right: r.left + r.width, bottom: r.top + r.height, x: r.left, y: r.top }; }
  closest(s) { return s === 'li' && this.tag === 'li' ? this : this.parent; }
  contains() { return true; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k] ?? null; } removeAttribute(k) { delete this.attrs[k]; }
  replaceChildren() {} remove() {} appendChild(c) { (this.kids ||= []).push(c); return c; } setPointerCapture() {}
  get offsetWidth() { return 100; } get clientWidth() { return 600; } get offsetParent() { return {}; }
}
function media(matches) { const m = { matches, l: [], addEventListener: (t, f) => m.l.push(f), set(v) { m.matches = v; m.l.forEach(f => f({ matches: v })); } }; return m; }

// A stacks panel in tower mode: three bricks on a base, and the three CARLOS plates.
function stacksWorld({ reduce = false } = {}) {
  const panel = new El('ipanel wobble pyramid'), stage = new El('istage', { left: 0, top: 0, width: 600, height: 500 });
  panel.dataset.mode = 'tower';
  const li = (cls, x, y, w) => { const e = new El(cls, { left: x, top: y, width: w, height: 40 }); e.tag = 'li'; return e; };
  const tower = [li('', 60, 300, 120), li('', 55, 344, 130), li('', 50, 388, 140), li('base', 30, 432, 180)];
  const after = [li('', 400, 344, 80), li('', 390, 388, 100), li('', 380, 432, 120)];
  const uls = [new El(''), new El('')];
  const all = [...tower, ...after];
  Object.assign(stage.qs, { 'li, ul': [...all, ...uls], '.tower li': tower, '.stack.after li': after, '.stack ul': uls, li: all });
  const resetBtn = new El('ireset'), pauseBtn = new El('ipause'), seg = new El('seg'), strings = new El('strings');
  resetBtn.hidden = pauseBtn.hidden = seg.hidden = true; pauseBtn.dataset.pause = 'Pause'; pauseBtn.dataset.play = 'Play';
  Object.assign(panel.qs, { '.istage': [stage], '.ireset': [resetBtn], '.strings': [strings], '.seg': [seg], '.ipause': [pauseBtn], '[data-mode-set]': [] });
  const head = new El(''), mq = media(reduce), observers = [], frames = new Map(), idles = new Map(), cancelled = { idle: [], frame: [] };
  let n = 0;
  const g = {
    document: { querySelector: s => (s === '.ipanel' ? panel : null), head, createElement: () => new El(''), createElementNS: () => new El('') },
    matchMedia: () => mq, addEventListener() {}, performance: { now: () => Date.now() }, console, Math, setTimeout: () => 0, clearTimeout() {},
    IntersectionObserver: class { constructor(cb) { this.cb = cb; this.on = true; observers.push(this); } observe() {} disconnect() { this.on = false; } },
    requestAnimationFrame: f => { frames.set(++n, f); return n; }, cancelAnimationFrame: id => { frames.delete(id); cancelled.frame.push(id); },
    requestIdleCallback: f => { idles.set(++n, f); return n; }, cancelIdleCallback: id => { idles.delete(id); cancelled.idle.push(id); },
  };
  g.window = g;
  const ctx = createContext(g);
  runInContext(stacksJS, ctx);
  const see = () => observers.filter(o => o.on).forEach(o => o.cb([{ isIntersecting: true }], o));
  const idle = () => { const fs = [...idles.values()]; idles.clear(); fs.forEach(f => f()); };
  const script = () => head.kids?.[0];
  const arrive = () => { runInContext(matterJS, ctx); script().onload(); };
  return { g, ctx, panel, stage, tower, pauseBtn, mq, frames, idles, cancelled, see, idle, script, arrive, world: () => g.__i1.world };
}

test('stacks: still without motion, moving with it, and the pause control shown', () => {
  const w = stacksWorld();
  assert.ok(w.panel.classList.contains('moving'));
  assert.equal(w.pauseBtn.hidden, false);
  const r = stacksWorld({ reduce: true });
  assert.ok(!r.panel.classList.contains('moving') && r.panel.classList.contains('static'));
  assert.equal(r.pauseBtn.hidden, true);
  r.see(); r.idle();
  assert.equal(r.script(), undefined, 'no physics fetched under reduced motion');
});

test('stacks: reduced motion switched on later cancels the pending load, frames and the world', () => {
  // waiting in idle time
  let w = stacksWorld();
  w.see(); assert.equal(w.idles.size, 1);
  w.mq.set(true);
  assert.equal(w.idles.size, 0); assert.equal(w.cancelled.idle.length, 1);
  assert.ok(!w.panel.classList.contains('moving')); assert.equal(w.pauseBtn.hidden, true);
  // the script already on its way: it arrives to nothing
  w = stacksWorld();
  w.see(); w.idle(); assert.ok(w.script());
  w.mq.set(true); w.arrive();
  assert.equal(w.world(), null);
  // a running world: frames cancelled, pieces back at rest
  w = stacksWorld();
  w.see(); w.idle(); w.arrive();
  assert.ok(w.world()); assert.ok(w.frames.size > 0); assert.ok(w.stage.classList.contains('live'));
  w.mq.set(false); w.mq.set(true);
  assert.equal(w.world(), null); assert.equal(w.frames.size, 0);
  assert.ok(!w.stage.classList.contains('live')); assert.equal(w.tower[0].style.transform, undefined);
  // and back again: it preloads once more
  w.mq.set(false); assert.ok(w.panel.classList.contains('moving')); w.see(); assert.equal(w.idles.size, 1);
});

test('stacks: Pause freezes the CSS sway and the physics, Play resumes', () => {
  const w = stacksWorld();
  w.see(); w.idle(); w.arrive();
  assert.ok(w.frames.size > 0);
  w.pauseBtn.fire('click');
  assert.equal(w.pauseBtn.textContent, 'Play'); assert.equal(w.pauseBtn.hidden, false);
  assert.ok(!w.panel.classList.contains('moving')); assert.equal(w.frames.size, 0);
  assert.ok(w.world(), 'paused in place, not taken apart');
  w.stage.fire('pointerdown', { target: w.tower[0], pointerId: 1, clientX: 100, clientY: 310, preventDefault() {} });
  assert.equal(w.world().drag, null, 'the pointer is ignored while paused');
  w.pauseBtn.fire('click');
  assert.equal(w.pauseBtn.textContent, 'Pause'); assert.ok(w.panel.classList.contains('moving')); assert.ok(w.frames.size > 0);
});

test('stacks: a grab released before the physics arrives does not take hold', () => {
  const down = w => w.stage.fire('pointerdown', { target: w.tower[0], pointerId: 7, clientX: 100, clientY: 310, preventDefault() {} });
  // held through the wait: it takes hold (the harness is real enough to grab)
  let w = stacksWorld();
  down(w); assert.ok(w.script());
  w.arrive();
  assert.ok(w.world().drag, 'held grab takes hold');
  // let go before it arrived: no stale drag
  w = stacksWorld();
  down(w); assert.ok(w.tower[0].classList.contains('held'), 'the press shows at once, before the physics arrives');
  w.stage.fire('pointerup', { pointerId: 7 }); assert.ok(!w.tower[0].classList.contains('held'), 'and goes when let go');
  w.arrive();
  assert.ok(w.world()); assert.equal(w.world().drag, null);
  // cancelled the same way
  w = stacksWorld();
  down(w); w.stage.fire('pointercancel', { pointerId: 7 });
  w.arrive();
  assert.equal(w.world().drag, null);
});

test('stacks: parallel segments never cross', () => {
  const { g } = stacksWorld();
  const crosses = g.__i1.crosses;
  assert.equal(crosses({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 5 }, { x: 10, y: 5 }), null);
  assert.equal(crosses({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 2, y: 0 }, { x: 8, y: 0 }), null);
  const x = crosses({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }, { x: 10, y: 0 });
  assert.ok(Number.isFinite(x.t) && Number.isFinite(x.u));
  assert.equal(crosses({ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 5, y: 0 }, { x: 6, y: 0 }), null);
});

test('hero: the word rotates, Pause stills it, reduced motion stops it and puts "better" back', () => {
  const mq = media(false), word = new El('hv-rot-word'), rot = new El('hv-rot'), line = new El('hv-ask'), pause = { checked: false };
  rot.dataset.words = 'better remarkable faster decentralisable'; rot.qs['.hv-rot-word'] = [word]; rot.closest = () => line; word.textContent = 'better';
  const intervals = new Map(), timeouts = new Map(); let n = 0;
  const g = {
    document: { querySelectorAll: s => (s === '.hv-rot' ? [rot] : []), querySelector: s => (s === '.rp-pause input' ? pause : null), hidden: false },
    navigator: { languages: ['en-GB'] }, matchMedia: () => mq, requestAnimationFrame: () => 0,
    setInterval: f => { intervals.set(++n, f); return n; }, clearInterval: id => intervals.delete(id),
    setTimeout: f => { timeouts.set(++n, f); return n; }, clearTimeout: id => timeouts.delete(id),
  };
  runInContext(heroJS, createContext(g));
  const step = () => { [...intervals.values()].forEach(f => f()); const ts = [...timeouts.values()]; timeouts.clear(); ts.forEach(f => f()); };
  assert.equal(intervals.size, 1);
  step(); assert.equal(word.textContent, 'remarkable');
  pause.checked = true; step(); assert.equal(word.textContent, 'remarkable', 'Pause stills it'); pause.checked = false;
  step(); assert.equal(word.textContent, 'faster');
  [...intervals.values()][0](); assert.equal(timeouts.size, 1, 'a swap is pending');
  mq.set(true);
  assert.equal(intervals.size, 0); assert.equal(timeouts.size, 0);
  assert.equal(word.textContent, 'better'); assert.equal(rot.style.width, undefined);
  mq.set(false); assert.equal(intervals.size, 1);
  // a reader who starts with reduced motion gets no timer at all
  const m2 = media(true); const g2 = { ...g, matchMedia: () => m2 }; intervals.clear();
  runInContext(heroJS, createContext(g2)); assert.equal(intervals.size, 0);
});

test('theme: Auto follows the system, Light and Dark are remembered, the switch is wired', () => {
  const store = new Map(), root = new El(''), group = new El('theme-switch'), buttons = ['auto', 'light', 'dark'].map(k => { const b = new El(''); b.dataset.themeSet = k; return b; });
  group.hidden = true; group.qs['[data-theme-set]'] = buttons;
  const run = () => runInContext(themeJS, createContext({
    document: { documentElement: root, readyState: 'complete', querySelector: s => (s === '.theme-switch' ? group : null), addEventListener() {} },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) }, addEventListener() {},
  }));
  run();
  assert.equal(root.getAttribute('data-theme'), null); assert.equal(group.hidden, false);
  assert.deepEqual(buttons.map(b => b.getAttribute('aria-pressed')), ['true', 'false', 'false']);
  buttons[1].fire('click');
  assert.equal(root.getAttribute('data-theme'), 'light'); assert.equal(store.get('carlos-theme'), 'light');
  assert.deepEqual(buttons.map(b => b.getAttribute('aria-pressed')), ['false', 'true', 'false']);
  // remembered on the next page load, before anything is drawn
  root.removeAttribute('data-theme'); run();
  assert.equal(root.getAttribute('data-theme'), 'light');
  buttons[2].fire('click'); assert.equal(root.getAttribute('data-theme'), 'dark');
  buttons[0].fire('click'); assert.equal(root.getAttribute('data-theme'), null); assert.equal(store.has('carlos-theme'), false);
  // storage that throws (private mode) still switches this page
  const r2 = new El(''), g2 = new El(''); g2.qs['[data-theme-set]'] = buttons;
  runInContext(themeJS, createContext({ document: { documentElement: r2, readyState: 'complete', querySelector: () => g2, addEventListener() {} }, localStorage: { getItem() { throw Error('no'); }, setItem() { throw Error('no'); }, removeItem() { throw Error('no'); } }, addEventListener() {} }));
  buttons[2].fire('click'); assert.equal(r2.getAttribute('data-theme'), 'dark');
});

// The hero's drawn background (the Q1 meadow), with a fake WebGL2 context that remembers the uniforms each draw used.
const heroBgJS = await read('src/home/hero-bg.js');
function heroBgWorld({ reduce = false, webgl = true, gap = 40, view = [1280, 700] } = {}) {
  const mq = media(reduce), darkQ = media(false), root = new El(''), hero = new El('c-hero hv hv-b', { left: 0, top: 0, width: 1280, height: 700 }), canvas = new El('hero-bg'), pause = new El('');
  pause.checked = false; hero.qs['.hero-bg'] = [canvas];
  Object.defineProperty(hero, 'clientWidth', { get: () => 1280 }); Object.defineProperty(hero, 'clientHeight', { get: () => 700 });
  Object.defineProperty(canvas, 'clientWidth', { get: () => view[0] }); Object.defineProperty(canvas, 'clientHeight', { get: () => view[1] });   // the sticky canvas: one screen at most
  const uniforms = {}, blades = [];
  let clock = 0;
  const gl = new Proxy({}, { get: (_, k) => k === 'getUniformLocation' ? (_, name) => name
    : k.startsWith('uniform') ? (loc, ...v) => { uniforms[loc] = v.length > 1 ? v : v[0]; }
    : k === 'drawArraysInstanced' ? (mode, first, count, n) => blades.push(n)
    : k.startsWith('get') && k.endsWith('Parameter') ? () => true : typeof k === 'string' && /^[A-Z_0-9]+$/.test(k) ? 1 : () => ({}) });
  canvas.getContext = type => (webgl && type === 'webgl2' ? gl : null);
  const frames = new Map(), observers = [], mutations = []; let n = 0, now = 0;
  const g = {
    document: { querySelector: s => (s === '.c-hero' ? hero : s === '.rp-pause input' ? pause : null), documentElement: root, hidden: false, addEventListener() {} },
    matchMedia: q => (q.includes('reduced-motion') ? mq : darkQ), addEventListener() {}, devicePixelRatio: 3, innerHeight: 900, performance: { now: () => clock },
    requestAnimationFrame: f => { frames.set(++n, f); return n; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} },
    MutationObserver: class { constructor(cb) { mutations.push(cb); } observe() {} },
  };
  g.window = g;
  runInContext(heroBgJS, createContext(g));
  const state = () => g.__heroBg.state;
  const look = () => ({ T: uniforms.Q?.[0], Night: uniforms.Night });
  // run queued frames, each `gap` ms after the last (40: just above the 30 fps step); returns how many ran
  const run = (max = 20) => { let k = 0; while (frames.size && k < max) { const [id, f] = frames.entries().next().value; frames.delete(id); now += gap; clock = now; f(now); k++; } return k; };
  return { g, hero, canvas, pause, mq, darkQ, root, frames, observers, mutations, run, state, look, blades };
}
const drawn = w => w.state().frames;

test('hero background: draws at 30 fps at 0.4 of the screen, DPR capped at 1.5, day in light', () => {
  const w = heroBgWorld();
  assert.equal(w.run(10), 10);
  assert.ok(drawn(w) >= 9);
  assert.deepEqual([w.canvas.width, w.canvas.height], [Math.round(1280 * 1.5 * 0.4), Math.round(700 * 1.5 * 0.4)]);
  assert.equal(w.look().Night, 0); assert.equal(w.blades.at(-1), 9000);
  assert.ok(w.frames.size > 0, 'still running');
});

test('hero background: reduced motion draws one still frame and stops; switching it on later stops the loop', () => {
  let w = heroBgWorld({ reduce: true });
  w.run();
  assert.equal(drawn(w), 1); assert.equal(w.frames.size, 0);
  assert.equal(w.look().T, 37, 'the same still moment every time');
  w = heroBgWorld();
  w.run(5); const before = drawn(w);
  w.mq.set(true); w.run();
  assert.equal(w.frames.size, 0, 'no frames left queued');
  assert.equal(drawn(w), before + 1, 'one still frame, then nothing');
  assert.equal(w.look().T, 37);
  w.mq.set(false); w.run(5); assert.ok(w.frames.size > 0, 'moves again');
});

test('hero background: the replay Pause stops it, and Play resumes it', () => {
  const w = heroBgWorld();
  w.run(5);
  w.pause.checked = true; w.pause.fire('change'); w.run();
  assert.equal(w.frames.size, 0);
  const n = drawn(w); w.run(); assert.equal(drawn(w), n);
  w.pause.checked = false; w.pause.fire('change'); w.run(5);
  assert.ok(drawn(w) > n && w.frames.size > 0);
});

test('hero background: off screen or a hidden tab stops it; a theme change redraws day or night while still', () => {
  const w = heroBgWorld();
  w.run(3);
  w.observers[0].cb([{ isIntersecting: false }]); w.run();
  assert.equal(w.frames.size, 0);
  w.observers[0].cb([{ isIntersecting: true }]); w.run(3); assert.ok(w.frames.size > 0);
  w.g.document.hidden = true; w.run(); assert.equal(w.frames.size, 0);
  w.g.document.hidden = false;
  w.pause.checked = true; w.pause.fire('change'); w.run();
  const n = drawn(w);
  w.root.setAttribute('data-theme', 'dark'); w.mutations[0](); w.run();
  assert.equal(drawn(w), n + 1); assert.equal(w.look().Night, 1, 'night for dark'); assert.equal(w.frames.size, 0);
  w.root.removeAttribute('data-theme'); w.mutations[0](); w.run();
  assert.equal(w.look().Night, 0);
  w.darkQ.set(true); w.run(); assert.equal(w.look().Night, 1, 'Auto follows the system live');
});

test('hero background: a slow device gets half the blades, then a smaller picture, without waiting on the GPU', () => {
  const w = heroBgWorld({ gap: 60 });   // frames coming 60 ms apart
  w.run(40);   // the guard judges the last thirty frames
  assert.equal(w.state().blades, 4500);
  w.run(40);
  assert.ok(w.state().scale < 0.4);
  assert.doesNotMatch(heroBgJS, /readPixels|\.finish\(/, 'no GPU sync on the main thread');
  const fast = heroBgWorld({ gap: 34 }); fast.run(140);
  assert.equal(fast.state().blades, 9000); assert.equal(fast.state().scale, 0.4);
});

test('hero background: the scene is laid out for the canvas (one screen at most), not the whole hero', () => {
  const w = heroBgWorld({ view: [390, 664] });   // a phone: the hero is about two screens tall, the canvas one
  w.run(2);
  assert.deepEqual([w.canvas.width, w.canvas.height], [Math.round(390 * 1.5 * 0.4), Math.round(664 * 1.5 * 0.4)]);
});

test('hero background: without WebGL2 the hero keeps its CSS gradient', () => {
  const w = heroBgWorld({ webgl: false });
  assert.ok(w.hero.classList.contains('nogl')); assert.equal(w.frames.size, 0);
});

// "What you get": the figures count up once, in view, as a visual-only overlay.
const figuresJS = await read('src/home/figures.js');
function figuresWorld({ reduce = false, figures = [['12×', 1], ['20 ms', 750], ['80%', 0]] } = {}) {
  const three = new El('rw-three'), observers = [], frames = []; let now = 0;
  const els = figures.map(([text, from]) => { const el = new El('rw-fig'), final = new El('rw-fig-final'), run = new El('rw-fig-run');
    el.dataset.countFrom = String(from); final.textContent = text; el.qs['.rw-fig-final'] = [final]; el.qs['.rw-fig-run'] = [run]; el.closest = () => three; return { el, final, run }; });
  const g = { document: { querySelectorAll: s => (s === '.rw-fig[data-count-from]' ? els.map(e => e.el) : []) }, matchMedia: () => ({ matches: reduce }), Number, Math,
    requestAnimationFrame: f => frames.push(f), IntersectionObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} disconnect() { this.off = true; } } };
  g.window = g;
  runInContext(figuresJS, createContext(g));
  const step = ms => { now += ms; const fs = frames.splice(0); fs.forEach(f => f(now)); };
  return { els, observers, frames, step, see: () => observers[0].cb([{ isIntersecting: true }]) };
}
test('figures: hold their start until seen, count once to the final text, then hand back the real figure', () => {
  const w = figuresWorld();
  assert.deepEqual(w.els.map(e => e.run.textContent), ['1×', '750 ms', '0%']);
  assert.ok(w.els.every(e => e.el.classList.contains('is-counting')));
  w.see(); assert.ok(w.observers[0].off, 'counts once');
  const seen = [];
  w.step(16); for (let i = 0; i < 80 && w.frames.length; i++) { w.step(16); if (w.frames.length) seen.push(w.els.map(e => e.run.textContent)); }
  assert.equal(w.frames.length, 0, 'done after 1.2 s');
  const nums = seen.map(r => r.map(t => parseInt(t, 10)));
  assert.ok(nums.every((r, i) => !i || (r[0] >= nums[i - 1][0] && r[1] <= nums[i - 1][1] && r[2] >= nums[i - 1][2])), 'up, down from 750, up');
  assert.ok(nums.some(r => r[1] > 100 && r[1] < 700), 'the response time drops through the middle');
  assert.ok(w.els.every(e => !e.el.classList.contains('is-counting') && e.run.textContent === ''));
  assert.deepEqual(w.els.map(e => e.final.textContent), ['12×', '20 ms', '80%'], 'the real figures never change');
});
test('figures: reduced motion and figures that are not "number + unit" show the final text only', () => {
  const r = figuresWorld({ reduce: true });
  assert.ok(r.els.every(e => !e.el.classList.contains('is-counting') && e.run.textContent === '')); assert.equal(r.observers.length, 0);
  const o = figuresWorld({ figures: [['70%–80%', 0]] });
  assert.ok(!o.els[0].el.classList.contains('is-counting')); assert.equal(o.observers.length, 0);
});

test('hero: holds its first height plus a line for the Copy note, re-measured only when the width changes', () => {
  const hero = new El('c-hero', { left: 0, top: 0, width: 390, height: 1144 }); let cw = 390;
  Object.defineProperty(hero, 'clientWidth', { get: () => cw });
  const listeners = {}, doc = { readyState: 'interactive', querySelector: s => (s === '.c-hero' ? hero : null), querySelectorAll: () => [], documentElement: {} };
  const g = { document: doc, getComputedStyle: () => ({ fontSize: '16px' }),
    addEventListener: (t, f) => { listeners[t] = f; }, navigator: { languages: ['en-GB'] }, matchMedia: () => media(false), setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {} };
  // Before the page has loaded, stylesheets may still be missing (WebKit), so the hero is far too tall: nothing is locked.
  hero.rect = { ...hero.rect, height: 3405 };
  runInContext(heroJS, createContext(g));
  assert.equal(hero.style.height, undefined, 'not measured before load');
  listeners.resize(); assert.equal(hero.style.height, undefined, 'nor on a resize before load');
  hero.rect = { ...hero.rect, height: 1144 }; doc.readyState = 'complete'; listeners.load();
  assert.equal(hero.style.height, `${Math.ceil(1144 + 16 * 2.1)}px`);
  hero.rect = { ...hero.rect, height: 1300 }; listeners.resize();   // a phone's address bar: same width
  assert.equal(hero.style.height, `${Math.ceil(1144 + 16 * 2.1)}px`, 'unchanged');
  cw = 400; hero.rect = { ...hero.rect, height: 1100 }; listeners.resize();
  assert.equal(hero.style.height, `${Math.ceil(1100 + 16 * 2.1)}px`, 'a new width is measured afresh');
});
