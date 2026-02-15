# Plugin System

> How to extend vlist with custom functionality and why plugins exist.

## Philosophy

vlist is built around two core principles:

1. **Small by default** — Ship only the code your users need
2. **Extensible by design** — Enable any feature through plugins

The base library provides virtual scrolling essentials (~2-3 KB gzipped). Everything else—selection, grids, data adapters, window scrolling—is opt-in via plugins.

## Why Plugins?

### Before (v0.5.0): Monolithic with Auto-Detection

```typescript
import { createVList } from 'vlist'

const list = createVList({
  container: '#app',
  item: { height: 48, template: render },
  selection: { mode: 'single' },  // Auto-includes selection plugin
  layout: 'grid',                  // Auto-includes grid plugin
  grid: { columns: 4, gap: 8 }
})
```

**Problem:** While auto-detection reduced bundle size (53% smaller than v0.4.0), you still shipped:
- All plugin code (~15-20 KB) even if unused features were tree-shaken
- Complex auto-detection logic
- Tight coupling between core and plugins

### After (v0.6.0): True Plugin Architecture

```typescript
import { vlist } from 'vlist/builder'
import { withSelection } from 'vlist/selection'
import { withGrid } from 'vlist/grid'

const list = vlist({
  container: '#app',
  item: { height: 48, template: render }
})
.use(withSelection({ mode: 'single' }))
.use(withGrid({ columns: 4, gap: 8 }))
.build()
```

**Benefits:**
- ✅ **Smaller core** — Only virtual scrolling (~2-3 KB)
- ✅ **Explicit imports** — See exactly what features you're using
- ✅ **Community plugins** — Anyone can extend vlist
- ✅ **No vendor lock-in** — Replace any component

## Bundle Size Targets (v0.6.0)

| Configuration | Size (gzipped) | What's Included |
|---------------|----------------|-----------------|
| Core only | **~2 KB** | Virtual scrolling + element pooling |
| + Selection | ~2.5 KB | + Click/keyboard selection |
| + Grid | ~3 KB | + 2D grid layout |
| + Window mode | ~2.3 KB | + Page scroll integration |
| + Variable heights | ~2.5 KB | + Dynamic height caching |
| All features | ~6 KB | Everything included |

**Previous v0.5.0:** 3.3 KB (core) → 15 KB (typical) → 27 KB (full)

**Improvement:** 33-40% smaller for typical use cases.

## How Plugins Work

### The Plugin Interface

Every plugin implements `VListPlugin`:

```typescript
interface VListPlugin<T extends VListItem = VListItem> {
  /** Unique plugin name */
  readonly name: string
  
  /** Execution priority (lower runs first, default: 50) */
  readonly priority?: number
  
  /** Setup function — receives BuilderContext */
  setup(ctx: BuilderContext<T>): void
  
  /** Optional cleanup */
  destroy?(): void
  
  /** Methods this plugin adds to the public API */
  readonly methods?: readonly string[]
  
  /** Plugins this conflicts with */
  readonly conflicts?: readonly string[]
}
```

### The Builder Context

Plugins receive a `BuilderContext` object with:

**Core Components:**
- `dom` — DOM structure (root, viewport, content)
- `heightCache` — Height calculation and caching
- `emitter` — Event system
- `config` — Resolved configuration

**Replaceable Components:**
- `renderer` — How items are rendered
- `dataManager` — How data is stored/accessed
- `scrollController` — Scroll position management

**Extension Points:**
- `afterScroll` — Callbacks after scroll
- `clickHandlers` — Mouse click handlers
- `keydownHandlers` — Keyboard handlers
- `resizeHandlers` — Container resize handlers
- `destroyHandlers` — Cleanup callbacks

**Public API Registration:**
- `methods` — Map of method name → function
- Exposed on the returned list instance

**Component Replacement:**
- `replaceRenderer()` — Replace rendering logic
- `setScrollFns()` — Override scroll get/set
- `setScrollTarget()` — Change scroll element
- `setRenderFns()` — Replace render triggers
- And many more...

## Official Plugins

### Core Feature Plugins

**Already Extracted (v0.5.0):**
- **`vlist/selection`** — Click/keyboard selection with ARIA
- **`vlist/scroll`** — Custom scrollbar with drag support
- **`vlist/data`** — Async data adapter with placeholders
- **`vlist/compression`** — 1M+ items with scroll compression
- **`vlist/grid`** — 2D grid layout with responsive columns
- **`vlist/groups`** — Grouped lists with sticky headers
- **`vlist/snapshots`** — Scroll position save/restore

**To Be Extracted (v0.6.0):**
- **`vlist/window`** — Window scroll mode (saves ~0.5 KB from core)
- **`vlist/variable`** — Variable height support (saves ~0.3 KB)
- **`vlist/horizontal`** — Horizontal scrolling (saves ~0.4 KB)
- **`vlist/resize`** — ResizeObserver integration (saves ~0.8 KB)

### Minimal Core (v0.6.0 Goal)

After extraction, the core will only include:

✅ **Fixed-height vertical scrolling**
✅ **Element pooling**
✅ **Basic DOM structure**
✅ **Range calculation**
✅ **Event emitter**

Everything else is opt-in.

## Creating a Plugin

### Example: Window Scroll Mode

Window mode lets your list scroll with the page instead of in a container.

```typescript
// vlist/window/plugin.ts

import type { VListItem } from "../types"
import type { VListPlugin, BuilderContext } from "../builder/types"

export const withWindow = <T extends VListItem = VListItem>(): VListPlugin<T> => {
  let cleanup: (() => void) | null = null

  return {
    name: "withWindow",
    priority: 5, // Run early
    
    setup(ctx: BuilderContext<T>): void {
      const { dom, state, config } = ctx
      
      // 1. Modify DOM for window scroll
      dom.root.style.overflow = "visible"
      dom.root.style.height = "auto"
      
      // 2. Use window as scroll target
      ctx.setScrollTarget(window)
      
      // 3. Override scroll position functions
      ctx.setScrollFns(
        // getTop
        () => {
          const rect = dom.viewport.getBoundingClientRect()
          return Math.max(0, -rect.top)
        },
        // setTop
        (pos: number) => {
          const rect = dom.viewport.getBoundingClientRect()
          const pageY = rect.top + window.scrollY
          window.scrollTo({ top: pageY + pos })
        }
      )
      
      // 4. Use window dimensions
      ctx.setContainerDimensions({
        width: () => window.innerWidth,
        height: () => window.innerHeight
      })
      
      // 5. Window resize handler
      const handleResize = () => {
        state.viewportState.containerHeight = window.innerHeight
        ctx.renderIfNeeded()
      }
      
      window.addEventListener('resize', handleResize)
      cleanup = () => window.removeEventListener('resize', handleResize)
      
      ctx.destroyHandlers.push(cleanup)
    },
    
    destroy(): void {
      cleanup?.()
    }
  }
}
```

**Usage:**

```typescript
import { vlist } from 'vlist/builder'
import { withWindow } from 'vlist/window'

const feed = vlist({
  container: '#infinite-feed',
  item: { height: 200, template: renderPost }
})
.use(withWindow())
.build()
```

## Plugin Patterns

### Adding Public Methods

Register methods via `ctx.methods`:

```typescript
setup(ctx: BuilderContext<T>): void {
  ctx.methods.set('myMethod', (arg: string) => {
    console.log('Called with:', arg)
  })
}
```

**Result:**

```typescript
const list = vlist({ ... })
  .use(withMyPlugin())
  .build()

list.myMethod('hello') // Works!
```

### Hooking Into Scroll

Register `afterScroll` callbacks:

```typescript
setup(ctx: BuilderContext<T>): void {
  ctx.afterScroll.push((scrollTop, direction) => {
    console.log(`Scrolled to ${scrollTop}, direction: ${direction}`)
  })
}
```

**When it runs:** After every scroll-triggered render.

### Handling User Input

Register event handlers:

```typescript
setup(ctx: BuilderContext<T>): void {
  ctx.clickHandlers.push((event: MouseEvent) => {
    const target = event.target as HTMLElement
    const element = target.closest('[data-index]')
    if (element) {
      const index = parseInt(element.getAttribute('data-index')!)
      console.log('Clicked item:', index)
    }
  })
  
  ctx.keydownHandlers.push((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      console.log('Escape pressed')
    }
  })
}
```

### Replacing Components

Replace core rendering logic:

```typescript
setup(ctx: BuilderContext<T>): void {
  const originalRenderer = ctx.renderer
  
  ctx.replaceRenderer({
    render: (range, items, pool) => {
      // Custom rendering logic
      console.log('Rendering:', range)
      return originalRenderer.render(range, items, pool)
    },
    update: (element, item, index) => {
      // Custom update logic
      originalRenderer.update(element, item, index)
    }
  })
}
```

### Wrapping Render Functions

Intercept render calls:

```typescript
setup(ctx: BuilderContext<T>): void {
  const { renderIfNeeded, forceRender } = ctx.getRenderFns()
  
  ctx.setRenderFns(
    // Wrap renderIfNeeded
    () => {
      console.log('Before render')
      renderIfNeeded()
      console.log('After render')
    },
    // Wrap forceRender
    () => {
      console.log('Force rendering')
      forceRender()
    }
  )
}
```

## Plugin Priority

Plugins run in priority order (lower = earlier):

| Priority | When to Use | Examples |
|----------|-------------|----------|
| 1-10 | Core replacements | Window mode, horizontal scroll |
| 11-30 | Layout changes | Grid, groups |
| 31-40 | Rendering modifications | Compression, variable heights |
| 41-50 | Feature additions | Selection, data adapter |
| 51+ | Post-processing | Snapshots, analytics |

**Default:** 50

**Why it matters:** Window mode needs to run before selection (which depends on scroll position).

## Plugin Conflicts

Declare conflicts to prevent incompatible combinations:

```typescript
export const withGrid = (): VListPlugin => ({
  name: "withGrid",
  conflicts: ["withGroups"], // Can't combine grid + groups
  
  setup(ctx: BuilderContext): void {
    // Grid logic
  }
})
```

**Result:** Builder throws an error if both are used.

## Community Plugins

### Publishing a Plugin

**Package name:** `vlist-plugin-{name}` or `@scope/vlist-plugin-{name}`

**Example:** `vlist-plugin-analytics`

```typescript
// index.ts
import type { VListPlugin, BuilderContext } from "vlist/builder/types"

export const withAnalytics = (trackingId: string): VListPlugin => ({
  name: "withAnalytics",
  priority: 60, // Run last
  
  setup(ctx: BuilderContext): void {
    ctx.afterScroll.push((scrollTop, direction) => {
      // Send analytics event
      gtag('event', 'scroll', {
        list_position: scrollTop,
        direction
      })
    })
  }
})
```

**Usage:**

```bash
npm install vlist-plugin-analytics
```

```typescript
import { vlist } from 'vlist/builder'
import { withAnalytics } from 'vlist-plugin-analytics'

const list = vlist({ ... })
  .use(withAnalytics('UA-XXXXX'))
  .build()
```

### Plugin Guidelines

**Do:**
- ✅ Use TypeScript with proper types
- ✅ Document all public APIs
- ✅ Include usage examples
- ✅ Clean up in `destroy()`
- ✅ Declare conflicts explicitly
- ✅ Test with real vlist instances

**Don't:**
- ❌ Mutate core state directly
- ❌ Assume other plugins are present
- ❌ Add global side effects
- ❌ Forget to remove event listeners
- ❌ Use priority < 5 (reserved for core plugins)

## Migration from v0.5.0

### Auto-Detection Still Works

The default `createVList()` entry point continues to auto-detect plugins:

```typescript
import { createVList } from 'vlist'

// This still works! (auto-applies plugins internally)
const list = createVList({
  container: '#app',
  item: { height: 48, template: render },
  selection: { mode: 'single' },
  layout: 'grid',
  grid: { columns: 4 }
})
```

**When to use:** Quick prototypes, don't care about bundle size optimization.

### Manual Plugin Selection (Recommended)

For production, use explicit plugins:

```typescript
import { vlist } from 'vlist/builder'
import { withSelection } from 'vlist/selection'
import { withGrid } from 'vlist/grid'

const list = vlist({
  container: '#app',
  item: { height: 48, template: render }
})
.use(withSelection({ mode: 'single' }))
.use(withGrid({ columns: 4 }))
.build()
```

**Benefits:**
- Smaller bundle (only what you import)
- Explicit dependencies
- Better tree-shaking

## Roadmap

### v0.6.0 (In Progress)

**Goals:**
- Extract window mode to plugin
- Extract variable heights to plugin
- Extract horizontal scrolling to plugin
- Core down to ~2 KB gzipped

### v0.7.0 (Future)

**Goals:**
- Extract ResizeObserver to plugin
- Plugin marketplace/registry
- More community plugins
- Plugin composition helpers

## Examples

### Real-World: Infinite Feed with Analytics

```typescript
import { vlist } from 'vlist/builder'
import { withWindow } from 'vlist/window'
import { withData } from 'vlist/data'
import { withAnalytics } from 'vlist-plugin-analytics'

const feed = vlist({
  container: '#feed',
  item: { height: 200, template: renderPost }
})
.use(withWindow())
.use(withData({
  load: async (start, end) => {
    const res = await fetch(`/api/posts?start=${start}&end=${end}`)
    return res.json()
  },
  total: 10000
}))
.use(withAnalytics('UA-XXXXX'))
.build()
```

**Bundle:** ~4 KB (core + window + data + analytics)

### Real-World: Photo Grid with Selection

```typescript
import { vlist } from 'vlist/builder'
import { withGrid } from 'vlist/grid'
import { withSelection } from 'vlist/selection'

const gallery = vlist({
  container: '#gallery',
  item: { height: 200, template: renderPhoto }
})
.use(withGrid({ columns: 'auto', minWidth: 200, gap: 16 }))
.use(withSelection({ mode: 'multiple' }))
.build()

gallery.on('selection:change', ({ selected }) => {
  console.log(`${selected.length} photos selected`)
})
```

**Bundle:** ~3.5 KB (core + grid + selection)

## Summary

| Approach | Bundle Size | Use Case |
|----------|-------------|----------|
| **Core only** | ~2 KB | Simple fixed-height lists |
| **Builder + plugins** | ~2-6 KB | Production apps (optimal) |
| **Default (auto-detect)** | ~3-15 KB | Prototypes, internal tools |

**Bottom line:** Plugins make vlist smaller, more flexible, and community-extensible. Start with the builder pattern for the best bundle size and explicit control.

## Further Reading

- [Bundle Size](./bundle-size.md) — Detailed size breakdown
- [API Reference](./api.md) — Full API documentation
- [Examples](./examples.md) — Real-world usage examples