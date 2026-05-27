---
id: "005"
title: Phase 2 release assumes contiguous visible indices
severity: medium
status: fixed
component: core/pipeline
related: ["RFC-003 §2.3", "RFC-002 §3"]
---

# Issue 005: Phase 2 release assumes contiguous visible indices

---

## Symptom

The core commit path releases nodes using a simple range check. If a plugin ever produces non-contiguous `visibleIndices` (e.g. `[1, 4, 9]`), indices 2, 3, 5–8 would remain in the DOM because they fall within the `rangeStart..rangeEnd` bounds.

Currently masked because grid, masonry, and table plugins override rendering entirely.

## Root Cause

`pipeline.ts:138-144` — release logic treats `visibleIndices` as a contiguous range:

```typescript
const rangeStart = count > 0 ? newIndices[0]! : 0;
const rangeEnd = count > 0 ? newIndices[count - 1]! : -1;

rendered.forEach((element, idx) => {
  if (idx < rangeStart || idx > rangeEnd) {
    // release
  }
});
```

Any index between `rangeStart` and `rangeEnd` that is not in `visibleIndices` will be kept.

## Proposed Fix

Use a zero-allocation membership check against `visibleIndices`. Options:

1. **Generation counter** — add a `visibleGeneration` typed array to `EngineState`. Mark visible indices with the current generation in Phase 1, release any rendered node whose mark doesn't match in Phase 2.
2. **Linear scan** — since `visibleIndices` is sorted and small (typically < 100), a binary search or linear scan per rendered node is feasible.

Option 1 is preferred for O(1) per-node membership.

## Fix

Replaced the range-based release check with a linear scan via `isInVisible()`:

```typescript
function isInVisible(indices: Int32Array, count: number, idx: number): boolean {
  for (let i = 0; i < count; i++) {
    if (indices[i] === idx) return true;
  }
  return false;
}
```

The release loop now uses `!isInVisible(newIndices, count, idx)` instead of `idx < rangeStart || idx > rangeEnd`. Linear scan was chosen over binary search because `visibleIndices` may be in arbitrary order (masonry produces `[9, 1, 4]`). The buffer is small (typically < 100), so linear scan is fast and avoids sort overhead. Zero allocation — no `Set` or intermediate array needed.

The release loop also uses `rendered.forEach()` instead of `for...of` to avoid `MapIterator` allocation.

## Status

**Fixed** — `core/pipeline.ts`
