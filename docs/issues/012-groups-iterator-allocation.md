---
id: "012"
title: Groups plugin allocates iterator on hot path
severity: low
status: fixed
component: plugins/groups
related: ["RFC-003 §3", "006"]
---

# Issue 012: Groups plugin allocates iterator on hot path

---

## Symptom

The groups plugin uses `for...of` to iterate a `Map<number, HTMLElement>` during the render cycle, which allocates a `MapIterator` object per frame.

## Root Cause

Same pattern as Issue 006 (grid plugin). `groups/plugin.ts:~130` used:

```typescript
for (const [idx, element] of rendered) {
  // release logic
}
```

`for...of` on a `Map` creates a `MapIterator` object each invocation.

## Fix

Replace with `.forEach()` to match the zero-allocation pattern used in `core/pipeline.ts`:

```typescript
rendered.forEach((element, idx) => {
  // release logic
});
```

## Status

**Fixed** — `plugins/groups/plugin.ts`
