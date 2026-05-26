---
id: "006"
title: Grid plugin allocates iterator on hot path
severity: low
status: fixed
component: plugins/grid
related: ["RFC-003 §3", "012"]
---

# Issue 006: Grid plugin allocates iterator on hot path

---

## Symptom

The grid plugin uses `for...of` to iterate `Map<number, HTMLElement>` entries during the render cycle, which allocates an iterator object per frame.

## Root Cause

`grid/plugin.ts:136-142` — node release loop:

```typescript
for (const [idx, element] of rendered) {
  if (idx < itemRange.start || idx > itemRange.end) {
    element.remove();
    pool.release(element);
    rendered.delete(idx);
  }
}
```

`grid/plugin.ts:390-392` — resize hook has the same pattern.

`for...of` on a `Map` creates a `MapIterator` object each invocation. The core `pipeline.ts` avoids this by using `.forEach()`.

## Proposed Fix

Replace `for (const [idx, element] of rendered)` with `rendered.forEach((element, idx) => { ... })` to match the zero-allocation pattern used in `pipeline.ts:138`.

## Fix

Replaced both `for (const [idx, element] of rendered)` loops (lines 136, 390) with `rendered.forEach((element, idx) => { ... })`. Matches the zero-allocation pattern in `core/pipeline.ts`. Existing grid tests pass unchanged.

## Status

**Fixed** — `plugins/grid/plugin.ts`
