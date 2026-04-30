# vlist Launch Plan v3

**Goal:** Take vlist from hidden gem to the default virtual list across every framework, starting where the competition is weakest.

## Positioning: brand vs. strategy

These two are not the same thing. Keeping them separate is the most important change in v3.

**Brand pitch — public, everywhere (homepage, README, npm, bio, posts):**
> The virtual list for every framework. Accessible by default.

**Launch strategy — internal, never the public story:**
> Hit Vue, Svelte, and Solid first. That's where vlist is the only serious option, so adoption is fastest there. React follows organically once vlist has the social proof of being the de-facto choice elsewhere.

**Why split them:** "For everyone who doesn't use React" is a smart go-to-market segmentation, but it's a weak brand. It defines vlist by what it isn't and excludes the largest framework market. When React adoption eventually comes, the historical record can't read "the lib that wasn't for you." Lead the public story with what vlist *is* — framework-agnostic and accessibility-first. Keep the sequencing private.

## Success metrics

Without targets, "double down on what works" is unactionable. Set these and review monthly.

| Milestone | GitHub stars | npm weekly | Awesome lists | Integration PRs filed |
|-----------|-------------|-----------|---------------|----------------------|
| Month 1 | 200 | 5K | 1 | 0 |
| Month 2 | 1,000 | 10K | 3 | 1 |
| Month 3 | 2,500 | 25K | 5 | 3 |
| Month 6 | 5,000+ | 75K+ | listed widely | 5+ |

Trail metric: GitHub Trending appearance in any 7-day window of months 1–3.

---

## Phase 1 — Polish & Prep (Days 1–7)

### Audit & align — Day 1, before anything else

- **Size consistency.** Homepage, README, npm, bio, pinned post all currently disagree (10.5 KB vs 10.6 KB). Pick one and propagate. Inconsistencies hurt credibility; readers notice.
- **Pitch consistency.** Every public surface uses the brand pitch verbatim or close to it. No "for non-React devs" framing anywhere public.

### Reframe the homepage

- Hero shows tabs for **vanilla / Vue / Svelte / Solid / React** — no framework prioritized visually.
- Updated elevator pitch:
  > vlist is the virtual list for every framework. WAI-ARIA + 2D keyboard navigation built in, ~0.1 MB constant memory at 1M items, composable features (grid, masonry, table, async, selection, sortable). Zero dependencies. Tiny adapters for Vue, Svelte, Solid, and React.
- Bundlephobia badge prominent: zero deps, 10.6 KB gzipped, tree-shakable stats.
- Hero GIF: smooth 1M-item scroll. The screen-reader navigation clip belongs on `/accessibility`, not the home hero — it loses impact without context.
- Polish the npm README separately from GitHub. Many devs discover libraries on npmjs.com and never click through.

### Live demos — every framework, equal weight

Embed StackBlitz/CodeSandbox with framework tabs (vanilla, Vue, Svelte, Solid, React):
- Basic 10K list
- Million-item compression demo
- Photo masonry grid
- Data table with sort + selection

One-liner: *"See it live in your framework without installing."*

### Comparison table — factual, not gladiatorial

| Library | Core (gz) | Memory @1M | A11y built-in | Grid / Masonry / Table | Vue | Svelte | Solid | Vanilla |
|---------|-----------|------------|---------------|-----------------------|-----|--------|-------|---------|
| **vlist** | 10.6 KB | ~0.1 MB | WAI-ARIA + keyboard | All | 0.6 KB | 0.5 KB | 0.5 KB | Native |
| TanStack Virtual | ~3.5 KB | Higher | None (DIY) | Grid only | Yes | Yes | Yes | Yes |
| vue-virtual-scroller | ~11.8 KB | — | None | None | Yes | — | — | — |
| virtua | ~3 KB | — | Minimal | Grid only | Yes | Yes | Yes | — |
| react-window | ~6 KB | Higher | None | Grid only | — | — | — | — |
| react-virtuoso | ~24 KB* | — | Partial | Grid / Table | — | — | — | — |

\* No tree-shaking — full bundle always shipped.

The accessibility column is the moat. The framework spread is the breadth claim. Link to reproducible benchmarks below the table; don't editorialize against any competitor in the surrounding copy.

### Accessibility showcase — `/accessibility` page

This is vlist's strongest unique claim. Make it visible:
- Screen-reader demo video (VoiceOver navigating a masonry grid)
- Keyboard navigation demo (2D arrows across grid/masonry)
- Side-by-side a11y audit scores: vlist vs. competitors (let the numbers speak)
- A short technical explainer of *why* a11y must be in the library, not bolted on

### Pre-drafted HN comments — write before launch, not during

Show HN success is often determined by the OP's first three or four comments, not the post. Have these ready in a notes file so you can post within the first hour:

1. **Headless vs. batteries.** Why we control the DOM (a11y, focus management, screen-reader DOM ordering, element pooling) and why headless approaches force users to ship inaccessible lists.
2. **Benchmark methodology.** Test rig, what's measured, link to reproducible repo.
3. **A11y deep-dive.** Why ARIA roles, live regions, and DOM reordering can't be DIY'd reliably.
4. **What we're not great at yet.** A genuine self-deprecating note about current limitations. Earns HN trust faster than any feature pitch.

---

## Phase 2 — Public Launch (Weeks 1–3)

### Week 1 — Warmup before HN

- Soft-launch on r/vuejs and r/sveltejs first. Goal: 50+ organic stars before HN submission.
- Run X presence (the pinned post is already doing work; add 2–3 standalone posts during the week).
- Coordinate the network: when you do submit to HN, you want stars clustered in a 24-hour window. Sustained dribble doesn't trend; concentrated spikes do.

### Hacker News — Show HN

- **Title:** `Show HN: vlist – Accessible virtual list with grid, masonry, table for every framework`
- **Timing:** Tuesday or Wednesday, 9–10am US Eastern. Avoid Mondays (overflow from weekend) and Fridays (low evening readership).
- **Threshold:** Don't submit until 50+ organic stars from Reddit and X warmup.
- **Body:** Lead with the technical bet — why batteries-included, why a11y as foundation. Link `/benchmarks`. Don't disparage competitors by name; let the comparison table do that work passively when readers explore.
- **First hour:** Post the four pre-drafted comments. Reply to every top-level comment within 30 minutes for the first two hours. Speed of response is signal.

### Reddit — framework-specific subs, in this order

1. **r/vuejs** — "I built a virtual list with grid, masonry, and table for Vue (10.6 KB, zero deps, fully accessible)"
2. **r/sveltejs** — "Virtual list with masonry, table, async, and built-in a11y for Svelte"
3. **r/solidjs** — "Full-featured virtual list for Solid — grid, masonry, selection, 1M items"
4. **r/javascript** / **r/webdev** — broader audience, lead with framework-agnostic angle
5. **r/reactjs** — post last, frame as "also works with React" rather than "built for React"

Tone notes for all subreddit posts:
- Open with what you built, not why others fall short
- Include screenshot of memory benchmark + link to `/benchmarks`
- Be present in comments for the first 4 hours; respond to every question
- Never argue with critical commenters — concede where they're right, clarify where they're wrong, move on

### X — launch day thread + ongoing standalone posts

The plan v2 conflated threads (single-day connected sequence) with weekly campaigns (standalone posts). They're different formats. Do both:

**Launch day: one connected thread, 5–6 tweets in one sitting**
1. Hook: every virtual list library skips a11y. vlist makes it the foundation.
2. Specs: 1M rows at 120fps, 10.6 KB, every framework
3. Memory benchmark screenshot
4. Architecture: why we control the DOM
5. Live demo links (framework tabs)
6. Call to action: vlist.io

**Following 2–3 weeks: standalone posts**, each independently quotable:
- Memory benchmark deep-dive (with chart)
- Screen-reader masonry navigation video
- "Why we didn't go headless" — link to blog post
- Framework spotlights as integration demos ship
- Real-world usage stories from first adopters

**Don't tag competitor authors** (Tanner Linsley, the virtua author, etc.). The OSS community is small and remembers. If you want to engage them, lead with a genuine compliment first ("virtua's headless approach is great for X — vlist takes a different bet because Y"). Otherwise let benchmarks speak silently.

### Short videos / GIFs

Three clips under 15 seconds each:
1. Scrolling 1M items smoothly
2. Memory profiler showing a flat line at 1M
3. **Screen reader navigating a masonry grid with keyboard** — the clip nobody else can make

Each clip works as a standalone post asset, embedded blog visual, and demo on the homepage.

---

## Phase 3 — Build Momentum (Months 1–2)

### Component library integration partnerships — biggest organic lever

Five targets. A single landing PR is worth more than five HN posts because it puts vlist permanently in another library's stack:

1. **PrimeVue** — already has a virtual scroller; propose vlist as alternative engine for grid/table cases
2. **Vuetify** — open issue requesting better virtual list integration in v-data-table
3. **Naive UI** — virtualization needs in their data table
4. **Carbon (IBM)** — design system with strong a11y values; vlist's pitch aligns perfectly
5. **shadcn-svelte** — emerging ecosystem, low integration friction, good fit

Approach: file a polite issue offering to integrate, prototype in a fork, send a clean PR. Don't push if maintainers aren't interested — move to the next.

### Blog posts — teach, don't sell

Developers share posts that teach. Each post should stand on its own as useful even if vlist didn't exist; vlist is just the worked example.

1. *"The state of virtual lists in Vue (and where the gaps are)"* — survey post, vlist mentioned as one option among several
2. *"Building an accessible virtual masonry grid in Svelte"* — tutorial format
3. *"Why your virtual list is inaccessible (and how to fix it)"* — broadest reach, framework-agnostic
4. *"Rendering 1M rows with constant memory: an architecture deep-dive"* — for the HN/r/programming crowd
5. *"Why we didn't go headless"* — contrarian piece, generates discussion

Publish on dev.to, Hashnode, or own blog. Cross-post selectively; never plagiarize yourself across two sites without canonical tags.

### Real-world demo apps

Frame each demo so visitors pattern-match to their own use case:
- **Vue:** Data table with sorting and column resize
- **Svelte:** Photo masonry grid with selection
- **Solid:** Chat / messaging with reverse scroll and async loading
- **Vanilla:** Log viewer (1M lines)
- **Vanilla:** File browser with groups and keyboard navigation

### Ecosystem presence

- **Awesome lists:** awesome-vue, awesome-svelte, awesome-solidjs, awesome-typescript, awesome-web-perf, awesome-a11y. Skip awesome-react until vlist has React traction — no point in being lost in a saturated list.
- **Newsletters:** JavaScript Weekly, Frontend Focus, Vue.js News, Svelte Society Newsletter, Bytes. All accept submissions; the framework-specific ones convert best for vlist's stage.
- **Stack Overflow / GitHub Discussions / Reddit:** answer questions about virtual scrolling in Vue/Svelte/Solid with helpful, complete answers that mention vlist where genuinely relevant.

### Video

Record a 2–3 minute walkthrough showing vlist in Vue or Svelte (not React). YouTube content gets discovered long after posting, especially for "how to build virtual list in [framework]" search intent. A factual "vlist vs. vue-virtual-scroller" comparison video — fair, reproducible, no editorialized digs — also has long tail.

### Community & feedback

- GitHub issue templates: feature request, bug report, "who's using it?" (low-friction adoption tracker)
- Offer to help early adopters integrate. Testimonials from named Vue/Svelte/Solid users are gold.
- Track GitHub traffic + Plausible on vlist.io. Double down on whatever channel is converting best by month 2.

---

## Phase 4 — Headless Computation Layer (Months 2–3)

### Ship `vlist/core`

Extract the pure computation engine as a DOM-free export:
- Range calculation and viewport math
- Size cache with prefix-sum lookups
- Scroll compression
- Velocity tracking

Use cases: Canvas renderers, WebGL, custom design systems, SSR, mobile-native bridges.

Tagline: *"Accessible by default. Headless if you need it."*

### Why this comes after launch

The batteries-included library is what wins non-React framework users — they want components, not hooks. `vlist/core` is for the long tail of power users who discover vlist and want just the math. Shipping it too early dilutes the message; shipping it once demand is real makes it feel earned.

---

## Ongoing — be the answer

The single biggest organic growth driver: **be the first and best result for framework-specific virtual list questions.** When someone on Stack Overflow, Reddit, or X asks "how to render a virtual list in Svelte" or "Vue virtual scroll with masonry," a helpful answer with a working demo link does more than any launch campaign.

Target search intents:
- "vue virtual list"
- "svelte virtual scroll"
- "solid virtual list"
- "accessible virtual list"
- "virtual list masonry"
- "react alternative to TanStack Virtual" (long tail, but valuable)

---

## Risks and watch-outs

- **Brand consistency drift.** As contributors join and posts multiply, the pitch and size claims will drift. Audit every public surface monthly. One source of truth.
- **Launch failure modes.** If HN or a flagship Reddit post flops, do NOT repost or angle-shift within 30 days — looks desperate and trains the algorithm to suppress. Wait, gather new evidence (testimonials, stars, integrations), try a new angle.
- **Tone in comments.** Never disparage competitors by name. Compliment when honest. The OSS community is small and remembers.
- **Maintenance load.** 621 commits in 88 days is unsustainable indefinitely. Define a maintenance rhythm (e.g., one release week per month with no new features, just bugs/issues) before launch acceleration creates issue volume you can't service.
- **Single-maintainer bus factor.** Recruit one or two contributors before vlist gets meaningfully popular — adoption brings issues, and being unresponsive kills momentum faster than any technical flaw.

---

## Quick priority order

1. **Audit & align** — fix size inconsistencies, propagate brand pitch everywhere — Day 1
2. **Polish** — homepage rewrite, framework demos, `/accessibility` page — Days 2–7
3. **Warmup** — Reddit Vue/Svelte first, X presence, network stars — Week 1
4. **Launch** — HN Show HN with 4 pre-drafted comments, Tue/Wed morning, only after 50+ stars — Week 2
5. **Sustain** — blog content, awesome lists, newsletters — Weeks 3–8
6. **Partner** — integration PRs with PrimeVue, Vuetify, Naive UI, Carbon, shadcn-svelte — Months 2–3
7. **Expand** — ship `vlist/core` headless layer once demand emerges — Months 2–3
