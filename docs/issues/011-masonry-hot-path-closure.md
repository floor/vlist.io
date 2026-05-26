---
id: "011"
title: Masonry plugin allocates closure per render frame
severity: medium
status: fixed
component: plugins/masonry
related: ["RFC-003 §3"]
---

# Issue 011: Masonry plugin allocates closure per render frame

---

## Symptom

Every masonry render frame creates a new `getItem` closure, allocating a function object that captures the current `items` array.

## Root Cause

`masonry/plugin.ts:masonryRenderIfNeeded()` declared both variables inside the function body:

```typescript
const items = storedCtx.getItems();
const getItem = (index: number): T | undefined => items[index];

renderer.render(getItem, visiblePlacements, selectedIds, focusedIndex);
```

The closure is structurally identical each frame — only the captured `items` reference changes.

## Fix

Hoist a persistent `cachedItems` variable and the `getItem` closure to the plugin closure scope:

```typescript
let cachedItems: readonly T[] = [];
const getItem = (index: number): T | undefined => cachedItems[index];
```

Inside the render function, update `cachedItems` before calling the renderer:

```typescript
cachedItems = storedCtx.getItems();
renderer.render(getItem, visiblePlacements, selectedIds, focusedIndex);
```

The renderer receives the same function reference every frame. The closure reads `cachedItems` by reference, which is updated in place before each call.

## Status

**Fixed** — `plugins/masonry/plugin.ts`
