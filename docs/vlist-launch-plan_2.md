# vlist Launch Plan v2

**Goal:** Take vlist from hidden gem to the go-to virtual list for non-React developers.

**Strategic shift from v1:** Stop competing head-on with TanStack Virtual and react-window in the React space. Lead with the frameworks where vlist is the only serious option — Vue, Svelte, Solid, and vanilla JS. Let React adoption follow organically.

**Core pitch:**
> The virtual list library for everyone who doesn't use React. Accessible by default, batteries-included, with grid, masonry, table, and scale-to-1M — in 10.5 KB.

---

## Phase 1 — Polish & Prep (Days 1–7)

### Reframe the homepage

- Lead with **framework breadth**, not React. The hero should show vanilla JS first, with Vue/Svelte/Solid tabs alongside React — not React-first with "also works in Vue."
- Update the elevator pitch:
  > vlist is a framework-agnostic virtual list with built-in accessibility, constant ~0.1 MB memory at 1M+ items, and composable features (grid, masonry, table, async, selection). Zero dependencies. Tiny adapters for Vue, Svelte, Solid, and React.
- Add Bundlephobia badge prominently: zero deps, gzipped size, tree-shakable stats.
- Add a hero GIF or short video showing smooth 1M-item scrolling vs. janky naive rendering.
- Polish the npm README separately from GitHub — many devs discover libraries on npmjs.com.

### Live Demos — framework-specific

- Embed live demos (CodeSandbox/StackBlitz) with **framework tabs** — vanilla, Vue, Svelte, Solid, React:
  - Basic 10K list
  - Million-item compression demo
  - Photo masonry grid
- One-liner: *"See it live in your framework without installing."*

### Comparison Table — reframed

Update the table to highlight the non-React gap:

| Library | Core (gz) | Memory @1M | A11y built-in | Grid/Masonry/Table | Vue | Svelte | Solid | Vanilla |
|---------|-----------|------------|---------------|-------------------|-----|--------|-------|---------|
| **vlist** | 10.5 KB | ~0.1 MB | WAI-ARIA + keyboard | All | 0.6 KB | 0.5 KB | 0.5 KB | Native |
| TanStack Virtual | ~3.5 KB | Higher | None (DIY) | Grid only | Yes | Yes | Yes | Yes |
| vue-virtual-scroller | ~11.8 KB | — | None | None | Yes | — | — | — |
| virtua | ~3 KB | — | Minimal | Grid only | Yes | Yes | Yes | — |
| react-window | ~6 KB | Higher | None | Grid only | — | — | — | — |
| react-virtuoso | ~24 KB* | — | Partial | Grid/Table | — | — | — | — |

\* No tree-shaking — full bundle always shipped.

- Add an **accessibility column** — no competitor can match it. This is the column that wins.
- Link to reproducible benchmarks.

### Accessibility showcase

- Add a dedicated `/accessibility` page on vlist.io showing:
  - Screen reader demo video (VoiceOver navigating a masonry grid)
  - Keyboard navigation demo (2D arrow keys across grid/masonry)
  - Side-by-side: vlist vs. TanStack Virtual a11y audit scores
- This is vlist's strongest unique claim. Make it visible.

### Social Sharing

- Add pre-filled share buttons (X, Reddit, HN) on homepage and after benchmarks.
- Draft tweet: *"Every virtual list library assumes you use React. vlist doesn't — full a11y, grid, masonry, table in 10.5 KB with Vue/Svelte/Solid/vanilla adapters. Live benchmarks → vlist.io"*

---

## Phase 2 — Public Launch (Weeks 1–3)

### Hacker News

- **Title:** `Show HN: vlist – accessible virtual list for Vue/Svelte/Solid/vanilla, 10.5 KB, 1M items`
- **Body:** Link vlist.io. Lead with the problem: "If you don't use React, your virtual list options are vue-virtual-scroller (195 open issues, no grid) or rolling your own." Then show what vlist solves.
- **Timing:** Weekday morning US time. Wait until you have initial GitHub stars.
- In comments: explain the prefix-sum architecture, the a11y approach, and why batteries-included beats headless for non-React.

### Reddit — target framework-specific subs

Priority order (by underserved-ness):

1. **r/vuejs** — vue-virtual-scroller is the only option and it has 195 open issues. Title: *"I built a virtual list with grid, masonry, and table for Vue — because vue-virtual-scroller doesn't have them"*
2. **r/sveltejs** — nothing comparable exists. Title: *"Virtual list with masonry, table, and built-in a11y for Svelte — 0.5 KB adapter"*
3. **r/solidjs** — small but engaged community. Title: *"Full-featured virtual list for Solid — grid, masonry, selection, 1M items"*
4. **r/javascript** / **r/webdev** — broader audience. Lead with the framework-agnostic angle.
5. **r/reactjs** — post last, and frame it as "also works with React" not "built for React."

- Include a screenshot of the 1M memory card + link to /benchmarks.
- Be humble, answer questions fast. Speed of response in the first few hours matters.

### X / Twitter / Bluesky

- Run a thread over a week, each post targeting a different angle:
  1. **The gap:** *"Vue devs: your best virtual list option has 195 open issues. Svelte devs: you don't have one. We built vlist."* + GIF
  2. **A11y:** *"Most virtual lists ship zero accessibility. vlist has WAI-ARIA, 2D keyboard nav, focus recovery, and screen reader support built in."* + demo video
  3. **Memory:** Memory benchmark screenshot (1M delta ~0.1 MB) — *"Constant memory at any scale."*
  4. **Architecture:** *"Why we didn't go headless"* — short explanation of why DOM control enables a11y
  5. **Sandbox:** Link to framework-specific live demos
- Tag @inokawa_ (virtua author — active and friendly), Vue/Svelte/Solid community accounts.

### Short Videos / GIFs

- Create 3 clips under 15 seconds each:
  1. Scrolling 1M items smoothly
  2. Memory profiler showing a flat line at 1M items
  3. **Screen reader navigating a masonry grid with keyboard** — this is the clip nobody else can make

---

## Phase 3 — Build Momentum (Months 1–2)

### Blog Posts — framework-specific

Publish on dev.to, Medium, or your own blog. Write **separate posts per framework** — this is how you get discovered by the right audience:

1. *"The state of virtual lists in Vue — and why we built vlist"* — post to Vue community
2. *"Building an accessible virtual masonry grid in Svelte with vlist"* — tutorial format
3. *"Why your virtual list is inaccessible (and how to fix it)"* — broader a11y angle, shareable beyond any single framework
4. *"We needed to render 1M rows with constant memory — here's the architecture"* — technical deep-dive for HN/r/programming crowd

Developers share posts that teach, not posts that sell.

### Blog Post — "Why we didn't go headless"

- Explain why vlist controls the DOM: ARIA roles, live regions, focus management, DOM reordering for screen readers, element pooling
- Show what breaks when you go headless (TanStack Virtual users routinely shipping inaccessible lists)
- Announce `vlist/core` as the escape hatch for advanced users who need raw computation without DOM
- This is a contrarian take that will generate discussion — good for reach

### Real-World Demo Apps

- Add framework-specific demos to the sandbox:
  - **Vue:** Data table with sorting and column resize
  - **Svelte:** Photo masonry grid with selection
  - **Solid:** Chat/messaging with reverse scroll and async loading
  - **Vanilla:** Log viewer (1M lines)
  - **Vanilla:** File browser with groups and keyboard navigation
- These let people pattern-match to their own use case in their own framework.

### Ecosystem Presence — non-React first

- Submit to awesome lists: **awesome-vue**, **awesome-svelte**, **awesome-solidjs**, awesome-typescript, awesome-web-perf, awesome-a11y.
- Submit to newsletters: **JavaScript Weekly**, **Frontend Focus**, **Vue.js News**, **Svelte Society Newsletter** — they all accept submissions.
- Comment on recent HN/Reddit threads about virtual scrolling with a polite mention and link.
- Do NOT lead with awesome-react — that's the saturated market.

### Video

- Record a 2–3 min walkthrough showing vlist in action with code in Vue or Svelte (not React). YouTube content gets discovered long after posting.
- Consider a "vlist vs. vue-virtual-scroller" comparison video — fair, factual, reproducible.

### Community & Feedback

- Add GitHub issue templates for feature requests and "who's using it?"
- Offer to help early adopters integrate — testimonials from Vue/Svelte/Solid users are gold.
- Track analytics (GitHub traffic, Plausible on vlist.io) and double down on what gets traction.

---

## Phase 4 — Headless Computation Layer (Month 2–3)

### Ship `vlist/core`

- Extract the pure computation engine as a DOM-free export:
  - Range calculation and viewport math
  - Size cache with prefix-sum lookups
  - Scroll compression
  - Velocity tracking
- This is the escape hatch for Canvas renderers, WebGL, custom design systems, or SSR.
- Market it as: *"Accessible by default. Headless if you need it."*

### Why this comes after launch, not before

- The batteries-included library is what wins non-React users — they want components, not hooks.
- `vlist/core` is for the long tail of power users who discover vlist and want just the math.
- Shipping it too early dilutes the message. Launch with the full product, add the escape hatch once there's demand.

---

## Ongoing

The single biggest organic growth driver: **be the answer to framework-specific questions.** When someone on Stack Overflow or Reddit asks "how to render a virtual list in Svelte" or "Vue virtual scroll with masonry," a helpful answer with a working demo link does more than any launch campaign.

Focus on being the first and best result for:
- "vue virtual list"
- "svelte virtual scroll"
- "solid virtual list"
- "accessible virtual list"
- "virtual list masonry layout"

---

## Quick Priority Order

1. **Reframe** — homepage, README, demos lead with non-React + a11y
2. **Launch** — HN, Reddit (Vue/Svelte/Solid subs first), X threads
3. **Content** — framework-specific blog posts, a11y showcase, benchmarks
4. **Sustain** — videos, community engagement, iterate on analytics
5. **Expand** — ship `vlist/core` headless layer when demand emerges
