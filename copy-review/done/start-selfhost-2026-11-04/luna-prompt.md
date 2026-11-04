You are reviewing user-facing copy for carlosframework.com, the website of CARLOS, an open-source application architecture with an open-source hosting platform (CARLOS Platform). Carloku (carloku.com) is a hosted service that runs CARLOS Platform for you; people can also self-host the platform, use their own servers, or other hosts (Fly, Render, Railway).

Review the AFTER strings below for plain, accurate, non-salesy wording. House voice: plain, direct, British spelling, short sentences, no marketing adjectives, no em dashes as separators. Carloku must read as one convenient option, not the only one, and must not be disparaged. Commands are fixed facts; only comment on a command if the prose around it contradicts it.

Facts you can rely on:
- The getting-started agent skill now begins by interviewing the operator (what the app is for, new or port, who owns data, how polished the first slice should be, where to host) before any code. "Decide later" is a fine hosting answer; the first slice runs locally.
- In the current CARLOS CLI, `carlos deploy --app notes --env KEY=value ./binary` creates the app's first instance if it is missing, sets the variable, ships, and prints `live https://...`. The older `carlos instances enable` / `instances create` steps are no longer needed.
- The self-host walkthrough pins CARLOS CLI and console v0.28.15 (its OpenTofu templates install a v0.28.15 host binary). At v0.28.15, `carlos deploy` does NOT create instances or take --env, so self-hosters need the older steps.
- A console signs in any email address only when console email (a sending address and an SES send grant) is configured. Without it, it signs in Keymail addresses only and tells anyone else so. The self-host walkthrough does not set up console email.

For each string, reply with: ID, verdict (OK or CHANGE), and if CHANGE the exact replacement text and a one-line reason. Be concise. Flag anything inaccurate given the facts above.

=== Page: /start/ (Get started) ===

ID start.agent.prompt
BEFORE:
Build [describe your app] using CARLOS principles and Rastrillo.

Read https://github.com/carlosframework/skills/blob/main/skills/getting-started/SKILL.md and https://rastrillo.org/SKILL.md first.

I want to deploy to carloku.com. Help me connect my account, then build, test and deploy the app. Use the current installation commands in rastrillo.org/SKILL.md.
AFTER:
Build [describe your app] using CARLOS principles and Rastrillo.

Read https://github.com/carlosframework/skills/blob/main/skills/getting-started/SKILL.md and https://rastrillo.org/SKILL.md first.

Before writing code, ask me what the app is for, how polished the first version should be, and where I want to host it. Then build and test it, and deploy it when I'm ready.

ID start.hand.hosting (NEW paragraph, in the "By hand" tab, directly above the "Connect your account and create the app" commands, with a link on "Self-host CARLOS Platform")
AFTER:
These steps use Carloku, which runs CARLOS Platform for you. To run the platform yourself, see Self-host CARLOS Platform.

ID start.hand.deploy.heading
BEFORE: Create an instance and deploy it
AFTER: Deploy it

ID start.hand.deploy.commands
BEFORE:
carlos instances enable --app notes
carlos instances create --app notes --host notes.YOUR_ACCOUNT_ID.oncarlos.com --channel edge
carlos env set --app notes NOTES_ORIGIN=https://notes.YOUR_ACCOUNT_ID.oncarlos.com
carlos deploy --app notes ./notes-linux-arm64
AFTER:
carlos deploy --app notes \
  --env NOTES_ORIGIN=https://notes.YOUR_ACCOUNT_ID.oncarlos.com \
  ./notes-linux-arm64

ID start.hand.deploy.after
BEFORE: The deploy command prints the live URL. Open it in your browser.
AFTER: The deploy command creates the app's first instance, sets its public address and prints the live URL. Open it in your browser.

(Unchanged, for context, just above: "Approve the sign-in code in your browser. Replace YOUR_ACCOUNT_ID below with the account short ID printed by whoami.")

=== Page: /platform/self-host/ (Self-host CARLOS Platform) ===

ID selfhost.grant.after (follows `console grant --operator YOU@example.com`)
BEFORE: Use the email address you will sign in with through Keymail. No OAuth client registration is needed.
AFTER: Use a Keymail address. The console can sign in any email address once console email is set up, but this walkthrough does not set it up, so until then it signs in Keymail addresses only. No OAuth client registration is needed.

ID selfhost.signin
BEFORE: Open the console in a browser and sign in with Keymail. Follow the onboarding steps to create your first account. Do not expose port 8090.
AFTER: Open the console in a browser and sign in with that Keymail address. Follow the onboarding steps to create your first account. Do not expose port 8090.

ID selfhost.deploy.intro (step 7, after `carlos auth login/default/whoami`)
BEFORE: Follow the hand-built app instructions and the CARLOS CLI guide. Use your console and app domain in every example. A Notes host would look like notes.YOUR_ACCOUNT_ID.apps.example.com, not a carloku.com host.
AFTER: Download, test and build the Notes sample as in the hand-built app instructions. CARLOS CLI v0.28.15 does not create the instance during a deploy, so create it and set its address first, then deploy:

ID selfhost.deploy.commands (NEW code block)
AFTER:
carlos apps create --app notes
carlos instances enable --app notes
carlos instances create --app notes --host notes.YOUR_ACCOUNT_ID.apps.example.com --channel edge
carlos env set --app notes NOTES_ORIGIN=https://notes.YOUR_ACCOUNT_ID.apps.example.com
carlos deploy --app notes ./notes-linux-arm64

ID selfhost.deploy.after (NEW paragraph after the code block, with a link on "CARLOS CLI guide")
AFTER: Replace YOUR_ACCOUNT_ID with the account short ID printed by whoami, and apps.example.com with your app domain. The CARLOS CLI guide covers the other commands.

(Unchanged, follows: "Build the Notes sample with Go 1.26 or later." — tell me if it is now redundant.)
