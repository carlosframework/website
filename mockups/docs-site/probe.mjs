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
  const scroller = `document.querySelector('.docs-nav .nav-groups')`;
  const inScroller = await evalJS(`!!${scroller} && ${scroller}.contains(document.querySelector('.docs-search'))`);
  check("search sits outside the nav's scrolling list", inScroller === false, inScroller);
  const searchTop0 = await evalJS(`Math.round(document.querySelector('.docs-search').getBoundingClientRect().top)`);
  await evalJS(`${scroller} && (${scroller}.scrollTop = 200)`);
  const before = await evalJS(`${scroller} ? ${scroller}.scrollTop : -1`);
  const searchTop1 = await evalJS(`Math.round(document.querySelector('.docs-search').getBoundingClientRect().top)`);
  check("search stays put when the nav scrolls", before > 0 && searchTop0 === searchTop1, [before, searchTop0, searchTop1]);
  const align = await evalJS(`JSON.stringify([Math.round(document.querySelector('.docs-search').getBoundingClientRect().left), Math.round(document.querySelector('.docs-nav-title').getBoundingClientRect().left), Math.round(document.querySelector('.docs-search').getBoundingClientRect().right), Math.round(document.querySelector('.nav-head').getBoundingClientRect().right - parseFloat(getComputedStyle(document.querySelector('.nav-head')).paddingRight))])`);
  const [sl, tl, sr, hr] = JSON.parse(align || "[0,1,0,1]");
  check("search lines up with the nav title and fills the column", sl === tl && Math.abs(sr - hr) <= 1, align);
  const topAlign = await evalJS(`JSON.stringify([Math.round(document.querySelector('.docs-nav-title').getBoundingClientRect().left), Math.round(document.querySelector('.docs-nav a.nav-top').getBoundingClientRect().left + parseFloat(getComputedStyle(document.querySelector('.docs-nav a.nav-top')).paddingLeft))])`);
  check("section headings line up with the nav title", JSON.parse(topAlign)[0] === JSON.parse(topAlign)[1], topAlign);
  const bl = await evalJS(`getComputedStyle(document.querySelector('.docs-search')).borderLeftWidth === getComputedStyle(document.querySelector('.docs-search')).borderRightWidth`);
  check("search has an even border", bl === true, bl);
  await evalJS(`[...document.querySelectorAll('.docs-nav a')].find(a => a.textContent === 'Your first app').click()`);
  await sleep(1200);
  const after = await evalJS(`${scroller} ? ${scroller}.scrollTop : -1`);
  check("nav keeps its scroll position across a click", before > 0 && Math.abs(after - before) <= 2, [before, after]);
  // Search: with JavaScript, clicking it opens a search box over the page
  // and the page does not move; typing filters; Escape closes it.
  await open(`${base}/index.html`);
  const y0 = await evalJS(`scrollY`);
  await evalJS(`document.querySelector('.docs-search').click()`);
  await sleep(200);
  const y1 = await evalJS(`scrollY`);
  const dlg = await evalJS(`!!document.querySelector('dialog.search-dialog[open]')`);
  const focusIn = await evalJS(`document.activeElement?.matches('dialog.search-dialog input') || false`);
  check("search click does not scroll the page", y0 === y1, [y0, y1]);
  check("search click opens the search box with focus in it", dlg && focusIn, [dlg, focusIn]);
  await send("Input.insertText", { text: "how it" });
  await sleep(150);
  const hits = await evalJS(`[...document.querySelectorAll('dialog.search-dialog li a')].map(a => a.textContent.trim())`);
  check("typing filters the results", Array.isArray(hits) && hits.length >= 1 && hits.every(h => /how it/i.test(h)), hits);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await sleep(150);
  check("Escape closes the search box", await evalJS(`!document.querySelector('dialog.search-dialog[open]')`), "still open");
  // The visible close control dismisses the search, and there is only one
  // (the browser's own clear button inside the field is hidden).
  await open(`${base}/index.html`);
  await evalJS(`document.querySelector('.docs-search').click()`);
  await sleep(150);
  await send("Input.insertText", { text: "rails" });
  const closers = await evalJS(`document.querySelectorAll('dialog.search-dialog .search-close').length`);
  const field = await evalJS(`(() => { const i = document.querySelector('dialog.search-dialog input'); return i.type + '|' + i.getAttribute('role'); })()`);
  check("search has one close button, and no native clear button", closers === 1 && field === "text|searchbox", [closers, field]);
  await evalJS(`document.querySelector('dialog.search-dialog .search-close')?.click()`);
  await sleep(150);
  check("the close button dismisses the search", await evalJS(`!document.querySelector('dialog.search-dialog[open]')`), "still open");
  await open(`${base}/index.html`, { js: false });
  const idx = await evalJS(`document.querySelectorAll('#page-index ~ ul.page-index a, ul.page-index a').length`);
  check("without JavaScript the page index lists pages", idx >= 10, idx);
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
