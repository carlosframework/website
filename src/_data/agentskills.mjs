// 🤖 Exposes the vendored discovery index (src/well-known/agent-skills/
// index.json, written by hack/sync-skills.mjs) to templates, so the
// skills llms.txt lists are exactly the ones the index publishes.
import { readFileSync } from "node:fs";

export default JSON.parse(
  readFileSync("src/well-known/agent-skills/index.json", "utf8"),
);
