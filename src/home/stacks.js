// 🤖 Ported from the approved 2026-11-12 homepage rework (options sheet, panel I1).
// I1 Interactive: the two stacks as physical things.
// Without this script the stacks are a still picture. With it, the tower sways (CSS, under .moving), and Matter.js
// (MIT) is fetched in idle time once the panel nears the screen, turning the blocks into rigid bodies:
//   - the Before pile is loose boxes on a fixed "Cloud provider" base: wind from the pointer, pull one out and it falls
//   - "Many services" hangs the app from a bunch of balloons: pop one and it sags
//   - the CARLOS pyramid is heavy, damped and tethered home, so it barely gives and snaps back
// Under reduced motion, or while paused with the panel's Pause button, nothing moves. Reduced motion switched on
// later stops everything and puts the picture back at rest; Pause freezes it where it is.
(() => {
  const panel = document.querySelector('.ipanel');
  if (!panel) return;
  const stage = panel.querySelector('.istage'), resetBtn = panel.querySelector('.ireset'), strings = panel.querySelector('.strings');
  const modeButtons = [...panel.querySelectorAll('[data-mode-set]')];
  let W = null;
  // Before the physics is loaded (and always under reduced motion) the strings are drawn once from where things sit.
  function stillStrings() {
    if (W) return;
    const sr = stage.getBoundingClientRect(), app = stage.querySelector('.services .app'), bs = [...stage.querySelectorAll('.services .balloon')];
    if (panel.dataset.mode !== 'services' || !app) return strings.replaceChildren();
    const ar = app.getBoundingClientRect();
    strings.replaceChildren(...bs.map((b, i) => {
      const r = b.getBoundingClientRect(), x0 = r.left + r.width / 2 - sr.left, y0 = r.bottom + 6 - sr.top;
      const x1 = ar.left - sr.left + ar.width * (0.07 + 0.86 * i / (bs.length - 1)), y1 = ar.top - sr.top;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${x0} ${y0} Q${(x0 + x1) / 2 + (x1 - x0) * 0.12} ${(y0 + y1) / 2 + 14} ${x1} ${y1}`);
      return path;
    }));
  }
  const setMode = mode => {
    panel.dataset.mode = mode;
    modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modeSet === mode)));
    if (W) rebuild(); else stillStrings();
  };
  modeButtons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.modeSet)));
  // The view switch needs this script, so it stays hidden without it.
  const seg = panel.querySelector('.seg'); if (seg) seg.hidden = false;
  stillStrings(); addEventListener('resize', stillStrings); addEventListener('load', stillStrings);

  const ROPE = 8; // segments in each string
  let M, loading = false, raf = 0, lastTouch = 0, idle = 0, near = null, paused = false, visible = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)'), pauseBtn = panel.querySelector('.ipause');
  const still = () => reduce.matches || paused;
  // The physics engine is fetched once. Anything that asks for it while it is on its way is queued, in order,
  // so a grab made during the wait still takes hold when it arrives (unless the pointer has let go by then).
  const waiting = [];
  const load = then => {
    if (still()) return;
    if (M) return then();
    waiting.push(then);
    if (loading) return;
    loading = true;
    const s = document.createElement('script');
    s.src = '/home/matter-0.20.0.min.js'; s.onload = () => { M = window.Matter; if (still()) waiting.length = 0; while (waiting.length) waiting.shift()(); };
    document.head.appendChild(s);
  };
  const ready = () => { if (!W && !still()) build(); };
  // Fetch and set it up in idle time as soon as the panel is near the screen, so the first touch does not have to wait for it.
  function preload() {
    if (near || W) return;
    near = new IntersectionObserver(es => {
      if (!es.some(e => e.isIntersecting)) return;
      near.disconnect(); near = null;
      idle = (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => { idle = 0; load(ready); }, { timeout: 1500 });
    }, { rootMargin: '400px 0px' });
    near.observe(stage);
  }
  // Reduced motion: cancel whatever is pending and put every piece back at rest.
  function halt() {
    if (near) { near.disconnect(); near = null; }
    if (idle) { (window.cancelIdleCallback || clearTimeout)(idle); idle = 0; }
    waiting.length = 0; grab = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (W) { W = null; stage.classList.remove('live', 'ready', 'measure', 'resetting', 'tremor'); stage.style.removeProperty('height'); clear(); resetBtn.hidden = true; stillStrings(); }
  }
  // Pause freezes the picture where it is: the CSS sway stops, the physics loop stops, the pointer is ignored.
  function motion() {
    const off = still();
    panel.classList.toggle('moving', !off);
    panel.classList.toggle('static', off);
    if (pauseBtn) { pauseBtn.hidden = reduce.matches; pauseBtn.textContent = paused ? pauseBtn.dataset.play : pauseBtn.dataset.pause; }
    if (reduce.matches) return halt();
    if (paused) { if (raf) { cancelAnimationFrame(raf); raf = 0; } grab = null; return; }
    preload(); if (W) wake();
  }
  if (pauseBtn) pauseBtn.addEventListener('click', () => { paused = !paused; motion(); });
  reduce.addEventListener('change', motion);

  // ---- build a world from where the blocks are drawn right now --------------------------------
  function clear() { // every piece back where the page's own layout draws it
    stage.querySelectorAll('li, ul').forEach(el => { for (const k of ['position', 'left', 'top', 'width', 'height', 'margin', 'transform']) el.style.removeProperty(k); }); // keeps each balloon's own colour
    stage.querySelectorAll('.popped').forEach(el => el.classList.remove('popped'));
    stage.querySelectorAll('.frag, .flash, .piece, .dart, .snip').forEach(el => el.remove());
    stage.querySelectorAll('.cracked, .shattered').forEach(el => el.classList.remove('cracked', 'shattered'));
    stage.querySelectorAll('.app').forEach(el => { el.className = 'app'; });
  }
  function build() {
    stage.classList.remove('live'); stage.classList.add('measure');
    clear();
    const sr = stage.getBoundingClientRect(), mode = panel.dataset.mode;
    const box = el => { const r = el.getBoundingClientRect(); return { el, x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, w: r.width, h: r.height }; };
    const left = [...stage.querySelectorAll(`.${mode} li`)].map(box), right = [...stage.querySelectorAll('.stack.after li')].map(box);
    stage.querySelectorAll('.stack ul').forEach(ul => { const r = ul.getBoundingClientRect(); ul.style.width = r.width + 'px'; ul.style.height = r.height + 'px'; });
    stage.style.height = sr.height + 'px';
    stage.classList.remove('measure'); stage.classList.add('live');

    const { Engine, Bodies, Body, Composite, Constraint } = M;
    const engine = Engine.create({ enableSleeping: true, positionIterations: 12, velocityIterations: 10 });
    const world = engine.world, GAP = 4, floorY = right[right.length - 1].y + right[right.length - 1].h / 2 + GAP / 2;
    const fixed = (x, y, w, h) => Bodies.rectangle(x, y, w, h, { isStatic: true, friction: 1 });
    Composite.add(world, [fixed(sr.width / 2, floorY + 40, sr.width * 3, 80), fixed(-40, sr.height / 2, 80, sr.height * 3), fixed(sr.width + 40, sr.height / 2, 80, sr.height * 3), fixed(sr.width / 2, -40, sr.width * 3, 80)]);
    // an unseen wall between the stacks, so nothing that falls ends up on the CARLOS side
    const mid = Math.min(...right.map(b => b.x - b.w / 2)) - 12;
    Composite.add(world, Bodies.rectangle(mid - 10, sr.height / 2, 20, sr.height * 3, { isStatic: true, friction: 0, frictionStatic: 0 })); // slippery, so nothing leans on it
    const items = [], links = [];
    M.Events.on(engine, 'collisionStart', ev => { if (W && W.mode === 'tower' && !W.intact) for (const pr of ev.pairs) { knock(pr.bodyA.parent || pr.bodyA, pr.bodyB.parent || pr.bodyB); knock(pr.bodyB.parent || pr.bodyB, pr.bodyA.parent || pr.bodyA); } });
    const add = (b, body, extra) => { const it = Object.assign({ el: b.el, body, w: b.w, h: b.h, hx: b.x, hy: b.y }, extra); body.plugin.item = it; items.push(it); Composite.add(world, body); return it; };

    if (mode === 'tower') {
      const rows = [...new Set(left.map(b => Math.round(b.y)))].sort((p, q) => q - p); // the base is row 0; bricks that share a height share a level
      left.forEach((b, i) => {
        const base = b.el.classList.contains('base');
        add(b, Bodies.rectangle(b.x, b.y, b.w, b.h + GAP, { isStatic: base, friction: 0.45, frictionStatic: 0.7, restitution: 0, density: 0.001, chamfer: { radius: 2 } }), { kind: base ? 'base' : 'block', level: rows.indexOf(Math.round(b.y)), micro: b.el.classList.contains('micro'), k: i, breakable: /pair-/.test(b.el.className), cut: b.w * (0.42 + Math.random() * 0.16), side: b.el.classList.contains('pair-a') ? -1 : b.el.classList.contains('pair-b') ? 1 : 0 });
      });
    } else {
      const appBox = left.find(b => b.el.classList.contains('app')), balloons = left.filter(b => b !== appBox);
      const app = add(appBox, Bodies.rectangle(appBox.x, appBox.y, appBox.w, appBox.h, { friction: 0.8, density: 0.0012, frictionAir: 0.03 }), { kind: 'app' });
      balloons.forEach((b, i) => {
        const it = add(b, Bodies.circle(b.x, b.y, b.w / 2, { friction: 0.2, restitution: 0.3, density: 0.0002, frictionAir: 0.05 }), { kind: 'balloon' });
        const ax = (i / (balloons.length - 1) - 0.5) * appBox.w * 0.86, pa = { x: 0, y: b.w / 2 }, pb = { x: ax, y: -appBox.h / 2 };
        const len = Math.hypot(b.x + pa.x - (appBox.x + pb.x), b.y + pa.y - (appBox.y + pb.y));
        // Matter turns the points it is given as the bodies turn, so it gets its own copies
        it.string = Constraint.create({ bodyA: it.body, pointA: { ...pa }, bodyB: app.body, pointB: { ...pb }, length: len, stiffness: 0.35, damping: 0.12 });
        it.app = app; it.pb = pb; it.knot = b.w / 2 + 6; it.seg = len * 1.025 / ROPE;
        const a = { x: b.x, y: b.y + it.knot }, z = { x: appBox.x + pb.x, y: appBox.y + pb.y };
        it.rope = Array.from({ length: ROPE + 1 }, (_, k) => { const x = a.x + (z.x - a.x) * k / ROPE, y = a.y + (z.y - a.y) * k / ROPE; return { x, y, px: x, py: y }; });
        it.line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        Composite.add(world, it.string); links.push(it);
      });
      strings.replaceChildren(...links.map(l => l.line));
    }
    if (mode === 'tower') strings.replaceChildren();
    // CARLOS: not springs but weight. The base never moves. Platform and App are heavy, square and slow; they
    // lift straight up, stay over whatever is beneath them, and drop back down. Their motion is worked
    // out here by hand (see carlosStep), so the bodies are only there to be drawn and grabbed.
    const roles = ['app', 'platform', 'base'];
    const cs = right.map((b, n) => add(b, Bodies.rectangle(b.x, b.y, b.w, b.h + GAP, { isStatic: true, collisionFilter: { group: -7 } }), { kind: 'carlos', role: roles[n], ox: 0, vx: 0, yl: 0, yr: 0, vl: 0, vr: 0, cx: b.x, cy: b.y, ang: 0 }));
    items.forEach(it => { Object.assign(it.el.style, { position: 'absolute', left: '0', top: '0', width: it.w + 'px', height: it.h + 'px', margin: '0' }); });
    W = { engine, world, items, links, mode, drag: null, fallen: false, broken: false, darts: [], hits: [], cApp: cs[0], cPlat: cs[1], cBase: cs[2], floor: floorY - 2, frags: [], pops: 0, intact: mode === 'tower', lean: 0, microLevel: (items.find(i => i.micro) || { level: 99 }).level, N: Math.max(1, ...items.map(i => i.level || 0)), x: new Array(14).fill(0), v: new Array(14).fill(0), gust: new Array(14).fill(0), top: Math.min(...left.map(b => b.y)), cx: left.reduce((a, b) => a + b.x, 0) / left.length };
    paint(true); if (links.length) ropes(false); stage.classList.add('ready'); resetBtn.hidden = true;
    kick();
  }
  function rebuild() { // rebuild at home, then let each piece glide back from where it was lying
    if (panel.dataset.mode === 'services') return build(); // balloons and strings are simply put back
    const was = new Map([...stage.querySelectorAll('li')].map(el => [el, el.style.transform]));
    stage.classList.remove('resetting');
    build();
    for (const it of W.items) { const old = was.get(it.el); if (!old) continue; const target = it.el.style.transform; it.el.style.transform = old; it.home = target; }
    void stage.offsetWidth; stage.classList.add('resetting');
    for (const it of W.items) if (it.home) it.el.style.transform = it.home;
    W.hold = performance.now() + 600; // physics waits while they glide
    setTimeout(() => stage.classList.remove('resetting'), 650);
  }

  // ---- the loop: runs only while something is awake -------------------------------------------
  function paint(all) {
    for (const it of W.items) {
      if (!all && it.body.isSleeping) continue;
      const p = it.body.position;
      it.el.style.transform = `translate(${(p.x - (it.px ?? it.w / 2)).toFixed(2)}px, ${(p.y - it.h / 2).toFixed(2)}px) rotate(${it.body.angle.toFixed(4)}rad)`;
    }
  }
  // Strings are little Verlet ropes. Both ends are pinned every frame, to the balloon's knot and to the app,
  // so a string can sag and swing but can never come away. A popped balloon's string keeps its app end and drops.
  const knotOf = l => { const b = l.body, c = Math.cos(b.angle), s = Math.sin(b.angle); return { x: b.position.x - s * l.knot, y: b.position.y + c * l.knot }; };
  const tieOf = l => { const b = l.app.body, c = Math.cos(b.angle), s = Math.sin(b.angle); return { x: b.position.x + l.pb.x * c - l.pb.y * s, y: b.position.y + l.pb.x * s + l.pb.y * c }; };
  function relax(r, seg, a, z, move) { // one length of string: a and z are where its ends are pinned, if they are
    const n = r.length - 1;
    if (move) for (let k = a ? 1 : 0; k <= (z ? n - 1 : n); k++) { const p = r[k], vx = (p.x - p.px) * 0.94, vy = (p.y - p.py) * 0.94; p.px = p.x; p.py = p.y; p.x += vx; p.y = Math.min(W.floor, p.y + vy + 0.14); }
    for (let it = 0; it < 8; it++) {
      for (let k = 0; k < n; k++) {
        const p = r[k], q = r[k + 1], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, f = (d - seg) / d / 2;
        if (d > seg) { p.x += dx * f; p.y += dy * f; q.x -= dx * f; q.y -= dy * f; }
      }
      if (a) { r[0].x = a.x; r[0].y = a.y; }
      if (z) { r[n].x = z.x; r[n].y = z.y; }
    }
    let d = `M${r[0].x.toFixed(1)} ${r[0].y.toFixed(1)}`;
    for (let k = 1; k < n; k++) d += ` Q${r[k].x.toFixed(1)} ${r[k].y.toFixed(1)} ${((r[k].x + r[k + 1].x) / 2).toFixed(1)} ${((r[k].y + r[k + 1].y) / 2).toFixed(1)}`;
    return d + ` L${r[n].x.toFixed(1)} ${r[n].y.toFixed(1)}`;
  }
  function ropes(move) {
    for (const l of W.links) {
      l.line.setAttribute('d', relax(l.rope, l.seg, l.string ? knotOf(l) : null, tieOf(l), move));
      if (l.upper) l.upline.setAttribute('d', relax(l.upper, l.seg, knotOf(l), null, move)); // the piece a cut balloon carries off
    }
  }
  // A fast swipe across a string cuts it where the pointer crossed. The balloon leaves with the upper piece;
  // the lower piece stays tied to the app.
  const crosses = (a, b, c, d) => { // do segments a-b and c-d cross? returns how far along each, or null
    const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y, den = rx * sy - ry * sx;
    if (Math.abs(den) < 1e-6) return null; // parallel: they never cross
    const t = ((c.x - a.x) * sy - (c.y - a.y) * sx) / den, u = ((c.x - a.x) * ry - (c.y - a.y) * rx) / den;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
  };
  // One swipe does not cut. Each fast crossing counts against the string it crossed and makes it shiver; the count
  // drains away in about a second and a half. Four crossings of the same string in quick succession cut it: a
  // vigorous scrub across one string for about a second.
  const WEAR = 3.1, FAST = 700;
  function slice(from, to) {
    let best = null; // a swipe counts against one string only: the one it crosses nearest its own middle
    for (const l of W.links) {
      if (!l.string) continue;
      const n = l.rope.length - 1, tie = l.rope[n];
      for (let k = 0; k < n; k++) {
        const x = crosses(from, to, l.rope[k], l.rope[k + 1]);
        if (!x) continue;
        const cx = l.rope[k].x + (l.rope[k + 1].x - l.rope[k].x) * x.u, cy = l.rope[k].y + (l.rope[k + 1].y - l.rope[k].y) * x.u;
        if (Math.hypot(cx - tie.x, cy - tie.y) < 40) continue; // not the last bit, where they are all tied to the app
        const off = Math.abs(x.t - 0.5);
        if (!best || off < best.off) best = { l, k, u: x.u, off };
        break;
      }
    }
    if (!best) return;
    const l = best.l, r = l.rope, k = best.k, now = performance.now();
    if (now - (l.crossed || 0) < 70) return; // the string shivering back under the pointer is not another swipe
    l.crossed = now; l.wear = (l.wear || 0) + 1;
    // the shiver: a sideways flick where it was crossed, which travels along the string; bigger each time
    const dx = r[k + 1].x - r[k].x, dy = r[k + 1].y - r[k].y, d = Math.hypot(dx, dy) || 1, dir = (to.x - from.x) * (-dy / d) + (to.y - from.y) * (dx / d) > 0 ? 1 : -1, amp = 1.5 + l.wear * 1.2;
    for (const [i, w] of [[k - 1, 0.5], [k, 1], [k + 1, 1], [k + 2, 0.5]]) if (i > 0 && i < r.length - 1) { r[i].px -= dir * (-dy / d) * amp * w; r[i].py -= dir * (dx / d) * amp * w; }
    W.shiver = performance.now() + 900; kick();
    if (l.wear >= WEAR) { if (performance.now() - (W.cutAt || 0) > 1000) { W.cutAt = performance.now(); cut(l, k, best.u); } else l.wear = WEAR - 0.5; } // one cut, then a second before another
  }
  function cut(l, k, u) {
    const c = { x: l.rope[k].x + (l.rope[k + 1].x - l.rope[k].x) * u, y: l.rope[k].y + (l.rope[k + 1].y - l.rope[k].y) * u }, pt = () => ({ x: c.x, y: c.y, px: c.x, py: c.y });
    l.upper = l.rope.slice(0, k + 1).concat([pt()]); l.rope = [pt()].concat(l.rope.slice(k + 1));
    l.upline = document.createElementNS('http://www.w3.org/2000/svg', 'path'); strings.appendChild(l.upline);
    const snip = document.createElement('i'); snip.className = 'snip'; snip.style.left = c.x + 'px'; snip.style.top = c.y + 'px'; stage.appendChild(snip); setTimeout(() => snip.remove(), 320);
    l.wear = 0;
    snap(l);
  }
  // Darts. A click on a balloon throws one from the near edge; it homes on the balloon, so it never misses,
  // and the balloon pops when it lands. Then the dart drops, or sticks in the app if that is where it falls.
  const DART = '<svg viewBox="0 0 44 12" aria-hidden="true"><path d="M2 6h26" stroke-width="2.4"/><path class="tip" d="M28 6h14" stroke-width="1.4"/><path class="fl" d="M2 6 0 1h8l4 5-4 5H0z"/></svg>';
  function throwDart(it) {
    if (it.aimed) return;
    it.aimed = true;
    const el = document.createElement('i'); el.className = 'dart'; el.innerHTML = DART; stage.appendChild(el);
    const sr = stage.getBoundingClientRect();
    W.darts.push({ el, it, t: 0, phase: 'fly', sx: clamp(it.body.position.x + (Math.random() - 0.5) * 160, 20, sr.width - 20), sy: sr.height + 30, x: 0, y: 0, a: -1.57, vx: 0, vy: 0, va: 0 });
    kick();
  }
  function popBalloon(it) {
    burst(it);
    M.Composite.remove(W.world, it.string); M.Composite.remove(W.world, it.body); it.string = null;
    W.items = W.items.filter(i => i !== it); it.el.classList.add('popped');
    lose(it);
  }
  function darts() {
    for (const d of W.darts) {
      let scale = 1;
      if (d.phase === 'fly') {
        d.t += 1 / 11; // about 180 ms
        const k = Math.min(1, d.t), tx = d.it.body.position.x, ty = d.it.body.position.y, nx = d.sx + (tx - d.sx) * k, ny = d.sy + (ty - d.sy) * k - Math.sin(Math.PI * k) * 46;
        if (d.t > 1 / 11) d.a = Math.atan2(ny - d.y, nx - d.x);
        d.vx = nx - d.x; d.vy = ny - d.y; d.x = nx; d.y = ny; scale = 2.3 - 1.5 * k; // big and near, then small as it goes into the picture
        if (k >= 1) { d.phase = 'fall'; d.vx *= 0.25; d.vy = -2; d.va = (Math.random() - 0.5) * 0.3; if (d.it.string) popBalloon(d.it); }
      } else if (d.phase === 'fall') {
        d.vy += 0.5; d.x += d.vx; d.y += d.vy; d.a += d.va; scale = 0.8;
        const app = W.links.length && W.links[0].app.body;
        if (app && d.vy > 0 && M.Vertices.contains(app.vertices, { x: d.x, y: d.y })) { // it lands in the app, and stays there
          const o = rot(d.x - app.position.x, d.y - app.position.y, -app.angle); d.phase = 'stuck'; d.ox = o.x; d.oy = o.y; d.oa = 1.2 - app.angle;
        } else if (d.y > W.floor - 3) { d.y = W.floor - 3; d.phase = 'down'; d.a = Math.round(d.a / Math.PI) * Math.PI; }
      } else if (d.phase === 'stuck') {
        const app = W.links[0].app.body, o = rot(d.ox, d.oy, app.angle); d.x = app.position.x + o.x; d.y = app.position.y + o.y; d.a = d.oa + app.angle; scale = 0.8;
      } else scale = 0.8;
      d.el.style.transform = `translate(${(d.x - 42).toFixed(1)}px, ${(d.y - 6).toFixed(1)}px) rotate(${d.a.toFixed(3)}rad) scale(${scale.toFixed(2)})`;
    }
  }
  function lose(it) { // one balloon fewer, however it went: the app lurches and looks a little worse
    const app = it.app, side = Math.sign(it.pb.x) || 1;
    M.Body.setVelocity(app.body, { x: app.body.velocity.x, y: app.body.velocity.y + 2.2 }); M.Body.setAngularVelocity(app.body, app.body.angularVelocity + side * 0.035);
    W.pops++; for (let n = 1; n <= W.pops; n++) app.el.classList.add('hurt' + n);
    const job = it.el.dataset.job; if (['auth', 'database', 'webhooks'].includes(job)) app.el.classList.add('lost-' + job);
  }
  function snap(it) { // the string gives way: the balloon sails up and out, its string drops and dangles from the app
    M.Composite.remove(W.world, it.string); it.string = null; it.away = true; it.strain = 0;
    it.body.collisionFilter.mask = 0; // nothing in its way now
    if (W.drag && W.drag.it === it) { M.Composite.remove(W.world, W.drag.rope); it.el.classList.remove('held'); W.drag = null; }
    lose(it);
  }
  // Each balloon goes its own way, in keeping with its job. They share one language: a small flash, a few
  // scraps of rubber in the balloon's colour, and at most a handful of tiny line-drawn things.
  const ICON = {
    cylinder: '<ellipse cx="6" cy="3.500" rx="4" ry="1.800"/><path d="M2 3.500v5c0 1 1.800 1.800 4 1.800s4-.8 4-1.800v-5"/>',
    padlock: '<rect x="2.500" y="6" width="9" height="6.500" rx="1.200"/><path d="M4.500 6V4a2.500 2.500 0 0 1 4.800-1"/>',
    envelope: '<rect x="1" y="2.500" width="10" height="7" rx="1"/><path d="M1.500 3.500 6 7l4.500-3.500"/>',
    gear: '<circle cx="6" cy="6" r="2"/><path d="M6 1v2M6 9v2M1 6h2M9 6h2M2.500 2.500l1.400 1.400M8.100 8.100l1.400 1.400M9.500 2.500 8.100 3.900M3.900 8.100 2.500 9.500"/>',
    link: '<rect x="1.500" y="3.500" width="9" height="5" rx="2.500"/>',
  };
  function bit(cls, x, y, vx, vy, extra) { // one small thing set loose
    const el = document.createElement('i'); el.className = 'frag ' + cls;
    if (ICON[cls]) el.innerHTML = `<svg viewBox="0 0 12 ${cls === 'padlock' ? 14 : 12}" aria-hidden="true">${ICON[cls]}</svg>`;
    stage.appendChild(el);
    const f = Object.assign({ el, x, y, vx, vy, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.5, life: 60 + Math.random() * 25 }, extra); W.frags.push(f); return f;
  }
  function burst(it) {
    const p = it.body.position, colour = getComputedStyle(it.el).getPropertyValue('--c'), job = it.el.dataset.job, rnd = (a, b) => a + Math.random() * (b - a);
    const ring = (n, speed, make) => { for (let k = 0; k < n; k++) { const a = Math.PI * 2 * k / n + rnd(0, 0.6), v = speed * rnd(0.7, 1.3); make(Math.cos(a) * v, Math.sin(a) * v - 1.5, k); } };
    const rubber = n => ring(n, 4.5, (vx, vy) => { bit('', p.x, p.y, vx, vy).el.style.background = colour; });
    const flash = document.createElement('i'); flash.className = job === 'search' ? 'flash glint' : 'flash'; flash.style.left = p.x + 'px'; flash.style.top = p.y + 'px'; stage.appendChild(flash);
    setTimeout(() => flash.remove(), 420);
    if (job === 'hosting') { // let go: it shrinks and whizzes about before dropping
      bit('whizz', p.x, p.y, 0, -6, { whizz: 30, dir: -1.2, r: 0, vr: 0.5, life: 75 }).el.style.background = colour; rubber(2);
    } else if (job === 'database') { rubber(3); ring(7, 4, (vx, vy) => bit('cylinder', p.x, p.y, vx, vy)); } // a spray of little cylinders
    else if (job === 'auth') { rubber(4); bit('padlock', p.x, p.y, 0.6, -4.5, { r: 0, vr: 0.08, life: 80 }); } // a padlock springs open and falls
    else if (job === 'email') { rubber(3); ring(6, 2.6, (vx, vy, k) => bit('envelope', p.x, p.y, vx, vy - 1, { flutter: 1, r: rnd(-0.4, 0.4), vr: 0, ph: k, life: 85 })); } // a flutter of envelopes
    else if (job === 'payments') { rubber(3); ring(6, 2.8, (vx, vy, k) => bit(k % 3 ? 'coin' : 'slip', p.x, p.y, vx * 0.7, vy)); } // coins and a receipt or two, tumbling down
    else if (job === 'file-storage') { bit('crumple', p.x, p.y, rnd(-1, 1), -1.5, { vr: 0.12, life: 80 }).el.style.background = colour; rubber(2); } // screwed up like paper, and dropped
    else if (job === 'workers') { rubber(3); ring(4, 7.5, (vx, vy) => bit('gear', p.x, p.y, vx, vy, { vr: rnd(-0.9, 0.9) })); } // a few tiny gears pinging off
    else if (job === 'webhooks') { rubber(3); for (let k = 0; k < 5; k++) bit('link', p.x, p.y, 2.2 + k * 1.5, -5.5 + k * 1.1, { r: 0.6, vr: 0.25 + k * 0.05, life: 70 }); } // a chain whips out and comes apart
    else rubber(9); // search: a glint, then the classic burst
  }
  function scraps() {
    for (const f of W.frags) {
      let scale = '';
      if (f.whizz > 0) { f.whizz--; f.dir += (Math.random() - 0.5) * 1.9; f.vx = Math.cos(f.dir) * 8; f.vy = Math.sin(f.dir) * 8; scale = ` scale(${(0.35 + 0.65 * f.whizz / 30).toFixed(2)})`; if (f.y < 14) f.dir = Math.abs(f.dir); }
      else if (f.flutter) { f.vy = Math.min(f.vy + 0.07, 1.4); f.vx = Math.sin(f.life * 0.22 + f.ph) * 1.7; }
      else { f.vy += 0.28; f.vx *= 0.985; if (f.whizz === 0) scale = ' scale(0.35)'; }
      f.x += f.vx; f.y += f.vy; f.r += f.vr; f.life--;
      f.el.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) rotate(${f.r.toFixed(2)}rad)${scale}`; f.el.style.opacity = Math.min(1, f.life / 25);
      if (f.life <= 0) f.el.remove();
    }
    W.frags = W.frags.filter(f => f.life > 0);
  }
  // While nobody has pulled a brick out, the pile is a loose chain: each brick is sprung to the one below
  // and the one above, the bottom is fixed and the top is free. A push travels up it, the top flops last
  // and furthest, and the whole thing sways slowly and dies away. Damping acts between neighbours, so the
  // quick ripples go first and the slow wobble lingers; it grips a little harder when two bricks are
  // nearly still against each other, which gives a small hesitation at each end of a swing.
  const KC = 0.1, CR = 0.11, GUST = 0.011;
  function pose() {
    for (const it of W.items) {
      if (it.kind !== 'block') continue;
      const i = it.level, slip = W.x[i] - W.x[i - 1], N = W.N;
      M.Sleeping.set(it.body, false);
      let dx = W.x[i] + it.side * Math.abs(slip) * 0.3, ang = Math.max(-0.11, Math.min(0.11, slip * 0.016)); // the two on top also slide apart a little
      if (it.micro) { // the microservices never quite sit still, and rattle harder when the tower moves
        const t = performance.now() / 1000, r = 0.45 + Math.min(3, Math.abs(W.v[i]) * 2.5);
        dx += Math.sin(t * 31 + it.k * 2.1) * r * 0.6 + Math.sin(t * 17 + it.k) * r * 0.4; ang += Math.sin(t * 27 + it.k * 1.3) * 0.03 * r;
      } else if (i > W.microLevel) ang += Math.sin(performance.now() / 1000 * 13 + i) * 0.004; // and everything above rocks on them
      M.Body.setPosition(it.body, { x: it.hx + dx, y: it.hy });
      M.Body.setAngle(it.body, ang);
      M.Body.setVelocity(it.body, { x: 0, y: 0 }); M.Body.setAngularVelocity(it.body, 0);
    }
  }
  function sway() {
    const N = W.N, x = W.x, v = W.v, idle = Math.sin(performance.now() / 1000 * 2 * Math.PI / 6.4), a = new Array(N + 1).fill(0);
    for (let i = 1; i <= N; i++) {
      const up = i < N ? i + 1 : i, grip = 1 + 0.7 / (1 + ((v[i] - v[i - 1]) / 0.06) ** 2);
      a[i] = KC * (x[i - 1] - x[i]) + KC * (x[up] - x[i]) + CR * grip * (v[i - 1] - v[i]) + CR * (v[up] - v[i]) + 0.011 * (i / N) * idle + W.gust[i];
    }
    for (let i = 1; i <= N; i++) { v[i] += a[i]; x[i] += v[i]; W.gust[i] = 0; }
    W.lean = x[N];
    // it comes down if the top goes too far, or a brick slides most of the way off the one beneath it
    let gone = Math.abs(x[N]) > 62;
    for (const it of W.items) if (it.kind === 'block' && Math.abs(x[it.level] - x[it.level - 1]) > it.w * 0.3) gone = true;
    if (gone) return topple();
    pose();
  }
  function letGo() { // hand the pile to real physics: the cubes stop rattling and sit square first, so nothing is squeezed out
    W.intact = false;
    for (const it of W.items) if (it.micro) { M.Body.setPosition(it.body, { x: it.hx + W.x[it.level], y: it.hy }); M.Body.setAngle(it.body, 0); }
  }
  function topple() { // too far: let go, and real physics takes it from here
    letGo();
    for (const it of W.items) if (it.kind === 'block') M.Body.setVelocity(it.body, { x: W.v[it.level] * 1.2, y: 0 });
  }
  // "App backend" and "App frontend" are the fragile ones. A light knock cracks one; a hard landing, or a second
  // knock on a cracked one, breaks it along the crack into pieces that each keep their part of the label.
  function knock(body, other) {
    const it = body.plugin.item, o = other.plugin.item;
    if (!it || !it.breakable || it.gone) return;
    const hit = Math.hypot((it.pvx || 0) - (o ? o.pvx || 0 : 0), (it.pvy || 0) - (o ? o.pvy || 0 : 0));
    W.hits.push(+hit.toFixed(1));
    if (hit > 4 || (hit > 1.8 && it.cracked)) shatter(it, hit > 6 ? 3 : 2);
    else if (hit > 1.5) { it.cracked = true; it.el.style.setProperty('--cut', it.cut.toFixed(1) + 'px'); it.el.classList.add('cracked'); }
  }
  function shatter(it, n) {
    const b = it.body, w = it.w, h = it.h, cuts = n === 3 ? [0, w * 0.34, w * 0.67, w] : [0, it.cut, w], c = Math.cos(b.angle), s = Math.sin(b.angle);
    it.gone = true; W.broken = true;
    M.Composite.remove(W.world, b); W.items = W.items.filter(i => i !== it); it.el.classList.add('shattered');
    for (let k = 0; k < cuts.length - 1; k++) {
      const x0 = cuts[k], x1 = cuts[k + 1], px = (x0 + x1) / 2, el = it.el.cloneNode(true), dx = px - w / 2;
      const left = x0 === 0 ? ['0 0', '0 100%'] : [`${x0 + 3}px 0`, `${x0 - 4}px 35%`, `${x0 + 4}px 65%`, `${x0 - 2}px 100%`];
      const right = x1 === w ? ['100% 100%', '100% 0'] : [`${x1 - 2}px 100%`, `${x1 + 4}px 65%`, `${x1 - 4}px 35%`, `${x1 + 3}px 0`];
      el.classList.remove('shattered', 'cracked', 'held'); el.classList.add('piece'); el.setAttribute('aria-hidden', 'true');
      el.style.clipPath = `polygon(${left.concat(right).join(', ')})`; el.style.transformOrigin = `${px}px ${h / 2}px`;
      it.el.parentNode.appendChild(el);
      const body = M.Bodies.rectangle(b.position.x + dx * c, b.position.y + dx * s, x1 - x0, h + 4, { angle: b.angle, friction: 0.45, frictionStatic: 0.7, density: 0.001 });
      M.Body.setVelocity(body, { x: b.velocity.x + (k - (cuts.length - 2) / 2) * 1.8, y: b.velocity.y * 0.4 - 1.2 }); M.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.14);
      const piece = { el, body, w, h, px, hx: 0, hy: 0, kind: 'piece' }; body.plugin.item = piece; W.items.push(piece); M.Composite.add(W.world, body);
    }
    for (let k = 0; k < 6; k++) { // a few chips
      const el = document.createElement('i'), a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
      el.className = 'frag chip'; stage.appendChild(el);
      W.frags.push({ el, x: b.position.x + (Math.random() - 0.5) * w * 0.4, y: b.position.y, vx: Math.cos(a) * v, vy: -Math.abs(Math.sin(a) * v) - 1, r: 0, vr: (Math.random() - 0.5) * 0.6, life: 55 + Math.random() * 25 });
    }
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // The CARLOS plates are heavy slabs, held at the exact spot they were grabbed. Each end of a slab has its own
  // height. The hand's pull (limited strength, against gravity) is shared between the two ends by leverage: grab
  // near one end and that end comes up while the other stays down and pivots; grab the middle and it rises level.
  // Pulled sideways, the low end scrapes along the surface with friction. Let go and each end falls and stops dead.
  const GRAV = 0.9, HAND = 1.57, PULL = 0.06, rot = (x, y, a) => { const c = Math.cos(a), s = Math.sin(a); return { x: x * c - y * s, y: x * s + y * c }; };
  function impact(it, side, speed) { // dust only where an end lands, pushed outwards along the seam, as much as the drop deserves
    const n = speed < 3 ? 0 : speed < 6 ? 1 : 2, c = rot(side * (it.w / 2 - 2), it.h / 2 + 2, it.ang || 0);
    for (let k = 0; k < n; k++) {
      const d = document.createElement('i'); d.className = 'dust';
      d.style.left = (it.cx + c.x) + 'px'; d.style.top = (it.cy + c.y) + 'px';
      d.style.setProperty('--dx', side * (7 + speed * 1.6 + k * 9) + 'px'); d.style.setProperty('--s', (0.5 + speed / 14).toFixed(2)); d.style.animationDelay = k * 40 + 'ms';
      stage.appendChild(d); setTimeout(() => d.remove(), 650);
    }
    if (speed > 8) { stage.classList.remove('tremor'); void stage.offsetWidth; stage.classList.add('tremor'); } // the ground only shakes for a hard drop
  }
  function hold(it, d, mass, top) { // held: lift at the grab point, and drag
    const f = clamp(d.gx / it.w, -0.5, 0.5), at = it.yl * (0.5 - f) + it.yr * (0.5 + f);
    // The hand takes the weight of whatever it is lifting from the first frame, so there is no wait before it moves;
    // what is left of its strength (the same as before) sets how fast the slab rises.
    const want = clamp(d.ty, -30, top + 30) - at, up = want > 0.5 ? 1 : 0, pull = clamp(PULL * want, -0.3, HAND - GRAV * mass);
    const sl = Math.min(1, (0.5 - f) * 2), sr = Math.min(1, (0.5 + f) * 2); // how much of each end the hand carries
    it.vl = Math.min(2.4, (it.vl + pull * (0.5 - f) * 2 / mass - GRAV * (1 - sl * up)) * 0.75); it.vr = Math.min(2.4, (it.vr + pull * (0.5 + f) * 2 / mass - GRAV * (1 - sr * up)) * 0.75);
    for (const e of ['l', 'r']) { it['y' + e] += it['v' + e]; if (it['y' + e] <= 0) { it['y' + e] = 0; it['v' + e] = Math.max(0, it['v' + e]); } if (it['y' + e] >= top) { it['y' + e] = top; it['v' + e] = Math.min(0, it['v' + e]); } }
    // sideways: the hand pulls the grab point; whatever is still touching grips, then scrapes
    const g = rot(d.gx, d.gy, it.ang), fx = clamp(0.03 * (d.p.x - (it.cx + g.x)), -1.2, 1.2), touching = Math.min(it.yl, it.yr) < 0.5 ? 1 : 0.25;
    if (Math.abs(it.vx) < 0.05 && Math.abs(fx) < 0.42 * mass * touching) it.vx = 0;
    else it.vx += (fx - Math.sign(it.vx || fx) * 0.3 * mass * touching) / mass;
    it.vx *= 0.85; it.ox += it.vx;
  }
  function drop(it) { // not held: each end falls, faster and faster, and stops dead
    it.vx *= 0.7; it.ox += it.vx;
    for (const [e, side] of [['l', -1], ['r', 1]]) {
      if (it['y' + e] <= 0) continue;
      it['v' + e] -= GRAV; it['y' + e] += it['v' + e];
      if (it['y' + e] <= 0) { impact(it, side, -it['v' + e]); it['y' + e] = 0; it['v' + e] = 0; }
    }
  }
  const seat = (it, x0) => { // centre and angle of a slab, in a frame whose origin is the middle of the surface it rests on
    const a = Math.atan2(it.yr - it.yl, it.w), left = it.yl <= it.yr, c = rot(left ? it.w / 2 : -it.w / 2, -it.h / 2, -a);
    return { x: x0 + (left ? -it.w / 2 : it.w / 2) + c.x, y: -(left ? it.yl : it.yr) + c.y, ang: -a };
  };
  function carlosStep() {
    const A = W.cApp, P = W.cPlat, B = W.cBase, d = W.drag && W.drag.it.kind === 'carlos' ? W.drag : null, top = P.h + 4, px = P.ox;
    const riding = !(d && d.it === A) && A.yl + A.yr < 1;
    if (d && d.it === P) hold(P, d, riding ? 1.24 : 1.1, top); else drop(P);
    P.ox = clamp(P.ox, -(B.w - P.w) / 2, (B.w - P.w) / 2);
    if (d && d.it === A) hold(A, d, 1, top);
    else {
      A.ox += P.ox - px; // carried along
      const slope = Math.atan2(P.yr - P.yl, P.w);
      if (Math.abs(slope) > 0.07) A.vx += -Math.sin(slope) * 0.9; // on a steep enough tilt it slips towards the low end
      drop(A);
    }
    A.ox = clamp(A.ox, -(B.w - A.w) / 2, (B.w - A.w) / 2); // it can hang over the Platform, never past the base
    const p = seat(P, P.ox), a = seat(A, A.ox - P.ox);
    P.cx = P.hx + p.x; P.cy = P.hy + P.h / 2 + p.y; P.ang = p.ang;
    const up = rot(a.x, -P.h / 2 - 4 + a.y, P.ang);
    A.cx = P.cx + up.x; A.cy = P.cy + up.y; A.ang = P.ang + a.ang;
    for (const it of [A, P]) { M.Body.setPosition(it.body, { x: it.cx, y: it.cy }); M.Body.setAngle(it.body, it.ang); }
    return !!d || P.yl + P.yr + A.yl + A.yr > 0 || Math.abs(P.vx) > 0.02 || Math.abs(A.vx) > 0.02;
  }
  // Off screen the whole loop stops; it starts again when the panel comes back.
  new IntersectionObserver(es => { visible = es[es.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: '100px 0px' }).observe(stage);
  function tick() {
    raf = 0;
    if (!W || !visible || still()) return;
    if (W.hold > performance.now()) { // the tower is gliding home after a reset; the CARLOS plates must still answer at once
      carlosStep();
      for (const it of [W.cApp, W.cPlat]) { const p = it.body.position; it.el.style.transform = `translate(${(p.x - it.w / 2).toFixed(2)}px, ${(p.y - it.h / 2).toFixed(2)}px) rotate(${it.body.angle.toFixed(4)}rad)`; }
      return kick();
    }
    if (W.frags.length) scraps();
    if (W.darts.length) darts();
    if (W.mode === 'services') { // helium: together the balloons lift a little more than everything weighs
      const live = W.links.filter(l => l.string), all = W.links.length, total = W.items.filter(i => i.kind !== 'carlos').reduce((s, i) => s + i.body.mass, 0);
      const g = W.engine.gravity.y * W.engine.gravity.scale, each = total * g * 1.12 / all;
      for (const l of W.links) {
        const b = l.body;
        if (l.string || l.away) M.Body.applyForce(b, b.position, { x: 0, y: -each - b.mass * g * (l.away ? 3 : 0.2) });
        if (!l.string && !l.away) continue;
        // balloons may lean and sway a little, but they do not spin: the print stays the right way up
        M.Body.setAngularVelocity(b, (b.angularVelocity - b.angle * 0.03) * 0.85);
        if (Math.abs(b.angle) > 0.3) M.Body.setAngle(b, Math.sign(b.angle) * 0.3);
        if (l.away && b.position.y < -90) { M.Composite.remove(W.world, b); W.items = W.items.filter(i => i !== l); l.away = false; l.el.classList.add('popped'); if (l.upper) { l.upline.remove(); l.upper = null; } }
      }
      // With every balloon up, the app hangs level and steady. Each one lost takes some of that away, and by
      // the fourth it swings freely.
      const app = W.links[0].app.body, steady = clamp((live.length / all - 0.55) / 0.45, 0, 1);
      if (steady > 0 && !(W.drag && W.drag.it.kind === 'app')) {
        M.Body.setAngularVelocity(app, (app.angularVelocity - app.angle * 0.05 * steady) * (1 - 0.3 * steady));
        M.Body.setVelocity(app, { x: app.velocity.x * (1 - 0.22 * steady), y: app.velocity.y * (1 - 0.06 * steady) });
      }
      // A string only snaps when it is yanked about: stretched, with the hand moving fast, again and again.
      const d = W.drag;
      for (const l of live) { l.strain = (l.strain || 0) * 0.96; if (l.wear) l.wear = Math.max(0, l.wear - 1 / 90); }
      if (d && d.rope && d.it.kind === 'balloon' && d.it.string) {
        const l = d.it, stretch = Math.hypot(d.rope.pointA.x - l.body.position.x, d.rope.pointA.y - l.body.position.y); // how far the hand has got ahead of the balloon: the string is holding it back
        d.speed = (d.speed || 0) * 0.8;
        if (stretch > 22) l.strain += Math.min(3, (d.speed || 0) / 14);
        if (l.strain > 60) snap(l);
      }
    }
    if (W.intact) sway();
    if (!W.intact) for (const it of W.items) { it.pvx = it.body.velocity.x; it.pvy = it.body.velocity.y; } // speeds going into this step, for judging knocks
    M.Engine.update(W.engine, 1000 / 60);
    if (W.intact) pose();
    if (W.mode === 'services') for (const l of W.links) if ((l.string || l.away) && Math.abs(l.body.angle) > 0.3) { M.Body.setAngle(l.body, Math.sign(l.body.angle) * 0.3); M.Body.setAngularVelocity(l.body, 0); }
    const lifting = carlosStep();
    paint(W.intact);
    if (W.links.length) ropes(true);
    // has it come apart?
    let off = false;
    if (!W.intact) for (const it of W.items) {
      if (it.kind === 'block' && (Math.hypot(it.body.position.x - it.hx, it.body.position.y - it.hy) > 16 || Math.abs(it.body.angle) > 0.14)) off = true;
      if (it.kind === 'app' && it.body.position.y - it.hy > 26) off = true;
    }
    if (W.links.some(l => !l.string) || W.broken) off = true;
    W.fallen = off; resetBtn.hidden = !off;
    if (off && !W.drag && performance.now() - lastTouch > 20000) return rebuild(); // tidy up after twenty quiet seconds
    const awake = W.drag || lifting || W.items.some(it => !it.body.isStatic && !it.body.isSleeping);
    if (awake || off || W.shiver > performance.now() || W.frags.length || W.darts.some(d => d.phase === 'fly' || d.phase === 'fall') || (W.intact && visible)) kick();
  }
  function kick() { if (!raf && W && visible && !still()) raf = requestAnimationFrame(tick); }
  const wake = () => { if (W) { W.items.forEach(it => M.Sleeping.set(it.body, false)); kick(); } };

  // ---- pointer: wind, drag, pop ---------------------------------------------------------------
  const at = e => { const r = stage.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  let prev = null, prevT = 0;
  stage.addEventListener('pointermove', e => {
    if (still()) return;
    lastTouch = performance.now();
    if (!W) { load(ready); return; }
    const p = at(e);
    if (W.drag && !W.drag.rope) { const d = W.drag; d.p = p; d.ty = d.h0 + (d.y0 - p.y); kick(); return; } // CARLOS: the hand moves, the slab follows as it can
    if (W.drag) { const d = W.drag, step = Math.hypot(p.x - d.rope.pointA.x, p.y - d.rope.pointA.y); d.speed = (d.speed || 0) + step; d.rope.pointA = p; d.moved += Math.abs(e.movementX) + Math.abs(e.movementY); kick(); return; }
    // wind: the faster the pointer passes, and the nearer, the harder the push; higher blocks catch more of it
    if (W.mode === 'services' && prev && e.timeStamp > prevT && Math.hypot(p.x - prev.x, p.y - prev.y) / (e.timeStamp - prevT) * 1000 > FAST) slice(prev, p); // a fast swipe cuts
    prevT = e.timeStamp;
    const vx = prev ? Math.max(-45, Math.min(45, p.x - prev.x)) : 0; prev = p;
    if (Math.abs(vx) < 1.5) return;
    if (W.intact) { // wind: a nudge to whichever bricks the pointer passes near
      for (const it of W.items) if (it.kind === 'block') { const b = it.body.position, d = Math.hypot(b.x - p.x, b.y - p.y); W.gust[it.level] += vx * GUST / (1 + (d / 90) ** 2); }
      kick(); return;
    }
    for (const it of W.items) {
      if (it.kind === 'carlos' || it.kind === 'base') continue;
      const b = it.body, d = Math.hypot(b.position.x - p.x, b.position.y - p.y), near = 1 / (1 + (d / 110) ** 2);
      if (near < 0.05) continue;
      const k = it.kind === 'block' ? 0.00007 * (0.4 + (it.level || 0) / 9) : 0.000006; // balloons only stir when the pointer passes
      M.Sleeping.set(b, false);
      M.Body.applyForce(b, { x: b.position.x, y: b.position.y - it.h * 0.3 }, { x: vx * near * k * b.mass, y: 0 });
    }
    kick();
  });
  stage.addEventListener('pointerleave', () => { prev = null; });
  let grab = null; // a pointer that went down before the physics arrived
  stage.addEventListener('pointerdown', e => {
    if (still()) return;
    lastTouch = performance.now();
    const li = e.target.closest('li');
    if (!li || !stage.contains(li)) return;
    const begin = () => {
      const it = W.items.find(i => i.el === li);
      if (!it || it.kind === 'base' || it.role === 'base') return;
      if (it.kind === 'carlos') { const p0 = at(e), g = rot(p0.x - it.cx, p0.y - it.cy, -it.ang), f = clamp(g.x / it.w, -0.5, 0.5); W.drag = { it, rope: null, moved: 0, p: p0, y0: p0.y, gx: g.x, gy: g.y, h0: it.yl * (0.5 - f) + it.yr * (0.5 + f), ty: 0 }; W.drag.ty = W.drag.h0; try { stage.setPointerCapture(e.pointerId); } catch {} li.classList.add('held'); kick(); return; }
      const p = at(e), b = it.body, dx = p.x - b.position.x, dy = p.y - b.position.y, c = Math.cos(-b.angle), s = Math.sin(-b.angle);
      if (it.kind === 'block' && W.intact) letGo(); // a brick is being pulled: from here it is Jenga
      if (it.micro) for (const o of W.items) if (o.micro && o !== it) M.Body.setVelocity(o.body, { x: (Math.random() - 0.5) * 5, y: 0 }); // pull one and the rest scatter
      wake();
      const rope = M.Constraint.create({ pointA: p, bodyB: b, pointB: it.kind === 'balloon' ? { x: 0, y: 0 } : { x: dx * c - dy * s, y: dx * s + dy * c }, length: 0, stiffness: it.kind === 'carlos' ? 0.02 : 0.16, damping: 0.15 });
      M.Composite.add(W.world, rope);
      W.drag = { it, rope, moved: 0, id: e.pointerId };
      try { stage.setPointerCapture(e.pointerId); } catch {}
      li.classList.add('held'); kick();
    };
    e.preventDefault();
    if (W) return begin();
    const mine = grab = { id: e.pointerId };
    load(() => { ready(); if (grab === mine && W) { grab = null; begin(); } }); // let go before it arrived: no grab
  });
  const release = e => {
    if (grab && (!e || grab.id === e.pointerId)) grab = null;
    if (!W || !W.drag) return;
    const { it, rope, moved } = W.drag;
    if (rope) M.Composite.remove(W.world, rope); it.el.classList.remove('held'); W.drag = null;
    if (it.kind === 'balloon' && moved < 6 && it.string) throwDart(it); // a click, not a drag: a dart
    wake(); lastTouch = performance.now();
  };
  stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release);
  resetBtn.addEventListener('click', () => { lastTouch = performance.now(); rebuild(); });
  let rw = stage.clientWidth;
  addEventListener('resize', () => { if (W && stage.clientWidth !== rw) { rw = stage.clientWidth; build(); } });
  motion();
  window.__i1 = { get world() { return W; }, letGo: () => letGo(), crosses };
})();
