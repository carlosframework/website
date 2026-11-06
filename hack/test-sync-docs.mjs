// 🤖 Tests that hack/sync-docs.mjs vendors docs/site/diagrams/*.svg and
// that --check catches a missing, changed or stale diagram.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const sync = resolve("hack/sync-docs.mjs");
const root = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "sync-docs-"));
const failures = [];
const run = (cwd, args) => {
  try { return { ok: true, out: execFileSync("node", [sync, ...args], { cwd, encoding: "utf8", stdio: "pipe" }) }; }
  catch (e) { return { ok: false, out: String(e.stdout) + String(e.stderr) }; }
};
try {
  const checkout = join(root, "platform");
  const site = join(checkout, "docs", "site");
  mkdirSync(join(site, "diagrams"), { recursive: true });
  writeFileSync(join(site, "nav.json"), JSON.stringify({ sections: [{ title: "Guides", pages: [{ slug: "guide", label: "Guide", blurb: "b" }] }] }));
  writeFileSync(join(site, "anchors.json"), "{}");
  writeFileSync(join(site, "changelog.json"), "{}");
  writeFileSync(join(site, "index.md"), "# Docs\n");
  writeFileSync(join(site, "guide.md"), "# Guide\n");
  writeFileSync(join(site, "diagrams", "map.svg"), "<svg></svg>");
  const web = join(root, "website");
  mkdirSync(join(web, "src", "_data"), { recursive: true });

  let r = run(web, [checkout]);
  if (!r.ok) failures.push(`sync failed: ${r.out}`);
  if (!existsSync(join(web, "src", "docs", "diagrams", "map.svg"))) failures.push("sync did not copy diagrams/map.svg");
  r = run(web, [checkout, "--check"]);
  if (!r.ok) failures.push(`--check failed right after a sync: ${r.out}`);

  rmSync(join(web, "src", "docs", "diagrams", "map.svg"), { force: true });
  r = run(web, [checkout, "--check"]);
  if (r.ok || !r.out.includes("missing: diagrams/map.svg")) failures.push(`--check missed a missing diagram: ${r.out}`);

  run(web, [checkout]);
  writeFileSync(join(web, "src", "docs", "diagrams", "map.svg"), "<svg><rect/></svg>");
  r = run(web, [checkout, "--check"]);
  if (r.ok || !r.out.includes("differs: diagrams/map.svg")) failures.push(`--check missed a changed diagram: ${r.out}`);

  run(web, [checkout]);
  writeFileSync(join(web, "src", "docs", "diagrams", "old.svg"), "<svg></svg>");
  r = run(web, [checkout, "--check"]);
  if (r.ok || !r.out.includes("stale: diagrams/old.svg")) failures.push(`--check missed a stale diagram: ${r.out}`);

  rmSync(join(site, "diagrams"), { recursive: true });
  r = run(web, [checkout]);
  if (!r.ok) failures.push(`a corpus with no diagrams dir must still sync: ${r.out}`);
} finally {
  rmSync(root, { recursive: true, force: true });
}
if (failures.length) { console.error(failures.join("\n")); console.error(`FAIL: ${failures.length}`); process.exit(1); }
console.log("sync-docs ok");
