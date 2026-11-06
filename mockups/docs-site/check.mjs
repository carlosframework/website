// 🤖 Structure checks for the docs site mockup (platform plan
// docs/superpowers/plans/2026-11-06-docs-site-1-mockup-and-foundations.md,
// Task 1). The mockup is throwaway and never shipped; these checks pin the
// properties the review depends on: it works without JavaScript, it carries
// the nav the spec fixes, and it names no tenant.
//
// Usage: node mockups/docs-site/check.mjs
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pages = ["index.html", "how-it-works.html", "quickstart.html"];
const navWant = [
  "Start here",
  "Tutorials",
  "Guides",
  "Operating a deployment",
  "CLI reference",
  "API reference",
  "Changelog",
];
const allowedHosts = new Set(["example.com", "carloku.com", "carlosframework.com"]);

const failures = [];
const fail = (page, msg) => failures.push(`${page}: ${msg}`);
const text = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

for (const page of pages) {
  const path = join(here, page);
  if (!existsSync(path)) {
    fail(page, "missing");
    continue;
  }
  const html = readFileSync(path, "utf8");

  for (const css of ["../../src/site.css", "mockup.css"]) {
    if (!html.includes(`href="${css}"`)) fail(page, `does not link ${css}`);
  }
  const banner = html.match(/<[a-z]+[^>]*class="[^"]*\bdraft-banner\b[^"]*"[^>]*>([\s\S]*?)<\/[a-z]+>/);
  if (!banner || !text(banner[1]).includes("Mockup")) fail(page, "no draft-banner saying Mockup");

  const nav = html.match(/<nav[^>]*class="[^"]*\bdocs-nav\b[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
  if (!nav) {
    fail(page, "no docs-nav");
  } else {
    const labels = [...nav[1].matchAll(/<a[^>]*class="[^"]*\bnav-top\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => text(m[1]));
    if (JSON.stringify(labels) !== JSON.stringify(navWant)) {
      fail(page, `nav is ${JSON.stringify(labels)}, want ${JSON.stringify(navWant)}`);
    }
  }

  // Frames are never hidden in the source: only stepper.js hides them.
  for (const li of html.matchAll(/<li[^>]*class="[^"]*\bframe\b[^"]*"[^>]*>/g)) {
    if (/\shidden\b|display\s*:\s*none|aria-hidden="true"/.test(li[0])) fail(page, `a frame is hidden in the source: ${li[0]}`);
  }

  // Hostnames: example.com and its subdomains, or the two named public sites.
  for (const m of html.matchAll(/\b((?:[a-z0-9-]+\.)+(?:com|net|org|io|dev|co|app|uk|ie))\b/gi)) {
    const host = m[1].toLowerCase();
    if (allowedHosts.has(host) || host.endsWith(".example.com")) continue;
    fail(page, `names host ${host}`);
  }

  if (page === "how-it-works.html") {
    const map = html.match(/<figure[^>]*id="system-map"[^>]*>/);
    if (!map) fail(page, "no figure#system-map");
    const steppers = [...html.matchAll(/<section[^>]*class="[^"]*\bstepper\b[^"]*"[^>]*>([\s\S]*?)<\/section>/g)];
    if (steppers.length !== 1) {
      fail(page, `has ${steppers.length} steppers, want 1`);
    } else {
      if (steppers[0][1].includes('id="system-map"')) fail(page, "the system map is inside the stepper");
      const frames = [...steppers[0][1].matchAll(/<li[^>]*class="[^"]*\bframe\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g)];
      if (frames.length !== 5) fail(page, `the stepper has ${frames.length} frames, want 5`);
      frames.forEach((f, i) => {
        const svgs = (f[1].match(/<svg\b/g) || []).length;
        const cap = f[1].match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/);
        if (svgs !== 1) fail(page, `frame ${i + 1} has ${svgs} svgs, want 1`);
        if (!cap || !text(cap[1])) fail(page, `frame ${i + 1} has no caption`);
      });
    }
  }

  if (page === "quickstart.html") {
    const before = html.match(/<section[^>]*id="before-you-start"[^>]*>([\s\S]*?)<\/section>/);
    if (!before) {
      fail(page, "no section#before-you-start");
    } else {
      for (const target of ["#install-your-own", "#use-a-running-deployment"]) {
        if (!before[1].includes(`href="${target}"`)) fail(page, `before-you-start does not link ${target}`);
      }
      const firstSection = html.match(/<main[\s\S]*?<section[^>]*id="([^"]+)"/);
      if (!firstSection || firstSection[1] !== "before-you-start") fail(page, "before-you-start is not the first section");
    }
    const steps = html.match(/<ol[^>]*class="[^"]*\bsteps\b[^"]*"[^>]*>([\s\S]*?)<\/ol>/);
    const n = steps ? (steps[1].match(/<li\b/g) || []).length : 0;
    if (n < 4) fail(page, `has ${n} numbered steps, want at least 4`);
    if (!/class="[^"]*\btime\b[^"]*"/.test(html)) fail(page, "no time estimate");
    if (!/<pre[^>]*>\s*<code/.test(html)) fail(page, "no code block");
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`FAIL: ${failures.length} problem(s)`);
  process.exit(1);
}
console.log(`ok: ${pages.length} pages`);
