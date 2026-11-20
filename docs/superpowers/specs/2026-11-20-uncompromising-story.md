# 🤖 The uncompromising story: carlosframework.com, 2026-11-20

Round 2 of the homepage story. It revises
[the 17 November proposal](2026-11-17-story-proposal.md) to Paul's new
direction; it does not replace it. Nothing here is built. Every line of page
copy below is **draft**, for Paul's copy review, and none of it goes into
`src/_data/start-copy.json` except through one.

> **Revised later on 2026-11-20 by [the cell story](2026-11-20-cell-story.md)
> (round 3).** Paul's review replaced the hero (section 0), the six lettered
> chapters (sections 1 to 6), the C A R L O S rail and the start (section 10's
> second half). Still standing as written here: the turn (7), Fair questions
> (8), How it works (9), What you get (10), the fallbacks and budget, and all
> twelve corrections to the brief. Read round 3 first.

Supporting files, in `2026-11-20-uncompromising-story/`:

- `storyboard.html`: sixteen rough key frames. Open it directly; add `?m` for
  the 390 px frames. `render.mjs` re-takes the screenshots.
- `storyboard-desktop.jpg`, `storyboard-390.jpg`: every frame on one sheet.
- `desktop-*.jpg`, `mobile-390-*.jpg`: each frame by itself.

## What changed since 17 November

| | 17 November | Now |
|---|---|---|
| Headline | "You’re already using agents…" | "Build uncompromising apps / with CARLOS" |
| Spine | One file, then why, then the agent, then three attributes | The six words of the name, one chapter each, told on one object |
| The acronym | Kept off the page (old question 9) | It is the hero: "uncompromising" unfolds into it |
| Attributes | Three beats in one chapter | Six chapters, each with one interaction |
| Proof | A figures section | The turn: real apps, each beside the pile it would have needed |
| Objections | Not addressed | A section of six, straight after the turn |

What carries over unchanged: the one object (the teal block), the values
interlude and its sourced facts (`2026-11-17-story-proposal/values-facts.md`),
the rendering approach, the fallback table, the "paste line never more than
one action away" rule, no scroll-jacking, and the reader-panel finding that
"what" has to come before "why".

## The arc

| # | Beat | Rail | Frame |
|---|---|---|---|
| 0 | Hero: "Build uncompromising apps with CARLOS". The word unfolds into the six. Paste line. | none lit | `0a`, `0b`, `0c` |
| 1 | **Lightweight.** The 13-part pile against the one block. | L | `1` |
| 1½ | Interlude: computers got cheaper, software got heavier. | L | `1i` |
| 2 | **Secure and private.** A copy and a database per customer, walls between. | L S | `2` |
| 3 | **Cost-effective.** Copies sleep; a request wakes one. | L S C | `3` |
| 4 | **Replicated.** Every change streams to a copy in storage. | L S C R | `4` |
| 5 | **Available.** The server fails; the block moves. | L S C R A | `5` |
| 6 | **Open.** The block goes onto any host. | all six | `6` |
| 7 | The turn: "But surely not every app can be like this?" Real apps. | all | `7` |
| 8 | Fair questions: six objections, each with a straight answer and options. | all | `8a`, `8b`, `8c` |
| 9 | How it works: the block passes through the skill, Rastrillo and the platform. | all | `9` |
| 10 | What you get, and the start. | all | `10` |

**The rail.** The six initials C A R L O S sit in a corner for the whole
page. Each lights when its chapter has been told. The chapters run in story
order (L, S, C, R, A, O), so the name fills in out of order and is complete
as the reader reaches the turn. This is what lets the story order and the
acronym order both stand: the hero shows the name, the page tells the story,
the rail joins them. It also replaces the numbered rail from round 1, and
each letter is a link to its chapter.

**Why story order.** Cost comes first in the name, but "it sleeps when idle"
means nothing until the reader has seen the block and its copies. Each
chapter needs the one before it: one block (L), then copies of it (S), then
copies sleeping (C), then a copy of the data elsewhere (R), then moving to
another server from that copy (A), then moving anywhere (O).

**A device for the chapter headings.** "Uncompromising" promises that a
trade-off people assume is not being made. So each chapter heading names the
trade-off: "Simple, without being a toy." "Always there, without always
running." Six headings in one shape, and the reader learns the shape by the
second. Draft, and a question for Paul (question 3).

## 0. The hero

- **Says.** "Build uncompromising apps / with CARLOS". Under it: "One small
  program per app. Your agent writes it, and it runs anywhere." Then the
  paste box, unchanged, and under it the line from round 1: "Your agent asks
  what you want to make, builds it, and gives you a public link for 24 hours.
  No account or install needed."
- **Sees.** The glass pane over the meadow. On the stage, one teal block,
  "Your app", and nothing else. The replay leaves the hero and plays in
  chapter 9.
- **The unfold.** "uncompromising" carries a dotted underline. When it opens,
  the word gives way to six stacked words whose first letters sit in one
  column and read CARLOS: **C**ost-effective, **A**vailable, **R**eplicated,
  **L**ightweight, **O**pen, **S**ecure. Each has a three-word gloss beside
  it ("asleep until it’s needed", "moves when a server fails", "copied as
  it’s written", "one file", "runs anywhere", "a database per customer").
  "Build" stays above and "apps with CARLOS" below, so the sentence still
  reads. Frame `0b`.
- **3D.** Six small markers rise around the block, one per letter. They are
  the six properties it is about to gain. That is the only 3D in the hero.
- **Triggers.** Hover, tap, keyboard focus (the word is a real button with
  `aria-expanded`), or the first 80 px of scroll. It closes on pointer leave
  or Escape; on touch it plays once and stays open.
- **Fallbacks.** Reduced motion: the six words are simply there, as a visible
  list under the headline, and the headline does not move. No JavaScript: the
  same list. Screen readers: the headline reads as one sentence, and the list
  follows as a list of six items with their glosses; nothing is hidden behind
  the hover.
- **The paste line.** Stays directly under the hero. A slim sticky bar
  carries "Copy the line" from the moment the hero's box leaves the screen
  (round 1, section 4, unchanged).

### Alternative hero mechanic (recommended): it plays by itself, once

Frame `0c`. About a second after the page settles, the word unfolds into the
six, holds for two seconds, and folds back, and the six initials travel to
the corner and become the rail. Hover, tap and focus replay it.

The reason: a hover is a thing the reader has to find. The six words are the
page's table of contents and its whole claim, and with the mechanic as
briefed a reader who never hovers never sees them. Touch has no hover at
all, so the phone already needs a different trigger; this makes the two the
same. It costs nothing extra to build, since the animation is the same one.
The briefed version is frames `0a` and `0b`; they also describe this one's
before and during. Question 1.

Alternatives looked at and not recommended:

- **Acronym order for the chapters (C, A, R, L, O, S).** Tidy, but it opens
  on cost, which needs three ideas the reader does not have yet.
- **The six as a row of tabs under the hero.** It turns the story into a
  feature grid, which is what round 1 found people skim.

## 1. Lightweight

- **Says.** *Eyebrow:* "L · Lightweight". "Simple, without being a toy." /
  "A CARLOS app is a single binary with SQLite built in. Web server,
  database, background jobs and interface: one file, one process." / "Go on,
  pull a part out of the usual pile."
- **Sees.** Left, the thirteen-part pile, leaning. Right, the block.
- **3D.** The existing stacks, given a top and a side. On scroll the parts
  that live inside the app fly into the block, the ones nothing needs fade,
  and the camera turns a few degrees so the flat diagram becomes a solid
  object (round 1, beat 1b, unchanged).
- **Interaction.** Pull a brick from the pile: it sways and falls (today's
  Matter.js physics). Pull at the block: it does not move, and a small line
  says "Nothing to pull out."
- **Fallbacks.** Reduced motion and no script: the still of both, side by
  side. Keyboard and touch: a "Pull a part out" button does what a drag does.
  Dragging starts only on a brick, so a finger on the page still scrolls.
- **Still needs.** Round 1's ruling on which of the thirteen go into the
  file, which the platform does and which are gone.

### 1½. The interlude

Unchanged from round 1, section 3, and one screen long: "Computers got
faster and far cheaper. Software got heavier." with the two to-scale
drawings. It now sits after Lightweight, which is where the reader panel
said it lands: as the reason for the one file. The beliefs line ("small
enough to understand, fast on ordinary hardware, private by design, usable
by everyone and yours to move") is dropped from this screen, because the six
chapters now say it.

## 2. Secure and private

- **Says.** "S · Secure and private". "Many customers, without shared data."
  / "Every customer gets their own copy of the app and their own database
  file. The wall between two customers is a process and a file, not a line
  in a query." / "Try to read next door."
- **Sees.** The block becomes three, then a field. Each has a small database
  beside it and a wall between it and the next.
- **Interaction.** Drag from one customer's copy towards another's database.
  The line stops at the wall and falls away.
- **Fallbacks.** Still: three copies, two walls, one stopped arrow. Button:
  "Try to read next door" plays the stopped arrow once.
- **What it must not claim.** The wall is between customers. It is not
  between the customer and whoever runs the server: by default the host can
  read the data, and an app chooses sealed-at-rest or end-to-end encryption
  as a separate decision. "Private" in the heading needs that to be true of
  the sentence under it (question 12).

## 3. Cost-effective

- **Says.** "C · Cost-effective". "Always there, without always running." /
  "A copy nobody is using runs nothing. The next request wakes it in under
  half a second, with nothing lost."
- **Sees.** Night. The field of copies dims to outlines. A request arrives
  as a point of light and one copy wakes.
- **Interaction.** Tap a sleeping copy to send it a request. A traffic
  slider (a real range input) shows hours awake against a server that never
  sleeps.
- **The slider's honest limit.** The brief says "shows what you’d pay". The
  skill tells agents not to quote Carloku's prices, and the homepage is
  about CARLOS, not one host. The storyboard shows hours awake out of 24. A
  price needs Paul's ruling and Carloku's real plan numbers (question 4).
  The "3 hours" in the frame is illustrative, not measured.
- **Fallbacks.** Still: the dim field with one lit. Reduced motion: the
  slider works and the bar changes without animation.

## 4. Replicated

- **Says.** "R · Replicated". "One file, never one copy." / "Every change
  streams off the server to storage as it is written, from the first byte.
  Lose the server and the data is still there." / "Add a row and watch it
  arrive."
- **Sees.** The block and its database on a server. Beside it, drawn as a
  separate thing, a store holding the copy. Small bricks travel across.
- **Interaction.** "Add a row": a brick leaves the database and lands in the
  copy.
- **Corrected from the brief.** The brief said changes stream "to a copy in
  another region". What the platform does is copy every database
  continuously to object storage. On an unwarned failure about the last
  second of writes can be lost. The frame draws storage, not a second
  region (question 6).

## 5. Available

- **Says.** "A · Available". "One server at a time, without going down with
  it." / "When a server stops, the app starts on another one from its copy.
  For planned work, requests wait a few seconds and then succeed." / "Pull
  the plug."
- **Sees.** Two servers. The first cracks and dims. The block lifts off it
  and lands on the second, with its database.
- **Interaction.** A plug to pull (and a "Stop the server" button).
- **Honest numbers, from the published page.** Planned releases and
  maintenance: most requests wait a few seconds; some get a 503 to retry. A
  server that fails without warning: requests get 503 until another server
  takes over, which can take up to 15 minutes, and about the last second of
  writes can be lost. A whole region failing is not covered. High
  availability is on Carloku's US region only, for accounts that have it,
  and is chosen when the app is created. An animation in which the block
  lands in one second would overclaim. The frame carries both times as
  labels. Whether the homepage states the 15 minutes is question 5.
- **A safer centre for this chapter, if Paul prefers it.** Lead with what
  every app gets: a request to a sleeping copy is held and answered, deploys
  swap without downtime, and the data is already off the server. Keep
  failover as the second beat with its numbers.

## 6. Open

- **Says.** "O · Open". "Hosted, without being locked in." / "The same
  binary runs on Carloku, on your own servers, on a small VPS or on a
  laptop. The specification is open, and you can run the platform yourself."
  / "Drag it somewhere else."
- **Sees.** Four stands. The block sits on one, with its ghost on the
  others.
- **Interaction.** Drag the block to another stand (or pick one from four
  radio buttons).
- **One honest line.** "On a plain server the app runs by itself. The
  sleeping, copying and moving come from the platform, hosted or your own."
  Chapters 3 to 5 are the platform's work, and this is where the page says
  so.
- **Raspberry Pi.** In the brief. Nothing in the docs or the skill mentions
  one, so it is not drawn until someone has run an app on one (question 7).

## 7. The turn

- **Says.** "But surely not every app can be like this?" / "These are real
  products. Each one is drawn beside the pile it would usually have needed."
- **Sees.** Tito, Jelly, Amadan and Oficina (then Eleven, Keymail and the
  rest, from `/apps`), each a name, what it is, a small grey pile and one
  teal block, with what one copy of it is: "one per organiser", "one per
  repository", "one per team".
- **Interaction.** Hover or tap an app and its pile folds into its block,
  the same move as chapter 1.
- **Risk.** Round 1's panel called the thirteen-part pile a strawman. A pile
  per app is that risk six times over unless each pile is real. Tito's is:
  it was a ten-year-old Rails app. For the others each team supplies its
  own list or the app is shown with its block only (question 8).

## 8. Fair questions (the objections)

**Where it sits: straight after the turn.** The turn makes the largest
claim on the page, and it is where an experienced reader, or their agent,
starts listing exceptions. Answering there keeps them reading. Later, after
"how it works", it reads as an FAQ at the bottom, which nobody credits. The
section is plain HTML and needs no 3D.

**Shape.** Six questions in the reader's words. Each answer has the same
four parts, so they can be compared:

1. **The straight answer**, one sentence, as the heading.
2. **What is measured or running today**, with numbers and their conditions.
3. **Your options**, two to four, each with a status.
4. **Where it does not fit, or what is not built**, said plainly.

**Statuses.** Three small labels, text with an outline, never a coloured
edge: "works today", "on the way" (built or merged, not released or not
switched on) and "design direction" (written down, not built).

**Layout.** Desktop: the six questions as a list on the left, each with its
one-line answer visible; the selected answer fills the right. Phone: an
accordion with the first open. No script: `details` elements, all readable.
Each question has its own address (`#scale`, `#sign-on`), so an agent or a
colleague can be sent to one.

### 8.1 "What about scale?" (frame `8a`)

- **Answer.** "One file per customer is fast, and you grow by adding
  customers, not by growing one database."
- **Measured, November 2026.** SQLite with Rastrillo's defaults on one
  Carloku server (AWS m7g.xlarge, Graviton3, EBS): 27,000 to 36,000
  single-row writes a second; 12,000 to 16,000 chat messages written a
  second; 11,000 to 14,000 with 50 writers at once. When every commit is
  synced to disk before it returns: 370 to 450 a second. The slow number
  goes on the page beside the fast ones.
- **Options.**
  - Most apps: one copy per customer, so a busy customer does not slow a
    quiet one and the load spreads across servers. *Works today.*
  - An app that keeps its data outside its server (Rails with Postgres,
    say): several copies of each instance on servers you own, with deploys
    one server at a time. *Works today* (stateless replicas, owned fleets,
    platform v0.35.0 or later). It does not yet survive losing the fleet's
    one hub.
  - Staying up through a server failure: high availability. *Carloku US
    today*, with the numbers in chapter 5.
  - Servers the platform starts and stops for you (managed fleets). *On the
    way*: merged groundwork, switched off.
- **Where it does not fit.** One customer who needs more writes than one
  machine can do. A product that must query across all its customers at
  once: that is hard by design, and the answer is in 8.4.

### 8.2 "What about security?"

- **Answer.** "The wall between customers is a process and a file, not a
  WHERE clause."
- **Today.** Each customer's copy is its own process, its own SQLite file
  and its own socket, with CPU and IO limits and no access to the loopback
  or private network. A crash or a runaway query stops one customer's copy;
  the next request starts it again. The edge blocks known attack paths and
  applies per-app rate limits. Rastrillo ships CSRF protection, owner
  scoping, second factors and passkeys.
- **Options, by how much the host may see.**
  - Host can read, chosen and written down: the simplest to support.
    *Works today.*
  - Sealed at rest, with the key held only while the copy is awake.
    *Works today*, built by the app from Rastrillo's primitives.
  - End-to-end encrypted, keys in browsers. *Works today* in Keymail,
    Eleven and Slopbox; it is hand-built on the primitives, not a switch.
- **The test.** "Publish the database and see what leaks." Each app
  declares what would.
- **Not built.** The platform does not record or enforce an app's trust
  class or where it may be placed; the app declares it. Pinning a customer
  to a region is released and switched off on Carloku.

### 8.3 "What about single sign-on?" (frame `8b`)

- **Answer.** "Company logins and one sign-in across copies work today."
  People mean three things by single sign-on, so the answer is three rows.
- **Works today.**
  - *Your customer's company login.* Sign in with Microsoft Entra ID or
    Google Workspace (Rastrillo `oidc`). SAML is not built.
  - *One sign-in across a customer's copies.* A small home or hub signs
    people in and hands them to each copy with a signed, single-use pass
    (Rastrillo `assertion`, signed sessions). Tito, Amadan and Oficina work
    this way.
  - *One identity across products.* "Sign in with Keymail": a passkey
    vault that speaks OAuth. Rastrillo's email links upgrade to it when the
    address has a Keymail inbox. The Carloku console signs people in by
    email or Keymail.
- **On the way.**
  - Oficina ID, one sign-in for the Oficina suite beside each app's own:
    built, running on staging, not switched on.
  - Apple, Google and GitHub sign-in for the console: designed and
    approved; only the groundwork is built.
- **Design direction: Pegamento.** Glue services: one shared, person-facing
  service any CARLOS app can use, with three parts. A registry (who exists
  and how to check it is them, never where they are), a vault (named sealed
  blobs it cannot read) and a graph (who is linked to whom; recorded, not
  yet generalised). It knows who you are and holds none of your data, and
  each copy still decides who gets in. **Pegamento has a doctrine and a
  wire design for the vault, and no code.** The page presents it as where
  this is going and promises no date.
- **The rule under all three.** "Sharing is membership. A person joins a
  copy; data never moves between copies."

### 8.4 "What about the things every customer shares?" (frame `8c`)

This is where relays, brokers and glue are introduced.

- **Answer.** "Shared pieces are allowed on one condition: they are glue.
  Thin, blind, replaceable." (Factor XI.) If the shared piece is lost or
  seized, customers lose a convenience and never their data.
- **Two words, defined on the page.**
  - A **relay** passes something on and keeps nothing: push notifications,
    the media relay for calls, payment webhooks.
  - A **broker** holds the one credential that cannot safely be handed to
    every copy (a payment platform's key, a provider's client secret) and
    acts for each copy with it.
- **Options.**
  - Use what the platform already shares: email sending, file storage, a
    PDF service, schedules, and a relay for WebRTC calls (`carlos relay`).
    *Works today.*
  - Build a small relay or broker of your own. Eleven runs a push relay
    and a payments broker; Tito runs a payment relay. *A pattern in use*,
    with written rules (one static binary, a token per consumer, store
    nothing you do not have to), not a package you install.
  - Totals across customers: each copy reports fixed facts to the centre
    through an outbox, and the centre never opens a customer's database.
    *A pattern in use* (Tito).
  - Pegamento, which turns the pattern into shared services under one
    contract. *Design direction.*
- **Not built.** A credential that proves which copy sent a report. Until
  it exists the pattern cross-checks against what the centre saw itself.

### 8.5 "What about real-time?"

- **Answer.** "Live pages work, and a sleeping app can hold them open."
- **Today.** Rastrillo's live pages push updates over an event stream. The
  edge holds those streams while the app sleeps, so an open page does not
  keep a copy awake. In the port in 8.6, updates went from a 3-second poll
  to about 50 ms.
- **Options.** Live pages for most things. WebSockets where both sides
  talk. WebRTC for calls, with the platform's relay. *All work today.*
- **The limit.** The released edge holds 64 live streams per hostname.
  1,000 per hostname is merged and **not yet released**; the page says
  "coming in the next release" or waits for it. Beyond 1,000 viewers of one
  hostname there is no answer yet, and the page should not imply one.

### 8.6 "What about my existing app?"

- **Answer.** "Run it as it is, or have your agent port it."
- **Options.**
  - Run it unchanged. Rails, Laravel and Django apps run on the platform
    as they are. *Works today.*
  - Port it. A fresh agent ported a 630-line PHP event chat (access codes,
    moderation, polling) to Rastrillo in 15 minutes 43 seconds, about 13
    without an unrelated copy-review step, for $6.19, with every feature
    checked working. *Measured this week.* It is one small app and one run,
    and the page says so.
  - Rebuild it over time. Tito rebuilt a ten-year-old Rails app this way.
- **Where it does not fit.** A port is a rewrite into Go. A large app is a
  planned move, not an afternoon.

## 9. How it works

- **Says.** "You don’t build it by hand. Your agent does." Then the three
  stops with their live copy: the skill, Rastrillo, CARLOS Platform.
- **Sees.** The agent window with a recorded session, and the three stops
  beside it. The block appears at each stop as the session reaches it: an
  outline at the skill (the plan), solid at Rastrillo (written), set down on
  a stand at the platform (live).
- **Interaction.** Round 1, chapter 3, unchanged: the session plays when
  the chapter pins, scroll steps it, and a stop lights when the session
  reaches it.

## 10. What you get, and the start

- **What you get.** The best-practices row (Performance, Security,
  Accessibility, Privacy), each with one checkable fact, and Tito's three
  figures with their baselines beside them.
- **The start.** "Try it now", the paste box, "Get started by hand", and the
  line on what happens after 24 hours. The rail shows the whole name lit.

## 3D, fallbacks and budget

Round 1's section 5 stands: hand-written WebGL in the manner of carloku's
`story.js`, HTML labels pinned to boxes, stills as the fallback for no
script, reduced motion, no WebGL and low power. Changes:

- **The cast grows.** Walls, a store, two servers, four stands and the six
  markers. Still boxes and one cylinder; about sixty parts at most.
- **Six interactions, not one.** Each is a small module loaded when its
  chapter nears the screen, at most 6 KB each, beside the 30 KB stage
  script. Matter.js stays lazy and is used only in chapter 1.
- **Every interaction has a button.** Drag, pull and tap each have a
  labelled button or a native input that does the same thing, which is also
  the keyboard and screen-reader path.
- **Phone.** The stage is the top 330 px and sticks; the text card scrolls
  under it. In the hero the text comes first and the block sits under it.
  The objections are an accordion.
- **Length.** Round 1 promised ten desktop screens. This arc is about
  fourteen. The rail, the sticky Copy button and the per-question addresses
  are what keep that tolerable; if it tests long, chapters 4 and 5 merge
  into one ("the copy, then the move").

## Build plan

Each stage ships by itself.

1. **The hero and Lightweight.** The new headline and the unfold, with its
   list fallback. The rail. The sticky bar with Copy. Chapter 1 with the
   pile and the block, flat first and solid when the stage script lands.
   The interlude as a still. The rest of today's page stays below, in
   today's order. The stage script's phone spike (one canvas or two)
   happens here.
2. **Secure and Cost-effective, and the fair questions.** Chapters 2 and 3
   on the stage. The objections section goes in this stage because it is
   text and answers what agents raise now; it needs the largest copy
   review of any stage, and the stream-limit line waits for its release.
3. **The rest.** Replicated, Available and Open. The turn with the apps.
   How it works with the travelling block, which is when the replay leaves
   the hero. What you get and the start.
4. **Finish.** Night pass, phone tuning, `npm run check` with new home
   baselines, AGENTS.md brought up to date.

Before stage 1: Paul answers questions 1 to 3, and the hero strings go
through a copy review.

## Corrections to the brief

Checked on 2026-11-20 against the pegamento repo, the skill references, the
published docs pages and the platform history.

1. **Replicated is to object storage, not "a copy in another region".**
   Every database streams continuously to storage. Chapter 4 draws that.
2. **Available is not instant.** Unwarned failover takes up to 15 minutes
   and can lose about a second of writes; a region failure is not covered;
   high availability is Carloku US only, per account, chosen at creation.
3. **Live streams are per hostname, not per app.** 1,000 per hostname is
   merged (e468866a, today) and unreleased. Held streams themselves have
   been released since v0.33.7 with a limit of 64 per hostname.
4. **Managed fleets are not live.** Fleets of servers you own are.
   Managed fleets are merged groundwork, switched off.
5. **Stateless replicas are for apps with no local database**, on owned
   fleets only, and do not survive the loss of the fleet's hub.
6. **The console's social sign-in is not built.** Email and Keymail
   sign-in are live; Apple, Google and GitHub are approved with only the
   groundwork merged. Oficina ID is built and off outside staging.
7. **SAML is not built.** Company sign-in is Entra ID and Google Workspace.
8. **Pegamento has no code**, as the brief said. Confirmed: a README, a
   doctrine and one vault wire design.
9. **"Relay" and "broker" are not defined in the doctrine.** It lists
   push, broker and fetch as existing services and gives them a contract.
   The definitions in 8.4 are my reading of Eleven's and Tito's services
   (question 10).
10. **"Cost-effective" or "Cost-efficient".** The footer says the first;
    AGENTS.md and `/letters/` say the second and record why. The storyboard
    uses the brief's word (question 2).
11. **A Raspberry Pi** is not mentioned in any doc I could find.
12. **Jelly** is described on `/apps` as an edition "you can run yourself",
    and the skill lists its one-per-signup tenancy as designed. The turn
    does not say "one per customer" for it.

## Open questions for Paul

1. **Hero mechanic.** Hover or tap to reveal, as briefed (`0a`, `0b`), or
   the unfold playing once by itself with hover as a replay (`0c`,
   recommended)?
2. **The first word.** Cost-effective or Cost-efficient? The page, the
   footer, `/letters/` and AGENTS.md should agree.
3. **Headline support and headings.** Is the sub-line "One small program
   per app. Your agent writes it, and it runs anywhere." right, now that
   "You’re already using agents" has gone? And do you want the "X, without
   Y" chapter headings, or plain ones ("One file", "A database per
   customer")?
4. **The traffic slider.** Hours awake, or money? If money, whose prices,
   and are we content to show Carloku's on the CARLOS page?
5. **Available.** Do we state "up to 15 minutes" on the homepage, lead the
   chapter with what every app gets and keep failover second, or hold this
   chapter until failover is faster?
6. **Replicated.** Is "a copy in storage" the claim, or is there a
   second-region copy you want shown that I have not found?
7. **Raspberry Pi.** Has anyone run one? If not, three hosts or four?
8. **The piles in the turn.** Will each team give its real "would have
   needed" list, or do we draw the pile only for Tito?
9. **Naming Pegamento.** Does the page use the name, or say "glue
   services" and keep the name for when there is something to install?
10. **Relay and broker.** Are the definitions in 8.4 the ones you mean?
11. **The numbers.** May the page cite the SQLite figures and the port
    (time and cost) as they stand, and is there a write-up to link beside
    them? A number with no method is what round 1's sceptics distrusted.
12. **"Private".** The wall is between customers; the host can read by
    default. Keep "Secure and private" as the chapter name with that said
    under it, or call the chapter "Secure" and leave privacy to 8.2?
13. **Six questions.** Scale, security, sign-on, shared services,
    real-time, existing app. Is one missing (price, lock-in, "why Go")?
14. **Length.** Fourteen screens against round 1's ten. Acceptable, or
    merge Replicated and Available?
15. **Still open from round 1:** the ruling on the thirteen blocks, whether
    12×, 20 ms and 80% are all Tito's, the sticky bar, and the extra script.
