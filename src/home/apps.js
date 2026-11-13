// 🤖 "What are people building using CARLOS?": the apps carousel under the hero. Without this script the apps
// are a row that scrolls sideways and snaps to each one, and every app is a link. With it: previous and next,
// a dot per app, and a slow move to the next app every 6 s. The move waits while the pointer is over the apps,
// while focus is in them, while the section is off screen and while the tab is hidden. It stops for good when
// someone presses Pause (WCAG 2.2.2), touches the row, or picks an app with the buttons or dots; Play starts it
// again. Under reduced motion it never moves by itself, Pause is not shown and changes jump instead of gliding.
// The status line is announced only while nothing moves by itself.
(() => {
  const root = document.querySelector('.rw-apps[data-carousel]');
  const track = root && root.querySelector('.ap-track');
  const slides = track ? [...track.querySelectorAll('.ap-slide')] : [];
  if (slides.length < 2) return;
  const ctrl = root.querySelector('.ap-ctrl'), pause = root.querySelector('.ap-pause');
  const prev = root.querySelector('.ap-prev'), next = root.querySelector('.ap-next');
  const dotsBox = root.querySelector('.ap-dots'), dots = [...dotsBox.querySelectorAll('button')];
  const status = root.querySelector('.ap-status');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const DELAY = 6000, n = slides.length;
  let index = 0, timer = 0, settle = 0, stopped = false, hover = false, focus = false, seen = false;

  const left = i => slides[i].offsetLeft - slides[0].offsetLeft;
  const nearest = () => {
    let best = 0;
    for (let i = 1; i < n; i++) if (Math.abs(left(i) - track.scrollLeft) < Math.abs(left(best) - track.scrollLeft)) best = i;
    return best;
  };
  const moving = () => !stopped && !reduce.matches && !hover && !focus && seen && !document.hidden;
  const mark = i => {
    index = i;
    dots.forEach((d, k) => d.setAttribute('aria-current', String(k === i)));
    status.textContent = status.dataset.format.replace('{app}', slides[i].dataset.name).replace('{n}', i + 1).replace('{total}', n);
  };
  const arm = () => { clearTimeout(timer); timer = moving() ? setTimeout(() => go(index + 1), DELAY) : 0; };
  const sync = () => {
    status.setAttribute('aria-live', moving() ? 'off' : 'polite');
    pause.hidden = reduce.matches;
    pause.textContent = stopped ? pause.dataset.play : pause.dataset.pause;
    arm();
  };
  function go(i) {
    i = (i + n) % n;
    mark(i);
    if (Math.abs(track.scrollLeft - left(i)) >= 1) track.scrollTo({ left: left(i), behavior: reduce.matches ? 'auto' : 'smooth' });
    arm();
  }
  const choose = i => { stopped = true; sync(); go(i); };

  // Where the row comes to rest (a swipe, a trackpad, a smooth scroll ending) is the current app.
  track.addEventListener('scroll', () => {
    clearTimeout(settle);
    settle = setTimeout(() => { const i = nearest(); if (i !== index) mark(i); arm(); }, 150);
  }, { passive: true });
  track.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { stopped = true; sync(); } });
  track.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hover = true; sync(); } });
  track.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hover = false; sync(); } });
  track.addEventListener('focusin', () => { focus = true; sync(); });
  track.addEventListener('focusout', e => { if (!track.contains(e.relatedTarget)) { focus = false; sync(); } });
  pause.addEventListener('click', () => { stopped = !stopped; sync(); });
  prev.addEventListener('click', () => choose(index - 1));
  next.addEventListener('click', () => choose(index + 1));
  dots.forEach((d, k) => d.addEventListener('click', () => choose(k)));
  if (typeof IntersectionObserver === 'function') {
    new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.4 }).observe(track);
  } else seen = true;
  document.addEventListener('visibilitychange', sync);
  if (reduce.addEventListener) reduce.addEventListener('change', sync);

  ctrl.hidden = dotsBox.hidden = false;
  root.classList.add('is-live');
  mark(nearest());
  status.textContent = ''; // nothing to announce on arrival
  sync();
})();
