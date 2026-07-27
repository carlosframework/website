# 🤖 CARLOS — carlosframework.com

**C**ontinuously **A**vailable, **R**eplicated, **L**ightweight, **O**pen, **S**ecure.

An architecture for software that is cheap enough to leave running forever,
small enough to understand, sealed so tightly the operator is not a party to
it, and yours to run. Extracted — not designed — from five systems that kept
rebuilding the same shape.

The whole site is one static page: [`index.html`](index.html). No build step,
no dependencies, no JavaScript. The framework's own rules apply to its website.

## The letters

| | |
|---|---|
| **C**ontinuously **A**vailable | Always there when someone knocks; not running when nobody does |
| **R**eplicated | The box is disposable; the data is not |
| **L**ightweight | One static binary, database compiled in, no build step |
| **O**pen | Source-available, forkable, and actually runnable by the person who depends on it |
| **S**ecure | The server holds only ciphertext it cannot open |

**S** is last in the acronym and first in the architecture — every other letter
is shaped around it. The rule it stands for: **if the server is compromised,
the attacker gets nothing.**

## Status

Early. The router, the activator, the parking lease and the object store exist
and are under test, but they live inside the applications they were pulled
from. Extracting them into something a stranger can adopt is the current work.
The site says so.

## Authorship: the 🤖 rule

Everything in this repo written by an AI carries a **visible 🤖 marker** — on
the page, in this README, at the top of every prose file. That is factor X
applied to the project itself: AI-written words are always disclosed, never
passed off as human. The full rule (including the human-certification markers
that AI must not touch) is in [`CLAUDE.md`](CLAUDE.md).

## Provenance

Written by an LLM (Claude), on the ideas, instruction, and editing of humans.
CARLOS keeps the promises set out in [The Eleven Factors](https://11factor.org),
and is informed by building [Eleven](https://elevenmessenger.com).

## Deploying

GitHub Pages from `main` (root). Pushing to `main` publishes.

## License

[MIT](LICENSE). Copy it, fork it, argue with it.
