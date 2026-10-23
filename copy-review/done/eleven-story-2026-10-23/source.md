"I want to make a chat app. It's kid friendly. It doesn't require any kind of log in: just a secret link to initialise, and when I send someone the link, they get to choose a screen name. I can deploy it easily and run it on a single server. Should it use sqlite? I want all the messages to be encrypted, so that if someone compromises the server, they can't access anything." [27 June 2026](https://status.elevenmessenger.com/prompts.html#s=d44f1f0e-f363-48f3-a231-7faeba75a1aa)

This was the first prompt that led to [Eleven Messenger](https://elevenmessenger.com), the app that we ultimately extracted CARLOS out of, and probably the nicest team chat app I've yet to experience.

But this wasn’t the thing that got me most excited. 12 days later, I typed:

"How do we make deploying home and the oauth broker apps essentially infinitely scaleable?" [9 July 2026](https://status.elevenmessenger.com/prompts.html#s=d49ff2f6-c243-407d-b3b9-056facd370f5)

What followed—amongst the psychosis–was the feeling that answered the question: "can we have apps that have great UX, great security and privacy, and planet scalability?".

The crux was this: each Eleven team would run at a different URL, but the whole thing would feel like signing on to a single system, just like Slack, just like Teams, just like Discord. Traditionally, self-hosted or "you get an instance" solutions would require a completely separate log-in, but Eleven started to feel different. Sure we could do the instance thing, but along came home.elevenmessenger.com

Home is a simple stateless app that’s backed by S3. Each "user" that signs in to home isn't actually signing in to a database: but their passkey is decrypting a file stored on object storage, which contains their credentials for one of the instances they have access to. What looks like SSO is actually a credential vault. Because there’s a small compute layer running on the platform alongside S3, it can expose an API, so the web app, the desktop app, and the iOS app can all use it to stay in sync: signed in teams, which order they appear, and which ones should be "pinned".

Added to all this architectural elegance was the crux of the response to the first prompt: end to end encryption, and server-blind data storage.

So here I had an app that felt great to use, was synced across all my devices, _felt_ like the traditional SaaS apps that we've grown so used to the convenience off, but was in fact running a separate instance of the app for each team.

Suddenly, this was how I wanted _all_ apps to be. Could we do this for email? Enter [Keymail](https://keymail.dev). Dropbox? See [Slopbox](https://slopbox.cloud) ... I kept going and going. I got angry that smarter people than me hadn’t done this for all of the services I rely on. How is it OK that Google has ben able to read all my email for 20 years? Why are we OK that Slack can read every message we’ve sent, or that if we really wanted to, we could read our employees private messages? Why could Twitter just be bought?

I know that lots of good folks have been considering these things for a long time, and the ideas behind CARLOS are all on the shoulders of true giants in terms of data hygiene practices and advocacy for better respect for users’ data.

CARLOS is just our contribution to show that it could have been done all along, and that if we want it now, well, here it is.

—[Paul Campbell](https://paulca.com), October 2026
