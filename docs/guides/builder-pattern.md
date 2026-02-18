# Builder Pattern

> Composable virtual list — use only the features you need, ship only what you use.

## Overview

VList uses a **builder pattern** with explicit plugins for optimal tree-shaking. Start with the core (7.7 KB gzipped), add only the features you need.

```typescript
import { vlist, withGrid, withSections, withSelection } from 'vlist';

const list = vlist({
  container: '#app',
  items: photos,
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" />`,
  },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withSections({ ... }))
  .use(withSelection({ mode: 'multiple' }))
  .build();
```

**Bundle:** ~12 KB gzipped (vs 20-23 KB for traditional virtual lists)

## Why Builder Pattern?

### Bundle Size Matters

Different use cases need different features:

- **Contact list** → No grid, no async loading
- **Photo gallery** → No selection, no sections
- **Chat UI** → No grid, needs sections (inline)
- **Data table** → Needs selection, no sections

**Without tree-shaking:**
All features bundled → 20-23 KB gzipped minimum

**With builder pattern:**
Only used features → 8-12 KB gzipped average

### Comparison

| Configuration | Bundle (Gzipped) | Savings |
|---------------|------------------|---------|
| Basic list (no plugins) | 7.7 KB | - |
| + Selection | 10.0 KB | vs 21 KB (2.1x smaller) |
| + Grid | 11.7 KB | vs 21 KB (1.8x smaller) |
| + Sections | 12.3 KB | vs 22 KB (1.8x smaller) |
| + Async | 13.5 KB | vs 21 KB (1.6x smaller) |
| All plugins | ~16 KB | vs 23 KB (1.4x smaller) |

**Average improvement:** 2-3x smaller bundles!

## Core Concepts

### 1. Builder Factory

The `vlist()` function creates a builder instance:

```typescript
import { vlist } from 'vlist';

const builder = vlist({
  container: '#app',
  items: data,
  item: {
    height: 48,
    template: (item) => `<div>${item.name}</div>`,
  },
});
```

At this point, you have a builder - **not** a list instance.

### 2. Adding Plugins

Use `.use()` to add plugins:

```typescript
const builder = vlist({ ... })
  .use(withSelection({ mode: 'single' }))
  .use(withScrollbar({ autoHide: true }));
```

Each plugin adds specific functionality and increases bundle size proportionally.

### 3. Building the Instance

Call `.build()` to create the actual list:

```typescript
const list = vlist({ ... })
  .use(withSelection({ ... }))
  .build();

// Now you have a VList instance with methods
list.scrollToIndex(10);
list.selectItem(5);
```

## Plugin System

### Available Plugins

| Plugin | Cost | Description |
|--------|------|-------------|
| `withGrid()` | +4.0 KB | 2D grid layout |
| `withSections()` | +4.6 KB | Grouped lists with sticky/inline headers |
| `withAsync()` | +5.3 KB | Async data loading with adapters |
| `withSelection()` | +2.3 KB | Single/multiple item selection |
| `withScale()` | +2.2 KB | Handle 1M+ items with compression |
| `withScrollbar()` | +1.0 KB | Custom scrollbar UI |
| `withPage()` | +0.9 KB | Document-level scrolling |
| `withSnapshots()` | Included | Scroll save/restore |

### Plugin Priority

Plugins execute in priority order (lower = earlier):

| Priority | Plugins | Why |
|----------|---------|-----|
| 10 | `withPage()` | Changes scroll element |
| 15 | `withAsync()` | Sets up data loading |
| 20 | `withScale()` | Modifies scroll calculations |
| 30 | `withGrid()`, `withSections()` | Modify layout |
| 50 | Default | Most plugins |
| 60 | `withSelection()` | Depends on layout |
| 70 | `withScrollbar()` | Depends on scroll setup |
| 90 | `withSnapshots()` | Needs everything ready |

**You don't need to worry about order** - plugins auto-sort by priority. But it's clearer to add them logically.

## Common Patterns

### Simple List (No Plugins)

```typescript
import { vlist } from 'vlist';

const list = vlist({
  container: '#list',
  items: users,
  item: {
    height: 64,
    template: (user) => `<div>${user.name}</div>`,
  },
}).build();
```

**Bundle:** 7.7 KB gzipped

### Photo Gallery

```typescript
import { vlist, withGrid, withScrollbar } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" />`,
  },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 11.7 KB gzipped

### Contact List (A-Z)

```typescript
import { vlist, withSections } from 'vlist';

const contacts = vlist({
  container: '#contacts',
  items: sortedContacts,  // Pre-sorted by lastName
  item: {
    height: 56,
    template: (contact) => `<div>${contact.name}</div>`,
  },
})
  .use(withSections({
    getGroupForIndex: (i) => contacts[i].lastName[0].toUpperCase(),
    headerHeight: 36,
    headerTemplate: (letter) => `<div class="header">${letter}</div>`,
    sticky: true,
  }))
  .build();
```

**Bundle:** 12.3 KB gzipped

### Chat UI (Reverse + Inline Headers)

```typescript
import { vlist, withSections } from 'vlist';

const chat = vlist({
  container: '#messages',
  reverse: true,  // Start at bottom
  items: messages,  // Chronological order (oldest first)
  item: {
    height: (i) => messages[i].height || 60,
    template: (msg) => `<div class="message">${msg.text}</div>`,
  },
})
  .use(withSections({
    getGroupForIndex: (i) => formatDate(messages[i].timestamp),
    headerHeight: 32,
    headerTemplate: (date) => `<div class="date-sep">${date}</div>`,
    sticky: false,  // Inline headers (iMessage style)
  }))
  .build();

// New messages auto-scroll to bottom
chat.appendItems([newMessage]);

// History loads preserve scroll
chat.prependItems(olderMessages);
```

**Bundle:** 11.9 KB gzipped

### Infinite Scroll Feed

```typescript
import { vlist, withPage, withAsync } from 'vlist';

const feed = vlist({
  container: '#feed',
  item: {
    height: 300,
    template: (post) => {
      if (!post) return `<div class="skeleton">Loading...</div>`;
      return `<article>${post.content}</article>`;
    },
  },
})
  .use(withPage())  // Document scroll
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

**Bundle:** 13.5 KB gzipped

### Large Dataset (1M+ Items)

```typescript
import { vlist, withScale, withScrollbar } from 'vlist';

const bigList = vlist({
  container: '#list',
  items: generateItems(5_000_000),
  item: {
    height: 48,
    template: (item) => `<div>#${item.id}: ${item.name}</div>`,
  },
})
  .use(withScale())  // Auto-compresses when > 16.7M pixels
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 9.9 KB gzipped

### File Browser (Complex)

```typescript
import { vlist, withGrid, withSections, withSelection, withScrollbar } from 'vlist';

const browser = vlist({
  container: '#browser',
  items: files,
  item: {
    height: 200,
    template: (file) => `<div class="file-card">...</div>`,
  },
})
  .use(withGrid({ columns: 6, gap: 12 }))
  .use(withSections({
    getGroupForIndex: (i) => files[i].category,
    headerHeight: 40,
    headerTemplate: (cat) => `<h2>${cat}</h2>`,
    sticky: true,
  }))
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 15.3 KB gzipped

## API Reference

### `vlist(config)`

Creates a builder instance.

```typescript
function vlist<T>(config: VListConfig<T>): VListBuilder<T>
```

**Parameters:**

```typescript
interface VListConfig<T> {
  // Required
  container: HTMLElement | string;
  item: {
    height?: number | ((index: number) => number);  // Required for vertical
    width?: number | ((index: number) => number);   // Required for horizontal
    template: (item: T, index: number, state: ItemState) => string | HTMLElement;
  };
  
  // Optional
  items?: T[];
  overscan?: number;              // Default: 3
  direction?: 'vertical' | 'horizontal';  // Default: 'vertical'
  reverse?: boolean;              // Default: false
  classPrefix?: string;           // Default: 'vlist'
  ariaLabel?: string;
  
  scroll?: {
    wheel?: boolean;              // Default: true
    wrap?: boolean;               // Default: false
    scrollbar?: 'none';
    idleTimeout?: number;         // Default: 150ms
  };
}
```

**Returns:** `VListBuilder<T>`

### `.use(plugin)`

Adds a plugin to the builder.

```typescript
builder.use<T>(plugin: VListPlugin<T>): VListBuilder<T>
```

**Parameters:**
- `plugin` - A plugin created by `withX()` functions

**Returns:** The builder (for chaining)

**Example:**
```typescript
vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSelection({ mode: 'single' }))
```

### `.build()`

Creates the final VList instance.

```typescript
builder.build(): VList<T>
```

**Returns:** `VList<T>` instance with all methods

**Example:**
```typescript
const list = vlist({ ... })
  .use(withGrid({ ... }))
  .build();

// Now you can use the instance
list.scrollToIndex(50);
```

## Plugin Compatibility

### Compatible Combinations

✅ `withGrid()` + `withSections()` - Grouped grid layouts
✅ `withGrid()` + `withSelection()` - Selectable gallery
✅ `withSections()` + `withSelection()` - Selectable grouped list
✅ `withAsync()` + `withScale()` - Large async dataset
✅ `withPage()` + `withAsync()` - Infinite scroll blog

### Incompatible Combinations

❌ `withGrid()` + `direction: 'horizontal'` - Grid requires vertical
❌ `withSections()` + `direction: 'horizontal'` - Sections require vertical
❌ `withPage()` + `withScrollbar()` - Page uses native scrollbar
❌ `reverse: true` + `direction: 'horizontal'` - Reverse requires vertical

The builder will throw an error if you try to combine incompatible plugins.

## Advanced Usage

### Conditional Plugins

```typescript
import { vlist, withGrid, withSections } from 'vlist';

let builder = vlist({
  container: '#list',
  items: data,
  item: { height: 200, template: renderItem },
});

// Conditionally add grid
if (viewMode === 'grid') {
  builder = builder.use(withGrid({ columns: 4, gap: 16 }));
}

// Conditionally add sections
if (groupBy !== 'none') {
  builder = builder.use(withSections({
    getGroupForIndex: (i) => data[i].category,
    headerHeight: 40,
    headerTemplate: (cat) => `<h2>${cat}</h2>`,
  }));
}

const list = builder.build();
```

### Dynamic Reconfiguration

Some plugins support dynamic updates:

```typescript
const list = vlist({ ... })
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withSelection({ mode: 'single' }))
  .build();

// Update grid columns
list.updateGrid({ columns: 6 });

// Change selection mode
list.setSelectionMode('multiple');
```

### Accessing Plugin Features

Plugins add methods to the VList instance:

```typescript
const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .build();

// Methods added by withSelection:
list.selectItem(5);
list.deselectItem(5);
list.toggleSelection(5);
list.selectAll();
list.clearSelection();
list.getSelectedIds();
list.getSelectedItems();
```

## Builder Architecture

### Core (Always Included)

The builder core (17.1 KB minified, 6.3 KB gzipped) includes:

- ✅ Virtual scrolling calculations
- ✅ Height cache (fixed/variable)
- ✅ Element pooling and recycling
- ✅ DOM structure creation
- ✅ Event emitter system
- ✅ Resize observer
- ✅ Data management (setItems, appendItems, etc.)
- ✅ Scroll methods (scrollToIndex, getScrollPosition)
- ✅ Reverse mode support
- ✅ ARIA accessibility
- ✅ Lifecycle management

### What Plugins Add

Plugins extend the core with additional capabilities:

```typescript
withGrid()        → 2D layout calculations, column positioning
withSections()    → Header injection, sticky positioning, grouping logic
withSelection()   → Selection state, keyboard nav, click handlers
withAsync()       → Sparse storage, placeholders, data fetching
withScale()       → Scroll compression, large dataset handling
withScrollbar()   → Custom scrollbar DOM, drag handling
withPage()        → Window scroll integration
withSnapshots()   → Scroll position serialization
```

### Performance Characteristics

**The hot path is never affected by plugins:**

```
Scroll event fires
    ↓
Calculate visible range (height cache)
    ↓
Calculate render range (overscan)
    ↓
Render items (element pool)
    ↓
Position items (transform)
    ↓
Emit events
```

This pipeline runs identically with 0 plugins or 8 plugins. Plugins add handlers and methods **around** the pipeline, never inside it.

## Design Principles

### 1. Explicit Over Implicit

```typescript
// ✅ Good - Clear what's included
import { vlist, withGrid } from 'vlist';
vlist({ ... }).use(withGrid({ ... })).build();

// ❌ Bad (old API) - Hidden dependencies
import { vlist } from 'vlist';
vlist({ grid: { ... } });  // Grid implicitly included
```

### 2. Pay Only for What You Use

Every import adds to your bundle. Choose wisely:

```typescript
// Basic list: 7.7 KB gzip
import { vlist } from 'vlist';

// With grid: 11.7 KB gzip
import { vlist, withGrid } from 'vlist';

// With everything: ~16 KB gzip
import { vlist, withGrid, withSections, withSelection, withAsync } from 'vlist';
```

### 3. Composable by Default

Plugins are designed to work together:

```typescript
vlist({ ... })
  .use(withAsync({ adapter }))     // Lazy loading
  .use(withGrid({ columns: 4 }))   // 2D layout
  .use(withSections({ ... }))      // Grouped by category
  .use(withSelection({ ... }))     // Multi-select
  .build();
```

## Best Practices

### Import Only What You Need

❌ **Don't:**
```typescript
import * as VList from 'vlist';  // Imports everything
```

✅ **Do:**
```typescript
import { vlist, withGrid, withSelection } from 'vlist';
```

### Order Plugins Logically

While plugins auto-sort by priority, ordering them logically improves readability:

```typescript
vlist({ ... })
  .use(withPage())        // Scroll setup
  .use(withAsync({ ... })) // Data loading
  .use(withGrid({ ... }))  // Layout
  .use(withSections({ ... }))  // Grouping
  .use(withSelection({ ... }))  // Interaction
  .use(withScrollbar({ ... }))  // UI chrome
  .build()
```

### Keep Config Minimal

Only pass what the base builder needs. Plugin-specific config goes in `.use()`:

```typescript
// ✅ Good
vlist({
  container: '#app',
  items: data,
  item: { height: 48, template: render },
})
  .use(withGrid({ columns: 4 }))  // Grid config here

// ❌ Bad (old API pattern)
vlist({
  container: '#app',
  items: data,
  item: { height: 48, template: render },
  grid: { columns: 4 },  // Config in wrong place
})
```

### Use TypeScript

Take advantage of full type inference:

```typescript
import { vlist, withSelection, type VList, type VListConfig } from 'vlist';

interface User {
  id: number;
  name: string;
}

const config: VListConfig<User> = {
  container: '#app',
  items: users,
  item: {
    height: 48,
    template: (user: User) => `<div>${user.name}</div>`,
  },
};

const list: VList<User> = vlist(config)
  .use(withSelection({ mode: 'single' }))
  .build();

// Fully typed!
list.on('item:click', ({ item }) => {
  console.log(item.name);  // TypeScript knows item is User
});
```

## Plugin Development

### Creating a Custom Plugin

```typescript
import { vlist, type VListPlugin, type BuilderContext } from 'vlist';

interface LoggerConfig {
  prefix?: string;
}

const withLogger = (config: LoggerConfig = {}): VListPlugin => ({
  name: 'withLogger',
  priority: 100,  // Run late
  
  setup(ctx: BuilderContext) {
    const prefix = config.prefix || '[VList]';
    
    // Access core components
    const { emitter, config: vlistConfig } = ctx;
    
    // Add event listeners
    emitter.on('scroll', ({ scrollTop }) => {
      console.log(`${prefix} Scrolled to:`, scrollTop);
    });
    
    emitter.on('range:change', ({ range }) => {
      console.log(`${prefix} Visible range:`, range);
    });
    
    // Register custom method
    ctx.registerMethod('log', (message: string) => {
      console.log(`${prefix}`, message);
    });
  }
});

// Usage
const list = vlist({ ... })
  .use(withLogger({ prefix: '[MyApp]' }))
  .build();

list.log('Hello!');  // [MyApp] Hello!
```

### BuilderContext API

Plugins receive a `BuilderContext` with:

```typescript
interface BuilderContext<T> {
  // Core components
  dom: DOMStructure;              // Root, viewport, content elements
  config: ResolvedConfig<T>;      // Resolved configuration
  emitter: Emitter;               // Event system
  heightCache: HeightCache;       // Height calculations
  renderer: Renderer;             // DOM rendering
  
  // Registration methods
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

## Bundle Analysis

### What Gets Included

When you write:

```typescript
import { vlist, withGrid, withSelection } from 'vlist';

vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSelection({ mode: 'single' }))
  .build();
```

**Your bundle includes:**
- Builder core: 6.3 KB gzipped
- withGrid: +4.0 KB gzipped
- withSelection: +2.3 KB gzipped
- **Total: 12.6 KB gzipped**

**Your bundle does NOT include:**
- withSections (not imported)
- withAsync (not imported)
- withScale (not imported)
- withScrollbar (not imported)
- withPage (not imported)

**Savings:** ~10 KB gzipped vs bundling everything!

### Tree-Shaking Verification

To verify tree-shaking works:

1. Build your app with production mode
2. Check bundle analysis (webpack-bundle-analyzer, rollup-plugin-visualizer, etc.)
3. Look for vlist modules - should only see imported plugins

## See Also

- **[Plugins Guide](../plugins/README.md)** - Detailed plugin documentation
- **[Grid Plugin](../plugins/grid.md)** - Grid layout details
- **[Sections Plugin](../plugins/sections.md)** - Grouped lists guide
- **[Async Plugin](../plugins/async.md)** - Data loading patterns
- **[Selection Plugin](../plugins/selection.md)** - Selection and keyboard nav
- **[Scale Plugin](../plugins/scale.md)** - Large dataset handling
- **[API Reference](../api/methods.md)** - Complete method documentation
- **[Examples](https://vlist.dev/sandbox/)** - Interactive examples

---

**Interactive Examples:** Try the builder pattern live at [vlist.dev/sandbox](https://vlist.dev/sandbox)