// 🤖 The docs markdown renderer, shared by eleventy.config.js and
// hack/test-docs-markdown.mjs.
//
// Beyond markdown-it and its anchors, it renders two fence kinds as
// figures. Their format is the platform repo's
// internal/docsite/diagrams.go, which gates the corpus; this side fails
// the build on the same mistakes, so a broken figure never ships:
//
//   ```diagram                 ```stepper
//   file: system-map.svg       title: A request wakes a sleeping instance
//   The caption.               frame: wake-1.svg
//   ```                        The first frame's caption.
//                              frame: wake-2.svg
//                              The second frame's caption.
//                              ```
//
// Each SVG is read from the diagrams directory and inlined, so its shapes
// take the page's colours from CSS. A stepper is a numbered list of
// figures; src/docs-stepper.js turns it into one frame at a time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

// slugify must match internal/docsite's Anchor in the platform repo
// exactly, or an internal fragment link passes that repo's Go gate and
// 404s in a browser. Both sides are deliberately plain: lowercase
// alphanumerics, everything else a separator. src/_data/docsanchors.json
// (vendored from docs/site/anchors.json) is the contract both sides are
// checked against.
export function slugify(text) {
  let out = "";
  let pendingSep = false;
  for (const ch of String(text).toLowerCase()) {
    if ((ch >= "a" && ch <= "z") || (ch >= "0" && ch <= "9")) {
      if (pendingSep && out.length > 0) out += "-";
      pendingSep = false;
      out += ch;
    } else {
      pendingSep = true;
    }
  }
  return out;
}

const diagramFile = /^[a-z0-9][a-z0-9-]*\.svg$/;
const activeSVG = /<script|\son[a-z]+\s*=|javascript:|<foreignobject/i;

function escapeHTML(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// parseDiagramFence mirrors internal/docsite.ParseDiagramFence.
export function parseDiagramFence(kind, body) {
  const lines = body.trim().split("\n");
  const frames = [];
  let cur = null;
  let caption = [];
  const flush = () => {
    if (!cur) return;
    cur.caption = caption.join(" ").split(/\s+/).filter(Boolean).join(" ");
    if (!cur.caption) throw new Error(`${cur.file} has no caption`);
    frames.push(cur);
    cur = null;
    caption = [];
  };
  const start = (key, line) => {
    const name = line.slice(key.length).trim();
    if (!diagramFile.test(name)) throw new Error(`"${name}" is not a diagram file name (lower case letters, digits and hyphens, ending .svg)`);
    flush();
    cur = { file: name, caption: "" };
  };
  if (kind === "diagram") {
    if (!lines[0] || !lines[0].startsWith("file:")) throw new Error("a diagram fence starts with a file: line");
    start("file:", lines[0]);
    caption = lines.slice(1);
    flush();
    return { kind, title: "", frames };
  }
  if (kind === "stepper") {
    if (!lines[0] || !lines[0].startsWith("title:")) throw new Error("a stepper fence starts with a title: line");
    const title = lines[0].slice("title:".length).trim();
    if (!title) throw new Error("the stepper's title is empty");
    for (const line of lines.slice(1)) {
      if (line.startsWith("frame:")) { start("frame:", line); continue; }
      if (!cur) {
        if (line.trim()) throw new Error("text before the first frame: line");
        continue;
      }
      caption.push(line);
    }
    flush();
    if (frames.length < 2) throw new Error(`a stepper needs at least 2 frames, this one has ${frames.length}`);
    return { kind, title, frames };
  }
  throw new Error(`"${kind}" is not a diagram kind`);
}

function readSVG(diagramsDir, file) {
  let svg;
  try {
    svg = readFileSync(join(diagramsDir, file), "utf8");
  } catch {
    throw new Error(`diagram ${file} does not exist in ${diagramsDir}`);
  }
  if (activeSVG.test(svg)) throw new Error(`diagram ${file} holds script, an event handler, a javascript: link or foreign HTML, and is inlined into the page`);
  return svg.replace(/<\?xml[^>]*\?>\s*/, "").trim();
}

function figure(diagramsDir, f) {
  return `<figure>${readSVG(diagramsDir, f.file)}<figcaption>${escapeHTML(f.caption)}</figcaption></figure>`;
}

// createDocsMarkdown returns the configured markdown-it instance.
export function createDocsMarkdown({ diagramsDir }) {
  const md = markdownIt({ html: true, linkify: false, typographer: false }).use(
    markdownItAnchor,
    { slugify, level: [2, 3, 4], tabIndex: false },
  );
  const fence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const info = tokens[idx].info.trim().split(/\s+/)[0];
    if (info !== "diagram" && info !== "stepper") return fence(tokens, idx, options, env, self);
    const where = env && env.page && env.page.inputPath ? ` in ${env.page.inputPath}` : "";
    let d;
    try {
      d = parseDiagramFence(info, tokens[idx].content);
    } catch (e) {
      throw new Error(`${info} fence${where}: ${e.message}`);
    }
    if (d.kind === "diagram") {
      return `<figure class="diagram">${readSVG(diagramsDir, d.frames[0].file)}<figcaption>${escapeHTML(d.frames[0].caption)}</figcaption></figure>\n`;
    }
    const items = d.frames.map((f) => `<li class="frame">${figure(diagramsDir, f)}</li>`).join("");
    return `<section class="stepper diagram" aria-label="${escapeHTML(d.title)}"><ol class="frames">${items}</ol></section>\n`;
  };
  return md;
}

// renderDocsMarkdown renders one page's markdown, for tests.
export function renderDocsMarkdown(src, { diagramsDir }) {
  return createDocsMarkdown({ diagramsDir }).render(src, {});
}
