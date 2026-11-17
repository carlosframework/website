# 🤖 Facts for the "twenty years" chapter (2026-11-17)

A research subagent fetched each source on 2026-11-17 and checked the figure
or quote against the page or its data file. "Verified" means it saw the
figure at the source. Anything the page says in this chapter must trace to a
verified line here; check again before it ships, since two of these series
update monthly.

## Hardware got faster and cheaper

| Fact | Figure | Source | Status |
|---|---|---|---|
| Price of memory | $100,943 per TB (2005) to $1,088 per TB (2023), constant 2020 US$, cheapest recorded to date. About 93×. | [Our World in Data, from John McCallum](https://ourworldindata.org/grapher/historical-cost-of-computer-memory-and-storage) | Verified in the CSV. Series ends 2023. |
| Price of disk | $538 per TB (2005) to $10.62 per TB (2023). About 51×. | Same | Verified. |
| Compute, 2006 | "the equivalent of a 1.7 GHz Xeon processor, 1.75 GB of RAM, 160 GB of local disk" for "10 cents per clock hour" | [AWS, 25 Aug 2006](https://aws.amazon.com/blogs/aws/amazon_ec2_beta/) | Verified. Note 1.75 GB, not 1.7. |
| Compute, today | t4g.small, 2 vCPU and 2 GiB, $0.0168 an hour; m7g.large, 2 vCPU and 8 GiB, $0.0816 (us-east-1, Linux, on demand) | [AWS pricing](https://aws.amazon.com/ec2/pricing/on-demand/) | Verified in AWS's pricing data feed. Nominal dollars; t4g is burstable. |
| Phones | First iPhone (2007): 128 MB of RAM. iPhone 17 (2025): 8 GB. 64×. | Wikipedia: [first iPhone](https://en.wikipedia.org/wiki/IPhone_(1st_generation)), [iPhone 17](https://en.wikipedia.org/wiki/IPhone_17) | Wikipedia only. Apple does not publish RAM. |
| Single-thread speed | About 3× from 2006 to 2021 | [Karl Rupp's trend data](https://github.com/karlrupp/microprocessor-trend-data) | Derived from the raw file; data stops in 2021. The weak part of the hardware story: the gains are in cores, memory and price. Do not lead with it. |

## Software got heavier

| Fact | Figure | Source | Status |
|---|---|---|---|
| Median page, desktop | 467.7 KB (15 Nov 2010) to 2,956.7 KB (1 Nov 2026). 6.3×. | [HTTP Archive, page weight](https://httparchive.org/reports/page-weight) | Verified in the report data. |
| Median JavaScript, desktop | 88.6 KB to 755.6 KB. 8.5×. | Same | Verified. |
| Median page, mobile | 144.8 KB (May 2011) to 2,617.4 KB. 18×. | Same | Verified, but the crawl's sample and method changed a lot since 2011. Quote desktop. |
| Web Almanac 2025 | "The median home page in 2025 was 2.86 MB on desktop and 2.56 MB on mobile" | [Web Almanac 2025](https://almanac.httparchive.org/en/2025/page-weight) | Verified. |
| Wirth, 1995 | "Software is getting slower more rapidly than hardware becomes faster." He credits Martin Reiser. | N. Wirth, "A Plea for Lean Software", IEEE Computer, February 1995. [Scan](https://berthub.eu/articles/LeanSoftware_text.pdf) | Verified in a scan. |
| Keypress to screen | Apple 2e (1983): 30 ms. Machines from 2014 to 2017: 50 to 200 ms. | [Dan Luu, "Computer latency: 1977-2017"](https://danluu.com/input-lag/) | Verified. Data is from 2017. |
| Prokopov, 2018 | "We’re getting faster hardware that runs slower software with the same features." | [Software disenchantment](https://tonsky.me/blog/disenchantment/) | Verified. |
| Mod, 2019 | "Speed in software is probably the most valuable, least valued asset." | [Fast Software, the Best Software](https://craigmod.com/essays/fast_software/) | Verified. |

## More to run

| Fact | Figure | Source | Status |
|---|---|---|---|
| Wasted cloud spend | 29%, up for the first time in five years (2026, self-reported, 750+ respondents) | [Flexera](https://www.flexera.com/about-us/press-center/flexera-finds-cloud-value-is-rising-while-ai-waste-grows) | Verified. A vendor survey. |
| 37signals | "Our collective cloud budget last year was $3.2m"; later $1.3M, "a saving of almost two million dollars per year", on about $700,000 of hardware | DHH: [2023](https://world.hey.com/dhh/we-have-left-the-cloud-251760fb), [2024](https://world.hey.com/dhh/our-cloud-exit-savings-will-now-top-ten-million-over-five-years-c7d9b5bd) | Verified. |
| Moving parts | "CNCF now hosts more than 230 projects" | [CNCF annual report 2025](https://www.cncf.io/reports/cncf-annual-report-2025/) | Verified. |
| Data-centre electricity | About 415 TWh in 2024, about 1.5% of global use; about 945 TWh projected for 2030 | [IEA, Energy and AI](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai) | Verified. Most of the growth is AI, so it does not support a claim about ordinary software. |

## Could not verify, do not use

- Gartner's public cloud spending forecast (the release returned 403).
- The npm figure of 79 third-party packages per package (seen in search
  excerpts only).
- SaaS price inflation: Vertice's index is published by a company that sells
  SaaS purchasing, from its own customers' spend, with no method shown.

## What cuts against the sketch

- **"Slower" is not true in general.** The share of sites with good Core Web
  Vitals on mobile went "from 36% in 2023 to 44% in 2024, and reaching 48% in
  2025" ([Web Almanac 2025](https://almanac.httparchive.org/en/2025/performance)).
  Alex Russell, November 2025: "It has never been easier to deliver pages
  quickly, but we are not collectively hitting the mark."
  ([source](https://infrequently.org/2025/11/performance-inequality-gap-2026/)).
  The supported word is heavier.
- **"More expensive" is not true in general.** Unit prices fell and much
  software is free. It holds for total spend, reported waste and the number
  of parts.
- **"Twenty years"** fits memory and compute. The page-weight record starts
  in 2010, so say "since 2010" for the web figure.

## The pairing the proposal uses

Memory about a ninetieth of its 2005 price; the median desktop page 6.3 times
its 2010 weight. Both from open data sets, both drawable to scale.
