# RFC-004: vlist v2 Core Optimization

**Status:** Completed (Tier 1 shipped, Tier 2–4 shelved)  
**Author:** GPT (Codex)  
**Type:** Performance / Bundle Size  
**Created:** 2026-05-23  
**Reviewed:** 2026-05-23 — [Discussion #76](https://github.com/floor/vlist/discussions/76)  
**Completed:** 2026-05-23  
**Related:** RFC-002 Core Architecture, RFC-003 Implementation Stabilization

---

## Summary

The v2 core now satisfies the main RFC-002 pipeline shape: typed-array state, a synchronous two-phase render loop, reference-based identity binding, acquire-first commit ordering, and zero-allocation-oriented plugin hooks.

This RFC proposes the next optimization pass for `src/core`, focused on:

- reducing scroll hot-path work,
- preserving zero-allocation behavior as features grow,
- shrinking the default bundle,
- reducing per-instance closure and object overhead,
- keeping plugin flexibility without making the default list pay for every plugin capability.

The goal is not to micro-optimize blindly. Each item below must be validated against tests, bundle size, and at least one realistic benchmark before it is considered complete.

---

## 1. Goals

1. Improve default list scroll throughput.
2. Reduce per-frame work in `phase1Calculate()` and `phase2Commit()`.
3. Reduce default bundle size for `createVList()` without plugins.
4. Preserve RFC-002 behavioral guarantees.
5. Keep non-contiguous layouts such as masonry correct.
6. Preserve zero runtime dependencies.

---

## 2. Non-Goals

- Rewriting the plugin system.
- Removing public features such as selection, async, table, grid, masonry, or page scrolling.
- Changing default visual behavior.
- Reintroducing v1 builder abstractions.
- Adding runtime dependencies.

---

## 3. Current Core Shape

`src/core` currently contains:

- `create.ts` — factory, plugin setup, API methods, event wiring, resize/scroll integration.
- `pipeline.ts` — `phase1Calculate()`, `phase2Commit()`, `render()`.
- `state.ts` — persistent `EngineState` typed-array buffers.
- `scroll.ts` — native scroll, wheel interception, idle detection, smooth scroll.
- `pool.ts` — pooled item element lifecycle.
- `hooks.ts` — compiled plugin hook arrays and runners.
- `dom.ts` — DOM scaffold and container resolution.
- `range.ts` — exported range helpers.
- `data.ts` — simple data manager, currently not used by `createVList()`.
- `velocity.ts` — lightweight velocity tracking.
- `types.ts` — v2 public/internal type contracts.

The hot path is mostly:

1. `scroll.ts` updates `EngineState.scrollPosition`.
2. `create.ts` calls `doScrollFrame()`.
3. `pipeline.ts` runs Phase 1 and Phase 2.
4. `create.ts` emits scroll, velocity, and range events when needed.

---

## 4. Optimization Opportunities

### 4.1 Replace Release Membership Scan ~~With Generation Marks~~ (Amended)

> **Discussion consensus:** Dense `Uint32Array(totalItems)` generation marks are **rejected for core**. A 1M-item list would add ~4 MB of permanent baseline memory, conflicting with the constant-overhead guarantee. Contiguous lists should use the range check from 4.2 instead. Non-contiguous layouts (masonry, table, grid) may use plugin-local membership structures if profiling shows the release scan is a bottleneck.

**Current behavior**

`phase2Commit()` releases stale nodes by scanning `visibleIndices` for each rendered element:

```typescript
rendered.forEach(releaseIfNotVisible);
```

`releaseIfNotVisible()` calls `isInVisible()`, which linearly scans `visibleIndices[0..visibleCount)`.

This is correct for arbitrary-order non-contiguous layouts, but the complexity is:

```text
O(rendered.size * visibleCount)
```

Usually this is fine, but it becomes expensive under:

- large overscan,
- masonry with many visible items,
- table/grid layouts with wider render windows,
- fast scrolling while release happens every frame.

**Amended proposal**

Instead of a global dense mark array, use stratified membership checking:

**A. Contiguous default lists (solved by 4.2)**

Range membership — no marks needed:

```typescript
idx >= startIndex && idx < startIndex + visibleCount
```

**B. Non-contiguous plugin layouts (benchmark-gated)**

If profiling shows the linear scan matters for a specific plugin, that plugin can use one of:

1. **Plugin-local marking** — the plugin owns its rendered store and can choose the right membership structure (small hash set, sorted array + binary search, etc.).
2. **Window-local mark table** — a small fixed-capacity table for the current render window, not sized by `totalItems`.
3. **Sorted visible indices + binary search** — if the layout can cheaply provide sorted indices, release membership becomes `O(log visibleCount)`.

Core does not allocate global mark arrays.

**Acceptance criteria**

- Contiguous lists use O(1) range check (via 4.2).
- Non-contiguous layouts remain correct with the existing linear scan.
- Any plugin-local membership optimization must report both CPU and memory deltas.
- No per-frame `Set`, array, or object allocation in core.

---

### 4.2 Specialize Contiguous Default List Rendering

**Current behavior**

The default list path always writes and reads `visibleIndices`.

For a normal list, indices are contiguous:

```typescript
visibleIndices[i] = startIndex + i;
```

That means both Phase 1 and Phase 2 do work that is only required for non-contiguous layouts.

**Proposal**

Introduce a layout mode flag:

```typescript
state.indicesAreContiguous = true;
```

For contiguous mode:

- Phase 1 writes only offsets and sizes.
- Phase 2 computes `dataIndex = state.startIndex + i`.
- Release can use a range check:

```typescript
idx >= startIndex && idx < startIndex + visibleCount
```

For non-contiguous mode:

- Phase 1/plugin hooks write `visibleIndices`.
- Phase 2 uses authoritative `visibleIndices`.
- Release uses generation marks or scan fallback.

**Tradeoffs**

- Adds one branch in Phase 2.
- More state surface.
- Plugins must explicitly switch the state to non-contiguous when needed.

**Acceptance criteria**

- Default list benchmark improves or remains neutral.
- Masonry/grid/table correctness remains unchanged.
- Tests cover both contiguous and non-contiguous release behavior.
- **Store choice is permanent at build time** — decided once during `createVList()` setup based on registered plugins, never migrated mid-lifecycle (see 4.3).

---

### 4.3 Replace `Map` With A Rolling Array For Default Rendered Elements

**Current behavior**

The core tracks rendered item elements in:

```typescript
const rendered = new Map<number, HTMLElement>();
```

`Map` is flexible and works for non-contiguous layouts. For default contiguous lists, it is heavier than necessary.

**Proposal**

Use a specialized rendered-element store for default contiguous lists:

```typescript
interface RenderedStore {
  get(index: number): HTMLElement | undefined;
  set(index: number, el: HTMLElement): void;
  delete(index: number): void;
  forEach(fn: (el: HTMLElement, index: number) => void): void;
}
```

Implementations:

- `MapRenderedStore` for non-contiguous/plugin mode.
- `WindowRenderedStore` for default list mode, backed by arrays.

> **Implementation constraint (discussion consensus):** The store implementation is selected once during `createVList()` setup and never changed. If any registered plugin declares or requires non-contiguous layout, the instance uses `MapRenderedStore` for its entire lifetime. No runtime migration from `WindowRenderedStore` to `MapRenderedStore` — this avoids migration correctness risk, mode synchronization overhead, and extra branching on the hot path.

**Tradeoffs**

- More abstraction around a very hot path.
- If the interface is too generic, it may erase the performance win.
- Could increase bundle size unless carefully implemented.

**Acceptance criteria**

- Default list scroll benchmark improves.
- Bundle size does not regress meaningfully.
- No behavioral change for plugin layouts.
- Store type is locked at setup — no mid-lifecycle migration.

---

### 4.4 Precompute Render Configuration

**Current behavior**

`phase2Commit()` recomputes stable strings and booleans every commit:

- selected/focused class names,
- placeholder/replaced class names,
- translate function prefix,
- role string,
- cross-axis style property names,
- cross-axis pixel strings.

**Proposal**

Create a cold-path `RenderConfig` object:

```typescript
interface RenderConfig {
  prefix: string;
  selectedClass: string;
  focusedClass: string;
  placeholderClass: string;
  replacedClass: string;
  translatePrefix: "translateX(" | "translateY(";
  itemRole: "option" | "listitem";
  sizeProp: "width" | "height";
  crossStartProp: "top" | "left" | "";
  crossEndProp: "bottom" | "right" | "";
  crossStartVal: string;
  crossEndVal: string;
  hasCrossPad: boolean;
}
```

Then `phase2Commit()` receives this object instead of many repeated primitive parameters.

**Tradeoffs**

- Fewer per-frame computations.
- Slightly larger cold-path object.
- Could improve both speed and call-site readability.
- Might hurt tree-shaking if it becomes too broad.

**Acceptance criteria**

- No per-frame allocation.
- Typecheck and core tests pass.
- Measured scroll frame time improves or remains neutral.

---

### 4.5 Split Interactive And Non-Interactive Commit Paths

**Current behavior**

`phase2Commit()` supports both interactive and non-interactive lists. It branches repeatedly on `interactive` and `itemStateFn`.

**Proposal**

Split into specialized commit functions:

- `phase2CommitInteractive()`
- `phase2CommitStatic()`

Or compile a commit function during `createVList()`:

```typescript
const commit = config.interactive || itemStateFn
  ? commitInteractive
  : commitStatic;
```

**Tradeoffs**

- Static lists get less branchy code.
- Interactive path stays full-featured.
- Bundle size may increase due to duplicated logic.
- Must measure size before accepting.

**Acceptance criteria**

- Non-interactive benchmark improves.
- Bundle size impact is justified.
- ARIA and selection tests remain green.

---

### 4.6 Avoid Copying Arrays In `setItems()`

**Current behavior**

`setItems()` copies user-provided arrays:

```typescript
items = [...newItems];
```

This is an `O(n)` allocation and copy.

**Proposal**

Assign by reference:

```typescript
items = newItems;
```

Or add explicit config:

```typescript
dataOwnership?: "copy" | "reference";
```

Default should be decided carefully.

**Tradeoffs**

- Reference assignment is faster and smaller.
- Copying protects vlist from external mutation.
- Reference assignment can make external array mutations visible without `setItems()`, which may surprise users.

**Acceptance criteria**

- API semantics are documented.
- If default changes, tests cover external mutation behavior.
- Large `setItems()` benchmark improves.

---

### 4.7 Batch Data Mutations And Size Cache Rebuilds

**Current behavior**

Mutations rebuild the size cache immediately:

- `setItems()`
- `appendItems()`
- `prependItems()`
- `insertItem()`
- `removeItem()`
- `removeItems()`

For variable-size caches, rebuild is `O(n)`.

**Proposal**

Add a batch mutation API:

```typescript
list.batch(() => {
  list.appendItems(a);
  list.removeItem(id);
  list.insertItem(item, index);
});
```

Inside a batch:

- Mutate items immediately.
- Mark size cache dirty.
- Rebuild once at the end.
- Render once at the end.

**Alternative**

Add lower-level internals:

```typescript
beginBatch();
endBatch();
```

**Tradeoffs**

- New public API surface.
- More state to maintain.
- Large wins for bulk operations.

**Acceptance criteria**

- Bulk insert/remove benchmark improves.
- Nested batches are either supported or explicitly rejected.
- Events fire predictably.

---

### 4.8 Split Smooth Scroll From Core Scroll Handler

**Current behavior**

`createScrollHandler()` always includes smooth-scroll animation support, custom easing, and cancellation state.

**Proposal**

Move smooth scroll into a separate helper:

```typescript
createSmoothScroller(...)
```

Only instantiate it when:

- `scrollToIndex({ behavior: "smooth" })` is called,
- a plugin requests smooth scrolling,
- or config enables smooth scrolling.

**Tradeoffs**

- Smaller default scroll handler.
- Slightly more code around lazy initialization.
- Smooth scrolling remains available.

**Acceptance criteria**

- Default bundle size decreases.
- Smooth scrolling tests continue passing.
- No extra allocation on regular scroll frames.

---

### 4.9 Install Click Handling Lazily

**Current behavior**

Core always installs a click listener and includes item resolution logic.

```typescript
dom.content.addEventListener("click", onContentClick);
```

This is useful for `item:click` and plugins, but unnecessary for purely programmatic lists.

**Proposal**

Install click handling when:

- a plugin registers a click handler,
- a user subscribes to `item:click`,
- or `interactive` is true and baseline a11y needs it.

This may require wrapping the emitter `on()` method to detect `item:click` subscriptions.

**Tradeoffs**

- Slightly more complex event setup.
- Smaller/lighter default for non-click lists.
- Must avoid missing early clicks after creation.

**Acceptance criteria**

- No click listener is installed when unused.
- `item:click` still works immediately after subscription.
- Selection/a11y plugins still receive click events.

---

### 4.10 Remove Or Move Unused `core/data.ts`

**Current behavior**

`src/core/data.ts` defines `createSimpleDataManager()`, but `createVList()` does not use it.

**Proposal**

Choose one:

1. Remove the file if it is obsolete.
2. Move it to an internal experimental path.
3. Wire `createVList()` to use it.
4. Export it only from an explicit internals entry.

**Tradeoffs**

- Removing it reduces source and possible bundle surface.
- If plugin authors rely on it, removal is breaking.
- Wiring it in may add runtime overhead if not needed.

**Acceptance criteria**

- Public API decision documented.
- Bundle size measured before and after.
- No production source imports an unused module.

---

### 4.11 Reduce `core/index.ts` Re-Exports

**Current behavior**

`src/core/index.ts` re-exports many internals:

- pipeline phases,
- hook runners,
- pool,
- range helpers,
- DOM factory,
- scroll handler,
- size cache helpers.

This is convenient but can make public import boundaries blurrier.

**Proposal**

Split entry points:

- `@floor/vlist/core` — stable public core.
- `@floor/vlist/internals` — low-level internals.

Or keep the file but remove unused/stale exports.

**Tradeoffs**

- Better tree-shaking and API clarity.
- Potential breaking changes for internal consumers.
- Requires package export review.

**Acceptance criteria**

- API surface audit confirms intended exports.
- Bundle-size test confirms no regression.
- Migration notes exist for removed exports.

---

### 4.12 Remove Or Rewrite `core/range.ts`

**Current behavior**

`calcVisibleRange()` and `applyOverscan()` are exported but not used by the current core pipeline. `applyOverscan()` allocates an object.

**Proposal**

Either:

- remove `core/range.ts`, or
- rewrite `applyOverscan()` to use out-params:

```typescript
applyOverscan(visStart, visEnd, overscan, total, outRange);
```

**Tradeoffs**

- Removing is smallest if unused.
- Keeping out-param helpers may be useful for plugins.

**Acceptance criteria**

- No runtime allocation helper is exported as a hot-path recommendation.
- Existing tests and public API expectations are updated.

---

### 4.13 Shrink `PluginContext` Runtime Object

**Current behavior**

`createVList()` creates a broad `ctx` object with many methods. Every list instance pays for the closures even if most plugins are absent.

**Proposal**

Split plugin capabilities into smaller lazily created bags:

```typescript
ctx.data
ctx.scroll
ctx.render
ctx.navigation
ctx.events
```

Or create methods only when a plugin declares a capability requirement.

**Tradeoffs**

- Could reduce per-instance memory.
- May increase plugin setup complexity.
- Type ergonomics may suffer.

**Acceptance criteria**

- Per-instance memory benchmark improves.
- Plugin authoring remains understandable.
- No plugin loses capability.

---

### 4.14 Optimize `removeItems()`

**Current behavior**

`removeItems()` creates a `Set` and uses `filter()`:

```typescript
const idSet = new Set(ids);
items = items.filter((item) => !idSet.has(item.id));
```

This is cold-path, but for large lists and frequent batch removals it allocates significantly.

**Proposal**

Use an in-place compaction loop:

```typescript
let write = 0;
for (let read = 0; read < items.length; read++) {
  const item = items[read]!;
  if (!shouldRemove(item.id)) items[write++] = item;
}
items.length = write;
```

For small `ids`, a nested linear scan may beat `Set` allocation. For large `ids`, keep `Set`.

**Tradeoffs**

- Slightly more code.
- Better memory behavior for large lists.
- Must preserve item order.

**Acceptance criteria**

- Batch removal benchmark improves.
- Tests cover order preservation.

---

### 4.15 Revisit Pool Reset Work

**Current behavior**

`pool.release()` removes many attributes and clears `innerHTML`.

This is safe, but it does the same work for every released element regardless of which attributes were ever set.

**Proposal**

Track flags on pooled elements:

```typescript
_hadInteractiveAttrs
_hadSelectionAttrs
_hadCrossPad
```

Then only remove attributes that may exist.

**Tradeoffs**

- More element expando fields.
- Faster release for non-interactive/static lists.
- More complexity in the pool.

**Acceptance criteria**

- Release benchmark improves.
- Re-acquired elements are always clean.
- Tests cover interactive → non-interactive reuse if possible.

---

### 4.16 Fix Stale Comments And Documentation Drift

**Current behavior**

Some comments still describe older ordering or older builder-era concepts.

Examples:

- `pipeline.ts` header still mentions release-first sub-phases.
- `core/data.ts` comments mention `withData()` and builder-era paths.

**Proposal**

Clean comments as part of the optimization pass.

**Acceptance criteria**

- No comments contradict RFC-002 or current implementation.
- Core docs use v2 terminology consistently.

---

## 5. Prioritization (Discussion Consensus)

Agreed in [Discussion #76](https://github.com/floor/vlist/discussions/76) by Claude (Opus 4.6), GPT (Codex), Gemini (3.1 Pro), and Claude (Opus, committee).

### Tier 1 — Immediate cleanup, low risk

| # | Item | Rationale |
|---|------|-----------|
| 4.10 | Remove unused `core/data.ts` | Dead code — nothing imports it. 245 lines removed. |
| 4.12 | Remove unused `core/range.ts` | Dead code — nothing imports it. `applyOverscan()` allocates an object. |
| 4.16 | Fix stale comments / documentation drift | Hygiene. No risk. |
| 4.4 | Precompute render configuration | Orientation-dependent strings resolved once at init instead of every frame. |

### Tier 2 — Primary performance target

| # | Item | Rationale |
|---|------|-----------|
| 4.2 | Contiguous default-list specialization | The dominant use case. Eliminates `visibleIndices` writes and enables O(1) range-check release. |
| 4.3 | Window-backed rendered store | Paired with 4.2 — replaces `Map` with array indexing for contiguous lists. Design together. |

### Tier 3 — Benchmark-gated

| # | Item | Gate |
|---|------|------|
| 4.1 | Plugin-local membership marking (amended) | Only if profiling shows release scan matters for table/masonry/grid. |
| 4.5 | Split interactive/static commit paths | Only if non-interactive benchmark improves enough to justify code duplication. |
| 4.8 | Lazy smooth scroll initialization | Only if bundle-size measurement justifies the lazy-init complexity. |
| 4.9 | Lazy click handling | Only if bundle-size measurement justifies it. |
| 4.13 | Shrink `PluginContext` runtime object | Only if per-instance memory benchmark shows meaningful reduction. |
| 4.15 | Optimize pool reset work | Only if release benchmark shows attribute removal is a bottleneck. |

### Tier 4 — API / feature backlog

| # | Item | Notes |
|---|------|-------|
| 4.6 | `setItems()` copy vs reference | API ownership decision. Keep defensive copy as default; add `{ copy: false }` opt-out if needed. |
| 4.7 | Batch mutations | Feature, not optimization. Implement when real-world bulk workflows need it. |
| 4.11 | Reduce `core/index.ts` re-exports | API surface audit. Low urgency. |
| 4.14 | Optimize `removeItems()` | Cold-path. Optimize when a real use case hits the bottleneck. |

### Implementation order

1. Ship Tier 1 (cleanup PR).
2. Run `bun run size` before/after.
3. Implement Tier 2 (4.2 + 4.3 together — design the contiguous/non-contiguous split, then implement the window store).
4. Add benchmark baselines for default list, large overscan, masonry, table, and bulk mutations.
5. Evaluate Tier 3 items individually against benchmark data.
6. Tier 4 items enter the backlog as separate feature proposals.

---

## 6. Measurement Requirements

Each accepted optimization must include at least one of:

- scroll frame benchmark,
- memory benchmark,
- gzipped bundle-size measurement,
- focused regression test for the optimized behavior.

Minimum benchmark scenarios:

1. Default vertical list, fixed size, 10K items.
2. Default vertical list, variable size, 10K items.
3. Large overscan default list.
4. Masonry with variable sizes.
5. Table with many visible rows.
6. Bulk `setItems()` with 100K items.
7. Bulk `removeItems()` with 10K removals.
8. Non-interactive static list.

Report:

- mean frame time,
- p95 frame time,
- allocations per scroll frame where measurable,
- retained memory after destroy,
- minified + gzip bundle size.

---

## 7. Acceptance Criteria

RFC-004 is complete when:

- The default list hot path has no known avoidable per-frame allocations.
- Non-contiguous layout correctness is preserved.
- Core bundle size is measured before and after.
- At least the top three accepted optimizations are implemented or explicitly rejected with benchmark data.
- Stale or unused core modules are removed, moved, or documented as public API.
- `bun run typecheck` passes.
- Relevant focused tests pass.
- Full `bun test --changed` passes for implementation changes.
- `bun run build` and `bun run size` show no unjustified regression.

---

## 8. Open Questions (Resolved)

1. ~~Is a `Uint32Array(totalItems)` generation mark acceptable for million-item lists?~~ **No.** Dense marks rejected for core. Contiguous lists use range checks (4.2); non-contiguous plugins can opt into local marking.
2. ~~Should the default list have a separate optimized rendered store?~~ **Yes.** 4.2 + 4.3 accepted as Tier 2 priority — window-backed store for contiguous, Map retained for non-contiguous.
3. ~~Should `setItems()` own the array by copying?~~ **Yes, keep copy as default.** The defensive copy costs ~0.1ms for 100K items (cold path). Add `{ copy: false }` opt-out for callers who understand the mutation contract.
4. ~~Should mutation batching be public API or internal-only?~~ **Deferred.** Treat as a feature proposal, not a core optimization (Tier 4).
5. ~~Should smooth scrolling remain core behavior?~~ **Benchmark-gated (Tier 3).** Measure bundle-size impact before deciding.
6. ~~Which `src/core/index.ts` exports are truly public?~~ **Deferred.** API surface audit is Tier 4 / low urgency.
7. ~~Is `core/data.ts` still part of the intended v2 architecture?~~ **No.** Dead code — remove it (Tier 1).

---

## 9. Conclusion

**Tier 1 shipped in v2.0.1** (commits `3150f2a`, `2459916`, `d036683`, `79f770b`). Results:

- **#77 (data.ts) and #78 (range.ts):** Zero bundle/perf impact — tree-shaking already excluded dead code. Pure source hygiene.
- **#79 (stale comments):** Documentation hygiene. No runtime change.
- **#80 (RenderConfig):** Bundle increased +0.1 KB. No measurable perf gain. Code quality improved (`phase2Commit` 17→10 params).

**Tier 2–4 shelved.** Committee review (GPT, Gemini, Claude) reached consensus:

- v2 core is already at 120 FPS with 0.6ms frame budget — there is nothing meaningful left to optimize on the hot path.
- Tier 2 (contiguous specialization) would add complexity and bundle size chasing gains that don't exist in practice.
- Tier 3/4 items remain as known levers if future profiling reveals bottlenecks on low-end devices or edge-case workloads.

RFC-004 is **complete**. The core optimization ceiling has been reached. Future performance work should be driven by real-world profiling, not speculative cleanup.

