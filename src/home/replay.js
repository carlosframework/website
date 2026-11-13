// 🤖 The hero replay ("Your agent"): real /start sessions played as chats, one per tab (Paul, 2026-11-13). Without
// this script the panel shows the first session as the CSS loop in home/hero.css (under reduced motion, its still
// picture) and every line is plain text. With it: tabs choose a session, which plays from the start; at the end of
// one the next begins (only while it plays: Pause, scrolling away or a hidden tab hold it, and reduced motion never
// moves on by itself, though the tabs still switch the picture). Each loop opens on a short loading screen; the
// person's lines type in a character at a time with a caret and a slightly uneven rhythm; before each agent
// message three dots think, then the message streams in a word at a time; scene two follows, then the app's page
// pans down. The lines keep their whole text in the page (unarrived text is only transparent), so screen readers
// read the session in the open tab as a whole.
// Speed: slower and faster around a readout, 0.5x to 2x, 1.5x unless this visit chose otherwise (sessionStorage).
// Steps: back and forward a turn at a time, pausing the replay (Play resumes); Left and Right do the same while the
// panel's controls have focus. The dots under the panel choose a session at any time and follow the APG tablist
// pattern (arrows, Home and End move and choose); the row under the title bar names the session showing.
(() => {
  // ---- the timeline, in ms at 1x: worked out once from the lines themselves
  const LOAD = 1100, GAP = 500, THINK = 1000, WORD = 65, READ = 300, SCENE = 450, HOLD = 1500, PAN = 5000, REST = 900, FADE = 600;
  // the person's typing: about 42 ms a character, uneven, with a beat after punctuation and between words
  const typing = text => { let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    return [...text].map(c => 42 * (0.55 + rnd() * 0.9) + (/[.,!?…]/.test(c) ? 160 : c === ' ' ? 25 : 0)); };
  function plan(turns) {
    let t = LOAD;
    const out = [];
    turns.forEach((turn, i) => {
      if (turn.kind === 'scene') { out.push({ ...turn, at: t }); t += SCENE; return; }
      if (turn.kind === 'app') { const on = t; out.push({ ...turn, at: on, pan: on + HOLD, panEnd: on + HOLD + PAN }); t = on + HOLD + PAN + REST; return; }
      const think = turn.kind === 'agent' ? THINK : 0, start = t + (i ? GAP : 0), from = start + think;
      // no Array.at here or anywhere in this file: older Safari (before 15.4) and Firefox (before 90) lack it
      const marks = turn.kind === 'you' ? typing(turn.text).reduce((acc, d) => (acc.push((acc.length ? acc[acc.length - 1] : 0) + d), acc), []) : turn.units.map((_, k) => (k + 1) * WORD);
      const shown = from + (marks.length ? marks[marks.length - 1] : 0), words = turn.text.split(/\s+/).filter(Boolean).length;
      // left alone long enough to read at about 200 words a minute, counting what was read as it arrived
      const done = shown + Math.max(700, words * READ - (shown - from) * (turn.kind === 'you' ? 0.6 : 0.3));
      out.push({ ...turn, at: start, from, marks, shown, done });
      t = done;
    });
    return { turns: out, fade: t, total: t + FADE };
  }
  // what the panel shows at time t: loading, the scene, each turn's state and how much of it, the pan, the fade
  function stateAt(tl, t) {
    const s = { loading: t < LOAD, scene2: false, ending: t >= tl.fade, pan: 0, appOn: false, turns: [] };
    for (const turn of tl.turns) {
      if (turn.kind === 'scene') { s.scene2 = t >= turn.at; continue; }
      if (turn.kind === 'app') { s.appOn = t >= turn.at; s.pan = Math.max(0, Math.min(1, (t - turn.pan) / PAN)); continue; }
      if (t < turn.at) { s.turns.push({ phase: 'hidden', count: 0 }); continue; }
      if (t < turn.from) { s.turns.push({ phase: 'thinking', count: 0 }); continue; }
      let count = 0; while (count < turn.marks.length && turn.marks[count] <= t - turn.from) count++;
      s.turns.push({ phase: count < turn.marks.length ? 'arriving' : 'shown', count });
    }
    return s;
  }
  // the moments a step can land on: the end of each turn, the app arriving and the end of its pan
  const stops = tl => tl.turns.flatMap(turn => turn.kind === 'scene' ? [] : turn.kind === 'app' ? [turn.at + 400, turn.panEnd] : [turn.shown]);
  globalThis.__rpTimeline = { plan, stateAt, stops, typing, LOAD, THINK, WORD, READ, PAN }; // for the tests

  const rp = document.querySelector('.rp'), stage = rp && rp.querySelector('.rp-stage');
  if (!stage) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pause = rp.querySelector('.rp-pause input');
  const speedBox = rp.querySelector('.rp-speed'), steps = rp.querySelector('.rp-steps');
  // the dots under the panel are the sessions' tablist; the row where the tabs were names the session showing
  const tabsBox = (rp.parentNode && rp.parentNode.querySelector('.rp-dotrow')) || null;
  const nowName = rp.querySelector('.rp-now-name'), nowCount = rp.querySelector('.rp-now-count');
  const slower = rp.querySelector('.rp-slower'), faster = rp.querySelector('.rp-faster'), out = rp.querySelector('.rp-rate');
  const back = rp.querySelector('.rp-back'), fwd = rp.querySelector('.rp-fwd');
  const panels = [...rp.querySelectorAll('.rp-session')], tabs = tabsBox ? [...tabsBox.querySelectorAll('[role="tab"]')] : [];
  if (!panels.length) return;

  // ---- the speed, as before: 0.5x to 2x, 1.5x unless this visit chose otherwise
  const RATES = [0.5, 1, 1.5, 2], KEY = 'carlos.replay.speed';
  let r = 2;
  try { const saved = RATES.indexOf(Number(sessionStorage.getItem(KEY))); if (saved >= 0) r = saved; } catch { /* storage off */ }
  const showRate = () => {
    out.textContent = out.dataset.format.replace('{rate}', String(RATES[r]));
    slower.setAttribute('aria-disabled', String(r === 0));
    faster.setAttribute('aria-disabled', String(r === RATES.length - 1));
  };
  const setRate = d => {
    const to = Math.max(0, Math.min(RATES.length - 1, r + d));
    if (to === r) return;
    r = to;
    try { sessionStorage.setItem(KEY, String(RATES[r])); } catch { /* this page only */ }
    showRate();
  };
  slower.addEventListener('click', () => setRate(-1));
  faster.addEventListener('click', () => setRate(1));

  // ---- the lines: the person's in characters, the agent's in words, each a span that is only transparent until it arrives
  const wrap = (el, unit) => {
    const spans = [], walk = node => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 1) { if (!child.classList.contains('rp-who')) walk(child); continue; }
        if (child.nodeType !== 3 || !child.nodeValue) continue;
        const frag = document.createDocumentFragment();
        for (const piece of unit === 'char' ? [...child.nodeValue] : child.nodeValue.split(/(\s+)/)) {
          if (!piece) continue;
          if (unit === 'word' && /^\s+$/.test(piece)) { frag.append(piece); continue; }
          const sp = document.createElement('span'); sp.className = unit === 'char' ? 'rp-c' : 'rp-w'; sp.textContent = piece;
          frag.append(sp); spans.push(sp);
        }
        child.replaceWith(frag);
      }
    };
    walk(el);
    return spans;
  };
  // ---- each session: its lines wrapped, its timeline, and how far it was last drawn
  const sessions = panels.map(el => {
    const turns = [];
    for (let k = 1; k <= 8; k++) {
      const li = el.querySelector(`.rp-s${k}`);
      if (!li) return null;
      const kind = li.classList.contains('rp-you') ? 'you' : 'agent';
      const text = [...li.childNodes].filter(c => !(c.classList && c.classList.contains('rp-who'))).map(c => c.textContent).join(' ').replace(/\s+/g, ' ').trim();
      turns.push({ li, kind, text, units: wrap(li, kind === 'you' ? 'char' : 'word') });
      if (k === 3) turns.push({ kind: 'scene' });
    }
    turns.push({ kind: 'app' });
    const tl = plan(turns), items = turns.filter(x => x.li).map(x => ({ ...x, lis: [...x.li.querySelectorAll('.rp-qs li')] }));
    return { el, tl, items, at: stops(tl), was: items.map(() => ({ phase: '', count: -1 })), last: {},
      scene1: el.querySelector('.rp-scene1'), app: el.querySelector('.rp-s9'), shot: el.querySelector('.rp-shot img') };
  });
  if (sessions.some(x => !x)) return;
  let cur = sessions[0];

  // the thinking dots, a row of their own in front of the agent message that is coming
  const think = document.createElement('li');
  think.className = 'rp-agent rp-think';
  think.innerHTML = `<span class="rp-who"></span><span class="rp-dots3"><i></i><i></i><i></i><span class="rp-sr"></span></span>`;
  think.firstChild.textContent = rp.querySelector('.rp-agent .rp-who').textContent;
  think.querySelector('.rp-sr').textContent = rp.dataset.thinking || '';
  const caret = document.createElement('span');
  caret.className = 'rp-caret'; caret.setAttribute('aria-hidden', 'true');
  // the loading screen: the window's frame with soft placeholder lines
  const loading = document.createElement('div');
  loading.className = 'rp-loading'; loading.setAttribute('aria-hidden', 'true');
  loading.innerHTML = '<span class="rp-pulse"></span><i></i><i></i><i></i>';
  loading.hidden = true;
  stage.prepend(loading);

  // ---- drawing a moment of the current session: only what changed since the last one
  const draw = (t, { fadeOut = false, of = cur } = {}) => {
    const S = of, s = stateAt(S.tl, t), last = S.last;
    if (S === cur && s.loading !== last.loading) loading.hidden = !s.loading;
    if (s.scene2 !== last.scene2) S.scene1.classList.toggle('is-off', s.scene2);
    if (s.appOn !== last.appOn) S.app.classList.toggle('is-on', s.appOn);
    if (S === cur && s.ending !== last.ending) stage.classList.toggle('is-ending', s.ending);
    if (s.pan !== last.pan && S.shot) { const p = s.pan < 0.5 ? 2 * s.pan * s.pan : 1 - (-2 * s.pan + 2) ** 2 / 2; S.shot.style.top = `${(p * 100).toFixed(2)}%`; S.shot.style.transform = `translateY(${(-p * 100).toFixed(2)}%)`; }
    let typingAt = null;
    s.turns.forEach((st, i) => {
      const it = S.items[i], w = S.was[i];
      if (st.phase === 'thinking' && w.phase !== 'thinking') it.li.before(think);
      if (st.phase !== w.phase) it.li.classList.toggle('is-on', st.phase === 'arriving' || st.phase === 'shown');
      if (fadeOut && st.phase === 'hidden' && w.phase !== 'hidden') return; // its row fades first; draw() again clears it
      if (st.count !== w.count) {
        const lo = Math.min(st.count, Math.max(w.count, 0)), hi = Math.max(st.count, w.count);
        for (let k = lo; k < hi; k++) it.units[k].classList.toggle('on', k < st.count);
        it.lis.forEach(li => li.classList.toggle('on', !!li.querySelector('.on')));
      }
      if (it.kind === 'you' && st.phase === 'arriving') typingAt = st.count ? ['after', it.units[st.count - 1]] : ['before', it.units[0]];
      S.was[i] = st;
    });
    const thinking = s.turns.some(st => st.phase === 'thinking');
    if (!thinking && think.parentNode && (S === cur || S.el.contains(think))) think.remove();
    if (typingAt) { const [where, unit] = typingAt; if ((where === 'after' ? caret.previousSibling : caret.nextSibling) !== unit) unit[where](caret); }
    else if (caret.parentNode && (S === cur || S.el.contains(caret))) caret.remove();
    S.last = s;
  };

  // ---- the clock
  let t = 0, prev = 0, frame = 0, seen = true, live = false;
  const playing = () => live && !(pause && pause.checked) && seen && !document.hidden;
  const tick = now => {
    frame = 0;
    if (!playing()) { prev = 0; return; }
    if (ff) settleStep();
    if (prev) t += Math.min(100, now - prev) * RATES[r];
    prev = now;
    if (t >= cur.tl.total) { show(sessions[(sessions.indexOf(cur) + 1) % sessions.length]); return wake(); } // the next session
    draw(t);
    frame = requestAnimationFrame(tick);
  };
  const wake = () => { if (playing() && !frame) frame = requestAnimationFrame(tick); };

  // ---- steps: a turn at a time, and the replay paused. Forward plays just the next turn in place, quickly (it types
  // or streams as usual, about six times as fast); back fades out just the last turn. Nothing else moves.
  let ff = 0, ffTo = 0, cleared = 0;
  const settleStep = () => { if (ff) { cancelAnimationFrame(ff); ff = 0; t = ffTo; draw(t); } };
  const stopSteps = () => { if (ff) { cancelAnimationFrame(ff); ff = 0; } clearTimeout(cleared); };
  const jump = dir => {
    settleStep();
    clearTimeout(cleared);
    if (pause && !pause.checked) { pause.checked = true; pause.dispatchEvent(new Event('change', { bubbles: true })); }
    tip();
    const at = cur.at, to = dir > 0 ? at.find(x => x > t + 1) : [...at].reverse().find(x => x < t - 1);
    if (dir < 0 || to === undefined) {
      t = to === undefined ? (dir > 0 ? at[0] : 0) : to;
      draw(t, { fadeOut: true });
      cleared = setTimeout(() => draw(t), 220); // the faded row's text, cleared once it has gone
      return;
    }
    // from where the coming turn begins (no thinking pause on a step) to where it is whole
    const turn = cur.tl.turns.find(x => x.shown === to);
    const from = Math.max(t, turn ? turn.from : t), span = to - from, ms = Math.min(900, Math.max(350, span / 6));
    t = from; draw(t); ffTo = to;
    let t0 = 0;
    const run = now => {
      if (!t0) t0 = now;
      const x = Math.min(1, (now - t0) / ms);
      t = from + span * x; draw(t);
      ff = x < 1 ? requestAnimationFrame(run) : 0;
    };
    ff = requestAnimationFrame(run);
  };
  back.addEventListener('click', () => jump(-1));
  fwd.addEventListener('click', () => jump(1));
  rp.querySelector('.rp-bar').addEventListener('keydown', e => {
    if (!live || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    e.preventDefault();
    jump(e.key === 'ArrowLeft' ? -1 : 1);
  });
  // the icon's tooltip says what a press will do, as its hidden words do for screen readers
  const tip = () => { if (pause) pause.parentNode.title = (pause.checked ? rp.querySelector('.rp-pause-on') : rp.querySelector('.rp-pause-off')).textContent; };
  if (pause) pause.addEventListener('change', () => { tip(); wake(); });
  document.addEventListener('visibilitychange', wake);
  if (typeof IntersectionObserver === 'function') new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; wake(); }).observe(rp);

  // ---- the sessions' tabs: one open at a time; the one left is put back to its start, the one chosen plays from it
  const plain = S => { S.shot && (S.shot.style.top = '', S.shot.style.transform = ''); };
  function show(S, { focus = false } = {}) {
    if (S !== cur) {
      stopSteps();
      draw(0, { of: cur }); cur.last = {}; plain(cur);
      think.remove(); caret.remove();
      cur.el.hidden = true;
      cur = S;
    }
    S.el.hidden = false;
    tabs.forEach((tab, k) => { const on = sessions[k] === S; tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1; if (on && focus) tab.focus({ preventScroll: true }); });
    title(S);
    t = 0;
    if (live) { S.last = {}; draw(0); } else plain(S);
  }
  // The title row: the session's name and "n of N", crossfading quickly when it changes (at once under reduced motion).
  let titleSwap = 0;
  function title(S) {
    if (!nowName) return;
    const k = sessions.indexOf(S), tab = tabs[k];
    const name = tab ? (tab.getAttribute('aria-label') || tab.textContent) : nowName.textContent;
    const count = nowCount && nowCount.dataset.format ? nowCount.dataset.format.replace('{n}', k + 1).replace('{total}', sessions.length) : '';
    if (nowName.textContent === name) return;
    const put = () => { nowName.textContent = name; if (nowCount) nowCount.textContent = count; nowName.parentNode.classList.remove('is-swapping'); };
    clearTimeout(titleSwap);
    if (reduce.matches || !live) return put();
    nowName.parentNode.classList.add('is-swapping');
    titleSwap = setTimeout(put, 120);
  }
  tabs.forEach((tab, k) => {
    tab.addEventListener('click', () => {
      // choosing a session plays it, from the start
      if (pause && pause.checked) { pause.checked = false; pause.dispatchEvent(new Event('change', { bubbles: true })); tip(); }
      show(sessions[k]); wake();
    });
  });
  if (tabsBox) tabsBox.addEventListener('keydown', e => {
    const k = sessions.indexOf(cur), n = sessions.length;
    const to = { ArrowRight: (k + 1) % n, ArrowLeft: (k - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    show(sessions[to], { focus: true }); wake();
  });

  // ---- on, or back to the plain picture under reduced motion (the tabs still choose which)
  const start = () => {
    live = !reduce.matches;
    rp.classList.toggle('is-live', live);
    speedBox.hidden = steps.hidden = !live;
    if (tabsBox) tabsBox.hidden = sessions.length < 2;
    if (live) { cur.last = {}; showRate(); draw(t); wake(); return; }
    // the plain picture: nothing half-typed, no dots, no loading screen, the pan back to the CSS
    loading.hidden = true; think.remove(); caret.remove();
    plain(cur);
  };
  if (reduce.addEventListener) reduce.addEventListener('change', start);
  tip();
  // a random session to start each visit (without JavaScript it is the first, playing the CSS loop)
  show(sessions[Math.floor(Math.random() * sessions.length)]);
  start();
})();
