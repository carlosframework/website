# 🤖 Copy pass brief: /start, the homepage hero and the demo starter

You are reviewing user-facing strings for a software website. Paul, the owner, delegated this review to you. Apply his house rules and return improved strings.

The feature: anyone, technical or not, pastes one line into the AI coding agent they already use (Claude Code, Codex, Cursor and similar). The agent reads a web page, asks the person what they want to make and how it should feel, writes a small app with its own database, and sends the source to the platform. The platform builds and runs it at a random public address for 24 hours. No account and no install are needed. If the person likes it, they keep it by giving an email address and typing the code we email them; the app then moves into their own account at a permanent address. After that, their agent can show them the normal development workflow.

The deck is the table at the end: ID, surface and draft text. Audiences:

- **Homepage hero and /start page:** anyone visiting the website, often non-technical, sometimes experienced developers. No jargon, no internal names. Say what happens and what to do.
- **Copy control:** the button beside the line to paste, shared by the homepage and /start.
- **Starter app:** the one-screen "shop list" app every demo starts from. Its visitors are whoever opens a demo link. Plain and short.
- **Build diagnostic:** read by the website maintainer when the site build is misconfigured.

## House rules

- Plain, modest words. No marketing tone, no exclamation marks, no numeric multipliers ("10x", "12x faster" and the like are banned).
- No em dashes or en dashes used as dashes. Where you would use one, end the sentence with a full stop and start a new sentence.
- Sentence case, full stops on sentences. Labels, headings and button text have no full stop.
- Leave URLs, environment variable names and code exactly as they are.
- Neutral examples only (`shop`, `example.com`). No customer names.
- Human text only.

## Facts that must stay true

- The line to paste is fixed and must not change: `Follow the directions on https://carlosframework.com/start`.
- Paul's own hero direction: underclaim. "Better, faster, more secure apps" or similar.
- A demo is public: anyone with its link can open it. It lasts 24 hours from creation; updating it does not extend that.
- Nothing in a demo is backed up. People should use made-up data and never enter real passwords or personal information.
- The person needs no account and installs nothing for the demo. Their agent may ask them once to allow one web address in its network settings.
- Keeping the app: give an email address, type the emailed code, and the app moves to the person's new or existing account at a permanent address. People with several accounts choose one.
- Bigger projects and existing apps take the account path instead of a demo.
- The agent instructions on /start are shown in full on the page, below the human introduction, under a visible heading. They are written for the agent and are not part of this review. Their heading and the note saying who wrote them are.
- Copying can be refused by the browser. Then the line is selected so the person can copy it themselves, on a phone or a computer.
- The starter list holds up to 100 items, each name 1 to 120 characters.

## Output

Do not edit any file. Answer with one markdown table, `| ID | new | why |`, one row per deck row in deck order (a row with several `;`-separated strings keeps that separator and order), every row included, `unchanged` in why when you keep a string. Then a short **Flags** list for anything you could not fix within these rules. Nothing else.

## Deck

| ID | Surface | Draft text |
|---|---|---|
| home.hero.promise | Homepage hero, the one-line promise under the existing subtitle, bold | Better, faster, more secure apps. |
| home.hero.intro | Homepage hero, short paragraph above the line to paste | Paste this line into your coding agent and describe a small app. In a few minutes you get a working demo with its own database. No account needed. |
| home.hero.action | Homepage hero, secondary link to /start beside the copy button | See how it works |
| home.meta.description | Homepage `<meta name="description">` | Paste one line into your coding agent and get a working app with its own database. Keep it with an email address. |
| home.og.description | Homepage social preview description | Paste one line into your coding agent and get a working app with its own database. |
| start.prompt | The line to paste, homepage and /start (fixed, review only for context) | Follow the directions on https://carlosframework.com/start |
| start.title | /start page heading and `<title>` | Build an app with your agent |
| start.meta.description | /start `<meta name="description">` and social description | Paste one line into your coding agent, describe a small app and get a working demo. No account or install needed. |
| start.intro | /start, paragraph under the heading, above the line to paste | Paste this line into the coding agent you already use. It asks what you want to make, builds a small app with its own database and gives you a link to it. |
| start.steps | /start, short numbered list after the line; three items | Paste the line and say what you want to make.; Answer a few questions about how it should look and feel.; Open the link your agent gives you. |
| start.lifetime | /start, notice under the steps | Your demo is public and lasts 24 hours. Anyone with the link can open it. |
| start.data | /start, notice under the steps | Nothing is backed up. Use made-up data, and never enter real passwords or personal information. |
| start.claim | /start, short section headed "Keep it"; heading; body | Keep it; If you like it, give your agent your email address and type the code we send you. The app moves into your own account at a permanent address, with its data. |
| start.account | /start, line pointing to the account path (the existing setup guide further down the page); lead-in; link text | Bringing an existing app, or want an account from the start?; Set up an account instead |
| start.agent.heading | /start, visible heading of the full agent instructions | For your agent |
| start.authorship | /start, one line under that heading | 🤖 Written by AI, for your agent to follow. You can read along. |
| copy.label | Copy button label | Copy |
| copy.done | Copy button after success | Copied |
| copy.fallback | Shown when the browser refuses to copy; the line is now selected | Your browser blocked copying. The line is selected, so you can copy it yourself. |
| copy.aria | Copy button accessible name | Copy the line for your agent |
| starter.title | Starter app page title and heading | Shop list |
| starter.empty | Starter app, empty list | Nothing here yet. Add the first item. |
| starter.name | Starter app, text field label | Item |
| starter.add | Starter app, submit button | Add |
| starter.invalid | Starter app, error when the name is empty or too long | Enter a name between 1 and 120 characters. |
| starter.full | Starter app, error when the list already has 100 items | This list is full. It holds up to 100 items. |
| starter.error | Starter app, generic database failure | Something went wrong. Try again. |
| starter.aria | Starter app, accessible name of the add form | Add an item to the shop list |
| start.config.error | Website build failure prefix, followed by the variable name and the problem | The start page build stopped: |
