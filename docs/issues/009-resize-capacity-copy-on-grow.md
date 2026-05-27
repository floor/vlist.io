---
id: "009"
title: resizeCapacity discards buffer contents on grow
severity: high
status: fixed
component: core/state
related: ["RFC-002 §2", "RFC-003 §2.1"]
---

# Issue 009: resizeCapacity discards buffer contents on grow

---

## Symptom

When the container grows large enough to require a bigger typed array buffer, the newly allocated arrays start zeroed — all previously computed visible indices, offsets, and sizes are lost. The next Phase 2 commit reads stale zeros, causing items to flash to offset 0 or disappear for one frame.

## Root Cause

`state.ts:resizeCapacity()` allocated new typed arrays but did not copy the old contents:

```typescript
const newCapacity = needed + 8;
state.visibleIndices = new Int32Array(newCapacity);   // zeros — old data lost
state.visibleOffsets = new Float64Array(newCapacity);
state.visibleSizes = new Float64Array(newCapacity);
```

## Fix

Use `TypedArray.set()` to copy existing buffer contents into the new arrays before replacing them:

```typescript
const newIndices = new Int32Array(newCapacity);
const newOffsets = new Float64Array(newCapacity);
const newSizes = new Float64Array(newCapacity);
newIndices.set(state.visibleIndices);
newOffsets.set(state.visibleOffsets);
newSizes.set(state.visibleSizes);
state.visibleIndices = newIndices;
state.visibleOffsets = newOffsets;
state.visibleSizes = newSizes;
```

This is a cold-path operation (container resize only), so the copy cost is negligible.

## Status

**Fixed** — `core/state.ts`
