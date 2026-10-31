# 🤖 Working conventions and common mistakes

## Conventions that still bind you

The platform mechanized the infrastructure, not the discipline:

- The gate (`make ci`) green before every commit, with `CGO_ENABLED=0`
  builds throughout; add `rastrillo generate --check` to it only if the
  app declares manifest resources.
- Migrations are additive-only — new code over an old DB must always be
  safe. Never delete data to update.
- Zero-JS first; when JS is earned, small ES modules, no bundler, no
  build step, 300-line cap.
- Worktree per session, on a branch, with regular commits pushed as you
  go. Merge to main only once the work is done, a human has
  approved it, and CI is green (on amadan, `amadan branch merge`: a merge
  commit, or one commit with `-squash`; never squash by hand, which
  amadan shows as a deleted branch) — until the repo has CI there is no green
  to wait for, so done + approved is the gate, and standing up CI (the
  same gate as above, run for you) is early work rather than a
  prerequisite nobody can meet. Deploy only what merged. Commit trailers
  mark AI authorship (🤖 / `Co-Authored-By`).

The full working conventions are building-carlos-apps'
`references/process.md`.


## Common mistakes

| Mistake | Reality |
|---|---|
| Reading `$PORT` and calling `http.ListenAndServe` | The contract is `--socket <path> --db <path>` on a unix socket. `rastrillo.Resolve`+`Serve` handle it; hand-rolled servers must too. |
| Building for the local machine | Boxes are linux/arm64. `GOOS=linux GOARCH=arm64 CGO_ENABLED=0`, always. |
| A bare `First(&x, id)` on a user-owned row | Every such query goes through `scope.Owned` — reads, writes, and transactions alike. The isolation test suite in `examples/notes` is the regression guard to copy. |
| Binding a form onto a GORM model | Mass assignment. Explicit `map[string]any` + `.Select` allowlist, per SKILL.md. |
| Hand-rolling a router, certs, or Litestream | Platform's job. Your app is one binary on one socket. |
| Verifying with a 200 or a cached DNS answer | Only `X-Carlos-Version` is proof, on the canonical host, after the deploy watch. |
| Waiting for an SSH step that never comes | Every step is a `carlos` command. A step that needs box access is a wrong turn (or a product gap to file — not a workaround to build). |
| Destructive migration "to clean up" | Additive-only, forever. |
| Skipping the trade-offs line in the README | The trust default is legitimate only when declared. One dated line. |


## When to leave this skill

The moment the app needs a choice — end-to-end or partial encryption, a
feed/real-time client shape, self-hosting, fleets of your own boxes — or a
capability this recipe skips, such as sending email (`carlos email enable`)
or work that has to happen on a clock (`carlos schedule set` — an idle
instance cannot run its own timer), both in platform.md, or **a product
where each customer gets their own instance** (a signup flow that
creates instances, one domain split by path) — switch to **carlos:building-carlos-apps**. It starts with tenancy (what
one instance is, the user models, the trust classes, and the benefits
each earns), then holds the decision axes,
the family evidence for each option, and the deeper references this
recipe deliberately skips.
