// 🤖 Tests the docs markdown renderer's diagram and stepper fences
// (platform docs site Plan 2 Task 3). The fence formats are the platform
// repo's internal/docsite/diagrams.go; the HTML contract is the one the
// docs mockup fixed and docs-stepper.js enhances.
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderDocsMarkdown } from "./docs-markdown.mjs";

const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "docs-md-"));
const failures = [];
const expect = (name, ok, got) => { if (!ok) failures.push(`${name}${got === undefined ? "" : `: ${String(got).slice(0, 300)}`}`); };
const throws = (name, fn, want) => {
  try { fn(); failures.push(`${name}: did not throw`); }
  catch (e) { if (!String(e.message).includes(want)) failures.push(`${name}: threw ${e.message}, want it to name ${want}`); }
};

try {
  const svg = (label) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>${label}</title><rect class="shape" width="10" height="10"/></svg>`;
  for (const n of ["map", "wake-1", "wake-2", "wake-3"]) writeFileSync(join(dir, `${n}.svg`), svg(n));
  writeFileSync(join(dir, "bad.svg"), `<svg><script>alert(1)</script></svg>`);

  const html = renderDocsMarkdown([
    "# Guide", "",
    "```diagram", "file: map.svg", "One console, one bucket", "and a fleet of boxes.", "```", "",
    "```stepper", "title: A request wakes an instance",
    "frame: wake-1.svg", "The request arrives.",
    "frame: wake-2.svg", "The edge holds it.",
    "frame: wake-3.svg", "The instance answers.", "```", "",
    "```sh", "carlos run --app shop -- bin/rails db:seed", "```",
  ].join("\n"), { diagramsDir: dir });

  const figure = html.match(/<figure class="diagram">([\s\S]*?)<\/figure>/);
  expect("a diagram renders as figure.diagram", !!figure, html);
  expect("the diagram's SVG is inlined", figure && figure[1].includes("<title>map</title>") && !html.includes("<img"), figure && figure[1]);
  expect("the diagram has its caption, joined", figure && /<figcaption>One console, one bucket and a fleet of boxes\.<\/figcaption>/.test(figure[1]), figure && figure[1]);

  const stepper = html.match(/<section class="stepper diagram" aria-label="A request wakes an instance"><ol class="frames">([\s\S]*?)<\/ol><\/section>/);
  expect("a stepper renders as section.stepper with its title as aria-label", !!stepper, html);
  const frames = stepper ? [...stepper[1].matchAll(/<li class="frame"><figure>([\s\S]*?)<\/figure><\/li>/g)] : [];
  expect("the stepper has 3 frames", frames.length === 3, frames.length);
  expect("each frame inlines its own SVG and caption", frames.length === 3 && frames.every((f, i) => f[1].includes(`<title>wake-${i + 1}</title>`) && /<figcaption>\S[^<]*<\/figcaption>/.test(f[1])), stepper && stepper[1]);
  expect("other fences still render as code", html.includes('<pre><code class="language-sh">carlos run'), html);
  expect("captions are escaped", !renderDocsMarkdown("```diagram\nfile: map.svg\nA <b>bold</b> claim.\n```", { diagramsDir: dir }).includes("<b>"));

  // The same allowlist as internal/docsite (Astra's final review).
  const bad = {
    "slash onload": `<svg/onload=alert(1)></svg>`,
    "encoded js href": `<svg><a href="java&#x73;cript:alert(1)"><text>x</text></a></svg>`,
    "xlink js": `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="java&#x73;cript:x"/></svg>`,
    "iframe": `<svg></svg><iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>`,
    "style element": `<svg><style>body { display: none }</style></svg>`,
    "style attribute": `<svg><rect style="display:none"/></svg>`,
    "external use": `<svg><use href="https://example.com/x.svg#a"/></svg>`,
    "data uri": `<svg><image href="data:image/svg+xml;base64,PHN2Zz4="/></svg>`,
    "doctype entity": `<!DOCTYPE svg [<!ENTITY x "y">]><svg>&x;</svg>`,
    "unquoted attr": `<svg><rect width=10 /></svg>`,
    "onclick": `<svg><rect OnClick="x()"/></svg>`,
    "foreign": `<svg><foreignObject><div>x</div></foreignObject></svg>`,
  };
  for (const [name, svg] of Object.entries(bad)) {
    writeFileSync(join(dir, "evil.svg"), svg);
    throws(`an SVG with ${name} fails the build`, () => renderDocsMarkdown("```diagram\nfile: evil.svg\nCaption.\n```", { diagramsDir: dir }), "evil.svg");
  }
  writeFileSync(join(dir, "plain.svg"), `<?xml version="1.0" encoding="UTF-8"?>
<!-- a comment is fine -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40" role="img" aria-labelledby="t">
  <title id="t">Console &amp; boxes</title>
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z"/></marker></defs>
  <g class="parts"><rect class="shape on" x="1" y="1" width="40" height="20" rx="4"/><line class="line" x1="41" y1="11" x2="65" y2="11" marker-end="url(#arrow)"/><text x="5" y="15" class="small">edge <tspan class="on">on</tspan></text><use href="#arrow"/></g>
</svg>`);
  let plainOk = true;
  try { renderDocsMarkdown("```diagram\nfile: plain.svg\nCaption.\n```", { diagramsDir: dir }); } catch (e) { plainOk = false; failures.push(`a plain SVG was refused: ${e.message}`); }
  throws("an unclosed fence fails the build", () => renderDocsMarkdown("# Guide\n\n```stepper\ntitle: T\nframe: wake-1.svg\nOne.\nframe: wake-2.svg\nTwo.\n", { diagramsDir: dir }), "never closed");

  throws("a missing SVG fails the build", () => renderDocsMarkdown("```diagram\nfile: gone.svg\nCaption.\n```", { diagramsDir: dir }), "gone.svg");
  throws("an SVG with script fails the build", () => renderDocsMarkdown("```diagram\nfile: bad.svg\nCaption.\n```", { diagramsDir: dir }), "bad.svg");
  throws("a one-frame stepper fails the build", () => renderDocsMarkdown("```stepper\ntitle: T\nframe: map.svg\nOne.\n```", { diagramsDir: dir }), "2 frames");
  throws("a bad file name fails the build", () => renderDocsMarkdown("```diagram\nfile: ../map.svg\nCaption.\n```", { diagramsDir: dir }), "../map.svg");
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(failures.join("\n"));
  console.error(`FAIL: ${failures.length}`);
  process.exit(1);
}
console.log("docs markdown ok");
