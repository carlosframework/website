# 🤖 Copy pass brief (delta): three maintainer doc sentences

You are reviewing documentation sentences in a website repository. Paul, the owner, delegated this review to you. Readers are the site's maintainers, human or AI agent. House rules: plain, modest words; short sentences; no em dashes or en dashes used as dashes; keep commands, variable names and the 🤖 marker exactly. Keep every fact and add none.

Output: do not edit any file. One markdown table `| ID | new | why |`, one row per sentence, `unchanged` when you keep it. Then a short **Flags** list. Nothing else.

- docs.a (AGENTS.md, Deploying): 🤖 `npm run check` includes the start checks; regenerate test baselines with `npm run update:start-baselines` when the homepage or agent source changes.
- docs.b (README, configuration): 🤖 When set, `CARLOS_START_API_ORIGIN` must equal the console's `CARLOS_DEMO_API_ORIGIN`.
- docs.c (README, configuration): Run `npm run check` with `STARTER_SCRATCH` set to an on-disk scratch directory.
