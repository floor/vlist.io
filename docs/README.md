# Documentation

> Comprehensive documentation for the vlist virtual list library.

## Quick Links

- **[Builder](./builder.md)** - Composable builder — pick only the features you need, pay only for what you ship
- **[Main Documentation](./vlist.md)** - Getting started, configuration, and usage
- **[Accessibility](./accessibility.md)** - WAI-ARIA listbox, keyboard navigation, screen reader support
- **[Benchmarks](./benchmarks.md)** - Live performance suites (scroll FPS, render, memory, scrollToIndex)
- **[Optimization Guide](./optimization.md)** - Performance optimizations and tuning
- **[Styles Guide](./styles.md)** - CSS tokens, variants, dark mode, split core/extras CSS, and customization
- **[Scale Guide](./scale.md)** - Handling large lists (1M+ items) with compression
- **[Page Scrolling](./vlist.md#page-scrolling)** - Document-level scrolling
- **[Scroll Save/Restore](./vlist.md#scroll-saverestore)** - Save and restore scroll position for SPA navigation
- **[Framework Adapters](#framework-adapters)** - React, Vue, and Svelte wrappers (<1 KB each)
- **[Reverse Mode](./reverse.md)** - Chat UI support with auto-scroll and scroll-preserving prepend
- **[Scroll Config](./scrollbar.md#scroll-configuration)** - Wheel control, wrap navigation, scrollbar modes, window scrolling
- **[Testing](./test.md)** - Test suite, coverage (99.99% lines), and testing patterns

## Module Documentation

Each module has detailed documentation covering its API, usage examples, and implementation details.

### Core Modules

| Module | Description | Location |
|--------|-------------|----------|
| **[Types](./types.md)** | TypeScript interfaces and type definitions | `src/types.ts` |
| **[Builder](./builder.md)** | Composable builder pattern with plugin system | `src/builder/` |
| **[Rendering](./render.md)** | DOM structure, element pool, rendering, virtualization | `src/rendering/` |
| **[Events](./events.md)** | Type-safe event emitter system | `src/events/` |

### Feature Plugins

All features are opt-in via the builder pattern - use only what you need for optimal tree-shaking.

| Plugin | Description | Directory |
|--------|-------------|-----------|
| **[Grid](./grid.md)** | 2D grid layout with virtualized rows | `src/features/grid/` |
| **[Sections](./sections.md)** | Grouped lists with sticky/inline headers | `src/features/sections/` |
| **[Async](./async.md)** | Async data loading with adapters | `src/features/async/` |
| **[Selection](./selection.md)** | Single/multiple selection with keyboard nav | `src/features/selection/` |
| **[Scale](./scale.md)** | Handle 1M+ items with compression | `src/features/scale/` |
| **[Scrollbar](./scrollbar.md)** | Custom scrollbar with auto-hide | `src/features/scrollbar/` |
| **[Page](./plugins.md#withpage)** | Document-level scrolling | `src/features/page/` |
| **[Snapshots](./plugins.md#withsnapshots)** | Scroll position save/restore | `src/features/snapshots/` |

### API Modules

| Module | Description | File |
|--------|-------------|------|
| **[Handlers](./handlers.md)** | Scroll, click, and keyboard event handlers | `src/handlers.ts` |
| **[Methods](./methods.md)** | Public API methods (data, scroll, selection) | `src/methods.ts` |

### Cross-Cutting

| Module | Description | File |
|--------|-------------|------|
| **[Accessibility](./accessibility.md)** | WAI-ARIA implementation, keyboard navigation, screen reader support | across modules |

## Architecture Overview

VList uses a **builder pattern** with explicit plugins for optimal tree-shaking:

```typescript
import { vlist, withGrid, withSections } from 'vlist';

const list = vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSections({ ... }))
  .build();
```

**Features are organized under `src/features/`** with clear, intuitive names. The rendering engine lives in `src/rendering/` and the core builder in `src/builder/`.

**Bundle sizes:** 8-12 KB gzipped based on features used (vs 20-23 KB for traditional virtual lists).

### Framework Adapters

Thin mount-based wrappers that handle lifecycle (create on mount, destroy on unmount) and reactive item syncing. Each adapter imports `vlist` from `vlist` as an external — the adapter bundles contain only wrapper code.

| Adapter | Import | Size | Exports | Source |
|---------|--------|------|---------|--------|
| **React** | `vlist/react` | 0.7 KB | `useVList` hook, `useVListEvent` | `src/adapters/react.ts` |
| **Vue 3** | `vlist/vue` | 0.5 KB | `useVList` composable, `useVListEvent` | `src/adapters/vue.ts` |
| **Svelte** | `vlist/svelte` | 0.3 KB | `vlist` action, `onVListEvent` | `src/adapters/svelte.ts` |

React and Vue are optional `peerDependencies`. Svelte needs zero framework imports (actions are plain functions).

## Architecture Overview (v0.6.0 - Plugin System)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Framework Adapters (optional)                     │
│          vlist/react · vlist/vue · vlist/svelte                       │
│     Thin mount-based wrappers that delegate to vlist()         │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    vlist() - Auto-detection                     │
│         Detects features from config and applies plugins              │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  vlist() Builder + Plugins                            │
│  .use(withPage()) .use(withSelection()) .use(withGrid())           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      BuilderContext                                   │
│  Provides hooks for plugins: setScrollFns, setScrollTarget, etc.     │
└──────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌─────────────────┐   ┌───────────────┐
│  Core (8 KB)  │   │   Plugins       │   │   Render      │
│ Virtual scroll│   │  (opt-in)       │   │ (DOM pooling) │
│ Element pool  │   │  Window, Grid,  │   │ Height cache  │
│ Basic DOM     │   │  Selection, etc │   │               │
└───────────────┘   └─────────────────┘   └───────────────┘
```

**Key Change in v0.6.0:** Features like window scrolling are now plugins that hook into the builder core rather than being baked in. This enables smaller bundles and community extensibility.

## Data Flow

### Scroll Event Flow

```
User scrolls
    ↓
ScrollController detects scroll
    ↓
Scroll Handler updates ViewportState
    ↓
Calculate new visible/render range
    ↓
DataManager.ensureRange() loads missing data
    ↓
Renderer.render() updates DOM
    ↓
Emit 'scroll' and 'range:change' events
```

### Selection Event Flow

```
User clicks item (or presses Space/Enter)
    ↓
Click/Keyboard Handler processes event
    ↓
Update SelectionState (immutable)
    ↓
Renderer.render() updates DOM
    ↓
Emit 'item:click' and 'selection:change' events
```

### Data Loading Flow

```
Adapter mode: scroll near bottom (or near top in reverse mode)
    ↓
Scroll Handler detects threshold
    ↓
Emit 'load:start' event
    ↓
DataManager.loadMore() calls Adapter.read()
    ↓
Store items in SparseStorage
    ↓
Renderer.render() replaces placeholders
    ↓
Emit 'load:end' event
```

## Key Features by Module

### Core (Builder + Render)
- **Virtual scrolling** - Only render visible + overscan items
- **Element pooling** - Reuse DOM elements for performance
- **Height cache** - O(1) offset lookups with prefix sums
- **Basic DOM structure** - Container, viewport, content, items
- **Event system** - Type-safe emitter with error isolation
- **ResizeObserver** - Automatic viewport size detection
- **Plugin hooks** - Extensibility points for features

### Plugin System (v0.6.0)
- **Window mode** - Page-level scrolling (extracted in v0.6.0)
- **Selection** - Click/keyboard selection with ARIA
- **Grid** - 2D grid layout with responsive columns
- **Groups** - Sticky headers for grouped lists
- **Data adapter** - Async loading with sparse storage
- **Compression** - Handle 1M+ items efficiently
- **Custom scrollbar** - Consistent cross-browser scrollbar
- **Snapshots** - Save/restore scroll position



### Accessibility (across modules)
- WAI-ARIA Listbox pattern (`role="listbox"` / `role="option"`)
- `aria-setsize` / `aria-posinset` — screen readers announce "item 5 of 10,000"
- `aria-activedescendant` — root tracks focused item by ID (better than roving tabindex for virtual lists)
- `aria-selected` — reflects selection state per item
- `aria-busy` — set during async adapter loading
- Visually-hidden live region (`aria-live="polite"`) — announces selection changes
- Instance-scoped element IDs — safe with multiple lists per page
- `:focus-visible` keyboard-only focus ring on root and items

### Events Module
- Type-safe event system
- Error isolation per handler
- Subscription management
- Memory-safe cleanup

## Configuration Quick Reference

```typescript
const list = vlist({
  // Required
  container: '#app',           // HTMLElement or selector
  item: {
    height: 48,                // Fixed height in pixels
    template: (item) => `...`, // Render function
  },
  
  // Data source (one of)
  items: [],                   // Static array
  adapter: { read: async () => ... },  // Async loader
  
  // Optional
  ariaLabel: 'My list',        // Accessible label (recommended)
  overscan: 3,                 // Extra items to render
  reverse: false,              // Reverse mode for chat UIs
  classPrefix: 'vlist',        // CSS class prefix
  scroll: {
    wheel: true,               // Enable mouse wheel (default: true)
    wrap: false,               // Wrap around at boundaries (default: false)
    scrollbar: { autoHide: true },  // 'native' | 'none' | { options } (default: custom)
    element: window,           // Window scrolling mode
    idleTimeout: 150,          // Scroll idle detection (ms)
  },
  selection: {
    mode: 'multiple',          // 'none' | 'single' | 'multiple'
    initial: ['id-1']          // Pre-selected IDs
  },
  loading: {
    cancelThreshold: 25,       // Skip loading above this velocity (px/ms)
    preloadThreshold: 2,       // Start preloading above this velocity (px/ms)
    preloadAhead: 50,          // Items to preload in scroll direction
  },
});
```

## Browser Support

- Chrome/Edge 88+
- Firefox 78+
- Safari 14+

Requires:
- ES2020+
- CSS Custom Properties
- ResizeObserver
- requestAnimationFrame

## License

GPL-3.0-or-later

---

*For the main getting started guide, see [vlist.md](./vlist.md). For accessibility details, see [accessibility.md](./accessibility.md).*