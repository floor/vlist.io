# VList Source Structure

> Complete map of the vlist source code organization

This document provides an accurate reference for the current source structure of the vlist library.

## Overview

```
vlist/src/
├── builder/           # Core builder system
├── events/            # Event emitter
├── features/          # Feature plugins (tree-shakeable)
├── rendering/         # Virtual scrolling & rendering
├── styles/            # CSS styles
├── constants.ts       # Global constants
├── index.ts           # Main package entry point
└── types.ts           # Core TypeScript types
```

## Builder System

The builder system provides the core API and plugin architecture.

```
src/builder/
├── index.ts           # Builder exports
├── types.ts           # Builder types (VListPlugin, BuilderContext, etc.)
├── core.ts            # vlist() factory and materialize()
├── context.ts         # BuilderContext creation
├── materializectx.ts  # Internal materialization context
├── data.ts            # Simple data manager
├── dom.ts             # DOM structure creation
├── pool.ts            # Element pooling
├── range.ts           # Range utilities
├── scroll.ts          # Base scroll controller
└── velocity.ts        # Velocity tracking
```

**Key exports:**
- `vlist()` - Main factory function
- `VListBuilder` - Chainable builder interface
- `BuilderContext` - Plugin context interface
- `VListPlugin` - Plugin interface

## Events System

Simple event emitter for vlist events.

```
src/events/
├── index.ts           # Event exports
└── emitter.ts         # Event emitter implementation
```

**Key exports:**
- `createEmitter()` - Event emitter factory
- `Emitter` - Emitter type

## Features (Plugins)

All plugins follow the same structure: `index.ts` (exports), `plugin.ts` (plugin implementation), and supporting modules.

### Async Plugin

Asynchronous data loading with lazy loading and placeholders.

```
src/features/async/
├── index.ts           # Module exports
├── plugin.ts          # withAsync() plugin
├── manager.ts         # Data manager (coordinator)
├── sparse.ts          # Sparse storage implementation
└── placeholder.ts     # Placeholder generation
```

**Key exports:**
- `withAsync()` - Plugin function
- `createDataManager()` - Data manager factory
- `createSparseStorage()` - Sparse storage factory
- `createPlaceholderManager()` - Placeholder manager factory

### Grid Plugin

2D grid layout with virtualized rows.

```
src/features/grid/
├── index.ts           # Module exports
├── plugin.ts          # withGrid() plugin
├── layout.ts          # Grid layout calculations
├── renderer.ts        # Grid renderer
└── types.ts           # Grid types
```

**Key exports:**
- `withGrid()` - Plugin function
- `createGridLayout()` - Layout calculator
- `createGridRenderer()` - Grid renderer factory
- `GridConfig`, `GridLayout`, `GridPosition` - Types

### Page Plugin

Document-level (window) scrolling.

```
src/features/page/
├── index.ts           # Module exports
└── plugin.ts          # withPage() plugin
```

**Key exports:**
- `withPage()` - Plugin function

### Scale Plugin

Handles 1M+ items with scroll space scaling.

```
src/features/scale/
├── index.ts           # Module exports (re-exports from rendering/scale)
└── plugin.ts          # withScale() plugin
```

**Key exports:**
- `withScale()` - Plugin function
- Re-exports from `rendering/scale.ts`:
  - `getCompressionState()` - Get scale state
  - `needsCompression()` - Check if scaling needed
  - `getCompressionInfo()` - Human-readable info
  - `calculateCompressed*()` - Scale calculations

**Note:** The plugin re-exports utilities from `src/rendering/scale.ts` where the actual scaling logic lives.

### Scrollbar Plugin

Custom scrollbar component with auto-hide.

```
src/features/scrollbar/
├── index.ts           # Module exports
├── plugin.ts          # withScrollbar() plugin
├── controller.ts      # Scroll controller (native + scaled + window modes)
└── scrollbar.ts       # Custom scrollbar component
```

**Key exports:**
- `withScrollbar()` - Plugin function
- `createScrollController()` - Scroll controller factory
- `createScrollbar()` - Scrollbar component factory
- `rafThrottle()` - RAF throttle utility

### Sections Plugin

Grouped lists with sticky or inline headers.

```
src/features/sections/
├── index.ts           # Module exports
├── plugin.ts          # withSections() plugin
├── layout.ts          # Section layout calculations
├── sticky.ts          # Sticky header implementation
└── types.ts           # Section types
```

**Key exports:**
- `withSections()` - Plugin function
- `createGroupLayout()` - Layout calculator (aliased as `createSectionLayout`)
- `buildLayoutItems()` - Build layout entries
- `createGroupedHeightFn()` - Height function for sections
- `createStickyHeader()` - Sticky header manager
- `isGroupHeader()` - Type guard (aliased as `isSectionHeader`)

**Note:** Internally uses "group" terminology, but exports are aliased to "section" for public API.

### Selection Plugin

Item selection with keyboard navigation.

```
src/features/selection/
├── index.ts           # Module exports
├── plugin.ts          # withSelection() plugin
└── state.ts           # Selection state management
```

**Key exports:**
- `withSelection()` - Plugin function
- `createSelectionState()` - Selection state factory
- `selectItems()`, `deselectItems()`, `toggleSelection()` - Selection operations
- `selectAll()`, `clearSelection()` - Bulk operations
- `isSelected()`, `getSelectedIds()`, `getSelectedItems()` - Queries

### Snapshots Plugin

Scroll position save/restore for SPA navigation.

```
src/features/snapshots/
├── index.ts           # Module exports
└── plugin.ts          # withSnapshots() plugin
```

**Key exports:**
- `withSnapshots()` - Plugin function

## Rendering System

Virtual scrolling calculations and rendering logic.

```
src/rendering/
├── index.ts           # Rendering exports
├── heights.ts         # Height cache (prefix-sum array)
├── renderer.ts        # DOM renderer
├── scale.ts           # Scaling calculations for 1M+ items
└── viewport.ts        # Viewport state management
```

**Key exports:**
- `createHeightCache()` - Height cache factory
- `createRenderer()` - Renderer factory
- `createDOMStructure()` - DOM structure factory
- Viewport utilities: `calculateRenderRange()`, `calculateTotalHeight()`, etc.
- Scale utilities: `getCompressionState()`, `calculateCompressed*()`, etc.

## Styles

CSS styles for vlist components.

```
src/styles/
└── vlist.css          # Main stylesheet
```

**Usage:**
```typescript
import '@floor/vlist/styles';
```

## Core Files

### index.ts

Main package entry point. Exports everything from all domains:
- Builder API (`vlist`, types)
- All plugins (`withGrid`, `withSections`, etc.)
- Rendering utilities
- Selection utilities
- Event system

**Aliasing:** Exports use public-facing names (e.g., `getScaleState`) while internal code may use different names (e.g., `getCompressionState`).

### types.ts

Core TypeScript types:
- `VList` - Main list instance interface
- `VListConfig` - Configuration object
- `VListItem` - Item interface
- `VListEvents` - Event map
- `ItemTemplate` - Template function type
- `Range` - Index range type
- `ViewportState` - Viewport state interface
- Configuration types for all features

### constants.ts

Global constants used across the codebase.

## Plugin Structure Pattern

All plugins follow this pattern:

```
src/features/<plugin-name>/
├── index.ts           # Public exports
├── plugin.ts          # Plugin function (withX)
├── <feature>.ts       # Core feature implementation
└── types.ts           # Types (if needed)
```

**Plugin function signature:**
```typescript
export function withPluginName(config?: PluginConfig): VListPlugin {
  return {
    name: 'plugin-name',
    priority: 50,
    setup(ctx: BuilderContext) {
      // Plugin implementation
    },
    destroy() {
      // Cleanup
    },
  };
}
```

## Import Paths

### For Users

```typescript
// Main entry point
import { vlist } from '@floor/vlist';

// Plugins
import { withGrid, withSections, withAsync } from '@floor/vlist';

// Utilities
import { getScaleInfo, createEmitter } from '@floor/vlist';

// Styles
import '@floor/vlist/styles';
```

### Internal Imports

```typescript
// From builder
import { createBuilderContext } from '../builder/context';

// From rendering
import { createHeightCache } from '../rendering/heights';

// From features
import { createDataManager } from '../features/async/manager';

// Sibling imports
import { createSparseStorage } from './sparse';
```

## Terminology: Public vs Internal

Some features use different terminology internally vs. publicly:

| Internal | Public Export | Reason |
|----------|---------------|--------|
| `compression*` | `scale*` | Better user-facing terminology |
| `group*` | `section*` | More intuitive for grouped lists |
| `data` | `async` | Clearer purpose description |

**Example:**
```typescript
// Internal: src/rendering/scale.ts
export function getCompressionState() { ... }

// Public: src/index.ts
export { getCompressionState as getScaleState } from './rendering';

// User imports:
import { getScaleState } from '@floor/vlist';
```

## File Naming Conventions

- **kebab-case** for directories: `src/features/async/`
- **kebab-case** for files: `scroll-controller.ts` → Actually: **camelCase** for most files
- **PascalCase** for type files when needed: `types.ts`
- **lowercase** for entry points: `index.ts`

**Actual convention (as observed):**
- Files: `camelCase.ts` (e.g., `controller.ts`, `manager.ts`, `placeholder.ts`)
- Directories: `lowercase` (e.g., `async`, `grid`, `scrollbar`)
- Entry points: `index.ts`, `plugin.ts`

## Module Boundaries

### Clear Separation

- **builder/** - Core builder, no feature logic
- **features/** - All optional plugins, zero coupling between plugins
- **rendering/** - Pure calculations, no DOM outside renderer.ts
- **events/** - Generic event system, no vlist-specific logic

### Dependencies

```
features/* → builder/ ✅
features/* → rendering/ ✅
features/* → events/ ✅
features/* → features/* ❌ (plugins don't depend on each other)
builder/ → features/* ❌ (builder is feature-agnostic)
rendering/ → builder/ ❌ (rendering is pure)
```

## Tree-Shaking

The codebase is structured for optimal tree-shaking:

1. **Explicit imports** - No barrel exports for internal modules
2. **Plugin isolation** - Each plugin is self-contained
3. **Direct re-exports** - `index.ts` files re-export directly, no intermediate processing
4. **Pure functions** - Most utilities are pure functions with no side effects

**Result:** Users only ship code for plugins they use.

## Testing

Tests mirror the source structure:

```
test/
├── builder/
├── features/
│   ├── async/
│   ├── grid/
│   ├── scale/
│   └── ...
└── rendering/
```

## Related Documentation

- [Builder Pattern](/tutorials/builder-pattern) - How plugins work
- [Plugin System](../internals/context.md) - BuilderContext internals
- [Rendering](../internals/rendering.md) - Rendering internals

---

**Last Updated:** January 2025  
**Version:** v0.8+  
**Accuracy:** Verified against actual source code