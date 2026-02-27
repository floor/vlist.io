# Architecture & Competitive Position

> How vlist is built, what makes it unique, and where it stands against competitors.

*Current version: 1.1.0*

---

## Builder Pattern Architecture

vlist uses a composable builder pattern — `vlist().use(withFeature()).build()` — where each feature is a self-contained plugin with priority-ordered initialization. This enables true tree-shaking: consumers only pay for what they use.

```typescript
import { vlist, withAsync, withSelection, withScale } from '@floor/vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: myData,
})
  .use(withAsync({ adapter: myAdapter }))
  .use(withSelection({ mode: 'multiple' }))
  .use(withScale())
  .build();
```

### Feature Isolation

Features don't import from each other. They extend the builder context with typed hooks and methods. This prevents circular dependencies and enables true tree-shaking.

### Source Structure

```
src/
├── builder/       # Core builder pattern (orchestrates features, wires lifecycle)
├── events/        # Event emitter
├── features/      # Each feature is a self-contained plugin
│   ├── async/     # Infinite scroll, sparse storage, placeholders
│   ├── grid/      # 2D grid layout
│   ├── masonry/   # Pinterest-style layout
│   ├── page/      # Window/document scrolling
│   ├── scale/     # 1M+ item compression
│   ├── scrollbar/ # Custom scrollbar + scroll controller
│   ├── sections/  # Sticky headers / grouped lists
│   ├── selection/ # Single/multi selection with keyboard
│   └── snapshots/ # Scroll position save/restore
├── rendering/     # Virtual rendering, size cache, viewport
└── styles/        # CSS (no inline styles)
```

### Zero-Allocation Hot Path

The scroll handler, render loop, and visible range calculation allocate nothing. Reusable position objects, circular buffer velocity tracking, and RAF throttling keep the hot path clean.

### Prefix-Sum Size Cache

Variable sizes use an O(1) offset lookup via prefix-sum array with O(log n) binary search for index-at-offset. Fixed sizes use pure multiplication — zero overhead. The `SizeCache` is fully dimension-agnostic — it works identically for vertical heights and horizontal widths. The `MeasuredSizeCache` extends this for auto-measurement (Mode B), wrapping the variable cache with measurement tracking.

---

## Competitive Position

### Feature Comparison

| Feature | vlist | TanStack Virtual | react-virtuoso |
|---------|-------|-----------------|----------------|
| Zero dependencies | ✅ | ❌ | ❌ |
| Framework-agnostic (vanilla) | ✅ | ✅ | ❌ (React only) |
| 1M+ item compression | ✅ **(unique)** | ❌ | ❌ |
| Built-in selection (single/multi/keyboard) | ✅ **(unique)** | ❌ | ❌ |
| Custom scrollbar | ✅ | ❌ | ❌ |
| Grid layout | ✅ | ✅ | ❌ |
| Masonry layout | ✅ | ❌ | ❌ |
| Sticky headers / grouped lists | ✅ | ❌ | ✅ |
| Reverse mode (chat) | ✅ | ❌ | ✅ |
| Horizontal scrolling | ✅ | ✅ | ❌ |
| Window scrolling | ✅ | ✅ | ✅ |
| Scroll save/restore | ✅ | ❌ | ❌ |
| Wrap navigation (carousel) | ✅ **(unique)** | ❌ | ❌ |
| Infinite scroll w/ adapter | ✅ | ❌ (BYO) | ✅ |
| Auto-size measurement | ✅ | ✅ | ✅ |
| Public benchmarks | ✅ | ❌ | ❌ |
| React/Vue/Svelte/Solid adapters | ✅ (4) | ✅ (4) | ❌ (React only) |

### Bundle Size Comparison

| Library | Core (gzipped) | Full (gzipped) |
|---------|---------------|----------------|
| **@floor/vlist** | **~3.0 KB** | ~24.5 KB |
| @tanstack/virtual | ~5.5 KB | — |
| react-virtuoso | ~15 KB | — |

See [Bundle Size](./bundle-size.md) for detailed analysis and tree-shaking breakdown.

### Unique Differentiators

These features exist in no competing vanilla virtual list library:

1. **1M+ item compression** — Automatic virtual scroll remapping for lists exceeding browser scroll limits (`withScale`)
2. **Built-in selection** — Single, multi, and keyboard-navigated selection with `aria-activedescendant` (`withSelection`)
3. **Wrap navigation** — Circular `scrollToIndex` for carousels and wizard-style UIs (`scroll.wrap`)
4. **Custom scrollbar** — Skinnable, auto-hiding scrollbar built in; native or none via config (`scroll.scrollbar`)
5. **Builder pattern** — Composable feature plugins with true tree-shaking; no other virtual list uses this pattern

---

## Framework Adapters

Four framework adapters ship as separate packages, each a thin wrapper:

| Adapter | Package | Exports |
|---------|---------|---------|
| React | `vlist-react` | `useVList` hook, `useVListEvent` |
| Vue 3 | `vlist-vue` | `useVList` composable, `useVListEvent` |
| Svelte | `vlist-svelte` | `vlist` action, `onVListEvent` |
| SolidJS | `vlist-solidjs` | `createVList` primitive, `createVListEvent` |

**Design principle:** Mount-based (not virtual-items-based like TanStack Virtual). The framework manages the container element lifecycle, while vlist does all DOM rendering internally — preserving vlist's full performance model with zero virtual DOM overhead.

Each adapter:
- Auto-wires all features (async, grid, sections, selection, scale, scrollbar, snapshots)
- Syncs items reactively when the framework's data changes
- Provides ergonomic event subscription with automatic cleanup
- Externalizes both the framework and vlist — the adapter bundle contains only wrapper code

See [Framework Adapters](../frameworks.md) for install, usage, event subscription, and config reference per framework.

---

## Item Sizing Modes

### Mode A — Known Sizes

Sizes are known upfront, either fixed or computed from data:

```typescript
// Fixed (zero-overhead fast path)
item: { height: 48, template: myTemplate }

// Variable (prefix-sum cache)
item: { height: (index) => items[index].type === 'header' ? 64 : 48, template: myTemplate }
```

### Mode B — Estimated + Measured

Sizes are estimated, then measured after render via ResizeObserver:

```typescript
item: { estimatedHeight: 120, template: myTemplate }
```

Mode B extends `SizeCache` with a `MeasuredSizeCache` that tracks which items have been measured vs estimated. Once measured, an item behaves identically to Mode A. Scroll corrections are applied immediately per-batch in the ResizeObserver callback, masked by the user's own scroll motion.

See [Measurement](../internals/measurement.md) for full internals.

---

## Development History

vlist was developed over 4 weeks against a 14-item roadmap spanning four phases:

| Phase | Items | Focus |
|-------|-------|-------|
| **1 — Remove Dealbreakers** | Variable sizes, smooth scrollToIndex, bundle shrink | Core viability |
| **2 — Expand Layout Modes** | Horizontal, grid, window scrolling | Layout coverage |
| **3 — Advanced Patterns** | Sticky headers, reverse mode, framework adapters | Real-world patterns |
| **4 — Prove It** | Benchmarks, auto-size, accessibility, scroll config | Polish and proof |

All 14 items shipped. Several features exceeded the original scope: SolidJS adapter (not in roadmap), builder pattern architecture (refactored from monolithic API), velocity-based infinite scroll, wrap navigation, masonry layout, and 13 interactive examples.

---

## Related Documentation

- [Bundle Size](./bundle-size.md) — Detailed bundle analysis and tree-shaking
- [Benchmarks](./benchmarks.md) — Live performance suites
- [Testing](./testing.md) — Test suite coverage
- [Structure](../internals/structure.md) — Complete source code map
- [Context](../internals/context.md) — BuilderContext and feature system
- [Measurement](../internals/measurement.md) — Auto-size measurement internals

---

*@floor/vlist v1.1.0 — zero dependencies, composable features, best-in-class performance.*