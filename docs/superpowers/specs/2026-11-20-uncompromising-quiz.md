# 🤖 “How uncompromising are you?”: the quiz (2026-11-20)

A tongue-in-cheek quiz on its own page, `/uncompromising/`, linked from the
homepage hero with “Not sure? Take the test.” It belongs to the
[sun story](2026-11-21-sun-story.md): same character, same plain page.

**Revised 2026-11-21.** Paul reviewed the cell and asked for the small amber
sun from the HalfStack Vienna deck instead. The character notes, the twelve
illustrations, every frame and the share images now use it. The flow, the
layout, the keys and the accessibility design are as they were. The new
section “The character” says exactly what to draw.

Paul's direction: “Quiz should be step by step on full-screen pages, with
illustrations for each one.”

Nothing here is built. Three things in it are provisional:

- **The copy.** Every string is a placeholder, copied on 20 November from
  the copy-review deck (ids `quiz.*`), which is in review with Paul now. The
  design must survive any of it changing length or wording.
- **The character.** The sun is drawn as the sun story specifies, and Paul
  has not yet seen it. It is one component (`sun.js` and `sun.css`), so a
  change to it redraws the fact pictures and the share images without
  touching the flow, the layout or the accessibility design.
- **The labels inside the pictures** (“Cache: down. You: up.”) are mine and
  have not been in any review.

Supporting files, in `2026-11-20-uncompromising-quiz/`:

- `storyboard.html`: nineteen rough frames, redrawn on 21 November with the
  sun. Open it directly; add `?m` for the 390 px frames. It loads `sun.js`
  and `sun.css` from `../2026-11-21-sun-story/`. `render.mjs` re-takes the screenshots.
- `desktop-*.jpg`, `mobile-390-*.jpg`: each frame by itself, with a note
  under it.
- `share-all.jpg`, `share-most.jpg`, `share-few.jpg`: the three share images
  at full size, 1200 × 630.

## The flow

| # | Screen | What happens | Frame |
|---|---|---|---|
| 1 | Intro | The sun, the title, one line, Start. | The sun, a luggage tag tied to its ring that says “yours”, and an empty place waiting on any server. |
| 2 | “First, what are you running today?” | Tap the pieces of your stack. Each tap drops a brick onto a pile. Or “Nothing yet, I’m starting fresh”. | The sun, one arrow marked “copy”, a server with a dashed ring waiting on it, “run”. |
| 3 to 14 | Twelve statements, one per screen | “Absolutely” or “Absolutely not”. The reaction appears in place. Next. | `3a` to `7c` |
| 15 | Result | What is left of the pile becomes one block, the sun takes it in. The count, the paste line with Copy, Share, “Take it again”. | `9` |

Fourteen steps and a result. About two minutes.

## One screen

Frames `3a`, `3b`, `3c` (and the same three for statements 4, 6 and 7).

Every step fills the viewport (`min-height: 100svh`) and holds four things:

1. **A thin bar.** Back, the quiz's name, twelve ticks and “3 of 12”. The
   site header is not shown; the word CARLOS on the intro links home.
2. **The statement and its two answers.** The statement is the heading. The
   two buttons are the same size and weight. Neither is styled as the
   primary action, because the quiz must not point at the answer it wants.
   On desktop each carries its key, `1` and `2`.
3. **The picture.** One board per statement, described below.
4. **The visitor's pile and the sun**, standing on one floor. They stay in
   the same place on every statement screen, so the eye learns where to
   look for the reaction.

**After an answer**, nothing moves away:

- The chosen button fills in; the other fades. Both stay, so the answer can
  be changed.
- The reaction appears under the buttons, in space that was already kept
  for it. Nothing on the screen jumps.
- A Next button appears under the reaction and takes focus. The quiz never
  moves on by itself: the visitor reads at their own speed.

**“Absolutely”** (frame `3b`). The picture stays as it is. The sun
squishes against the floor, pales and loses most of its glow, about 400 ms,
and recovers on the next screen. One deadpan line. The pile is untouched.

**“Absolutely not”** (frame `3c`). The picture cross-fades to the fact. The
sun brightens: its glow strengthens and one thin ring goes out from it and
stays. No bloom.
One brick lifts out of the pile, tips and drops off the floor; the bricks
above settle. The fact appears, with a small line naming what left
(“Postgres out of your pile. 8 left.”).

**Which brick leaves.** The one the fact is about, when the visitor has it:

| Statement | Brick |
|---|---|
| toolchain | Docker |
| one database | Postgres |
| YAML | Kubernetes |
| hello world | Sidekiq |
| paged at 3am | Redis |
| idle servers, lock-in | Heroku (whichever comes first) |

Otherwise the top brick goes. If the pile is already empty, or the visitor
is starting fresh, nothing is pulled and the line is left out. A changed
answer puts the brick back.

**Motion, kept calm.** One thing moves at a time, in this order: sun,
picture, brick. Each is under half a second, eases out and happens once. No
particles, no confetti, no shake, no sound. Nothing loops except the sun's
breathing.

### 390 px

Same parts, stacked: bar, picture (354 px wide), statement, the two answers
side by side, reaction and Next, then the pile and the sun as a low strip
on a floor at the bottom. The pile is three bricks to a row, so sixteen
bricks are six rows and still fit. The longest fact (statement 3) fits
without scrolling at 390 × 844 (frame `mobile-390-3c`). On shorter phones
the step scrolls; the bar stays put.

### Keys

| Key | Does |
|---|---|
| `1`, `2` | Answer “Absolutely”, “Absolutely not” |
| Left, Right | Move between the two answers without choosing |
| Enter, Space | Press the focused button; after an answer, that is Next |
| Up, Page Up | Back one step |
| Down, Page Down | Next step, once this one is answered |

Keys are ignored while a modifier is held, and on the stack picker `1` and
`2` do nothing. The browser's own Back and Forward walk the steps, because
each step has an address (`#3`).

## The stack picker

Frames `2a` (empty) and `2b` (with a pile).

- A group of checkboxes drawn as chips. Ticking one drops a brick from the
  top of the stage: it lands, rocks once and goes to sleep. Unticking lifts
  that brick back out.
- A line under the floor counts: “9 things to run”.
- “That’s my stack” goes on. “Nothing yet, I’m starting fresh” goes on with
  no pile, and the result reads “Starting fresh? Start with one.”
- Sixteen chips in the frames: Rails, Postgres, Redis, Sidekiq, Docker,
  Kubernetes, Nginx, Heroku, S3, a CDN, a load balancer, Terraform, CI
  runners, monitoring, Elasticsearch, a cron box. **These are not in the
  copy deck** and need to be (question 2).
- No free-text “other”. It would need a keyboard on a phone and would put
  words on bricks that nobody has read.

## The twelve illustrations

Frame `8` is the contact sheet. Each statement has one board, 400 × 280,
with two states: the joke, and the fact shown after “Absolutely not”.

Rules for all twelve:

- **The joke is drawn in the old world**: boxes, buildings, machines, hard
  corners. **The fact is drawn with the sun.** Every fact picture has
  the sun in it; no joke picture does. The joke pictures have no amber in
  them at all, so the colour itself says which side a picture is on.
- **One idea each, readable at 354 px.** A few short labels at most. The
  picture must still make sense with the labels left out, which is what the
  390 px contact sheet tests.
- **Deadpan, not zany.** The humour is in a sign or a label, in the manner
  of a notice on an office wall. Nothing in a picture moves except, in three
  of them, one slow thing (listed below).
- **No faces.** The sun has none. The one person in the set, the burglar,
  is a striped jersey, a flat cap and a sack, with a mask and no eyes.
- **No logos.** Product names appear as plain words on bricks only.

| # | Statement | The joke | The fact |
|---|---|---|---|
| 1 | Corporations controlling my data | An office tower. Your data is one lit window on the 14th floor. A sign at the door: “Visits by appointment”. | The sun, a luggage tag tied to its ring that says “yours”, and an empty place waiting on any server. |
| 2 | A complex toolchain | Seven machines in a chain (build, bundle, image, registry, chart, pipeline, rollout) to deliver one small parcel. “Seven steps to get here.” | The sun, one arrow marked “copy”, a server with a dashed ring waiting on it, “run”. |
| 3 | Everyone’s data in one database | One huge database with every customer's name on it, one door, and a burglar walking through it. | A sun each, every one with a heavy ring. He has reached one; his line to the next stops at the ring. “A ring each.” |
| 4 | Paying for servers while everyone’s asleep | Night. Three racks with every light on, coins dropping into a meter. “03:07 · visitors: 0”. | Night. The idle ones have set: each is dim and half under the floor line. One request arrives as a point of light and one sun has risen, bright. |
| 5 | My favourite part is the YAML | A config file that unrolls off the page and across the floor, each line indented further than the last. “Page 1 of 40.” | A terminal with one line, `carlos deploy`, and “ok”. |
| 6 | Hello world needs nine services | Nine wired-up boxes holding up one small “hello, world” sign. | One sun and the same sign. |
| 7 | Paged at 3am | Night. The cache server lying on its side, the phone buzzing on the bedside table. “Cache: down. You: up.” | Night. An outline where the cache server stood, the phone dark, the sun set on the floor line. “You: asleep.” |
| 8 | Ship to production and hope | A chute straight into the building marked Production, a lucky horseshoe over the door, a flag that says “hope”. “Brakes: not fitted.” | A canary sun beside production takes v2 first; a tick; then production. |
| 9 | A second to load builds anticipation | A theatre curtain, closed, with an hourglass in front of it. “Please wait.” | The curtain already open, the sun on stage. “Milliseconds.” |
| 10 | Locked into my host forever | Your app chained to the host's building, a padlock on the door. “Check-out: never.” | The same sun in a Carloku-shaped box, with a dashed ring the same size waiting in a server and a laptop. |
| 11 | My agent didn’t know how to ship | The agent's terminal: “built it. now what?” Beside it, a parcel with a cobweb. “Ready since Tuesday.” | The terminal with three ticks (build, test, deploy), the skill beside it, the sun on a server. |
| 12 | Backups are for people who make mistakes | The database crossing a tightrope on one wheel. “Net: not fitted. Last backup: never.” | The sun, and a steady trickle of small changes into storage. “Every change, as it happens.” |

**The one slow thing**, in three pictures only, each stopped under reduced
motion: the coins in 4 (one every two seconds), the buzz lines on the phone
in 7, and the trickle in 12.

**One picture answers “Absolutely” too.** In statement 6 the reaction line
is “Ten, if you count the one watching the other nine”, so a tenth box,
“The watcher”, appears under the nine (frame `6b`). I would not do this for
every statement: twelve extra drawings for the answer we are teasing is a
poor trade. One is a nice surprise.

**Night pictures** (4 and 7) sit on the light page as a dark panel. In the
dark theme the panel has no edge and the page is the night.

**How they are made.** Hand-drawn SVG, flat fills, one line weight, the
site's own colours. No raster images and no generated art. Each state is
one file of about 2 to 4 kB.

## The character

The quiz and the homepage share one character: the CARLOS sun. The full
specification, with every state drawn, is in the
[sun story](2026-11-21-sun-story.md) under “The character”, and frame
`s-character-sheet` there. The component is two files in
`2026-11-21-sun-story/`: `sun.js` (the markup) and `sun.css` (colours,
states and timing). This storyboard loads them from there.

What the quiz uses:

| Where | Ring diameter | State |
|---|---|---|
| Intro | 108 px (92 px at 390) | rest, breathing |
| Beside the pile | 68 px (56 px at 390) | rest; squish on “Absolutely”; bright on “Absolutely not” |
| The picker and the result | 108 px (64 px at 390) | rest; swell as it takes the block in, then bright |
| In a fact picture | 52 to 124 px on the 400 × 280 board | rest, bright, asleep and set, or ghost |
| Share images | 200 to 260 px | bright, rest, squish |

For the build agent, whose `src/uncompromising/character.mjs` already
draws a provisional amber light. What changes against that file:

- **Circles, not an outline path.** No `outline()`, no wobble, no pinch. A
  squish is a circle scaled to an ellipse from its foot.
- **`r` is the ring.** The body is 0.6 r, the core 0.23 r, the glow four
  flat discs at 1.08, 1.28, 1.5 and 1.75 r. The ring sits where the cell's
  wall was, so the pictures keep their layout.
- **The core is centred** and is a plain circle. An off-centre core reads
  as an eye looking sideways.
- **States are CSS.** `data-state` on the `.sun` group: `rest`, `swell`,
  `squish`, `bright`, `asleep`, `ghost`. The quiz's moods map as rest →
  `rest`, wake → `bright`, sad → `squish`, swell → `swell`. The tween in
  `quiz.js` and `livePaths()` are no longer needed.
- **Asleep in a picture is “set”**: the sun is centred on the floor line
  and clipped at it, so half shows (`horizon` in `sun.js`).
- **Night boards** carry the class `sun-night`, which drops the darker
  edge line and softens the glow.
- **Nothing is drawn inside it.** The “one” brick of the ending slides in
  and fades as it reaches the body.

## The result

Frame `9`.

- **The ending.** What is left of the pile drops into one block. The block
  slides across the floor to the sun. The sun takes it in, swells and
  settles back to the size it started. About two seconds, once, and any key
  or tap skips it. The sun is opaque, so the block is not shown inside it
  afterwards: it goes in and is gone. This is allowed by the story's first
  rule: copies never join each other, but the parts of the usual pile do
  merge into one app.
- **The title.** One of three.

  | Title | “Absolutely not” answers |
  |---|---|
  | You’re uncompromising. | all 12 |
  | You’re mostly uncompromising. | 7 to 11 |
  | You might be compromising. That’s fine. We’ll be here. | 0 to 6 |

- **The count.** “{before} things to run, patch and pay for. With CARLOS:
  1.” `{before}` is the number of bricks the visitor chose, not the number
  left. Starting fresh shows “Starting fresh? Start with one.”
- **The paste line**, the same box as the homepage, with Copy.
- **Share your result**, then “Take it again”.

### What the count must not claim

“With CARLOS: 1” is the line most likely to be quoted back at us.

- It is true of what the visitor *runs*: one app, with its web server,
  database, jobs and sessions inside it.
- It is not true that nothing else exists. On Carloku the platform does the
  sleeping, the copying to storage and the edge. On your own servers you
  run the platform too. The sun story says so in “At home anywhere” (“the sleeping,
  copying and moving come from the platform, hosted or your own”).
- Some bricks have no honest replacement in the app itself: a CDN, S3,
  monitoring, CI. A visitor who picks them and is told “1” may fairly ask
  where they went.

Two ways to keep the joke and stay honest. Either the picker offers only
things a CARLOS app does replace, or the count gains a second, smaller line
that says who does the rest. Question 3. This also needs round 1's ruling,
still open, on which parts of the pile go into the file, which the platform
does and which are gone.

## Sharing

Frame `10`, and `share-*.jpg`.

- **One image per result title**, three in all, 1200 × 630. Each has the
  quiz's question, the verdict, the sun in the matching mood (bright, by
  itself; at rest beside a short pile; squished beside a tall one)
  and the address.
- **No score, no stack, no name.** Everyone with a result gets the same
  image, so nothing personal is in it and nothing is generated on a server.
- **How a link gets its image.** A link preview takes its image from the
  page it points at, so each result has a small static page:
  `/uncompromising/all/`, `/most/`, `/few/`. Each carries its own title,
  description and image, shows the verdict and a “Take the test” button,
  and is the address that Share sends.
- **The button.** The system share sheet where there is one; otherwise it
  copies the link and says so. No third-party share buttons or scripts.
- **At phone size** (frame `mobile-390-10`) the verdict is still readable
  in a message thread. The longest title is set smaller to fit.

The deck's share text, “I’m uncompromising. Are you?”, fits only the first
result (question 5).

## Everyone else's path

### It is a form underneath

- The quiz is one `<form>`. The picker is a `fieldset` of checkboxes. Each
  statement is a `fieldset` whose `legend` is the statement, holding two
  buttons with `aria-pressed`. Not radio buttons: arrow keys select a radio
  at once, and here an arrow must be able to move without answering.
- On each new step, focus goes to the step's heading, which reads
  “Statement 3 of 12”, then the statement.
- The reaction is a `role="status"` region, so it is read when it appears:
  the line, then “Postgres is out of your pile. 8 left.” as words.
- Every picture has a text alternative for both states, written with the
  copy. The pile is a real list (“Your stack, 9 things”), updated as bricks
  leave. The physics is decoration on top of that list and is hidden from
  assistive technology.
- The ticks in the bar are decoration; “3 of 12” is the text.
- Buttons are at least 48 px tall. Focus is always visible. Nothing depends
  on colour: the chosen answer is filled, and the sun's mood is repeated
  by the reaction line.

### Reduced motion

Nothing moves. The physics engine is never fetched: the pile is the same
bricks, stacked by CSS. A brick that leaves is simply gone and the count
changes. The picture swaps without a fade. The sun changes between two stills. The
ending is one still, the sun by itself. The three
slow things in the pictures are stopped.

### Without script

Frame `11`. The page as served is complete without script: the title, a
line, the twelve statements as a numbered list with the fact under each,
its fact picture, and the paste line. No picker, no answer buttons and no
score, since none of them could work. The script, when it runs, turns the
list into steps. So the no-script page is not a fallback that has to be
kept in step with the real one; it is the same markup.

The intro line “We’ll keep score” is wrong on this version and needs a
variant (question 6).

### Leaving and coming back

Answers and the pile are kept in `sessionStorage`, so a refresh or the
Back button returns to the same step. Nothing is sent anywhere. There are
no analytics on the site and the quiz adds none.

## What is reused from the homepage

| Thing | Reused? | How |
|---|---|---|
| **Theme** (`home/theme.js`, `home/theme.css`) | Yes, as is | Auto, Light and Dark, set before first paint. The quiz's colours are the theme's tokens. |
| **Stacks physics** (`home/stacks.js`) | The recipe, not the file | The quiz loads the same `matter-0.20.0.min.js` (so it is usually cached) and copies the tower mode's settings: sleeping bodies, the same friction and chamfer, a loop that runs only while something is awake, fetched in idle time, never under reduced motion. `stacks.js` itself is 47 kB tied to the homepage panel (balloons, darts, the CARLOS pyramid) and is not loaded. The quiz's pile is a new file of about 150 lines. |
| **Brick style** (`home/stacks.css`) | Yes | The slab's border, radius and type move into shared tokens so a quiz brick and a homepage brick are the same object. |
| **Paste box and Copy** | Yes, as is | Same markup, same script, same “Copied” line. |
| **Meadow** (`home/hero-bg.js`) | No | It is 9,000 blades of WebGL behind a hero. The story already took it off the hero for a plain page, and the quiz is fourteen quick screens where a moving background would compete with the one thing moving on each. |
| **The sun** | Shared with the sun story | Four circles and one stylesheet: `sun.js` and `sun.css` in `2026-11-21-sun-story/`. No path and no script to animate it. Whichever page ships first carries the two files into `src/`; the other uses them. |

## Performance budget

| | Budget | Note |
|---|---|---|
| First screen (HTML, CSS, theme, the sun) | 30 kB gzipped | The intro is text and four SVG circles. No web fonts, no images. |
| Quiz script (steps, keys, state, pile) | 12 kB gzipped | Deferred. |
| Physics engine | 26 kB gzipped, as today | Fetched in idle time after the intro shows, only if motion is allowed. If it has not arrived, the first bricks stack by CSS. |
| Pictures | 4 kB each, 24 files | Only the current statement's two and the next one's two are fetched. About 16 kB in flight at any time, under 100 kB over the whole quiz. |
| Share images | 120 kB each | Never loaded by the quiz page. |
| Whole quiz, start to result | 200 kB | For comparison, the homepage’s meadow and stacks scripts alone are 25 kB gzipped before the engine. |

Running costs:

- No WebGL and no canvas. SVG and CSS only.
- The physics loop sleeps whenever every brick is at rest, which is nearly
  always. At most sixteen bodies.
- Animations use `transform` and `opacity` only.
- Largest paint is the title text. Layout shift is zero by design: the
  reaction's space is reserved.
- Nothing runs while the tab is hidden.

## Build plan

Each slice ships by itself, behind no link until the last.

1. **The page without script.** `/uncompromising/` with the title, the
   list of twelve statements and facts, and the paste line. Strings from
   the approved deck into `src/_data/`. Placeholder boxes where pictures
   go. This is the no-script page and the base for everything after.
2. **The steps.** The form, one screen at a time, answers, reactions in
   place, the bar, Back, keys, step addresses, saved state, focus and the
   status region. Result with its title and count as text. Still no
   pictures and a still sun. The quiz is fully usable at this point.
3. **The sun and the pile.** The sun's states (rest, squish, bright, swell). The picker with its
   chips and falling bricks. The brick leaving on “Absolutely not”. The
   ending. Reduced motion for all of it.
4. **The pictures**, in three batches of four, each shown to Paul before
   the next is drawn: statements 3, 4, 6, 7 first (they are the ones in the
   frames), then 1, 2, 5, 8, then 9 to 12.
5. **Sharing and the door in.** The three result pages and images, the
   Share button, then the hero link on the homepage. Tests added to
   `npm run check` (steps, keys, no-script markup, both themes), AGENTS.md
   brought up to date.

Before slice 1: the copy review finishes, Paul approves the sun, and
questions 1 to 3 are answered. Slices 1 and 2 do not depend on the look.

## Strings the design needs that are not in the deck

All would go through the copy review. Placeholder wording in the frames:

- The picker's chip labels (sixteen).
- Back, Next, Copy, and the “Copied” line if it differs from the homepage.
- “{n} of 12”, “Before we start”, “Your result”.
- “Your stack · {n}” and “{n} things to run”.
- “{thing} out of your pile. {n} left.”
- A no-script heading and intro line.
- Share text for the second and third results.
- The labels inside the twelve pictures, and a text alternative for each
  picture in both states.
- Titles and descriptions for the three result pages.

## Open questions for Paul

1. **The sun.** Is the character in “The character” right? Everything
   here now assumes it.
2. **The bricks.** Which names may the picker offer, and are product names
   (Heroku, Kubernetes) fine as plain words? Sixteen is my guess at the
   right number.
3. **“With CARLOS: 1.”** Limit the picker to things an app really does
   replace, or add a line saying the platform does the rest?
4. **Which brick leaves.** The matching one where there is a true match and
   the top one otherwise, as drawn? The alternative is that a brick leaves
   only when the fact is about it, which is stricter and leaves most piles
   standing at the end.
5. **Sharing a middling result.** “I’m uncompromising. Are you?” suits only
   the top result. Share text for the other two, or offer Share only at the
   top?
6. **The thresholds.** 12, 7 to 11, 0 to 6. And “We’ll keep score” on the
   no-script page, where nobody does.
7. **The tenth box.** One picture that reacts to “Absolutely” (statement
   6): a nice surprise, or inconsistent?
8. **The burglar.** A person beside the sun, drawn without a face. Fine,
   or should the break-in be shown without anyone?
9. **The joke labels.** They carry much of the humour and are unreviewed.
   Keep them in the pictures, or pictures with no words at all?
10. **Order.** The deck's order is kept. The strongest pictures are 3, 7
    and 12; should one of them open?
11. **The hero link** goes in last (slice 5). Sooner, to a text-only quiz?
