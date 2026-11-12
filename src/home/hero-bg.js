// 🤖 The hero's background: Fable's 3D meadow, variant Q1 ("golden meadow"), from the options sheet (options-27).
// Hand-written WebGL2, no library: a low camera in a meadow, thousands of instanced grass blades in true perspective,
// swayed by a slow, breathing wind and dissolved by haze, with soft light shafts. The scene is drawn small (0.4 of the
// screen) and blurred with two separable Gaussian passes, so it reads as an out-of-focus photograph. Day for the light
// theme, night for the dark one, following the system or the header's Auto/Light/Dark live: a handful of faint stars,
// day pollen motes, night fireflies spread across the hero. No sun or moon disc, only their light. The meadow is mostly
// below the fold. The canvas is at most one screen tall and sticks while a tall hero scrolls past (home/hero.css).
// Pointer and scroll move the camera a little; the glass panes drift the other way.
// Cost limits: at most 30 frames a second, the device pixel ratio capped at 1.5, and a slow device gets half the blades,
// then a smaller picture. Nothing is drawn while the hero is off screen, the tab is hidden or the replay's Pause is on;
// under reduced motion one still frame. Without WebGL2 the hero keeps its CSS gradient.
(() => {
  const Q1 = { blades: 9000, rays: 1, dof: 1, fog: 0.042, glow: 0, tall: 1, thin: 1 };
  const LOOK = {
    light: { Top: [0.70, 0.81, 0.92], Mid: [0.98, 0.86, 0.77], Hor: [1, 0.90, 0.72], Haze: [0.98, 0.87, 0.74], Sun: [1, 0.93, 0.76], Ground: [0.36, 0.37, 0.19],
      Root: [0.30, 0.33, 0.16], T0: [0.88, 0.76, 0.44], T1: [0.60, 0.65, 0.42], T2: [0.46, 0.51, 0.26], Lit: [1, 0.70, 0.36], Rim: [1, 0.93, 0.78],
      LeafA: [0.24, 0.29, 0.15], LeafB: [0.74, 0.72, 0.40], LeafC: [0.82, 0.47, 0.30], Night: 0 },
    dark: { Top: [0.025, 0.035, 0.12], Mid: [0.09, 0.09, 0.26], Hor: [0.20, 0.19, 0.40], Haze: [0.15, 0.15, 0.34], Sun: [0.93, 0.93, 0.88], Ground: [0.045, 0.055, 0.14],
      Root: [0.04, 0.05, 0.13], T0: [0.36, 0.42, 0.60], T1: [0.25, 0.30, 0.50], T2: [0.18, 0.23, 0.42], Lit: [0.20, 0.25, 0.46], Rim: [0.78, 0.84, 1],
      LeafA: [0.04, 0.05, 0.13], LeafB: [0.36, 0.43, 0.64], LeafC: [0.42, 0.36, 0.60], Night: 1 },
  };
  const NOISE = `float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}`;
  const HEAD = `#version 300 es
precision highp float;
uniform vec4 C;      // camera x, camera height, focal length across, focal length up
uniform vec4 Q;      // time, horizon (in screen units), depth of field strength, fog density
uniform vec3 Sn;     // sun or moon on screen (x, y), and width over height
uniform vec3 Top, Mid, Hor, Haze, Sun, Ground, Root, T0, T1, T2, Lit, Rim, LeafA, LeafB, LeafC;
uniform float Night, Glow, Rays, Hpx;
`;
  // the wind: two slow waves travelling across the field, shared by grass and leaves
  const WIND = `float gust(float x,float z,float t){return (sin(x*.30+z*.20-t*.26)*.5+sin(x*.09-z*.06-t*.13)*.5)*(.55+.45*sin(t*.07+x*.02));}
float blur(float z){return clamp((.25+.6*smoothstep(7.,30.,z))*Q.z,0.,1.);}
`;   // sharp from about two to nine metres; soft nearer, softer far away
  const SKY_V = HEAD + `layout(location=0) in vec2 a; out vec2 q; void main(){ q=a; gl_Position=vec4(a,0.,1.); }`;
  const SKY_F = HEAD + NOISE + `in vec2 q; out vec4 o;
void main(){
  float y=q.y-Q.y; vec3 c;
  if(y>0.){ float k=y/(1.-Q.y); c=mix(Hor,Mid,smoothstep(0.,.35,k)); c=mix(c,Top,smoothstep(.2,1.,k));
    if(Night>.5){ vec2 g=q*vec2(Sn.z,1.)*34., i=floor(g), f=fract(g)-.5; float r=h(i);
      c+=vec3(.8,.85,1.)*step(.982,r)*smoothstep(.2,0.,length(f-(vec2(h(i+7.1),h(i+3.7))-.5)*.6))*(.6+.4*sin(Q.x*(.2+r)+r*40.))*smoothstep(.25,.8,k)*.5; } }
  else { c=mix(Haze,Ground,smoothstep(0.,.8,-y/(1.+Q.y))); }
  float r=length((q-Sn.xy)*vec2(Sn.z,1.));
  c+=Sun*(exp(-r*r*10.)*.30+exp(-r*2.6)*.13)*(1.-.5*Night);       // the glow round the sun or moon
  c=mix(c,Haze,exp(-abs(y)*8.)*.65);                                  // haze lying along the horizon
  o=vec4(c+(h(gl_FragCoord.xy)-.5)/255.,1.);
}`;
  // light shafts: a fan of soft beams from the sun, added over everything. Noise is read along the direction from the sun, so there is no seam.
  const RAY_F = HEAD + NOISE + `in vec2 q; out vec4 o;
void main(){
  vec2 d=(q-Sn.xy)*vec2(Sn.z,1.); float r=length(d); vec2 e=d/max(r,.001);
  float beams=smoothstep(.22,.62,n(e*4.+Q.x*.03)*n(e*9.+5.-Q.x*.02));
  o=vec4(Sun*beams*exp(-r*1.5)*smoothstep(0.,.25,r)*.30*Rays*(1.-.72*Night),0.);
}`;
  // A separable Gaussian blur, run twice (the second pass wider), so the picture is soft everywhere and has no hard pixels when stretched.
  const BLUR_F = HEAD + `in vec2 q; out vec4 o; uniform sampler2D Tx; uniform vec2 Dir; uniform float Grade;
void main(){
  vec2 uv=q*.5+.5;
  vec3 c=texture(Tx,uv).rgb*.227+(texture(Tx,uv+Dir*1.385).rgb+texture(Tx,uv-Dir*1.385).rgb)*.316+(texture(Tx,uv+Dir*3.231).rgb+texture(Tx,uv-Dir*3.231).rgb)*.070;
  c=mix(c,mix(c,Haze,.16)+Sun*.02,Grade);                                // last pass: a little haze over everything, for a softer, lower-contrast picture
  o=vec4(c,1.);
}`;
  const BLADE_V = HEAD + WIND + `layout(location=0) in vec2 a;     // across the blade (-1..1), up the blade (0..1)
layout(location=1) in vec4 i0;    // where it stands (x, z), height, half width
layout(location=2) in vec4 i1;    // turn, lean, a random number, kind (below zero: a tree trunk)
uniform float Px;
out vec4 A; out vec4 B;
void main(){
  float u=a.x, v=a.y, hgt=i0.z, grass=step(0.,i1.w);
  float bend=(i1.y+gust(i0.x,i0.y,Q.x)*.085+sin(Q.x*.7+i1.z*40.)*.008)*grass;
  vec3 p=vec3(i0.x+bend*hgt*v*v, hgt*v*(1.-.22*bend*bend*v), i0.y+.15*bend*hgt*v*v*sin(i1.x*3.));
  float inv=1./max(p.z,.05), coc=blur(p.z);
  float half_=i0.w*mix(1.-v*.45,1.-pow(v,1.6),grass)*cos(i1.x)*(1.+coc*1.2)*C.z*inv;
  float wide=max(half_,Px*.75);                                     // never thinner than most of a pixel; fade instead
  vec2 s=vec2((p.x-C.x)*C.z*inv, (p.y-C.y)*C.w*inv+Q.y);
  gl_Position=p.z<.4?vec4(2.,2.,0.,1.):vec4(s.x+u*wide,s.y,0.,1.);
  vec2 ds=(s-Sn.xy)*vec2(Sn.z,1.);
  A=vec4(u,v,coc,1.-exp(-p.z*Q.w)); B=vec4(i1.z,i1.w,exp(-dot(ds,ds)*5.),half_/wide);
}`;
  const BLADE_F = HEAD + `in vec4 A; in vec4 B; out vec4 o;
void main(){
  float u=A.x, v=A.y, coc=A.z, fog=A.w, seed=B.x;
  vec3 tip=seed<.4?mix(T0,T1,seed*2.5):mix(T1,T2,(seed-.4)*1.67);
  vec3 c=mix(Root,tip,smoothstep(0.,.75,v))*mix(.45,1.,smoothstep(0.,.5,v))*(.72+.4*fract(seed*13.7));       // darker at the roots, where blades shade each other
  c+=Lit*(pow(v,1.6)*(.06+.20*fract(seed*7.3))+B.z*.30*v)*(1.-.4*Night);            // light coming through the blade, most near the sun
  c+=Rim*pow(abs(u),3.)*.35*v+Lit*Glow*pow(v,3.)*.9+Rim*Night*pow(v,2.5)*.2;
  if(B.y<0.) c=Root*.7+Rim*.22*pow(max(u,0.),2.);
  c=mix(c,Haze,fog);
  float al=(1.-smoothstep(1.-mix(.2,1.,coc),1.,abs(u)))*mix(1.,.3,coc)*B.w*(1.-fog*.55)*smoothstep(0.,.06+.45*coc,v);   // out-of-focus blades fade in from the root, so they have no hard foot
  o=vec4(c*al,al);
}`;
  const POINT_V = HEAD + WIND + `layout(location=0) in vec4 p0;    // position, size
layout(location=1) in vec4 p1;    // a random number, which way the leaf faces (x, y), kind (0 leaf, 1 firefly, 2 foreground shape, 3 foreground highlight)
out vec4 A; out vec4 B;
void main(){
  vec3 p=p0.xyz; float leaf=step(p1.w,.5), front=step(1.5,p1.w);
  p.x+=front*sin(Q.x*.16+p1.x*20.)*.02; p.y+=front*sin(Q.x*.12+p1.x*33.)*.012;   // the foreground drifts slowly, as if on a breeze close to the lens
  p.x+=leaf*(gust(p.x,p.z,Q.x)*.035*max(p.y-1.2,0.)+sin(Q.x*.6+p1.x*50.)*.008); p.y+=leaf*sin(Q.x*.5+p1.x*31.)*.006;
  float inv=1./max(p.z,.05), coc=blur(p.z)*leaf;
  vec2 s=vec2((p.x-C.x)*C.z*inv,(p.y-C.y)*C.w*inv+Q.y);
  gl_Position=p.z<.4?vec4(2.,2.,0.,1.):vec4(s,0.,1.);
  gl_PointSize=clamp(p0.w*C.w*inv*Hpx*.5*(1.+coc*2.5),1.5,220.);
  vec2 ds=(s-Sn.xy)*vec2(Sn.z,1.), to=normalize(-ds+vec2(0.,.0001));
  A=vec4(p1.x,p1.w,coc,1.-exp(-p.z*Q.w)); B=vec4(clamp(.5+.6*dot(p1.yz,to),0.,1.),exp(-dot(ds,ds)*4.),0.,0.);
}`;
  const POINT_F = HEAD + `in vec4 A; in vec4 B; out vec4 o;
void main(){
  vec2 c=gl_PointCoord*2.-1.; float seed=A.x, coc=A.z;
  if(A.y>2.5){ float r=length(c), g=smoothstep(1.,.7,r)*(.045+.02*smoothstep(.5,.95,r))*(.6+.4*sin(Q.x*(.3+seed)+seed*30.)); o=vec4(mix(Sun,Lit,.4)*g*(1.-.5*Night),0.); return; }   // an out-of-focus highlight: a faint disc, brighter at its edge
  if(A.y>.5&&A.y<1.5){ float soft=step(.68,seed)*Night, w=sin(Q.x*mix(1.5+seed*2.,.35+seed*.35,Night)+seed*30.);   // by night some are nearer the lens: bigger, softer, dimmer
    float g=exp(-dot(c,c)*mix(5.,2.,soft))*mix(1.,.34*smoothstep(1.,.55,length(c)),soft)*mix(.55+.45*w,smoothstep(-.7,.6,w),Night);              // by night each one fades in and out over many seconds
    o=vec4(mix(vec3(1.,.95,.82)*.22,vec3(1.,.92,.55),Night)*g,0.); return; }   // a firefly at night, a mote of pollen in the light by day: just a glow
  float an=seed*6.28, cs=cos(an), sn=sin(an); c=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs);
  float r=length(c*vec2(1.,1.75));
  vec3 col=mix(LeafA,seed>.86?LeafC:LeafB,B.x*(.55+.45*fract(seed*9.1)))+Lit*B.y*.5*(1.-.5*Night);                               // lit on the side that faces the sun
  col=mix(col,Haze,A.w);
  float al=(1.-smoothstep(1.-mix(.3,1.,coc),1.,r))*mix(.95,.4,coc);
  if(A.y>1.5){ col=mix(LeafA*.9,LeafB,B.x*.3)+Lit*B.y*.35*(1.-.5*Night); al=(1.-smoothstep(.15,1.,r))*.82; }   // foreground: a soft dark shape, far out of focus
  o=vec4(col*al,al);
}`;

  const hero = document.querySelector('.c-hero'), canvas = hero && hero.querySelector('.hero-bg');
  if (!canvas) return;
  const root = document.documentElement, reduce = matchMedia('(prefers-reduced-motion: reduce)'), darkQ = matchMedia('(prefers-color-scheme: dark)');
  const pause = document.querySelector('.rp-pause input');
  const FRAME = 1000 / 30, SCALE = 0.4, STILL_AT = 37;
  const dark = () => { const th = root.getAttribute('data-theme'); return th ? th === 'dark' : darkQ.matches; };
  const rng = s => () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const NAMES = ['C', 'Q', 'Sn', 'Night', 'Glow', 'Rays', 'Hpx', 'Px', 'Tx', 'Dir', 'Grade', ...Object.keys(LOOK.light)];
  const program = (gl, vs, fs) => {
    const p = gl.createProgram();
    [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]].forEach(([type, src]) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); gl.attachShader(p, s); });
    gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; for (const name of NAMES) { const loc = gl.getUniformLocation(p, name); if (loc !== null) u[name] = loc; }
    return { p, u };
  };
  const P = { v: Q1, t: STILL_AT, last: 0, dirty: true, seen: true, P: [0, 0], ms: [], count: 0, shape: '', frames: 0 };
  let gl = null, raf = 0, mx = 0, my = 0;

  // the field is planted once per shape of hero, from fixed seeds, and sorted far to near so it can be painted without a depth buffer
  const plant = wide => {
    const v = P.v, r = rng(21), n = Math.round(v.blades * (wide ? 1 : 0.55) * (P.less || 1)), spread = wide ? 1 / 1.2 : 1 / 2.6;
    const rows = [];
    for (let i = 0; i < n; i++) { const z = 1 / (1 / 2.2 + (1 / 30 - 1 / 2.2) * Math.pow(r(), 0.9));   // nothing closer than about two metres: blades right at the lens only smear
      rows.push([(r() * 2 - 1) * (z * spread * 1.25 + 0.8), z, (0.34 + 0.4 * r()) * v.tall, (0.013 + 0.015 * r()) * v.thin, (r() - 0.5) * 1.6, (r() - 0.5) * 0.5, r(), r()]); }
    rows.sort((a, b) => b[1] - a[1]);
    P.nBlades = rows.length;
    gl.bindBuffer(gl.ARRAY_BUFFER, P.bladeBuf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rows.flat()), gl.STATIC_DRAW);
    const rn = rng(77); P.night = Array.from({ length: wide ? 22 : 10 }, (_, i) => [((i * 7 % (wide ? 22 : 10) + rn()) / (wide ? 22 : 10)) * 1.9 - 0.95, rn() * 1.8 - 0.9, 2 + rn() * 6, rn(), rn() * 6.283]);   // fireflies: spread across the width, at any height
    P.flies = Array.from({ length: wide ? 22 : 12 }, () => [(r() * 2 - 1) * 5 * spread * 1.2, 0.25 + r() * 0.9, 2 + r() * 9, r(), r() * 6.283]);   // pollen by day
  };

  try {
    gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('no WebGL2');
    P.sky = program(gl, SKY_V, SKY_F); P.ray = program(gl, SKY_V, RAY_F); P.blade = program(gl, BLADE_V, BLADE_F); P.point = program(gl, POINT_V, POINT_F); P.blur = program(gl, SKY_V, BLUR_F);
    P.fb = [0, 1].map(() => { const tex = gl.createTexture(), fb = gl.createFramebuffer(); gl.bindTexture(gl.TEXTURE_2D, tex);
      [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(f => gl.texParameteri(gl.TEXTURE_2D, f, gl.LINEAR)); [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(f => gl.texParameteri(gl.TEXTURE_2D, f, gl.CLAMP_TO_EDGE));
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); return { tex, fb }; });
    P.tri = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, P.tri); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    P.strip = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, P.strip); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0.25, 0.5, 0.75, 1].flatMap(v => [-1, v, 1, v])), gl.STATIC_DRAW);
    P.bladeBuf = gl.createBuffer(); P.flyBuf = gl.createBuffer();
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); gl = null; hero.classList.add('nogl'); });
  } catch { gl = null; hero.classList.add('nogl'); return; }
  hero.classList.add('has-bg');

  function draw() {
    // laid out for the canvas, which is at most one screen tall (it sticks while a tall hero scrolls past)
    const W = canvas.clientWidth || hero.clientWidth, H = canvas.clientHeight || hero.clientHeight, k = Math.min(devicePixelRatio || 1, 1.5) * (P.scale || SCALE), wide = W >= 1024;
    const cw = Math.max(2, Math.round(W * k)), ch = Math.max(2, Math.round(H * k));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; P.fb.forEach(f => { gl.bindTexture(gl.TEXTURE_2D, f.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, cw, ch, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); }); }
    if (P.shape !== W + 'x' + H) { P.shape = W + 'x' + H; plant(wide); }
    const a = hero.getBoundingClientRect(), look = LOOK[dark() ? 'dark' : 'light'], v = P.v, t = P.t;
    const col = (hero.querySelector('.hv-col') || hero).getBoundingClientRect(), rp = (hero.querySelector('.rp') || hero).getBoundingClientRect();
    // the horizon sits just above the hero's foot, so the meadow is mostly below the fold and only its tips rise into view
    const hz = 1 - 2 * (H - (wide ? 64 : 44)) / H;
    const sun = wide ? [((col.right + rp.left) / 2 - a.left) / W * 2 - 1, look.Night ? 1.3 : hz + 0.42] : [0.3, look.Night ? 1.2 : hz + 0.2];   // where the light comes from; by night from above the frame. There is no disc to see.
    const S = Math.max(-1, Math.min(1, (a.top + a.height / 2 - innerHeight / 2) / innerHeight));
    const fy = wide ? 1.9 : 1.0, fx = fy * H / W, cam = [P.P[0] * 0.1 + Math.sin(t * 0.05) * 0.04, 0.42 + P.P[1] * 0.03 + S * 0.05];
    const use = prog => { gl.useProgram(prog.p); const u = prog.u;
      if (u.C) gl.uniform4f(u.C, cam[0], cam[1], fx, fy); if (u.Q) gl.uniform4f(u.Q, t, hz, v.dof, v.fog); if (u.Sn) gl.uniform3f(u.Sn, sun[0], sun[1], W / H);
      for (const name in look) if (u[name]) (look[name].length ? gl.uniform3fv(u[name], look[name]) : gl.uniform1f(u[name], look[name]));
      if (u.Glow) gl.uniform1f(u.Glow, v.glow); if (u.Rays) gl.uniform1f(u.Rays, v.rays); if (u.Hpx) gl.uniform1f(u.Hpx, ch); if (u.Px) gl.uniform1f(u.Px, 2 / cw); return u; };
    const attr = (buf, loc, size, stride, off, div) => { gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off); gl.vertexAttribDivisor(loc, div); };
    const timed = P.count++ % 15 === 0, t0 = performance.now();
    gl.viewport(0, 0, cw, ch); gl.bindFramebuffer(gl.FRAMEBUFFER, P.fb[0].fb);
    use(P.sky); attr(P.tri, 0, 2, 0, 0, 0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.drawArrays(gl.TRIANGLES, 0, 3);
    use(P.blade); attr(P.strip, 0, 2, 0, 0, 0); attr(P.bladeBuf, 1, 4, 32, 0, 1); attr(P.bladeBuf, 2, 4, 32, 16, 1); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 10, P.nBlades);
    const points = (buf, count) => { if (count <= 0) return; use(P.point); attr(buf, 0, 4, 32, 0, 0); attr(buf, 1, 4, 32, 16, 0); gl.disableVertexAttribArray(2); gl.drawArrays(gl.POINTS, 0, count); };
    if (v.rays) { use(P.ray); attr(P.tri, 0, 2, 0, 0, 0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.drawArrays(gl.TRIANGLES, 0, 3); }
    [[0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1.7, 0], [1, null, 0, 1.7]].forEach(([from, to, dx, dy]) => {   // across, down, then both again wider; the last goes to the screen
      const u = use(P.blur); gl.bindFramebuffer(gl.FRAMEBUFFER, to === null ? null : P.fb[to].fb); gl.bindTexture(gl.TEXTURE_2D, P.fb[from].tex);
      gl.uniform2f(u.Dir, dx / cw, dy / ch); gl.uniform1f(u.Grade, to === null ? 1 : 0); gl.uniform1i(u.Tx, 0);
      attr(P.tri, 0, 2, 0, 0, 0); gl.disableVertexAttribArray(1); gl.disableVertexAttribArray(2); gl.drawArrays(gl.TRIANGLES, 0, 3); });
    // pollen by day, fireflies by night; drawn last, over the blurred picture, so they stay points of light. By night a sparse
    // handful anywhere in the hero, at different depths, each wandering lazily round its own spot and rising and falling a little.
    const motes = look.Night ? new Float32Array(P.night.flatMap(([sx, sy, z, s, ph]) => {
      const x = sx + 0.10 * Math.sin(t * 0.043 + ph) + 0.05 * Math.sin(t * 0.071 + ph * 2.3), y = sy + 0.07 * Math.sin(t * 0.037 + ph * 1.7) + 0.035 * Math.sin(t * 0.083 + ph * 0.6);
      return [x * z / fx, 0.42 + (y - hz) * z / fy, z, s > 0.68 ? 0.5 : 0.17, s, 0, 0, 1]; }))
      : new Float32Array(P.flies.flatMap(([x, y, z, s, ph]) => [x + Math.sin(t * 0.21 + ph) * 0.9 + Math.sin(t * 0.47 + ph * 2) * 0.3, y + Math.sin(t * 0.33 + ph * 3) * 0.22, z + Math.cos(t * 0.17 + ph) * 0.8, 0.1, s, 0, 0, 1]));
    gl.bindBuffer(gl.ARRAY_BUFFER, P.flyBuf); gl.bufferData(gl.ARRAY_BUFFER, motes, gl.DYNAMIC_DRAW); points(P.flyBuf, motes.length / 8);
    if (timed) {   // the slow-device guard: waiting for a pixel makes the GPU finish, so this is the whole frame
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      P.ms.push(performance.now() - t0); if (P.ms.length > 9) P.ms.shift();
      const mid = [...P.ms].sort((x, y) => x - y)[P.ms.length >> 1];
      if (P.ms.length >= 4 && mid > 40) {   // a slow device gets a lighter scene, not a slower one: first half the blades, then a smaller picture
        if (!P.less) { P.less = 0.5; P.shape = ''; P.ms = []; } else if ((P.scale || SCALE) > 0.3) { P.scale = (P.scale || SCALE) * 0.8; P.ms = []; } }
      P.msMid = mid;
    }
    P.frames++; P.dirty = false;
  }
  const moving = () => gl && P.seen && !document.hidden && !reduce.matches && !(pause && pause.checked);
  function tick(now) {
    raf = 0;
    if (!gl) return;
    if (moving()) {
      if (now - P.last >= FRAME - 2) {
        P.t += Math.min(0.1, (now - P.last) / 1000); P.last = now;
        // the pointer moves the camera a little, eased so it never jumps; the glass drifts the other way
        const r = hero.getBoundingClientRect();
        const tx = Math.max(-1, Math.min(1, (mx - r.left - r.width / 2) / r.width * 2)), ty = Math.max(-1, Math.min(1, -(my - r.top - r.height / 2) / r.height * 2));
        P.P[0] += (tx - P.P[0]) * 0.05; P.P[1] += (ty - P.P[1]) * 0.05;
        hero.style.setProperty('--gx', (-P.P[0] * 4).toFixed(2)); hero.style.setProperty('--gy', (P.P[1] * 3).toFixed(2));
        draw();
      }
      raf = requestAnimationFrame(tick);
    } else {
      if (reduce.matches) { P.t = STILL_AT; P.P[0] = P.P[1] = 0; hero.style.removeProperty('--gx'); hero.style.removeProperty('--gy'); }
      if (P.dirty && P.seen) draw();
      P.last = 0;
    }
  }
  const kick = () => { P.dirty = true; if (!raf) raf = requestAnimationFrame(tick); };

  addEventListener('pointermove', e => { if (e.pointerType === 'mouse') { mx = e.clientX; my = e.clientY; } }, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', kick);
  reduce.addEventListener('change', kick);
  darkQ.addEventListener('change', kick);
  if (pause) pause.addEventListener('change', kick);
  new MutationObserver(kick).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(es => { P.seen = es[es.length - 1].isIntersecting; kick(); }, { rootMargin: '100px 0px' }).observe(hero);
  // For checks: show one moment, and read what is being drawn.
  window.__heroBg = { set: v => { P.t = v; kick(); }, get state() { return { t: P.t, frames: P.frames, running: !!raf, dark: dark(), seen: P.seen, blades: P.nBlades, scale: P.scale || SCALE, ms: P.msMid }; } };
  kick();
})();
