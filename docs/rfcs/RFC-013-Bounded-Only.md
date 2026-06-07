---
created: 2026-06-07
updated: 2026-06-07
status: draft
reviewers: GPT-5.5, Opus 4.8, Gemini 3.1, Opus 4.6 (CTO)
---

# RFC-013: Bounded-Only Scroll

**Status:** Draft
**Author:** floor
**Type:** Core Architecture
**Created:** 2026-06-07
**Depends on:** RFC-012 (Logical Scroll Model)

---

## Summary

Remove the native scroll path. Make bounded logical scroll the only scroll model in vlist. The `scroll: { mode: "bounded" }` option disappears — bounded is how vlist works.

```
Before:  createVList({ scroll: { mode: "bounded" } })   // opt-in
After:   createVList({})                                  // just works
```

---

## Motivation

RFC-012 eliminated the compression dual-path (515 references across 24 files). But it introduced a new dual-path: native scroll vs bounded scroll. Every plugin must handle both. Every test matrix doubles.

### The dual-path problem, again

The native scroll path sizes `vlist-content` to `totalItems × itemSize`. The bounded path sizes it to `viewport × runwayFactor`. Two content models, two scroll contracts, two code paths through the render pipeline.

| Concern | Native path | Bounded path |
|---------|-------------|--------------|
| Content height | `totalItems × itemSize` | `viewport × runwayFactor` |
| Scroll position | Raw `scrollTop` pixel offset | Logical `{ index, offsetPx }` via `ScrollAdapter` |
| Scrollbar | Native (small lists) or virtual (large) | Always virtual |
| Item limit | ~349,525 items at 48px before 16.7M cap | Unlimited |
| Plugin contract | Pixel-based `engineState.scrollPosition` | `ScrollAdapter` |

Plugins must handle both contracts. The render pipeline branches on the mode. Tests run twice. This is the same structural problem RFC-012 solved for compression — one layer up.

### Bounded already works for small lists

The bounded scroll model is not a "large list" feature. It works identically for 10 items:

- Content is `viewport × runwayFactor` or `totalItems × itemSize`, whichever is smaller (already capped in the implementation)
- For a 10-item list at 48px each (480px total), the content is 480px — smaller than the runway. Native behavior is preserved naturally.
- Scroll physics come from the browser's native scroll on the bounded window. No reimplementation.

There is no list size where native scroll is *required*.

### The "you should have used bounded" migration

Today, a developer starts with a small list using the default native mode. The list grows. At some point it hits browser limits or needs virtual scrollbar features. The developer must then add `scroll: { mode: "bounded" }`, which may change scroll behavior, scrollbar appearance, and plugin interactions. This is a migration that should never happen — the library should handle any list size from the start.

---

## Design

### Remove the mode option

```ts
// Before (RFC-012)
createVList({
  scroll: { mode: "bounded", runwayFactor: 2 }
})

// After (RFC-013)
createVList({})
// runwayFactor is still configurable if needed:
createVList({ scroll: { runwayFactor: 2 } })
```

`scroll.mode` is removed from `CreateVListConfig`. The bounded scroll model is the only implementation. `runwayFactor` remains configurable (default: 2).

### One scroll contract

`ScrollAdapter` becomes the only way plugins access scroll state. No fallback to raw `engineState.scrollPosition` pixel values.

```ts
// The only scroll contract
interface ScrollAdapter {
  getLogical(): { index: number; offsetPx: number }
  setLogical(pos: { index: number; offsetPx: number }, opts?: ScrollOptions): void
  getPixelEquivalent(): number
  scrollByPx(delta: number): void
}
```

### One scrollbar model

All scrollbars are virtual. The native scrollbar path is removed. The `scrollbar()` plugin has one mode, not two.

### Content sizing

The content element is always sized to `min(totalItems × itemSize, viewport × runwayFactor)`. For small lists where total content fits in the viewport, this is just the total content size — no rebasing occurs, scroll behavior is indistinguishable from native.

### Small-list fast path

When `totalItems × itemSize <= containerSize` (all items fit in the viewport), no scroll machinery is needed at all. This is already true today and remains true — it's an optimization, not a mode.

---

## What changes

### Removed

| Component | Today | After |
|-----------|-------|-------|
| `scroll.mode` config option | `"native"` (default) or `"bounded"` | Removed — bounded is the default and only mode |
| Native scroll path in core | Sizes content to `totalItems × itemSize`, reads raw `scrollTop` | Removed |
| Native scrollbar fallback | Scrollbar plugin has native + virtual modes | Virtual only |
| Dual-path plugin handling | Plugins check scroll mode to choose contract | One contract (`ScrollAdapter`) |

### Stays the same

- Bounded scroll implementation (already done in RFC-012)
- `ScrollAdapter` interface
- `overflow-anchor: none` on content
- Virtual scrollbar
- Public API (`scrollToIndex`, `getScrollPosition` returns pixel equivalents)
- Plugins that already route through core's content sizing (default list, autosize, groups, snapshots, a11y, selection, transition, sortable)

### Must be built first

Grid, table, and masonry install `setRenderFn()`, which makes core skip `syncContentSize()`. They write absolute transforms and full content sizes directly, bypassing the bounded runway. These renderers must be updated to subtract `baseOffset` and cap content to the runway before the native path can be removed. See RFC-012 review P1 #2.

### Simplified

- **Plugin contract**: one scroll model, no branching
- **Scrollbar plugin**: one mode
- **Test matrix**: no mode doubling
- **Developer experience**: no mode choice, no migration cliff
- **Configuration**: one less concept to learn

---

## What you lose

### Native scrollbar disappears — a positioning decision

This is the most consequential tradeoff and deserves explicit discussion, not a footnote.

Under bounded-only, every vlist instance uses a virtual scrollbar. Users who want the OS-native scrollbar appearance lose it. The `scrollbar()` plugin can be styled to match, but it's CSS, not native.

vlist targets non-React developers who expect platform-native behavior. Losing the OS-native scrollbar for every list — not just large ones — is a UX and marketing decision. It affects:
- Accessibility: screen readers and AT interact differently with custom scrollbars
- Platform consistency: macOS overlay scrollbars, Windows always-visible scrollbars, mobile overscroll indicators
- User trust: custom scrollbars can feel "off" to users who notice them

This tradeoff is acceptable if the virtual scrollbar is good enough to be invisible. It must be tested and refined before this RFC ships.

### Other tradeoffs

1. **DevTools `scrollTop` is not the real position.** Inspecting the element in DevTools shows a bounded `scrollTop` (within the runway), not the logical position. Debugging requires the vlist DevTools helper or `getScrollPosition()`.

2. **`IntersectionObserver` on content children.** Code that attaches `IntersectionObserver` to the content div and expects physical scroll height to reflect total items will break. This is already broken by virtualization in general.

3. **Third-party scroll libraries.** Libraries that hook into `scrollTop`/`scrollHeight` (custom scrollbar libraries, scroll-spy, etc.) won't work with the bounded content. This is the same limitation the scale plugin had.

---

## Performance impact

| Metric | Native path | Bounded-only |
|--------|-------------|--------------|
| Base bundle | 9.4 KB (bounded code included but native path also present) | Smaller — native path removed |
| Content layout | Up to 16.7M px for large lists | Always viewport-sized runway |
| Scroll precision | Degrades at large offsets | Always near origin |
| Plugin code | Dual-path branches | Single path |
| Test surface | 2× (both modes) | 1× |

---

## Migration

### For vlist users

- Remove `scroll: { mode: "bounded" }` from config — it's now the default and only mode.
- If using `scale()` (already deprecated in RFC-012), remove it entirely.
- If relying on native scrollbar appearance, add and style the `scrollbar()` plugin.

### For plugin authors

- Remove any `scroll.mode` checks.
- Use `ScrollAdapter` exclusively — no raw `scrollTop` reads for scroll position.
- Cross-axis scroll (horizontal table overflow) remains native and unaffected.

### Semver

This is a major breaking change. vlist is at 2.3.0 — this ships as **vlist 3.0**.

Breaking changes:
- `scroll.mode` option removed
- `scale()` plugin removed (deprecated in RFC-012, deleted here)
- Native scrollbar path removed — `scrollbar()` plugin becomes required for visible scrollbars
- `getScrollPosition()` on carousel returns raw logical position instead of lap-normalized value
- `internals.ts` exports reduced (legacy rendering modules deleted in RFC-012 Phase 3b)

Code that explicitly sets `mode: "bounded"` gets a config warning in the last 2.x release, pointing to the 3.0 migration guide.

---

## Implementation

The bounded path exists and is proven for the default list and carousel (RFC-012 Phases 0–4). But "flip the default and delete native" requires closing four gates first. The diff is net positive until those gates close, then net negative at the final flip.

### Phase A — Route all renderers through bounded (P1 #2)

Grid, table, and masonry bypass `syncContentSize()` and write full physical content sizes. Each must:
- Subtract `engineState.baseOffset` from item transforms
- Cap content size to the bounded runway
- Use `ScrollAdapter` for scroll position reads

This is the largest piece of work and the #1 blocker. Without it, bounded-only reintroduces the browser's 16.7M pixel limit for any plugin that manages its own layout.

### Phase B — Solve iOS touch momentum (P2 #6)

Under bounded-only, every list rebases — making the momentum-kill universal. Touch flings on iOS Safari and Android Chrome animate `scrollTop` natively without emitting wheel events. When `maybeRebase()` writes `scrollTop` during a fling, iOS kills the momentum.

Fix options (to be validated on device):
1. Defer rebase to scroll idle
2. Increase `BOUNDED_RUNWAY_FACTOR` for more headroom
3. Both — idle-only rebase + larger runway as safety net

This must be solved and tested on real devices before flipping the default.

### Phase C — Build bounded page-mode proxy

RFC-012 landed a guard that throws when `page()` and bounded are combined (`283b2d5`). The bounded page-mode proxy was designed (RFC-012 §Phase 2) but never implemented. Bounded-only removes the native fallback, making this proxy required.

The proxy must intercept `window` scroll events, translate them to bounded logical space, and drive the bounded handler — while preserving the document-integrated scroll feel that page mode users expect.

### Phase D — Finish `{ index, offsetPx }` core migration

RFC-013 §One scroll contract presents `ScrollAdapter.getLogical()` as the sole plugin contract. But core still runs on pixel-based `state.scrollPosition` with conversion helpers in `scroll-model.ts`. Making the adapter the only contract means completing this migration — the adapter must become the source of truth, not a wrapper around pixel state.

### Phase E — Flip and delete

Once gates A–D are closed:
1. Remove `scroll.mode` from config types and validation
2. Remove the native scroll path from `src/core/scroll.ts` and `src/core/create.ts`
3. Remove native-path branches from the scrollbar plugin
4. Remove dual-mode tests (keep bounded tests, delete native-only tests that duplicate them)
5. Update docs: remove "bounded" as an opt-in concept — it's just how vlist scrolls

This phase is net-negative lines. The total RFC is net positive until this point.

---

## Resolved questions

1. **`runwayFactor` — keep internal.** Already tuned 10→3→2 during RFC-012; exposing it invites misuse. The existing `scroll.runway` escape hatch remains for power users but is not promoted in docs.

2. **Page mode — hard gate, not open question.** The bounded page-mode proxy is an unbuilt dependency (see Phase C). It must be implemented and tested before the flip.

3. **Timing — separate 3.0, not a 2.x cleanup.** Because of Phases A–D, this isn't just deletion. Sequence: close the four gates on the RFC-012 branch, ship RFC-012 fixes as 2.x, then flip the default and ship as vlist 3.0.

---

## Committee review

| Reviewer | Verdict |
|----------|---------|
| GPT-5.5 | Approve destination, reject framing — "finish adapterizing plugins, then delete native" |
| Opus 4.8 | Approve destination, reject framing — four hard gates under-weighted |
| Gemini 3.1 | Approve — praised implementation, flagged iOS touch momentum |
| Opus 4.6 (CTO) | Approve destination, reject framing — reframed Implementation as Phases A–E |

Consensus: the goal is right, the original framing ("mostly deletion, net-negative lines") was wrong. This revision incorporates all reviewer feedback.

---

## References

- RFC-012: Logical Scroll Model — introduced bounded as opt-in
- RFC-012 implementation review: `docs/refactor/rfc-012-implementation-review.md`
- Bounded scroll implementation: `src/core/bounded-scroll.ts`, `src/core/scroll-model.ts`
- Carousel bounded wrap (Phase 4): commit `d67ff72`
- P1 fixes (resize + page guard): commit `283b2d5`
- Scale plugin removal: commit `5a90a36`
- Bundle sizes: base 9.4 KB, bounded adds ~1.1 KB (already in core)
