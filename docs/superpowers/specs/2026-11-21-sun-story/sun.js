// 🤖 The CARLOS character: a small amber sun. Spec: ../2026-11-21-sun-story.md, "The character". Styles: sun.css.
// A plain script, so a storyboard can load it from a file. A build can copy the two functions as they are.
//
// sun(cx, cy, r, o) returns SVG markup for one sun, to go inside an <svg>. r is the radius of its boundary ring,
// which is its footprint: the body is 0.6 r, the core 0.23 r, and the glow reaches 1.75 r.
//   o.state   'rest' (default), 'swell', 'shrink', 'squish', 'asleep', 'bright', 'ghost'
//   o.thick   its ring drawn heavy (the wall)           o.floor  it stands on a line: it squashes and grows from its foot
//   o.split   0 to 1: dividing. Two bodies moving apart inside one ring that stretches with them.
//   o.tilt    degrees: the slant it divides on. Never 0 for a pair by itself: two level circles read as eyes.
//   o.horizon a y in the drawing: everything below it is hidden, so the sun is setting or rising on that line
//   o.live    it breathes, and its changes of state are animated     o.op  opacity     o.inside  markup drawn on top of it
// The quiz storyboard's older names still work: o.sleep, o.wake, o.sad, o.ghost.
let sunClip = 0;
function sun(cx, cy, r, o = {}) {
  const st = o.state || (o.sleep ? 'asleep' : o.wake ? 'bright' : o.sad ? 'squish' : o.ghost ? 'ghost' : 'rest');
  const n = v => +(+v).toFixed(2), s = o.split || 0, dx = n(r * .62 * s);
  const cls = ['sun', o.thick && 'is-walled', r < 10 && 'is-small', o.live && 'is-live', o.floor && 'on-floor'].filter(Boolean).join(' ');
  const body = x => `<circle class="sun-body" cx="${x}" r="${n(r * .6)}"/>`, core = x => `<circle class="sun-core" cx="${x}" r="${n(r * .23)}"/>`;
  let g = `<g class="sun-glow">${[1.75, 1.5, 1.28, 1.08].map(q => s ? `<ellipse rx="${n(r * q + dx)}" ry="${n(r * q)}"/>` : `<circle r="${n(r * q)}"/>`).join('')}</g>`
    + `<circle class="sun-pulse" r="${n(r)}"/><g class="sun-self">`
    + (s ? `<ellipse class="sun-ring" rx="${n(r + dx)}" ry="${n(r)}"/>` + body(-dx) + body(dx) + core(-dx) + core(dx) : `<circle class="sun-ring" r="${n(r)}"/>` + body(0) + core(0))
    + (o.inside || '') + `</g>`;
  if (o.horizon != null) { const id = 'sunclip' + (++sunClip); g = `<clipPath id="${id}"><rect x="${n(-r * 3)}" y="${n(-r * 3)}" width="${n(r * 6)}" height="${n(r * 3 + o.horizon - cy)}"/></clipPath><g clip-path="url(#${id})">${g}</g>`; }
  return `<g class="${cls}" data-state="${st}" transform="translate(${n(cx)} ${n(cy)})${o.tilt ? ` rotate(${o.tilt})` : ''}"${o.op != null ? ` opacity="${o.op}"` : ''}>${g}</g>`;
}
// A live sun as its own element: <svg class="sun-svg">, 200 units square, the ring at 57. Set data-state on its .sun.
function sunSVG(o = {}) {
  return `<svg class="sun-svg" viewBox="-100 -100 200 200" aria-hidden="true" focusable="false">${sun(0, 0, 57, { live: 1, ...o })}</svg>`;
}
if (typeof module !== 'undefined') module.exports = { sun, sunSVG };
