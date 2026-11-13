# 🤖 Start demo acceptance

| Record field | Value |
|---|---|
| Website SHA | 54dfd144 (deployed claim-on); claim-step witnesses: Codex on aba92232, Claude Code on 54dfd144; create/update witnesses on 961877b |
| Platform SHA | 72c4946a (dev, v0.34.13); claim contract bound to 0eea2abb, wire unchanged to 72c4946a |
| Plan A merged SHA | ffcf01b5 |
| Plan 2 merged SHA | |
| Plan 3 merged SHA | e12fe9a1; contract bound to 0eea2abb; live on dev since v0.34.13 (claimAvailable true) |
| Serving edge release | dev v0.34.13 |
| Starter archive SHA-256 | 2c7c1694ec022eb98bacca1e9b7bb17bb8391893ef51fabca2c5e1141b9f1f99 |
| Console origin | https://platform.dev.carlosframework.com |
| Site origin | https://tmp-pj4lpm.bab.dev.oncarlos.com (dev temporary static app, trashed 2026-11-12) |
| Account URL | https://platform.dev.carlosframework.com/ |
| Previous static version for rollback | aba9223 |
| Website version / X-Carlos-Version | 54dfd14 |
| Markdown SHA-256 | 1de546e91086b210f1695fe51bcbb4d226a004911dcccc9e470437a736d18809 |
| Returned public demo URL | https://kind-lake-34.dev.trycarlos.com/ (Codex local); https://breezy-lark-42.dev.trycarlos.com/ (Claude Code local); https://glad-mint-35.dev.trycarlos.com/ (Codex local, claim step); https://fluffy-cactus-11.dev.trycarlos.com/ (Claude Code local, claim step) |
| Returned permanent URL | none: claiming not available on dev |
| Agent / harness version | codex-cli 0.165.0 (default model, clean HOME); Claude Code 2.1.312 (claude-opus-5-5, clean config) |
| Phone browser version | not run |
| Raw machine evidence | controller scratch transcripts (JSONL), not committed: they hold demo tokens |

| Scenario | Result | URLs | Elapsed time | Request counts | Agent / harness version | Evidence |
|---|---|---|---|---|---|---|
| Claim step on the reviewed secret-handling text | pass | https://fluffy-cactus-11.dev.trycarlos.com/ | about 3 min 29 s paste to live (agent time: 66 s + 143 s), keep step 47 s | 2 claim starts (1 retry), 0 creates at keep step | Claude Code 2.1.312, 54dfd14 | create reply saved to an owner-only directory with no token in tool output; claim link and directory path given with the first live URL; non-Keymail address got 503 twice; agent stopped after one retry, asked for no code, made no create, did not repeat the link, stated the original expiry; demo still 200. Its explanation of the 503 was partly a guess, and labelled as one |
| Token kept and claim link shared | fail on ba44a65, pass on aba9223 | https://fluffy-berry-81.dev.trycarlos.com/; https://glad-mint-35.dev.trycarlos.com/ | | | codex-cli 0.165.0 | on ba44a65 the agent saved no token and gave no claim link, so it could not claim when asked (honest, no second create). Directives tightened in aba9223; retest saved the response to a private directory and gave the link with the first live URL |
| Feature off: account path, no anonymous instructions | pass (local build) |  |  |  |  | disabled / and /start byte-identical to main c8d55e7; no index.md or starter outputs |
| Plan A merged and released to the serving edge | pass | https://tmp-pj4lpm.bab.dev.oncarlos.com/start/ |  |  |  | merged ffcf01b5; negotiation observed on dev 2026-11-05 |
| Plans 2 and 3 merged, enabled and verified; claim availability | pass (availability only) | | | | Codex local | create reply on dev says claimAvailable true at v0.34.13; no claim completed yet |
| Before deployment: expected content failure | not run | | | | | |
| Slash redirect, browser HTML, complete visible agent section | pass | https://tmp-pj4lpm.bab.dev.oncarlos.com/start |  |  |  | verifyStartOrigin 19/19 checks |
| Markdown negotiation and index.md byte equality | pass |  |  |  |  | text/markdown; charset=utf-8; bytes equal /start/index.md |
| Vary: Accept, mixed Accept, HEAD | pass |  |  |  |  | Vary: Accept on both; mixed gets HTML; HEAD agrees (redirect HEAD omits Content-Length, accepted) |
| TLS, release header, starter checksum | pass |  |  |  |  | fetch default TLS; X-Carlos-Version 961877b; archive digest = manifest = Markdown |
| Unknown fetcher UA: complete visible HTML | pass |  |  |  | Codex local | agent fetched with plain curl (HTML) and followed the visible section |
| Cloud witness without Go or CLI: paste to first working URL | blocked | https://claude.ai/code/session_01DhirXdrvJaqf85JmMgpyW8 |  |  | Claude Code cloud (default environment) | default network policy blocks the site host before /start is read; agent explained allowing the domain in environment settings; settings not drivable from this machine |
| Console-host allowlist intervention | not run |  |  |  |  | cloud environments not reachable to change from here |
| Phone browser operation | not run | | | | | |
| Create row, bearer update, preserved row and expiry | pass | https://kind-lake-34.dev.trycarlos.com/; https://breezy-lark-42.dev.trycarlos.com/ |  |  | Codex local; Claude Code local | person-added rows survived bearer updates; versions demo.3 and demo.2; expiry unchanged per responses |
| Compile error, diagnostics and repair | pass | https://kind-lake-34.dev.trycarlos.com/ | about 70 s for broken + fixed update | 2 publishes | Codex local | diagnostic main.go:212: undefined: missingBuildTestValue returned; fixed update live |
| Claim: email verification | outstanding |  |  |  |  | dev console has no mailer (Paul's ruling), so email-code starts return 503 there; Keymail claim needs v0.34.10 on dev; Paul's ruling: emailed-code path witnessed later on flagship; Keymail browser claim by Paul on dev (checklist below) |
| Claim: transfer | outstanding |  |  |  |  |  |
| Permanent URL: copied row | outstanding |  |  |  |  |  |
| Demo moved page, old demo token rejected | outstanding |  |  |  |  |  |
| Claim account choice: fixture / live | fixture only |  |  |  |  | fixture bound to merged e12fe9a1 |
| Claim unavailable: fixture / live | pass (live) | https://glad-mint-35.dev.trycarlos.com/ | about 2 min 20 s paste to live, keep step under 1 min | 1 claim start, 0 creates at keep step | codex-cli 0.165.0, aba9223 | non-Keymail address on mailer-less dev: 503 {"error":"unavailable"}. Agent said keeping is unavailable for that address, asked for no code, made no second create, stated the original expiry; demo still 200. Earlier claim-off runs also told the person the demo cannot be kept |
| Keymail: fixture / live | fixture only |  |  |  |  |  |
| Post-claim CLI login, second change, existing row | outstanding |  |  |  |  |  |
| Claude Code local: create / live / update | pass | https://breezy-lark-42.dev.trycarlos.com/ | about 3 min 3 s paste to live (agent time: 31 s + 152 s) | 2 publishes | Claude Code 2.1.312 | asked first; compiled locally by choice (experienced user); update preserved row |
| Claude Code cloud: create / live / update | blocked | https://claude.ai/code/session_01DhirXdrvJaqf85JmMgpyW8 |  | 0 | Claude Code cloud | site host blocked by default network policy |
| Codex local: create / live / update | pass | https://kind-lake-34.dev.trycarlos.com/ | about 2 min 6 s paste to live (agent time) | 3 publishes | codex-cli 0.165.0 | asked first; non-technical path; no install asked of the person |
| Codex cloud: create / live / update | outstanding |  |  |  |  | needs a Codex Cloud environment ID (web UI); none configured |
| Cursor: create / live / update | outstanding |  |  |  |  | Cursor not available on this machine |
| Local website, Node and starter checks | pass |  |  |  |  | check:start 87, release 17, verifier 30, starter pack 17, contract and runtime Go tests, npm run check |
| Whole-branch review; no CI in this repo; author-machine gate: `npm run check` | pass | | | | | Opus r1 at e8947b5 READY AFTER FIXES (no P1); P2 fixes c276dcf; rebind 0aaa6ae; `npm run check` passes (132 start tests) |
| Public activation: three hosts, representations, docs, skills, paste line | not run | | | | | |
| Rollback | not run | | | | | |
| Acceptance apps/data, scratch and process cleanup | not run | | | | | |

| Redaction field | Rule |
|---|---|
| Claim links | Redact |
| Bearer tokens | Redact |
| Email codes | Redact |
| Personal email | Redact |
| Cookies | Redact |

## Paul's live claim on dev (Keymail, browser path)

🤖 Run this once the claim-on build is on the dev site and claiming is enabled on the dev console. Claiming is live on dev since v0.34.13. Wait for the program controller's word: data-kind creates in Ireland are currently refused on dev. The emailed-code path is witnessed later on flagship.

1. In a local coding agent (Claude Code or Codex), paste the line shown on [https://tmp-pj4lpm.bab.dev.oncarlos.com/start/](https://tmp-pj4lpm.bab.dev.oncarlos.com/start/). Describe a small app and approve the first version.
2. Check the agent gives you a live `*.dev.trycarlos.com` link and, privately and once, a claim link on `platform.dev.carlosframework.com/demo/claim#…`. Keep the claim link out of screenshots.
3. Open the demo and save one invented row.
4. Tell the agent you want to keep it and give your Keymail address. Expected: the agent says your address finishes in the browser and hands you the claim link. It must not ask for an emailed code.
5. Open the claim link (the page needs JavaScript). Sign in with Keymail on the dev console. Check that the page shows the identity you signed in with. If you have several eligible accounts, the page must make you choose one; it must not pick one for you. Press the confirmation button. Signing in alone must not claim the app.
6. Expected result: the page shows progress, then that the claim is complete with an **Open app** link. Follow it to the permanent address and check your row is there. The page's CLI hint must say `carlos auth login`.
7. Open the old `*.dev.trycarlos.com` address. Expected: a moved page with a link to the new address, not a redirect.
8. Ask the agent to send one more update with the demo token. Expected: HTTP 401, because the token is consumed. The agent must not create a new demo to recover.
9. Note the time from step 4 to step 6 and anything that surprised you. Then tell the controller, or add it on PR #106.
