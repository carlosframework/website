// 🤖 Rotates the adjective in the hero's "A system for ___ web apps."
// Without this script, or under reduced motion, the line simply reads "better".
// Screen readers get the stable sentence beside it; the rotating copy is aria-hidden.
// The replay's Pause control stops the rotation too, so one control stills the whole hero.
// Reduced motion switched on at any time stops it and puts "better" back.
// It also holds the hero's height steady (below).
(() => {
  // The hero keeps the height it is first laid out at, plus room for Copy's one-line note, so the note, a failed-copy
  // message or the opened hosts line grow the glass pane, never the hero or the background drawn in it, and nothing
  // below moves. Anything taller than that room overlaps the top of the next section, with the pane on top.
  // Measured once the page has finished loading, then again when the width changes or the window's height changes the
  // replay (a phone's address bar coming and going changes neither). Not sooner: WebKit can run this script before the page's later stylesheets
  // apply, and an unstyled hero (the replay's screenshot at full size) is thousands of pixels tall; locking that in
  // left Safari with a hero ten screens high.
  const hero = document.querySelector('.c-hero');
  if (hero) {
    let width = 0;
    // Side by side (64rem and wider), the text is centred in its half of the pane and the replay fills the other at
    // rest; each column is then held where and as tall as it rests, so the text growing below neither slides the
    // replay down, stretches it, nor moves the text's own top.
    const pane = hero.querySelector('.hv-pane'), cols = pane ? [...pane.children] : [], replay = hero.querySelector('.rp');
    // The replay's least height comes from the screen's height (small-viewport units, which a phone's toolbars do not
    // change), so a window made taller or shorter changes the hero's content: measure again then too. Copy's note and
    // the hosts line never change it, so they still grow only the pane.
    const least = () => replay ? parseFloat(getComputedStyle(replay).minHeight) || 0 : 0;
    let replayH = 0;
    const pin = () => {
      cols.forEach(c => ['align-self', 'margin-top', 'min-height'].forEach(k => c.style.removeProperty(k)));
      if (!pane || getComputedStyle(pane).gridTemplateColumns.trim().split(/\s+/).length < 2) return;
      const tops = cols.map(c => c.offsetTop), hs = cols.map(c => c.getBoundingClientRect().height), first = Math.min(...tops);   // offsetTop ignores the pane's drift
      cols.forEach((c, i) => { c.style.alignSelf = 'start'; c.style.marginTop = (tops[i] - first) + 'px'; c.style.minHeight = hs[i] + 'px'; });
    };
    const lock = force => {
      if (!force && hero.clientWidth === width) return;
      width = hero.clientWidth;
      hero.style.removeProperty('height');
      pin();
      const room = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.1;
      hero.style.height = Math.ceil(hero.getBoundingClientRect().height + room) + 'px';
      replayH = least();
    };
    if (document.readyState === 'complete') lock(true); else addEventListener('load', () => lock(true), { once: true });
    addEventListener('resize', () => { if (document.readyState === 'complete') lock(least() !== replayH); });
  }
  // -ize where the reader's first language is US or Canadian English; -ise everywhere else.
  const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  const zed = /^en-(US|CA)\b/i.test(first);
  const localise = w => zed ? w.replace(/is(able|e|ed|ing|ation)$/, 'iz$1') : w;
  const HOLD = 2300, SWAP = 220;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = document.querySelector('.rp-pause input');
  document.querySelectorAll('.hv-rot').forEach(rot => {
    const words = rot.dataset.words.split(' ').map(localise);
    const word = rot.querySelector('.hv-rot-word');
    const line = rot.closest('.hv-ask') || rot.parentElement;
    let i = 0, hovered = false, timer = 0, swap = 0;
    // Sheen: one soft pass of light across each word as it arrives.
    const sheen = () => { word.classList.remove('is-sheen'); void word.offsetWidth; word.classList.add('is-sheen'); };
    const fit = () => { rot.style.width = word.getBoundingClientRect().width + 'px'; };
    line.addEventListener('mouseenter', () => { hovered = true; });
    line.addEventListener('mouseleave', () => { hovered = false; });
    line.addEventListener('focusin', () => { hovered = true; });
    line.addEventListener('focusout', () => { hovered = false; });
    const step = () => {
      if (hovered || (pause && pause.checked) || document.hidden || !rot.offsetParent) return;
      if (!rot.style.width) fit();
      word.classList.add('is-out');
      swap = setTimeout(() => {
        swap = 0;
        i = (i + 1) % words.length;
        word.textContent = words[i];
        word.classList.remove('is-out');
        word.classList.add('is-in');
        fit();
        sheen();
        requestAnimationFrame(() => requestAnimationFrame(() => word.classList.remove('is-in')));
      }, SWAP);
    };
    const start = () => { if (!timer && !reduce.matches) timer = setInterval(step, HOLD); };
    const stop = () => {
      clearInterval(timer); clearTimeout(swap); timer = swap = 0; i = 0;
      word.textContent = words[0];
      word.classList.remove('is-out', 'is-in', 'is-sheen');
      rot.style.removeProperty('width');
    };
    reduce.addEventListener('change', () => { if (reduce.matches) stop(); else start(); });
    start();
  });
})();
