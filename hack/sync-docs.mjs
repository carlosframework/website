// 🤖 Vendors the docs corpus from a platform checkout into src/docs/.
//
// The corpus lives in carlosframework/platform under docs/site, where it
// is gated by that repo's Go tests and changes in the same pull request
// as the code it describes. This script copies it here and records the
// sha it came from, so the site build is self-contained: it never needs
// the Go repo present and never fails because a checkout is missing.
//
// Usage:
//   node hack/sync-docs.mjs <path-to-platform-checkout>
//   node hack/sync-docs.mjs <path> --check    # verify, write nothing
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const [, , checkout, ...flags] = process.argv;
const check = flags.includes("--check");

if (!checkout) {
  console.error("usage: node hack/sync-docs.mjs <path-to-platform-checkout> [--check]");
  process.exit(2);
}

const source = join(checkout, "docs", "site");
const dest = "src/docs";
const navDest = "src/_data/docsnav.json";
const anchorsDest = "src/_data/docsanchors.json";
const versionDest = "src/_data/docsversion.json";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".md")) out.push(p);
  }
  return out.sort();
}

let sha = "unknown";
try {
  sha = execFileSync("git", ["-C", checkout, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch {
  console.error(`warning: could not read a sha from ${checkout}`);
}

try {
  statSync(source);
} catch {
  console.error(`no docs corpus at ${source}`);
  process.exit(1);
}

const files = walk(source);
if (files.length === 0) {
  console.error(`no markdown under ${source}`);
  process.exit(1);
}

const nav = readFileSync(join(source, "nav.json"), "utf8");
const anchors = readFileSync(join(source, "anchors.json"), "utf8");

// Eleventy directory data for the vendored tree. This script owns it
// because this script wipes the directory: the vendored markdown is
// input for src/docs.njk and src/docsmd.njk, not pages in its own
// right, and without permalink:false every page also writes itself to
// its default output — index.md collides with the /docs index and the
// build fails. Leaving it as a hand-maintained file meant the first
// re-sync deleted it.
const dirData =
  JSON.stringify(
    {
      "//": "Written by hack/sync-docs.mjs. The vendored markdown is input for src/docs.njk and src/docsmd.njk, not pages of its own.",
      permalink: false,
      eleventyExcludeFromCollections: false,
    },
    null,
    2,
  ) + "\n";

if (check) {
  // A drifted vendored copy is a stale site, which is worse than a
  // failed build because it looks fine.
  const problems = [];
  for (const file of files) {
    const rel = relative(source, file);
    let have = null;
    try {
      have = readFileSync(join(dest, rel), "utf8");
    } catch {
      problems.push(`missing: ${rel}`);
      continue;
    }
    if (have !== readFileSync(file, "utf8")) problems.push(`differs: ${rel}`);
  }
  let vendored = [];
  try {
    vendored = walk(dest).map((p) => relative(dest, p));
  } catch {
    vendored = [];
  }
  for (const rel of vendored) {
    if (!files.some((f) => relative(source, f) === rel)) problems.push(`stale: ${rel}`);
  }
  if (readFileSync(navDest, "utf8") !== nav) problems.push("differs: nav.json");
  if (readFileSync(anchorsDest, "utf8") !== anchors) problems.push("differs: anchors.json");
  try {
    if (readFileSync(join(dest, "docs.json"), "utf8") !== dirData) problems.push("differs: docs.json");
  } catch {
    problems.push("missing: docs.json");
  }
  if (problems.length) {
    console.error(`src/docs is out of sync with ${checkout}:`);
    for (const p of problems) console.error(`  ${p}`);
    console.error(`run: node hack/sync-docs.mjs ${checkout}`);
    process.exit(1);
  }
  console.log(`docs in sync with ${sha.slice(0, 7)} (${files.length} pages)`);
  process.exit(0);
}

rmSync(dest, { recursive: true, force: true });
for (const file of files) {
  const rel = relative(source, file);
  const target = join(dest, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(file));
}
writeFileSync(join(dest, "docs.json"), dirData);
writeFileSync(navDest, nav);
writeFileSync(anchorsDest, anchors);
writeFileSync(
  versionDest,
  JSON.stringify({ sha, short: sha.slice(0, 7), pages: files.length }, null, 2) + "\n",
);
console.log(`synced ${files.length} pages from ${sha.slice(0, 7)}`);
