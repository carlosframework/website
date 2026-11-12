// 🤖 The hero's background: one WebGL fragment shader behind the hero only, ported from the options sheet
// (Fable's D1 "nebula with a gentle spiral" for dark, and L3, the same sheets drawn as ink with a saffron core,
// for light). The theme is a uniform, so a change of theme (system, or the header's Auto/Light/Dark) is picked
// up on the next frame without a reload.
// Cost limits: drawn at half resolution with the device pixel ratio capped at 1.5, at most 30 frames a second,
// and nothing at all while the hero is off screen, the tab is hidden or the replay's Pause is on. Under reduced
// motion one still frame is drawn, and only redrawn on a resize or a theme change. Without WebGL the hero keeps
// its CSS gradient. The glass cards drift up to 4 px against the picture as the pointer moves.
(() => {
  const hero = document.querySelector('.c-hero'), canvas = hero && hero.querySelector('.hero-bg');
  if (!canvas) return;
  const GLSL = "#define SP 1.0\n#define AR .45\nprecision highp float;\nuniform vec2 R; uniform float T, D, S; uniform vec2 P;\nconst float LO = .40, HI = .22;\nconst vec3 PAPER = vec3(.980, .973, .957), NIGHT = vec3(.059, .086, .110);\nfloat h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\nfloat n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);\n  return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + 1.), f.x), f.y); }\nfloat fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * n(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= .5; } return s; }\nmat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }\nfloat star(vec2 p, float cell) { vec2 g = p * cell, i = floor(g), f = fract(g) - .5; float r = h(i);\n  vec2 o = (vec2(h(i + 7.1), h(i + 3.7)) - .5) * .7;\n  return step(.84, r) * smoothstep(.075, 0., length(f - o)) * (.6 + .4 * sin(T * (.3 + r) + r * 40.)) * (.3 + .7 * h(i + 1.3)); }\nfloat lum(vec3 c) { c = pow(max(c, 0.), vec3(2.2)); return dot(c, vec3(.2126, .7152, .0722)); }\n// Second round: the text sits on frosted glass cards, so the picture is not dimmed behind it. Two page-wide tone limits\n// only: light never goes darker than a rich mid-tone, dark never brighter than a soft glow, so the glass can do its job.\nconst vec3 VIOLET = vec3(.60, .44, .98), CORAL = vec3(1., .54, .50), SAFFRON = vec3(1., .77, .30), COBALT = vec3(.30, .48, .98);\nvoid finish2(vec3 L, vec3 K) {\n  float ll = lum(L); if (ll < LO) L = mix(L, PAPER, clamp((LO - ll) / max(lum(PAPER) - ll, .001), 0., 1.));\n  float lk = lum(K); if (lk > HI) K *= pow(HI / lk, 1. / 2.2);\n  gl_FragColor = vec4(mix(L, K, D) + (h(gl_FragCoord.xy) - .5) / 255., 1.);\n}\n\n// one sheet of gas: x = how thick, y = how lit (brighter on the side facing the light, which is what reads as volume)\nvec2 gas(vec2 p, float t) {\n  vec2 q = vec2(fbm(p + t), fbm(p + 4.7 - t * .8));\n  float f = fbm(p + 2.2 * q), g = fbm(p + 2.2 * q + vec2(.14, .18));\n  return vec2(smoothstep(.43, .70, f), clamp(.5 + (f - g) * 6.5, 0., 1.));\n}\nconst vec3 ROSE = vec3(1., .26, .58), BLUE = vec3(.14, .42, 1.), AQUA = vec3(.34, .70, 1.), DEEPV = vec3(.52, .24, 1.), EMBER = vec3(1., .56, .24);\nvoid main() {\n  vec2 uv = (gl_FragCoord.xy - .5 * R) / min(R.x, R.y), par = P + vec2(0., S * 2.);\n  vec2 v = uv - (R.x > R.y ? vec2(.10, .0) : vec2(.30, .95)) - par * .02;\n  float r = length(v);\n  vec2 s = rot(SP * log(r + .25) - T * .012) * v;               // space wound gently round the core; the whole thing turns\n  float arms = mix(1., .30 + 1.15 * (.5 + .5 * (s.x * s.x - s.y * s.y) / max(dot(s, s), .0001)), AR * smoothstep(.02, .3, r));\n  vec2 g0 = gas(s * 1.6 + par * .015 + vec2(1.3, 0.), T * .008);\n  vec2 g1 = gas(s * 1.2 + par * .045 + vec2(7.3, 2.1), T * .011);\n  vec2 g2 = gas(s * .85 + par * .095 + vec2(14.6, 4.2), T * .014);\n  g0.x *= arms; g1.x *= arms; g2.x *= min(1., arms * 1.1);\n  float core = exp(-r * r * 9.), hot = exp(-r * r * 60.);\n  vec3 c0 = mix(BLUE, DEEPV, g0.y), c1 = mix(DEEPV, ROSE, g1.y), c2 = mix(mix(DEEPV, ROSE, .35), mix(BLUE, AQUA, g2.y), smoothstep(.45, .95, g2.y));\n  c2 = mix(c2, EMBER, core * .9);\n  vec3 K = NIGHT * .45 + vec3(.8, .88, 1.) * star(uv + par * .008, 36.) * .55;\n  K = K * (1. - .45 * g0.x) + c0 * g0.x * (.16 + .50 * g0.y);\n  K += vec3(.85, .9, 1.) * star(uv + par * .04 + 3.3, 22.) * .8 * (1. - .7 * g1.x) * (1. - .7 * g2.x);\n  K = K * (1. - .55 * g1.x) + c1 * g1.x * (.12 + .85 * g1.y * g1.y);\n  K = K * (1. - .70 * g2.x) + c2 * g2.x * (.08 + 1.05 * g2.y * g2.y);\n  K += EMBER * (core * .16 + hot * .5) + vec3(1., .96, .9) * star(uv + par * .11 + 8.1, 13.) * .8 * (1. - .5 * g2.x);\n  // in light, the same sheets as ink: cobalt and violet behind, coral in the middle, saffron at the core\n  float w = 1.;\n  vec3 L = PAPER * mix(vec3(1.), mix(COBALT, VIOLET, g0.y), g0.x * w * .55);\n  L = mix(L, PAPER * mix(vec3(1.), mix(VIOLET, CORAL, g1.y), .85) * (.76 + .26 * g1.y), g1.x * w * .85);\n  L = mix(L, PAPER * mix(vec3(1.), mix(mix(COBALT, CORAL, g2.y), SAFFRON, min(1., core * 1.3)), .88) * (.74 + .30 * g2.y), g2.x * w * .8);\n  L = mix(L, PAPER * mix(vec3(1.), SAFFRON, .8), core * w * .45);\n  finish2(L, K);\n}\n";
  const root = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)'), darkQ = matchMedia('(prefers-color-scheme: dark)');
  const pause = document.querySelector('.rp-pause input');
  const FRAME = 1000 / 30, SCALE = 0.5, STILL_AT = 37;
  let gl = null, u = {}, raf = 0, t = STILL_AT, last = 0, seen = true, dirty = true, px = 0, py = 0, frames = 0;
  const P = [0, 0];
  const dark = () => { const th = root.getAttribute('data-theme'); return th ? th === 'dark' : darkQ.matches; };
  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('no WebGL');
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }'));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, GLSL));
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    ['R', 'T', 'D', 'S', 'P'].forEach(k => { u[k] = gl.getUniformLocation(prog, k); });
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; hero.classList.add('nogl'); });
  } catch { gl = null; hero.classList.add('nogl'); return; }
  hero.classList.add('has-bg');

  function draw() {
    const w = hero.clientWidth, h = hero.clientHeight, k = Math.min(devicePixelRatio || 1, 1.5) * SCALE;
    const cw = Math.max(2, Math.round(w * k)), ch = Math.max(2, Math.round(h * k));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    const r = hero.getBoundingClientRect();
    gl.viewport(0, 0, cw, ch);
    gl.uniform2f(u.R, cw, ch);
    gl.uniform1f(u.T, t);
    gl.uniform1f(u.D, dark() ? 1 : 0);
    gl.uniform1f(u.S, Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight)));
    gl.uniform2f(u.P, P[0], P[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    frames++; dirty = false;
  }
  const moving = () => gl && seen && !document.hidden && !reduce.matches && !(pause && pause.checked);
  function tick(now) {
    raf = 0;
    if (!gl) return;
    if (moving()) {
      if (now - last >= FRAME - 2) {
        t += Math.min(0.1, (now - last) / 1000); last = now;
        // the pointer leans the picture a little, eased so it never jumps; the glass drifts the other way
        const a = hero.getBoundingClientRect();
        const tx = Math.max(-1, Math.min(1, (px - a.left - a.width / 2) / a.width * 2)), ty = Math.max(-1, Math.min(1, -(py - a.top - a.height / 2) / a.height * 2));
        P[0] += (tx - P[0]) * 0.05; P[1] += (ty - P[1]) * 0.05;
        hero.style.setProperty('--gx', (-P[0] * 4).toFixed(2)); hero.style.setProperty('--gy', (P[1] * 3).toFixed(2));
        draw();
      }
      raf = requestAnimationFrame(tick);
    } else {
      if (reduce.matches) { t = STILL_AT; P[0] = P[1] = 0; hero.style.removeProperty('--gx'); hero.style.removeProperty('--gy'); }
      if (dirty && seen) draw();
      last = 0;
    }
  }
  const kick = () => { dirty = true; if (!raf) raf = requestAnimationFrame(tick); };

  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { px = e.clientX; py = e.clientY; } }, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', kick);
  reduce.addEventListener('change', kick);
  darkQ.addEventListener('change', kick);
  if (pause) pause.addEventListener('change', kick);
  new MutationObserver(kick).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: '100px 0px' }).observe(hero);
  // For checks: show one moment, and read what is being drawn.
  window.__heroBg = { set: v => { t = v; kick(); }, get state() { return { t, frames, running: !!raf, dark: dark(), seen }; } };
  kick();
})();
