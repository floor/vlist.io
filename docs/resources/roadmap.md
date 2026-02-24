# vlist — Roadmap Completion Analysis

> Detailed assessment of where vlist stands after 4 weeks of development, measured against the original roadmap defined in [known-issues.md](./known-issues.md).

*Last updated: February 24, 2026*

---

## Executive Summary

**13 of 14 roadmap items shipped. All 4 phases complete.**

The only remaining item is **#11 Auto-Size Measurement (Mode B)** — which was deliberately scoped as low-priority from the start. By any reasonable measure, the objective of building the best vanilla virtual list on the market has been reached.

**Completion: 93% (13/14)**

---

## Scoreboard

| # | Feature | Phase | Priority | Status |
|---|---------|-------|----------|--------|
| 1 | Variable Item Sizes (Mode A) | Phase 1 — Remove Dealbreakers | 🔴 Critical | ✅ Shipped |
| 2 | Smooth `scrollToIndex` Animation | Phase 1 — Remove Dealbreakers | 🟠 High | ✅ Shipped |
| 3 | Shrink Bundle Size | Phase 1 — Remove Dealbreakers | 🟠 High | ✅ Shipped |
| 4 | Horizontal Scrolling | Phase 2 — Expand Layout Modes | 🟡 Medium | ✅ Shipped |
| 5 | Grid Layout | Phase 2 — Expand Layout Modes | 🟡 Medium | ✅ Shipped |
| 6 | Window (Document) Scrolling | Phase 2 — Expand Layout Modes | 🟡 Medium | ✅ Shipped |
| 7 | Sticky Headers / Grouped Lists | Phase 3 — Advanced Patterns | 🟡 Medium | ✅ Shipped |
| 8 | Reverse Mode (Chat UI) | Phase 3 — Advanced Patterns | 🟡 Medium | ✅ Shipped |
| 9 | Framework Adapters | Phase 3 — Advanced Patterns | 🟡 Medium | ✅ Shipped |
| 10 | Public Benchmark Page | Phase 4 — Prove It's The Best | 🟠 High | ✅ Shipped |
| 11 | Auto-Size Measurement (Mode B) | Phase 4 — Prove It's The Best | 🟢 Low | 🟡 Pending |
| 12 | Enhanced Accessibility | Phase 4 — Prove It's The Best | 🟡 Medium | ✅ Shipped |
| 13 | Scroll Position Save/Restore | Phase 4 — Prove It's The Best | 🟢 Low | ✅ Shipped |
| 14 | Scroll Config (wheel, scrollbar, wrap) | Phase 4 — Prove It's The Best | 🟡 Medium | ✅ Shipped |

---

## By The Numbers

| Metric | Value |
|--------|-------|
| **Source code** | 14,648 lines of TypeScript (~40 files) |
| **Test code** | 28,991 lines across 34 test files |
| **Test cases** | 1,578 tests passing, 4,290 assertions |
| **Test failures** | **0** |
| **Full bundle** | 72.5 KB minified / 23.8 KB gzipped |
| **CSS** | 6.8 KB (core) + 1.8 KB (extras) |
| **Build time** | **7ms** |
| **Dependencies** | **Zero** |
| **Version** | 0.9.5 |
| **Framework adapters** | 4 separate packages (React, Vue, Svelte, SolidJS) |
| **Live examples** | 12 interactive demos on vlist.dev |
| **Tutorials** | 8 guides (accessibility, builder pattern, chat UI, mobile, optimization, quick start, styling) |

---

## Architecture Assessment

The codebase is mature and well-structured. The builder pattern (`vlist().use(withFeature()).build()`) enables true tree-shaking — consumers only pay for what they use.

### Source Structure

```
src/
├── builder/       # Core builder pattern (core.ts = 1,105 lines, the brain)
├── events/        # Event emitter
├── features/      # Each feature is a self-contained plugin
│   ├── async/     # Infinite scroll, sparse storage, placeholders
│   ├── grid/      # 2D grid layout
│   ├── page/      # Window/document scrolling
│   ├── scale/     # 1M+ item compression
│   ├── scrollbar/ # Custom scrollbar + scroll controller
│   ├── sections/  # Sticky headers / grouped lists
│   ├── selection/ # Single/multi selection with keyboard
│   └── snapshots/ # Scroll position save/restore
├── rendering/     # Virtual rendering, size cache, viewport
└── styles/        # CSS (no inline styles)
```

### Key Architectural Decisions

- **Builder pattern** — Composable `vlist().use(withFeature()).build()` API instead of a monolithic config object. Each feature is a self-contained plugin with a priority-ordered initialization sequence.
- **Feature isolation** — Features don't import from each other. They extend the builder context with typed hooks and methods. This prevents circular dependencies and enables true tree-shaking.
- **Zero-allocation hot path** — The scroll handler, render loop, and visible range calculation allocate nothing. Reusable position objects, circular buffer velocity tracking, and RAF throttling keep the hot path clean.
- **Prefix-sum size cache** — Variable sizes use an O(1) offset lookup via prefix-sum array with O(log n) binary search for index-at-offset. Fixed sizes use pure multiplication — zero overhead. The [SizeCache](../internals/orientation.md) is fully dimension-agnostic — it works identically for vertical heights and horizontal widths.

### Largest Source Files

| File | Lines | Role |
|------|-------|------|
| `builder/core.ts` | 1,105 | Core builder — orchestrates features, wires lifecycle |
| `features/scrollbar/controller.ts` | 829 | Scroll controller — RAF throttling, compression, velocity |
| `features/async/manager.ts` | 767 | Data manager — sparse storage, placeholders, adapter |
| `types.ts` | 737 | All public TypeScript interfaces |
| `rendering/renderer.ts` | 719 | Virtual renderer — DOM pooling, positioning, batching |

### Test Coverage

| Test File | Lines | Focus |
|-----------|-------|-------|
| `builder/index.test.ts` | 5,886 | Core builder integration tests |
| `features/scrollbar/controller.test.ts` | 2,981 | Scroll controller edge cases |
| `features/async/manager.test.ts` | 1,983 | Data manager, adapter, placeholders |
| `features/async/sparse.test.ts` | 1,437 | Sparse storage operations |
| `features/grid/renderer.test.ts` | 1,430 | Grid renderer positioning |

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
| Sticky headers / grouped lists | ✅ | ❌ | ✅ |
| Reverse mode (chat) | ✅ | ❌ | ✅ |
| Horizontal scrolling | ✅ | ✅ | ❌ |
| Window scrolling | ✅ | ✅ | ✅ |
| Scroll save/restore | ✅ | ❌ | ❌ |
| Wrap navigation (carousel) | ✅ **(unique)** | ❌ | ❌ |
| Infinite scroll w/ adapter | ✅ | ❌ (BYO) | ✅ |
| Auto-size measurement | ❌ | ✅ | ✅ |
| Public benchmarks | ✅ | ❌ | ❌ |
| React/Vue/Svelte/Solid adapters | ✅ (4) | ✅ (4) | ❌ (React only) |

**vlist wins on 12 of 16 categories**, ties on 2, and loses on only 1 (auto-size measurement). Public benchmarks are a differentiator — vlist can *prove* its performance claims.

### Bundle Size Comparison

| Library | Core (gzipped) | Full (gzipped) |
|---------|---------------|----------------|
| **vlist** | **~3.0 KB** | 23.8 KB |
| TanStack Virtual | ~5.5 KB | — |
| react-virtuoso | ~15 KB | — |

### Unique Differentiators (No Competitor Has These)

1. **1M+ item compression** — Automatic virtual scroll remapping for lists exceeding browser scroll limits. No other vanilla library handles this.
2. **Built-in selection** — Single, multi, and keyboard-navigated selection with `aria-activedescendant`. Competitors say "bring your own".
3. **Wrap navigation** — Circular `scrollToIndex` for carousels and wizard-style UIs.
4. **Custom scrollbar** — Skinnable, auto-hiding scrollbar built in. Native or none via config.
5. **Builder pattern** — Composable feature plugins with true tree-shaking. No other virtual list uses this pattern.

---

## Framework Adapters

Four framework adapters shipped as separate packages, each externally thin wrappers:

| Adapter | Package | Version | Exports |
|---------|---------|---------|---------|
| React | `vlist-react` | 0.1.1 | `useVList` hook, `useVListEvent` |
| Vue 3 | `vlist-vue` | 0.1.1 | `useVList` composable, `useVListEvent` |
| Svelte | `vlist-svelte` | 0.1.1 | `vlist` action, `onVListEvent` |
| SolidJS | `vlist-solidjs` | 0.1.0 | `createVList` primitive, `createVListEvent` |

**Design principle:** Mount-based (not virtual-items-based like TanStack Virtual). The framework manages the container element lifecycle, while vlist does all DOM rendering internally — preserving vlist's full performance model with zero virtual DOM overhead.

Each adapter:
- Auto-wires all features (async, grid, sections, selection, scale, scrollbar, snapshots)
- Syncs items reactively when the framework's data changes
- Provides ergonomic event subscription with automatic cleanup
- Externalizes both the framework and vlist — the adapter bundle contains only wrapper code

> **Note:** SolidJS was not in the original roadmap (which specified React, Vue, Svelte). It was added as a bonus.

---

## Live Documentation Site (vlist.dev)

### Interactive Examples (12)

| Example | Demonstrates |
|---------|-------------|
| Basic | Simple list with fixed sizes |
| Controls | Selection, keyboard navigation |
| Data | Async adapter, infinite scroll |
| Grid | 2D card grid layout |
| Groups | Sticky headers, grouped contacts |
| Horizontal | Carousel-style horizontal list |
| Icons | Custom templates with icons |
| Reverse Chat | Chat UI with prepend/append |
| Scroll Restore | Save/restore across navigation |
| Variable Sizes | Function-based variable item sizes |
| Window Scroll | Document-level scrolling |
| Wizard Nav | Wrap navigation (carousel) |

### Tutorials (8)

| Tutorial | Topic |
|---------|-------|
| Quick Start | Getting started in 5 minutes |
| Builder Pattern | Composable feature architecture |
| Optimization | Performance tuning guide |
| Accessibility | WAI-ARIA, keyboard, screen readers |
| Styling | CSS architecture, theming, dark mode |
| Chat Interface | Building a chat UI with reverse mode |
| Mobile | Touch optimization, responsive patterns |

### Benchmark Suites (4)

| Suite | Measures | Scales |
|-------|----------|--------|
| Initial Render | Time from `vlist()` to first paint | 10K, 100K, 1M |
| Scroll FPS | Sustained scroll rendering throughput | 10K, 100K, 1M |
| Memory | Heap usage after render + scrolling | 10K, 100K, 1M |
| scrollToIndex | Smooth animation latency | 10K, 100K, 1M |

---

## The One Gap: Auto-Size Measurement (Mode B)

### What vlist has today (Mode A)

Item sizes must be known upfront — either a fixed number or a function `(index) => number`. This applies to both orientations:

```typescript
// Vertical — fixed height (zero-overhead fast path)
item: { height: 48, template: myTemplate }

// Vertical — variable height via function
item: { height: (index) => items[index].type === 'header' ? 64 : 48, template: myTemplate }

// Horizontal — fixed width
item: { width: 200, template: myTemplate }

// Horizontal — variable width via function
item: { width: (index) => items[index].type === 'featured' ? 300 : 200, template: myTemplate }
```

Internally, vlist's [dimension-agnostic architecture](../internals/orientation.md) treats all of these identically via the `SizeCache` — a single code path for both axes. This covers the majority of real-world use cases: lists of consistent items, lists where size can be computed from data properties.

### What Mode B would add

```typescript
// Estimated + measured (most flexible)
item: { estimatedHeight: 48, template: myTemplate }
// vlist renders item, measures with getBoundingClientRect(),
// caches actual size, adjusts scroll position
```

### Why it was deprioritized

- Measuring causes layout (expensive). Must be batched and amortized.
- Requires dynamic cache invalidation and scroll position correction.
- Doing it *without jank* is hard — it's a fundamentally different complexity level from Mode A.
- Mode A already covers the vast majority of production use cases.

### When it matters

Mode B becomes important for **truly dynamic content** — variable-length user-generated text, images with unknown aspect ratios, mixed-media feeds (think Twitter/Reddit). If vlist's target audience is app developers building structured lists (contacts, data tables, file browsers, dashboards), Mode A is sufficient. If the goal is to capture the "social feed" use case, Mode B should be revisited.

### Recommendation

Ship 1.0 without Mode B. Add it in 1.1 or 1.2 as a non-breaking enhancement. The `estimatedHeight` config key is already reserved in the type system, so the API surface is forward-compatible.

---

## What Exceeded the Original Roadmap

Several items were delivered that weren't in the original 14 requirements:

1. **SolidJS adapter** — The roadmap specified React, Vue, Svelte. SolidJS was added as a 4th adapter in its own package.
2. **Builder pattern architecture** — The entire API was refactored from a monolithic `vlist()` call to a composable `vlist().use(withFeature()).build()` pattern. This is a significant architectural improvement over what was originally planned.
3. **12 interactive examples** on vlist.dev — The roadmap called for a benchmark page, not a full example gallery.
4. **8 tutorials** — Comprehensive guides covering accessibility, builder pattern, chat interface, mobile, optimization, quick start, and styling.
5. **Comparison benchmark framework** — Not just self-benchmarks, but a framework for comparing against competitors.
6. **Velocity-based infinite scroll** — The adapter system includes velocity tracking for predictive loading and load cancellation. This wasn't in the roadmap.
7. **Wrap navigation** — Circular `scrollToIndex` for carousel/wizard patterns. Not in the original requirements.

---

## Health Indicators

| Indicator | Rating | Detail |
|-----------|--------|--------|
| Test coverage | 🟢 Excellent | 1,578 tests, 4,290 assertions, 0 failures |
| Build stability | 🟢 Excellent | Clean build in 7ms, zero warnings |
| Bundle hygiene | 🟢 Excellent | 72.5 KB full / 23.8 KB gzip, tree-shakeable to ~3 KB core |
| Type safety | 🟢 Excellent | Full TypeScript, 30+ exported types, strict config interfaces |
| Code quality | 🟢 Excellent | Clean separation of concerns, no circular deps, modular features |
| Documentation | 🟢 Excellent | Live site + API docs + 8 tutorials + 12 examples |
| API stability | 🟢 Ready | At v0.9.5 — API surface is stable and forward-compatible |
| Zero dependencies | 🟢 Verified | No `dependencies` in package.json, confirmed zero |

---

## Conclusion

Four weeks ago, vlist was a concept with a list of 14 requirements and an ambition to be the best vanilla virtual list on the market. Today it is a **near-1.0 library** with:

- **93% of the roadmap shipped** (13/14 items)
- **14,648 lines** of production code backed by **28,991 lines** of tests
- **Zero dependencies**, **zero test failures**
- A **builder-pattern architecture** more flexible than any competitor
- **4 framework adapters** in standalone packages
- A **live documentation site** with benchmarks, examples, and tutorials
- **Unique features** no competitor offers (1M+ compression, built-in selection, custom scrollbar, wrap navigation)
- Features that **exceed the original scope** (SolidJS adapter, velocity-based loading, 12 examples, 8 tutorials)

The only thing between the current state and a `1.0.0` tag is a decision on whether auto-size measurement is a launch requirement or a nice-to-have for a future minor version. The recommendation is clear: **ship 1.0 now, add Mode B in a subsequent release**.

The objective has been reached.

---

## Related Documentation

- [Known Issues & Roadmap](./known-issues.md) — Original requirements and detailed implementation notes
- [Benchmarks Guide](./benchmarks.md) — Performance suites documentation
- [Optimization Guide](/tutorials/optimization) — Performance tuning
- [Accessibility Guide](/tutorials/accessibility) — WAI-ARIA implementation
- [Builder Pattern Guide](/tutorials/builder-pattern) — Architecture overview
- [Dependency Analysis](../analysis/DEPENDENCY_ANALYSIS.md) — Module dependency graph

---

*Analysis performed: February 24, 2026*
*vlist version: 0.9.5*
*Status: Ready for 1.0*