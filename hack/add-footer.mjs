import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(file);
    else if (entry.name.endsWith(".html")) yield file;
  }
}

export async function addFooter(outputDir) {
  const template = await readFile("src/_includes/footer.html", "utf8");
  for await (const file of htmlFiles(outputDir)) {
    let html = await readFile(file, "utf8");
    if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) continue;
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/i);
    if (!footer) throw new Error(`Cannot add footer to ${file}: missing footer`);
    // Docs retain their rendered source revision when the shared links change.
    const provenance = footer[0].match(/<p class="docs-provenance">[\s\S]*?<\/p>/)?.[0] ?? "";
    const content = template.replace("<!-- site-footer:provenance -->", provenance);
    html = html.replace(footer[0], `<footer class="site-footer">\n${content}</footer>`);
    html = html.replace(/<!-- site-footer:head -->[\s\S]*?<!-- \/site-footer:head -->\n?/g, "");
    html = html.replace(/<\/head>/i, '<!-- site-footer:head -->\n<link rel="stylesheet" href="/footer.css?v=0">\n<!-- /site-footer:head -->\n</head>');
    await writeFile(file, html);
  }
}
