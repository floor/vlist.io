# Bundle Size & Tree-Shaking

> How vlist achieves smaller bundles through explicit feature imports and perfect tree-shaking.

## Overview

VList uses a **builder pattern with explicit features**. You import only the features you need, and bundlers eliminate everything else.

```typescript
import { vlist, withGrid, withSelection } from '@floor/vlist';

const gallery = vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSelection({ mode: 'multiple' }))
  .build();

// Only core + Grid + Selection are bundled
// NOT included: withGroups, withAsync, withScale, withScrollbar, withPage, etc.
```

**Result:** {{size:base:gz}}–{{size:withTable:gz}} KB gzipped depending on features used (vs 20-23 KB for traditional virtual lists).

## Actual Bundle Sizes

All measurements from production builds (minified + gzipped):

### Feature Costs

Each feature adds incrementally to the base bundle:

| Feature | Minified | Gzipped | Incremental (gz) | Description |
|---------|----------|---------|-------------------|-------------|
| **Base** | {{size:base:min}} KB | {{size:base:gz}} KB | — | Core virtualization |
| `withGrid()` | {{size:withGrid:min}} KB | {{size:withGrid:gz}} KB | +{{size:withGrid:delta}} KB | 2D grid layout |
| `withMasonry()` | {{size:withMasonry:min}} KB | {{size:withMasonry:gz}} KB | +{{size:withMasonry:delta}} KB | Masonry layout |
| `withGroups()` | {{size:withGroups:min}} KB | {{size:withGroups:gz}} KB | +{{size:withGroups:delta}} KB | Grouped lists with headers |
| `withAsync()` | {{size:withAsync:min}} KB | {{size:withAsync:gz}} KB | +{{size:withAsync:delta}} KB | Async data loading |
| `withSelection()` | {{size:withSelection:min}} KB | {{size:withSelection:gz}} KB | +{{size:withSelection:delta}} KB | Item selection & keyboard nav |
| `withScale()` | {{size:withScale:min}} KB | {{size:withScale:gz}} KB | +{{size:withScale:delta}} KB | Handle 1M+ items |
| `withScrollbar()` | {{size:withScrollbar:min}} KB | {{size:withScrollbar:gz}} KB | +{{size:withScrollbar:delta}} KB | Custom scrollbar UI |
| `withPage()` | {{size:withPage:min}} KB | {{size:withPage:gz}} KB | +{{size:withPage:delta}} KB | Document-level scrolling |
| `withSnapshots()` | {{size:withSnapshots:min}} KB | {{size:withSnapshots:gz}} KB | +{{size:withSnapshots:delta}} KB | Scroll save/restore |
| `withTable()` | {{size:withTable:min}} KB | {{size:withTable:gz}} KB | +{{size:withTable:delta}} KB | Table layout with columns |
| `withAutoSize()` | {{size:withAutoSize:min}} KB | {{size:withAutoSize:gz}} KB | +{{size:withAutoSize:delta}} KB | Automatic item sizing |

> **Note:** The "Minified" and "Gzipped" columns show the **total** bundle size when that feature is used with the base. The "Incremental" column shows the additional gzipped cost of adding that single feature on top of the base.

## Comparison: Before vs After

### Traditional Virtual Lists

```typescript
import { VirtualList } from 'some-virtual-list';

const list = new VirtualList({
  container: '#app',
  items: data,
  height: 48,
});

// Bundle: 62-70 KB minified / 20-23 KB gzipped
// Includes: ALL features whether you use them or not
```

### VList (Builder Pattern)

```typescript
import { vlist } from '@floor/vlist';

const list = vlist({
  container: '#app',
  items: data,
  item: { height: 48, template: renderItem },
}).build();

// Bundle: {{size:base:min}} KB minified / {{size:base:gz}} KB gzipped
// Includes: ONLY core virtualization
```

### With Features

```typescript
import { vlist, withGrid, withSelection } from '@floor/vlist';

const list = vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSelection({ mode: 'multiple' }))
  .build();

// Includes: Core + Grid + Selection ONLY
// Still smaller than traditional virtual lists
```

## How Tree-Shaking Works

### Explicit Imports

VList exports everything from a single entry point, allowing perfect tree-shaking:

```typescript
// vlist/src/index.ts
export { vlist } from './builder';
export { withGrid } from './features/grid';
export { withMasonry } from './features/masonry';
export { withGroups } from './features/groups';
export { withAsync } from './features/async';
export { withSelection } from './features/selection';
export { withScale } from './features/scale';
export { withScrollbar } from './features/scrollbar';
export { withPage } from './features/page';
export { withSnapshots } from './features/snapshots';
export { withTable } from './features/table';
export { withAutoSize } from './features/autosize';
```

**When you write:**
```typescript
import { vlist, withGrid } from '@floor/vlist';
```

**Bundler includes:**
- ✅ `vlist` function (builder core)
- ✅ `withGrid` function and its dependencies
- ❌ Everything else (not imported, eliminated)

### What Gets Eliminated

```typescript
import { vlist, withGrid } from '@floor/vlist';

// These are exported but NOT imported, so bundler eliminates them:
// - withMasonry and all its code
// - withGroups and all its code
// - withAsync and all its code
// - withSelection and all its code
// - withScale and all its code
// - withScrollbar and all its code
// - withPage and all its code
// - withTable and all its code
// - withAutoSize and all its code

const list = vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .build();

// Final bundle: {{size:withGrid:gz}} KB gzipped
```

## Bundle Analysis

### Minimal Configuration

```typescript
import { vlist } from '@floor/vlist';

vlist({ ... }).build();
```

**Bundle:**
- {{size:base:min}} KB minified
- **{{size:base:gz}} KB gzipped**

### Medium Configuration

```typescript
import { vlist, withSelection, withScrollbar } from '@floor/vlist';

vlist({ ... })
  .use(withSelection({ mode: 'single' }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:**
- Base: {{size:base:gz}} KB gzipped
- withSelection: +{{size:withSelection:delta}} KB gzipped
- withScrollbar: +{{size:withScrollbar:delta}} KB gzipped
- **Estimated total: smaller than traditional virtual lists**

> Individual feature deltas are measured one at a time. When combining multiple features, shared code may be deduplicated, so the actual total can be smaller than the sum of deltas.

### Full Configuration

```typescript
import {
  vlist,
  withGrid,
  withGroups,
  withSelection,
  withAsync,
  withScale,
  withScrollbar
} from '@floor/vlist';

vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withGroups({ ... }))
  .use(withSelection({ mode: 'multiple' }))
  .use(withAsync({ adapter }))
  .use(withScale())
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** Even with many features, vlist remains smaller than traditional virtual lists that ship everything by default.

## Optimization Strategies

### 1. Import Only What You Need

❌ **Don't:**
```typescript
import * as VList from '@floor/vlist';  // Imports everything
```

✅ **Do:**
```typescript
import { vlist, withGrid } from '@floor/vlist';  // Only what you use
```

### 2. Lazy Load Heavy Features

For features only needed in certain views, use dynamic imports:

```typescript
// Base list loads immediately
const list = vlist({ ... }).build();

// Grid feature loads on demand
button.addEventListener('click', async () => {
  const { withGrid } = await import('vlist');

  list.destroy();
  const gridList = vlist({ ... })
    .use(withGrid({ columns: 4 }))
    .build();
});
```

**Benefit:** Initial page load is smaller, grid code loads when needed.

### 3. Conditional Feature Loading

```typescript
import { vlist, withGroups } from '@floor/vlist';

let builder = vlist({ ... });

// Only add groups if grouping enabled
if (groupBy !== 'none') {
  builder = builder.use(withGroups({ ... }));
}

const list = builder.build();
```

**Benefit:** Bundle includes conditional feature only if your app logic uses it.

### 4. Use CDN for Examples/Prototypes

For quick prototypes, load from CDN:

```html
<script type="module">
  import { vlist, withGrid } from 'https://cdn.jsdelivr.net/npm/@floor/vlist/+esm';

  const list = vlist({ ... })
    .use(withGrid({ columns: 4 }))
    .build();
</script>
```

**Benefit:** Zero build step, browser caches the module.

## Verification

### Check Your Bundle

Use your bundler's analysis tool to verify tree-shaking:

**Webpack:**
```bash
npx webpack-bundle-analyzer stats.json
```

**Rollup:**
```bash
npx rollup-plugin-visualizer
```

**Vite:**
```bash
vite build --mode production
```

Look for `vlist` modules - you should only see the ones you imported.

### Expected Results

**If you imported:**
```typescript
import { vlist, withGrid, withSelection } from '@floor/vlist';
```

**Bundle analyzer should show:**
- ✅ `vlist/builder/core.js` (builder core)
- ✅ `vlist/features/grid/` (grid feature)
- ✅ `vlist/features/selection/` (selection feature)
- ❌ NO `features/async/`
- ❌ NO `features/scale/`
- ❌ NO `features/groups/`
- ❌ NO `features/scrollbar/`
- ❌ NO `features/table/`

## Common Misconceptions

### "I only use basic features, why is my bundle {{size:base:gz}} KB?"

**Answer:** That's the core virtualization! It includes:
- Virtual scrolling calculations
- Element pooling and recycling
- Height cache (variable heights)
- DOM structure management
- Event system
- Scroll handling
- Data management (setItems, appendItems, etc.)
- ARIA accessibility

{{size:base:gz}} KB gzipped is **very small** for all that functionality.

### "Adding features makes the bundle bigger"

**Answer:** Yes, that's expected! Each feature adds specific functionality:
- withGrid adds +{{size:withGrid:delta}} KB for 2D layout calculations
- withAsync adds +{{size:withAsync:delta}} KB for data fetching and sparse storage
- withSelection adds +{{size:withSelection:delta}} KB for selection state and keyboard navigation

The key is you **only pay for what you use**. Traditional virtual lists bundle everything regardless.

### "Can I make it smaller than {{size:base:gz}} KB?"

**Answer:** The base at {{size:base:gz}} KB gzipped is the core virtualization engine. Some of the lightest features like `withPage()` (+{{size:withPage:delta}} KB) and `withSnapshots()` (+{{size:withSnapshots:delta}} KB) add very little overhead. For production apps, {{size:base:gz}}–{{size:withAsync:gz}} KB is excellent for a full-featured virtual list.

## Best Practices

### ✅ Do

- Import only the features you actually use
- Use dynamic imports for conditional features
- Check bundle analysis in production builds
- Measure before and after adding features

### ❌ Don't

- Don't import features you don't use
- Don't use wildcard imports (`import * from '@floor/vlist'`)
- Don't worry about 1-2 KB differences (focus on features)
- Don't sacrifice functionality to save bytes

## FAQ

### Q: Why is vlist smaller than other virtual lists?

**A:** Three reasons:
1. **Builder pattern** - Only used features are bundled
2. **Self-contained core** - No module overhead
3. **Zero dependencies** - No external libraries

### Q: Does tree-shaking work with all bundlers?

**A:** Yes! Tested with:
- ✅ Webpack 5
- ✅ Rollup
- ✅ Vite
- ✅ esbuild
- ✅ Parcel 2

All modern bundlers support ES modules tree-shaking.

### Q: Can I see the exact bundle composition?

**A:** Yes! Use webpack-bundle-analyzer or rollup-plugin-visualizer. You'll see each imported module and its size.

### Q: What if I need all features?

**A:** Even with all features, vlist stays well under the 20-23 KB gzipped range of traditional virtual lists. Check the feature costs table above for exact per-feature sizes.

## Summary

| Metric | VList (Builder) | Traditional | Improvement |
|--------|----------------|-------------|-------------|
| **Minimal** | {{size:base:gz}} KB gzipped | 20-23 KB | **Much smaller** |
| **Heaviest single feature** | {{size:withTable:gz}} KB gzipped | 20-23 KB | **Still smaller** |
| **Tree-shaking** | ✅ Perfect | ❌ None | Huge benefit |

**Bottom line:** VList delivers smaller bundles by letting you import only what you need. The base is just {{size:base:gz}} KB gzipped, and each feature costs only {{size:withPage:delta}}–{{size:withTable:delta}} KB extra.

## See Also

- **[Builder Pattern](/tutorials/builder-pattern)** - How to compose features
- **[Features Overview](../features/overview.md)** - All available features
- **[Optimization Guide](/tutorials/optimization)** - Performance tuning
- **[Benchmarks](./benchmarks.md)** - Performance metrics

---

**Interactive Examples:** [vlist.io/examples](https://vlist.io/examples) - See bundle sizes in action