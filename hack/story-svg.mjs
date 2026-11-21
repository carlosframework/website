// 🤖 Build-time drawings for the story homepage, stage 1 (src/_includes/home-story.njk).
// The character is the drop-in from the sun-story spec (story-proposal-20261117 branch,
// docs/superpowers/specs/2026-11-21-sun-story/sun.js): four circles on one centre, every
// state a data-state that src/home/sun.css draws. It is ported here, not loaded in the
// browser, so a reader without JavaScript gets the same drawing. Words drawn inside a
// picture come from src/_data/story-copy.json and are escaped; every picture is
// decoration with its meaning said beside it (the figure's label).
const escapeHTML = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n = v => +(+v).toFixed(2);

// One sun, inside an <svg>. r is its ring; the body is 0.6 r, the core 0.23 r, the glow reaches 1.75 r.
// o.state, o.thick (the heavy ring), o.live (it breathes), o.cls (extra classes), o.id.
export function sun(cx, cy, r, o = {}) {
  const cls = ['sun', o.thick && 'is-walled', r < 10 && 'is-small', o.live && 'is-live', o.cls].filter(Boolean).join(' ');
  const glow = `<g class="sun-glow">${[1.75, 1.5, 1.28, 1.08].map(q => `<circle r="${n(r * q)}"/>`).join('')}</g>`;
  return `<g class="${cls}"${o.id ? ` id="${o.id}"` : ''} data-state="${o.state || 'rest'}" transform="translate(${n(cx)} ${n(cy)})">${glow}`
    + `<circle class="sun-pulse" r="${n(r)}"/><g class="sun-self"><circle class="sun-ring" r="${n(r)}"/>`
    + `<circle class="sun-body" r="${n(r * 0.6)}"/><circle class="sun-core" r="${n(r * 0.23)}"/></g></g>`;
}

// A live sun by itself: 200 units square with the ring at 57, which leaves room for the glow.
export function sunSVG(o = {}) {
  return `<svg class="sun-svg" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">${sun(0, 0, 57, { live: 1, ...o })}</svg>`;
}

// The hero's two faint orbits. They never turn; they fade in with the words.
export const heroOrbits = `<svg class="sky-orbits" viewBox="0 0 1040 250" preserveAspectRatio="none" aria-hidden="true" focusable="false"><ellipse class="orbit" cx="520" cy="125" rx="330" ry="88"/><ellipse class="orbit" cx="520" cy="125" rx="480" ry="120"/></svg>`;

// Where each attribute hangs round the hero's sun, from the storyboard's frame h2:
// x and y in % of the sky on a wide screen, then the same at 390 px, and the type size in px.
export const cloud = {
  secure: [6, 16, 24, 2, 4], private: [21, 58, 21, 0, 30], exciting: [3, 80, 20, 4, 78], accessible: [24, 4, 20, 30, 0],
  'lower-cost': [9, 44, 19, 2, 54], 'globally-distributed': [63, 4, 21, 42, 92], deployable: [80, 30, 22, 68, 30],
  decentralisable: [66, 56, 20, 56, 64], resilient: [86, 78, 23, 72, 6], lightweight: [62, 84, 19, 4, 92], open: [33, 86, 24, 76, 79],
};

// "What does uncompromising mean?": the usual app with its corners cut off, and the plain circle.
export function usualSVG(s) {
  const cut = [[90, 60, 132, 60, 90, 102], [310, 60, 268, 60, 310, 102], [310, 280, 310, 238, 268, 280], [90, 280, 90, 238, 132, 280]];
  return `<svg class="u-usual" viewBox="0 0 400 330" aria-hidden="true" focusable="false">`
    + `<polygon class="u-oct" points="132,60 268,60 310,102 310,238 268,280 132,280 90,238 90,102"/>`
    + cut.map(p => `<polygon class="u-cut" points="${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}"/>`).join('')
    + `<text class="u-name" x="200" y="176" text-anchor="middle">${escapeHTML(s('story.u.usual'))}</text>`
    + `<text class="lab" x="40" y="42">${escapeHTML(s('story.u.cut.accessibility'))}</text>`
    + `<text class="lab" x="360" y="42" text-anchor="end">${escapeHTML(s('story.u.cut.region'))}</text>`
    + `<text class="lab" x="40" y="310">${escapeHTML(s('story.u.cut.database'))}</text>`
    + `<text class="lab" x="360" y="310" text-anchor="end">${escapeHTML(s('story.u.cut.backups'))}</text></svg>`;
}
export function roundSVG() {
  return `<svg class="u-sun" viewBox="0 0 330 330" aria-hidden="true" focusable="false">${sun(165, 165, 88, { live: 1 })}</svg>`;
}

// A flat slab with a top and a side: one part of the usual pile.
function slab(x, y, w, h, rot) {
  const d = 8;
  return `<g transform="rotate(${rot} ${n(x + w / 2)} ${n(y + h / 2)})"><polygon class="slab-top" points="${x},${y} ${x + d},${n(y - d * 0.6)} ${x + w + d},${n(y - d * 0.6)} ${x + w},${y}"/>`
    + `<polygon class="slab-side" points="${x + w},${y} ${x + w + d},${n(y - d * 0.6)} ${x + w + d},${n(y + h - d * 0.6)} ${x + w},${y + h}"/><rect class="slab-front" x="${x}" y="${y}" width="${w}" height="${h}"/></g>`;
}

// Chapter 1, "Everything it needs is inside". Step 1: the pile of thirteen and the sun. Step 2: four of the parts
// glide into the ring and become points on an orbit, the rest fade, the sun swells. Step 3: it settles, labelled.
// Which four go in is the spec's default (round 1's ruling on the thirteen is still open): the frontend, the web
// server, the background workers and the database; everything else is what the platform does, or nothing needs.
export const INSIDE = [[1, 'interface', -125], [3, 'web', -55], [2, 'jobs', 55], [9, 'database', 125]];
export function insideSVG(s) {
  const cx = 480, cy = 330, r = 120, orbit = 96;
  const parts = Array.from({ length: 13 }, (_, i) => {
    const x = 20 + (i * 53 % 30), y = 150 + i * 31, w = 120 + (i * 37 % 40), h = 24, rot = i % 2 ? 2 : -2.5;
    const goes = INSIDE.find(([k]) => k === i);
    if (!goes) return `<g class="c1-rest">${slab(x, y, w, h, rot)}</g>`;
    const a = goes[2] * Math.PI / 180, px = cx + Math.cos(a) * orbit, py = cy + Math.sin(a) * orbit;
    const sx = x + w / 2, sy = y + h / 2;
    return `<g class="c1-part" style="--tx:${n(px - sx)}px;--ty:${n(py - sy)}px;--d:${INSIDE.indexOf(goes) * 90}ms">${slab(x, y, w, h, rot)}<circle class="c1-dot" cx="${n(sx)}" cy="${n(sy)}" r="8"/></g>`;
  }).join('');
  const labels = INSIDE.map(([, key, deg]) => {
    const a = deg * Math.PI / 180, x = cx + Math.cos(a) * 158, y = cy + Math.sin(a) * 158 + (Math.sin(a) < 0 ? -4 : 16);
    return `<text class="in" x="${n(x)}" y="${n(y)}" text-anchor="middle">${escapeHTML(s(`story.c1.part.${key}`))}</text>`;
  }).join('');
  return `<svg class="ch-svg c1-svg" viewBox="0 0 700 620" aria-hidden="true" focusable="false"><line class="ground" x1="0" y1="560" x2="700" y2="560"/>`
    + `<g class="c1-pile">${parts}</g>`
    + `<g class="c1-sun">${sun(cx, cy, r, { live: 1, id: 'c1-sun' })}<circle class="orbit c1-orbit" cx="${cx}" cy="${cy}" r="${orbit}"/></g>`
    + `<g class="c1-labels">${labels}</g>`
    + `<text class="lab cap" x="100" y="596" text-anchor="middle">${escapeHTML(s('story.c1.pile'))}</text>`
    + `<text class="lab cap c1-cap-app" x="${cx}" y="596" text-anchor="middle">${escapeHTML(s('story.c1.app'))}</text></svg>`;
}

// Chapter 2, "One each". Step 1: a new customer signs up and the one sun divides on a slant (never a level pair: two
// level circles read as eyes); the shared ring stretches and fades, and each half draws its own. Step 2: a row of
// three customers, each with its own heavy ring. Step 3: a request from Acme's copy for Birch's data stops at the ring.
export function eachSVG(s) {
  const r = 46, dx = n(r * 0.62);
  const half = (side, x) => `<g class="c2-half c2-half-${side}" style="--dx:${x}px"><circle class="sun-body" r="${n(r * 0.6)}"/><circle class="sun-core" r="${n(r * 0.23)}"/><circle class="c2-own" r="${n(r * 0.86)}" pathLength="1"/></g>`;
  const divide = `<g class="sun c2-divide" data-state="rest" transform="translate(350 150) rotate(-24)">`
    + `<g class="sun-glow">${[1.75, 1.5, 1.28, 1.08].map(q => `<circle r="${n(r * q)}"/>`).join('')}</g>`
    + `<circle class="sun-ring c2-shared" r="${r}"/>${half('a', -dx)}${half('b', dx)}</g>`;
  const names = ['a', 'b', 'c'];
  const row = names.map((k, i) => `<g class="c2-cust" style="--d:${i * 140}ms">${sun(120 + i * 230, 450, 80, { thick: 1, live: 1 })}<text class="lab cap" x="${120 + i * 230}" y="596" text-anchor="middle">${escapeHTML(s(`story.c2.name.${k}`))}</text></g>`).join('');
  return `<svg class="ch-svg c2-svg" viewBox="0 0 700 620" aria-hidden="true" focusable="false"><line class="ground" x1="0" y1="560" x2="700" y2="560"/>`
    + `<text class="lab c2-signup" x="350" y="62" text-anchor="middle">${escapeHTML(s('story.c2.signup'))}</text>${divide}`
    + `<path class="c2-thread" d="M296 196 C 220 250, 150 290, 130 340 M350 214 V 330 M404 196 C 480 250, 550 290, 570 340"/>`
    + row
    + `<path class="c2-request" pathLength="1" d="M150 430 C 186 350, 236 350, 268 410"/>`
    + `<path class="c2-stop" d="M257 398 l22 24 m0 -24 l-22 24"/></svg>`;
}
