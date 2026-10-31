# 🤖 Platform access and mutations

Read only when selecting a console or describing a platform mutation.

## Start with `carlos auth whoami`

Before concluding you cannot reach a CARLOS deployment, run it:

```
carlos auth whoami                              # the default console
carlos auth whoami --console https://<console>  # a specific one
```

It prints the identity, the terminal's label, the expiry, and every
account with its sqid — which is also where you find the sqid your app's
hostname needs.

This is first because the obvious check is the misleading one. An agent's
instinct is to `curl` the console and read the answer: the console will
`302` you to a login page every time, because a browser session is not
what the CLI holds. That redirect says nothing about whether you have
access, and reading it as "no access" has already cost one session an
afternoon and ended in a filed issue. **The CLI's credential is the only
thing that answers the question.**

Same for the deployment's identity: a self-hosted console is not
`carloku.com`, and the console origin and the apps domain are different
hostnames (Tito's are `carlos.tito.io` and `platform.tito.io`). If a
project commits a `.carlos/config`, that names the console it belongs to;
otherwise `--console` does.


## Describe changes in Activity

Agents pass `--message` explicitly for `ship`, `deploy`, `promote`,
`rollback`, `restart`, `instances create`, `instances delete`, `features set`,
`env set`, `env unset`, and `env exec-delivery`.
Use a concise sentence describing the intended change or why it is needed:
`carlos deploy --message "Fix invitation links after an email address changes"`.
The console records the exact action, version, channel, or instance separately;
repeating only a commit hash or "deploy app" adds no useful context. Do not
invent an outcome you have not verified, or include secrets or config values.

Messages are optional, one line, at most 240 Unicode characters. They are
separate from release labels and release notes. Interactive CLI commands ask
for a description by default; an empty answer skips it. Noninteractive commands
do not prompt. `--no-prompt` suppresses the question for a command, and
`"message_prompt": "off"` in `.carlos/config` disables prompts by default.
Agents should still supply `--message` when
prompts are disabled. Explicit `--message` still applies with `--no-prompt` or
config suppression. `deploy` asks once and uses the same description for its
ship and promote steps.
