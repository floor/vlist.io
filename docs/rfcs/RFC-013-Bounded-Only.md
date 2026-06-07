---
created: 2026-06-07
updated: 2026-06-07
status: draft
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
- All plugins — they just lose their native-scroll branches

### Simplified

- **Plugin contract**: one scroll model, no branching
- **Scrollbar plugin**: one mode
- **Test matrix**: no mode doubling
- **Developer experience**: no mode choice, no migration cliff
- **Configuration**: one less concept to learn

---

## What you lose

Be explicit about the tradeoffs:

1. **Native scrollbar disappears.** Every list gets a virtual scrollbar (or no visible scrollbar if the plugin isn't used). Users who want the OS-native scrollbar appearance lose it. The `scrollbar()` plugin can be styled to match, but it's CSS, not native.

2. **DevTools `scrollTop` is not the real position.** Inspecting the element in DevTools shows a bounded `scrollTop` (within the runway), not the logical position. Debugging requires the vlist DevTools helper or `getScrollPosition()`.

3. **`IntersectionObserver` on content children.** Code that attaches `IntersectionObserver` to the content div and expects physical scroll height to reflect total items will break. This is already broken by virtualization in general.

4. **Third-party scroll libraries.** Libraries that hook into `scrollTop`/`scrollHeight` (custom scrollbar libraries, scroll-spy, etc.) won't work with the bounded content. This is the same limitation the scale plugin had.

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

This is a minor breaking change (pre-1.0). The `scroll.mode` option is removed. Code that explicitly sets `mode: "bounded"` gets a config warning for one minor cycle, then the option is removed.

---

## Implementation

This is a simplification, not a new feature. The bounded path already exists and is proven (RFC-012 Phase 0-3). The work is deletion:

1. Remove `scroll.mode` from config types and validation.
2. Remove the native scroll path from `src/core/scroll.ts` and `src/core/create.ts`.
3. Remove native-path branches from the scrollbar plugin.
4. Remove dual-mode tests (keep bounded tests, delete native-only tests that duplicate them).
5. Update docs: remove "bounded" as an opt-in concept — it's just how vlist scrolls.

Estimated diff: net negative lines.

---

## Open questions

1. **Should `runwayFactor` be configurable or fixed?** Default of 2 works well. Exposing it adds a knob most users won't need. Could be removed from public config and kept as an internal constant.

2. **Page mode:** RFC-012 committed to a bounded page-mode approach. With bounded-only, page mode has no fallback to native document scroll. The bounded page-mode proxy (from RFC-012 Phase 2) becomes the only implementation — verify it handles all page-mode use cases.

3. **Timing:** Should this land as part of the RFC-012 Phase 3b cleanup, or as a separate release? Landing it now while the refactor context is fresh minimizes churn.

---

## References

- RFC-012: Logical Scroll Model — introduced bounded as opt-in
- RFC-012 compression removal: `scratchpad/RFC-012-Logical-Scroll-Model/rfc-012-compression-removal.md`
- Bounded scroll implementation: `src/core/bounded-scroll.ts`, `src/core/scroll-model.ts`
- Scale plugin removal: commit `5a90a36`
- Bundle sizes: base 9.4 KB, bounded adds ~1.1 KB (already in core)
