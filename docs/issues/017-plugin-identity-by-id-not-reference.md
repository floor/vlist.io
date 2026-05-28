---
id: "017"
title: Grid and masonry plugins track identity by id, not item reference
severity: medium
status: open
component: plugins/grid, plugins/masonry
related: ["004", "RFC-002"]
---

# Issue 017: Grid and masonry plugins track identity by id, not item reference

---

## Symptom

Replacing an item with a new object that has the same `id` does not re-render in grid or masonry layouts. The default list pipeline (issue 004, now fixed) uses `_lastItem` reference equality, but the plugin renderers still compare by `item.id`.

```typescript
items[idx] = { ...items[idx], title: "updated" };
list.setItems(items);
// Default list: re-renders (reference changed) ✓
// Grid/masonry: skipped (same id)              ✗
```

## Root Cause

**Grid** — `grid/plugin.ts:177` compares `tracked.lastId !== item.id`. The `TrackedElement` interface stores `lastId: string | number` rather than a reference to the item object.

**Masonry** — `masonry/renderer.ts:400` compares `existing.lastItemId !== item.id`. Same pattern — id comparison instead of reference equality.

## Impact

RFC-002 guarantees that identity is determined by object reference, not by id. The guarantee holds for the default list path but breaks for grid and masonry layouts. Users who mutate items by creating new objects with the same id will see stale DOM in grid/masonry mode.

## Suggested Fix

Change both plugin renderers to store the item reference (`lastItem`) and compare with `!==` instead of comparing the id field. Same approach as the core pipeline fix in issue 004.

Grid: `TrackedElement.lastId` → `TrackedElement.lastItem`, compare `tracked.lastItem !== item`.
Masonry: `lastItemId` → `lastItem`, compare `existing.lastItem !== item`.
