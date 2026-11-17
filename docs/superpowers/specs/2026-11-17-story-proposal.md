# 🤖 Story proposal: carlosframework.com, 2026-11-17

A storytelling read of the live homepage (609c679) and a proposal for telling
it progressively, the way carloku.com now does. Nothing here is built. Every
line of page copy below is **draft**, for Paul's review, and none of it goes
into `src/_data/start-copy.json` except through a copy review.

Supporting files, in `2026-11-17-story-proposal/`:

- `reader-panel.md`: two synthetic reader panels, one on the live page and one
  on the first draft of this arc.
- `values-facts.md`: the sourced facts behind the "twenty years" chapter.
- `storyboard.html`, `storyboard-desktop.jpg`, `storyboard-390.jpg` and
  `frame-*.jpg`: eight rough key frames. `render.mjs` re-takes the screenshots.

## Recommendation

Yes, tell it as a story, but it should not be a copy of carloku.com's.

1. **The confusion is an order and naming problem before it is a picture
   problem.** The page never says what CARLOS is in a sentence a stranger can
   repeat, and the one picture that explains it (thirteen parts becoming one
   file) sits six screens down, filed under "Less to run". Fixing that needs
   no WebGL and should ship first.
2. **Give the story one object: the one file.** Carloku's story works because
   one thing (the lilac app) goes through every scene. CARLOS's thing is the
   single small program. The story is: a web app has become a pile of parts;
   CARLOS folds it into one file; here is why that matters; your agent builds
   it; here is what one file makes possible; here is the proof; start.
3. **Put "what" before "why".** Paul's "twenty years" section is the right
   values chapter and it belongs near the top, but second, not first. In the
   reader panel five of six readers skimmed it when it came straight after the
   header, and the 60-second reader left at it. As the reason for the one
   file, one screen long, it lands.
4. **The two interactive pieces become chapters.** The stacks are chapter 1:
   the pile is theirs to pull at, and scrolling on folds it into the file.
   The agent browser is chapter 3: the session steps with the scroll, and the
   three named parts (the skill, Rastrillo, the platform) light up at the
   moment each one does its work. That is where those names finally get
   introduced.
5. **Eight screens, not twenty.** Carloku's tour is 18 scenes and 19,000 px.
   This audience is evaluating, and the way in must stay close. Seven
   chapters, about nine desktop screens (today's page is seven), with the copy
   line in the header, in the top bar all the way down, in chapter 3 and at
   the end.
6. **Use 3D where it explains, and only there.** Three beats earn it: the flat
   stack diagram turning into a solid thing as it folds, the file becoming a
   copy per customer, and sleep and wake. They reuse carloku's `story.js`
   technique over the existing meadow. Everything else is ordinary page.

Build it in four slices. Slice 1 is the new order with the pieces we already
have and no new script, and it is worth shipping by itself.

## 1. A storytelling read of the live page

Looked at in headless Chromium at 1440 and 390 px, light and dark, scrolled
top to bottom. The page is 6,380 px on desktop and 8,476 px on a phone.

| # | Beat (heading on the page) | What a first-time visitor takes from it | Where they get lost |
|---|---|---|---|
| 0 | Hero: "You’re already using agents." The paste line. The agent window replaying a real run. | It is something for people who use coding agents, and an agent can build an app with it. The replay is the clearest thing on the page. | "A system for building better web apps." "System" carries the whole definition and says nothing. The rotating adjective makes it vaguer each turn. Nothing says what the paste line will do. |
| 1 | "What kinds of apps can be built using CARLOS?" The carousel. | Real, ambitious products exist. | It answers "what can be built" before "what is it". The products look like companies, not like something the reader could make. |
| 2 | "CARLOS is a system for building better quality, more resilient, secure web apps that deploy easily." Spec button, five properties, four practices. | For engineers, the sub-line is the first real definition: single processes, compiled, an open spec. The five properties are concrete and good. | The definition arrives on screen three. For everyone else "Inspired by UNIX principles… sprawling containerised services" is jargon before any benefit. Five properties and four practices land at once, as a grid. |
| 3 | "To make it easy, we built an agent-first modern web framework… and a platform…" Two cards and the skill strip. | Now there are four things: CARLOS, Rastrillo, CARLOS Platform, the skill. Go is named for the first time. | Nobody draws how the four fit together. "Carloku", "Fiesta" and "The Eleven Factors" appear without introduction. |
| 4 | "What you get": 12×, 20 ms, 80%. | Faster, quicker, cheaper. | No baseline beside the numbers. "How we measured" is a footnote link. |
| 5 | "Less to run": the physics stacks. | This is the idea in one picture: thirteen parts against three. | It is a sub-section of "What you get", a screen below the numbers, labelled as a cost point. Most visitors never reach the best picture on the page. |
| 6 | "Who is using CARLOS?" | Tito rebuilt a ten-year-old Rails app. The people behind Tito and Jelly made this. | The strongest trust lines are last. |
| 7 | "Try it now". | The way in, again. | Fine. |

### Why people are confused

1. **One name, four things.** CARLOS is an idea with a spec, a framework
   (Rastrillo), a platform (hosted as Carloku, or run yourself) and a skill.
   The page mentions all four and never shows them as one picture. "A system"
   is the word standing in for that picture.
2. **The page tells outcomes before it tells what the thing is.** Order
   today: who you are, a gallery, the definition, the tools, the numbers, the
   picture, the proof. The reader panel asked for: what it is, what it
   replaces, what the paste line does, proof with a baseline, then the names.
3. **There is no "why".** The page never says what is wrong with how web apps
   are built now, so "one process, not a cluster" is an answer without a
   question. Paul's "twenty years" section is that question.
4. **Nothing accumulates.** Each section has its own visual language: a
   meadow, a carousel, line icons, cards, big numbers, physics blocks. No
   object carries from one to the next, so the reader starts again each time.
5. **The paste line is a leap of faith.** Four of six panel readers wanted to
   know what it does, what it needs and what it costs before pasting it. The
   facts exist on `/start` (a public link for 24 hours, no account, no
   install, keep it with an email address) and are not beside the line.

One more thing found on the way: the footer reads "CARLOS: Cost-effective,
Available…" while AGENTS.md records the expansion as "Cost-efficient". One of
them is wrong (question 9).

### What already works, and stays

- Paul's headline and sub-line. They are person-marked in the template and
  nothing here touches them.
- The agent replay. Every panel reader who would try CARLOS said it was
  because of the replay.
- "One file", "A database per customer", "Asleep until needed", "At home
  anywhere", "For people and agents", with their spec references.
- The stacks, as a picture.
- The Tito line and "built by the people behind Tito and Jelly".

## 2. The arc

A header, then seven chapters. Chapters 1, 2 and 4 share one stage: the
meadow, with labelled blocks in it. Chapter 3 is the agent window. Chapters 5
and 6 are ordinary page.

Copy below is draft. Lines marked *(live)* are on the page today or in its
reviewed copy file, word for word. Lines marked *(new)* are not.

### 0. Header: orient, and the way in

- **Says.** *(live)* "You’re already using agents." / "Now you want to ship
  *faster*, build *better* and spend *less*." / "You want CARLOS."
  *(new, replacing the rotating "A system for building better web apps.")*
  "A way to build a whole web app as one small program. Your agent writes it,
  and it runs anywhere." Then the paste box, unchanged. *(new, under the
  box)* "Your agent asks what you want to make, builds it, and gives you a
  public link for 24 hours. No account or install needed." With a small link:
  "See what it tells your agent" (to `/start`).
- **Sees.** The glass pane over the meadow, as now.
- **Illustrated.** Slice 1: the agent replay stays where it is. From slice 2,
  when the replay moves to chapter 3, the right half shows the before and
  after: the tall leaning stack, faint, and the three short blocks beside it
  ("A typical web app" / "The same app, with CARLOS").
- **Interactive.** Copy. Nothing else. The header must be readable in five
  seconds.

### 1. One file (the stacks, scroll-anchored)

Two beats in one pinned chapter, about two screens of scroll.

- **1a says.** *(new)* "A web app has become a lot of parts." *(live, lightly
  joined)* "This is what a typical multi-tenant app needs before your own code
  does anything." *(new)* "Go on, pull one out."
- **1a sees.** The thirteen-block stack, full size, standing in the meadow and
  swaying. The "One server stack / Many services" switch and Pause, as now.
- **1a interactive.** Exactly today's physics: drag a block and the pile
  wobbles and falls; switch to the balloons and pop one. It becomes live when
  the chapter pins (today it wakes when the panel nears the screen). Dragging
  starts only on a block, so a finger on the page still scrolls.
- **1b says.** *(new)* "CARLOS puts the whole app in one file." *(live)* "Web
  server, database engine, background jobs and interface, compiled into a
  single binary." *(new)* "One process, where there was a cluster." *(new)*
  "CARLOS is the open specification for building web apps this way."
  *(live)* "Read the spec" / "v0.1, draft for comment".
- **1b sees.** Scrolling on calls the blocks home: the ones that live inside
  the app fly into one teal block, "Your app", which settles on "CARLOS
  Platform" and "Any host, any provider". The ones nothing needs any more
  fade. Scrolling back up rebuilds the pile.
- **1b 3D.** While the blocks fold, the flat diagram turns a few degrees and
  becomes a solid object in the meadow. From here on the teal block is the
  story's main character.
- **Trigger.** Scroll position inside the pinned chapter. The first half is
  free play; the second half moves each block's tether from its place in the
  pile to the app block (the pyramid is already "tethered home" in
  `stacks.js`, so this is the same mechanism pointed somewhere new).
- **Needs a ruling.** Which of the thirteen go into the file, which the
  platform does, and which are simply gone. The storyboard guesses. See
  question 3.

### 2. Why: twenty years (the values chapter)

One screen. See section 3 for the facts and the picture.

- **Says.** *(new)* "Computers got faster and far cheaper. Software got
  heavier." / "Memory costs about a ninetieth of what it did in 2005. The
  median web page weighs six times what it did in 2010." / "The hardware kept
  its promise. We spent it on layers." / "We think software should be small
  enough to understand, fast on ordinary hardware, private by design, usable
  by everyone and yours to move." / "Sources: Our World in Data, HTTP
  Archive. Drawn to scale."
- **Sees.** Two pairs of blocks on the same meadow, drawn to scale: the price
  of memory in 2005 and 2023, and the median web page in 2010 and 2026.
- **Trigger.** Scroll moves a year marker; both pairs change together. No
  pinning needed; it can be a plain scroll-linked animation.

### 3. Your agent builds it (the agent browser, scroll-anchored)

- **Says.** *(new)* "You don’t have to learn any of this. Your agent does."
  Three stops beside the window, each the existing card copy:
  1. *(live)* "The skill. Instructions your coding agent reads before it
     starts."
  2. *(live)* "Rastrillo. The Go web framework your app is built on." / "It
     gives your agent ready-made parts for many kinds of apps, so it writes
     less from scratch."
  3. *(live)* "CARLOS Platform. Where your app runs: hosted on Carloku or on
     your own hardware."
  Then *(live)* "For people and agents: what a person can do in the
  interface, an agent can do through the API or the command line." And the
  paste box.
- **Sees.** The "Your agent" window, larger than in the hero, with the three
  stops in a column beside it (under it on a phone).
- **Interactive.** The same replay with the same controls and the same nine
  sessions. When the chapter pins, the session plays. Scrolling steps it
  turn by turn (the replay already has previous and next), and a stop lights
  when the session reaches it: the skill when the agent says it has read the
  directions, Rastrillo when it writes the app, the platform when the link
  goes live. A reader who stops scrolling just watches it play.
- **Why here.** This replaces the "To make it easy, we built…" section. The
  names are introduced by watching each one work, which is the only place
  they stop being jargon. The links those cards carry (rastrillo.org, Fiesta,
  Start with Carloku, self-host, the skill links) sit on the stops.

### 4. What one file makes possible (the attributes, progressively)

Three beats on the teal block, one screen each, then a closing row. Today
these are five grid cells seen at once.

- **4a.** *(new)* "Every customer gets their own." *(live)* "Every customer
  gets their own instance and their own data. Nothing shared, nothing to leak
  across." The block becomes a field of blocks, each with its own small
  database. *spec §1*
- **4b.** *(new)* "It sleeps when nobody is using it." *(live)* "It stops
  when nobody is using it and wakes on the next request, with nothing lost."
  / "Stop paying for idle servers." The blocks dim to outlines. A request
  arrives as a point of light (the meadow's pollen and fireflies, given a
  job) and one block wakes. *spec §8*
- **4c.** *(new)* "It runs anywhere." *(live)* "The same binary runs on a
  hosted platform, your own servers or a laptop." The same block hops between
  three stands. *spec §7*
- **Closing row.** *(live)* "Best practices built in, by default":
  Performance, Security, Accessibility, Privacy, with their spec references,
  and "CARLOS is a set of strong opinions, not rules." Three panel readers
  did not believe "built in" with nothing shown, so each practice gets one
  checkable fact from the page ("Accessible from day one: WCAG 2.2 AA",
  "Each customer’s data kept separate", "20 ms") in place of a bare word.
- **Interactive.** In 4b, clicking or tapping a sleeping block sends it a
  request and wakes it. Nothing else.

### 5. It’s real

- **Says.** *(new)* "Tito rebuilt a ten-year-old Rails app this way." The
  three figures with their baselines beside them, not under a link: *(live)*
  "12× faster shipping to production", "20 ms average response time, down
  from 250ms", "80% less to run than a traditional web app". "How we
  measured" becomes a visible line. Then the apps, then *(live)* "CARLOS is
  built by the people behind Tito and Jelly, and extracted from what they
  learned serving real customers."
- **Sees.** The figures count up as now. The apps carousel, kept but moved
  here: after the reader knows what CARLOS is, it reads as proof.
- **Missing, by the panel's account.** A price, or a link to Carloku's. See
  question 8.

### 6. Start

*(live)* "Try it now", the paste box, "Rather set it up yourself? Get started
by hand". *(new, from `/start`)* one line on what happens after the 24 hours:
keep it with an email address. *(new)* a way on to carloku.com, whose story
begins "You made an app. Now what?": the two sites read as two halves of one
story (question 7).

## 3. The values chapter

Paul's sketch: "in the last 20 years faster computers got cheaper, but
software seemed to get slower and more expensive". Checked against primary
sources on 2026-11-17 (`values-facts.md` has each figure, quote and link).

**What holds:**

- Memory: $100,943 per terabyte in 2005, $1,088 in 2023, in constant
  dollars. About 93 times cheaper. (Our World in Data, from John McCallum.)
- Compute: Amazon's first EC2 machine in 2006 was a 1.7 GHz core with
  1.75 GB of memory for 10 cents an hour. Today 1.7 cents an hour buys two
  cores and 2 GB. (AWS.)
- Web pages: the median desktop page was 468 KB in November 2010 and is
  2,957 KB in November 2026, 6.3 times heavier, with 8.5 times the
  JavaScript. (HTTP Archive.)
- Wirth said it in 1995: "Software is getting slower more rapidly than
  hardware becomes faster."

**What does not hold as written:**

- "Slower" is not true across the board. Web performance scores have improved
  three years running. The supported word is **heavier**: software took back
  much of what the hardware gave.
- "More expensive" is true only in particular senses: more parts to run,
  survey-reported waste (29% of cloud spend, Flexera 2026), 37signals cutting
  a $3.2M cloud bill to $1.3M by leaving. Unit prices fell.
- "Twenty years" fits the hardware. The page-weight record starts in 2010.

**The framing I'd use:** the hardware kept its promise and we spent it on
layers. It is true, it blames nobody, and it sets up the one file as the
obvious answer. The beliefs line that follows is the values statement, and
each belief is cashed by a later chapter:

| Belief | Where the story proves it |
|---|---|
| small enough to understand | 1: one file |
| fast on ordinary hardware | 5: 20 ms, down from 250 |
| private by design | 4a: a database per customer |
| usable by everyone | 4: accessible from day one, WCAG 2.2 AA |
| yours to move | 4c: the same binary anywhere |

**Illustration.** Two comparisons drawn honestly to scale, as blocks on the
meadow floor. Memory: a tall column for 2005 and a sliver, a ninety-third of
its height, for 2023. The web page: a small square for 2010 and one with 6.3
times its area for 2026. Scrolling moves the year and both change together,
so the reader watches the scissors open. The to-scale drawing is the point:
it is the difference between a claim and a measurement. Frame
`frame-2-twenty-years.jpg`.

**Its home.** Chapter 2, directly after the one file. The first draft had it
first, as Paul sketched. The second reader panel was clear that it stalls
there; see section 6, direction B.

## 4. Getting started stays really easy

The paste line is never more than one action away:

1. **The header**, above the fold, unchanged.
2. **The top bar.** Today the masthead scrolls away. Make it sticky and slim,
   and once the header's paste box has left the screen show a "Copy the line"
   button in it, on every screen size. It uses the same clipboard code and
   the same "Copied" message.
3. **Chapter 3**, under the agent window, where the reader has just watched
   the line work.
4. **The end**, as now, with "Get started by hand".

And three small things the panel asked for, all already true on `/start`:

- Say what the line does, beside the line (the new line under the box).
- Let a careful reader see the directions before their agent does: a link to
  `/start`.
- Say what happens after 24 hours, at the end.

A chapter rail (1 to 6, small, in a corner, as carloku has) lets a reader
jump, and tells them the page is finite. No scroll-jacking anywhere: native
scrolling, `position: sticky`, no wheel handlers, no snap.

## 5. Illustrations, 3D and rendering

### What gets reused

| Existing piece | In the story |
|---|---|
| The meadow (`home/hero-bg.js`) | The stage for the header and chapters 1, 2 and 4. Its canvas already sticks while a tall hero scrolls past; it sticks for longer. Day and night stay tied to the theme. Pollen and fireflies become requests in 4b. |
| The glass pane | The text card in every chapter on the stage. |
| The stacks (`home/stacks.js`, Matter.js) | Chapter 1, whole. One new behaviour: scroll moves the tethers. |
| The agent replay (`home/replay.js`, nine sessions) | Chapter 3, whole. One new behaviour: scroll steps it, and it reports which stop it has reached. |
| The five property icons | The still drawings for chapter 4 start from them. |
| The apps carousel, the counting figures | Chapter 5, as they are. |
| The six background textures | Not needed. |

### What gets "3D-ified"

The stack blocks. Today they are flat labelled cards. In the story they are
slabs with a top and a side, and from beat 1b on they are true 3D boxes: the
app block, its copies, their databases, the three stands. That is the whole
cast, about thirty boxes and a cylinder at most. Labels stay real HTML text,
pinned to the boxes each frame.

### Rendering approach

Take the technique from carloku's `src/story.js`, not the file:

- Hand-written WebGL 1, no library. One unit cube, its twelve edges and one
  cylinder, drawn once per part: flat shaded faces with hairlines on top.
- A table of scenes: for each, where every part is and where the camera is.
  Scroll position picks the scene and blends to the next; inside a scene a
  short loop plays.
- HTML labels positioned from the 3D points every frame.
- It rests when the tab is hidden or the stage is off screen, never draws
  above 2× device pixels, and hands the page back to the stills if the WebGL
  context is lost.

Differences from carloku:

- A transparent canvas above the meadow canvas, so the crisp blocks sit in
  front of the soft, blurred meadow. That gives depth of field for free. If
  two WebGL contexts cost too much on phones, the spike in slice 3 folds the
  blocks into the meadow's own context instead.
- Chapter 1a is not WebGL. The pile stays DOM blocks under Matter.js, seen
  flat. The hand-over happens during 1b: as the blocks reach the app block,
  the camera turns and the WebGL boxes take over.
- The look is this site's: paper faces, ink hairlines, index teal
  (`#067a68` / `#2fd4ac`) for the app block. Not carloku's lilac, and not
  the signal ramp, which means trust class and nothing else.

### Fallbacks

| Case | What the visitor gets |
|---|---|
| No JavaScript | A normal page in the same order. Every chapter has its text and a still inline SVG beside it. The stacks are the still picture they are today; the replay is the CSS loop it is today. Nothing is pinned. |
| Reduced motion | The stills are the page. Nothing pins, scrubs or plays by itself. The replay shows its still and its steps still work by button. |
| No WebGL, or context lost | CSS gradient for the meadow (as today) and the SVG stills for the blocks. The stacks and the replay still work; they never needed WebGL. |
| Low power (Save-Data, little memory, or frames slower than 40 ms) | The meadow already halves its grass, then shrinks. Next step: freeze the meadow to one frame and keep the blocks, which are a few hundred triangles. |
| Phone, 390 px | The stage is the top part of the screen and sticks; the text card scrolls under it (`storyboard-390.jpg`). The meadow is drawn once per chapter, not animated, unless the device is keeping up. The three stops sit under the agent window. |
| Screen reader, keyboard | The page reads in order as an article. The stage is hidden from assistive tech and each chapter's text carries its meaning. The replay keeps its whole text in the page. The rail is links. One Pause stills everything that moves. |

### Performance budget

- **Script.** One new file for the stage, at most 30 KB unminified (carloku's
  bar), with its size in its header comment and a build check. No new
  library. Today's homepage scripts total about 119 KB unminified, plus
  Matter.js (83 KB), which stays lazy and loads only near chapter 1.
- **Loading.** The header paints and the Copy button works before any canvas
  exists. The largest paint is the headline. Nothing shifts: every stage has
  its height reserved.
- **Frames.** Blocks at 60 a second on a mid-range laptop; the meadow stays
  at its 30. Under 4 ms of script per scroll frame. Per frame, only
  `transform` and `opacity` are written to the page.
- **Images.** None added. The replay screenshots are already lazy.
- **Length.** At most ten desktop screens.
- **Checks before any slice ships.** 390 and 1280 px, light and dark, script
  off, reduced motion on, a throttled phone profile, `npm run check` with the
  home baselines regenerated.

## 6. Directions

Three, and they differ in what the story is about.

**A. One file. What, then why.** *(recommended; the arc above)* The main
character is the single small program. The pile folds into it, then the
reason, then the agent, then what it makes possible.
- For: answers "what is it" on the second screen; uses both interactive
  pieces as chapters; the values chapter explains something the reader has
  just seen.
- Against: the values chapter is not the opening note Paul sketched.

**B. Twenty years. Why, then what.** Paul's sketch as written: header, then
"computers got cheaper, software got heavier", then the pile, then the file.
- For: the classic shape, problem before answer; the most values-led.
- Against: tested as the first draft. Five of six readers skimmed the values
  chapter in that position and the 60-second reader left during it. Three
  called the pile a toy when it had a chapter to itself with no answer in it.
  Readers still could not say what CARLOS was until the fourth screen.

**C. The session is the story.** The agent window stays pinned for the whole
page. Scrolling advances one recorded session, and at each step a panel
opens on what CARLOS did there: read the skill, wrote one file, gave it its
own database, put it live, let it sleep.
- For: the most concrete; the best fit for people who direct agents and do
  not read code; the least new drawing.
- Against: no room for the why, and it makes CARLOS look like an AI tool,
  which is the wrong category. The stacks have no natural place in it.

A and B share every asset; the difference is one chapter's position, so the
choice can be changed late and cheaply. C is a different page.

## 7. Build plan

Each slice ships by itself and leaves the page better than it found it.

1. **The arc, flat.** Reorder the existing sections into the arc. The new
   definition line in the header in place of the rotating one, and the line
   under the paste box. The stacks move up under a heading that says what
   CARLOS is. The values chapter as text and one still to-scale drawing. The
   tools cards become the three stops, as a plain list (the replay stays in
   the hero for now). Baselines
   beside the figures. Sticky top bar with Copy. No new script beyond the
   top-bar button. This slice alone answers causes 1, 2, 3 and 5 of the
   confusion.
2. **The two interactive chapters.** Chapter 1 pins and scroll folds the pile
   (tethers). The replay moves from the hero into chapter 3 and steps with
   the scroll; the stops light. The header gets its before-and-after still.
   The values drawing follows the scroll.
3. **The stage.** A one-day spike first: two canvases or one, on a real
   phone. Then the WebGL blocks for 1b and chapter 4, the hand-over from the
   flat pile, the labels. The stills from slices 1 and 2 become the
   fallbacks, so none of that work is thrown away.
4. **Finish.** The chapter rail, the night pass in dark mode, phone tuning,
   the way on to carloku.com, and AGENTS.md brought up to date (its opening
   still says only one script runs in the browser).

Before slice 1: Paul answers the questions below, and the new and changed
strings go through a copy review. Only then do they enter
`src/_data/start-copy.json`.

## Open questions for Paul

1. **The definition line.** Is "A way to build a whole web app as one small
   program. Your agent writes it, and it runs anywhere." the sentence, in
   place of the rotating "A system for building better web apps"? And which
   word leads from then on: one file, one program or one binary?
2. **The replay's home.** It is the best thing in the hero. Move it to
   chapter 3 in slice 2 and give the hero the before-and-after picture, or
   keep it in the hero for good and let chapter 3 carry a second copy?
3. **The thirteen blocks.** For each: inside the file, done by the platform,
   or no longer needed? The fold in 1b says it out loud, so it has to be
   right against the spec.
4. **Order.** A (what, then why) or B (your sketch: why first)?
5. **The values wording.** "Heavier", not "slower and more expensive", since
   only heavier is supported. And is the beliefs line ("small enough to
   understand, fast on ordinary hardware, private by design, usable by
   everyone and yours to move") the values statement you want, or do you want
   to write it yourself?
6. **The figures.** Are 12×, 20 ms and 80% all Tito's, so the page can say so
   beside each? The panel's sceptics wanted the baseline and the owner at the
   number.
7. **Two halves of one story.** Should this page end by handing the reader's
   app to carloku.com ("You made an app. Now what?"), with the same app block
   in both, teal here and lilac there?
8. **Price and limits.** Should chapter 3's platform stop or chapter 5 say
   what Carloku costs, or link to its pricing? And does the page want one
   honest line on what CARLOS is not for?
9. **The expansion.** The footer says "Cost-effective"; AGENTS.md says
   "Cost-efficient". Which is right? And should the six letters appear in the
   story at all, or stay on `/attributes/`?
10. **The stack's fairness.** Two engineers on the panel called thirteen
    parts a strawman for a small app. Keep "a typical multi-tenant app" as
    the label, or add a third, smaller preset beside "One server stack" and
    "Many services"?
11. **The top bar.** A sticky masthead with a Copy button: fine?
12. **One more script.** A stage script of up to 30 KB, hand-written, on the
    homepage only: within the "small, local, progressive" rule as you read
    it?
