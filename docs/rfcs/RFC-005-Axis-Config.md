---
created: 2026-05-27
updated: 2026-05-28
status: implemented (Phase 1)
---

# RFC-005: Axis-Based Internal Model

**Status:** Implemented (Phase 1)  
**Author:** floor  
**Type:** API Design  
**Created:** 2026-05-27  
**Updated:** 2026-05-27  
**Related:** RFC-002 Core Architecture  
**Discussion:** [#84](https://github.com/floor/vlist/discussions/84)

---

## Summary

Introduce an `AxisConfig` object as the internal model for layout geometry. The existing `orientation` config property is kept for backward compatibility and user ergonomics — it is resolved into `AxisConfig` internally. The `grid()` plugin sets the `cross` axis when present. This unifies the mental model while preserving the current public API.

```typescript
interface AxisConfig {
  primary: 'x' | 'y';
  cross?: 'x' | 'y';
}
```

- **`{ primary: 'y' }`** — vertical list (default)
- **`{ primary: 'x' }`** — horizontal list
- **`{ primary: 'y', cross: 'x' }`** — vertical grid (adds cross-axis layout dimension)
- **`{ primary: 'x', cross: 'y' }`** — horizontal grid

**Key distinction:** `orientation` and `direction` are separate concepts:

- **`orientation`** — static config: which axis the list is laid out on (`'vertical' | 'horizontal'`)
- **`direction`** — runtime state: which way the user is currently scrolling (emitted in scroll events, `1 | -1 | 0` internally)

This RFC changes how `orientation` is resolved internally, and makes `direction` axis-aware — reporting `"left" | "right"` for horizontal lists instead of the current `"up" | "down"`.

---

## Scope

This RFC is scoped to **Phase 1: internal model + scroll direction fix**. No public API changes.

| Phase | Scope | Status |
|---|---|---|
| **Phase 1** (this RFC) | Internal `AxisConfig` on `ResolvedConfig`, derive `hasCrossAxis`, remove `horizontal` boolean, fix scroll event direction labels | **Implemented** |
| **Phase 2** (separate RFC) | Whether/how grid config gets a shorthand on `CreateVListConfig` | **Declined** — see note below |
| **Phase 3** (future) | `z`-axis / zoom vocabulary — only when a zoom plugin motivates it | Deferred |

**Phase 2 disposition:** Declined. The v2 API (`createVList(config, [grid({ columns: 3 })])`) is already a single explicit call — there is no builder ceremony to shortcut around. Promoting grid config to `CreateVListConfig` would either break plugin isolation (core knows about grid) or require auto-detection that obscures what's happening. The original deferral reasons still hold: `gap` precedence confusion with `item.gap`, asymmetry with masonry/table column semantics, and no user demand. If users want shorter syntax, the right place is framework adapters — React/Vue/Svelte/Solid wrappers already translate convenience props into plugin arrays. A `<VList grid={3} scrollbar />` prop is natural in JSX/templates without polluting the core config. The core stays explicit; each adapter provides the DX its community expects.

---

## Motivation

### Current API

The v2 API uses two separate mechanisms for layout geometry:

```typescript
// Vertical list (default)
createVList({ orientation: 'vertical', ... })

// Horizontal list
createVList({ orientation: 'horizontal', ... })

// Grid — entirely separate plugin with its own config
createVList({ ... }, [grid({ columns: 4, gap: 16 })])
```

Problems:
1. **Grid is a separate concept** — but conceptually it's just "add a cross-axis layout dimension"
2. **`horizontal: boolean`** appears in resolved config, disconnected from the `orientation` string the user passed
3. **No unified model** — `orientation` and `grid()` exist on different planes with no shared abstraction

### Proposed Internal Model

Internally, all layout geometry resolves to an `AxisConfig` object:

| User writes | Resolves to |
|---|---|
| `orientation: 'vertical'` (default) | `{ primary: 'y' }` |
| `orientation: 'horizontal'` | `{ primary: 'x' }` |
| `grid({ columns: 4 })` plugin | `{ primary: 'y', cross: 'x' }` |
| `orientation: 'horizontal'` + `grid()` | `{ primary: 'x', cross: 'y' }` |

The mental model: **axis names exactly what you're laying out**.

---

## Design

### Public API (unchanged)

`orientation` stays as the user-facing config property. **No new fields are added to `CreateVListConfig`** — grid configuration stays exclusively on the `grid()` plugin.

```typescript
interface CreateVListConfig<T> {
  orientation?: 'vertical' | 'horizontal';
  // ... all other fields unchanged
}
```

**Why no top-level `columns` / `gap`:**
1. `gap` already lives under `item.gap` in the current config. A top-level `gap` would create three-way precedence confusion (top-level vs `item.gap` vs plugin gap).
2. Grid, masonry, and table all have their own column semantics. Promoting `columns` to core creates an asymmetry where grid is half-core/half-plugin while others stay fully plugin.
3. This decision may be revisited in Phase 2 via a nested `grid: { columns, gap }` key — but that's a separate conversation.

### Resolved Config (internal)

Internally, the resolved config adds `axis` and `hasCrossAxis`. The `horizontal` boolean is **not** kept — all code derives axis information from `config.axis.primary` via a local `const isX = config.axis.primary === "x"`:

```typescript
type Axis = 'x' | 'y';

interface AxisConfig {
  readonly primary: Axis;
  readonly cross?: Axis;
}

interface ResolvedConfig {
  readonly axis: AxisConfig;
  readonly hasCrossAxis: boolean;  // axis.cross !== undefined
  readonly overscan: number;
  readonly reverse: boolean;
  readonly classPrefix: string;
  readonly interactive: boolean;
  // ... padding, striped, gap fields unchanged
}
```

Resolution logic:

```typescript
function resolveAxis(
  orientation: 'vertical' | 'horizontal' | undefined,
  plugins: VListPlugin[],
): AxisConfig {
  const primary: Axis = orientation === 'horizontal' ? 'x' : 'y';

  const hasGridPlugin = plugins.some(p => p.name === 'grid');
  if (hasGridPlugin) {
    const cross: Axis = primary === 'x' ? 'y' : 'x';
    return { primary, cross };
  }
  return { primary };
}

function resolveConfig(raw: CreateVListConfig, plugins: VListPlugin[]): ResolvedConfig {
  const axis = resolveAxis(raw.orientation, plugins);

  return {
    axis,
    hasCrossAxis: axis.cross !== undefined,
    // ...other fields unchanged
  };
}
```

Consumers derive axis booleans locally where needed:

```typescript
const isX = config.axis.primary === "x";
```

**Why `hasCrossAxis` over `isGrid`:** The field describes what it means (a cross-axis layout dimension exists), not where it comes from (the grid plugin). This is more accurate — if a future plugin also sets a cross axis, the name still holds.

**Why no `horizontal` shorthand:** An earlier draft kept `horizontal: boolean` on `ResolvedConfig` as a hot-path shorthand. During implementation, this was removed — having both `axis` and `horizontal` creates two sources of truth for the same concept. The `isX` local variable pattern is just as fast (the JIT inlines it) and eliminates the redundancy.

**Why a named object over an array:** An earlier draft used `axis: ['x', 'y']` with positional semantics (primary first). Reviewers correctly identified this as error-prone — reading `axis[0]` vs `axis.primary` in plugin code is a meaningful clarity difference. The named shape is self-documenting and eliminates ordering bugs.

### Grid Plugin Interaction

The `grid()` plugin **adds a cross-axis layout dimension** when present. Grid configuration stays on the plugin:

```typescript
// Grid via plugin — the only way to get a grid
createVList({ ... }, [grid({ columns: 4, gap: 16 })])

// Horizontal grid
createVList({ orientation: 'horizontal', ... }, [grid({ columns: 3, gap: 12 })])
```

The `grid()` plugin does not "virtualize both axes" — it virtualizes rows along the primary scroll axis and lays out fixed cross-axis divisions. The `cross` axis in `AxisConfig` represents a layout dimension, not independent viewporting.

### What About Masonry and Table?

**Masonry** uses columns and gap, but its layout algorithm (shortest-lane packing) is fundamentally different from grid (uniform rows). It stays a plugin on a single axis — it distributes items across lanes but the scroll is still 1D:

```typescript
createVList({ ... }, [masonry({ columns: 3, gap: 12 })])
```

Masonry does **not** set the cross-axis because it doesn't add a cross-axis layout dimension.

**Table** has its own column model (resizable, typed columns with headers). It stays a plugin on a single axis:

```typescript
createVList({ ... }, [table({ columns: tableColumns })])
```

### Compatibility Restrictions

| Combination | Allowed? | Notes |
|---|---|---|
| Default | Yes | Vertical list (`{ primary: 'y' }`) |
| `orientation: 'horizontal'` | Yes | Horizontal list (`{ primary: 'x' }`) |
| `grid()` plugin | Yes | Grid (`{ primary: 'y', cross: 'x' }`) |
| Grid + `groups()` | Yes | Grouped grid |
| Grid + `masonry()` | No | Masonry has its own layout |
| Grid + `table()` | No | Table has its own layout |
| `orientation: 'horizontal'` + `groups()` | No | Groups require vertical |
| `orientation: 'horizontal'` + `reverse: true` | No | Reverse requires vertical |

### Item Size Resolution

The `height` / `width` naming on `item` config stays — it maps to physical dimensions:

```typescript
// Vertical list — height is main axis size
createVList({ item: { height: 48, ... } })

// Horizontal list — width is main axis size
createVList({ orientation: 'horizontal', item: { width: 200, height: 400, ... } })

// Grid — height is row size, columns from plugin
createVList({ item: { height: 200, ... } }, [grid({ columns: 4 })])
```

---

## Axis-Aware Direction

Currently, the scroll event always reports `direction: "up" | "down"` regardless of orientation. This is semantically incorrect for horizontal lists. With the axis model, `direction` maps to the active axis:

### Direction by Axis

| Axis | `1` (forward) | `-1` (backward) |
|---|---|---|
| `y` | `"down"` | `"up"` |
| `x` | `"right"` | `"left"` |

### Scroll Event Type

```typescript
// Current
scroll: { scrollPosition: number; direction: "up" | "down" }

// Proposed
scroll: { scrollPosition: number; direction: "up" | "down" | "left" | "right" }
```

### Implementation

The internal `scrollDirection` stays as `1 | -1 | 0`. Only the emitted event label changes based on the primary axis:

```typescript
const isX = config.axis.primary === "x";

function emitScrollEvents(): void {
  _scrollEvt.scrollPosition = state.scrollPosition;
  if (isX) {
    _scrollEvt.direction = state.scrollDirection > 0 ? "right" : "left";
  } else {
    _scrollEvt.direction = state.scrollDirection > 0 ? "down" : "up";
  }
  emitter.emit("scroll", _scrollEvt);
}
```

### Affected Modules

- `src/core/create.ts` — `emitScrollEvents()` maps `scrollDirection` to the correct label
- `src/types.ts` — `VListEvents.scroll.direction` type widens to `"up" | "down" | "left" | "right"`
- `src/plugins/scrollbar/controller.ts` — `ScrollDirection` type updated

Internal consumers that use the numeric `scrollDirection` (`1 | -1 | 0`) on `EngineState` are unaffected — only the string label in the public event changes.

### AfterScrollHook

The internal `AfterScrollHook` signature stays numeric:

```typescript
type AfterScrollHook = (scrollPosition: number, direction: number) => void;
```

Plugins that need the label can derive it from `config.axis.primary` + the numeric direction. No hook signature change needed.

---

## Future: The Z-Axis (Zoom)

> **Note:** This section is aspirational context only. Z-axis support is deferred to a future RFC and will only be pursued when a concrete zoom plugin motivates it.

The axis model could extend to a z-axis representing zoom/scale:

| Axis | Input | Direction |
|---|---|---|
| `x` | Horizontal scroll | `"left"` / `"right"` |
| `y` | Vertical scroll | `"up"` / `"down"` |
| `z` | Pinch / scroll wheel + modifier | `"in"` / `"out"` |

Use cases: photo gallery zoom, semantic zoom, timeline zoom, maps-style LOD.

The current `Axis` type is intentionally limited to `'x' | 'y'`. Widening to include `'z'` would happen in a separate RFC alongside the zoom plugin implementation.

---

## Migration

### From v2-current to v2-axis (Phase 1)

No breaking changes for users — `orientation` is preserved, no new config fields.

The only user-visible change is the scroll event `direction` label: horizontal lists will correctly report `"left"` / `"right"` instead of `"up"` / `"down"`. This is a bug fix, not a breaking change — any code that was checking `direction === "down"` on a horizontal list was already getting incorrect semantics.

### Internal Migration

The `horizontal` boolean was fully removed from `ResolvedConfig` and all internal code. Every reference was replaced with `config.axis.primary === "x"` (aliased as `isX` locally). This affected 37 files (+347/−304 lines):

- `src/core/types.ts` — Add `Axis`, `AxisConfig` types; add `axis` and `hasCrossAxis` to `ResolvedConfig`; remove `horizontal`
- `src/core/create.ts` — Add `resolveAxis()`; fix `emitScrollEvents()` direction labels; rename `horizontal` → `isX`
- `src/core/pipeline.ts` — Replace `horizontal: boolean` with `sizeProp: "width" | "height"` on `RenderConfig` (pre-resolved at init, zero branching on hot path)
- `src/core/dom.ts` — Rename parameter `horizontal` → `isX` (CSS class strings `--horizontal` and `aria-orientation="horizontal"` preserved)
- `src/core/scroll.ts` — Rename `ScrollHandlerConfig.horizontal` → `isX`
- `src/plugins/*/plugin.ts` — All 12 plugins: `ctx.config.horizontal` → `ctx.config.axis.primary === "x"`
- `src/rendering/*.ts` — Renderer params renamed `horizontal` → `isX`
- `src/types.ts` — Widen scroll event `direction` type to `"up" | "down" | "left" | "right"`
- `src/plugins/scrollbar/controller.ts` — Direction assignments made axis-aware; rename `horizontal` → `isX`
- `src/index.ts`, `src/core/index.ts` — Export `Axis` and `AxisConfig` types

---

## Open Questions

1. ~~**Should `columns` and `gap` live on the top-level config or nested under a `grid` key?**~~ **Resolved:** Neither for Phase 1. Grid config stays on the `grid()` plugin. A nested shorthand may be explored in Phase 2.

2. ~~**Naming: `columns` vs `crossCount`?**~~ **Resolved:** Not applicable to Phase 1 since no top-level config is added. The `grid()` plugin keeps its existing `columns` naming.

3. **Should masonry support `orientation: 'horizontal'` for horizontal masonry?** Currently masonry always scrolls vertically. This could be a separate follow-up.

---

## Decision

**Phase 1 implemented** on branch `feat/axis-config` (3 commits, 37 files, all 3326 tests pass, typecheck clean).

Key decisions from the review and implementation:
- **Named `AxisConfig` object** over array-based axis ordering (consensus from all reviewers)
- **No public config changes** in Phase 1 — `columns`/`gap` stay off `CreateVListConfig` to avoid config pollution and preserve plugin symmetry
- **"Adds a cross-axis layout dimension"** over "virtualizes both axes" — the grid does not independently viewport the cross-axis
- **Phased rollout** — Phase 1 is internal model + scroll direction fix; public API shorthand deferred to Phase 2
- **`hasCrossAxis` over `isGrid`** — describes the semantic (cross-axis exists) rather than the source (grid plugin). Decided during implementation.
- **Full `horizontal` removal** — the RFC originally proposed keeping `horizontal: boolean` as a hot-path shorthand. During implementation, this was dropped in favor of local `isX` derivation to avoid two sources of truth. No performance cost (JIT inlines the comparison).
