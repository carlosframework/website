Tito Go is the first commercial SaaS implemented using the CARLOS architecture and deployed to a private CARLOS Platform. After uncovering what was possible with Eleven, I realised that Tito could gain immensely from the data isolation of single-tenants, along with the performance of using Go rather than Ruby.

Tito stands to benefit particularly profoundly from the shift to agentic development along with the adoption of CARLOS. Tito’s first web app, released in 2011 and rewritten in 2016, has been feeling a bit long-in-the-tooth for years. It's a hodgepodge of coding techniques, a few "microservices" that share the same database, a spaghetti of JS spanning several "will they won't they" attempts to convert to an SPA, and generally a very good effort to "do best practice" while ending up harder to maintain than is desirable for a small team.

In 2023, we started a new app on Rails 7 in an attempt to coalesce around the new Rails conventions from the time, pushing more responsibility back to the server and adopting Hotwire and Stimulus. This went well, but over a couple of years a) it too has started to atrophy in terms of performance and maintainability, and b) despite great success with some big customers, we never managed to get it to the point where it was a viable alternative to most of our customers.

For years, we have dreamed of consolidating our apps into a single codebase in a single repo. We've gradually been moving toward that, but never quite got there.

Tito Go has changed all that.

As of today, the CARLOS version of Tito has replaced all of the functionality we built into Tito Pro over the past two years. Features that big customers relied on: customers like Stripe, Intercom, and Heineken.

Moving a customer from Tito Pro to Tito Go is possible via an import script that connects read-only to our production Postgres database and runs an ETL process into the SQLite database for that customer.

But what about our Classic app? This is the app that has run for 10 years and has 10 years worth of legacy, esoteric edge case features, and customers who have used it for years.

As it turns out, our two apps weren't all that different, and we can extract, transform and load customer data from our legacy MySQL database right into the single-tenant database.

Then there are the features. In 2015, we mapped out our highest priority new feature: post-purchase paid upgrades. It sat on our todo list for 10 years and never got implemented, not even on Tito Pro. We almost got there once or twice. GenAI made implementing it in a couple of days possible, allowing our product manager to refine it alongside a host of other features, and CARLOS makes it possible to deploy it with confidence.

Where’s that confidence from? At this point the test suite is over 20k tests—with over 110k assertions—running in nearly 300 real Chrome browser sessions. We're running the tests on self-hosted EC2 spot instances via [Amadan](https://amadan.net), and they typically run in 2–3 minutes. The tests protect against regressions in functionality, end to end usage of the app, but also things like our performance budget to ensure <150ms page loads and a complete set of automated accessibility tests to ensure WCAG 2.2 AA compliance-readiness. This is how all web apps should be!

In June, Tito achieved our first certificate of ISO27001 compliance. I was surprised at how much compliance under ISO27001 was about policies, and not technology. Sure there are some prescriptive policies, but on the whole, ISO27001 is about identifying risk, mitigating what you can, and evaulating the potential impact of risk. After working on [Eleven](https://elevenmessenger.com) I realised that we could be doing so much better a job with how we handle customer data.

With CARLOS platform, we're separating all customer accounts. If someone wants their data in their own country, we can place it there: we’ve already set up servers in 7 locations.

We also—finally—have a place to put our static sites. This simple problem could be solved any number of ways: GitHub Pages, or a static PaaS, or even a simple upload to S3. But then sites get lost and it's hard to keep track of them. Being able to put static sites easily alongside our apps takes away that "where is this site?" question, and it also gives us a way to easily produce and upload documentation for our customers on to URLs that are very much "Tito".

It seems weird to write a testimonial for something that I have "prompted" into existence, but this is very much a platform I've dreamed about for years, and if the benefits are only temporary before AI takes over everything, for a short period, I’ll have seen what the platform I wanted all these years looks like.

—[Paul Campbell](https://paulca.com), October 2026
