// 🤖 Browser probe for the docs site mockup (27 checks: JS off/on, keyboard,
// reduced motion, print media, nav stability, 390px). Drives headless
// Chromium over CDP. Usage: node probe.mjs file://<mockups/docs-site> <out-dir>
// Scratch probe for the docs mockup: drives headless Chromium over CDP.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const base = process.argv[2], outDir = process.argv[3];
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn("chromium", ["--headless=new", `--remote-debugging-port=${port}`, "--remote-debugging-address=127.0.0.1", "--no-first-run", "--user-data-dir=" + outDir + "/profile", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();
async function connect() {
  for (let i = 0; i < 50; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" }); return (await r.json()).webSocketDebuggerUrl; } catch { await sleep(200); } }
  throw new Error("no chrome");
}
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result.value;
async function open(url, { js = true, media = "", reduced = false, width = 1280 } = {}) {
  await send("Emulation.setScriptExecutionDisabled", { value: !js });
  await send("Emulation.setEmulatedMedia", { media, features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  await send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url }); await sleep(900);
}
async function shot(name) { const r = await send("Page.captureScreenshot", { captureBeyondViewport: true, format: "png" }); writeFileSync(`${outDir}/${name}.png`, Buffer.from(r.data, "base64")); }
const visible = `[...document.querySelectorAll('li.frame')].filter(f=>f.getClientRects().length).length`;
const capsVisible = `[...document.querySelectorAll('li.frame figcaption')].filter(f=>f.getClientRects().length).length`;
const results = []; const check = (name, ok, got) => { results.push(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : " (got " + JSON.stringify(got) + ")"}`); };
try {
  ws = new WebSocket(await connect());
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id).res(d.result || {}); pending.delete(d.id); } });
  await send("Page.enable"); await send("Runtime.enable");
  const how = `${base}/how-it-works.html`;
  await open(how, { js: false });
  let v = await evalJS(visible), c = await evalJS(capsVisible), e = await evalJS(`document.querySelector('.stepper').classList.contains('is-enhanced')`);
  check("JS off: all 5 frames visible", v === 5, v); check("JS off: all 5 captions visible", c === 5, c); check("JS off: not enhanced", e === false, e);
  await shot("how-js-off-1280");
  await open(how);
  v = await evalJS(visible); const label = await evalJS(`document.querySelector('.stepper-count')?.textContent`); const back = await evalJS(`document.querySelector('.stepper-controls button').disabled`);
  const live = await evalJS(`document.querySelector('.stepper-caption')?.getAttribute('aria-live')`);
  check("JS on: one frame visible", v === 1, v); check("JS on: Step 1 of 5", label === "Step 1 of 5", label); check("JS on: Back disabled", back === true, back); check("JS on: caption aria-live polite", live === "polite", live);
  await shot("how-js-on-1280");
  let reached = "";
  for (let i = 0; i < 120 && !reached; i++) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }); const t = await evalJS(`document.activeElement?.closest('.stepper-controls') ? document.activeElement.textContent : ''`); if (t) reached = t; }
  check("keyboard: Tab reaches a stepper button", reached === "Next" || reached === "Back", reached);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 }); await sleep(100);
  const l2 = await evalJS(`document.querySelector('.stepper-count').textContent`);
  check("keyboard: ArrowRight moves to step 2", l2 === "Step 2 of 5", l2);
  for (let i = 0; i < 6 && (await evalJS(`document.querySelector(".stepper-count").textContent`)) !== "Step 5 of 5"; i++) { await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 }); await sleep(60); }
  const endFocus = await evalJS(`(() => { const a = document.activeElement; return a && a.closest('.stepper') && !a.disabled ? (a.textContent || a.className) : 'lost:' + (a ? a.tagName + (a.disabled ? ':disabled' : '') : 'none'); })()`);
  check("keyboard: focus stays usable at the last frame", !String(endFocus).startsWith("lost"), endFocus);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 }); await sleep(60);
  const l4 = await evalJS(`document.querySelector('.stepper-count').textContent`);
  check("keyboard: ArrowLeft works after reaching the end", l4 === "Step 4 of 5", l4);
  await open(how, { reduced: true });
  const anim = await evalJS(`getComputedStyle(document.querySelector('li.frame.is-current')).animationName + '|' + getComputedStyle(document.querySelector('li.frame.is-current')).transitionDuration`);
  check("reduced motion: no animation, 0s transition", anim === "none|0s", anim);
  const autoplay = await (async () => { await sleep(2500); return evalJS(`document.querySelector('.stepper-count').textContent`); })();
  check("no auto-play", autoplay === "Step 1 of 5", autoplay);
  await open(how, { media: "print" });
  v = await evalJS(visible); c = await evalJS(capsVisible);
  check("print: all 5 frames", v === 5, v); check("print: all 5 captions", c === 5, c);
  // The nav must not jump between pages: same left edge for nav and article
  // on every page, the nav flush to the viewport's left edge, and the nav's
  // own scroll position kept when you click through.
  const geo = [];
  for (const p of ["index.html", "how-it-works.html", "quickstart.html"]) {
    await open(`${base}/${p}`);
    geo.push(await evalJS(`JSON.stringify([Math.round(document.querySelector('.docs-nav').getBoundingClientRect().left), Math.round(document.querySelector('.docs-article').getBoundingClientRect().left)])`));
  }
  check("nav and article sit at the same place on every page", new Set(geo).size === 1, geo);
  check("nav is flush to the left edge", JSON.parse(geo[0])[0] === 0, geo[0]);
  await open(`${base}/index.html`, { width: 1280 });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 500, deviceScaleFactor: 1, mobile: false });
  await sleep(200);
  await evalJS(`document.querySelector('.docs-nav').scrollTop = 200`);
  const before = await evalJS(`document.querySelector('.docs-nav').scrollTop`);
  await evalJS(`[...document.querySelectorAll('.docs-nav a')].find(a => a.textContent === 'Your first app').click()`);
  await sleep(1200);
  const after = await evalJS(`document.querySelector('.docs-nav').scrollTop`);
  check("nav keeps its scroll position across a click", before > 0 && Math.abs(after - before) <= 2, [before, after]);
  for (const p of ["index.html", "how-it-works.html", "quickstart.html"]) {
    await open(`${base}/${p}`, { width: 390 });
    const sw = await evalJS(`document.documentElement.scrollWidth`);
    const sub = await evalJS(`[...document.querySelectorAll('.docs-nav .nav-group ul')].filter(u=>u.getClientRects().length).length`);
    const pre = await evalJS(`[...document.querySelectorAll('pre')].every(p=>getComputedStyle(p).overflowX==='auto')`);
    check(`390px ${p}: no horizontal scroll`, sw <= 390, sw); check(`390px ${p}: nav collapsed`, sub === 0, sub); check(`390px ${p}: code blocks scroll inside`, pre === true, pre);
    await shot(`${p.replace(".html", "")}-390`);
  }
  for (const p of ["index.html", "quickstart.html"]) { await open(`${base}/${p}`); await shot(`${p.replace(".html", "")}-1280`); }
} finally { console.log(results.join("\n")); chrome.kill(); process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0); }
