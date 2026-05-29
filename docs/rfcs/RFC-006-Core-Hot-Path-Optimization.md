---
created: 2026-05-28
updated: 2026-05-28
status: draft
---

# RFC-006: Core Hot-Path Optimization Pass

**Status:** Draft  
**Author:** GPT (Codex)  
**Type:** Performance / Bundle Size  
**Created:** 2026-05-28  
**Related:** RFC-002 Core Architecture, RFC-004 Core Optimization, RFC-005 Axis-Based Internal Model

## Summary

vlist v2 has reached the expected architecture and has now been validated in real applications. This RFC proposes a narrow post-release optimization pass over `src/core`, focused on small changes with measurable speed or size upside.

The proposed scope is intentionally conservative:

1. Add a contiguous-window fast path for release in `phase2Commit`.
2. Lazily initialize plugin scaffolding for no-plugin lists.
3. Replace pool cleanup via `innerHTML = ""` with `textContent = ""`.
4. Defer listener-aware event optimizations unless benchmarks show meaningful cost.

This RFC does not propose a pipeline rewrite, a new public API, or a relaxation of the RFC-002 engine guarantees.

## Background

RFC-004 explored a larger optimization program for the v2 core. Its first tier was implemented, while later tiers were shelved because there was not enough measured evidence to justify extra complexity.

Since then, v2 has matured and the implementation has stabilized. A fresh review of `src/core` found that the most promising remaining work is not another broad rewrite, but a small set of hot-path changes that preserve the current architecture.

Current observed state:

- `bun run typecheck` passes.
- `bun test` passes.
- `bun run build` passes.
- Base bundle is approximately 21.6 KB minified and 7.7 KB gzipped.
- Performance integration tests pass.

## Goals

- Reduce default-list scroll work in the core render commit path.
- Preserve the authoritative `visibleIndices` semantics from RFC-002.
- Reduce no-plugin instance setup allocations.
- Keep or reduce base bundle size.
- Accept only changes backed by tests and before/after measurements.
- Keep the implementation readable and maintainable.

## Non-Goals

- Rewriting the render pipeline.
- Replacing `RenderConfig` with tuple or positional data structures.
- Adding dense per-item visibility marks such as `Uint8Array(totalItems)`.
- Changing the public API.
- Optimizing plugin renderers in this RFC.
- Shortening validation or error strings solely for bundle size.
- Weakening identity, release, acquire, bind, or positioning semantics.

## Proposal 1: Contiguous Release Fast Path

### Problem

The default list path normally renders a contiguous range of indices. However, the current release check treats every layout the same way: it scans `visibleIndices` for each rendered element to decide whether the element should remain mounted.

That is correct, but it is unnecessarily expensive for the common default-list case:

```ts
for (const [idx, element] of rendered) {
  if (!isInVisible(newIndices, count, idx)) {
    release(idx, element);
  }
}
```

For contiguous windows this is effectively `O(rendered * visibleCount)`, where a simple range check would be enough.

### Proposed Change

Add an explicit contiguous-window release path:

```ts
const start = state.startIndex;
const end = start + state.visibleCount - 1;
const visible = idx >= start && idx <= end;
```

The fast path must only run when the visible window is known to be contiguous. Non-contiguous layouts must continue to use `visibleIndices` membership checks.

The implementation can choose one of two approaches:

1. Add an explicit internal flag such as `visibleContiguous`.
2. Detect contiguity cheaply from the produced visible indices.

The first option is clearer if layout code already knows whether it produced a contiguous range. The second option avoids adding state but must not become another hidden hot-path cost.

### Requirements

- Default list release becomes `O(rendered)`.
- Non-contiguous `visibleIndices` remain authoritative.
- Acquire, bind, position, release ordering is preserved.
- No per-frame `Set`, dense mark array, or allocation-heavy membership helper is introduced.
- Tests cover both contiguous and non-contiguous release behavior.

## Proposal 2: Lazy Plugin Scaffolding

### Problem

`createVList` currently prepares plugin-related structures even when a list has no plugins. This is not a correctness problem, but the no-plugin path is the library's most important baseline and should stay as lean as possible.

### Proposed Change

Initialize plugin maps, arrays, and hook dispatch structures lazily when `plugins.length > 0`.

The no-plugin path should either:

- avoid allocating plugin containers entirely, or
- use shared immutable empty arrays where that keeps the code simpler.

### Requirements

- No-plugin list creation allocates less.
- Plugin behavior remains unchanged.
- Hook ordering remains unchanged.
- Typecheck and full tests pass.
- Bundle size does not regress without a measured reason.

## Proposal 3: Cheaper Pool Cleanup

### Problem

`createPool.release` currently clears recycled elements with `innerHTML = ""`. That is safe, but it can route through HTML parsing behavior. The pool only needs to remove child content.

### Proposed Change

Use:

```ts
element.textContent = "";
```

instead of:

```ts
element.innerHTML = "";
```

### Requirements

- Recycled elements do not retain stale DOM content.
- HTMLElement template and lifecycle tests still pass.
- The change does not alter custom cleanup semantics.
- Performance is neutral or better.

## Deferred: Listener-Aware Event Work

The core currently computes some event payloads even when there may be no listeners. A future optimization could expose an internal listener-count or `hasListeners` check from the emitter so expensive payload work can be skipped.

This is intentionally deferred from the initial RFC scope. It should only be implemented if profiling shows that event payload construction has meaningful cost in real workloads.

If pursued, this may deserve a separate RFC.

## Measurement Plan

Each accepted change must include before/after measurements.

Required checks:

```sh
bun run typecheck
bun test
bun run build
bun test test/integration/performance.test.ts test/integration/perf-data-ops.test.ts
```

Recommended focused tests:

```sh
bun test test/core/pipeline.test.ts
bun test test/core/pool.test.ts
```

If the documentation/demo workspace is available, run the quick benchmark suite as well:

```sh
bun run bench --quick
```

The implementation PR should report:

- base minified size;
- base gzip size;
- performance test deltas;
- whether each optimization was kept, revised, or rejected.

## Implementation Order

1. Add tests for contiguous and non-contiguous release behavior.
2. Implement the release fast path.
3. Implement pool cleanup with `textContent`.
4. Implement lazy plugin scaffolding.
5. Re-run typecheck, tests, build, and performance tests.
6. Decide whether listener-aware event work needs its own RFC.

## Completion Criteria

This RFC can move from draft to implemented when:

- all accepted changes are merged;
- no public API changes are introduced;
- RFC-002 identity and lifecycle semantics remain intact;
- the full test suite passes;
- the base bundle has no unjustified size regression;
- benchmark results are neutral or better.

## Open Questions

1. Should contiguity be represented explicitly on internal engine state, or detected locally in `phase2Commit`?
2. Should no-plugin hook paths use shared empty arrays or simple null checks?
3. Should listener-aware events become RFC-007 if profiling supports the work?

## Conclusion

This RFC revives only the small, measurable part of core optimization work. The intent is to keep v2's now-stable architecture intact while shaving cost from the most common paths.
