---
created: 2026-04-16
updated: 2026-04-20
status: draft
---

# vlist Roadmap

## Strategic positioning

vlist targets developers who don't use React. The React virtual list space is saturated (TanStack Virtual, react-window, react-virtuoso, virtua). Non-React frameworks — Vue, Svelte, Solid, vanilla JS — are genuinely underserved. vlist's vanilla-first architecture with thin framework adapters makes it the natural choice for these audiences.

---

## 1. Expose a headless computation layer (`vlist/core`)

**Priority:** High
**Status:** Planned

Extract the pure computation engine as a separate, DOM-free export:

- Range calculation and viewport math
- Size cache with prefix-sum lookups
- Scroll compression for 1M+ items
- Velocity tracking
- Overscan logic

This gives advanced users (custom renderers, Canvas-based lists, design system integrations) access to the math without the DOM, while keeping the full batteries-included library as the default.

### What this is NOT

This is not a shift to headless-first. The full library with DOM management, element pooling, and accessibility remains the primary API. `vlist/core` is an escape hatch, not the main path.

### Why

- Non-React users prefer batteries-included components over headless primitives
- vlist's DOM layer is what makes the accessibility work (ARIA roles, live regions, focus management, DOM reordering for screen readers)
- Going headless-first would mean giving up the biggest differentiator to copy an architecture designed for an audience we're not targeting
- A dual offering — "accessible by default, headless if you need it" — is a stronger pitch than picking one side

---

## 2. Lead with non-React frameworks

**Priority:** High
**Status:** Ongoing

### Documentation and examples

- Ensure every example has Vue, Svelte, Solid, and vanilla JS versions — not just React
- Lead with vanilla JS in docs; show framework adapters as secondary
- Highlight the competitive vacuum: vue-virtual-scroller has 195 open issues and no grid/masonry/table; Svelte and Solid have nothing comparable

### Framework adapter quality

- Vue: slots-based API, idiomatic composition
- Svelte: component API with Svelte 5 runes support
- Solid: signals-compatible adapter
- Vanilla: zero-framework path with full feature access

### Positioning

React support stays — but marketing, docs, and examples lead with the frameworks where vlist is the only serious option.

---

## 3. Double down on accessibility as a differentiator

**Priority:** High
**Status:** Partially complete

vlist is the only virtual list library with comprehensive WAI-ARIA support. This matters increasingly as accessibility becomes a legal requirement (EU Accessibility Act, ADA enforcement).

### Current strengths to promote

- WAI-ARIA grid pattern with 2D keyboard navigation
- Masonry lane-aware navigation (unique to vlist)
- Focus recovery on item removal
- Screen-reader-friendly DOM reordering on scroll idle
- ARIA live region for async loading announcements

### Remaining work

- Accessibility conformance testing with automated tools (axe-core, WAVE)
- Screen reader testing matrix (NVDA, JAWS, VoiceOver) with documented results
- Publish an accessibility statement on vlist.io

---

## 4. Competitive benchmarks

**Priority:** Medium
**Status:** In progress (9 competitors benchmarked)

### Current benchmark suite

Automated benchmarks against TanStack Virtual, react-window, react-virtuoso, virtua, vue-virtual-scroller, Solid, Clusterize, legend-list.

### Next steps

- Publish benchmark results on vlist.io with reproducible methodology
- Add memory profiling comparisons (vlist's constant ~0.1 MB overhead vs. competitors)
- Add accessibility audit comparisons (automated a11y scores per library)
- Keep benchmarks updated as competitors release new versions

---

## 5. Forward response cursor to AdapterParams

**Priority:** Medium
**Status:** Done

`AdapterResponse.cursor` is now forwarded back to `AdapterParams.cursor` on the next sequential request. The data manager tracks `cursorValidForOffset` — the exact offset at which the stored cursor is valid. The cursor is only passed when `chunk.start === cursorValidForOffset`; any non-sequential request (jump, random access) receives `cursor: undefined`. The cursor and its validity offset are cleared on `reload`, `reset`, and `clear`.

---

## 6. Production readiness and trust

**Priority:** Medium
**Status:** Ongoing

The biggest gap is adoption and trust. Technical superiority alone doesn't win.

### Actions

- Publish real-world case studies as early adopters emerge
- Maintain changelog and semantic versioning rigorously
- Keep test coverage above 90% (currently 94%)
- Document stability guarantees and breaking change policy
- Consider submitting to framework-specific "awesome" lists and ecosystem directories
