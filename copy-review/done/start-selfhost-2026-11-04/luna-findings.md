| ID | Verdict | Replacement / reason |
|---|---|---|
| `start.agent.prompt` | OK | |
| `start.hand.hosting` | OK | |
| `start.hand.deploy.heading` | OK | |
| `start.hand.deploy.commands` | OK | |
| `start.hand.deploy.after` | CHANGE | **“The deploy command creates the app’s first instance, sets the public address and prints the live URL. Open it in your browser.”** “Sets its public address” is more direct and avoids an unclear pronoun. |
| `selfhost.grant.after` | OK | |
| `selfhost.signin` | OK | |
| `selfhost.deploy.intro` | OK | |
| `selfhost.deploy.commands` | CHANGE | `carlos apps create --app notes` may duplicate the app creation already done during the preceding login/account setup. The given facts don’t establish that this command is needed here, so verify it before including it. |
| `selfhost.deploy.after` | OK | |
| “Build the Notes sample with Go 1.26 or later.” | CHANGE | Keep it. The new intro says to build the sample but doesn’t specify the Go version.