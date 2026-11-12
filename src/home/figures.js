// 🤖 "What you get": the three headline figures count to their values once, when the section scrolls into
// view (12× from 1, 20 ms down from 750, 80% from 0), over 1.2 s with an ease-out. The final figure is the
// real text in the page, so screen readers, readers without JavaScript and reduced motion get it as it is;
// the running number is a visual-only copy laid over it. A figure that is not "number + unit" is left alone.
(() => {
  const DURATION = 1200, ease = x => 1 - (1 - x) ** 3;
  const figs = [...document.querySelectorAll('.rw-fig[data-count-from]')].map(el => {
    const final = el.querySelector('.rw-fig-final'), run = el.querySelector('.rw-fig-run');
    const m = final && run && /^(\d+)(\D*)$/.exec(final.textContent.trim());
    const from = Number(el.dataset.countFrom);
    return m && Number.isFinite(from) ? { el, run, to: Number(m[1]), unit: m[2] || '', from } : null;
  }).filter(Boolean);
  if (!figs.length || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const show = (f, v) => { f.run.textContent = Math.round(v) + f.unit; };
  // Until the section is seen, the overlay holds the starting number, so nothing jumps when counting begins.
  figs.forEach(f => { show(f, f.from); f.el.classList.add('is-counting'); });
  const finish = () => figs.forEach(f => { f.el.classList.remove('is-counting'); f.run.textContent = ''; });
  const start = () => {
    let t0 = 0;
    const step = now => {
      if (!t0) t0 = now;
      const x = Math.min(1, (now - t0) / DURATION);
      figs.forEach(f => show(f, f.from + (f.to - f.from) * ease(x)));
      if (x < 1) requestAnimationFrame(step); else finish();
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return;
    io.disconnect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return finish();
    start();
  }, { threshold: 0.35 });
  io.observe(figs[0].el.closest('.rw-three') || figs[0].el);
})();
