// 🤖 "What kinds of apps can be built using CARLOS?": the apps carousel under the hero. Without this script the
// apps are a row that scrolls sideways and snaps to each one, and every app is a link. With it the row has no
// ends: a copy of every app sits on each side (hidden from screen readers and out of the tab order), and when the
// row comes to rest on a copy it jumps by exactly one set to the real app, the same picture, so nothing visibly
// moves. The current app sits in the middle with its neighbours peeking in, and a visit starts on a random app.
// Previous and next, a dot per app, swipe, trackpad and a mouse drag all move it, and it moves on by itself every
// 6 s. The move waits while the pointer is over the apps, while focus is in them, while the section is off screen
// and while the tab is hidden. It stops for good when someone presses Pause (WCAG 2.2.2), touches or drags the
// row, or picks an app with the buttons or dots; Play starts it again. Under reduced motion it never moves by
// itself, Pause is not shown, and every change jumps instead of gliding (it still loops). The status line names
// the real app and is announced only while nothing moves by itself.
(() => {
  const root = document.querySelector('.rw-apps[data-carousel]');
  const track = root && root.querySelector('.ap-track');
  const real = track ? [...track.querySelectorAll('.ap-slide')] : [];
  if (real.length < 2) return;
  const ctrl = root.querySelector('.ap-ctrl'), pause = root.querySelector('.ap-pause');
  const prev = root.querySelector('.ap-prev'), next = root.querySelector('.ap-next');
  const dotsBox = root.querySelector('.ap-dots'), dots = [...dotsBox.querySelectorAll('button')];
  const status = root.querySelector('.ap-status');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const DELAY = 6000, n = real.length;
  let index = -1, pos = n, timer = 0, settle = 0, resized = 0, stopped = false, hover = false, focus = false, seen = false;
  let drag = null, dragged = false;

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
  const arm = () => { clearTimeout(timer); timer = moving() ? setTimeout(() => step(1), DELAY) : 0; };
  const sync = () => {
    status.setAttribute('aria-live', moving() ? 'off' : 'polite');
    pause.hidden = reduce.matches;
    pause.textContent = stopped ? pause.dataset.play : pause.dataset.pause;
    arm();
  };
  const move = p => {
    pos = p;
    mark(p % n);
    track.scrollTo({ left: centre(p), behavior: reduce.matches ? 'instant' : 'smooth' });
    arm();
  };
  function step(d) { recentre(); move(pos + d); }
  const stop = () => { stopped = true; sync(); };

  // Where the row comes to rest (a swipe, a trackpad, a glide ending) is the current app.
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => {
      if (drag) return;
      pos = nearest();
      recentre();
      mark(pos % n);
      arm();
    }, 150);
  }, { passive: true });

  // A mouse can drag the row too; a drag is not a click on the app under it.
  track.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return stop();
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

  track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  track.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  track.addEventListener('focusin', () => { focus = true; sync(); });
  track.addEventListener('focusout', e => { if (!track.contains(e.relatedTarget)) { focus = false; sync(); } });
  pause.addEventListener('click', () => { stopped = !stopped; sync(); });
  prev.addEventListener('click', () => { stop(); step(-1); });
  next.addEventListener('click', () => { stop(); step(1); });
  // A dot goes the short way round the ring.
  dots.forEach((d, k) => d.addEventListener('click', () => { stop(); const ahead = ((k - pos % n) % n + n) % n; step(ahead > n / 2 ? ahead - n : ahead); }));
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.4 }).observe(track);
  } else seen = true;
  document.addEventListener('visibilitychange', sync);
  if (reduce.addEventListener) reduce.addEventListener('change', sync);
  // A new width moves every slide: put the current one back in the middle.
  addEventListener('resize', () => { clearTimeout(resized); resized = setTimeout(() => jump(centre(pos)), 100); });

  ctrl.hidden = dotsBox.hidden = false;
  root.classList.add('is-live');
  // A random app to start, in the middle of the row.
  pos = n + Math.floor(Math.random() * n);
  jump(centre(pos));
  mark(pos % n);
  status.textContent = ''; // nothing to announce on arrival
  sync();
})();
