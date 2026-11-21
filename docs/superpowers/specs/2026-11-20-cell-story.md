# 🤖 The cell story: carlosframework.com, round 3 (2026-11-20)

**Revised by round 4, [the sun story](2026-11-21-sun-story.md) (2026-11-21).**
Paul found the cell too organic. The character is now a small amber sun,
and round 4 replaces the section “The cell” and every frame here. The hero
mechanics, the copy drafts, the attribute list and the build stages below
still stand.

Round 3 of the homepage story. Paul reviewed
[round 2](2026-11-20-uncompromising-story.md) and gave new direction: a
one-sentence hero, a character for CARLOS that is a cell and has no face,
and a first chapter that answers "What does uncompromising mean?". This
document replaces round 2's hero and its six lettered chapters. Round 2's
turn, "Fair questions", "How it works", fallbacks, build stages and
corrections still stand, and are listed under "What carries over".

Nothing here is built. Every line of page copy below is **draft**, for
Paul's copy review, and none of it goes into `src/_data/start-copy.json`
except through one.

Supporting files, in `2026-11-20-cell-story/`:

- `storyboard.html`: twelve rough frames. Open it directly; add `?m` for
  the 390 px frames. `render.mjs` re-takes the screenshots.
- `storyboard-desktop.jpg`, `storyboard-390.jpg`: every frame on one sheet.
- `desktop-*.jpg`, `mobile-390-*.jpg`: each frame by itself.

## What changed since round 2

| | Round 2 | Now |
|---|---|---|
| Hero | Headline, sub-line, and "uncompromising" unfolding into the six words of the name | One sentence: "Build uncompromising apps", then "with CARLOS". The word fizzes. The attributes appear around it. |
| The acronym | The hero's centrepiece, and a rail of six initials | Gone from the hero and the rail. It stays where it is today (footer, `/letters/`). |
| First chapter | Lightweight | "What does uncompromising mean?" |
| The one object | A teal block | A cell: round, soft, no face |
| Spine | Six chapters in the order L, S, C, R, A, O | Six things a cell does, each showing one or more of Paul's attribute words |
| Rail | C A R L O S, lit a letter at a time | Six small dots, filled as each chapter is told, beside "Copy the line" |
| Ending | "What you get" and the paste box | The hero's words come back as links to where each was shown; the cell meets Carloku's block |

## The arc

| # | Beat | Words it shows | Frame |
|---|---|---|---|
| 0 | Hero: "Build uncompromising apps / with CARLOS". The word fizzes; the attributes come out. Paste line. | all eleven, briefly | `h1`, `h2`, `h3` |
| 1 | "What does uncompromising mean?" | all eleven, as a list | `u` |
| 2 | Everything it needs is inside. | lightweight | `c1` |
| 3 | One each. The cell divides; a wall around each. | secure, private | `c2` |
| 4 | Asleep until it’s needed. | lower-cost | `c3` |
| 5 | Lose one, keep the rest. | resilient | `c4` |
| 6 | At home anywhere. | deployable, open, globally distributed | `c5` |
| 7 | Nothing in the middle. Thin glue between cells. | decentralisable | `c6` |
| 8 | The turn: "But surely not every app can be like this?" Real apps. | exciting | round 2, `7` |
| 9 | Fair questions: six objections with status labels. | | round 2, `8a` to `8c` |
| 10 | How it works: the agent grows the cell (skill, Rastrillo, platform). | | round 2, `9` |
| 11 | What you get, the words again, the start, and Carloku. | accessible, then all eleven | `e` |

Nine of the eleven words are things the cell can act out. Two are not, and
the page should not pretend otherwise: **exciting** is a property of what
people build, so the real apps in the turn carry it; **accessible** comes
from Rastrillo, so "What you get" carries it with its checkable fact (WCAG
2.2 AA from day one).

## 0. The hero

Frames `h1` (at rest), `h2` (attributes out), `h3` (reduced motion).

- **Says.** "Build uncompromising apps" on one line, "with CARLOS" under it,
  smaller. Then the paste box, unchanged ("Follow the directions on
  https://carlosframework.com/start", with Copy), and the line under it from
  round 1. No sub-line, no buttons. Carloku's two buttons suit a signup; here
  the one action is copying the line.
- **Sees.** A plain page, centred, the way carloku.com opens: the character
  above the sentence. Round 2's meadow and glass pane are gone from the hero.
  The cell sits above the headline and breathes, swelling and settling about
  once every four seconds. It does nothing else here.
- **The fizz.** Small and slow, because Paul has turned down particle effects
  as too frantic.
  - Each letter of "uncompromising" drifts about 1 px off the baseline, out
    of step with its neighbours.
  - At most six small bubbles (rings, 4 to 9 px) rise from the top of the
    word at a time and fade within 16 px.
  - No glow, no sparks, no colour cycling.
  - After eight seconds it settles to one bubble every two seconds, and it
    stops while the hero is off screen.
  - It is CSS only: fourteen letter spans and a handful of pseudo-elements.
- **The attributes.** The bubbles are the attributes before they are words.
  When the cloud opens, each bubble grows into one word, and the eleven words
  hang in the space around the cell, above the headline. The cell swells a
  little while they are out. When it closes they sink back into the word.
  The sentence itself never moves or reflows.
- **How it reaches everyone.**
  - *By itself, once.* About a second after the page settles the cloud opens,
    holds for four seconds and closes. Nobody has to find a hover to learn
    what the page claims.
  - *Pointer.* Hovering the word opens it and holds it open.
  - *Touch.* A tap on the word opens it; a second tap, or a tap elsewhere,
    closes it. The 390 px layout puts the words in the same space around the
    cell (frame `mobile-390-h2`).
  - *Keyboard.* The word is a real button with `aria-expanded`. Focus opens
    the cloud; Escape closes it.
  - *Screen readers.* The eleven words are a real list directly after the
    headline, always present, open or shut. The cloud is that list, moved
    with CSS.
  - *Reduced motion, or no script.* Nothing moves and nothing is hidden: the
    list sits under the headline as plain text (frame `h3`).
  - *Everyone, a second time.* The next section prints the same words as a
    list, so a reader who missed the cloud meets them twelve lines later.
- **The paste line.** Directly under the sentence. The slim sticky bar with
  "Copy the line" appears when the box leaves the screen, as in rounds 1 and
  2.

### The attribute list

Paul's list, as given, is what the cloud shows: secure, private, exciting,
accessible, lower-cost, globally distributed, deployable, decentralisable,
resilient, lightweight, open.

**Proposed grouping, for the list in section 1 (not for the cloud).** A
cloud should stay loose. A list of eleven adjectives reads as a pile, and
four short groups can be taken in at a glance. The groups answer "who is
this for?":

| For | Words |
|---|---|
| The people using it | secure, private, accessible, exciting |
| Whoever pays for it | lower-cost, lightweight |
| When something breaks | resilient, globally distributed |
| Whoever owns it | open, deployable, decentralisable |

**Three smaller suggestions**, each for Paul to take or leave:

1. **"deployable" is the weakest word.** Every app is deployable. What is
   unusual is that the same file runs anywhere, which the live hero already
   calls "portable" (an approved word in `start-copy.json`). The attributes
   page says "self-hostable".
2. **"fast" is missing.** Speed is the site's headline figure (20 ms) and
   "faster" is in the approved list of hero words today. If the list ends in
   "etc.", this is the first word to add.
3. **"globally distributed" needs a sentence that makes it true.** Each copy
   lives in one region at a time, near the people who use it. It is not one
   app spread across every region at once, and a region failing is not
   covered (round 2, correction 2). Question 4.

Six words on Paul's list are new to the page and have not been through a
copy review: exciting, lower-cost, globally distributed, deployable,
lightweight, open. The other five are in today's approved hero list.

## 1. "What does uncompromising mean?"

Frame `u`.

**Draft copy.**

> **What does uncompromising mean?**
>
> Most apps are built on compromises. There was never enough time, so
> something had to give.
>
> Accessibility waited for version two. Security became a ticket.
> Everyone’s data went into one database, because one each was too much
> work.
>
> Building apps with AI means we no longer have to cut corners.
>
> But agents cut corners too, unless the careful way is also the easy way.
> CARLOS makes it the easy way. So one app can be all of these at once.

Then the eleven words, grouped as above.

**A shorter alternative.**

> **What does uncompromising mean?**
>
> It means not having to choose. Secure or quick to build. Cheap or
> resilient. Private or easy to support. We used to pick one, because there
> was never time for both.
>
> Building apps with AI means we no longer have to cut corners. CARLOS is
> how your agent builds an app without cutting any.

Why the fourth paragraph of the longer draft is there: "AI means no cut
corners" by itself is the claim a sceptical reader rejects, because they
have watched an agent cut corners. Saying so, and saying what CARLOS does
about it, is what makes the line believable. It is also the reason CARLOS
exists.

- **Sees.** On one side, "the usual app" drawn as a square with its four
  corners cut off, each cut labelled with what went ("accessibility, later",
  "one region", "one shared database", "backups, nightly"). On the other,
  the cell, which is round: "No corners to cut." This is the moment the
  reader learns why the character is round. If the pun is too much, the
  square goes and the cell stays (question 3).
- **Interaction.** None. This is the one screen that is only read.

## The cell

**What it is.** A CARLOS app, seen from the inside. Round, soft, teal, with
no face, eyes or mouth. It speaks by changing shape: it swells, draws in,
sags, pinches in two.

**The mapping.** Loose on purpose. The page uses the word "cell" once
("Think of a CARLOS app as a cell") and never uses membrane, nucleus,
mitosis or any other biology word. The drawing carries the rest.

| What the cell does | What it means | Words |
|---|---|---|
| Holds everything it needs inside its own edge | One file: web server, database, jobs, interface | lightweight |
| Has a wall around it | Each customer's copy is its own process and its own database file | secure, private |
| Pinches in two | A new customer gets a new copy | secure, private |
| Draws in and goes dim; fills out when touched | Sleeps when idle, wakes on a request | lower-cost |
| One is lost and the rest are untouched; it grows back from a copy | Other customers carry on; the app restarts elsewhere from storage | resilient |
| Takes the shape of whatever holds it | The same file on Carloku, your servers, a VPS, a laptop | deployable, open, globally distributed |
| Lives in a group with no centre, joined by thin strands | No central database; glue services between copies | decentralisable |

**Two rules that keep the analogy honest.**

1. **Cells cluster. They never fuse.** Two cells becoming one would be two
   customers sharing data, which is the thing chapter 3 says cannot happen.
   So "merging" is used only where it is true: the parts of the usual pile
   merge into one cell (chapter 2), and the attribute bubbles merge back
   into the word (hero).
2. **The cell is not alive in the copy.** It "sleeps" and "wakes", which
   the page says of apps already. It does not eat, feel, want or die.

**What I dropped from the suggested mapping.** "Organs" for glue services:
an organ is large, specialised and vital, and glue is defined as thin,
blind and replaceable. The drawing uses thin strands and small plain boxes
instead. And "organisms with no central brain": true, but it invites the
biology lesson. The frame shows an empty middle and says "Nothing in the
middle."

### Three looks (frame `v`)

The same shapes in three finishes, each at rest, swollen, dividing, divided
and asleep.

| | Look | For | Against |
|---|---|---|---|
| A | **Putty.** Opaque, matte, has weight, sits on a surface and sags. | The warmest and the most physical. Squash and stretch read at once. Closest to Paul's "squishy ball / putty". | Cannot show what is inside, so "everything inside" and "its own database" need labels. |
| B | **Translucent cell.** Clear body, a visible edge, a small database at the centre. | The only look that draws the two main ideas without words: everything is inside, and there is a wall around it. | The most literal. At small sizes the edge and centre can thin out. |
| C | **Soft blob.** Flat colour, a soft glow, no edge. | The lightest to animate and the easiest to make small. | No edge means no wall, which loses chapter 3. It also looks like many other products' mascots. |

**Recommendation: B's body with A's behaviour.** Draw the translucent cell,
and move it like putty: it sags when it rests, stretches when dragged and
takes the shape of what holds it (chapter 6 depends on that). The chapter
frames are drawn this way.

**A trap found while drawing.** A round dark centre in a round clear body
reads as an eye, and two short curves on it read as a smile. Both happened
in the first drafts. The centre is now a small database shape, which does
not. Whatever look Paul picks, the rule is: nothing on the cell that comes
in a pair, and nothing round and dark at its centre.

### Does the cell meet Carloku's lilac block?

**Once, at the end, and neither turns into the other** (frame `e`).

On carloku.com the lilac block with eyes is "your app", seen from outside:
it has somewhere to live, it dozes, it blinks. The cell is the same app
seen from inside: what it is made of. So the ending shows the block with a
magnifying glass over it, and the cell inside the glass. "What you built
here is what’s inside." The block keeps its face; the cell never gets one.
That respects Paul's point that they are not the same thing, and gives the
two sites one shared picture.

The alternative I did not choose: the cell squares up, turns lilac and hops
to Carloku. It makes the cell a larval block, which gives it a face by the
back door, and it suggests Carloku is the only place a CARLOS app ends up.
Chapter 6 says the opposite.

## 2. Everything it needs is inside (frame `c1`)

- **Says.** *Eyebrow:* "lightweight". "Everything it needs is inside." /
  "Think of a CARLOS app as a cell. It is one file: web server, database,
  background jobs and interface. Nothing to wire together, so nothing to
  come loose." / "Go on, give it a poke."
- **Sees.** The thirteen-part pile on the left, fading. Its parts drift
  into the cell, which swells as it takes them in and settles back to the
  size it started.
- **Interaction.** Pull a part from the pile: it sways and falls (today's
  physics, kept). Poke the cell: it wobbles and nothing falls out.
- **Fallbacks.** The still of both. A "Give it a poke" button for keyboard
  and touch.
- **Still needs.** Round 1's ruling on which of the thirteen parts go into
  the file, which the platform does and which are gone.
- **The interlude** ("Computers got faster and far cheaper. Software got
  heavier.") stays after this chapter, unchanged, one screen.

## 3. One each (frame `c2`)

- **Says.** "secure · private". "One each." / "Every customer gets their
  own copy of the app, with their own database inside it. What keeps two
  customers apart is a wall, not a line in a query." / "Try to read next
  door."
- **Sees.** A new customer signs up and the cell pinches in two. Three
  cells, each with its own database and a heavier edge.
- **Interaction.** Drag from one cell towards another's database. The line
  stops at the edge and falls away.
- **What it must not claim.** Unchanged from round 2: the wall is between
  customers, not between the customer and whoever runs the server. "Private"
  needs the sentence under it to be true (question 6).

## 4. Asleep until it’s needed (frame `c3`)

- **Says.** "lower-cost". "Asleep until it’s needed." / "A copy nobody is
  using runs nothing. The next request wakes it in under half a second, with
  nothing lost."
- **Sees.** Night. A field of cells, drawn in and dim. A request arrives as
  a point of light; one cell fills out and brightens.
- **Interaction.** Tap a sleeping cell to wake it. The traffic slider from
  round 2, showing hours awake, not money (round 2's question 4 stands).

## 5. Lose one, keep the rest (frame `c4`)

- **Says.** "resilient". "Lose one, keep the rest." / "Every change is
  copied off the server as it is written. If a server stops, the app starts
  again on another one from its copy. Every other customer carries on." /
  "Stop a server."
- **Sees.** Cells on server one, and a store holding a small copy of each.
  The server cracks; its cells become outlines. On server two the same
  cells are already there, and the last is growing back from its copy.
- **Honest numbers.** Round 2's, unchanged, on the frame as a note: planned
  work, a few seconds; a server that fails without warning, up to 15 minutes
  today and about the last second of writes; high availability on Carloku's
  US region for accounts that have it; a region failing is not covered. This
  chapter merges round 2's Replicated and Available, which round 2 offered
  as the way to shorten the page.

## 6. At home anywhere (frame `c5`)

- **Says.** "deployable · open · globally distributed". "At home anywhere."
  / "The same file runs on Carloku, on your own servers, on a small VPS or
  on a laptop, in whichever region is nearest the people using it. The
  specification is open, and you can run the platform yourself." / "Drop it
  somewhere else."
- **Sees.** Four containers of four shapes. The cell sits in one and takes
  its shape; its outline waits in the others.
- **Interaction.** Drag the cell to another container, or pick one of four
  radio buttons.
- **One honest line**, kept from round 2: "On a plain server the app runs by
  itself. The sleeping, copying and moving come from the platform, hosted or
  your own."
- **Not checked.** The region clause. It needs the list of regions that are
  open today and Paul's wording for "globally distributed" (question 4). No
  Raspberry Pi is drawn (round 2, correction 11).

## 7. Nothing in the middle (frame `c6`)

- **Says.** "decentralisable". "Nothing in the middle." / "Every copy stands
  by itself, so nothing has to sit in the centre holding everyone’s data.
  Where copies need something shared, thin services pass it along and keep
  nothing." / "Take the glue away."
- **Sees.** A ring of cells around an empty middle. Thin strands run to two
  small plain boxes at the edge: a relay ("passes it on, keeps nothing") and
  a broker ("holds the one key").
- **Interaction.** Remove a glue box. Its strands drop. Every cell carries
  on. A line appears: "Customers lose a convenience, never their data."
- **Status, said on the page.** Shared email, storage, PDFs, schedules and
  a call relay work today. Relays and brokers of your own are a pattern in
  use. Pegamento is a design direction with no code. The chapter introduces
  the idea; the detail and the labels stay in "Fair questions" 8.3 and 8.4.

## 8 to 10. What carries over from round 2

These sections of [round 2](2026-11-20-uncompromising-story.md) stand as
written, with the block read as the cell and the six-letter rail read as
six dots:

- **Section 7, the turn.** "But surely not every app can be like this?"
  Each real app is now a cluster of cells with what one cell is ("one per
  organiser", "one per team"), beside the pile it would have needed. The
  risk about strawman piles stands. This is where "exciting" is earned.
- **Section 8, Fair questions**, all six, with the four-part answer shape,
  the three status labels ("works today", "on the way", "design direction")
  drawn as outlined text and never as a coloured edge, the per-question
  addresses, and every figure and limit in 8.1 to 8.6. Nothing in it
  changes.
- **Section 9, How it works.** The agent session with the three stops. The
  cell appears as an outline at the skill, filled at Rastrillo and set down
  in a container at the platform.
- **Section 10, What you get.** The best-practices row and Tito's figures.
  "Accessible" is shown here. The start moves into the new ending below.
- **"3D, fallbacks and budget"**, with one change under "Build notes".
- **"Corrections to the brief"**, all twelve. Correction 10 (Cost-effective
  or Cost-efficient) no longer touches the homepage, since Paul's word is
  now "lower-cost"; the footer and `/letters/` still need to agree.

Round 2 frames `7`, `8a`, `8b`, `8c` and `9` are not redrawn.

## 11. The ending (frame `e`)

- **Says.** The hero's sentence again, "Build uncompromising apps / with
  CARLOS". "Every word from the top of the page, and where you saw it." Then
  the eleven words as links, each to the chapter that showed it. The paste
  box. "Rather set it up yourself? Get started by hand".
- **Sees.** A loose cluster of cells, and Carloku's lilac block with a
  magnifying glass over it and the cell inside. "What you built here is
  what’s inside." / "Want it hosted? Start with Carloku".
- **Why the words come back.** The hero makes eleven claims in four seconds.
  The ending is where the page shows it kept them: a word that links to
  nothing is a word the page did not earn, which is a useful test while
  building.

## Build notes

Round 2's rendering approach stands (hand-written WebGL in the manner of
carloku's `story.js`, HTML labels, stills as fallbacks, every interaction
with a button). What the cell changes:

- **A soft body is cheaper in 2D.** The storyboard cell is one SVG path
  from a 96-point outline with four numbers: size, pinch, stretch and sag.
  Animating those four numbers gives breathing, swelling, dividing and
  sleeping. Stage 1 should try this in SVG or 2D canvas before reaching for
  WebGL; it may remove the stage script from the hero altogether.
- **Dividing is one shape, then two.** The pinch runs to its limit, the
  single path is swapped for two at the frame they separate, and nothing
  needs a metaball shader.
- **The hero carries no 3D.** The fizz and the cloud are CSS. The cell in
  the hero is one path with one slow animation.
- **Length.** About twelve desktop screens, against round 2's fourteen:
  one new chapter in, the hero's alternates out, Replicated and Available
  merged.

### Stages

Each ships by itself. Round 2's stages, re-cut:

1. **The hero and "What does uncompromising mean?".** The sentence, the
   fizz, the cloud with all its fallbacks, the breathing cell, the paste
   line and sticky Copy bar, and the first chapter as text with its still.
   Today's page stays below, in today's order.
2. **The first three cell chapters, and the fair questions.** Inside, one
   each, asleep. The objections section goes here because it is text and
   answers what agents raise now.
3. **The rest.** Lose one, anywhere, nothing in the middle. The turn. How
   it works. The ending with Carloku.
4. **Finish.** Night pass, phone tuning, `npm run check` with new home
   baselines, AGENTS.md brought up to date.

Before stage 1: Paul picks a look for the cell, answers questions 1 to 4,
and the hero and section 1 strings go through a copy review.

## Open questions for Paul

1. **The look.** Putty, translucent cell or soft blob (frame `v`)? I
   recommend the translucent body moving like putty.
2. **Colour.** The cell is CARLOS teal. Is that right, or should it be a
   colour of its own?
3. **The cut corners.** Is the square with its corners cut off beside the
   round cell a good joke or a bad one?
4. **"Globally distributed".** What sentence makes it true today, and which
   regions may the page name?
5. **The list.** Keep "deployable", or use "portable" or "self-hostable"?
   Add "fast"? Group the list in section 1 by who each word is for?
6. **"Private".** Round 2's question 12, still open: the wall is between
   customers, and the host can read by default.
7. **The longer or the shorter draft** for "What does uncompromising mean?"
8. **Does the cloud stay open** after its first play on a phone, where
   there is room for it, or close as on desktop?
9. **Carloku.** Is the magnifying glass the right meeting, and may
   carloku.com use the same picture back?
10. **The word "cell".** Once in the copy, as drafted, or never, leaving it
    to the drawing?
11. **Still open from round 2:** the traffic slider (4), the 15 minutes
    (5), the piles in the turn (8), naming Pegamento (9), relay and broker
    (10), citing the numbers (11), a seventh question (13), and round 1's
    list (15).
