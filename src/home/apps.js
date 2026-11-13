// 🤖 "What kinds of apps can be built using CARLOS?": the apps carousel under the hero. Without this script the
// apps are a flat row that scrolls sideways and snaps to each one, and every app is a link.
// With it the row has no ends: a copy of every app sits on each side (hidden from screen readers and out of the
// tab order), and when the row comes to rest on a copy it jumps by exactly one set to the real app, the same
// picture, so nothing visibly moves. The current app sits in the middle and a visit starts on a random app.
// Previous and next, a dot per app (the short way round), a drag from anywhere on the stage (mouse, finger or pen,
// with momentum), a trackpad, a click on an app beside the middle one, and the arrow keys or Tab with focus in the
// row move it (focus follows the app in the middle). Only each app's address is a link; the screenshot is not. It also moves on by itself, slowly: every 10 s,
// with a long, eased turn. That waits while the pointer is over the apps, while focus is in them, while the
// section is off screen and while the tab is hidden, and stops for good when someone presses the quiet pause
// beside the dots (WCAG 2.2.2), touches or drags the row, or picks an app; play starts it again. The status line
// names the real app and is announced only while nothing moves by itself.
// Depth, seen from inside the ring: the apps beside the middle one turn away in perspective, drawn in, smaller
// and dimmer, and turn to face you as they reach the middle. It follows the scroll position (a glide, a swipe, a
// drag), one frame at a time, writing only transform and opacity; the middle app has no transform at all.
// The pop: once an app comes to rest in the middle the whole card (screenshot, name, line and link) eases forward
// by 13%. Slides are laid out at that popped size and drawn at rest 1/1.13 smaller, so the popped card has no
// transform at all and its text is drawn sharp, never a scaled picture of text. Before the row moves on by itself
// or for a button, a dot or a key, the card first eases back (0.2 s), then the row turns; a touch or a drag takes
// it back straight away, nothing pops while the row is held, and the next app pops when it has settled.
// Under reduced motion the row stays flat, nothing pops, it never moves by itself (no pause shown) and every move
// jumps instead of gliding (it still loops).
(() => {
  const root = document.querySelector('.rw-apps[data-carousel]');
  const track = root && root.querySelector('.ap-track');
  const real = track ? [...track.querySelectorAll('.ap-slide')] : [];
  if (real.length < 2) return;
  const ctrl = root.querySelector('.ap-ctrl'), play = root.querySelector('.ap-play');
  const prev = root.querySelector('.ap-prev'), next = root.querySelector('.ap-next');
  const dotsBox = root.querySelector('.ap-dots'), dots = [...dotsBox.querySelectorAll('button')];
  const status = root.querySelector('.ap-status');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const DELAY = 10000, TURN_MS = 1600, STEP_MS = 520, SINK_MS = 200, n = real.length;
  let index = -1, pos = n, timer = 0, settle = 0, resized = 0, stopped = false, hover = false, focus = false, seen = false;
  let drag = null, dragged = false, frame = 0, glider = 0, geo = [], half = 0, stepW = 1;
  let up = null, waiting = 0, owed = 0, owedMs = STEP_MS, auto = false; // auto: the move under way is the row's own
  let off = true; // until the ring has started (and for good if this browser cannot run it): the plain row stays

  const copy = slide => {
    const c = slide.cloneNode(true);
    c.classList.add('is-copy');
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
    return c;
  };
  // The copies go in only when the ring starts (positions n to 2n - 1 are then the real apps), so a page where it
  // never starts keeps the plain row exactly as it was.
  let before = [], after = [], all = real;

  const centre = p => all[p].offsetLeft + all[p].offsetWidth / 2 - track.clientWidth / 2;
  const nearest = () => {
    let best = 0, gap = Infinity;
    for (let p = 0; p < all.length; p++) { const d = Math.abs(centre(p) - track.scrollLeft); if (d < gap) { gap = d; best = p; } }
    return best;
  };
  // Straight there. Not scrollTo({ behavior: 'instant' }): older Safari knows only 'auto' and 'smooth' and throws on
  // it, which left the ring flat; the live row has scroll-behavior: auto (home/apps.css), so this is instant.
  const jump = left => { track.scrollLeft = left; };

  // Depth. Slide centres are measured once (and again on resize), so a frame reads only scrollLeft.
  const TURN = 30, SHRINK = 0.1, DIM = 0.42, PULL = 0.15, REST = 1 / 1.13; // REST: every card's size until it pops
  const measure = () => {
    geo = all.map(s => s.offsetLeft + s.offsetWidth / 2);
    half = track.clientWidth / 2;
    stepW = geo[1] - geo[0] || 1;
  };
  let drawn = all.map(() => ''); // each slide's last drawing, so a frame writes only what changed
  const put = (p, transform, opacity) => {
    const key = transform + '|' + opacity;
    if (drawn[p] === key) return;
    drawn[p] = key;
    all[p].style.transform = transform; all[p].style.opacity = opacity;
  };
  const paint = () => {
    frame = 0;
    if (off) return;
    if (reduce.matches) return all.forEach((s, p) => put(p, '', ''));
    const mid = track.scrollLeft + half, depth = Math.round(stepW * 2.4);
    for (let p = 0; p < all.length; p++) {
      if (all[p] === up) { put(p, '', ''); continue; } // popped: no transform at all, wherever a fraction of a pixel left it
      const o = (geo[p] - mid) / stepW, far = Math.min(2.5, Math.abs(o)), a = Math.min(1, far);
      if (Math.abs(o) > 3) { put(p, `scale(${REST.toFixed(4)})`, ''); continue; } // out of sight
      if (a < 0.002) { put(p, `scale(${REST.toFixed(4)})`, ''); continue; } // facing you, at rest
      const side = o < 0 ? -1 : 1;
      // drawn in towards the middle so two neighbours show on each side, turned away, smaller and dimmer
      put(p, `translateX(${(-side * PULL * stepW * far).toFixed(1)}px) perspective(${depth}px) rotateY(${(-side * a * TURN).toFixed(2)}deg) scale(${((1 - SHRINK * a) * REST).toFixed(4)})`, (1 - DIM * a).toFixed(3));
    }
  };
  const draw = () => { if (!frame && !off) frame = requestAnimationFrame(paint); };

  // The pop: forward when an app has settled in the middle, back before the row moves on. The classes carry the
  // transitions (home/apps.css), so they ease only then and never lag behind the row as it turns.
  const sunk = new Map();
  const rise = p => {
    if (off || up === all[p]) return;
    sink();
    if (reduce.matches) return;
    up = all[p];
    up.classList.add('is-up');
    paint();
  };
  function sink() {
    if (!up) return;
    const s = up; up = null;
    s.classList.remove('is-up'); s.classList.add('is-sinking');
    clearTimeout(sunk.get(s)); sunk.set(s, setTimeout(() => s.classList.remove('is-sinking'), SINK_MS + 40));
    paint();
  }

  // The glide: scrollLeft eased over a set time, snapping off while it runs, so the turn is as calm as we choose
  // (slow for the row's own move, brisk for a press) and the depth above follows it frame by frame.
  // In and out for a turn from rest; out only when a drag lets go, so it carries on at the speed it was going.
  const EASE = { inOut: x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2), out: x => 1 - (1 - x) ** 3 };
  const halt = () => { if (glider) { cancelAnimationFrame(glider); glider = 0; auto = false; track.classList.remove('is-gliding'); } };
  const glide = (to, ms, curve = 'inOut') => {
    halt();
    if (reduce.matches || ms <= 0) return jump(to);
    // snapping off before the start is read, so the row is never pulled back to a snap point first
    track.classList.add('is-gliding');
    const from = track.scrollLeft, ease = EASE[curve];
    let t0 = 0;
    const tick = now => {
      if (!t0) t0 = now;
      const x = Math.min(1, (now - t0) / ms);
      track.scrollLeft = from + (to - from) * ease(x);
      if (x < 1) glider = requestAnimationFrame(tick);
      else { glider = 0; auto = false; track.classList.remove('is-gliding'); }
    };
    glider = requestAnimationFrame(tick);
  };

  // From a copy back to the real app by exactly one set's width: the same picture, so nothing visibly moves.
  const recentre = () => {
    if (pos >= n && pos < 2 * n) return;
    const to = pos < n ? pos + n : pos - n;
    jump(track.scrollLeft + centre(to) - centre(pos));
    pos = to;
  };
  const moving = () => !stopped && !reduce.matches && !hover && !focus && seen && !document.hidden;
  const mark = i => {
    if (i === index) return;
    index = i;
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    status.textContent = status.dataset.format.replace('{app}', real[i].dataset.name).replace('{n}', i + 1).replace('{total}', n);
  };
  const arm = () => { clearTimeout(timer); timer = !off && moving() ? setTimeout(() => go(1, TURN_MS, true), DELAY) : 0; };
  const sync = () => {
    if (!moving()) cancel();
    status.setAttribute('aria-live', moving() ? 'off' : 'polite');
    play.hidden = reduce.matches;
    const word = stopped ? play.dataset.play : play.dataset.pause;
    play.setAttribute('aria-label', word);
    play.setAttribute('title', word);
    play.classList.toggle('is-stopped', stopped);
    arm();
  };
  const move = (p, ms = STEP_MS, curve = 'inOut', own = false) => {
    pos = p;
    mark(((p % n) + n) % n);
    glide(centre(p), ms, curve);
    auto = own && !!glider;
    arm();
  };
  // Move d apps on: a glide still under way is finished where it was going, then the row goes on from there.
  const step = (d, ms, own) => { if (glider) { halt(); jump(centre(pos)); } recentre(); move(pos + d, ms, 'inOut', own); };
  // Every move we start: the popped screenshot eases back first; presses while it does add up.
  const go = (d, ms = STEP_MS, own = false) => {
    if (off) return;
    if (!own && auto) cancel(); // someone's own move replaces the row's
    owed += d; owedMs = ms; owedOwn = own && (!waiting || owedOwn);
    if (waiting) return;
    const flush = () => { waiting = 0; const k = owed; owed = 0; if (k) step(k, owedMs, owedOwn); };
    if (!up || reduce.matches) return flush();
    sink();
    waiting = setTimeout(flush, SINK_MS);
  };
  let owedOwn = false;
  // The row's own movement stops the moment it may not run (Pause, hover, focus, off screen, a hidden tab): a turn
  // still waiting is dropped and the card comes forward again; a turn under way settles on the nearest app.
  function cancel() {
    if (waiting && owedOwn) { clearTimeout(waiting); waiting = 0; owed = 0; owedOwn = false; rise(pos); }
    if (glider && auto) { halt(); const p = nearest(); move(p, 260, 'out'); }
  }
  const ahead = () => (((pos + owed) % n) + n) % n; // the app the row is on, or is about to go to
  const stop = () => { stopped = true; sync(); };

  // Where the row comes to rest (a swipe, a trackpad, the end of a glide) is the current app, and it pops.
  track.addEventListener('scroll', () => {
    if (off) return;
    draw();
    // the row moving under someone's own hand (a trackpad, a wheel): the screenshot goes back at once
    if (up && !glider && !waiting && Math.abs(track.scrollLeft - centre(pos)) > 2) sink();
    clearTimeout(settle);
    settle = setTimeout(() => {
      if ((drag && drag.moved) || glider || waiting) return;
      pos = nearest();
      recentre();
      // the live row does not snap (home/apps.css): a trackpad or wheel that stopped between apps eases on to the nearest
      if (Math.abs(track.scrollLeft - centre(pos)) > 1) return move(pos, 320, 'out');
      mark(pos % n);
      rise(pos);
      arm();
    }, 150);
  }, { passive: true });

  // Taking hold of the row: a mouse, a finger or a pen drags it from anywhere on the stage, screenshots included.
  // A finger moving mostly up or down is left to scroll the page (touch-action: pan-y in home/apps.css). On release
  // the row carries on with the speed it was let go at and settles on the nearest app. A drag is never a click.
  const HOLD = 5;
  track.addEventListener('pointerdown', e => {
    if (off) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    halt();
    if (e.pointerType !== 'mouse') stop(); // a touch stops the row's own movement for good
    drag = { x: e.clientX, y: e.clientY, left: track.scrollLeft, id: e.pointerId, moved: false, seen: [[e.timeStamp || 0, e.clientX]] };
  });
  track.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved) {
      if (Math.abs(dx) <= HOLD && Math.abs(dy) <= HOLD) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; } // up or down: the page's, not ours
      drag.moved = true;
      if (glider || waiting) { clearTimeout(waiting); waiting = 0; owed = 0; owedOwn = false; halt(); }
      const was = track.scrollLeft; pos = nearest(); recentre(); drag.left += track.scrollLeft - was; drag.from = pos; // the same picture, one set over
      sink();
      track.classList.add('is-dragging');
      try { track.setPointerCapture(e.pointerId); } catch { /* the drag still works without capture */ }
      stop();
    }
    track.scrollLeft = drag.left - (e.clientX - drag.x);
    drag.seen.push([e.timeStamp || 0, e.clientX]);
    if (drag.seen.length > 12) drag.seen.shift();
  });
  // Letting go: one settle, straight on from exactly where the row is, at the speed it was going. Past about a
  // quarter of an app, or flicked, it goes on to the next (a hard flick further, up to three); otherwise back.
  const PAST = 0.28, FLICK = 0.45; // of an app's width; px per ms
  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    dragged = true; setTimeout(() => { dragged = false; }, 0);
    // the row's own speed when let go, px per ms (+ towards the next app): only the last 100 ms of movement counts, over
    // at least a frame, so holding still before letting go is no flick, however fast it moved before
    // (the move just before that window counts too, so a slow device's flick, a frame or more apart, still has two)
    const end = e.timeStamp || 0, last = d.seen.length - 1, fresh = last >= 0 && end - d.seen[last][0] <= 100;
    let from = last; while (from > 0 && end - d.seen[from - 1][0] <= 100) from--;
    if (from > 0) from--;
    const [t0, x0] = d.seen[from] || [0, 0], [t1, x1] = d.seen[last] || [0, 0];
    const speed = end && fresh && last > from ? -(x1 - x0) / Math.max(16, t1 - t0) : 0; // no times, or held still: no speed
    const now = track.scrollLeft, past = (now - centre(d.from)) / stepW;
    let k;
    if (Math.abs(speed) > FLICK) { const ahead = past + speed * 260 / stepW; k = Math.sign(speed) * Math.max(1, Math.round(Math.abs(ahead))); }
    else k = Math.sign(past) * Math.floor(Math.abs(past) + 1 - PAST);
    const p = d.from + Math.max(-3, Math.min(3, k)), dist = Math.abs(centre(p) - now);
    // an ease-out starts at three times its average speed: matched to the speed it was let go at, when heading on
    const heading = Math.sign(centre(p) - now) === Math.sign(speed) && Math.abs(speed) > 0.05;
    const ms = heading ? Math.max(220, Math.min(700, 3 * dist / Math.abs(speed))) : Math.max(240, Math.min(480, 240 + dist * 0.6));
    move(p, ms, 'out');
    track.classList.remove('is-dragging'); // only now: the glide already holds snapping off
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  // Only the address is a link. A click anywhere else on an app beside the middle one turns the ring to it;
  // on the middle one it does nothing.
  track.addEventListener('click', e => {
    const t = e.target;
    if (!t || !t.closest || t.closest('a')) return;
    const p = all.indexOf(t.closest('.ap-slide'));
    if (p < 0 || p % n === ahead()) return;
    stop();
    go(p - (pos + owed));
  });
  track.addEventListener('dragstart', e => e.preventDefault());

  // Left and right with focus in the row: move one app, and focus goes with it.
  track.addEventListener('keydown', e => {
    if (off) return;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    stop();
    go(e.key === 'ArrowLeft' ? -1 : 1);
    const link = real[ahead()].querySelector('a');
    if (link) link.focus({ preventScroll: true });
  });
  track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  track.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  // Focus anywhere in the carousel (an address, Previous, Next, a dot) holds it, and having come in, the row's own
  // movement stays stopped until Play is pressed (the APG carousel pattern). Focus on Play itself holds nothing, so
  // pressing it can start the row again.
  root.addEventListener('focusin', e => {
    if (off || e.target === play) { focus = false; sync(); return; }
    focus = true; stop();
  });
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget) || e.relatedTarget === play) { focus = false; sync(); } });
  // Tab reaches the addresses; the app whose address has focus turns to the middle.
  track.addEventListener('focusin', e => {
    if (off) return;
    const p = e.target && e.target.closest ? all.indexOf(e.target.closest('.ap-slide')) : -1;
    if (p < n || p >= 2 * n) return;
    const by = ((p - n - ahead()) % n + n) % n;
    if (by) go(by > n / 2 ? by - n : by);
  });
  play.addEventListener('click', () => { stopped = !stopped; sync(); });
  prev.addEventListener('click', () => { stop(); go(-1); });
  next.addEventListener('click', () => { stop(); go(1); });
  // A dot goes the short way round the ring.
  dots.forEach((d, k) => d.addEventListener('click', () => {
    stop();
    const by = ((k - ahead()) % n + n) % n;
    if (by) go(by > n / 2 ? by - n : by);
  }));
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.4 }).observe(track);
  } else seen = true;
  document.addEventListener('visibilitychange', sync);
  if (reduce.addEventListener) reduce.addEventListener('change', () => { halt(); if (reduce.matches) sink(); else rise(pos); sync(); draw(); });
  // A new width moves every slide: measure again and put the current one back in the middle.
  addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => { if (off) return start(); halt(); measure(); jump(centre(pos)); draw(); }, 100); });

  // ---- Starting. Only once the row is really laid out (the slides side by side at their width, the row wider than
  // the screen): measuring earlier, before the stylesheet has arrived on a quick or cached reload, gave nonsense
  // geometry and a flat ring. Until then, and if the layout never comes, it is simply the plain row. It checks now,
  // on the next frames, after load and fonts, and whenever the row changes size. It gives up for good only for a
  // capability this browser lacks, and says why (console.info, and data-ring on the section).
  const say = state => { root.dataset.ring = state; };
  const lacks = [typeof requestAnimationFrame === 'function' ? '' : 'requestAnimationFrame', typeof PointerEvent === 'function' ? '' : 'PointerEvent', typeof track.closest === 'function' ? '' : 'Element.closest'].filter(Boolean);
  let gaveUp = false;
  const giveUp = why => {
    gaveUp = true; off = true; clearTimeout(timer); halt();
    root.classList.remove('is-live');
    before.concat(after).forEach(c => c.remove()); before = []; after = []; all = real;
    real.forEach(s => { s.style.transform = ''; s.style.opacity = ''; s.classList.remove('is-up', 'is-sinking'); });
    track.scrollLeft = 0;
    ctrl.hidden = dotsBox.hidden = true;
    say(`off: ${why}`);
    if (typeof console === 'object') console.info(`CARLOS apps carousel: showing the plain row (${why})`);
  };
  const info = msg => { if (typeof console === 'object' && console.info) console.info(`CARLOS apps carousel: ${msg}`); };
  let seenAs = '';
  const laidOut = () => {
    const w = real[0].offsetWidth, d = real[1].offsetLeft - real[0].offsetLeft, sw = track.scrollWidth, cw = track.clientWidth;
    seenAs = `slide ${w}px, ${d}px apart, row ${sw}px in ${cw}px`;
    return w > 40 && d >= w && sw > cw + 10 && cw > 0;
  };
  let tries = 0, failures = 0;
  const t0 = typeof performance === 'object' ? performance.now() : 0;
  const since = () => (typeof performance === 'object' ? `${Math.round(performance.now() - t0)} ms` : `${tries} checks`);
  const start = () => {
    if (!off || gaveUp) return;
    try {
      // not laid out yet (the stylesheet still on its way): the plain row, and look again
      if (!laidOut()) { if (!tries++) info(`waiting for the row's layout (${seenAs})`); say(`waiting: ${seenAs}`); return; }
      before = real.map(copy); after = real.map(copy);
      track.prepend(...before);
      track.append(...after);
      all = before.concat(real, after);
      drawn = all.map(() => '');
      root.classList.add('is-live');
      off = false;
      // a random app to start, in the middle of the row, popped forward; the controls show only once it is drawn
      pos = n + Math.floor(Math.random() * n);
      measure();
      jump(centre(pos));
      paint();
      mark(pos % n);
      rise(pos);
      status.textContent = ''; // nothing to announce on arrival
      ctrl.hidden = dotsBox.hidden = false;
      sync();
      say('live');
      if (tries) info(`started after waiting ${since()} for the row's layout (${seenAs})`);
    } catch (err) {
      // something failed part-way: back to the plain row, and try again on the next look, a few times
      const why = `${err && err.name}: ${err && err.message}`;
      if (++failures >= 5) return giveUp(why);
      off = true; clearTimeout(timer); halt(); root.classList.remove('is-live');
      before.concat(after).forEach(c => c.remove()); before = []; after = []; all = real;
      real.forEach(s => { s.style.transform = ''; s.style.opacity = ''; s.classList.remove('is-up', 'is-sinking'); });
      ctrl.hidden = dotsBox.hidden = true;
      say(`retrying: ${why}`); info(`could not start (${why}; ${seenAs}), trying again`);
    }
  };
  if (lacks.length) giveUp(`this browser lacks ${lacks.join(', ')}`); // for good: nothing retries a give-up
  else {
    say('waiting');
    start();
    if (off) {
      requestAnimationFrame(() => requestAnimationFrame(start));
      addEventListener('load', start);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, () => {});
    }
    // a new size for the row (the stylesheet arriving, fonts, a new window width): start, or measure again
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (off) start(); else { measure(); jump(centre(pos)); draw(); } }).observe(track);
  }
})();
