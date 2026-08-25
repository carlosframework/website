// 🤖 Fails the build when the built docs site is internally broken.
//
// The platform repo gates the corpus as markdown: nav and files agree,
// links resolve, anchors exist, symbols are covered. This checks what
// that cannot — that the rendering actually produced the pages and ids
// those links point at. A link can be correct in the source and still
// 404 in a browser if the renderer disagrees with the gate about how a
// heading becomes an anchor, which is exactly the failure worth
// catching here.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const site = "_site";
const docs = join(site, "docs");
const nav = JSON.parse(readFileSync("src/_data/docsnav.json", "utf8"));

const problems = [];
const fail = (m) => problems.push(m);

function walk(dir, match) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p, match));
    else if (match(entry.name)) out.push(p);
  }
  return out;
}

const exists = (p) => {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
};

// 1. Every nav entry has a built page and a built .md twin.
//
// The floor below is the point of the whole gate: a loop over an empty
// nav asserts nothing, so a sync-docs regression that wrote
// {"sections": []} would print "docs ok — 0 pages" and exit 0 on a
// corpus that had vanished. Same shape as the pages.length guard below.
const slugs = [];
const sections = Array.isArray(nav.sections) ? nav.sections : [];
if (!Array.isArray(nav.sections)) fail("docsnav.json has no sections array at all");
for (const section of sections) {
  for (const entry of section.pages ?? []) {
    slugs.push(entry.slug);
    if (!exists(join(docs, entry.slug, "index.html"))) fail(`no built page for /docs/${entry.slug}/`);
    if (!exists(join(docs, `${entry.slug}.md`))) fail(`no markdown twin for /docs/${entry.slug}.md`);
    if (!entry.blurb) fail(`nav entry ${entry.slug} has no blurb`);
    if (!entry.label) fail(`nav entry ${entry.slug} has no label`);
  }
}
if (slugs.length === 0) {
  fail("docsnav.json lists no pages — sync-docs has not run, or has failed; nothing in check 1 can fail against an empty nav");
}
if (!exists(join(docs, "index.html"))) fail("no built /docs/ index");

// 2. Every internal href resolves — to a built page, and to a real id
//    when it carries a fragment.
const pages = walk(docs, (n) => n.endsWith(".html"));
if (pages.length === 0) fail("no built docs pages at all");

const idsFor = new Map();
for (const p of pages) {
  const html = readFileSync(p, "utf8");
  idsFor.set(p, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1])));
}

// Docs links are "/docs", "/docs/", "/docs/<slug>/" or "/docs/<slug>.md".
// Anchored to a slash (or end) on purpose: this site links a stylesheet
// as /docs.css, and a bare /docs prefix match claimed that as a page and
// failed the build on it.
const docsHref = /href="(\/docs(?:\/[^"]*)?)"/g;

const pageFor = (href) => {
  const clean = href.replace(/[?#].*$/, "");
  if (clean !== "/docs" && !clean.startsWith("/docs/")) return null;
  const rel = clean.replace(/^\/docs\/?/, "").replace(/\/$/, "");
  if (rel === "") return join(docs, "index.html");
  if (rel.endsWith(".md")) return join(docs, rel);
  return join(docs, rel, "index.html");
};

for (const p of pages) {
  const html = readFileSync(p, "utf8");
  const where = relative(site, p);
  for (const m of html.matchAll(docsHref)) {
    const href = m[1];
    const target = pageFor(href);
    if (!target || !exists(target)) {
      fail(`${where}: href="${href}" does not resolve to a built file`);
      continue;
    }
    const hash = href.includes("#") ? href.split("#")[1] : "";
    if (hash && !(idsFor.get(target) ?? new Set()).has(hash)) {
      fail(`${where}: href="${href}" — ${relative(site, target)} has no id="${hash}"`);
    }
  }
  // Same-page fragments.
  const ids = idsFor.get(p);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(m[1])) fail(`${where}: href="#${m[1]}" has no matching id`);
  }
}

// 3. The anchor rule agrees on both sides. The Go gate accepted these
//    fragments; if the renderer slugifies differently they are dead
//    links no earlier check can see. The fixture is the platform repo's
//    docs/site/anchors.json, vendored — both languages read this file
//    rather than each other's implementation.
//
// The "//" key is not a case: hack/sync-docs.mjs prepends a generated-by
// notice to every JSON file it writes. Skip it by name rather than by
// loosening the comparison — the strictness IS this file's purpose.
const { slugify } = await import("../eleventy.config.js");
const fixture = JSON.parse(readFileSync("src/_data/docsanchors.json", "utf8"));
const cases = Object.entries(fixture).filter(([input]) => input !== "//");
if (cases.length < 5) {
  fail("anchor fixture has too few cases to pin anything — did sync-docs run?");
}
for (const [input, want] of cases) {
  const got = slugify(input);
  if (got !== want) {
    fail(`slugify(${JSON.stringify(input)}) = ${JSON.stringify(got)}, want ${JSON.stringify(want)} — the renderer and internal/docsite.Anchor disagree`);
  }
}

if (problems.length) {
  console.error(`docs check failed (${problems.length}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`docs ok — ${slugs.length} pages, ${pages.length} built, ${cases.length} anchor cases agree`);
