// 🤖 Build-time only — the served site ships no JavaScript.
import markdownIt from "markdown-it";
import markdownItAnchor from "markdown-it-anchor";

// slugify must match internal/docsite's Anchor in the platform repo
// exactly, or an internal fragment link passes that repo's Go gate and
// 404s in a browser. Both sides are deliberately plain — lowercase
// alphanumerics, everything else a separator — because
// markdown-it-anchor's own default URI-encodes punctuation, which would
// anchor a heading naming `db.Open` differently on each side.
// src/_data/docsanchors.json (vendored from docs/site/anchors.json) is
// the contract both sides are checked against.
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

// fenceDelim/sameFence port internal/docsite/docsite.go's fence-matching
// exactly, for docsSections below: a trimmed line opens or closes a
// fence, and a closer only closes if it is the same character as the
// opener and at least as long a run.
function fenceDelim(line) {
  let r = null;
  if (line.startsWith("```")) r = "`";
  else if (line.startsWith("~~~")) r = "~";
  else return null;
  let n = 0;
  while (n < line.length && line[n] === r) n++;
  return { mark: line.slice(0, n), info: line.slice(n).trim() };
}

function sameFence(closing, opening) {
  if (!closing || !opening || closing[0] !== opening[0]) return false;
  return closing.length >= opening.length;
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/index.html": "index.html" });
  eleventyConfig.addPassthroughCopy({ "src/platform": "platform" });
  eleventyConfig.addPassthroughCopy({ "src/rastrillo": "rastrillo" });
  eleventyConfig.addPassthroughCopy({ "src/site.css": "site.css" });
  eleventyConfig.addPassthroughCopy({ "src/favicon.svg": "favicon.svg" });

  const md = markdownIt({ html: true, linkify: false, typographer: false }).use(
    markdownItAnchor,
    { slugify, level: [2, 3, 4], tabIndex: false },
  );
  eleventyConfig.setLibrary("md", md);

  // The docs corpus is vendored from the platform repo by
  // hack/sync-docs.mjs. Pages are addressed by slug — "cli" — which is
  // also how nav.json and every internal /docs link name them.
  eleventyConfig.addCollection("docs", (api) =>
    api
      .getFilteredByGlob("src/docs/**/*.md")
      .map((page) => {
        const slug = page.filePathStem.replace(/^\/docs\//, "");
        return { slug, page };
      })
      .filter(({ slug }) => slug !== "index"),
  );

  // The /docs index page's own prose, as its own collection.
  //
  // docs-index.njk renders this page's content above the cards. It must
  // NOT reach for collections.all to find it: that collection contains
  // docs-index.njk itself, and Eleventy rejects a template that reads
  // templateContent from a collection it belongs to as a circular
  // reference. A one-page collection it is not a member of is the way
  // to read another template's rendered output.
  eleventyConfig.addCollection("docsIndex", (api) =>
    api.getFilteredByGlob("src/docs/index.md"),
  );

  // Section headings of one page, for the sidebar's sub-nav. Read from
  // the source rather than the rendered HTML so it needs no DOM.
  //
  // Fence tracking is ported from internal/docsite/docsite.go's
  // fenceDelim/sameFence in the platform repo, not invented here: a
  // closing marker must match the opener's character and be at least as
  // long, so a ``` block nested inside an outer ~~~ fence stays inside
  // that outer fence instead of prematurely toggling out of it (which
  // would both hide real "##" headings after the true close and expose
  // fence-internal "##" lines as fake ones).
  eleventyConfig.addFilter("docsSections", (raw) => {
    const out = [];
    let inFence = false;
    let fenceMark = "";
    for (const line of String(raw).split("\n")) {
      const trimmed = line.trim();
      const fd = fenceDelim(trimmed);
      if (fd) {
        if (!inFence) {
          inFence = true;
          fenceMark = fd.mark;
          continue;
        } else if (sameFence(fd.mark, fenceMark)) {
          inFence = false;
          continue;
        }
        // A fence-looking line that doesn't close the current fence
        // (different character, or a shorter run) is body content of
        // the still-open fence, same as the Go side.
      }
      if (inFence) continue;
      const m = /^##\s+(.+?)\s*#*$/.exec(trimmed);
      if (m) out.push({ title: m[1], anchor: slugify(m[1]) });
    }
    return out;
  });

  eleventyConfig.addFilter("docsSlugify", slugify);

  // A page's own "# " title. The vendored markdown carries no front
  // matter — it is the platform repo's file, byte for byte — so the
  // title is read from the source rather than declared twice.
  eleventyConfig.addFilter("docsTitle", (raw) => {
    for (const line of String(raw).split("\n")) {
      const m = /^#\s+(.+?)\s*#*$/.exec(line);
      if (m) return m[1].replace(/^🤖\s*/, "");
    }
    return "";
  });

  // A page's raw markdown, looked up from the collection by slug.
  //
  // NOT passed through eleventyComputed: a computed value in Nunjucks
  // front matter is a string interpolation, which HTML-escapes it, and
  // an escaped apostrophe turns "carlos's" into "carlos-39-s" in every
  // anchor derived from it. The headings themselves are fine —
  // markdown-it-anchor reads the raw token — so the result was a
  // sub-nav whose links pointed at ids no page had.
  eleventyConfig.addFilter("docsRawFor", (docs, slug) => {
    for (const doc of docs) {
      if (doc.slug === slug) return doc.page.rawInput;
    }
    return "";
  });

  // A page's one-line blurb, from nav.json — the same string the /docs
  // index renders on its card, reused as the meta description so the
  // two cannot drift.
  eleventyConfig.addFilter("docsBlurb", (nav, slug) => {
    for (const section of nav.sections) {
      for (const entry of section.pages) {
        if (entry.slug === slug) return entry.blurb;
      }
    }
    return "";
  });

  return {
    // "html" is deliberately excluded: index.html and platform/index.html
    // are hand-written and must ship byte-identical. If html stayed a
    // template format, Eleventy's default html engine (liquid) would
    // render them as templates in addition to the passthrough copies
    // above, and any literal "{{" in their inline SVG/script would break.
    templateFormats: ["njk", "md"],
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
  };
}
