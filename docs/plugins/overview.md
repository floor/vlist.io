---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Plugin Overview

vlist v2 ships 15 plugins. Each plugin is tree-shaken — only what you import is bundled.

Base (`createVList` only): **{{size:base:gz}} KB** gzipped.

## Quick Reference

| Plugin | Import | Gzipped Delta | Description |
|--------|--------|---------------|-------------|
| a11y | `a11y()` | +{{size:a11y:delta}} KB | Baseline keyboard nav + single-select |
| selection | `selection()` | +{{size:selection:delta}} KB | Single/multi selection + keyboard nav |
| search | `search()` | +{{size:search:delta}} KB | Search bar: filter/navigate + highlight |
| data | `data()` | +{{size:data:delta}} KB | Async data loading + pagination |
| scrollbar | `scrollbar()` | +{{size:scrollbar:delta}} KB | Custom scrollbar UI |
| sortable | `sortable()` | +{{size:sortable:delta}} KB | Drag-and-drop reordering |
| groups | `groups()` | +{{size:groups:delta}} KB | Grouped lists with sticky headers |
| scale | `scale()` | +{{size:scale:delta}} KB | 1M+ items via scroll compression |
| page | `page()` | +{{size:page:delta}} KB | Document/window scroll mode |
| snapshots | `snapshots()` | +{{size:snapshots:delta}} KB | Scroll save/restore |
| transition | `transition()` | +{{size:transition:delta}} KB | FLIP-based enter/exit animations |
| autosize | `autosize()` | +{{size:autosize:delta}} KB | Dynamic item measurement |
| **Layout** | | | |
| grid | `grid()` | +{{size:grid:delta}} KB | 2D grid layout |
| table | `table()` | +{{size:table:delta}} KB | Virtualized data table |
| masonry | `masonry()` | +{{size:masonry:delta}} KB | Pinterest-style layout |
| tree | `tree()` | +{{size:tree:delta}} KB | Virtualized tree view |

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

| | grid | masonry | table | tree | scale | transition | sortable |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **grid** | — | ❌ | ❌ | ❌ | — | ❌ | ❌ |
| **masonry** | ❌ | — | ❌ | ❌ | — | ❌ | ❌ |
| **table** | ❌ | ❌ | — | ❌ | — | ❌ | ❌ |
| **tree** | ❌ | ❌ | ❌ | — | — | — | — |
| **scale** | — | — | — | — | — | — | ❌ |
| **transition** | ❌ | ❌ | ❌ | — | — | — | — |
| **sortable** | ❌ | ❌ | ❌ | — | ❌ | — | — |

All combinations not listed above are ✅ compatible.

Incompatibility reasons:

- **grid + masonry / grid + table / masonry + table / tree + any layout** — only one layout plugin can be active at a time.
- **tree + groups** — tree manages its own hierarchy; groups is for flat grouped lists.
- **transition + grid/table/masonry** — transition uses FLIP animations designed for flat lists only.
- **sortable + grid/masonry/table/scale** — drag-and-drop reordering requires a flat, fixed-height list.

## Priority Order

Plugins run in a fixed internal priority order (lower number = runs earlier). You do not need to think about this — it is handled automatically regardless of the order you pass plugins to `createVList`.
