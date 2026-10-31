# 🤖 CARLOS principles

## The one rule comes first

Every app opens its AGENTS.md with a single load-bearing rule and derives
everything from it. Write yours before writing code (the first commit of
Kass is literally "Write down the architecture before writing any code").

The family default is server-blindness: **"If the server is compromised,
the attacker gets nothing."** Plaintext or a usable private key in SQLite
is a bug — and because the platform replicates the whole file to object
storage, *a plaintext column is a plaintext leak*. Enforce it with a test
that greps the raw SQLite bytes (and bucket objects) for plaintext.

But no shipped app is absolutist: the real spectrum runs from Slopbox
(A1) through Keymail's sealed-content-plaintext-envelopes (A2) and
Woodstar's split-by-content-class (A2 + A/pub) to an internal finance ledger's sealed
single-tenant (B) and Tito's deliberate server trust (C), and the
discipline that makes any position legitimate is the same — **choose on
day one, name every leak, publish the list**. The whole axis, with each app's recorded
reasoning and a decision guide, is
**[references/decisions.md](decisions.md)** — read it before
settling a new app's trust model, app shape, hosting, or identity story.


## Guiding principles

1. **Intent before code.** AGENTS.md is written first and is binding. Design
   docs precede big builds; the doc's decisions are taken — if one proves
   wrong, stop and flag it in the PR rather than redesigning.
2. **Decisions are dated, attributed, and settled.** "Paul's call,
   2026-07-26" next to every ruling, rejected alternatives recorded beside
   it, under a heading like "Settled decisions (don't relitigate casually)".
3. **Built to outlive AI.** Human legibility beats AI convenience. Never add
   machinery only an LLM can drive; operational knowledge lives in scripts
   and docs in the repo, never solely in prompts or agent memory. "No LLM
   cookbooks": ops run through a command, never reconstructed from prose —
   a script drifts loudly, a document drifts silently.
4. **Rules are mechanical, not remembered.** The module-size cap is a test.
   Contrast ratios are computed from the token file by a test. A guard a
   shell step can satisfy is a guard a shell step can be wrong about — put
   guards inside the test binary. Generated configs are marked GENERATED
   and regenerated on a timer, never hand-edited.
5. **Blast radius is the unit of design.** One process + one DB per account:
   a panic takes down one person. The corollary cuts both ways: strict
   validation belongs where its blast radius is one request, not one fleet
   (a shared package that panics at init once 502'd every process at once).
6. **Defer until earned, with the trigger written down.** Keep a
   "Deliberately not built yet" section. And ship a thing *off* rather
   than untested when the only real proof needs infrastructure you don't
   have yet.
7. **Don't diverge gratuitously from the family.** Shared shape is what
   makes components extractable; a local improvement to shared code is a
   debt to upstream, noted as such.
8. **Honesty over polish.** Publish trade-offs plainly ("Honest trade-offs
   — read before trusting it"), never overclaim maturity, and don't let
   the UI lie: an uncertain state is a sentence, never a fabricated number,
   and a claim about a person ("you earned your rest") has to be true.
9. **Every deviation from the one rule is enumerated**, justified, and
   published — never hidden.


## The eleven factors

CARLOS is the architecture; the values under it are **the eleven factors**
([11factor.org](https://11factor.org) is the canonical text — link to it,
don't copy it). Sibling repos cite factors **by number**, so know the names:

I. Trust no one · II. Let kids play · III. Encrypt everything ·
IV. Great design is for everyone · V. Intent is the system ·
VI. Built by humanity, owned by humanity · VII. Self-hosting is a right ·
VIII. Many small things · IX. Inefficient builds efficient ·
X. Humans come first · XI. Centralised infrastructure is glue.

The ones the family invokes operationally:

- **III — Encrypt everything** → the one rule: server-blind by default;
  deviations are legitimate under the deviation rule, not violations.
- **V — Intent is the system** → AGENTS.md and design docs before code;
  "the code should have to argue with something."
- **VI — Built by humanity, owned by humanity** → open source; private
  until it works is allowed, but "factor VI is not optional, only
  deferred."
- **VII — Self-hosting is a right** → self-hosting is first-class, never a
  degraded tier; hosted convenience (Carloku) is the product, never the
  software.
- **VIII — Many small things** → instance-per-account, scale by adding
  instances, not replicas of one.
- **X — Humans come first** → AI is "a guest with a name tag": opt-in,
  never required, always disclosed (🤖 marking), and every path works with
  the AI switched off. The strongest form is Kass's: the AI is an ordinary
  member whose code never runs inside the server process, and whose
  conclusions land as proposals into human review, never as direct writes.
