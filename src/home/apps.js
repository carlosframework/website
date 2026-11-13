// 🤖 "What kinds of apps can be built using CARLOS?": the apps carousel under the hero. Without this script the
// apps are a flat row that scrolls sideways and snaps to each one, and every app is a link.
// With it the row has no ends: a copy of every app sits on each side (hidden from screen readers and out of the
// tab order), and when the row comes to rest on a copy it jumps by exactly one set to the real app, the same
// picture, so nothing visibly moves. The current app sits in the middle and a visit starts on a random app.
// Previous and next, a dot per app (the short way round), swipe, trackpad, a mouse drag and the arrow keys with
// focus in the row move it (focus follows the app in the middle). It also moves on by itself, slowly: every 10 s,
// with a long, eased turn. That waits while the pointer is over the apps, while focus is in them, while the
// section is off screen and while the tab is hidden, and stops for good when someone presses the quiet pause
// beside the dots (WCAG 2.2.2), touches or drags the row, or picks an app; play starts it again. The status line
// names the real app and is announced only while nothing moves by itself.
// Depth, seen from inside the ring: the apps beside the middle one turn away in perspective, drawn in, smaller
// and dimmer, and turn to face you as they reach the middle. It follows the scroll position (a glide, a swipe, a
// drag), one frame at a time, writing only transform and opacity; the middle app has no transform at all.
// The pop: once an app comes to rest in the middle its screenshot eases forward (.is-up, in home/apps.css; the
// text under it is never scaled, so it stays sharp). Before the row moves on by itself or for a button, a dot or
// a key, the screenshot first eases back (200 ms), then the row turns; a touch or a drag takes it back at once,
// nothing pops while the row is held, and the next app pops when it has settled.
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
  let up = null, waiting = 0, owed = 0, owedMs = STEP_MS;

  const copy = slide => {
    const c = slide.cloneNode(true);
    c.classList.add('is-copy');
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('a').forEach(a => a.setAttribute('tabindex', '-1'));
    return c;
  };
  const before = real.map(copy), after = real.map(copy);
  track.prepend(...before);
  track.append(...after);
  const all = [...before, ...real, ...after]; // positions n to 2n - 1 are the real apps

  const centre = p => all[p].offsetLeft + all[p].offsetWidth / 2 - track.clientWidth / 2;
  const nearest = () => {
    let best = 0, gap = Infinity;
    for (let p = 0; p < all.length; p++) { const d = Math.abs(centre(p) - track.scrollLeft); if (d < gap) { gap = d; best = p; } }
    return best;
  };
  const jump = left => track.scrollTo({ left, behavior: 'instant' });

  // Depth. Slide centres are measured once (and again on resize), so a frame reads only scrollLeft.
  const TURN = 30, SHRINK = 0.1, DIM = 0.42, PULL = 0.15;
  const measure = () => {
    geo = all.map(s => s.offsetLeft + s.offsetWidth / 2);
    half = track.clientWidth / 2;
    stepW = geo[1] - geo[0] || 1;
  };
  const drawn = all.map(() => ''); // each slide's last drawing, so a frame writes only what changed
  const put = (p, transform, opacity) => {
    const key = transform + '|' + opacity;
    if (drawn[p] === key) return;
    drawn[p] = key;
    all[p].style.transform = transform; all[p].style.opacity = opacity;
  };
  const paint = () => {
    frame = 0;
    if (reduce.matches) return all.forEach((s, p) => put(p, '', ''));
    const mid = track.scrollLeft + half, depth = Math.round(stepW * 2.4);
    for (let p = 0; p < all.length; p++) {
      const o = (geo[p] - mid) / stepW, far = Math.min(2.5, Math.abs(o)), a = Math.min(1, far);
      if (Math.abs(o) > 3 || a < 0.002) { put(p, '', ''); continue; } // out of sight, or facing you
      const side = o < 0 ? -1 : 1;
      // drawn in towards the middle so two neighbours show on each side, turned away, smaller and dimmer
      put(p, `translateX(${(-side * PULL * stepW * far).toFixed(1)}px) perspective(${depth}px) rotateY(${(-side * a * TURN).toFixed(2)}deg) scale(${(1 - SHRINK * a).toFixed(4)})`, (1 - DIM * a).toFixed(3));
    }
  };
  const draw = () => { if (!frame) frame = requestAnimationFrame(paint); };

  // The pop: forward when an app has settled in the middle, back before the row moves on.
  const rise = p => {
    if (up === all[p]) return;
    sink();
    if (reduce.matches) return;
    up = all[p];
    up.classList.add('is-up');
  };
  function sink() { if (up) { up.classList.remove('is-up'); up = null; } }

  // The glide: scrollLeft eased over a set time, snapping off while it runs, so the turn is as calm as we choose
  // (slow for the row's own move, brisk for a press) and the depth above follows it frame by frame.
  const ease = x => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
  const halt = () => { if (glider) { cancelAnimationFrame(glider); glider = 0; track.classList.remove('is-gliding'); } };
  const glide = (to, ms) => {
    halt();
    if (reduce.matches || ms <= 0) return jump(to);
    const from = track.scrollLeft;
    let t0 = 0;
    track.classList.add('is-gliding');
    const tick = now => {
      if (!t0) t0 = now;
      const x = Math.min(1, (now - t0) / ms);
      track.scrollLeft = from + (to - from) * ease(x);
      if (x < 1) glider = requestAnimationFrame(tick);
      else { glider = 0; track.classList.remove('is-gliding'); }
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
  const arm = () => { clearTimeout(timer); timer = moving() ? setTimeout(() => go(1, TURN_MS), DELAY) : 0; };
  const sync = () => {
    status.setAttribute('aria-live', moving() ? 'off' : 'polite');
    play.hidden = reduce.matches;
    const word = stopped ? play.dataset.play : play.dataset.pause;
    play.setAttribute('aria-label', word);
    play.setAttribute('title', word);
    play.classList.toggle('is-stopped', stopped);
    arm();
  };
  const move = (p, ms = STEP_MS) => {
    pos = p;
    mark(p % n);
    glide(centre(p), ms);
    arm();
  };
  // Move d apps on: a glide still under way is finished where it was going, then the row goes on from there.
  const step = (d, ms) => { if (glider) { halt(); jump(centre(pos)); } recentre(); move(pos + d, ms); };
  // Every move we start: the popped screenshot eases back first; presses while it does add up.
  const go = (d, ms = STEP_MS) => {
    owed += d; owedMs = ms;
    if (waiting) return;
    const flush = () => { waiting = 0; const k = owed; owed = 0; if (k) step(k, owedMs); };
    if (!up || reduce.matches) return flush();
    sink();
    waiting = setTimeout(flush, SINK_MS);
  };
  const ahead = () => (((pos + owed) % n) + n) % n; // the app the row is on, or is about to go to
  const stop = () => { stopped = true; sync(); };

  // Where the row comes to rest (a swipe, a trackpad, the end of a glide) is the current app, and it pops.
  track.addEventListener('scroll', () => {
    draw();
    // the row moving under someone's own hand (a trackpad, a wheel): the screenshot goes back at once
    if (up && !glider && !waiting && Math.abs(track.scrollLeft - centre(pos)) > 2) sink();
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (drag || glider || waiting) return;
      pos = nearest();
      recentre();
      mark(pos % n);
      rise(pos);
      arm();
    }, 150);
  }, { passive: true });

  // Taking hold of the row stops its own movement for good; a mouse can drag it, and a drag is not a click.
  track.addEventListener('pointerdown', e => {
    halt();
    if (e.pointerType !== 'mouse') { sink(); return stop(); }
    if (e.button !== 0) return;
    pos = nearest(); recentre();
    drag = { x: e.clientX, left: track.scrollLeft, from: pos, id: e.pointerId, moved: false };
  });
  track.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      drag.moved = true;
      sink();
      track.classList.add('is-dragging');
      if (track.setPointerCapture) track.setPointerCapture(e.pointerId);
      stop();
    }
    track.scrollLeft = drag.left - dx;
  });
  const release = e => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    dragged = true; setTimeout(() => { dragged = false; }, 0);
    track.classList.remove('is-dragging');
    let p = nearest();
    const dx = e.clientX - d.x;
    if (p === d.from && Math.abs(dx) > 40) p += dx < 0 ? 1 : -1; // a short, deliberate drag still moves one app
    move(p);
  };
  track.addEventListener('pointerup', release);
  track.addEventListener('pointercancel', release);
  track.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); } }, true);
  track.addEventListener('dragstart', e => e.preventDefault());

  // Left and right with focus in the row: move one app, and focus goes with it.
  track.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    stop();
    go(e.key === 'ArrowLeft' ? -1 : 1);
    const link = real[ahead()].querySelector('a');
    if (link) link.focus({ preventScroll: true });
  });
  track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  track.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  track.addEventListener('focusin', () => { focus = true; sync(); });
  track.addEventListener('focusout', e => { if (!track.contains(e.relatedTarget)) { focus = false; sync(); } });
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
  addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => { halt(); measure(); jump(centre(pos)); draw(); }, 100); });

  ctrl.hidden = dotsBox.hidden = false;
  root.classList.add('is-live');
  // A random app to start, in the middle of the row, popped forward.
  pos = n + Math.floor(Math.random() * n);
  measure();
  jump(centre(pos));
  paint();
  mark(pos % n);
  rise(pos);
  status.textContent = ''; // nothing to announce on arrival
  sync();
})();
