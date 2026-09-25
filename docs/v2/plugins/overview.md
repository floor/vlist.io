---
created: 2026-05-27
updated: 2026-06-07
status: published
---

# Plugin Overview

vlist v2 ships 17 plugins. Each plugin is tree-shaken — only what you import is bundled.

Base (`createVList` only): **9.9 KB** gzipped.

## Quick Reference

| Plugin | Import | Gzipped Delta | Description |
|--------|--------|---------------|-------------|
| a11y | `a11y()` | +1.2 KB | Baseline keyboard nav + single-select |
| selection | `selection()` | +2.8 KB | Single/multi selection + keyboard nav |
| search | `search()` | +3.2 KB | Search bar: filter/navigate + highlight |
| data | `data()` | +4.8 KB | Async data loading + pagination |
| scrollbar | `scrollbar()` | +2.0 KB | Custom scrollbar UI |
| sortable | `sortable()` | +3.0 KB | Drag-and-drop reordering |
| groups | `groups()` | +5.3 KB | Grouped lists with sticky headers |
| scale | `scale()` | no-op | **Deprecated** — use `scroll: { mode: "bounded" }` in 2.x or synthetic mode from `vlist/synthetic`; removed in 3.0. See [Scroll modes](/docs/v2/scroll-modes) |
| page | `page()` | +0.8 KB | Document/window scroll mode |
| snapshots | `snapshots()` | +1.2 KB | Scroll save/restore |
| transition | `transition()` | +2.0 KB | FLIP-based enter/exit animations |
| autosize | `autosize()` | +1.0 KB | Dynamic item measurement |
| carousel | `carousel()` | +3.6 KB | Infinite-loop carousel (MD3-aligned) |
| **Layout** | | | |
| grid | `grid()` | +2.5 KB | 2D grid layout |
| table | `table()` | +5.8 KB | Virtualized data table |
| masonry | `masonry()` | +4.1 KB | Pinterest-style layout |
| tree | `tree()` | +5.0 KB | Virtualized tree view |

## Usage

```ts
import { createVList, grid, selection, scrollbar } from "vlist";

const list = createVList(config, [
  grid({ columns: 3 }),
  selection({ mode: "multiple" }),
  scrollbar(),
]);
```

Plugins are passed as the second argument to `createVList`. Order in the array does not matter — priorities are fixed internally per plugin.

## Compatibility

Not all plugins can be combined. Layout plugins are mutually exclusive, and some plugins only support flat lists.

| | grid | masonry | table | tree | scale | carousel | transition | sortable |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **grid** | — | ❌ | ❌ | ❌ | — | ❌ | ❌ | ❌ |
| **masonry** | ❌ | — | ❌ | ❌ | — | ❌ | ❌ | ❌ |
| **table** | ❌ | ❌ | — | ❌ | — | ❌ | ❌ | ❌ |
| **tree** | ❌ | ❌ | ❌ | — | — | ❌ | — | ❌ |
| **scale** | — | — | — | — | — | ❌ | — | ❌ |
| **carousel** | ❌ | ❌ | ❌ | ❌ | ❌ | — | ❌ | ❌ |
| **transition** | ❌ | ❌ | ❌ | — | — | ❌ | — | — |
| **sortable** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | — | — |

All combinations not listed above are ✅ compatible.

Incompatibility reasons:

- **grid + masonry / grid + table / masonry + table / tree + any layout** — only one layout plugin can be active at a time.
- **tree + groups** — tree manages its own hierarchy; groups is for flat grouped lists.
- **carousel + scale** — both plugins own virtual scroll space.
- **carousel + groups** — infinite wrap doesn't map to grouped sections.
- **carousel + grid/masonry/table/tree** — carousel manages its own single-axis layout.
- **transition + grid/table/masonry/carousel** — transition uses FLIP animations designed for flat lists only.
- **sortable + grid/masonry/table/tree/scale/carousel** — drag-and-drop reordering requires a flat, fixed-height list.

## Priority Order

Plugins run in a fixed internal priority order (lower number = runs earlier). You do not need to think about this — it is handled automatically regardless of the order you pass plugins to `createVList`.
