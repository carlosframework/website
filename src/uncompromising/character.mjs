// 🤖 The quiz's character, in one place: everything that draws it (the twenty-five pictures, the result pages, the
// share images and the live character beside the pile) comes through this file, so a final design can be swapped in
// here and nowhere else. PROVISIONAL (Paul, 2026-11-21): the small amber light from the HalfStack Vienna deck
// (halfstack-vienna-build, engine/deck.js: a point of warm light, a halo, a glow in faint discs of its own colour, a
// thin ring), not the translucent cell. No face. Where the cell had a nucleus it has a smaller, paler circle. It keeps
// the cell's moves, so the idea stays figurative: it squishes like putty (four numbers: size, pinch, stretch, sag),
// dims when asleep, brightens with two thin rings when woken, and draws a wall (its ring) round itself.
export const AMBER = '#ffb454';
const EDGE = '#c97a16', CORE = '#fff0d2';
const BODY = 0.55;   // the light's own radius, as a share of the space it is given; the glow fills the rest

// The outline: a circle that can squish. k pinches (a positive k narrows the middle), sx and sy stretch, flat cuts
// the bottom off where it rests on a floor (a fraction of the height below the centre), seed gives a slight wobble.
export function outline(cx, cy, r, o = {}) {
  const k = o.k ?? 0, sx = o.sx ?? 1, sy = o.sy ?? 1, seed = o.seed ?? 0, wob = o.wobble ?? 0.4, n = o.points ?? 72, p = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * Math.PI * 2, R = r * (1 + k * Math.cos(2 * t) + wob * (0.02 * Math.sin(3 * t + seed) + 0.012 * Math.sin(5 * t + seed * 2.3)));
    let y = cy + R * Math.sin(t) * sy;
    if (o.flat) y = Math.min(y, cy + r * sy * o.flat);
    p.push(`${(cx + R * Math.cos(t) * sx).toFixed(1)},${y.toFixed(1)}`);
  }
  return 'M' + p.join('L') + 'Z';
}

// No gradients: the deck draws its light in flat fills. Kept so callers can ask for the character's <defs>.
export const defs = () => '';

// The character as SVG markup in a space of radius r centred on (cx, cy). When it rests on a floor (o.flat), its
// foot stays where the space's foot was. o.wake: brighter, with two thin rings. o.sleep: dimmed, no glow. o.sad:
// squashed and paler. o.thick: its wall drawn heavy. o.ghost: a dashed outline where it could be. o.inside: markup
// drawn inside it, centred on (0, 0) of the light.
export function character(cx, cy, r, o = {}) {
  const b = r * BODY, sx = o.sx ?? 1, sy = o.sy ?? 1, y = o.flat ? cy + r * sy * o.flat - b * sy * o.flat : cy;
  const oo = { ...o, wobble: o.wobble ?? 0.4, points: 48 };
  if (o.ghost) return `<path d="${outline(cx, y, b, oo)}" fill="none" stroke="${EDGE}" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 5"/>`;
  const z = o.sleep, glow = z ? 0.35 : o.sad ? 0.5 : o.wake ? 1.4 : 1;
  // Glow, rings and wall are plain ellipses (only the body needs to squish), which keeps each picture small.
  const ring = (q, attrs) => `<ellipse cx="${cx}" cy="${y.toFixed(1)}" rx="${(b * q * sx).toFixed(1)}" ry="${(b * q * sy).toFixed(1)}" ${attrs}/>`;
  let s = `<g opacity="${o.op ?? 1}">`;
  if (glow) s += [2.05, 1.75, 1.5, 1.28].map(q => ring(q, `fill="${AMBER}" fill-opacity="${(0.07 * glow).toFixed(3)}"`)).join('');
  if (o.wake) s += [1.95, 2.3].map((q, i) => ring(q, `fill="none" stroke="${AMBER}" stroke-opacity="${0.75 - i * 0.35}" stroke-width="${Math.max(1.2, b * 0.045).toFixed(2)}"`)).join('');
  // Its wall: the deck's thin ring round the light.
  s += ring(1.16, `fill="none" stroke="${z ? '#8a6a44' : EDGE}" stroke-opacity="${o.thick ? 0.9 : 0.45}" stroke-width="${(o.thick ? Math.max(2.2, b * 0.08) : 1.2).toFixed(2)}"`);
  s += `<path d="${outline(cx, y, b, oo)}" fill="${z ? '#7a5a35' : o.sad ? '#e2b680' : o.wake ? '#ffc169' : AMBER}" stroke="${z ? '#5e4428' : EDGE}" stroke-width="${Math.max(1.2, b * 0.05).toFixed(2)}" stroke-linejoin="round"/>`;
  if (o.nuc !== 0) s += `<ellipse cx="${(cx - b * 0.12 * sx).toFixed(1)}" cy="${(y - b * 0.1 * sy).toFixed(1)}" rx="${(b * 0.36 * sx).toFixed(1)}" ry="${(b * 0.36 * sy).toFixed(1)}" fill="${z ? '#a07c52' : o.sad ? '#f2dcbc' : CORE}"/>`;
  if (o.inside) s += `<g transform="translate(${cx} ${y.toFixed(1)})">${o.inside}</g>`;
  return s + '</g>';
}

// ---- The live character beside the pile, standing on a floor at y = 0, centred on x = 0 --------------------------
// Its moods, as the four numbers (r is the space it is given; the light itself is BODY of it).
export const MOODS = {
  rest: { r: 64, k: 0, sx: 1, sy: 1 },
  wake: { r: 66, k: 0, sx: 1, sy: 1 },
  sad: { r: 64, k: 0, sx: 1.3, sy: 0.56 },
  swell: { r: 76, k: 0, sx: 1, sy: 1 },
};
// Everything quiz.js redraws from those numbers.
export function livePaths(m, seed = 1) {
  const b = m.r * BODY, o = { k: m.k, sx: m.sx, sy: m.sy, seed, flat: 0.98, wobble: 0.4 }, cy = -b * m.sy * 0.98;
  return {
    body: outline(0, cy, b, o), wall: outline(0, cy, b * 1.16, o),
    glow: [2.05, 1.75, 1.5, 1.28].map(q => outline(0, cy, b * q, o)),
    ring1: outline(0, cy, b * 1.95, o), ring2: outline(0, cy, b * 2.3, o),
    core: { cx: (-b * 0.12 * m.sx).toFixed(1), cy: (cy - b * 0.1 * m.sy).toFixed(1), rx: (b * 0.36 * m.sx).toFixed(1), ry: (b * 0.36 * m.sy).toFixed(1) },
    centre: cy,
  };
}
// The live character's markup, drawn at rest by the build; quiz.js redraws its paths and sets its mood
// (data-mood on the stage; quiz.css colours it). inside is the "one" brick of the ending, centred on the light.
export function liveCharacter(inside = '') {
  const p = livePaths(MOODS.rest);
  return `<svg class="q-cell-svg" viewBox="-80 -150 160 158" aria-hidden="true" focusable="false"><g class="q-cell-breathe">`
    + p.glow.map((d, i) => `<path class="q-glow q-glow${i}" d="${d}"/>`).join('')
    + `<path class="q-ring q-ring1" d="${p.ring1}"/><path class="q-ring q-ring2" d="${p.ring2}"/>`
    + `<path class="q-wall" d="${p.wall}"/><path class="q-cell-body" d="${p.body}"/>`
    + `<ellipse class="q-core" cx="${p.core.cx}" cy="${p.core.cy}" rx="${p.core.rx}" ry="${p.core.ry}"/>`
    + `<g class="q-one-in" transform="translate(0 ${p.centre.toFixed(1)})">${inside}</g></g></svg>`;
}
