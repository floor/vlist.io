---
id: "010"
title: Table plugin allocates array and object per render frame
severity: medium
status: fixed
component: plugins/table
related: ["RFC-003 §3"]
---

# Issue 010: Table plugin allocates array and object per render frame

---

## Symptom

Every table render frame allocates a new `rangeItems` array and a new `range` object, creating GC pressure during scrolling.

## Root Cause

`table/plugin.ts:tableRenderIfNeeded()` declared both inside the function body:

```typescript
const rangeItems: T[] = [];
for (let i = renderStart; i <= renderEnd; i++) {
  const item = storedCtx.getItem(i);
  if (item) rangeItems.push(item);
}

const range = { start: renderStart, end: renderEnd };
tableRenderer.render(rangeItems, range, selectedIds, focusedIndex);
```

Both `rangeItems` and `range` are freshly allocated on every call.

## Fix

Hoist both to the plugin closure scope (above `tableRenderIfNeeded`):

```typescript
const rangeItems: T[] = [];
const range = { start: 0, end: 0 };
```

Inside the render function, clear and refill the persistent array, and mutate the persistent object in place:

```typescript
rangeItems.length = 0;
for (let i = renderStart; i <= renderEnd; i++) { ... }

range.start = renderStart;
range.end = renderEnd;
tableRenderer.render(rangeItems, range, selectedIds, focusedIndex);
```

Zero per-frame allocations. The renderer receives the same object references each frame.

## Status

**Fixed** — `plugins/table/plugin.ts`
