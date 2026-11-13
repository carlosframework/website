// 🤖 The hero replay's speed (Paul, 2026-11-13): slower and faster buttons around a small readout, 0.5x, 1x, 1.5x
// or 2x of the reading-pace loop in home/hero.css. It changes the playback rate of the replay's own CSS animations
// in place (line reveals, the gaps between them and the app's pan alike), so nothing jumps; Pause still pauses.
// The choice lasts for the visit (sessionStorage). Without this script, or under reduced motion (where the replay
// is a still picture), the control stays hidden and the loop runs at 1x.
(() => {
  const rp = document.querySelector('.rp'), box = rp && rp.querySelector('.rp-speed');
  if (!box || typeof rp.getAnimations !== 'function') return;
  const slower = box.querySelector('.rp-slower'), faster = box.querySelector('.rp-faster'), out = box.querySelector('.rp-rate');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const RATES = [0.5, 1, 1.5, 2], KEY = 'carlos.replay.speed';
  let i = 1;
  try { const saved = RATES.indexOf(Number(sessionStorage.getItem(KEY))); if (saved >= 0) i = saved; } catch { /* storage off: 1x */ }
  const apply = () => {
    const rate = RATES[i];
    for (const a of rp.getAnimations({ subtree: true })) {
      if (typeof a.updatePlaybackRate === 'function') a.updatePlaybackRate(rate); else a.playbackRate = rate;
    }
    out.textContent = out.dataset.format.replace('{rate}', String(rate));
    // aria-disabled, not disabled: the button keeps focus at either end
    slower.setAttribute('aria-disabled', String(i === 0));
    faster.setAttribute('aria-disabled', String(i === RATES.length - 1));
  };
  const set = d => {
    const to = Math.max(0, Math.min(RATES.length - 1, i + d));
    if (to === i) return;
    i = to;
    try { sessionStorage.setItem(KEY, String(RATES[i])); } catch { /* this page only */ }
    apply();
  };
  slower.addEventListener('click', () => set(-1));
  faster.addEventListener('click', () => set(1));
  const show = () => { box.hidden = reduce.matches; if (!reduce.matches) apply(); };
  if (reduce.addEventListener) reduce.addEventListener('change', show);
  show();
})();
