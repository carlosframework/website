# 🤖 Reader panels: carlosframework.com, 2026-11-17

Two rounds, the same six synthetic readers (Claude Sonnet, in character, one
at a time). Round 1 read the visible text of the live page (609c679) with
notes on what the pictures show. Round 2 read the first draft of the proposed
arc, with fresh eyes. They were asked for honesty, not flattery. Synthetic
readers are a cheap check on order and wording, not evidence about real
visitors.

| | Reader |
|---|---|
| Aoife | senior Rails developer at a 12-person SaaS, uses Claude Code daily, sceptical of new frameworks |
| Marcus | CTO of a 4-person startup on Next.js, Vercel and Supabase, cost-conscious |
| Lena | product manager who builds internal tools by directing agents; reads no Go; has never deployed |
| Tomasz | staff platform engineer (Kubernetes, Terraform), allergic to marketing |
| Grace | agency owner and designer, ships client sites, uses Cursor a little |
| Dev | engineering manager sent the link; gives it 60 seconds |

## Round 1: the live page

| Reader | "CARLOS is…" after the hero | At the end | Sure (0 to 10) | Would paste the line |
|---|---|---|---|---|
| Aoife | a framework for agent-built apps | a Go stack plus hosting, with a spec | 3 → 6 | No: an unknown address driving her agent, with no "what will this do?" |
| Marcus | some kind of agent workflow | a cheaper way to host agent-built Go apps | 3 → 6 | Yes: one line, throwaway |
| Lena | a way to get my agent to build and ship an app | my agent builds and hosts a small app | 6 → 6 | Yes |
| Tomasz | a slogan | a single-binary, tenant-per-instance architecture spec with a Go framework and a PaaS | 1 → 7 | No, but he would read the spec |
| Grace | a nicer way to make websites with AI? | an agent-friendly way to build and host apps, maybe sites | 4 → 5 | Yes, in a throwaway folder |
| Dev | a tool for AI-built web apps | faster, cheaper web apps from the Tito people | 3 → 5 | No, he would forward it |

**Causes of confusion, by readers affected**

1. **The headline definition says nothing concrete (6 of 6).** "A system for
   building better web apps." Nobody leaves the hero knowing the category.
2. **Numbers without a baseline (5 of 6).** 12×, 20 ms, 80%. "How we
   measured" reads as a footnote.
3. **Unexplained names (5 of 6).** "Start with Carloku", "Rastrillo",
   "Fiesta design system", "The Eleven Factors". Go is named once, inside the
   Rastrillo card.
4. **Architecture jargon before benefit (4 of 6).** "Inspired by UNIX
   principles, CARLOS deploys full stack web apps as single processes rather
   than sprawling containerised services". The two engineers found it the
   clearest sentence on the page; the other four glazed over.
5. **The paste line is a leap of faith (4 of 6).** Nothing beside it says
   what it will do, what it needs or what it costs.

**Order needed, against order given.** Needed: a plain category and the
language; who it is for and what it replaces; what the line does; proof with
a baseline; then the names. Given: an adjective, a prompt, screenshots,
architecture, names, numbers, customers.

**What did most to make it clear**

1. The agent replay, with "Paste this into your agent and it can take things
   from there".
2. "A database per customer", "Asleep until needed", "At home anywhere", with
   their spec references.
3. "A full-stack Go web framework. Ready-made parts, so your agent writes
   less from scratch", and Tito's Rails rebuild.

## Round 2: the first draft of the arc

The draft ran: header, twenty years, the pile, one file, what one file makes
possible (five beats), your agent builds it, it's real, start.

| Reader | After the header | At the end | Sure | Would paste the line |
|---|---|---|---|---|
| Aoife | a Go thing that deploys what my agent writes | a single-binary Go stack plus host, driven by agents | 4 → 6 | Yes: throwaway link, no account |
| Marcus | a cheaper way to host agent-built apps | single-binary hosting that sleeps when idle | 5 → 6 | Yes |
| Lena | a way for my agent to build and publish an app | paste a line and get an app online | 6 → 7 | Yes |
| Tomasz | single-binary PaaS with a spec | Go monolith conventions plus host | 4 → 6 | No: reads the spec first |
| Grace | a tool where my AI builds and hosts sites | an agent-run host for custom apps | 5 → 6 | Yes |
| Dev | some AI shipping tool | something that makes agents ship apps cheaper | 4 → 4 | No, he forwards it |

Against round 1: sureness after the first screen rose for five of six, and
one more reader would paste the line (Aoife, because the line under the box
said what it does). Sureness at the end barely moved. The draft's order was
the reason.

**What they did with each chapter**

- **Your agent builds it:** the best chapter for four readers. "You don’t
  have to learn any of this. Your agent does." was Lena's favourite line.
  They asked for it earlier.
- **Asleep until needed:** the strongest single beat. Marcus and Aoife both
  stopped on "you stop paying for idle servers".
- **Twenty years, placed first:** skimmed or skipped by five of six. Dev left
  during it: he "wanted what it is". Aoife liked "The hardware kept its
  promise. We spent it on layers." Tomasz liked only the sources line.
- **The pile, as its own chapter:** a toy to three readers. Two engineers
  called thirteen parts a strawman for a small app. Marcus accepted the
  balloons because they are his stack.
- **The five beats:** too many; three of them could be one list.

**Phrases two or more readers pushed back on**

- "80% less to run than a traditional web app" and "12× faster shipping to
  production": no baseline in view.
- "Good by default… built in": nothing shown.
- "Nothing shared, nothing to leak across": reads as an overclaim to an
  engineer. (It is live, reviewed copy.)
- "Rastrillo", "Carloku": still met cold.
- "Any host, any provider": vague.

**Still missing for someone deciding whether to try**

- A price or limits for the hosted platform.
- What happens after the 24 hours.
- A way to see what the start page tells the agent, before pasting.
- One honest line on what it is not for.

## What changed in the proposal because of round 2

- The one file moved to chapter 1 and "twenty years" to chapter 2, cut to
  one screen, as the reason for what the reader has just seen.
- The pile lost its own chapter. It is the opening state of chapter 1 and the
  fold follows straight away.
- The agent chapter moved up to third.
- Five beats became three and a closing row; "for people and agents" joined
  the agent chapter.
- The stack is labelled with the live wording, "a typical multi-tenant app".
- Baselines sit beside the figures; a link to the directions sits beside the
  paste line; "after 24 hours" is at the end.
- Price, "not for", and a smaller stack preset went to Paul as questions.
