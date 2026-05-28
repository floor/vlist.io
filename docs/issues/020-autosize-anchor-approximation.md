---
id: "020"
title: Autosize plugin uses startIndex as anchor approximation
severity: low
status: open
component: plugins/autosize
related: ["RFC-002"]
---

# Issue 020: Autosize plugin uses startIndex as anchor approximation

---

## Symptom

When the autosize plugin receives new measurements from the ResizeObserver, it uses `engineState.startIndex` as the scroll anchor. This is the first item in the rendered range (including overscan), not the first fully visible item.

## Root Cause

`autosize/plugin.ts:105`:

```typescript
const firstVisible = engineState.startIndex;
```

`startIndex` includes overscan items that are rendered but not visible. The RFC's anchor protocol specifies "first fully visible item" to prevent layout jumps when items above the viewport change size.

## Impact

Low in practice. The difference between `startIndex` and the true first-visible item is typically a few overscan items. If those items' sizes change simultaneously with visible items, the scroll position correction could be slightly off, causing a small visual jump. The error is bounded by `overscan * maxSizeDelta`.

## Suggested Fix

Compute the true first-visible index from `scrollPosition` and the size cache, or expose it on `EngineState` as a derived field. Only worth doing if users report visible anchor drift during autosize relayout.
