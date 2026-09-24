import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const escape = (text) => text.replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith(".html")) yield file;
  }
}

export async function addDisclaimer(outputDir) {
  const copy = JSON.parse(await readFile("src/_data/ai-disclaimer.json", "utf8"));
  const paragraphs = copy.paragraphs.map((text) => `<p>${escape(text)}</p>`).join("\n");
  const assets = await Promise.all(["css", "js"].map(async (ext) => {
    const data = await readFile(`src/ai-disclaimer.${ext}`);
    return `/ai-disclaimer.${ext}?v=${createHash("sha256").update(data).digest("hex").slice(0, 12)}`;
  }));
  const head = `<!-- ai-disclaimer:head -->
<link rel="stylesheet" href="${assets[0]}">
<script src="${assets[1]}" defer></script>
<!-- /ai-disclaimer:head -->`;
  const notice = `<!-- ai-disclaimer:notice -->
<!-- 👨 -->
<dialog class="ai-disclaimer" id="ai-disclaimer" aria-labelledby="ai-disclaimer-title">
  <h2 id="ai-disclaimer-title" tabindex="-1">${escape(copy.title)}</h2>
  ${paragraphs}
  <button class="btn primary" type="button" data-ai-disclaimer-continue>${escape(copy.continue)}</button>
</dialog>
<noscript><aside class="ai-disclaimer-fallback">
  <h2>${escape(copy.title)}</h2>
  ${paragraphs}
</aside></noscript>
<!-- /ai-disclaimer:notice -->`;
  const reopen = `<!-- ai-disclaimer:reopen -->
<!-- 👨 -->
<p><button class="ai-disclaimer-reopen" type="button" data-ai-disclaimer-open hidden>${escape(copy.reopen)}</button></p>
<!-- /ai-disclaimer:reopen -->`;

  for await (const file of htmlFiles(outputDir)) {
    let html = await readFile(file, "utf8");
    // A watch rebuild may leave passthrough pages in place.
    html = html.replace(/<!-- ai-disclaimer:(head|notice|reopen) -->[\s\S]*?<!-- \/ai-disclaimer:\1 -->\n?/g, "");
    if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) {
      await writeFile(file, html);
      continue;
    }
    if (!/<\/head>/i.test(html) || !/<body\b[^>]*>/i.test(html) || !/<\/footer>/i.test(html)) {
      throw new Error(`Cannot add disclaimer to ${file}: missing head, body or footer`);
    }
    html = html.replace(/<\/head>/i, `${head}\n</head>`);
    html = html.replace(/<body\b[^>]*>/i, (body) => `${body}\n${notice}`);
    html = html.replace(/<\/footer>/i, `${reopen}\n</footer>`);
    await writeFile(file, html);
  }
}
