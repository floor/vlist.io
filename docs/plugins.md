# Plugin System

> Composable features for vlist - pay only for what you use.

## Overview

VList uses a **builder pattern** with explicit plugins for optimal tree-shaking. Start with the core (7.7 KB gzipped), add only the features you need.

```typescript
import { vlist, withGrid, withSections, withSelection } from 'vlist';

const list = vlist({
  container: '#app',
  items: photos,
  item: { height: 200, template: renderPhoto },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withSections({ ... }))
  .use(withSelection({ mode: 'multiple' }))
  .build();
```

**Bundle:** ~12 KB gzipped (vs 20-23 KB for traditional virtual lists)

---

## Philosophy

### Why Builder Pattern?

**Before (Monolithic API):**
```typescript
import { vlist } from 'vlist';

const list = vlist({
  grid: { columns: 4 },
  groups: { ... },
});
// Bundle: 20-23 KB gzipped (ALL plugins included)
```

**After (Builder API):**
```typescript
import { vlist, withGrid, withSections } from 'vlist';

const list = vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSections({ ... }))
  .build();
// Bundle: 11.7 KB gzipped (ONLY used plugins)
```

**Benefits:**
- ✅ **2-3x smaller bundles** - Ship only what you use
- ✅ **Explicit imports** - Clear what's included
- ✅ **Perfect tree-shaking** - Bundler removes unused code
- ✅ **Transparent costs** - Each plugin's size is visible
- ✅ **Extensible** - Easy to add custom plugins

---

## Available Plugins

### Quick Reference

| Plugin | Cost (Gzipped) | Description |
|--------|----------------|-------------|
| **Base** | 7.7 KB | Core virtualization (no plugins) |
| `withGrid()` | +4.0 KB | 2D grid layout |
| `withSections()` | +4.6 KB | Grouped lists with sticky/inline headers |
| `withAsync()` | +5.3 KB | Async data loading with adapters |
| `withSelection()` | +2.3 KB | Single/multiple item selection |
| `withScale()` | +2.2 KB | Handle 1M+ items with compression |
| `withScrollbar()` | +1.0 KB | Custom scrollbar UI |
| `withPage()` | +0.9 KB | Document-level scrolling |
| `withSnapshots()` | Included | Scroll save/restore (no cost) |

---

## Plugin Details

### `withGrid(config)` - 2D Grid Layout

Virtualizes items in a 2D grid with configurable columns and gap.

**Import:**
```typescript
import { vlist, withGrid } from 'vlist';
```

**Configuration:**
```typescript
interface GridConfig {
  columns: number;     // Number of columns (required)
  gap?: number;        // Gap between items in pixels (default: 0)
}
```

**Example:**
```typescript
const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" />`,
  },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .build();

// Update columns dynamically
gallery.updateGrid({ columns: 6 });
```

**How it works:**
- Virtualizes by **rows** (not individual items)
- Calculates row heights based on column count
- Positions items with `translate(x, y)` for GPU acceleration
- Supports variable row heights
- Can combine with `withSections()` for grouped grids

**Bundle cost:** +4.0 KB gzipped

---

### `withSections(config)` - Grouped Lists with Headers

Creates grouped lists with sticky or inline section headers.

**Import:**
```typescript
import { vlist, withSections } from 'vlist';
```

**Configuration:**
```typescript
interface SectionsConfig {
  getGroupForIndex: (index: number) => string;
  headerHeight: number | ((group: string, groupIndex: number) => number);
  headerTemplate: (group: string, groupIndex: number) => string | HTMLElement;
  sticky?: boolean;  // Default: true
}
```

**Example (Sticky Headers - Telegram Style):**
```typescript
const contacts = vlist({
  container: '#contacts',
  items: sortedContacts,  // MUST be pre-sorted by group!
  item: {
    height: 56,
    template: (contact) => `<div>${contact.name}</div>`,
  },
})
  .use(withSections({
    getGroupForIndex: (i) => contacts[i].lastName[0].toUpperCase(),
    headerHeight: 36,
    headerTemplate: (letter) => `<div class="section-header">${letter}</div>`,
    sticky: true,  // Headers stick to top
  }))
  .build();
```

**Example (Inline Headers - iMessage Style):**
```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  items: messages,
  item: {
    height: (i) => messages[i].height,
    template: (msg) => `<div class="message">${msg.text}</div>`,
  },
})
  .use(withSections({
    getGroupForIndex: (i) => formatDate(messages[i].timestamp),
    headerHeight: 32,
    headerTemplate: (date) => `<div class="date-separator">${date}</div>`,
    sticky: false,  // Inline headers (scroll with content)
  }))
  .build();
```

**Important:**
- Items **must be pre-sorted** by group
- Headers are auto-injected at group boundaries
- Works with `reverse: true` for chat UIs
- Works with `withGrid()` for grouped 2D layouts
- Cannot combine with `direction: 'horizontal'`

**Bundle cost:** +4.6 KB gzipped

---

### `withAsync(config)` - Async Data Loading

Lazy loading with placeholders, pagination, and velocity-aware loading.

**Import:**
```typescript
import { vlist, withAsync } from 'vlist';
```

**Configuration:**
```typescript
interface AsyncConfig {
  adapter: {
    read: (params: { offset: number, limit: number }) => Promise<{
      items: T[];
      total?: number;
      hasMore?: boolean;
    }>;
  };
  loading?: {
    cancelThreshold?: number;  // Cancel loads when scrolling fast (px/ms)
  };
}
```

**Example:**
```typescript
const list = vlist({
  container: '#list',
  item: {
    height: 64,
    template: (item) => {
      if (!item) return `<div class="skeleton">Loading...</div>`;
      return `<div>${item.name}</div>`;
    },
  },
})
  .use(withAsync({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/users?offset=${offset}&limit=${limit}`);
        return res.json();
      },
    },
    loading: {
      cancelThreshold: 15,  // Skip loads when scrolling > 15 px/ms
    },
  }))
  .build();

// Events
list.on('load:start', ({ offset, limit }) => console.log('Loading...'));
list.on('load:end', ({ items, total }) => console.log('Loaded!'));
list.on('load:error', ({ error }) => console.error(error));
```

**Features:**
- Shows placeholders for unloaded items
- Fetches data as you scroll (windowed loading)
- Velocity-aware: cancels requests when scrolling fast
- Automatic retry on failure
- Efficient sparse storage (only loaded items in memory)

**Bundle cost:** +5.3 KB gzipped

---

### `withSelection(config)` - Item Selection

Single or multiple item selection with keyboard navigation.

**Import:**
```typescript
import { vlist, withSelection } from 'vlist';
```

**Configuration:**
```typescript
interface SelectionConfig {
  mode: 'single' | 'multiple';
  initial?: Array<string | number>;  // Pre-selected item IDs
}
```

**Example:**
```typescript
const list = vlist({
  container: '#list',
  items: users,
  item: {
    height: 48,
    template: (user, index, { selected }) => {
      const cls = selected ? 'item--selected' : '';
      return `<div class="${cls}">${user.name}</div>`;
    },
  },
})
  .use(withSelection({ 
    mode: 'multiple',
    initial: [1, 5, 10],
  }))
  .build();

// Selection API
list.selectItem(5);
list.deselectItem(5);
list.toggleSelection(5);
list.selectAll();
list.clearSelection();
list.getSelectedIds();        // [1, 5, 10]
list.getSelectedItems();      // [{ id: 1, ... }, ...]

// Events
list.on('selection:change', ({ selectedIds, selectedItems }) => {
  console.log('Selected:', selectedIds);
});

// Change mode dynamically
list.setSelectionMode('single');
```

**Keyboard navigation:**
- `↑/↓` - Move focus
- `Home/End` - Jump to first/last
- `Space/Enter` - Toggle selection
- `Ctrl+A` - Select all (multiple mode)

**Bundle cost:** +2.3 KB gzipped

---

### `withScale()` - Large Datasets (1M+ Items)

Automatically compresses scroll space when total height exceeds browser limits.

**Import:**
```typescript
import { vlist, withScale } from 'vlist';
```

**Configuration:**
```typescript
// No configuration needed - auto-activates
```

**Example:**
```typescript
const bigList = vlist({
  container: '#list',
  items: generateItems(5_000_000),
  item: {
    height: 48,
    template: (item) => `<div>#${item.id}</div>`,
  },
})
  .use(withScale())
  .build();
```

**How it works:**
- Browser scroll height limit: ~16.7M pixels
- With 48px items: limit is ~350K items
- Scale plugin compresses virtual height when exceeded
- Transparently maps scroll position to item indices
- Smooth scrolling through millions of items

**When to use:**
- Lists with 100K+ fixed-height items
- Lists with 50K+ variable-height items
- Any list approaching 16M pixels total height

**Bundle cost:** +2.2 KB gzipped

---

### `withScrollbar(config)` - Custom Scrollbar

Beautiful custom scrollbar with auto-hide and smooth dragging.

**Import:**
```typescript
import { vlist, withScrollbar } from 'vlist';
```

**Configuration:**
```typescript
interface ScrollbarConfig {
  autoHide?: boolean;        // Hide when not scrolling (default: false)
  autoHideDelay?: number;    // Hide delay in ms (default: 1000)
  minThumbSize?: number;     // Minimum thumb size in px (default: 20)
}
```

**Example:**
```typescript
const list = vlist({
  container: '#list',
  items: users,
  item: { height: 48, template: renderUser },
})
  .use(withScrollbar({ 
    autoHide: true,
    autoHideDelay: 1500,
  }))
  .build();
```

**Features:**
- Smooth dragging with momentum
- Auto-hide on idle
- Proportional thumb sizing
- Works with mouse wheel and touch
- Automatically used when `withScale()` is active

**Bundle cost:** +1.0 KB gzipped

---

### `withPage()` - Document-Level Scrolling

Use the document scroll instead of container scroll.

**Import:**
```typescript
import { vlist, withPage } from 'vlist';
```

**Configuration:**
```typescript
// No configuration needed
```

**Example:**
```typescript
const list = vlist({
  container: '#list',
  items: articles,
  item: {
    height: 300,
    template: (article) => `<article>...</article>`,
  },
})
  .use(withPage())
  .build();
```

**Use cases:**
- Blog posts
- Infinite scroll feeds
- Full-page lists
- When you want native browser scrollbar

**Note:** Cannot combine with custom scrollbar or horizontal direction.

**Bundle cost:** +0.9 KB gzipped

---

### `withSnapshots()` - Scroll Save/Restore

Save and restore scroll position (included in base, no cost).

**Import:**
```typescript
// No import needed - included in base builder
```

**API:**
```typescript
const snapshot = list.getScrollSnapshot();
// { index: 523, offsetInItem: 12 }

list.restoreScroll(snapshot);
```

**Example:**
```typescript
const list = vlist({
  container: '#list',
  items: users,
  item: { height: 48, template: renderUser },
}).build();

// Save before navigation
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('scroll', JSON.stringify(snapshot));

// Restore after navigation
const saved = JSON.parse(sessionStorage.getItem('scroll'));
list.restoreScroll(saved);
```

**Perfect for:**
- SPA navigation (back/forward)
- Preserving scroll across page reloads
- Restoring user position in lists

**Bundle cost:** Included in base (no additional cost)

---

## Bundle Size Breakdown

### Minimal Configuration

```typescript
vlist({ ... }).build()
```

**Bundle:** 7.7 KB gzipped (core virtualization only)

### Common Configurations

| Configuration | Plugins | Bundle (Gzipped) |
|---------------|---------|------------------|
| **Photo gallery** | `withGrid()` + `withScrollbar()` | 11.7 KB |
| **Contact list** | `withSections()` | 12.3 KB |
| **Chat UI** | `withSections()` (inline) | 11.9 KB |
| **File browser** | `withGrid()` + `withSelection()` + `withScrollbar()` | 15.3 KB |
| **Infinite scroll** | `withAsync()` + `withSelection()` | 15.0 KB |
| **Large dataset** | `withScale()` + `withScrollbar()` | 9.9 KB |

### Full Featured

```typescript
vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSections({ ... }))
  .use(withSelection({ mode: 'multiple' }))
  .use(withAsync({ adapter }))
  .use(withScrollbar({ autoHide: true }))
  .build()
```

**Bundle:** ~16 KB gzipped (all plugins)

**Compare to:**
- Traditional virtual lists: 20-23 KB minimum
- VList monolithic (deprecated): 20-23 KB
- VList builder (optimal): 8-16 KB based on usage

---

## Creating Custom Plugins

The plugin API allows you to extend vlist with custom functionality.

### Plugin Interface

```typescript
interface VListPlugin<T extends VListItem = VListItem> {
  name: string;
  priority?: number;  // Default: 50 (lower = earlier)
  conflicts?: string[];  // Conflicting plugin names
  setup: (ctx: BuilderContext<T>) => void;
}
```

### Example: Simple Plugin

```typescript
import { vlist, type VListPlugin } from 'vlist';

const withLogger = (): VListPlugin => ({
  name: 'withLogger',
  priority: 100,  // Run late
  
  setup(ctx) {
    // Access core components
    const { emitter, config } = ctx;
    
    // Add event listeners
    emitter.on('scroll', ({ scrollTop }) => {
      console.log('Scrolled to:', scrollTop);
    });
    
    // Add custom methods
    ctx.registerMethod('log', (message: string) => {
      console.log('[VList]', message);
    });
  }
});

// Usage
const list = vlist({ ... })
  .use(withLogger())
  .build();

list.log('Hello!');  // Custom method added by plugin
```

### Example: Advanced Plugin

```typescript
interface HighlightConfig {
  searchTerm: string;
  color?: string;
}

const withHighlight = (config: HighlightConfig): VListPlugin => ({
  name: 'withHighlight',
  priority: 80,  // Run after selection but before rendering
  
  setup(ctx) {
    const { registerMethod } = ctx;
    let term = config.searchTerm;
    let color = config.color || '#ffeb3b';
    
    // Enhance template
    const originalTemplate = ctx.config.item.template;
    ctx.config.item.template = (item, index, state) => {
      let html = originalTemplate(item, index, state);
      if (typeof html === 'string' && term) {
        const regex = new RegExp(term, 'gi');
        html = html.replace(regex, `<mark style="background:${color}">$&</mark>`);
      }
      return html;
    };
    
    // Add update method
    registerMethod('setSearchTerm', (newTerm: string) => {
      term = newTerm;
      ctx.renderer.forceRender();
    });
  }
});

// Usage
const list = vlist({ ... })
  .use(withHighlight({ searchTerm: 'john' }))
  .build();

list.setSearchTerm('jane');  // Re-render with new highlight
```

### Plugin Priority

Plugins run in priority order (lower = earlier):

| Priority | Plugins | Purpose |
|----------|---------|---------|
| 10 | `withPage()` | Must run first (changes scroll element) |
| 15 | `withAsync()` | Sets up data loading |
| 20 | `withScale()` | Modifies scroll calculations |
| 30 | `withGrid()`, `withSections()` | Modify layout |
| 50 | Default | Most plugins |
| 60 | `withSelection()` | Depends on layout being set |
| 70 | `withScrollbar()` | Depends on scroll setup |
| 90 | `withSnapshots()` | Needs all features ready |

### BuilderContext API

Plugins receive a `BuilderContext` with:

```typescript
interface BuilderContext<T> {
  // Core components
  dom: DOMStructure;
  config: ResolvedBuilderConfig<T>;
  emitter: Emitter<VListEvents<T>>;
  heightCache: HeightCache;
  renderer: Renderer;
  
  // Registration
  registerMethod(name: string, fn: Function): void;
  registerAfterScroll(handler: ScrollHandler): void;
  registerClickHandler(handler: ClickHandler): void;
  registerKeydownHandler(handler: KeydownHandler): void;
  registerResizeHandler(handler: ResizeHandler): void;
  registerDestroyHandler(handler: DestroyHandler): void;
  
  // Utilities
  getItems(): T[];
  setItems(items: T[]): void;
  rerender(): void;
}
```

---

## Plugin Compatibility

### Compatible Combinations

✅ **Grid + Sections** - Grouped 2D layouts
```typescript
.use(withGrid({ columns: 4 }))
.use(withSections({ ... }))
```

✅ **Grid + Selection** - Selectable gallery
```typescript
.use(withGrid({ columns: 4 }))
.use(withSelection({ mode: 'multiple' }))
```

✅ **Sections + Selection** - Selectable grouped list
```typescript
.use(withSections({ ... }))
.use(withSelection({ mode: 'single' }))
```

✅ **Async + Scale** - Large async dataset
```typescript
.use(withAsync({ adapter }))
.use(withScale())
```

✅ **Page + Async** - Infinite scroll blog
```typescript
.use(withPage())
.use(withAsync({ adapter }))
```

### Incompatible Combinations

❌ **Grid + Horizontal** - Grid requires vertical direction
❌ **Sections + Horizontal** - Groups require vertical direction
❌ **Page + Scrollbar** - Page uses native browser scrollbar
❌ **Reverse + Horizontal** - Reverse mode requires vertical direction

---

## Migration Guide

### From Old Plugin Names

| Old Name | New Name | Import |
|----------|----------|--------|
| `withScale()` | **`withScale()`** | `import { withScale } from 'vlist'` |
| `withAsync()` | **`withAsync()`** | `import { withAsync } from 'vlist'` |
| `withPage()` | **`withPage()`** | `import { withPage } from 'vlist'` |
| `withSections()` | **`withSections()`** | `import { withSections } from 'vlist'` |

### From Monolithic API

**Before:**
```typescript
import { vlist } from 'vlist';

vlist({
  grid: { columns: 4 },
  groups: { ... },
  selection: { mode: 'single' },
})
```

**After:**
```typescript
import { vlist, withGrid, withSections, withSelection } from 'vlist';

vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSections({ ... }))
  .use(withSelection({ mode: 'single' }))
  .build()
```

**Benefits of migration:**
- 2-3x smaller bundles
- Explicit about included features
- Better tree-shaking
- Easier to debug (clear plugin chain)

---

## Best Practices

### Import Only What You Use

❌ **Don't:**
```typescript
import * from 'vlist';  // Imports everything
```

✅ **Do:**
```typescript
import { vlist, withGrid, withSelection } from 'vlist';
```

### Order Plugins by Priority

While plugins auto-sort by priority, it's clearer to order them logically:

```typescript
vlist({ ... })
  .use(withPage())        // Scroll setup first
  .use(withAsync({ ... })) // Data loading
  .use(withGrid({ ... }))  // Layout
  .use(withSections({ ... }))  // Grouping
  .use(withSelection({ ... }))  // Interaction
  .use(withScrollbar({ ... }))  // UI chrome
  .build()
```

### Check Plugin Compatibility

Before combining plugins, verify they're compatible (see [Plugin Compatibility](#plugin-compatibility)).

### Use Snapshots for Navigation

```typescript
// SPA navigation pattern
const list = vlist({ ... }).build();

// Before navigating away
const snapshot = list.getScrollSnapshot();
history.state.scrollSnapshot = snapshot;

// After navigating back
if (history.state.scrollSnapshot) {
  list.restoreScroll(history.state.scrollSnapshot);
}
```

---

## Common Patterns

### Photo Gallery with Selection

```typescript
import { vlist, withGrid, withSelection, withScrollbar } from 'vlist';

vlist({ ... })
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

### Contact List (A-Z with Sticky Headers)

```typescript
import { vlist, withSections } from 'vlist';

vlist({ ... })
  .use(withSections({
    getGroupForIndex: (i) => contacts[i].lastName[0],
    headerHeight: 36,
    headerTemplate: (letter) => `<div>${letter}</div>`,
  }))
  .build();
```

### Chat UI (Reverse + Inline Date Headers)

```typescript
import { vlist, withSections } from 'vlist';

vlist({
  reverse: true,
  ...
})
  .use(withSections({
    getGroupForIndex: (i) => formatDate(messages[i].date),
    headerHeight: 32,
    headerTemplate: (date) => `<div>${date}</div>`,
    sticky: false,  // Inline headers
  }))
  .build();
```

### Infinite Scroll Blog

```typescript
import { vlist, withPage, withAsync } from 'vlist';

vlist({ ... })
  .use(withPage())
  .use(withAsync({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}`);
        return res.json();
      },
    },
  }))
  .build();
```

### Large Dataset with Search

```typescript
import { vlist, withScale, withSelection, withScrollbar } from 'vlist';

vlist({ ... })
  .use(withScale())
  .use(withSelection({ mode: 'single' }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

---

## See Also

- [Builder Pattern](./builder.md) - Detailed builder API docs
- [Grid Plugin](./grid.md) - Grid layout in depth
- [Sections Plugin](./sections.md) - Grouped lists guide
- [Async Plugin](./async.md) - Data loading patterns
- [Selection Plugin](./selection.md) - Selection and keyboard navigation
- [API Reference](./methods.md) - Complete API documentation

---

**Interactive Examples:** [vlist.dev/sandbox](https://vlist.dev/sandbox)