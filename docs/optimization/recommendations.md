# Optimization Recommendations for vlist

Grounded assessment of strategic improvements for the virtual list builder,
based on a thorough audit of the actual codebase (`src/builder/`, `src/rendering/`,
`src/features/`). Each recommendation is evaluated against the existing architecture,
bundle-size constraints, and the `MRefs` minification strategy.

Recommendations are ordered by priority (highest first).

---

## 1. Contextual Error Reporting

**Priority:** High · **Effort:** Medium · **Impact:** High

### Problem

Error handling is minimal and mostly dev-mode-only. The `VListEvents` type defines
an `error` event (`{ error: Error; context: string }`), but core never emits it.
Critical failure modes are unguarded:

- If a `feature.setup()` throws, subsequent features never run and the list is
  left half-initialized.
- If a template function throws inside the render loop, the entire render crashes
  with no recovery.
- If a `destroyHandler` throws, subsequent handlers are skipped (no try/catch
  in the destroy loop).
- Dev-mode warnings (`process.env.NODE_ENV !== "production"`) are stripped in
  production — users get silent failures.

The `sharedState` object already tracks scroll position, visible range, render
range, and compression state on every frame — but none of this is attached to
errors when they occur.

### Recommendation

**1a. Wrap `feature.setup()` calls in try/catch.**

During the `materialize()` feature-setup loop in `core.ts`, catch errors from
individual features. When a feature fails:

- Emit the `error` event with the feature name and current builder state.
- Continue setting up remaining features.
- Mark the failed feature as degraded so its handlers are skipped at runtime.

This prevents one broken feature from taking down the entire list.

**1b. Guard the template call in the render loop.**

In `renderItem()` (core.ts ~L541), wrap `applyTemplate()` in a try/catch.
On failure:

- Render a minimal fallback element (empty div with an error class).
- Emit the `error` event with the item index, item data, and current
  viewport state snapshot.
- Continue rendering remaining items.

This is the single highest-value guard — template functions are user-supplied
code and the most common source of runtime crashes.

**1c. Enrich async errors with viewport state.**

When the `error` event is emitted from any module, automatically attach a
snapshot of:

```
/dev/null/example.ts#L1-7
{
  scrollPosition: number;
  containerSize: number;
  visibleRange: { start: number; end: number };
  renderRange: { start: number; end: number };
  totalItems: number;
  isCompressed: boolean;
}
```

This is trivial since `sharedState.viewportState` already holds all of these
values. Clone the object at error time to prevent mutation.

**1d. Wrap destroy handlers in try/catch.**

Iterate all `destroyHandlers` inside a try/catch so one failing handler does
not prevent cleanup of subsequent handlers. Collect all errors and emit them
after the loop completes.

### Bundle impact

Minimal. Four try/catch blocks plus a state-snapshot helper. Estimated +200–300
bytes minified+gzipped.

### Status

✅ **Implemented** in v1.3.9 (`feat/contextual-error-reporting` branch).

All four sub-recommendations shipped:
- 1a: `feature.setup()` wrapped in try/catch — errors emitted, remaining features continue
- 1b: Template calls guarded in `renderItem()`, `coreRenderIfNeeded()`, and `_updateRenderedItem()` — blank fallback on error
- 1c: `ErrorViewportSnapshot` attached to template and setup errors via `snapshotViewport()` helper
- 1d: Destroy handlers wrapped in try/catch — errors collected and emitted before `emitter.clear()`

Bundle impact: 0 bytes (34.9 KB gzipped, unchanged from 1.3.8).

---

## 2. Incremental Prefix-Sum Updates

**Priority:** Medium · **Effort:** Medium · **Impact:** Medium

### Problem

In `measurement.ts`, the `ResizeObserver` callback calls `measuredCache.rebuild()`
after every batch of measurements. This is an `O(n)` operation over the full
prefix-sum array — for a 10,000-item list, it rebuilds all 10,000 entries even
when only one item was measured.

Note: the Gemma recommendations suggested deferring this rebuild to idle state.
That would break correctness — the scroll-correction logic that runs immediately
after depends on accurate prefix sums:

```
vlist/src/builder/measurement.ts#L163-168
    if (pendingScrollDelta !== 0) {
      const currentScroll = $.sgt();
      $.sst(currentScroll + pendingScrollDelta);
      $.ls = currentScroll + pendingScrollDelta;
      pendingScrollDelta = 0;
    }
```

Deferring the rebuild means scroll correction uses stale offsets, causing visible
item jumps.

### Recommendation

Instead of deferring, implement **incremental prefix-sum updates** in `SizeCache`.
When a single item's size changes at index `i`, only recompute the prefix sums
from index `i` onward:

```
/dev/null/example.ts#L1-8
// In SizeCache
rebuildFrom(index: number, total: number): void {
  for (let i = index; i < total; i++) {
    this.prefixSums[i + 1] = this.prefixSums[i] + this.getSize(i);
  }
}
```

For the common case (measuring one item near the viewport), this reduces the
work from `O(n)` to `O(n - index)`. When the viewport is near the bottom of the
list, the cost approaches `O(1)`.

The `ResizeObserver` callback already tracks the lowest changed index (via the
loop over entries). Pass that as the starting point for the incremental rebuild.

### Bundle impact

Negligible — one additional method on `SizeCache`, ~10 lines.

---

## 3. Practical State Guards

**Priority:** Medium · **Effort:** Low · **Impact:** Medium

### Problem

The builder state is two booleans (`isInitialized`, `isDestroyed`) with
`if ($.id) return;` guards scattered manually throughout the codebase. There
are no guards against:

- **Re-entrant renders:** A template function or event handler that triggers a
  data mutation during an active render cycle.
- **Post-destroy method calls:** Features check `$.id` individually, but there
  is no centralized guard.
- **Concurrent data mutations:** Multiple synchronous `removeItem()` calls each
  trigger separate render cycles (only `ensureRange` is debounced via microtask).

The Gemma recommendations suggested a full state machine and domain-specific
guards (e.g., "cannot remove item if part of a mandatory group"). A full state
machine adds complexity without clear benefit for a virtual list, and
domain-specific guards belong in individual features (e.g., `withGroups`), not
in the core.

### Recommendation

**3a. Re-entrancy guard on the render path.**

Add a boolean flag (`isRendering`) set at the entry of `coreRenderIfNeeded()`
and cleared at exit. If a render is triggered while the flag is set, queue it
as a microtask instead of executing immediately:

```
/dev/null/example.ts#L1-9
let isRendering = false;
const coreRenderIfNeeded = (): void => {
  if (isRendering) {
    queueMicrotask(coreRenderIfNeeded);
    return;
  }
  isRendering = true;
  try { /* existing render logic */ }
  finally { isRendering = false; }
};
```

This prevents the subtle bugs that occur when a template's side effects
(e.g., triggering a reactive framework update) cause a synchronous re-render.

**3b. Centralized destroy guard.**

Create a single `guardDestroyed()` helper that wraps public API methods.
Instead of each feature independently checking `$.id`:

```
/dev/null/example.ts#L1-5
const guardDestroyed = <R>(fn: () => R): R | undefined => {
  if ($.id) return undefined;
  return fn();
};
```

Apply this in `createApi()` when assembling the public API object, so all
public methods are automatically guarded without relying on each feature
to remember the check.

**3c. Batch data mutations.**

Expose a `batch()` method that defers render cycles until all mutations
within the callback complete:

```
/dev/null/example.ts#L1-9
batch(fn: () => void): void {
  batchDepth++;
  try {
    fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) coreRenderIfNeeded();
  }
}
```

This collapses multiple `removeItem()` or `updateItem()` calls into a single
render cycle, which is both a correctness fix (no intermediate broken states)
and a performance win.

### Bundle impact

~150–200 bytes minified+gzipped for all three guards.

---

## 4. Feature Lifecycle Hooks

**Priority:** Low · **Effort:** Low · **Impact:** Low

### Problem

Features rely on priority ordering to sequence inter-feature dependencies.
For example, `withGrid` runs at priority 10, `withGroups` at 20, and
`withSelection` at default 50. This works but is implicit — a developer
adding a new feature must understand the priority landscape to avoid
ordering bugs.

There is no `onAllFeaturesReady()` hook, so features that need to
coordinate with other features (e.g., selection needing to know if grid
is present) must use heuristics during their own `setup()`.

### Recommendation

Add a single lifecycle hook: `onReady` on the `VListFeature` interface.

```
/dev/null/example.ts#L1-7
export interface VListFeature<T extends VListItem = VListItem> {
  readonly name: string;
  readonly priority?: number;
  setup(ctx: BuilderContext<T>): void;
  onReady?(ctx: BuilderContext<T>): void;  // Called after ALL features setup
  destroy?(): void;
  // ...
}
```

In `core.ts`, after all `feature.setup()` calls complete, iterate again and
call `feature.onReady()` for features that define it. This gives features a
guaranteed point where all other features have finished wiring their handlers
and methods.

This is not urgent — the priority system works for the current 10 built-in
features. It would matter more if vlist supported third-party plugins.

### Bundle impact

Negligible — one additional loop over the features array during initialization.

---

## 5. ID→Index Lookup Map (Full DataManager Only)

**Priority:** Low · **Effort:** Low · **Impact:** Low (niche)

### Problem

`SimpleDataManager.removeItem()` does a linear scan for string IDs:

```
vlist/src/builder/data.ts#L175
    const index = typeof id === "number" ? id : items.findIndex((item: any) => item.id === id);
```

The comment at line 107 explains this was deliberate:

```
vlist/src/builder/data.ts#L107
  // ID → index map removed for memory efficiency
```

For most use cases (<10K items, occasional removes), linear scan is fine.

### Recommendation

Do **not** add a Map to `SimpleDataManager` — it would bloat the core bundle
(~1 KB) for a feature most users don't need.

Instead, if this becomes a bottleneck, add an optional lazy `Map<string | number, number>`
to the **full `DataManager`** that ships with `withAsync()`. Users of the async
data adapter already pay the larger bundle cost (~8 KB) and are more likely to
perform complex ID-based operations (filtering, grouping, reordering).

The Map should be:

- **Lazy:** Only created on first ID-based lookup, not on construction.
- **Invalidated on mutation:** Cleared on `setItems()`, `removeItem()`,
  `splice()`. Rebuilt on next lookup.
- **Optional:** Controlled by a config flag so users who don't need it
  pay nothing.

### Bundle impact

Zero for the default path. ~300 bytes added to the full DataManager when
the opt-in flag is enabled.

---

## Recommendations NOT Carried Forward

The following items from the original Gemma recommendations were evaluated
and are not recommended for implementation:

### Timer-Based Idle Resource Reclamation

**Why not:** The stated problem (stale `ResizeObserver`s accumulating) does not
exist. The measurement subsystem uses a **one-shot pattern** — each element is
unobserved immediately after its first measurement:

```
vlist/src/builder/measurement.ts#L145-146
        // Stop observing — size is now known
        observer!.unobserve(entry.target as Element);
```

A single `ResizeObserver` instance lives for the lifetime of the list and
observes only elements currently being measured. There is no resource leak
to reclaim.

### Further Geometry System Extraction

**Why not:** The geometry system is already well-decomposed across four modules:

- `rendering/sizes.ts` — `SizeCache` with prefix-sum array
- `rendering/measured.ts` — `MeasuredSizeCache` for dynamic measurement
- `rendering/viewport.ts` — compression state calculations
- `builder/range.ts` — visible range calculation

The remaining geometry logic in `core.ts` (scroll correction, content sizing)
is tightly coupled to scroll state via closure variables (`$.sgt()`, `$.sst()`,
`$.ls`). Extracting it would require passing 6+ parameters through a function
boundary, adding overhead on the hot scroll path for a purely structural benefit.

The v0.9.0 dimension-agnostic refactoring already cleaned up the naming
(`height` → `size`, `scrollTop` → `scrollPosition`). An axis abstraction
(`mainAxis`/`crossAxis`) would add indirection that hurts hot-path performance
and increases bundle size.

### Formal Plugin Interface with Capability Scoping

**Why not:** The `VListFeature` interface is already a clean contract. The real
issue is that `BuilderContext` is a god object (50+ members), but narrowing it
per-feature would add runtime overhead (proxy objects or capability tokens) and
bundle size for a developer-ergonomics win that matters little when all 10
features are built-in. This would become relevant if vlist supported third-party
plugins — not a current goal.