// 🤖 The quiz's twenty-five pictures (/uncompromising/pictures/*.svg), drawn by hand on 400 x 280 boards, ported from
// Fable's storyboard (website branch story-proposal-20261117, docs/superpowers/specs/2026-11-20-uncompromising-quiz/).
// The joke is drawn in the old world (boxes, buildings, machines); the fact, shown after "Absolutely not", is drawn in
// the character's world and always has the character in it (src/uncompromising/character.mjs, provisional). Every word in a picture comes from src/_data/quiz-copy.json
// (quiz.pic.<statement>.*), so a copy review reaches the labels too. Flat fills, one line weight, no raster images.
// Day pictures are a paper board, night pictures a dark one; neither changes with the theme (an <img> cannot follow
// the page's own Light or Dark switch), so in the dark theme a day picture reads as a lit board on the night page.
import { character as cell, outline, defs } from '../src/uncompromising/character.mjs';

// A small database: a cylinder with a band (the old world's databases, in the jokes).
function db(x, y0, w2, h, f = '#0b8a76', t = '#5cc7b0') {
  const e = w2 * 0.36;
  return `<path d="M${x - w2} ${y0} v${h} a${w2} ${e} 0 0 0 ${w2 * 2} 0 v${-h} z" fill="${f}"/><ellipse cx="${x}" cy="${y0}" rx="${w2}" ry="${e}" fill="${t}"/><path d="M${x - w2} ${y0 + h / 2} a${w2} ${e} 0 0 0 ${w2 * 2} 0" fill="none" stroke="${t}" stroke-width="1"/>`;
}

export const ORDER = ['data', 'toolchain', 'onedb', 'idle', 'yaml', 'hello', 'pager', 'hope', 'slow', 'lockin', 'agent', 'backups'];
const INK = '#14232b', TEAL = '#067a68', RED = '#b03f29', PAPER = '#f4f7f1';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MONO = 'ui-monospace, \'SF Mono\', \'Cascadia Code\', Menlo, Consolas, monospace';
const SANS = 'Inter, Roboto, \'Helvetica Neue\', \'Arial Nova\', \'Nimbus Sans\', Arial, sans-serif';
export const STYLE = `.lb{font:500 13px ${MONO};letter-spacing:.06em;text-transform:uppercase;fill:#4c5a60}.nt .lb{fill:#a9b9bd}`
  + `.bt{font:500 10.5px ${SANS};fill:#17191c}.wt{font:600 11px ${SANS};fill:#fff}.tm{font:13px ${MONO};fill:#e9f0ee}`
  + `.card{font:600 12px ${SANS};fill:#17191c}.clock{font:600 13px ${MONO};fill:#ff7f60}.coin{font:600 12px ${MONO};fill:#ffd76a}`
  // The one slow thing in three pictures (coins, the phone's buzz, the trickle of changes); stopped under reduced motion.
  + `.coin0,.coin1,.coin2{animation:coin 6s linear infinite}.coin1{animation-delay:-4s}.coin2{animation-delay:-2s}`
  + `@keyframes coin{0%{transform:translateY(-34px);opacity:0}8%{opacity:1}85%{transform:translateY(0);opacity:1}100%{transform:translateY(14px);opacity:0}}`
  + `.buzz{animation:buzz 1.2s steps(2) infinite}@keyframes buzz{50%{opacity:.15}}`
  + `.trickle{animation:trickle 2.4s ease-in-out infinite}@keyframes trickle{50%{transform:translateX(9px)}}`
  + `@media (prefers-reduced-motion:reduce){.slow{animation:none!important}}`;

// t(id) is the copy; bind adds data-copy="id" to each word, for the copy-review preview only.
export function pictures(t, { bind = false } = {}) {
  const w = (id, attrs, cls = 'lb') => `<text class="${cls}" ${attrs}${bind ? ` data-copy="${id}"` : ''}>${esc(t(id))}</text>`;
  const span = id => `<tspan${bind ? ` data-copy="${id}"` : ''}>${esc(t(id))}</tspan>`;
  const L = (x, y, id, a = 'middle') => w(id, `x="${x}" y="${y}" text-anchor="${a}"`);
  const gnd = (y = 240, a = 8, b = 392) => `<line x1="${a}" y1="${y}" x2="${b}" y2="${y}" stroke="${INK}" stroke-opacity=".3"/>`;
  // A plain box; its word is the id of a label, or nothing.
  const bx = (x, y, wd, h, id = '', o = {}) => `<g${o.rot ? ` transform="rotate(${o.rot} ${x + wd / 2} ${y + h / 2})"` : ''}><rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="3" fill="${o.fill ?? '#fff'}" stroke="${o.stroke ?? INK}" stroke-width="1.2"${o.dash ? ' stroke-dasharray="4 4"' : ''}/>`
    + (id ? (o.raw ? `<text class="${o.cls ?? 'bt'}" x="${x + wd / 2}" y="${y + h / 2 + 4}" text-anchor="middle">${esc(id)}</text>` : w(id, `x="${x + wd / 2}" y="${y + h / 2 + 4}" text-anchor="middle"`, o.cls ?? 'bt')) : '') + '</g>';
  const arr = (x1, y1, x2, y2, o = {}) => { const a = Math.atan2(y2 - y1, x2 - x1), c = o.c ?? INK, h = 7;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.5"${o.dash ? ' stroke-dasharray="3 4"' : ''}/><path d="M${x2} ${y2} L${x2 - h * Math.cos(a - 0.45)} ${y2 - h * Math.sin(a - 0.45)} M${x2} ${y2} L${x2 - h * Math.cos(a + 0.45)} ${y2 - h * Math.sin(a + 0.45)}" stroke="${c}" stroke-width="1.5" fill="none"/>`; };
  const night = `<rect width="400" height="280" rx="14" fill="#101c23"/>`;
  const moon = `<circle cx="340" cy="46" r="15" fill="#e9e6c8"/><circle cx="347" cy="41" r="14" fill="#101c23"/>`;
  // The burglar: a striped jersey, a flat cap, a mask with no eyes, a sack. Never a face. x, y is where the feet stand.
  const bur = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="-17" cy="-40" r="12" fill="#d9d2bd" stroke="${INK}" stroke-width="1.2"/><path d="M-9 -49 q8 -6 14 2" fill="none" stroke="${INK}" stroke-width="2.4"/>`
    + `<rect x="-7" y="-24" width="5" height="24" fill="${INK}"/><rect x="2" y="-24" width="5" height="24" fill="${INK}"/><rect x="-11" y="-56" width="22" height="34" rx="6" fill="#fff" stroke="${INK}" stroke-width="1.2"/>`
    + [0, 1, 2, 3].map(i => `<rect x="-11" y="${-51 + i * 7}" width="22" height="3" fill="${INK}"/>`).join('')
    + `<circle cx="0" cy="-67" r="9" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/><rect x="-9" y="-70" width="18" height="5" fill="${INK}"/><path d="M-10 -74 a10 8 0 0 1 20 0 l6 1.5 h-26z" fill="${INK}"/></g>`;
  // A terminal; each line is [prefix, id or literal, colour, literal?].
  const term = (x, y, wd, h, lines) => `<rect x="${x}" y="${y}" width="${wd}" height="${h}" rx="8" fill="${INK}"/>${[0, 1, 2].map(i => `<circle cx="${x + 14 + i * 12}" cy="${y + 13}" r="3.2" fill="#4c5a60"/>`).join('')}`
    + lines.map(([pre, id, c, lit], i) => `<text class="tm" x="${x + 16}" y="${y + 44 + i * 22}"${c ? ` style="fill:${c}"` : ''}>${esc(pre)}${lit ? esc(id) : id ? span(id) : ''}</text>`).join('');
  const seats = [...Array(11)].map((_, i) => `<path d="M${26 + i * 33} 278 v-14 a11 11 0 0 1 22 0 v14z" fill="${INK}" opacity=".82"/>`).join('');
  const curtain = (x, wd) => `<rect x="${x}" y="34" width="${wd}" height="166" fill="#6b4a66"/>` + [...Array(Math.round(wd / 14))].map((_, i) => `<line x1="${x + 7 + i * 14}" y1="34" x2="${x + 7 + i * 14}" y2="200" stroke="#4d3349" stroke-width="2"/>`).join('');
  const stageTop = `<rect x="46" y="20" width="308" height="20" rx="3" fill="#4d3349"/><line x1="40" y1="200" x2="360" y2="200" stroke="${INK}" stroke-width="2"/>`;
  const sign = (x, y, id, wd = 78) => `<line x1="${x}" y1="${y}" x2="${x}" y2="240" stroke="${INK}" stroke-width="2"/><rect x="${x - wd / 2}" y="${y - 30}" width="${wd}" height="30" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.2"/>` + w(id, `x="${x}" y="${y - 10}" text-anchor="middle"`, 'card');
  const rack = (x, lit) => `<rect x="${x}" y="92" width="64" height="148" rx="3" fill="#1c2e38" stroke="#3f5b66"/>` + [...Array(6)].map((_, i) => `<line x1="${x + 6}" y1="${112 + i * 22}" x2="${x + 58}" y2="${112 + i * 22}" stroke="#3f5b66"/><circle cx="${x + 12}" cy="${103 + i * 22}" r="2.6" fill="${lit ? '#ffd76a' : '#2c4049'}"/><circle cx="${x + 21}" cy="${103 + i * 22}" r="2.6" fill="${lit ? '#7df0c8' : '#2c4049'}"/>`).join('');
  // The phone buzzes (lit), or lies dark. The buzz lines are the picture's one slow thing.
  const bedside = lit => `<line x1="24" y1="196" x2="150" y2="196" stroke="#a9b9bd" stroke-width="2"/><line x1="38" y1="196" x2="38" y2="240" stroke="#a9b9bd"/><line x1="136" y1="196" x2="136" y2="240" stroke="#a9b9bd"/>`
    + `<rect x="40" y="181" width="48" height="14" rx="4" fill="${lit ? '#d9fff4' : '#22353f'}" stroke="#3f5b66"/>${lit ? `<path class="slow buzz" d="M32 176 q-6 10 0 20 M96 176 q6 10 0 20 M24 172 q-9 14 0 28" fill="none" stroke="#d9fff4" stroke-width="1.3"/>` : ''}`
    + `<rect x="100" y="166" width="46" height="29" rx="4" fill="#0a1217" stroke="#3f5b66"/><text class="clock" x="123" y="186" text-anchor="middle">03:00</text>`;
  const P = 'quiz.pic.';

  const ILL = {
    data: {
      j: () => gnd() + `<rect x="140" y="26" width="120" height="214" fill="#e7ebe3" stroke="${INK}" stroke-width="1.2"/>` + [...Array(32)].map((_, i) => { const c = i % 4, r = i >> 2, me = r === 1 && c === 2;
        return `<rect x="${153 + c * 25}" y="${38 + r * 21}" width="18" height="12" fill="${me ? '#9adfce' : '#fff'}" stroke="${INK}" stroke-width=".6"/>` + (me ? db(212, 62, 4, 5) : ''); }).join('')
        + `<rect x="188" y="212" width="24" height="28" fill="${INK}"/><line x1="222" y1="65" x2="276" y2="56" stroke="${INK}" stroke-dasharray="2 3"/>` + L(280, 56, P + 'data.yours', 'start') + L(280, 74, P + 'data.floor', 'start')
        + `<line x1="72" y1="200" x2="72" y2="240" stroke="${INK}" stroke-width="2"/>` + bx(8, 172, 128, 30, P + 'data.sign', { cls: 'card' }),
      f: () => gnd() + cell(130, 168, 70, { seed: 2, flat: 0.98 }) + `<path d="M182 122 q26 -30 56 -32" fill="none" stroke="${INK}" stroke-width="1.2"/><path d="M236 76 h72 l12 14 l-12 14 h-72z" fill="#fff" stroke="${INK}" stroke-width="1.2"/><circle cx="246" cy="90" r="3" fill="none" stroke="${INK}"/>`
        + w(P + 'data.tag', `x="281" y="95" text-anchor="middle"`, 'card')
        + bx(292, 184, 84, 56, '', { dash: 1, fill: 'none' }) + arr(214, 200, 284, 210, { dash: 1 }) + L(130, 262, P + 'data.file') + L(334, 262, P + 'data.server') },
    toolchain: {
      j: () => [['build', 16, 44], ['bundle', 112, 44], ['image', 208, 44], ['registry', 304, 44], ['chart', 304, 132], ['pipeline', 208, 132], ['rollout', 112, 132]].map(([k, x, y]) => bx(x, y, 80, 36, P + 'toolchain.' + k) + `<circle cx="${x + 70}" cy="${y - 4}" r="8" fill="${PAPER}" stroke="${INK}" stroke-dasharray="3 2.4"/><circle cx="${x + 70}" cy="${y - 4}" r="2" fill="${INK}"/>`).join('')
        + arr(96, 62, 110, 62) + arr(192, 62, 206, 62) + arr(288, 62, 302, 62) + arr(344, 82, 344, 128) + arr(302, 150, 290, 150) + arr(206, 150, 194, 150) + arr(110, 150, 62, 150) + arr(46, 160, 46, 198)
        + bx(34, 202, 24, 22, '', { fill: '#9adfce' }) + gnd(224) + L(70, 218, P + 'toolchain.app', 'start') + L(200, 256, P + 'toolchain.steps'),
      f: () => gnd() + cell(96, 176, 60, { seed: 1, flat: 0.98 }) + arr(170, 176, 246, 176) + L(208, 164, P + 'toolchain.copy') + bx(262, 196, 116, 44, P + 'toolchain.server') + `<g color="${TEAL}">${cell(320, 160, 34, { ghost: 1, flat: 0.98 })}</g>` + L(320, 112, P + 'toolchain.run') + L(96, 262, P + 'toolchain.binary') },
    onedb: {
      j: () => gnd() + db(262, 62, 84, 148) + ['acme', 'birch', 'cobalt', 'dune', 'elm'].map((k, i) => `<path d="M178 ${90 + i * 26} a84 30 0 0 0 168 0" fill="none" stroke="#5cc7b0"/>` + w(P + 'onedb.' + k, `x="262" y="${104 + i * 26}" text-anchor="middle"`, 'wt')).join('')
        + `<path d="M30 240 v-116 h56 v116" fill="none" stroke="${INK}" stroke-width="2.5"/><path d="M86 124 l-20 12 v104" fill="none" stroke="${INK}" stroke-width="1.2"/>` + bur(124, 240, 1) + `<path d="M142 186 q18 -22 34 -8" fill="none" stroke="${RED}" stroke-width="1.6" stroke-dasharray="4 4"/>` + L(58, 114, P + 'onedb.door') + L(262, 264, P + 'onedb.everyone'),
      f: () => gnd() + [['acme', 132, 1], ['birch', 242, 4], ['cobalt', 350, 6]].map(([k, x, s]) => cell(x, 176, 46, { seed: s, thick: 1.5, flat: 0.98 }) + L(x, 262, P + 'onedb.' + k)).join('') + bur(50, 240, 0.9)
        + `<path d="M64 196 q12 -12 24 -6" fill="none" stroke="${RED}" stroke-width="1.6" stroke-dasharray="4 4"/><path d="M150 132 q24 -34 44 -6" fill="none" stroke="${RED}" stroke-width="1.6" stroke-dasharray="4 4"/><path d="M188 120 l12 12 m0 -12 l-12 12" stroke="${RED}" stroke-width="2.4"/>` + L(242, 104, P + 'onedb.wall') },
    idle: { night: 1,
      // The coins are the one slow thing: one drops every two seconds (quiz.css), stopped under reduced motion.
      j: () => night + moon + `<ellipse cx="170" cy="242" rx="150" ry="10" fill="#ffd76a" opacity=".1"/>` + rack(62, 1) + rack(138, 1) + rack(214, 1) + `<line x1="20" y1="240" x2="380" y2="240" stroke="#3f5b66"/>`
        + `<rect x="312" y="150" width="52" height="90" rx="4" fill="#1c2e38" stroke="#3f5b66"/><rect x="326" y="158" width="24" height="4" rx="2" fill="#0a1217"/><text class="coin" x="338" y="204" text-anchor="middle">€ € €</text>`
        + [[338, 96], [333, 118], [341, 138]].map(([x, y], i) => `<circle class="slow coin${i}" cx="${x}" cy="${y}" r="6" fill="#d8b65e" stroke="#7a6220"/>`).join('') + L(160, 264, P + 'idle.clock') + L(336, 264, P + 'idle.meter'),
      f: () => night + moon + `<line x1="20" y1="240" x2="380" y2="240" stroke="#3f5b66"/>` + [[60, 30, 1], [128, 26, 3], [322, 28, 5], [262, 22, 2]].map(([x, r, s]) => cell(x, 240 - r * 0.72, r, { sleep: 1, sx: 1.12, sy: 0.76, seed: s, flat: 0.95 })).join('')
        + cell(196, 196, 40, { wake: 1, seed: 2, flat: 0.98 }) + `<line x1="196" y1="40" x2="196" y2="128" stroke="#d9fff4" stroke-dasharray="2 5"/><circle cx="196" cy="36" r="4" fill="#d9fff4"/>` + L(208, 40, P + 'idle.request', 'start') + L(60, 264, P + 'idle.asleep') + L(262, 264, P + 'idle.awake') },
    yaml: {
      j: () => gnd() + `<rect x="96" y="14" width="200" height="226" fill="#fff" stroke="${INK}" stroke-width="1.2"/><rect x="88" y="232" width="286" height="16" rx="8" fill="#fff" stroke="${INK}" stroke-width="1.2"/><circle cx="366" cy="240" r="8" fill="#fff" stroke="${INK}" stroke-width="1.2"/><circle cx="366" cy="240" r="3" fill="none" stroke="${INK}"/>`
        + [...Array(14)].map((_, i) => `<line x1="${108 + i * 13}" y1="${30 + i * 14.4}" x2="${108 + i * 13 + 30}" y2="${30 + i * 14.4}" stroke="${TEAL}" stroke-width="3"/><line x1="${108 + i * 13 + 36}" y1="${30 + i * 14.4}" x2="${108 + i * 13 + 36 + [44, 26, 58, 34, 50, 22, 40][i % 7]}" y2="${30 + i * 14.4}" stroke="#9aa6a2" stroke-width="3"/>`).join('')
        + L(48, 100, P + 'yaml.page') + L(48, 118, P + 'yaml.of') + L(346, 120, P + 'yaml.level'),
      f: () => gnd() + term(28, 88, 214, 100, [['$ ', 'carlos deploy', null, 1], ['', 'ok', '#2fd4ac', 1]]) + arr(252, 150, 284, 164) + cell(336, 192, 48, { seed: 3, flat: 0.98 }) + L(135, 214, P + 'yaml.command') },
    hello: {
      j: (o = {}) => gnd() + [0, 1, 2].map(r => `<line x1="40" y1="${45 + r * 56}" x2="312" y2="${45 + r * 56}" stroke="${INK}" stroke-opacity=".5"/><line x1="${73 + r * 84}" y1="30" x2="${73 + r * 84}" y2="172" stroke="${INK}" stroke-opacity=".5"/>`).join('')
        + ['api', 'auth', 'queue', 'cache', 'database', 'gateway', 'worker', 'config', 'logs'].map((k, i) => bx(40 + (i % 3) * 84, 30 + (i / 3 | 0) * 56, 66, 30, P + 'hello.' + k)).join('') + `<path d="M274 157 h62" fill="none" stroke="${INK}" stroke-opacity=".5"/>` + sign(336, 150, P + 'hello.sign', 92)
        + (o.yes ? [73, 157, 241].map(x => `<line x1="157" y1="204" x2="${x}" y2="174" stroke="${INK}" stroke-dasharray="2 3"/>`).join('') + bx(110, 202, 94, 30, P + 'hello.watcher', { fill: '#fff3d6' }) : '') + L(160, 264, P + (o.yes ? 'hello.ten' : 'hello.nine')),
      f: () => gnd() + cell(120, 172, 66, { seed: 2, flat: 0.98 }) + sign(290, 150, P + 'hello.sign', 92) + L(120, 262, P + 'hello.file') + L(300, 262, P + 'hello.builtin') },
    pager: { night: 1,
      j: () => night + moon + bedside(1) + `<line x1="20" y1="240" x2="380" y2="240" stroke="#3f5b66"/><g transform="rotate(84 262 238)"><rect x="206" y="118" width="56" height="120" rx="3" fill="#1c2e38" stroke="#6b8791"/>${[0, 1, 2, 3].map(i => `<line x1="212" y1="${140 + i * 24}" x2="256" y2="${140 + i * 24}" stroke="#3f5b66"/><circle cx="218" cy="${130 + i * 24}" r="2.6" fill="#ff7f60"/>`).join('')}</g>`
        + `<path d="M256 172 q-60 -50 -116 -12" fill="none" stroke="#ff7f60" stroke-dasharray="3 4"/>` + L(318, 264, P + 'pager.down') + L(88, 264, P + 'pager.up'),
      f: () => night + moon + bedside(0) + `<line x1="20" y1="240" x2="380" y2="240" stroke="#3f5b66"/><rect x="310" y="120" width="56" height="120" rx="3" fill="none" stroke="#6b8791" stroke-dasharray="4 5"/>` + cell(228, 208, 40, { sleep: 1, sx: 1.12, sy: 0.78, seed: 3, flat: 0.95 })
        + L(338, 108, P + 'pager.nocache') + L(338, 264, P + 'pager.server') + L(88, 264, P + 'pager.asleep') + L(228, 264, P + 'pager.fine') },
    hope: {
      j: () => gnd() + `<rect x="262" y="96" width="120" height="144" fill="#e7ebe3" stroke="${INK}" stroke-width="1.2"/><rect x="302" y="184" width="40" height="56" fill="${INK}"/><path d="M309 158 a13 13 0 0 0 26 0" fill="none" stroke="#8a5a12" stroke-width="5" stroke-linecap="round"/>` + w(P + 'hope.production', `x="322" y="124" text-anchor="middle"`, 'card')
        + `<line x1="24" y1="62" x2="300" y2="206" stroke="${INK}" stroke-width="3"/><line x1="60" y1="82" x2="60" y2="240" stroke="${INK}"/><line x1="170" y1="139" x2="170" y2="240" stroke="${INK}"/>` + bx(120, 76, 34, 30, 'v2', { rot: 27.5, fill: '#9adfce', raw: 1 }) + `<path d="M98 72 l-14 -8 M102 62 l-14 -8" stroke="${INK}" stroke-opacity=".5"/>`
        + `<line x1="24" y1="62" x2="24" y2="22" stroke="${INK}" stroke-width="1.5"/><path d="M24 22 h54 l-8 9 l8 9 h-54z" fill="#fff3d6" stroke="${INK}"/>` + w(P + 'hope.flag', `x="48" y="35" text-anchor="middle" style="font-size:10px"`, 'card') + L(160, 264, P + 'hope.brakes'),
      f: () => gnd() + cell(294, 172, 64, { seed: 2, flat: 0.98 }) + cell(100, 190, 46, { seed: 5, flat: 0.98 }) + `<path d="${outline(100, 190 + 46 * 0.45 * 0.98, 46 * 0.55 * 1.6, { seed: 5 })}" fill="none" stroke="#c97a16" stroke-dasharray="3 5"/>` + bx(84, 70, 32, 26, 'v2', { fill: '#9adfce', raw: 1 }) + arr(100, 100, 100, 124)
        + `<path d="M150 140 l7 8 l13 -17" fill="none" stroke="${TEAL}" stroke-width="3"/>` + arr(166, 190, 220, 184, { dash: 1 }) + L(193, 172, P + 'hope.then') + L(100, 262, P + 'hope.canary') + L(294, 262, P + 'hope.prod') },
    slow: {
      j: () => stageTop + curtain(52, 296) + `<g transform="translate(200 150)"><rect x="-16" y="-34" width="32" height="68" fill="${PAPER}" stroke="${INK}" stroke-width="1.2"/><path d="M-12 -30 h24 l-12 28z M-12 30 h24 l-12 -28z" fill="#fff" stroke="${INK}" stroke-width="1.2"/><path d="M-7 30 h14 l-7 -12z" fill="#d8b65e"/></g>` + L(200, 226, P + 'slow.wait') + seats,
      f: () => stageTop + curtain(52, 44) + curtain(304, 44) + cell(200, 148, 50, { seed: 1, flat: 0.98 }) + L(200, 226, P + 'slow.ms') + seats },
    lockin: {
      j: () => gnd() + `<rect x="210" y="46" width="160" height="194" fill="#e7ebe3" stroke="${INK}" stroke-width="1.2"/>` + w(P + 'lockin.host', `x="290" y="74" text-anchor="middle"`, 'card') + `<rect x="270" y="176" width="40" height="64" fill="${INK}"/><path d="M284 200 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke="#d8b65e" stroke-width="2.5"/><rect x="281" y="200" width="18" height="14" rx="2" fill="#d8b65e"/>`
        + bx(226, 98, 128, 30, P + 'lockin.checkout', { cls: 'card' }) + bx(24, 206, 92, 34, P + 'lockin.app', { fill: '#9adfce', cls: 'card' }) + [...Array(7)].map((_, i) => `<ellipse cx="${125 + i * 13}" cy="${226 + (i % 2) * 3}" rx="8" ry="4.5" fill="none" stroke="${INK}" stroke-width="1.6"/>`).join('') + L(110, 270, P + 'lockin.stay'),
      f: () => gnd() + `<path d="M26 150 v90 h96 v-90" fill="none" stroke="${INK}" stroke-width="1.8"/>` + cell(74, 195, 44, { seed: 2, flat: 0.98, sx: 1.02 }) + `<path d="M152 204 v36 h112 v-36" fill="none" stroke="${INK}" stroke-width="1.8"/><g color="${TEAL}">${cell(208, 216, 28, { ghost: 1, sx: 1.6, sy: 0.8, flat: 0.98 })}</g>`
        + `<rect x="296" y="156" width="84" height="60" rx="4" fill="none" stroke="${INK}" stroke-width="1.8"/><path d="M286 232 h104 l-8 8 h-88z" fill="none" stroke="${INK}" stroke-width="1.8"/><g color="${TEAL}">${cell(338, 187, 22, { ghost: 1 })}</g>` + arr(118, 132, 196, 180, { dash: 1 }) + arr(238, 180, 316, 138, { dash: 1 })
        + L(74, 262, P + 'lockin.carloku') + L(208, 262, P + 'lockin.yours') + L(338, 262, P + 'lockin.laptop') },
    agent: {
      j: () => gnd() + term(26, 54, 206, 112, [['> ', P + 'agent.built'], ['> ', P + 'agent.what'], ['> ▍', '', '#a9b9bd']]) + `<rect x="280" y="196" width="60" height="44" fill="#ead9b4" stroke="${INK}" stroke-width="1.2"/><line x1="310" y1="196" x2="310" y2="240" stroke="${INK}" stroke-opacity=".5"/><line x1="280" y1="212" x2="340" y2="212" stroke="${INK}" stroke-opacity=".5"/>`
        + `<path d="M340 196 q14 -4 22 -22 M340 196 q20 2 30 -8 M352 188 q6 -2 8 -8" fill="none" stroke="${INK}" stroke-opacity=".45"/>` + L(290, 262, P + 'agent.ready') + L(129, 190, P + 'agent.yours'),
      f: () => gnd() + term(26, 44, 196, 112, [['✓ ', P + 'agent.build', '#2fd4ac'], ['✓ ', P + 'agent.test', '#2fd4ac'], ['✓ ', P + 'agent.deploy', '#2fd4ac']]) + `<rect x="40" y="186" width="58" height="42" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.2"/><line x1="48" y1="186" x2="48" y2="228" stroke="${INK}"/>` + w(P + 'agent.skill', `x="73" y="211" text-anchor="middle"`, 'card')
        + arr(232, 110, 272, 130) + bx(268, 204, 108, 36, P + 'agent.server') + cell(322, 164, 40, { seed: 4, flat: 0.98 }) + L(100, 262, P + 'agent.carlos') },
    backups: {
      j: () => gnd() + `<line x1="46" y1="64" x2="46" y2="240" stroke="${INK}" stroke-width="3"/><line x1="354" y1="64" x2="354" y2="240" stroke="${INK}" stroke-width="3"/><path d="M46 74 Q200 112 354 74" fill="none" stroke="${INK}" stroke-width="1.6"/>`
        + `<g transform="rotate(-5 200 92)"><circle cx="200" cy="80" r="13" fill="${PAPER}" stroke="${INK}" stroke-width="1.8"/><circle cx="200" cy="80" r="2" fill="${INK}"/><line x1="200" y1="80" x2="200" y2="60" stroke="${INK}" stroke-width="1.8"/>${db(200, 22, 22, 36)}<line x1="128" y1="46" x2="272" y2="46" stroke="${INK}" stroke-width="2"/></g>`
        + `<path d="M70 176 Q200 216 330 176" fill="none" stroke="${INK}" stroke-opacity=".45" stroke-dasharray="3 5"/>` + L(200, 172, P + 'backups.net') + L(200, 264, P + 'backups.last'),
      // The trickle is the one slow thing: the changes move along towards storage (quiz.css), stopped under reduced motion.
      f: () => gnd() + cell(104, 172, 64, { seed: 2, flat: 0.98 }) + `<rect x="286" y="118" width="96" height="122" rx="6" fill="#fff" stroke="${INK}" stroke-width="1.2"/>` + db(334, 160, 20, 40)
        + `<g class="slow trickle">${[0, 1, 2, 3, 4, 5].map(i => { const q = i / 5, x = 178 + q * 100, y = 150 - Math.sin(q * Math.PI) * 26; return `<rect x="${x - 5}" y="${y - 3}" width="10" height="6" rx="3" fill="#0b8a76" opacity="${(0.45 + q * 0.5).toFixed(2)}"/>`; }).join('')}</g>`
        + L(228, 100, P + 'backups.every') + L(334, 262, P + 'backups.storage') + L(104, 262, P + 'backups.app') },
  };
  const board = (k, body) => {
    const nt = ILL[k].night;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="ill${nt ? ' nt' : ''}" viewBox="0 0 400 280" width="400" height="280"><style>${STYLE}</style>${defs()}`
      + (nt ? '' : `<rect width="400" height="280" rx="14" fill="${PAPER}"/>`) + body + '</svg>';
  };
  const out = {};
  for (const k of ORDER) {
    out[`${k}-joke`] = board(k, ILL[k].j());
    out[`${k}-fact`] = board(k, ILL[k].f());
  }
  out['hello-yes'] = board('hello', ILL.hello.j({ yes: true }));
  return out;
}

// A brick, drawn as in the storyboard: a face with a top and a side, its name on the face.
export function brickSVG(x, y, wd, h, text, o = {}) {
  const fs = o.fs ?? 12;
  return `<g${o.rot ? ` transform="rotate(${o.rot} ${x + wd / 2} ${y + h / 2})"` : ''}><polygon points="${x},${y} ${x + 7},${y - 4} ${x + wd + 7},${y - 4} ${x + wd},${y}" fill="#eef2ea" stroke="#2b2f33" stroke-width="1"/><polygon points="${x + wd},${y} ${x + wd + 7},${y - 4} ${x + wd + 7},${y + h - 4} ${x + wd},${y + h}" fill="#d7ddd2" stroke="#2b2f33" stroke-width="1"/><rect x="${x}" y="${y}" width="${wd}" height="${h}" fill="#fff" stroke="#2b2f33" stroke-width="1"/>`
    + `<text x="${x + wd / 2}" y="${y + h / 2 + fs * 0.36}" text-anchor="middle" style="font:500 ${fs}px ${SANS};fill:#17191c">${esc(text)}</text></g>`;
}

// The three share images (1200 x 630), one per result: the quiz's question, the verdict, the cell in the matching
// mood and the address. The same for everyone with that result: no score, no stack, no name. hack/quiz-share-images.mjs
// turns these into the PNGs in src/uncompromising/share/.
export function shareHTML(t, kind) {
  const verdict = t(`quiz.result.${kind}`), long = verdict.length > 40;
  const piles = {
    all: () => cell(300, 270, 140, { wake: 1, seed: 2, inside: brickSVG(-44, -16, 88, 36, t('quiz.pic.result.one'), { fs: 18 }) }),
    most: () => `<line x1="0" y1="430" x2="480" y2="430" stroke="${INK}" stroke-opacity=".3"/>` + ['kubernetes', 'terraform', 'cdn'].map((n, i) => brickSVG(40 + (i % 2) * 8, 430 - (i + 1) * 43 + 4, 150, 38, t('quiz.stack.thing.' + n), { fs: 17 })).join('') + cell(350, 430 - 110 * 0.98, 110, { seed: 2, flat: 0.98 }),
    few: () => `<line x1="0" y1="436" x2="480" y2="436" stroke="${INK}" stroke-opacity=".3"/>` + ['rails', 'postgres', 'redis', 'sidekiq', 'docker', 'kubernetes', 'nginx', 'heroku', 's3'].map((n, i) => brickSVG(44 + (i % 2) * 10, 436 - (i + 1) * 41 + 4, 150, 36, t('quiz.stack.thing.' + n), { fs: 17 })).join('') + cell(366, 436 - 84 * 0.56 * 0.98, 84, { sad: 1, sx: 1.3, sy: 0.56, flat: 0.98, seed: 2 }),
  };
  return `<!doctype html><meta charset="utf-8"><style>body{margin:0}.s{position:relative;width:1200px;height:630px;overflow:hidden;background:${PAPER};padding:64px 72px;box-sizing:border-box;font-family:${SANS};color:${INK}}`
    + `.q{font:600 24px/1.2 ${MONO};letter-spacing:.08em;text-transform:uppercase;color:${TEAL};margin:0 0 34px;max-width:640px}.v{font-size:${long ? 62 : 82}px;font-weight:760;letter-spacing:-.03em;line-height:1.02;margin:0;max-width:${long ? 600 : 640}px}`
    + `.u{position:absolute;left:72px;bottom:60px;font-size:28px;font-weight:600;margin:0}.u span{color:#4c5a60;font-weight:500;margin-left:.4em}svg{position:absolute;right:40px;top:60px;width:480px;height:520px;overflow:visible}</style>`
    + `<div class="s"><p class="q">${esc(t('quiz.meta.title'))}</p><p class="v">${esc(verdict)}</p><svg viewBox="0 0 480 520">${defs()}${piles[kind]()}</svg>`
    + `<p class="u">${esc(t('quiz.page.cta'))}<span>carlosframework.com/uncompromising</span></p></div>`;
}
