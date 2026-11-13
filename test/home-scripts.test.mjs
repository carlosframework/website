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
function figuresWorld({ reduce = false, figures = [['12×', 1], ['20 ms', 250], ['80%', 0]] } = {}) {
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
  assert.deepEqual(w.els.map(e => e.run.textContent), ['1×', '250 ms', '0%']);
  assert.ok(w.els.every(e => e.el.classList.contains('is-counting')));
  w.see(); assert.ok(w.observers[0].off, 'counts once');
  const seen = [];
  w.step(16); for (let i = 0; i < 80 && w.frames.length; i++) { w.step(16); if (w.frames.length) seen.push(w.els.map(e => e.run.textContent)); }
  assert.equal(w.frames.length, 0, 'done after 1.2 s');
  const nums = seen.map(r => r.map(t => parseInt(t, 10)));
  assert.ok(nums.every((r, i) => !i || (r[0] >= nums[i - 1][0] && r[1] <= nums[i - 1][1] && r[2] >= nums[i - 1][2])), 'up, down from 250, up');
  assert.ok(nums.some(r => r[1] > 50 && r[1] < 230), 'the response time drops through the middle');
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

test('hero: a height-only resize measures again when it changed the replay\'s least height (a taller window), not otherwise (a phone toolbar)', () => {
  const hero = new El('c-hero', { left: 0, top: 0, width: 900, height: 700 }), replay = new El('rp'); let rpH = 300;
  Object.defineProperty(hero, 'clientWidth', { get: () => 900 });
  hero.qs['.rp'] = [replay];
  const listeners = {}, doc = { readyState: 'complete', querySelector: s => (s === '.c-hero' ? hero : null), querySelectorAll: () => [], documentElement: {} };
  runInContext(heroJS, createContext({ document: doc, getComputedStyle: el => (el === replay ? { minHeight: `${rpH}px` } : { fontSize: '16px' }), addEventListener: (t, f) => { listeners[t] = f; },
    navigator: { languages: ['en-GB'] }, matchMedia: () => media(false), setInterval: () => 0, clearInterval() {}, setTimeout: () => 0, clearTimeout() {} }));
  const held = h => `${Math.ceil(h + 16 * 2.1)}px`;
  assert.equal(hero.style.height, held(700));
  hero.rect = { ...hero.rect, height: 760 }; listeners.resize();
  assert.equal(hero.style.height, held(700), 'same replay height (a phone toolbar): held');
  rpH = 552; hero.rect = { ...hero.rect, height: 952 }; listeners.resize();
  assert.equal(hero.style.height, held(952), 'a taller window grew the replay: measured again');
});

// 🤖 The apps carousel (home/apps.js): a ring with a copy of every app on each side, the current app centred, a
// random start, depth that follows the scroll position, eased glides, the pop of the app at rest in the middle,
// and a slow move every 10 s that waits for hover, focus, off screen and a hidden tab, stops for good on the
// quiet pause, a touch, a drag or a chosen app, and never runs under reduced motion (which also keeps the row
// flat and nothing popped). The status line names the real app.
const appsJS = await read('src/home/apps.js');
function appsWorld({ reduce = false, count = 4, random = 0, broken = false, laidOut = () => true, lacks = [] } = {}) {
  const mq = media(reduce), root = new El('rw-apps'), track = new El('ap-track'), ctrl = new El('ap-ctrl'), dotsBox = new El('ap-dots');
  const play = new El('ap-play'), prev = new El('ap-prev'), next = new El('ap-next'), status = new El('ap-status');
  ctrl.hidden = dotsBox.hidden = true; play.dataset.pause = 'Pause'; play.dataset.play = 'Play';
  status.dataset.format = '{app}, {n} of {total}';
  const names = ['Tito', 'Jelly', 'Eleven', 'Woodstar'].slice(0, count);
  // Slides 640 wide, 60 apart, in a 1000-wide row: slide p is centred at scrollLeft 700p - 130.
  const order = [];
  const slide = name => {
    const s = new El('ap-slide'), a = new El('ap-link'); s.dataset.name = name; s.qs.a = [a]; s.link = a;
    a.focus = () => { a.focused = true; };
    Object.defineProperty(s, 'offsetLeft', { get: () => 50 + order.indexOf(s) * 700 });
    Object.defineProperty(s, 'offsetWidth', { get: () => 640 });
    s.cloneNode = () => slide(name);
    s.remove = () => { const i = order.indexOf(s); if (i >= 0) order.splice(i, 1); };
    return s;
  };
  const real = names.map(slide); order.push(...real);
  const dots = names.map(() => new El(''));
  Object.defineProperty(track, 'clientWidth', { get: () => { if (broken) throw new TypeError('cannot measure'); return 1000; } });
  Object.defineProperty(track, 'scrollWidth', { get: () => (laidOut() ? order.length * 700 + 100 : 1000) }); // before the stylesheet: no overflow
  track.scrollLeft = 0; track.scrolls = [];
  // as older Safari: ScrollBehavior is only 'auto' or 'smooth', anything else throws (and once left the ring flat)
  track.scrollTo = ({ left, behavior }) => { if (behavior !== undefined && behavior !== 'auto' && behavior !== 'smooth') throw new TypeError('Type error'); track.scrollLeft = left; track.scrolls.push(behavior); };
  track.prepend = (...k) => order.unshift(...k); track.append = (...k) => order.push(...k);
  track.remove = el => { const i = order.indexOf(el); if (i >= 0) order.splice(i, 1); };
  track.contains = el => order.includes(el);
  track.qs['.ap-slide'] = real; dotsBox.qs.button = dots;
  Object.assign(root.qs, { '.ap-track': [track], '.ap-ctrl': [ctrl], '.ap-play': [play], '.ap-prev': [prev], '.ap-next': [next], '.ap-dots': [dotsBox], '.ap-status': [status] });
  const timeouts = new Map(), frames = new Map(), observers = [], doc = { hidden: false, l: {} }, win = {}, logged = [];
  let n = 0, clock = 0;
  Object.assign(doc, { querySelector: s => (s === '.rw-apps[data-carousel]' ? root : null), addEventListener: (t, f) => (doc.l[t] ||= []).push(f) });
  const g = {
    document: doc, matchMedia: () => mq, Math: Object.assign(Object.create(Math), { random: () => random }), String, Infinity,
    setTimeout: (f, ms) => { timeouts.set(++n, { f, ms }); return n; }, clearTimeout: id => timeouts.delete(id),
    requestAnimationFrame: f => { frames.set(++n, f); return n; }, cancelAnimationFrame: id => frames.delete(id),
    IntersectionObserver: class { constructor(cb) { this.cb = cb; observers.push(this); } observe() {} },
    addEventListener: (t, f) => (win[t] ||= []).push(f), PointerEvent: function PointerEvent() {},
    console: { info: (...a) => logged.push(a.join(' ')) },
  };
  for (const k of lacks) delete g[k];
  root.contains = el => !!el && (el === root || el === track || el === prev || el === next || el === play || el === ctrl || dots.includes(el) || order.includes(el) || order.some(s => s.link === el));
  let error = null;
  const ctx = createContext(g);
  runInContext('delete Array.prototype.at; delete globalThis.structuredClone;', ctx); // as older Safari (before 15.4) and Firefox (before 90)
  try { runInContext(appsJS, ctx); } catch (e) { error = e; }
  const see = on => observers.forEach(o => o.cb([{ isIntersecting: on }]));
  const run = ms => { const due = [...timeouts.entries()].filter(([, t]) => t.ms === ms); due.forEach(([id]) => timeouts.delete(id)); due.forEach(([, t]) => t.f()); return due.length; };
  // run animation frames 16 ms apart until none are left (or a frame budget runs out); scroll events fire as the row moves
  const play_ = (budget = 400) => { let k = 0; while (frames.size && k++ < budget) { const fs = [...frames.entries()]; frames.clear(); clock += 16; const before = track.scrollLeft; fs.forEach(([, f]) => f(clock)); if (track.scrollLeft !== before) track.fire('scroll'); } return k; };
  const advance = () => { const k = run(10000); run(200); return k; };          // the row's own move, after the screenshot sinks
  const press = (el, e = {}) => { el.fire(e.key ? 'keydown' : 'click', e); run(200); }; // a press, after the screenshot sinks
  const settle = () => { track.fire('scroll'); run(150); };
  const current = () => dots.findIndex(d => d.getAttribute('aria-current') === 'true');
  const at = () => order.indexOf(order.find(s => Math.abs(s.offsetLeft + 320 - 500 - track.scrollLeft) < 1)); // the slide in the middle
  const upAt = () => order.findIndex(s => s.classList.contains('is-up'));
  return { logged, win, error, mq, root, track, ctrl, dotsBox, play, prev, next, status, real, order, dots, doc, win, timeouts, frames, see, run, advance, press, settle, frames_: play_, current, at, upAt };
}

test('apps: a copy of every app on each side, hidden and out of the tab order, and a random start in the middle', () => {
  const w = appsWorld({ random: 0.6 });
  assert.equal(w.order.length, 12); assert.deepEqual(w.order.slice(4, 8), w.real);
  for (const c of [...w.order.slice(0, 4), ...w.order.slice(8)]) {
    assert.equal(c.getAttribute('aria-hidden'), 'true'); assert.equal(c.link.getAttribute('tabindex'), '-1'); assert.ok(c.classList.contains('is-copy'));
  }
  for (const r of w.real) { assert.equal(r.getAttribute('aria-hidden'), null); assert.equal(r.link.getAttribute('tabindex'), null); }
  assert.equal(w.current(), 2, 'Math.random 0.6 of four apps: the third'); assert.equal(w.at(), 6, 'the real one, centred');
  assert.equal(w.upAt(), 6, 'and popped forward');
  assert.equal(w.status.textContent, '', 'nothing announced on arrival');
  assert.equal(w.ctrl.hidden, false); assert.equal(w.dotsBox.hidden, false); assert.ok(w.root.classList.contains('is-live'));
  assert.equal(appsWorld({ random: 0 }).current(), 0); assert.equal(appsWorld({ random: 0.99 }).current(), 3);
});

test('apps: seen from inside the ring, depth follows the scroll position; the middle app is left untransformed', () => {
  const w = appsWorld({ random: 0.6 });   // slide 6 centred
  const t = p => w.order[p].style.transform || '', turn = p => Number(/rotateY\((-?[\d.]+)deg\)/.exec(t(p))?.[1] ?? 0);
  assert.equal(t(6), '', 'popped forward: no transform at all, so its text is drawn sharp'); assert.equal(w.order[6].style.opacity || '', '');
  assert.ok(turn(5) > 0 && turn(7) < 0, 'neighbours turned away on opposite sides'); assert.equal(Math.abs(turn(5)), Math.abs(turn(7)));
  // cards are laid out at the popped size and drawn 1/1.13 smaller until they pop: 0.9 x 0.885 beside the middle
  assert.match(t(7), /^translateX\(-[\d.]+px\) perspective\(\d+px\) rotateY\(-30\.00deg\) scale\(0\.7965\)$/);
  assert.ok(Number(w.order[7].style.opacity) < 1);
  assert.equal(t(10), 'scale(0.8850)', 'out of sight: just at rest size');
  assert.equal(w.track.style.perspective || '', '', 'no shared perspective: each slide carries its own');
  // half way to the next app, both are part turned; the drawing waits for the next frame
  w.track.scrollLeft += 350; w.track.fire('scroll'); assert.ok(!w.order[6].classList.contains('is-up'), 'moved by hand: back at once');
  w.frames_();
  assert.ok(turn(6) > 0 && turn(6) < 30 && turn(7) < 0 && turn(7) > -30, `${turn(6)} ${turn(7)}`);
  // reduced motion: flat
  w.mq.set(true); w.frames_();
  for (const s of w.order) assert.equal(s.style.transform || '', '');
});

test('apps: the app at rest pops forward, eases back before the row moves, and the next pops once it settles', () => {
  const w = appsWorld({ random: 0 }); w.see(true);
  assert.equal(w.upAt(), 4); assert.equal(w.order[4].style.transform, '', 'the whole card forward, untransformed');
  // a press: back first, and the row waits the 200 ms before it turns
  w.next.fire('click');
  assert.equal(w.upAt(), -1, 'eased back at once'); assert.equal(w.frames.size, 0, 'not moving yet');
  assert.equal(w.order[4].style.transform, 'scale(0.8850)'); assert.ok(w.order[4].classList.contains('is-sinking'), 'easing back, with its own transition');
  w.run(240); assert.ok(!w.order[4].classList.contains('is-sinking'), 'and then without one, so it never lags the row');
  w.timeouts.forEach((t, id) => { if (t.ms === 200) { w.timeouts.delete(id); t.f(); } }); assert.ok(w.track.classList.contains('is-gliding'), 'then it turns');
  w.frames_(); assert.equal(w.upAt(), -1, 'nothing pops on the way');
  w.settle(); assert.equal(w.upAt(), 5, 'the next app pops when it has settled');
  // presses while it eases back add up to one move
  w.next.fire('click'); w.next.fire('click'); w.run(200); w.frames_(); w.settle();
  assert.equal(w.current(), 3); assert.equal(w.upAt(), 7);
  // the row's own move does the same
  const a = appsWorld({ random: 0 }); a.see(true);
  a.run(10000); assert.equal(a.upAt(), -1); assert.equal(a.frames.size, 0);
  a.run(200); const k = a.frames_(); assert.ok(k > 80, `a slow turn: ${k} frames`); a.settle(); assert.equal(a.upAt(), 5);
  // a drag: back the moment it starts, nothing pops while held, the settled app pops
  const d = appsWorld({ random: 0 }); d.see(true);
  d.track.fire('pointerdown', { pointerType: 'mouse', button: 0, clientX: 600, clientY: 300, pointerId: 1 });
  assert.equal(d.upAt(), 4, 'a press that has not moved is still a click');
  d.track.fire('pointermove', { clientX: 390, clientY: 300, pointerId: 1 }); assert.equal(d.upAt(), -1);
  d.settle(); assert.equal(d.upAt(), -1, 'not while held');
  d.track.fire('pointerup', { clientX: 390, clientY: 300, pointerId: 1 }); d.frames_(); d.settle(); assert.equal(d.upAt(), 5);
  // a touch, and a trackpad moving the row: back at once
  const t = appsWorld({ random: 0 }); t.track.fire('pointerdown', { pointerType: 'touch', clientX: 500, clientY: 300, pointerId: 2 });
  assert.equal(t.upAt(), 4, 'a tap is not a drag'); t.track.fire('pointermove', { pointerType: 'touch', clientX: 470, clientY: 302, pointerId: 2 }); assert.equal(t.upAt(), -1, 'a swipe takes it back');
  // a finger moving mostly up or down is the page's: the row leaves it alone
  const v = appsWorld({ random: 0 }), left = v.track.scrollLeft; v.track.fire('pointerdown', { pointerType: 'touch', clientX: 500, clientY: 300, pointerId: 3 });
  v.track.fire('pointermove', { pointerType: 'touch', clientX: 497, clientY: 260, pointerId: 3 }); v.track.fire('pointermove', { pointerType: 'touch', clientX: 470, clientY: 200, pointerId: 3 });
  assert.equal(v.track.scrollLeft, left); assert.equal(v.upAt(), 4); assert.ok(!v.track.classList.contains('is-dragging'));
  const pad = appsWorld({ random: 0 }); pad.track.scrollLeft += 40; pad.track.fire('scroll'); assert.equal(pad.upAt(), -1);
  // reduced motion: nothing pops, and nothing waits
  const r = appsWorld({ reduce: true, random: 0 }); assert.equal(r.upAt(), -1);
  r.next.fire('click'); assert.equal(r.current(), 1, 'straight away'); r.settle(); assert.equal(r.upAt(), -1);
});

test('apps: it loops both ways with eased glides, and the dots and status give the real app', () => {
  const w = appsWorld({ random: 0.99 }); w.see(true);   // starts on the last app
  assert.equal(w.status.getAttribute('aria-live'), 'off', 'silent while it moves by itself');
  assert.equal(w.advance(), 1);
  assert.equal(w.current(), 0); assert.ok(w.track.classList.contains('is-gliding'), 'snapping off while it glides');
  w.frames_(); assert.ok(!w.track.classList.contains('is-gliding'));
  assert.equal(w.at(), 8, 'on into the copy after the last, not back across the row');
  w.settle();
  assert.equal(w.at(), 4, 'at rest on a copy: quietly onto the real first app'); assert.equal(w.current(), 0);
  assert.equal(w.upAt(), 4, 'the real one pops, not the copy');
  // a press glides briskly; backwards from the first goes into the copy before it, then onto the real last
  w.press(w.prev); const kp = w.frames_(); assert.ok(kp < 45, `brisk: ${kp} frames`);
  assert.equal(w.at(), 3); assert.equal(w.current(), 3); assert.equal(w.status.textContent, 'Woodstar, 4 of 4');
  w.settle(); assert.equal(w.at(), 7);
  // presses during a glide finish it where it was going, then go on
  const v = appsWorld({ random: 0.99 }); v.see(true);
  for (let i = 0; i < 6; i++) { v.press(v.next); v.frames_(3); }
  v.frames_(); assert.equal(v.current(), 1); v.settle(); assert.equal(v.order[v.at()], v.real[1]);
  for (let i = 0; i < 9; i++) v.press(v.prev);
  v.frames_(); assert.equal(v.current(), 0); v.settle(); assert.equal(v.order[v.at()], v.real[0]);
  // a dot goes the short way round
  const d = appsWorld({ random: 0 }); d.press(d.dots[3]); d.frames_(); assert.equal(d.at(), 3); d.settle(); assert.equal(d.at(), 7);
  // a swipe that comes to rest on a copy is moved to the real app too
  const s = appsWorld({ random: 0 }); s.track.fire('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0, pointerId: 9 });
  s.track.scrollLeft = 700 * 2 - 130; s.settle(); assert.equal(s.current(), 2); assert.equal(s.at(), 6);
  // the arrow keys move one app and focus goes with it
  const kb = appsWorld({ random: 0 }); kb.press(kb.track, { key: 'ArrowRight', preventDefault() {} });
  assert.equal(kb.current(), 1); assert.ok(kb.real[1].link.focused); assert.equal(kb.play.getAttribute('aria-label'), 'Play');
});

test('apps: hover, focus, off screen and a hidden tab hold it; the quiet pause, a touch, a drag or a chosen app stop it', () => {
  const w = appsWorld(); w.see(true);
  assert.equal(w.play.getAttribute('aria-label'), 'Pause'); assert.equal(w.play.getAttribute('title'), 'Pause'); assert.equal(w.play.hidden, false);
  w.track.fire('pointerenter', { pointerType: 'mouse' });
  assert.equal(w.advance(), 0); assert.equal(w.status.getAttribute('aria-live'), 'polite');
  w.track.fire('pointerleave', { pointerType: 'mouse' }); assert.equal(w.advance(), 1); w.frames_(); w.settle();
  // focus coming in stops it until Play (the APG carousel pattern; more in the focus test below)
  w.root.fire('focusin', { target: w.real[0].link }); assert.equal(w.advance(), 0); assert.equal(w.play.getAttribute('aria-label'), 'Play');
  w.root.fire('focusout', { relatedTarget: null }); assert.equal(w.advance(), 0, 'still stopped');
  w.root.fire('focusin', { target: w.play }); w.play.fire('click'); assert.equal(w.advance(), 1); w.frames_(); w.settle();
  w.see(false); assert.equal(w.advance(), 0, 'scrolled away: it waits'); w.see(true);
  w.doc.hidden = true; w.doc.l.visibilitychange.forEach(f => f()); assert.equal(w.advance(), 0, 'hidden tab: it waits'); w.doc.hidden = false; w.doc.l.visibilitychange.forEach(f => f());
  w.play.fire('click');
  assert.equal(w.play.getAttribute('aria-label'), 'Play'); assert.ok(w.play.classList.contains('is-stopped')); assert.equal(w.advance(), 0);
  w.play.fire('click'); assert.equal(w.play.getAttribute('aria-label'), 'Pause'); assert.equal(w.advance(), 1); w.frames_(); w.settle();
  w.track.fire('pointerdown', { pointerType: 'touch', clientX: 0, clientY: 0, pointerId: 9 }); assert.equal(w.play.getAttribute('aria-label'), 'Play'); assert.equal(w.advance(), 0);
  // choosing an app stops it
  const v = appsWorld(); v.see(true);
  v.press(v.next); v.frames_(); assert.equal(v.current(), 1); assert.equal(v.status.textContent, 'Jelly, 2 of 4'); assert.equal(v.play.getAttribute('aria-label'), 'Play'); assert.equal(v.advance(), 0);
  // a mouse drag moves the row, settles on an app and is not a click on it
  const d = appsWorld(); d.see(true);
  d.track.fire('pointerdown', { pointerType: 'mouse', button: 0, clientX: 600, clientY: 300, pointerId: 1 });
  d.track.fire('pointermove', { clientX: 597, clientY: 300, pointerId: 1 }); assert.ok(!d.track.classList.contains('is-dragging'), 'a wobble is still a click');
  d.track.fire('pointermove', { clientX: 390, clientY: 300, pointerId: 1 });
  assert.ok(d.track.classList.contains('is-dragging')); assert.equal(d.track.scrollLeft, 700 * 4 - 130 + 210); assert.equal(d.play.getAttribute('aria-label'), 'Play');
  d.settle(); assert.equal(d.track.scrollLeft, 700 * 4 - 130 + 210, 'no snapping back mid-drag');
  d.track.fire('pointerup', { clientX: 390, clientY: 300, pointerId: 1 }); d.frames_();
  assert.ok(!d.track.classList.contains('is-dragging')); assert.equal(d.current(), 1, 'past a quarter of an app: on to the next'); assert.equal(d.at(), 5);
  let blocked = false; d.track.fire('click', { preventDefault() { blocked = true; }, stopPropagation() {} }); assert.ok(blocked);
});

test('apps: only the address is a link; a click on a card beside the middle turns the ring to it; Tab does too', () => {
  const at = (w, el, also = {}) => ({ closest: sel => (sel === 'a' ? also.a || null : sel === '.ap-slide' ? el : null), ...also });
  const w = appsWorld({ random: 0 }); w.see(true);   // slide 4 in the middle
  // the middle card: a click on its screenshot does nothing
  let prevented = false; w.track.fire('click', { target: at(w, w.order[4]), preventDefault() { prevented = true; } }); w.run(200); w.frames_();
  assert.equal(w.current(), 0); assert.equal(w.at(), 4); assert.ok(!prevented);
  // the card to its right: the ring turns one app, and it stops the row's own movement
  w.track.fire('click', { target: at(w, w.order[5]) }); w.run(200); assert.equal(w.current(), 1); w.frames_(); w.settle();
  assert.equal(w.at(), 5); assert.equal(w.upAt(), 5); assert.equal(w.play.getAttribute('aria-label'), 'Play');
  // a copy two to the left (the ring has no ends): two apps back
  w.track.fire('click', { target: at(w, w.order[3]) }); w.run(200); w.frames_(); w.settle(); assert.equal(w.current(), 3);
  // a click on an address is the link's: left alone
  const v = appsWorld({ random: 0 }); v.track.fire('click', { target: at(v, v.order[5], { a: {} }) }); v.run(200); v.frames_(); assert.equal(v.current(), 0);
  // a click straight after a drag is swallowed
  const d = appsWorld({ random: 0 }); d.see(true);
  d.track.fire('pointerdown', { pointerType: 'mouse', button: 0, clientX: 600, clientY: 300, pointerId: 1 }); d.track.fire('pointermove', { clientX: 520, clientY: 300, pointerId: 1 }); d.track.fire('pointerup', { clientX: 520, clientY: 300, pointerId: 1 });
  let swallowed = false; d.track.fire('click', { target: at(d, d.order[5]), preventDefault() { swallowed = true; }, stopPropagation() {} }); assert.ok(swallowed, 'no click after a drag');
  // Tab to an address: its card comes to the middle (the short way round)
  const f = appsWorld({ random: 0 }); f.track.fire('focusin', { target: at(f, f.real[3]) }); f.run(200); f.frames_();
  assert.equal(f.current(), 3); assert.equal(f.at(), 3, 'one step back, not three forward'); f.settle(); assert.equal(f.order[f.at()], f.real[3]);
  // nothing listens to the wheel, so a vertical wheel always scrolls the page
  assert.equal(w.track.l.wheel, undefined);
});

test('apps: letting go settles once, straight on from where the row is: back under a quarter of an app, on past it or when flicked', () => {
  // a drag with times, ending at x; every frame of the settle recorded
  const letGo = (w, path) => {
    w.track.fire('pointerdown', { pointerType: 'mouse', button: 0, clientX: path[0][1], clientY: 300, pointerId: 1, timeStamp: path[0][0] });
    for (const [t, x] of path.slice(1)) w.track.fire('pointermove', { clientX: x, clientY: 300, pointerId: 1, timeStamp: t });
    const [t, x] = path[path.length - 1], at = w.track.scrollLeft;
    const classes = []; const was = w.track.classList.remove.bind(w.track.classList);
    w.track.classList.remove = (...c) => { classes.push([...c, w.track.classList.contains('is-gliding')]); was(...c); };
    w.track.fire('pointerup', { clientX: x, clientY: 300, pointerId: 1, timeStamp: t });
    const trace = [at]; while (w.frames.size) { w.frames_(1); trace.push(w.track.scrollLeft); }
    return { at, trace, classes };
  };
  const steady = trace => { const dir = Math.sign(trace[trace.length - 1] - trace[0]); return trace.every((v, i) => !i || Math.sign(v - trace[i - 1]) * dir >= 0); };
  const centreOf = p => 700 * p - 130;
  // a small drag (100 px of 700, slowly): back to the same app, from where it was let go
  const a = appsWorld({ random: 0 }); a.see(true);
  const s = letGo(a, [[0, 600], [100, 560], [300, 520], [500, 500]]);
  assert.equal(a.current(), 0); assert.equal(s.trace[s.trace.length - 1], centreOf(4));
  assert.ok(steady(s.trace), 'one way, no jump: ' + s.trace.slice(0, 6).map(Math.round));
  assert.ok(Math.abs(s.trace[1] - s.at) < 40, 'the first frame starts where it was let go');
  assert.deepEqual(s.classes[0], ['is-dragging', true], 'snapping stays off: the glide holds it before the drag lets go');
  // half an app, slowly: on to the next
  const b = appsWorld({ random: 0 }); b.see(true);
  const h = letGo(b, [[0, 600], [200, 450], [600, 250], [900, 250]]);
  assert.equal(b.current(), 1); assert.equal(h.trace[h.trace.length - 1], centreOf(5)); assert.ok(steady(h.trace));
  // a flick (80 px in 60 ms): on, with its speed, though it is short
  const c = appsWorld({ random: 0 }); c.see(true);
  const f = letGo(c, [[0, 600], [30, 560], [60, 520]]);
  assert.equal(c.current(), 1); assert.ok(steady(f.trace));
  // (the glide's first frame only notes the time; the second is its first step)
  assert.ok(Math.abs(f.trace[2] - f.trace[1]) > Math.abs(s.trace[2] - s.trace[1]), 'it carries on at the speed it was going');
  // a hard flick goes further, never past three apps
  const d = appsWorld({ random: 0 }); d.see(true); letGo(d, [[0, 900], [30, 700], [60, 400]]);
  assert.ok(d.current() >= 2 && d.current() <= 3, `${d.current()}`);
  // nothing pops until it has come to rest
  assert.equal(c.upAt(), -1); c.settle(); assert.equal(c.upAt(), 5);
});

test('apps: Pause, hover, focus or scrolling away stop the row’s own turn, waiting or under way (Astra, 9174009)', () => {
  // waiting for the card to ease back: dropped, the card comes forward again
  const a = appsWorld({ random: 0 }); a.see(true);
  a.run(10000); assert.equal(a.upAt(), -1, 'the card eased back for the turn');
  a.play.fire('click');
  a.run(200); a.frames_(); a.settle();
  assert.equal(a.current(), 0, 'no turn after Pause'); assert.equal(a.at(), 4); assert.equal(a.upAt(), 4);
  // under way: it settles on the nearest app instead of finishing the turn
  const b = appsWorld({ random: 0 }); b.see(true);
  b.run(10000); b.run(200); b.frames_(20);   // a little way into the slow turn
  const mid = b.track.scrollLeft; assert.ok(mid > 700 * 4 - 130 && mid < 700 * 5 - 130);
  b.play.fire('click'); b.frames_(); b.settle();
  assert.equal(b.at(), 4, 'back to the nearest, not on to the next'); assert.equal(b.current(), 0);
  // the same when the row scrolls out of sight, the tab is hidden, or the pointer comes over it
  for (const why of ['away', 'hidden', 'hover']) {
    const w = appsWorld({ random: 0 }); w.see(true); w.run(10000);
    if (why === 'away') w.see(false); else if (why === 'hidden') { w.doc.hidden = true; w.doc.l.visibilitychange.forEach(f => f()); } else w.track.fire('pointerenter', { pointerType: 'mouse' });
    w.run(200); w.frames_(); w.settle(); assert.equal(w.current(), 0, why);
  }
  // a person's own move during the row's turn replaces it
  const c = appsWorld({ random: 0 }); c.see(true); c.run(10000); c.run(200); c.frames_(10);
  c.press(c.prev); c.frames_(); c.settle(); assert.equal(c.current(), 3, 'one back from where it was, not from where it was going');
});

test('apps: focus anywhere in the carousel holds it, and stops the row until Play (Astra, 9174009)', () => {
  const w = appsWorld({ random: 0 }); w.see(true);
  // an address, then Previous: still held, still stopped
  w.root.fire('focusin', { target: w.real[0].link }); assert.equal(w.play.getAttribute('aria-label'), 'Play');
  w.root.fire('focusout', { relatedTarget: w.prev }); w.root.fire('focusin', { target: w.prev });
  assert.equal(w.advance(), 0, 'Previous is inside the carousel');
  w.root.fire('focusout', { relatedTarget: w.dots[2] }); w.root.fire('focusin', { target: w.dots[2] }); assert.equal(w.advance(), 0, 'a dot too');
  // leaving the carousel: still stopped until Play
  w.root.fire('focusout', { relatedTarget: null }); assert.equal(w.advance(), 0, 'stopped until Play');
  // Play takes focus and starts the row; focus on Play holds nothing
  w.root.fire('focusin', { target: w.play }); w.play.fire('click');
  assert.equal(w.play.getAttribute('aria-label'), 'Pause'); assert.equal(w.advance(), 1, 'turning again with focus on Play');
});

test('apps: it starts only once the row is laid out, and never gives up over a measurement taken too early (Paul: "every other refresh")', () => {
  // the stylesheet not there yet: the plain row, no copies, no controls, waiting
  let ready = false;
  const w = appsWorld({ laidOut: () => ready });
  assert.ok(!w.error); assert.match(w.root.dataset.ring, /^waiting/);
  assert.ok(!w.root.classList.contains('is-live')); assert.deepEqual(w.order, w.real); assert.equal(w.ctrl.hidden, true);
  for (const s of w.real) assert.equal(s.style.transform || '', '');
  w.frames_(); assert.match(w.root.dataset.ring, /^waiting/, 'still waiting on the next frames');
  // it arrives: started on the next look (load here), copies in, drawn, controls shown
  ready = true; w.win.load.forEach(f => f());
  assert.equal(w.root.dataset.ring, 'live'); assert.ok(w.root.classList.contains('is-live')); assert.equal(w.order.length, 12); assert.equal(w.ctrl.hidden, false);
  assert.equal(w.upAt(), w.at(), 'the middle app popped');
  // the console tells the story, with what was measured
  assert.equal(w.logged.length, 2);
  assert.match(w.logged[0], /^CARLOS apps carousel: waiting for the row's layout \(slide 640px, 700px apart, row 1000px in 1000px\)$/);
  assert.match(w.logged[1], /^CARLOS apps carousel: started after waiting .* for the row's layout \(slide 640px, 700px apart, row \d+px in 1000px\)$/);
  // a later look changes nothing once live
  w.win.load.forEach(f => f()); assert.equal(w.order.length, 12);
});

test('apps: a browser without what the ring needs keeps the plain row for good, and says why', () => {
  const w = appsWorld({ lacks: ['PointerEvent'] });
  assert.equal(w.root.dataset.ring, 'off: this browser lacks PointerEvent');
  assert.match(w.logged[0], /CARLOS apps carousel: showing the plain row \(this browser lacks PointerEvent\)/);
  assert.ok(!w.root.classList.contains('is-live')); assert.deepEqual(w.order, w.real); assert.equal(w.ctrl.hidden, true);
  w.frames_(); (w.win.load || []).forEach(f => f()); assert.deepEqual(w.order, w.real, 'nothing retries it');
});

test('apps: a browser that cannot start the ring keeps the plain row, not a half-drawn one', () => {
  const w = appsWorld({ broken: true });
  // something failing part-way is tried again a few times (each said in the console), then left for good
  assert.match(w.root.dataset.ring, /^retrying: TypeError: cannot measure/);
  for (let k = 0; k < 6; k++) { w.frames_(); (w.win.load || []).forEach(f => f()); }
  assert.match(w.root.dataset.ring, /^off: TypeError: cannot measure/, 'the reason, for whoever looks');
  assert.ok(w.logged.length >= 5 && /trying again/.test(w.logged[0]) && /showing the plain row/.test(w.logged[w.logged.length - 1]));
  assert.ok(!w.root.classList.contains('is-live'), 'flat row styles, not the live ones');
  assert.equal(w.ctrl.hidden, true); assert.equal(w.dotsBox.hidden, true, 'no controls for a ring that is not there');
  assert.deepEqual(w.order, w.real, 'the copies are gone again'); assert.equal(w.track.scrollLeft, 0);
  for (const s of w.real) { assert.equal(s.style.transform || '', ''); assert.ok(!s.classList.contains('is-up')); }
  // and nothing it left listening wakes it: a scroll, a click, a key, the timer
  w.track.scrollLeft = 300; w.track.fire('scroll'); w.run(150); w.track.fire('keydown', { key: 'ArrowRight', preventDefault() {} }); w.run(200); w.run(10000); w.frames_();
  for (const s of w.real) assert.equal(s.style.transform || '', '');
  assert.equal(w.track.scrollLeft, 300);
});

test('apps: reduced motion never moves by itself, hides the pause, jumps instead of gliding and still loops', () => {
  const r = appsWorld({ reduce: true, random: 0.99 }); r.see(true);
  assert.equal(r.play.hidden, true); assert.equal(r.advance(), 0); assert.equal(r.status.getAttribute('aria-live'), 'polite');
  r.next.fire('click'); assert.equal(r.frames.size, 0, 'no glide, a jump'); assert.equal(r.current(), 0);
  r.settle(); assert.equal(r.at(), 4);
  // switched on mid-wait: the pending move is dropped, and the popped screenshot goes back
  const w = appsWorld(); w.see(true); assert.equal([...w.timeouts.values()].filter(t => t.ms === 10000).length, 1);
  w.mq.set(true); assert.equal(w.advance(), 0); assert.equal(w.play.hidden, true); assert.equal(w.upAt(), -1);
  // a new width puts the current app back in the middle
  const z = appsWorld({ random: 0.3 }); z.track.scrollLeft = 123; z.win.resize.forEach(f => f()); [...z.timeouts.entries()].filter(([, t]) => t.ms === 100).forEach(([, t]) => t.f());
  assert.equal(z.at(), 5);
});

// 🤖 The hero replay as a chat (home/replay.js): the timeline it plays, worked out from the lines. The page-level
// behaviour (typing spans, caret, thinking dots, steps, speed) is checked in a browser before each release.
const replayJS = await read('src/home/replay.js');
const rpTimeline = () => { const g = { document: { querySelector: () => null }, matchMedia: () => media(false), Math, Number, String, Infinity }; g.globalThis = g; const ctx = createContext(g); runInContext('delete Array.prototype.at;', ctx); runInContext(replayJS, ctx); return g.__rpTimeline; }; // as older Safari and Firefox: no Array.at
test('replay: a loading screen, typed lines, thinking before each agent message, then streamed words, at reading pace', () => {
  const T = rpTimeline();
  const words = n => Array.from({ length: n }, (_, k) => `w${k}`).join(' ');
  const turns = [
    { kind: 'you', text: 'Follow the directions, please.', units: [...'Follow the directions, please.'] },
    { kind: 'agent', text: words(12), units: words(12).split(' ') },
    { kind: 'scene' },
    { kind: 'agent', text: words(30), units: words(30).split(' ') },
    { kind: 'app' },
  ];
  const tl = T.plan(turns), at = t => T.stateAt(tl, t);
  // loading first, nothing shown
  assert.ok(at(0).loading); assert.equal(JSON.stringify(at(0).turns.map(x => x.phase)), JSON.stringify(['hidden', 'hidden', 'hidden']));
  assert.ok(!at(T.LOAD).loading);
  // the person types a character at a time, unevenly, with a beat after punctuation
  const you = tl.turns[0], gaps = T.typing(you.text);
  assert.ok(new Set(gaps.map(g => Math.round(g))).size > 5, 'not a metronome');
  assert.ok(gaps[you.text.indexOf(',')] > 150, 'a beat after a comma');
  let last = 0;
  for (let t = you.from; t <= you.shown; t += 40) { const c = at(t).turns[0].count; assert.ok(c >= last); last = c; }
  assert.equal(at(you.shown).turns[0].phase, 'shown'); assert.equal(at(you.shown).turns[0].count, you.text.length);
  // the agent thinks first, then streams a word every 65 ms
  const agent = tl.turns[1];
  assert.equal(Math.round(agent.from - agent.at), T.THINK); assert.equal(at(agent.at + 10).turns[1].phase, 'thinking');
  assert.equal(at(agent.from + T.WORD * 4 + 1).turns[1].count, 4);
  // each line is left long enough to read at about 200 words a minute before the next turn starts
  assert.ok(tl.turns[3].at - tl.turns[3 - 2].from >= 12 * T.READ * 0.7);
  assert.ok(tl.turns[3].done - tl.turns[3].from >= 30 * T.READ, 'a long message gets its reading time');
  // the second scene, then the app and its pan, then a fade before it starts again
  const scene = tl.turns[2], app = tl.turns[4];
  assert.ok(!at(scene.at - 1).scene2 && at(scene.at).scene2);
  assert.ok(!at(app.at - 1).appOn && at(app.at).appOn);
  assert.equal(at(app.pan).pan, 0); assert.equal(at(app.panEnd).pan, 1); assert.equal(Math.round(app.panEnd - app.pan), T.PAN);
  assert.ok(at(tl.fade).ending && !at(tl.fade - 1).ending && tl.total > tl.fade);
  // steps land on the end of each turn, the app, and the end of its pan, in order
  const stops = T.stops(tl);
  assert.equal(JSON.stringify(stops), JSON.stringify([...stops].sort((a, b) => a - b)));
  assert.equal(JSON.stringify(stops.slice(0, 3)), JSON.stringify([you.shown, agent.shown, tl.turns[3].shown]));
  assert.equal(stops[stops.length - 1], app.panEnd);
  for (const st of stops.slice(0, 3)) assert.ok(at(st).turns.every(x => x.phase !== 'arriving' && x.phase !== 'thinking'), 'a step shows whole lines');
});
