---
created: 2026-05-29
updated: 2026-05-29
status: draft
---

# RFC-009: Configuration Immutability

**Status:** Draft  
**Author:** floor  
**Type:** Architecture  
**Created:** 2026-05-29  
**Origin:** [#21](https://github.com/floor/vlist/issues/21) follow-up by @AzzaAzza69

---

## Summary

vlist's configuration is immutable: `createVList(config, plugins)` produces a list instance whose behavior is fixed for its lifetime. Changing any option — scrollbar toggle, selection mode, grid columns, autoHide delay — requires destroying the instance and creating a new one.

This is a deliberate design choice. Immutable config makes plugins simple: they close over their options in `setup()`, with no reactive update paths, no stale-state bugs, no two-code-path maintenance burden.

In practice, this works well. List creation takes ~2ms, and combined with the `snapshots` plugin for scroll position restore, a rebuild feels immediate. Real-world consumers rarely change config after creation — a list is created once with the desired options and left alone.

The edge case is interactive demos. On vlist.io, we rebuild the list on every config toggle to showcase all possible options. This rapid rebuild cycle occasionally causes a visible flash — DOM is cleared, async data reloads from scratch, placeholders appear briefly. This is a vlist.io concern more than a consumer concern, but it surfaced a legitimate question: should config be mutable?

This RFC evaluates that question and concludes that immutability is the right choice. The flash can be solved at the rebuild level without changing the architecture.

---

## Why Immutable Config

Configuration immutability is not a limitation — it's an architectural decision that shapes the entire library.

### The design

`createVList(config, plugins)` is a factory function. Config in, list instance out. The config is consumed once during setup and never read again. Plugins close over their options in `setup()` and hold no reference to the original config object. The instance's behavior is fully determined at creation time.

This is the same model as `Object.freeze()` in JavaScript, `const` in Rust, or props in React components — once created, the contract is fixed.

### What this enables

**Deterministic instances.** Same config always produces the same list. There is no sequence of method calls that can put the instance into an unexpected state. This makes bugs reproducible — if a consumer reports an issue, the config alone is enough to recreate it.

**Simple plugin contract.** A plugin implements `setup(ctx)` and optionally `destroy()`. That's it. There is no `update()` hook, no diffing logic, no "what changed since last time?" bookkeeping. Plugin authors — including future third-party authors — only reason about one moment: initialization.

**No transition-order bugs.** With mutable config, changing option A then B can produce different results than B then A. If autoHide changes while the scrollbar is mid-fade, if column count changes while a selection drag is active, if item height changes while a scroll animation is in flight — each combination is a potential edge case. Immutable config eliminates this class of bugs entirely: there are no transitions, only constructions.

**No state divergence.** Mutable config introduces a gap between "what the config says" and "what the instance is actually doing." A plugin might update one internal variable but miss another. A mid-flight animation might reference stale values. Immutable config makes this impossible by construction — the instance always matches its creation config because neither can change.

**Debuggability.** When something goes wrong, the config that created the list is the config it's running with. There's no "what was the state when this happened?" question. No event log to replay. The config object is the complete, static truth.

**Framework adapter fit.** React, Vue, Svelte, and Solid all model component configuration as props. Props change → component re-renders. Immutable config maps directly to this model. The framework adapters translate prop changes into destroy + recreate, which the framework's reconciliation handles naturally. Mutable config would fight the framework — the adapter would need to diff props, map them to update calls, and handle partial failures. Immutable config lets the framework do what it already does.

**Smaller bundle.** No reactive system, no config diffing, no partial-update handlers in every plugin. The code that doesn't exist can't have bugs and doesn't cost bytes.

---

## The Question

Given these benefits, is there a reason to break immutability?

**Should vlist support in-place config updates?**

```js
// Today: destroy + recreate
list.destroy();
list = createVList(newConfig, newPlugins);

// Alternative: mutable config
list.reconfigure({ scrollbar: { autoHideDelay: 2000 } });
// or
list.updatePlugin("scrollbar", { autoHideDelay: 2000 });
```

### Arguments for mutable config

1. **No flash** — in-place updates avoid the destroy/recreate cycle entirely
2. **No snapshot dance** — scroll position, selection, and focus are naturally preserved
3. **Familiar pattern** — most UI libraries support updating options after creation (AG Grid `api.setGridOption()`, Handsontable `updateSettings()`, Chart.js `chart.update()`)
4. **Natural for sliders** — controls like autoHide delay or padding that change on every mouse move feel wrong triggering a full rebuild

### Arguments against

1. **Two code paths per plugin** — every plugin needs both `setup()` and `update()`, doubling the surface area for bugs
2. **Partial update complexity** — which options are safe to update in place? Behavioral options (delays, colors) are easy. Structural options (layout mode, column count, item height) require DOM restructuring that's equivalent to a rebuild anyway.
3. **Transition-order bugs** — update A then B may differ from B then A. Each plugin must handle every valid transition between config states.
4. **State divergence risk** — internal state can fall out of sync with the current config. Immutable config prevents this by construction.
5. **Plugin author burden** — third-party plugins must implement and test update paths. The simple `setup()` contract becomes a complex lifecycle.
6. **Testing explosion** — every plugin needs tests for every valid config transition, not just every valid config.
7. **Bundle size** — update logic in every plugin adds weight with diminishing returns.
8. **Framework friction** — React/Vue/Svelte adapters would need to diff props and map to update calls instead of leveraging their natural reconciliation.

---

## Evaluation

For the vast majority of consumers, this is a non-issue. Config is set once, the list is created in ~2ms, and the `snapshots` plugin handles scroll restore transparently. The destroy + recreate pattern is simple, predictable, and fast enough.

The flash only appears when:
- The `data()` plugin is active (async loading), **and**
- The list is rebuilt frequently (interactive demos, config explorers)

In that scenario, the ~2ms creation is instant, but the async data reload introduces a brief placeholder cycle. This is what @AzzaAzza69 reported in [#21](https://github.com/floor/vlist/issues/21) — a blue flash when toggling options in the track-list grid mode.

The case for mutable config rests on eliminating this flash. But mutable config is an architectural change that affects every plugin, while the flash is a narrow problem with targeted solutions:

| Side effect | Cause | Frequency in practice |
|-------------|-------|-----------------------|
| DOM flash | `container.innerHTML = ""` clears visible content | Only during rebuild |
| Data cache loss | Async data plugin's cache is discarded | Only with `data()` plugin |
| Scroll position drift | Snapshot save/restore edge cases | Fixed with `savedSnapshot` guard |

**Recommendation: keep immutable config. For the rare cases where rebuild flash matters, solve it at the data/rebuild level.**

---

## Solution: Smooth Rebuild

Instead of changing the plugin architecture, make the destroy + recreate cycle invisible to the user.

### 1. Data Cache Seeding

**The biggest win.** When a list is rebuilt with the same data source, the new data plugin instance should start with the previous instance's cache.

```js
data({ adapter: tracksAdapter, autoCache: "track-list" })
```

With `autoCache`, the data plugin persists its loaded chunks to a keyed in-memory store (not sessionStorage — too large). When a new instance with the same key is created, it seeds from the existing cache. First render uses real data, not placeholders. No flash.

This mirrors how `snapshots({ autoSave: "key" })` already works for scroll position.

**Cache invalidation:** The cache is invalidated when:
- The adapter reference changes
- Sort/filter parameters change (consumer signals via `autoCache` key or explicit `invalidate()`)
- A configurable TTL expires

**Estimated cost:** +0.5–1.0 KB in the data plugin.

### 2. Deferred DOM Swap

For cases where even a brief placeholder flash matters, build the new list offscreen and swap it in once ready:

```js
import { smoothRebuild } from "vlist/utils";

smoothRebuild({
  container: "#list-container",
  create: (el) => createVList({ container: el, ... }, plugins),
  ready: (list) => list.once("load:end"),
  previous: oldList,
});
```

The old list stays visible until the new one is fully rendered. Single-frame swap. No flash at all.

**Estimated cost:** +0.3–0.5 KB as a separate utility.

### 3. Improved Snapshot Restore

The scroll drift bugs in the scrollbar and track-list examples stem from the snapshot being captured when internal state lags behind the viewport. The `savedSnapshot` guard pattern (only update the snapshot when `viewport.scrollTop > 0` and `snap.scrollTop > 0`) fixes this.

This pattern should be documented as the recommended rebuild approach, or built into a core helper:

```js
import { rebuildList } from "vlist/utils";

list = rebuildList(list, SNAPSHOT_KEY, () =>
  createVList(newConfig, plugins)
);
```

**Estimated cost:** +0.1–0.2 KB.

---

## What About CSS-Only Updates?

Some config changes are already instant without a rebuild: scrollbar width, radius, and colors update via CSS custom properties. This is the right pattern for visual-only changes and doesn't require mutable config — it's just CSS.

The examples already do this:

```js
document.documentElement.style.setProperty("--vlist-custom-scrollbar-width", px + "px");
```

This approach can be extended to more visual properties without any architecture changes.

---

## Competitive Landscape

| Library | Config model | Update mechanism |
|---------|-------------|-----------------|
| **AG Grid** | Mutable | `api.setGridOption()` — updates in place |
| **Handsontable** | Mutable | `updateSettings()` — partial merge |
| **TanStack Virtual** | Reactive | Options are reactive signals (React state, Vue refs) |
| **react-window** | Immutable | Props change → React re-renders the component |
| **react-virtuoso** | Immutable | Props change → React handles diffing |
| **vlist** | Immutable | Destroy + recreate |

React-based libraries get "free" mutable config from React's reconciliation. Vanilla libraries (AG Grid, Handsontable) implement it manually at significant complexity cost. vlist's immutable model is closest to react-window's approach, extended to vanilla JS.

---

## Open Questions

1. **Data cache key design** — should `autoCache` be a string key (like snapshots), or should the data plugin auto-derive a key from the container selector? Auto-derivation is more convenient but harder to reason about.

2. **Cache scope** — in-memory (lost on page refresh) or sessionStorage (persists across refreshes)? In-memory is simpler and avoids serialization limits. SessionStorage survives refreshes but has size constraints.

3. **`smoothRebuild` as core vs. utility** — should the deferred swap be a first-class feature (`createVList` option) or a separate utility import? Utility keeps core small. Core integration would be more ergonomic.

4. **Framework adapter implications** — React/Vue/Svelte adapters already handle re-rendering via their frameworks. Does data cache seeding benefit them, or is this purely a vanilla JS concern?

---

## Implementation Order

```
Phase 1: Data cache seeding
  1a. In-memory cache registry (keyed store, shared across instances)
  1b. autoCache config option on data plugin
  1c. Cache invalidation (key change, explicit invalidate, TTL)
  1d. Update examples (track-list, data-table)

Phase 2: Rebuild utilities
  2a. rebuildList helper (snapshot guard + create)
  2b. smoothRebuild utility (deferred swap)
  2c. Documentation: recommended rebuild patterns

Phase 3: Expand CSS-only updates
  3a. Document which properties update via CSS variables
  3b. Add CSS variable support for more scrollbar properties
```

---

## Estimated Sizes

| Component | Estimated gzip delta |
|-----------|---------------------|
| Data cache seeding | +0.5–1.0 KB (data plugin) |
| `rebuildList` helper | +0.1–0.2 KB |
| `smoothRebuild` utility | +0.3–0.5 KB |
| **Total** | **+0.9–1.7 KB** |
