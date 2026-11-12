// 🤖 Rotates the adjective in the hero's "A system for ___ web apps."
// Without this script, or under reduced motion, the line simply reads "better".
// Screen readers get the stable sentence beside it; the rotating copy is aria-hidden.
// The replay's Pause control stops the rotation too, so one control stills the whole hero.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // -ize where the reader's first language is US or Canadian English; -ise everywhere else.
  const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  const zed = /^en-(US|CA)\b/i.test(first);
  const localise = w => zed ? w.replace(/is(able|e|ed|ing|ation)$/, 'iz$1') : w;
  const HOLD = 2300, SWAP = 220;
  const pause = document.querySelector('.rp-pause input');
  document.querySelectorAll('.hv-rot').forEach(rot => {
    const words = rot.dataset.words.split(' ').map(localise);
    const word = rot.querySelector('.hv-rot-word');
    const line = rot.closest('.hv-ask') || rot.parentElement;
    let i = 0, paused = false;
    // Sheen: one soft pass of light across each word as it arrives.
    const sheen = () => { word.classList.remove('is-sheen'); void word.offsetWidth; word.classList.add('is-sheen'); };
    const fit = () => { rot.style.width = word.getBoundingClientRect().width + 'px'; };
    line.addEventListener('mouseenter', () => { paused = true; });
    line.addEventListener('mouseleave', () => { paused = false; });
    line.addEventListener('focusin', () => { paused = true; });
    line.addEventListener('focusout', () => { paused = false; });
    setInterval(() => {
      if (paused || (pause && pause.checked) || document.hidden || !rot.offsetParent) return;
      if (!rot.style.width) fit();
      word.classList.add('is-out');
      setTimeout(() => {
        i = (i + 1) % words.length;
        word.textContent = words[i];
        word.classList.remove('is-out');
        word.classList.add('is-in');
        fit();
        sheen();
        requestAnimationFrame(() => requestAnimationFrame(() => word.classList.remove('is-in')));
      }, SWAP);
    }, HOLD);
  });
})();
