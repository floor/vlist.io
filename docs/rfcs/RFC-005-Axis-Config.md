# RFC-005: Axis-Based Internal Model

**Status:** Draft  
**Author:** floor  
**Type:** API Design  
**Created:** 2026-05-27  
**Related:** RFC-002 Core Architecture

---

## Summary

Introduce an `axis` concept as the internal model for layout geometry. The existing `orientation` config property is kept for backward compatibility and user ergonomics — it is resolved into `axis` internally. The `grid()` plugin automatically adds the cross-axis. This unifies the mental model while preserving the current public API.

- **`axis: 'y'`** — vertical list (default)
- **`axis: 'x'`** — horizontal list
- **`axis: ['x', 'y']`** — grid (virtualize both axes)
- **`axis: ['x', 'y', 'z']`** — grid + zoom (future)

**Key distinction:** `orientation` and `direction` are separate concepts:

- **`orientation`** — static config: which axis the list is laid out on (`'vertical' | 'horizontal'`)
- **`direction`** — runtime state: which way the user is currently scrolling (emitted in scroll events, `1 | -1 | 0` internally)

This RFC changes how `orientation` is resolved internally, and makes `direction` axis-aware — reporting `"left" | "right"` for horizontal lists instead of the current `"up" | "down"`.

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
1. **Grid is a separate concept** — but conceptually it's just "add the cross-axis"
2. **`horizontal: boolean`** appears in resolved config, disconnected from the `orientation` string the user passed
3. **No unified model** — `orientation` and `grid()` exist on different planes with no shared abstraction

### Proposed Internal Model

Internally, all layout geometry resolves to an `axis` — a single axis or an array of axes:

| User writes | Resolves to |
|---|---|
| `orientation: 'vertical'` (default) | `axis: 'y'` |
| `orientation: 'horizontal'` | `axis: 'x'` |
| `grid({ columns: 4 })` plugin | `axis: ['x', 'y']` |
| `orientation: 'horizontal'` + `grid()` | `axis: ['y', 'x']` (primary axis first) |

The mental model: **axis names exactly what you're virtualizing**.

---

## Design

### Public API (unchanged)

`orientation` stays as the user-facing config property:

```typescript
interface VListConfig<T> {
  /**
   * Layout orientation.
   *
   * - `'vertical'` — Vertical scrolling (default)
   * - `'horizontal'` — Horizontal scrolling
   *
   * @default 'vertical'
   */
  orientation?: 'vertical' | 'horizontal';

  /**
   * Number of cross-axis divisions (columns for vertical grid).
   * When set, promotes the list to a grid (adds the cross-axis).
   */
  columns?: number;

  /**
   * Gap between items in pixels.
   * For lists, gap is applied along the scroll axis.
   * For grids, gap is applied on both axes.
   */
  gap?: number;
}
```

### Examples

```typescript
// Vertical list (default)
createVList({ item: { height: 48, ... } })

// Horizontal list
createVList({ orientation: 'horizontal', item: { width: 200, ... } })

// Grid via config — columns adds the cross-axis
createVList({ columns: 4, gap: 16, item: { height: 200, ... } })

// Grid via plugin — grid() adds the cross-axis
createVList({ ... }, [grid({ columns: 4, gap: 16 })])

// Horizontal grid
createVList({ orientation: 'horizontal', columns: 3, item: { width: 200, ... } })

// Vertical list with gap between items
createVList({ gap: 8, item: { height: 48, ... } })
```

### Resolved Config (internal)

Internally, the resolved config derives `axis` from `orientation` + presence of grid:

```typescript
type Axis = 'x' | 'y' | 'z';

interface ResolvedConfig {
  readonly axis: Axis | Axis[];   // 'y', 'x', ['x', 'y'], ['x', 'y', 'z']
  readonly horizontal: boolean;   // primary axis === 'x' (shorthand for hot path)
  readonly isGrid: boolean;       // axis is an array with length >= 2
  readonly overscan: number;
  readonly reverse: boolean;
  readonly classPrefix: string;
  readonly interactive: boolean;
}
```

Resolution logic:

```typescript
function resolveConfig(config: VListConfig, plugins: VListPlugin[]): ResolvedConfig {
  const horizontal = config.orientation === 'horizontal';
  const primaryAxis: Axis = horizontal ? 'x' : 'y';
  const crossAxis: Axis = horizontal ? 'y' : 'x';

  const hasGridPlugin = plugins.some(p => p.name === 'grid');
  const hasColumns = config.columns !== undefined;
  const isGrid = hasGridPlugin || hasColumns;

  const axis = isGrid ? [primaryAxis, crossAxis] : primaryAxis;

  return {
    axis,
    horizontal,
    isGrid,
    // ...other fields
  };
}
```

### Grid Plugin Absorption

Three ways to get a grid, all equivalent:

```typescript
// 1. columns on config — simplest
createVList({ columns: 4, gap: 16, ... })

// 2. grid() plugin — for advanced features (responsive, updateGrid)
createVList({ ... }, [grid({ columns: 4, gap: 16 })])

// 3. Both — plugin config takes precedence
createVList({ columns: 4, ... }, [grid({ columns: 6, responsive: { 768: 2 } })])
```

The `grid()` plugin **automatically adds the cross-axis** when present. Setting `columns` on the top-level config does the same. No explicit `axis` property is needed in the public API.

### What About Masonry and Table?

**Masonry** uses `columns` and `gap`, but its layout algorithm (shortest-lane packing) is fundamentally different from grid (uniform rows). It stays a plugin on a single axis — it distributes items across lanes but the scroll is still 1D:

```typescript
createVList({ ... }, [masonry({ columns: 3, gap: 12 })])
```

Masonry does **not** add the cross-axis because it doesn't virtualize on it.

**Table** has its own column model (resizable, typed columns with headers). It stays a plugin on a single axis:

```typescript
createVList({ ... }, [table({ columns: tableColumns })])
```

**Config precedence:** If the user sets `columns` or `gap` on both the top-level config and a plugin, the plugin config takes precedence. Top-level `columns`/`gap` are only used by the core grid engine; plugins like `masonry()` and `table()` manage their own column semantics independently.

### Compatibility Restrictions

| Combination | Allowed? | Notes |
|---|---|---|
| `axis: 'y'` | Yes | Default vertical list |
| `orientation: 'horizontal'` | Yes | Horizontal list (`axis: 'x'`) |
| `columns: N` | Yes | Grid (`axis: ['y', 'x']`) |
| `grid()` plugin | Yes | Grid (`axis: ['y', 'x']`) |
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

// Grid — height is row size, columns from config
createVList({ columns: 4, item: { height: 200, ... } })
```

---

## Axis-Aware Direction

Currently, the scroll event always reports `direction: "up" | "down"` regardless of orientation. This is semantically incorrect for horizontal lists. With the axis model, `direction` maps to the active axis:

### Direction by Axis

| Axis | `1` (forward) | `-1` (backward) |
|---|---|---|
| `y` | `"down"` | `"up"` |
| `x` | `"right"` | `"left"` |
| `z` (future) | `"in"` | `"out"` |

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
function emitScrollEvents(): void {
  _scrollEvt.scrollPosition = state.scrollPosition;
  if (config.horizontal) {
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

Plugins that need the label can derive it from `config.horizontal` + the numeric direction. No hook signature change needed.

---

## Future: The Z-Axis (Zoom)

The axis model naturally extends to a z-axis representing zoom/scale — the gesture you make with two fingers on a trackpad:

```typescript
// Internal — axis: ['x', 'y', 'z']
```

| Axis | Input | Direction |
|---|---|---|
| `x` | Horizontal scroll | `"left"` / `"right"` |
| `y` | Vertical scroll | `"up"` / `"down"` |
| `z` | Pinch / scroll wheel + modifier | `"in"` / `"out"` |

Use cases:
- **Photo gallery** — pinch to zoom changes column count (zoom in = fewer, larger items; zoom out = more, smaller items)
- **Semantic zoom** — zoom out shows categories, zoom in shows individual items
- **Timeline** — zoom in for hours, zoom out for months
- **Maps-style UI** — levels of detail at different zoom levels

This is out of scope for this RFC but the internal type system accommodates it:

```typescript
type Axis = 'x' | 'y' | 'z';
readonly axis: Axis | Axis[];
```

The z-axis would require a new plugin (e.g. `zoom()`) that handles pinch/wheel events and manages scale transitions. It would be a separate RFC.

---

## Migration

### From v2-current to v2-axis

No breaking changes for users — `orientation` is preserved.

| Before | After |
|---|---|
| `orientation: 'vertical'` | No change (default) |
| `orientation: 'horizontal'` | No change |
| `grid({ columns: 4, gap: 16 })` | No change — or use `columns: 4, gap: 16` on config (grid plugin optional for basic grids) |

### Internal Migration

Files that reference `horizontal: boolean` or `orientation`:

- `src/core/types.ts` — Add `axis` and `isGrid` to `ResolvedConfig`
- `src/core/create.ts` — Resolve `orientation` + `columns` / `grid()` into `axis`
- `src/core/pipeline.ts` — Uses `horizontal` (unchanged, derived from axis)
- `src/core/dom.ts` — Uses `horizontal` (unchanged)
- `src/core/scroll.ts` — Uses `horizontal` (unchanged)
- `src/plugins/grid/plugin.ts` — Basic grid can activate from `columns` config; plugin becomes optional
- `src/plugins/*/plugin.ts` — ~12 plugins reference `horizontal` (unchanged)
- `src/rendering/*.ts` — Renderer uses `horizontal` (unchanged)
- `src/types.ts` — Add `columns?` and `gap?` to public config type; widen `direction` type

---

## Open Questions

1. **Should `columns` and `gap` live on the top-level config or nested under a `grid` key?** Top-level is simpler for the common case; nested avoids polluting the config namespace.

2. **Naming: `columns` vs `crossCount`?** `columns` is intuitive for vertical grids but misleading for horizontal grids (where they'd be rows). `crossCount` is axis-agnostic but less familiar.

3. **Should masonry support `orientation: 'horizontal'` for horizontal masonry?** Currently masonry always scrolls vertically. This could be a separate follow-up.

---

## Decision

*Pending review.*
