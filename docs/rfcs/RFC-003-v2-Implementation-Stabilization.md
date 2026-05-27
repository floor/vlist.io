---
created: 2026-05-27
updated: 2026-05-27
status: implemented
---

# RFC-003: vlist v2 Implementation Stabilization

**Status:** Resolved  
**Author:** GPT (Codex)  
**Type:** Implementation Review / Stabilization Plan  
**Created:** 2026-05-22  
**Resolved:** 2026-05-23 — [Discussion #75](https://github.com/floor/vlist/discussions/75)  
**Related:** RFC-002 Core Architecture

---

## Summary

The v2 implementation has the right architectural spine: a persistent `EngineState`, typed-array visible buffers, a synchronous two-phase render pipeline, compiled plugin hooks, and a new plugin interface. However, the branch is still mid-migration and does not yet satisfy all RFC-002 acceptance criteria.

This RFC records the implementation gaps found during review and defines the stabilization work required before v2 should be treated as architecture-complete.

---

## 1. Current State

The following parts of RFC-002 are present in the implementation:

- `EngineState` owns persistent `Int32Array` / `Float64Array` buffers for visible indices, offsets, and sizes.
- The default list renderer runs a two-phase `phase1Calculate()` and `phase2Commit()` pipeline.
- Plugin hooks are compiled into arrays and invoked by linear `for` loops.
- `ResizeObserver`-based autosizing exists outside the synchronous pipeline.
- Layout plugins have been partially migrated to the new `VListPlugin` interface.

The implementation is not yet complete:

- `bun run typecheck` fails.
- Old v1-style `feature.ts` files still compile and reference removed builder types.
- Several RFC-002 guarantees are implemented only for the default contiguous list path.
- Some hot paths still allocate arrays, objects, closures, or iterators.

---

## 2. Blocking Issues

### 2.1 Typecheck Must Be Green

The branch currently fails `bun run typecheck`.

Primary causes:

- Stale `src/plugins/*/feature.ts` files import removed types such as `VListFeature`, `BuilderContext`, and `ReloadOptions`.
- Stale feature files import removed helpers such as `resolveScrollArgs` and `createSmoothScroll`.
- `src/core/pipeline.ts` has strict indexed-style errors around dynamic style property access.
- Some stale files still contain implicit `any` errors.

Decision:

- v2 must either migrate the old `feature.ts` files to the new plugin interface or remove/quarantine them from compilation.
- The public surface should expose one coherent plugin model.
- No stabilization work is complete until `bun run typecheck` passes.

Acceptance criteria:

- `bun run typecheck` exits 0.
- No stale v1 builder API files are included in the production TypeScript build.
- Public exports and source files use one current plugin vocabulary: `VListPlugin` and `PluginContext`.

---

### 2.2 Identity Binding Must Use Item Reference Equality

RFC-002 requires identity binding by item data reference equality. The current default commit path re-renders an existing element only when `data-id` changes. This misses updates where the object reference changes but the id stays the same.

Example:

```typescript
items[idx] = { ...items[idx], title: "new title" };
```

This produces a new object with the same id. The current DOM can remain stale because the renderer compares ids, not references.

Decision:

- Track the last bound item reference for every rendered element.
- Re-run the template when `previousItem !== nextItem`.
- Keep id-based placeholder replacement behavior as an additional concern, not the primary identity check.

Acceptance criteria:

- Updating an item with the same id and a new object reference updates the DOM.
- Mutating selection/focus state does not unnecessarily re-run templates.
- Placeholder replacement behavior still works.
- Tests cover same-id reference replacement.

---

### 2.3 Visible Indices Must Be Authoritative

RFC-002 states that `visibleIndices[0..visibleCount)` is authoritative for non-contiguous layouts. The current default commit path releases nodes by treating the first and last visible index as a contiguous range.

That works for the default list path but violates the core contract for non-contiguous layouts. Even if current grid, table, and masonry plugins replace rendering, the core abstraction should not encode a contiguous-only release rule.

Decision:

- Phase 2 must release based on membership in `visibleIndices`, not on `first <= index <= last`.
- The implementation must preserve the zero-allocation goal.
- A reusable mark/sweep strategy is preferred over allocating a `Set` per frame.

Potential implementation:

- Add a persistent `visibleMarks` typed array or generation counter structure to `EngineState`.
- During commit, mark all visible indices for the current generation.
- Release rendered nodes whose generation mark does not match.

Acceptance criteria:

- Phase 2 can commit arbitrary non-contiguous `visibleIndices`.
- No per-frame `Set`, array, or object allocation is introduced.
- Tests cover a synthetic non-contiguous visible buffer such as `[1, 4, 9]`.

---

### 2.4 Phase 2 Ordering Must Match RFC-002 ✓ RESOLVED

RFC-002 specifies strict Phase 2 ordering:

1. Node Acquisition
2. Identity Binding
3. Positioning
4. Node Release

~~The implementation currently releases old nodes before acquisition and binding.~~

**Resolution:** `phase2Commit()` now runs acquire/bind/position first, then releases stale nodes. This matches the original RFC-002 ordering. The RFC-002 amendment copy has been updated accordingly. See Issue 007 for full history.

Acceptance criteria (all met):

- Phase 2 ordering is documented in code and tests.
- The implementation and RFC agree.
- Pool behavior remains bounded under fast scrolling.

---

### 2.5 Buffer Growth Must Preserve Existing Data

RFC-002 requires typed-array buffer growth to copy existing data. The current `resizeCapacity()` reallocates fresh arrays and discards previous contents.

This is cold-path behavior, but the implementation should still match the architecture contract.

Decision:

- When growing buffers, copy old typed arrays into new typed arrays via `.set()`.
- Never shrink buffers during active scrolling.

Acceptance criteria:

- Existing visible buffer contents survive a capacity increase.
- Tests cover `resizeCapacity()` growth.
- Capacity still never shrinks from resize jitter.

---

## 3. Hot-Path Allocation Audit

The default list path is close to the intended zero-allocation model, but plugins still contain hot-path allocations.

Known examples:

- Table render builds a fresh `rangeItems` array and `range` object per render.
- Masonry render creates a `getItem` closure per render.
- Grid release uses `for...of` over `Map`, which can allocate iterator objects.
- Some plugin render paths allocate temporary range objects or arrays before delegating to renderers.
- Hooks are compiled, but there is no build-time or test-time validation that hook bodies avoid allocation.

Decision:

- Treat zero-allocation as a measured property, not only a coding convention.
- Separate cold-path allocations during data mutation, resize, layout recalculation, and plugin setup from scroll hot-path allocations.

Acceptance criteria:

- Add a hot-path allocation audit for default list, grid, masonry, table, scale, async, and selection combinations.
- Replace obvious hot-path allocations with persistent reusable structures.
- Document allowed cold-path allocations per plugin.
- Add tests or benchmarks that fail on accidental per-frame allocation where practical.

---

## 4. Autosize And Anchor Preservation

The autosize plugin follows the right model: ResizeObserver is external to the synchronous pipeline, size cache updates happen outside Phase 1, and scroll compensation is applied before force-rendering.

Remaining concerns:

- Anchor selection currently approximates by `engineState.startIndex`.
- Compensation accumulates deltas for measured items above that index.
- This may not fully match RFC-002's "first fully visible item" anchor protocol.

Decision:

- Define the anchor precisely in code.
- Prefer the first fully visible item when available.
- Keep the current fast path if it is proven equivalent for the default list case.

Acceptance criteria:

- Tests cover measurement changes above, inside, and below the viewport.
- Scroll position is compensated synchronously before rendering.
- Bottom-stick behavior remains stable.

---

## 5. Plugin Migration Boundary

The repo currently contains both new v2 `plugin.ts` files and old v1-style `feature.ts` files. This creates type errors and makes it hard to tell which architecture is authoritative.

Decision:

- `plugin.ts` is the v2 implementation path.
- Old `feature.ts` files must be removed, renamed out of compilation, or fully migrated.
- Tests should target the public v2 exports.

Acceptance criteria:

- No production source imports `BuilderContext` or `VListFeature`.
- No public export points at stale v1 builder features.
- Tests use `createVList(..., [plugin(...)])` or the final chosen v2 public API.

---

## 6. Stabilization Order

The recommended order is:

1. Make typecheck green by resolving the stale feature files and core strict errors.
2. Fix default list identity binding by item reference.
3. Make Phase 2 release respect authoritative `visibleIndices`.
4. Align Phase 2 ordering with RFC-002.
5. Copy typed-array contents on buffer growth.
6. Run the hot-path allocation audit across plugins.
7. Tighten autosize anchor preservation tests.
8. Re-run typecheck, changed tests, full tests, build, and size.

---

## 7. Completion Criteria

RFC-003 is complete when:

- `bun run typecheck` passes.
- `bun test --changed` passes for the stabilization changes.
- Default list rendering satisfies RFC-002 identity, buffer, ordering, and non-contiguous semantics.
- Plugin render paths have been audited for hot-path allocation.
- Old v1 builder feature files no longer block or confuse the v2 implementation.
- New tests cover the behavior gaps listed in this RFC.

---

## 8. Open Questions

1. ~~Should Phase 2 keep the RFC-002 Acquire → Bind → Position → Release ordering, or should RFC-002 be amended to release first for pool pressure reasons?~~ **Answered:** Acquire-first ordering restored. Pool pressure is not a concern with pre-allocated capacity.
2. ~~Should non-contiguous membership marking live in `EngineState`, or should it be a private renderer structure?~~ **Answered:** Private renderer structure (`isInVisible()` scan). No typed-array marking needed — scan is bounded by `visibleCount`.
3. ~~Should the old `feature.ts` files be moved to an archive path, removed entirely, or migrated incrementally?~~ **Answered:** Removed entirely. Clean break.
4. ~~What is the minimum acceptable allocation measurement harness for CI?~~ **Answered:** No CI harness added. Manual audit completed. Possible future addition, not blocking.

