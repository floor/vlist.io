---
id: "004"
title: Identity binding uses data-id string, not item reference
severity: high
status: fixed
component: core/pipeline
related: ["RFC-003 §2.2", "RFC-002"]
---

# Issue 004: Identity binding uses data-id string, not item reference

---

## Symptom

Replacing an item with a new object that has the same `id` does not update the DOM. The renderer compares `data-id` attribute strings, so same-id mutations are silently ignored.

```typescript
items[idx] = { ...items[idx], title: "new title" };
list.render();
// DOM still shows old title
```

## Root Cause

`pipeline.ts:249` — the existing-element branch only re-runs the template when `data-id` changes:

```typescript
if (item !== undefined && element.getAttribute("data-id") !== String(item.id)) {
```

This misses the case where the object reference changed but `item.id` stayed the same.

## Proposed Fix

Track the last bound item reference on each rendered element (e.g. `el._lastItem = item`). Re-run the template when `previousItem !== nextItem`, regardless of id equality.

Keep the existing `data-id` comparison for placeholder replacement behavior as an additional concern.

## Fix

Added `_lastItem?: unknown` expando to rendered elements. The acquire path sets `acquired._lastItem = item`. The existing-element branch now checks `el._lastItem !== item` (reference equality) instead of comparing `data-id` strings. Placeholder transition logic (`data-id` prefix check, replacedClass) is preserved as a secondary concern — only evaluated when the id actually changes.

Tests added in `test/integration/core-coverage.test.ts`:
- "should re-render when item reference changes but id stays the same"
- "should NOT re-render when item reference is the same object"

## Status

**Fixed** — `core/pipeline.ts`
