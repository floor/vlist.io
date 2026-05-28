---
id: "019"
title: Module-scope release state in pipeline.ts is unsafe with multiple instances
severity: high
status: open
component: core/pipeline
related: []
---

# Issue 019: Module-scope release state in pipeline.ts is unsafe with multiple instances

---

## Symptom

Two vlist instances rendering in the same animation frame could corrupt each other's element release logic, leading to elements being incorrectly released or retained.

## Root Cause

`pipeline.ts:170-173` uses module-scope variables to avoid per-frame closure allocation:

```typescript
let _relIndices: Int32Array;
let _relCount: number;
let _relPool: ElementPool;
let _relRendered: Map<number, HTMLElement>;
```

`releaseIfNotVisible` reads these globals. If list A sets the module state and calls `rendered.forEach(releaseIfNotVisible)`, but list B sets the same module state before A's forEach completes (e.g., both triggered by the same scroll event or rAF), B's state overwrites A's.

## Impact

In practice, `rendered.forEach` is synchronous, so interleaving within a single forEach is unlikely. The real risk is two lists calling `phase2Commit` in the same frame — list A sets the globals, runs its forEach, then list B sets the globals and runs its forEach. Since forEach is synchronous and there's no async break between set-and-use, this is safe **today**.

But it's fragile. Any future change that introduces async rendering, batched commits, or a shared scheduler would silently break. The pattern also prevents the module from being safely used in worker contexts.

## Suggested Fix

Move the release state into a per-instance struct passed to `phase2Commit`, or use a local object allocated once per instance (not per frame). The allocation cost of a single small object per instance at init time is negligible.
