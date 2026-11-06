// 🤖 Browser checks for the docs layout (platform docs site Plan 2), in
// headless Chromium over CDP. With no argument it serves ./_site on
// 127.0.0.1 itself; pass a base URL (https://carlosframework.com) to
// check a live site.
//
// Usage: npm run build && node hack/probe-docs.mjs [base-url]
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const scratch = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "probe-docs-"));
const children = [];
let base = process.argv[2];
if (!base) {
  const port = await freePort();
  children.push(spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", "_site"], { stdio: "ignore" }));
  base = `http://127.0.0.1:${port}`;
  await sleep(600);
}
const cdpPort = await freePort();
children.push(spawn("chromium", ["--headless=new", `--remote-debugging-port=${cdpPort}`, "--remote-debugging-address=127.0.0.1", "--no-first-run", `--user-data-dir=${scratch}/profile`, "about:blank"], { stdio: "ignore" }));

let ws, id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJS = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true })).result?.value;
const key = async (k, code, vk, text) => { await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, ...(text ? { text } : {}) }); await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk }); };
async function open(path, { js = true, media = "", reduced = false, width = 1280, height = 900 } = {}) {
  await send("Emulation.setScriptExecutionDisabled", { value: !js });
  await send("Emulation.setEmulatedMedia", { media, features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url: base + path });
  await sleep(1000);
}
const results = [];
const check = (name, ok, got) => results.push(`${ok ? "PASS" : "FAIL"} ${name}${ok ? "" : ` (got ${JSON.stringify(got)})`}`);
const rect = (sel, side) => `Math.round(document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect().${side} ?? -9999)`;
const pages = ["/docs/", "/docs/rootfs/", "/docs/cli/"];

try {
  for (let i = 0; i < 50 && !ws; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: "PUT" });
      ws = new WebSocket((await r.json()).webSocketDebuggerUrl);
    } catch { await sleep(200); }
  }
  await new Promise((r) => ws.addEventListener("open", r));
  ws.addEventListener("message", (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result || {}); pending.delete(d.id); } });
  await send("Page.enable");
  await send("Runtime.enable");

  // The nav is hard-left and does not move between pages.
  const geo = [];
  for (const p of pages) {
    await open(p);
    geo.push(await evalJS(`JSON.stringify([${rect(".docs-nav", "left")}, ${rect(".docs-article", "left")}])`));
  }
  check("nav and article sit at the same place on every page", new Set(geo).size === 1, geo);
  check("nav is flush to the left edge", JSON.parse(geo[0])[0] === 0, geo[0]);

  // A fixed head (title and search) over a list that scrolls on its own.
  await open("/docs/", { height: 500 });
  const list = `document.querySelector('.docs-nav .nav-groups')`;
  check("search sits outside the nav's scrolling list", await evalJS(`!!${list} && !${list}.contains(document.querySelector('.docs-search'))`), "inside or missing");
  const top0 = await evalJS(rect(".docs-search", "top"));
  await evalJS(`${list} && (${list}.scrollTop = 150)`);
  const scrolled = await evalJS(`${list} ? ${list}.scrollTop : -1`);
  check("search stays put when the nav list scrolls", scrolled > 0 && top0 === (await evalJS(rect(".docs-search", "top"))), [scrolled, top0]);
  const al = await evalJS(`JSON.stringify([${rect(".docs-search", "left")}, ${rect(".docs-nav-title", "left")}, ${rect(".docs-nav .docs-nav-section", "left")}])`);
  const [sl, tl, hl] = JSON.parse(al);
  check("search and section headings line up with the nav title", sl === tl && hl === tl, al);
  const label = await evalJS(`document.querySelector('.docs-search span')?.textContent`);
  check("search box says Search the docs", label === "Search the docs", label);
  const click = await evalJS(`(() => { const a = [...document.querySelectorAll('.docs-nav .nav-groups a')].at(-2); if (!a) return ''; a.click(); return a.textContent; })()`);
  await sleep(1200);
  const kept = await evalJS(`${list} ? ${list}.scrollTop : -1`);
  check("nav list keeps its scroll position across a click", scrolled > 0 && Math.abs(kept - scrolled) <= 2, [click, scrolled, kept]);
  await open("/docs/rootfs/", { height: 500 });
  check("the Changelog link is in the nav", await evalJS(`[...document.querySelectorAll('.docs-nav a')].some(a => a.textContent.trim() === 'Changelog' && a.getAttribute('href') === '/platform/changelog/')`), "missing");

  // Without JavaScript, everything still navigates.
  await open("/docs/rootfs/", { js: false });
  const noJs = await evalJS(`JSON.stringify([document.querySelectorAll('.docs-nav .nav-groups a').length, document.querySelector('.docs-search')?.getAttribute('href')])`);
  check("without JavaScript the nav and search are plain links", JSON.parse(noJs)[0] >= 10 && JSON.parse(noJs)[1] === "/docs/#every-page", noJs);

  // On this page: a rail of the page's ## headings on wide screens only.
  await open("/docs/rootfs/", { width: 1440 });
  const toc = await evalJS(`JSON.stringify([[...document.querySelectorAll('.docs-toc a')].map(a => a.textContent.trim()), [...document.querySelectorAll('.docs-article h2')].map(h => h.textContent.trim()), !!document.querySelector('.docs-toc')?.getClientRects().length])`);
  const [tocItems, h2s, tocShown] = JSON.parse(toc);
  check("the rail lists the page's ## headings in order", tocShown && tocItems.length > 0 && JSON.stringify(tocItems) === JSON.stringify(h2s), toc);
  check("the rail is headed On this page", (await evalJS(`document.querySelector('.docs-toc-title')?.textContent.trim()`)) === "On this page", "no heading");
  await open("/docs/rootfs/", { width: 1200 });
  check("the rail is hidden below 80rem", !(await evalJS(`!!document.querySelector('.docs-toc')?.getClientRects().length`)), "shown");
  check("the sidebar no longer repeats a page's sections", !(await evalJS(`!!document.querySelector('.docs-nav .docs-subnav')`)), "subnav still there");
  await open("/docs/", { width: 1440 });
  const indexToc = await evalJS(`JSON.stringify([!!document.querySelector('.docs-toc'), !!document.querySelector('.docs-nav .nav-groups')])`);
  check("a page with no ## headings of its own has no rail", indexToc === "[false,true]", indexToc);

  // A phone: nothing scrolls sideways, and only the current section is open.
  for (const p of pages) {
    await open(p, { width: 390 });
    const sw = await evalJS(`document.documentElement.scrollWidth`);
    const groups = await evalJS(`document.querySelectorAll('.docs-nav .nav-group').length`);
    const open_ = groups ? await evalJS(`[...document.querySelectorAll('.docs-nav .nav-group ul')].filter(u => u.getClientRects().length).length`) : 99;
    check(`390px ${p}: no sideways scroll`, sw <= 390, sw);
    check(`390px ${p}: at most the current section's pages are listed`, open_ <= 1, open_);
  }
} finally {
  console.log(results.join("\n"));
  for (const c of children) c.kill();
  rmSync(scratch, { recursive: true, force: true });
  process.exit(results.length === 0 || results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
}
