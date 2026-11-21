// 🤖 The visitor's pile: a real list (<ul class="q-pile">, one <li> per brick, named for screen readers by quiz.js),
// laid out by CSS. Motion is decoration on top of that list. With motion allowed, Matter.js (the homepage's
// /home/matter-0.20.0.min.js, fetched in idle time, so usually cached) drops a new brick from the top of the stage, where
// it lands, rocks and goes to sleep, and tips a pulled brick off the floor while the bricks above settle. The recipe is
// the homepage tower's (src/home/stacks.js): sleeping bodies, the same friction and chamfer, a loop that runs only
// while something is awake. When it is all asleep the bricks ease into their CSS places. Until the engine arrives a
// CSS animation stands in; under reduced motion a brick simply appears or is gone.
const ENGINE = '/home/matter-0.20.0.min.js';
const TOP = 5;   // the brick's top face, drawn above its box by CSS

export function createPile(ul, { names, still }) {
  let M = null, loading = false, world = null, raf = 0;
  const byName = new Map();

  // Fetch the engine once, in idle time, unless motion is off.
  function preload() {
    if (M || loading || still()) return;
    loading = true;
    const go = () => { const s = document.createElement('script'); s.src = ENGINE; s.onload = () => { M = window.Matter; }; s.onerror = () => { loading = false; }; document.head.appendChild(s); };
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(go, { timeout: 2000 });
  }

  const li = name => {
    let el = byName.get(name);
    if (!el) { el = document.createElement('li'); el.className = 'q-brick'; el.dataset.thing = name; el.textContent = names[name] ?? name; byName.set(name, el); }
    return el;
  };
  const current = () => [...ul.children];

  // Stop the physics and let CSS place every brick, easing from where each one is drawn now (a FLIP).
  function settle(animate) {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    const was = animate ? new Map(current().map(el => [el, el.getBoundingClientRect()])) : null;
    world = null;
    for (const el of current()) { el.style.transform = ''; el.style.transition = ''; el.classList.remove('q-drop'); }
    if (!was) return;
    for (const [el, r] of was) {
      const n = el.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)'; el.style.transform = ''; }));
      el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
    }
  }

  // A world built from where CSS draws each brick right now; every body starts asleep.
  function build() {
    const { Engine, Bodies, Composite, Sleeping } = M;
    const engine = Engine.create({ enableSleeping: true, positionIterations: 12, velocityIterations: 10 });
    const box = ul.getBoundingClientRect();
    Composite.add(engine.world, Bodies.rectangle(box.left + box.width / 2, box.bottom + 10, box.width + 400, 20, { isStatic: true, friction: 1 }));
    const items = current().map(el => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top - TOP + (r.height + TOP) / 2;
      const body = Bodies.rectangle(x, y, r.width, r.height + TOP, { friction: 0.45, frictionStatic: 0.7, restitution: 0, density: 0.001, chamfer: { radius: 2 } });
      Composite.add(engine.world, body); Sleeping.set(body, true);
      return { el, body, x, y };
    });
    return { engine, items, bottom: box.bottom, started: performance.now() };
  }
  function tick() {
    raf = 0;
    if (!world) return;
    M.Engine.update(world.engine, 1000 / 60);
    let awake = false;
    for (const it of world.items) {
      const p = it.body.position;
      it.el.style.transform = `translate(${(p.x - it.x).toFixed(1)}px, ${(p.y - it.y).toFixed(1)}px) rotate(${it.body.angle.toFixed(3)}rad)`;
      if (it.leaving) { if (p.y > world.bottom + 160) { it.el.remove(); it.gone = true; } else awake = true; }
      else if (!it.body.isSleeping) awake = true;
    }
    world.items = world.items.filter(it => !it.gone);
    if (awake && performance.now() - world.started < 2600 && !still()) raf = requestAnimationFrame(tick);
    else { world.items.filter(it => it.leaving).forEach(it => it.el.remove()); settle(true); }
  }

  // Make the list say exactly `list` (bottom first). how: 'none' (just place them), 'drop' or 'leave' (animate what
  // was added or taken away).
  function show(list, how = 'none') {
    const want = new Set(list), had = new Set(current().map(el => el.dataset.thing));
    const leaving = current().filter(el => !want.has(el.dataset.thing)), adding = list.filter(n => !had.has(n));
    const moving = how !== 'none' && !still() && (leaving.length || adding.length);
    if (!moving) {
      leaving.forEach(el => el.remove());
      list.forEach(n => ul.appendChild(li(n)));   // appendChild moves an existing brick, so this also puts them in order
      settle(false);
      return;
    }
    settle(false);
    if (M) {
      // Pulled bricks stay in the list while they fall, so the world is built with them where they are.
      world = build();
      for (const it of world.items) {
        if (want.has(it.el.dataset.thing)) continue;
        it.leaving = true; it.el.setAttribute('aria-hidden', 'true');
        it.body.collisionFilter = { group: -1, category: 2, mask: 0 };
        M.Sleeping.set(it.body, false);
        M.Body.setVelocity(it.body, { x: (Math.random() < 0.5 ? -1 : 1) * 2.4, y: -6.5 });
        M.Body.setAngularVelocity(it.body, 0.09);
        // Everything above it wakes and settles into the gap.
        for (const o of world.items) if (!o.leaving && o.y < it.y - 2) M.Sleeping.set(o.body, false);
      }
      // The new order: what stays, then what was added, then the fallers, so they never hold a place in the layout.
      list.forEach(n => ul.appendChild(li(n)));
      leaving.forEach(el => ul.appendChild(el));
      // Each body stays where it was; its brick is drawn relative to its new CSS place.
      const place = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top - TOP + (r.height + TOP) / 2, w: r.width, h: r.height + TOP }; };
      for (const it of world.items) Object.assign(it, place(it.el));
      const top = ul.getBoundingClientRect().top;
      for (const n of adding) {
        const el = li(n), p = place(el), lift = Math.max(140, p.y - top + 60);
        const body = M.Bodies.rectangle(p.x, p.y - lift, p.w, p.h, { friction: 0.45, frictionStatic: 0.7, restitution: 0, density: 0.001, chamfer: { radius: 2 }, angle: (Math.random() - 0.5) * 0.12 });
        M.Composite.add(world.engine.world, body);
        world.items.push({ el, body, x: p.x, y: p.y });
      }
      tick();
      return;
    }
    // The engine is not here yet: CSS does a simpler version of the same.
    for (const el of leaving) { el.setAttribute('aria-hidden', 'true'); el.classList.add('q-leave'); setTimeout(() => { el.remove(); settle(true); }, 460); }
    for (const n of adding) { const el = li(n); el.classList.add('q-drop'); ul.appendChild(el); }
  }
  // The ending: every brick that is left drops into one block. Returns the point it gathers at (page coordinates).
  function gather() {
    settle(false);
    const els = current(); if (!els.length) return null;
    const box = ul.getBoundingClientRect(), cx = box.left + box.width / 2, cy = box.bottom - 14;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      el.style.transition = still() ? 'none' : 'transform .5s cubic-bezier(.5,0,.75,0), opacity .5s';
      el.style.transform = `translate(${cx - (r.left + r.width / 2)}px, ${cy - (r.top + r.height / 2)}px) scale(.35)`;
      el.style.opacity = '0';
    }
    return { x: cx, y: cy };
  }
  function ungather() { for (const el of current()) { el.style.opacity = ''; } settle(false); }
  return { show, settle: () => settle(false), preload, gather, ungather };
}
