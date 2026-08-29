// 🤖 Fails the build when the built agent-skills surface is broken.
//
// sync-skills.mjs gates the vendored tree against the skills repo; this
// checks what that cannot — that the build actually shipped the files
// the discovery index promises. An index entry whose url 404s, or whose
// digest doesn't match the served bytes, is exactly the failure a
// consumer would hit: the spec tells clients to treat a digest mismatch
// as corruption or tampering and refuse the skill. llms.txt gets the
// same treatment — every carlosframework.com link in it must resolve to
// a built file, so the docs it points agents at cannot silently rot.
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const site = "_site";
const root = join(site, ".well-known", "agent-skills");

const problems = [];
const fail = (m) => problems.push(m);

const exists = (p) => {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
};

// 1. The index itself: present, parseable, the schema version this
//    repo's tooling knows how to write.
let index = null;
try {
  index = JSON.parse(readFileSync(join(root, "index.json"), "utf8"));
} catch (e) {
  fail(`.well-known/agent-skills/index.json: ${e.message}`);
}

if (index) {
  if (index.$schema !== "https://schemas.agentskills.io/discovery/0.2.0/schema.json") {
    fail(`index.json: unexpected $schema ${JSON.stringify(index.$schema)}`);
  }
  if (!Array.isArray(index.skills) || index.skills.length === 0) {
    fail("index.json: no skills listed");
  }

  for (const entry of index.skills ?? []) {
    const where = `index.json entry ${JSON.stringify(entry.name)}`;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(entry.name ?? "")) fail(`${where}: bad name`);
    if (entry.type !== "skill-md") fail(`${where}: unexpected type ${JSON.stringify(entry.type)}`);
    if (!entry.description || entry.description.length > 1024) {
      fail(`${where}: description missing or over 1024 chars`);
    }
    if (!String(entry.url ?? "").startsWith("/.well-known/agent-skills/")) {
      fail(`${where}: url ${JSON.stringify(entry.url)} is outside /.well-known/agent-skills/`);
      continue;
    }
    const built = join(site, entry.url);
    if (!exists(built)) {
      fail(`${where}: url ${entry.url} has no built file`);
      continue;
    }
    // 2. The digest verifies against the bytes actually in _site — the
    //    bytes a consumer will hash.
    const raw = readFileSync(built);
    const digest = "sha256:" + createHash("sha256").update(raw).digest("hex");
    if (digest !== entry.digest) fail(`${where}: digest does not match built ${entry.url}`);
    // 3. The skill's own relative links (references/…) resolve next to
    //    it, so an agent that fetched SKILL.md over HTTP can follow them.
    const dir = join(site, entry.url, "..");
    for (const m of String(raw).matchAll(/\]\(([^)]+)\)/g)) {
      const href = m[1];
      if (/^[a-z]+:|^\/|^#/.test(href)) continue;
      if (!exists(join(dir, href.split("#")[0]))) {
        fail(`${where}: link ${href} has no built file`);
      }
    }
  }
}

// 4. llms.txt was built, and everything it points at on this site exists.
let llms = null;
try {
  llms = readFileSync(join(site, "llms.txt"), "utf8");
} catch {
  fail("llms.txt: not built");
}
if (llms) {
  for (const m of llms.matchAll(/https:\/\/carlosframework\.com(\/[^\s)]*)/g)) {
    const p = m[1].split("#")[0];
    const built = p.endsWith("/") || !p.split("/").pop().includes(".")
      ? join(site, p, "index.html")
      : join(site, p);
    if (!exists(built)) fail(`llms.txt: ${p} has no built file`);
  }
  if (!llms.includes("/.well-known/agent-skills/index.json")) {
    fail("llms.txt: does not point at the agent-skills index");
  }
  // llms.txt is plain text read by agents, not HTML — a template change
  // that reintroduces Nunjucks autoescaping shows up as entities here.
  if (/&(quot|#39|amp|lt|gt);/.test(llms)) {
    fail("llms.txt: contains HTML entities — a template lost its | safe");
  }
}

if (problems.length) {
  console.error("agent-skills check failed:");
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log(`agent-skills ok (${index.skills.length} skills, digests verified)`);
