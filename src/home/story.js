// 🤖 The story homepage, stage 1 (src/_includes/home-story.njk, src/home/story.css). Without this script, or under
// reduced motion, the page is a set of stills and loses nothing: the attributes are a plain list under the headline
// and each chapter shows its last step. With motion allowed it adds:
//  - the hero: "uncompromising" becomes a button that fizzes a little. About a second after load the attributes open
//    round the sun once, hold four seconds and close. Hover holds them open; keyboard focus opens them and Escape
//    closes them; a tap or a click plays them once more. The list is in the page throughout, for screen readers.
//  - the chapters: the picture sticks beside (or, on a phone, above) the text, and the step nearest the middle of the
//    screen sets data-step on its chapter. No scroll-jacking: the page scrolls as it always does.
// Always, motion or not: the chapters' buttons (poke the sun, try to read next door) and the bar that keeps the paste
// line one action away once the hero's box has scrolled off.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const moving = () => !reduce.matches;
  const hero = document.querySelector('.story-hero');
  const chapters = [...document.querySelectorAll('.ch[data-ch]')];
  const rails = [...document.querySelectorAll('.story-bar .rail-sun')];
  const told = n => rails.forEach(r => { if (r.dataset.ch === String(n)) r.classList.add('is-on'); });

  // ---------- the hero ----------
  if (hero) {
    const word = hero.querySelector('.unc');
    const sky = hero.querySelector('.sky-sun .sun');
    let button, hold = 0, hovered = false, focused = false;
    const open = () => { if (!hero.classList.contains('is-live')) return; hero.classList.add('is-open'); button.setAttribute('aria-expanded', 'true'); if (sky) sky.dataset.state = 'swell'; };
    const close = () => { clearTimeout(hold); hero.classList.remove('is-open'); if (button) button.setAttribute('aria-expanded', 'false'); if (sky) sky.dataset.state = 'rest'; };
    // Open, hold four seconds, close: unless a pointer or keyboard focus is still holding it open.
    const play = () => { open(); clearTimeout(hold); hold = setTimeout(() => { if (!hovered && !focused) close(); }, 4000); };
    const live = () => {
      if (hero.classList.contains('is-live') || !word) return;
      if (!button) {
        const text = word.textContent;
        const drift = [-1.5, 1, 0, 1.5, -1, 0.5, -1.5, 1.5, 0, -1, 1, -0.5, 1.5, -1];
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'unc';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', 'story-attrs');
        const said = document.createElement('span'); said.className = 'sr-only'; said.textContent = text;
        const shown = document.createElement('span'); shown.setAttribute('aria-hidden', 'true');
        [...text].forEach((c, i) => {
          const l = document.createElement('span'); l.className = 'unc-l'; l.textContent = c;
          l.style.setProperty('--o', drift[i % drift.length]); l.style.setProperty('--d', `${-((i * 0.83) % 3.4).toFixed(2)}s`);
          shown.append(l);
        });
        // At most six small rings at a time, in the first eight seconds; then one, every two seconds.
        const rings = document.createElement('span'); rings.className = 'unc-b'; rings.setAttribute('aria-hidden', 'true');
        [[6, 7, 0], [19, 4, 0.45], [33, 9, 0.9], [47, 5, 1.3], [61, 6, 1.75], [78, 8, 2.2], [52, 6, 0, 'slow']].forEach(([l, z, t, slow]) => {
          const i = document.createElement('i'); if (slow) i.className = 'slow';
          i.style.setProperty('--l', `${l}%`); i.style.setProperty('--z', `${z}px`); i.style.setProperty('--t', `${t}s`);
          rings.append(i);
        });
        button.append(said, shown, rings);
        button.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovered = true; open(); } });
        button.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovered = false; if (!focused) close(); } });
        // Keyboard focus opens it; a tap's focus does not (a tap plays it once, below).
        button.addEventListener('focus', () => { if (button.matches(':focus-visible')) { focused = true; open(); } });
        button.addEventListener('blur', () => { focused = false; if (!hovered) close(); });
        button.addEventListener('keydown', e => { if (e.key === 'Escape' && hero.classList.contains('is-open')) { focused = false; close(); } });
        button.addEventListener('click', () => { if (!hovered) play(); });
        word.replaceWith(button);
      }
      hero.classList.add('is-live');
    };
    const still = () => { close(); hero.classList.remove('is-live'); };
    if (moving()) {
      live();
      // By itself, once, about a second after the page settles.
      const once = () => setTimeout(() => { if (!hovered && !focused && moving()) play(); }, 1000);
      if (document.readyState === 'complete') once(); else addEventListener('load', once, { once: true });
    }
    reduce.addEventListener('change', () => { if (moving()) live(); else still(); });
    // Off screen, or in a hidden tab, nothing fizzes or breathes.
    const quiet = new Set();
    const mark = (el, off) => { el.classList.toggle('is-still', off || document.hidden); };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) quiet.delete(e.target); else quiet.add(e.target); mark(e.target, !e.isIntersecting); }));
      [hero, ...document.querySelectorAll('.story-u, .ch')].forEach(el => io.observe(el));
      document.addEventListener('visibilitychange', () => [hero, ...document.querySelectorAll('.story-u, .ch')].forEach(el => mark(el, quiet.has(el))));
    }
  }

  // ---------- the chapters ----------
  const sunIn = ch => ch.querySelector('.c1-sun .sun, .c2-divide');
  const timers = new WeakMap();
  const setStep = (ch, n) => {
    if (ch.dataset.step === String(n)) return;
    ch.dataset.step = String(n);
    if (n > 0) told(ch.dataset.ch);
    const sun = sunIn(ch);
    clearTimeout(timers.get(ch));
    if (!sun) return;
    // Chapter 1: it swells as the parts come in, and settles back. Chapter 2: it swells, then divides.
    const swellAt = ch.dataset.ch === '1' ? 2 : 1;
    if (n === swellAt) { sun.dataset.state = 'swell'; timers.set(ch, setTimeout(() => { sun.dataset.state = 'rest'; }, ch.dataset.ch === '1' ? 1300 : 450)); }
    else sun.dataset.state = 'rest';
  };
  const liveChapter = ch => {
    if (ch.classList.contains('is-live')) return;
    ch.classList.add('is-live');
    ch.dataset.step = '0';
    const steps = [...ch.querySelectorAll('.ch-step')];
    const io = new IntersectionObserver(es => es.forEach(e => {
      const n = Number(e.target.dataset.step);
      if (e.isIntersecting) setStep(ch, n);
      // Scrolled back above the first step: the picture goes back to where it began.
      else if (n === 1 && e.boundingClientRect.top > innerHeight / 2) setStep(ch, 0);
    }), { rootMargin: '-50% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
    ch._io = io;
  };
  const stillChapter = ch => {
    ch.classList.remove('is-live');
    delete ch.dataset.step;
    ch._io?.disconnect(); delete ch._io;
    const sun = sunIn(ch); if (sun) sun.dataset.state = 'rest';
  };
  if ('IntersectionObserver' in window) {
    if (moving()) chapters.forEach(liveChapter);
    reduce.addEventListener('change', () => chapters.forEach(moving() ? liveChapter : stillChapter));
    // Without motion the rail lights a chapter once it has been on screen.
    const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !moving()) told(e.target.dataset.ch); }), { threshold: 0.4 });
    chapters.forEach(ch => seen.observe(ch));
  }

  // The chapters' own actions, each also a button for keyboard and touch. Their result is said in words too.
  const say = (status) => { status.textContent = ''; requestAnimationFrame(() => { status.textContent = status.dataset.said; }); };
  chapters.forEach(ch => {
    const act = ch.querySelector('.ch-act'), status = ch.querySelector('.ch-status');
    if (!act) return;
    act.hidden = false;
    if (act.dataset.act === 'poke') {
      const sun = ch.querySelector('#c1-sun');
      let back = 0;
      // A poke: it squishes against nothing in particular and springs back. Nothing falls out.
      const poke = () => { if (!sun) return; clearTimeout(back); sun.dataset.state = 'squish'; back = setTimeout(() => { sun.dataset.state = 'rest'; }, 450); say(status); };
      act.addEventListener('click', poke);
      sun?.addEventListener('click', poke);
    } else if (act.dataset.act === 'try') {
      act.addEventListener('click', () => {
        if (ch.classList.contains('is-live')) {
          if (ch.dataset.step !== '3') setStep(ch, 3);
          ch.classList.add('is-retry'); void ch.offsetWidth; ch.classList.remove('is-retry');
        }
        say(status);
      });
    }
  });

  // ---------- the bar: the paste line, one action away ----------
  const bar = document.querySelector('.story-bar');
  const line = document.getElementById('home-prompt');
  const top = hero?.querySelector('.paste'), end = document.querySelector('.rw-end .paste');
  if (bar && line && top && 'IntersectionObserver' in window) {
    let past = false, atEnd = false, fade = 0;
    const show = () => {
      const on = past && !atEnd;
      if (on === !bar.hidden && on === bar.classList.contains('is-shown')) return;
      clearTimeout(fade);
      if (on) { bar.hidden = false; requestAnimationFrame(() => bar.classList.add('is-shown')); }
      else { bar.classList.remove('is-shown'); fade = setTimeout(() => { bar.hidden = true; }, moving() ? 300 : 0); }
    };
    new IntersectionObserver(es => es.forEach(e => { past = !e.isIntersecting && e.boundingClientRect.bottom < 0; show(); })).observe(top);
    if (end) new IntersectionObserver(es => es.forEach(e => { atEnd = e.isIntersecting; show(); })).observe(end);
    const copy = bar.querySelector('.story-bar-copy'), label = copy.querySelector('span'), status = bar.querySelector('.story-bar-status');
    let reset = 0;
    copy.addEventListener('click', async () => {
      clearTimeout(reset); status.textContent = '';
      try {
        await navigator.clipboard.writeText(line.textContent);
        label.textContent = copy.dataset.copied; status.textContent = copy.dataset.copySuccess;
        reset = setTimeout(() => { label.textContent = copy.dataset.original; status.textContent = ''; }, 4000);
      } catch {
        // The browser would not copy: take the reader to the line itself, selected, and say what to do.
        top.scrollIntoView({ block: 'center', behavior: moving() ? 'smooth' : 'auto' });
        const range = document.createRange(); range.selectNodeContents(line);
        const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        status.textContent = copy.dataset.copyFallback;
      }
    });
  }
})();
