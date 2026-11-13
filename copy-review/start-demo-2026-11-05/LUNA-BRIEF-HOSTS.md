# 🤖 Copy pass brief (delta): the network note beside the paste line

You are reviewing user-facing strings for a software website. Paul, the owner, delegated this review to you. Apply his house rules and return improved strings.

Context: the homepage and the /start page show one line for a person to paste into their AI coding agent (`Follow the directions on https://carlosframework.com/start`). Some coding agents, especially cloud ones, run with network access limited to an allowlist. Then the agent cannot even read the page, so the person must allow our addresses in the agent's network settings before pasting the line. Paul's ruling: name both addresses next to the paste line so a person can allow both at once. The addresses come from build configuration; in production they are `carlosframework.com` (the website the agent reads) and `console.carloku.com` (where the agent sends the app). On some deployments the two are one address, so a one-address variant is needed. The note sits directly under the paste line and its copy button, in smaller text. Audience: anyone, often non-technical. Each product names the setting differently, so do not name a product's menu.

## House rules

- Plain, modest words. No marketing tone, no exclamation marks.
- No em dashes or en dashes used as dashes. Use a full stop and a new sentence.
- Sentence case, full stops on sentences.
- Keep `{siteHost}`, `{apiHost}` and `{host}` exactly; they are replaced by the addresses, shown as code.
- Neutral examples only.

## Facts that must stay true

- Most local agents need nothing. The note is for agents whose network access is limited.
- Allowing the addresses is done in the agent's own settings, not on our site.
- Never suggest turning the sandbox off or allowing everything.

## Output

Do not edit any file. Answer with one markdown table `| ID | new | why |`, one row per deck row in order, `unchanged` when you keep it. Then a short **Flags** list. Nothing else.

## Deck

| ID | Surface | Draft text |
|---|---|---|
| start.hosts.two | Under the paste line, homepage and /start, when the two addresses differ | If your agent's network access is limited, allow {siteHost} and {apiHost} in its network settings first. |
| start.hosts.one | Same place, when there is one address | If your agent's network access is limited, allow {host} in its network settings first. |
