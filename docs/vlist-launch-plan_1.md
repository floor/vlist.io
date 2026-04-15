# vlist Launch Plan

**Goal:** Take vlist from hidden gem to widely known in the JS ecosystem.

---

## Phase 1 — Polish & Prep (Days 1–7)

### Homepage & README

- Add Bundlephobia badge prominently: https://bundlephobia.com/package/vlist — zero deps, gzipped size, tree-shakable stats. Developers trust this signal instantly.
- Write a pinned "Why vlist" elevator pitch in the README:
  > vlist is the smallest full-featured virtual list (~8.7 KB core) with constant ~0.1–0.3 MB memory even at 1M+ items, sticky sections, grid, masonry, reverse chat, selection, async, and tiny adapters for React/Vue/Svelte — proven by live benchmarks.
- Add a hero GIF or short video showing smooth 1M-item scrolling vs. janky naive rendering. First impressions are everything.
- Polish the npm README separately from GitHub — many devs discover libraries on npmjs.com and never visit the repo.

### Live Demos

- Embed 2–3 mini live demos (CodeSandbox/StackBlitz) directly on vlist.dev below Quick Start:
  - Basic 10K list
  - Million-item compression demo
  - Chat-style reverse + selection
- One-liner above them: *"See it live without installing."*

### Comparison Table

- Add a comparison table on the homepage or a `/benchmarks` page:

| Library | Core size (gz) | Memory @1M | FPS sustained | Sticky/Grid/Selection/Async/Reverse | Framework adapters |
|---------|---------------|------------|---------------|--------------------------------------|--------------------|
| **vlist** | 8.7 KB | ~0.2 MB | 120 FPS | All | React, Vue, Svelte |
| TanStack Virtual | ~20 KB+ | Higher | — | Partial | React, Vue, Svelte, Solid |
| react-window | ~6 KB | Higher | — | None | React only |
| virtua | ~10 KB | — | — | Partial | React, Vue |

- Even qualitative notes ("best memory", "broadest layouts") are useful. Link to reproducible benchmarks.

### Social Sharing

- Add pre-filled share buttons (X, Reddit, HN) at top/bottom of homepage and after benchmark results.
- Draft tweet: *"Just found vlist: tiny virtual list (~8.7 KB) with constant memory at 1M items, 120 FPS scroll, sticky headers + grid. Live benchmarks → vlist.dev"*

---

## Phase 2 — Public Launch (Weeks 1–3)

### Hacker News

- **Title:** `Show HN: vlist – 8.7 KB virtual list, constant memory at 1M items, zero dependencies`
- **Body:** Link vlist.dev, highlight memory/FPS wins, mention zero deps + multi-framework + 2493 tests.
- **Timing:** Weekday morning US time. Wait until you have a few GitHub stars and at least one or two community signals first — an empty-looking repo kills momentum.
- Keep the HN comment factual and technical. Explain the constant-memory trick and the builder/plugin architecture.

### Reddit

- Post to r/javascript, r/webdev, r/reactjs, r/vuejs, r/sveltejs.
- Title variations: *"I built a tiny virtual list with constant memory at 1M items — benchmarks inside"*
- Include a screenshot of the 1M memory card + link to /benchmarks.
- Be humble, answer questions fast. Speed of response in the first few hours matters a lot.

### X / Twitter / Bluesky

- Run a thread over a week:
  1. Announce + GIF of smooth scroll
  2. Memory benchmark screenshot (1M delta ~0.2 MB)
  3. vs react-window comparison
  4. Link to sandbox with million items
- Tag @inokawa_ (virtua author — active and friendly). Be cautious tagging competitors like @bvaughn directly unless genuinely engaging with their work.

### Short Videos / GIFs

- Create 2 clips under 15 seconds each:
  1. Scrolling 1M items smoothly
  2. Memory profiler showing a flat line at 1M items
- Upload to X, embed in README and homepage.

---

## Phase 3 — Build Momentum (Months 1–2)

### Blog Post / Case Study

- Publish on dev.to, Medium, or your own blog.
- **Title idea:** *"We needed to render 1M rows with constant memory — here's what we built"*
- Walk through one hard architectural decision (constant memory trick, variable heights + sticky + reverse). Developers share posts that teach, not posts that sell.
- Share everywhere after publishing.

### Real-World Demo Apps

- Add to the sandbox:
  - Twitter-like feed (infinite + reverse)
  - Log viewer (1M lines)
  - Photo masonry grid
- These let people instantly pattern-match to their own use case, which generic demos don't.

### Comparison Benchmarks Repo

- Create a standalone, reproducible benchmark repo: vlist vs. TanStack Virtual vs. react-window on memory, FPS, and bundle size.
- Publish results as a blog post. Reproducible benchmarks are extremely shareable.

### Ecosystem Presence

- Submit to awesome lists: awesome-react, awesome-typescript, awesome-web-perf, awesome-virtualization.
- Submit to newsletters: JavaScript Weekly, React Status, Frontend Focus — they all accept submissions.
- Comment on recent HN/Reddit threads about virtual scrolling with a polite mention and link to vlist.dev.

### Video

- Record a 2–3 min walkthrough showing vlist in action with code. YouTube content gets discovered long after posting.

### Community & Feedback

- Add GitHub issue templates for feature requests and "who's using it?"
- Offer to help early users integrate — testimonials are gold for credibility.
- Track analytics (GitHub traffic, Plausible on vlist.dev) and double down on what gets traction (if memory stats go viral, produce more memory content).

---

## Ongoing

The single biggest organic growth driver: **be the answer to questions.** When someone on Stack Overflow, GitHub, or Reddit asks "how to render 500K rows without lag," a helpful answer with a working demo link does more than any launch campaign.

---

## Quick Priority Order

1. Site polish (badges, pitch, demos, GIFs)
2. Public announcements (HN, Reddit, X)
3. Content & community (blog, benchmarks, awesome lists)
4. Sustain (videos, engagement, iterate on analytics)
