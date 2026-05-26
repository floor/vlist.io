---
id: "015"
title: Transition insert animation invisible when groups plugin is active
severity: high
status: resolved
component: groups, transition
related: []
---

# Issue 015: Transition insert animation invisible when groups plugin is active

---

## Symptom

When both the `groups` and `transition` plugins are active (e.g. the messaging example with `reverse: true`), inserting an item produced no visible scaleY animation. The new item appeared by sliding up from below the viewport instead of growing in-place. The animation worked correctly without the groups plugin.

## Root cause

Three independent bugs compounded:

### 1. Groups layout never rebuilt after insert

The groups plugin built its layout once during `setup()` and never updated it when items were inserted or removed. After `insertItem`, `layout.totalEntries` stayed frozen at the original value (e.g. 5142 for 5000 items + 142 headers) while the data array grew. The render pipeline used stale layout entries, causing offset mismatches and preventing the new element from being correctly positioned.

**Fix:** Added `syncLayoutIfNeeded()` at the top of `groupsRenderIfNeeded()`. It compares `getItems().length` against a cached `lastDataCount` and calls `layout.rebuild()` + `sizeCache.rebuild(layout.totalEntries)` when they differ. The check is O(1) on the hot path (scroll frames where nothing changed).

### 2. Initial sizeCache built with wrong entry count

During setup, `ctx.setSizeConfig(groupedSizeFn)` internally calls `createSizeCache(fn, state.totalItems)`, which builds prefix sums for `state.totalItems` entries (the raw data count, e.g. 5000). But the grouped sizeFn expects layout indices (data items + group headers, e.g. 5142). The last ~142 layout entries had no prefix sums, so their offsets all collapsed to the same value. On the first insert, the scroll delta jumped by thousands of pixels instead of one item height.

**Fix:** Added `sizeCache.rebuild(layout.totalEntries)` immediately after `ctx.setSizeConfig(groupedSizeFn)` to rebuild with the correct count.

### 3. `getRenderedElement` returned null with groups plugin

The transition plugin calls `ctx.getRenderedElement(layoutIndex)` to find the newly inserted DOM element and start the WAAPI animation. But `getRenderedElement` reads from `create.ts`'s internal `rendered` map, which is empty when the groups plugin is active — the groups plugin renders into its own local `rendered` map via a custom render pipeline (`setRenderFn`).

**Fix:** The groups plugin registers a `_getRenderedElement` method that reads from its own `rendered` map. `getRenderedElement` in `create.ts` checks for this override before falling back to the default map.

### 4. Stale `state.scrollPosition` after reverse scroll bump

Even after fixes 1–3, the scaleY animation was technically running but visually invisible. The transition plugin's `insertItem` bumps `dom.viewport.scrollTop` to `maxScroll` for reverse mode, but did not update `state.scrollPosition`. When the caller subsequently called `scrollToIndex({ behavior: "smooth" })`, `smoothScrollTo` read `from = state.scrollPosition` (the stale pre-bump value) and animated a 61px scroll over 300ms. This smooth scroll slide overwhelmed the 200ms scaleY animation — the user saw the message entering from below, not growing in-place.

**Fix:** After the reverse scroll bump, sync `state.scrollPosition` (and `state.prevScrollPosition`) to match the actual DOM scroll position. `smoothScrollTo` then sees `|target - from| < 1` and skips the redundant animation.

## Files changed

| File | Change |
|------|--------|
| `src/plugins/groups/plugin.ts` | Added `syncLayoutIfNeeded()`, `sizeCache.rebuild(layout.totalEntries)` after `setSizeConfig`, registered `_getRenderedElement` method |
| `src/plugins/transition/plugin.ts` | Sync `state.scrollPosition` after reverse scroll bump |
| `src/core/create.ts` | `getRenderedElement` checks for `_getRenderedElement` override before default map |

## Verification

A Puppeteer debug script (`vlist.io/scripts/debug/tests/transition-messaging.mjs`) confirms:

- `scaleY(0) → scaleY(1)` WAAPI animation runs on the inserted element
- `atBottom: true` after insert — no stale scroll position
- Scroll delta is an instant 61px bump, not a smooth animation
- No competing translateY slide from `scrollToIndex`

## Status

**Resolved** — all four bugs fixed.
