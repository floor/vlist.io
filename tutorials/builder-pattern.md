# Builder Pattern

> Composable virtual list — pay only for the features you use.

## Why Builder Pattern?

Different use cases need different features. A contact list doesn't need async loading. A photo gallery doesn't need groups. Bundling everything wastes bytes.

| Configuration | Bundle | vs. monolithic |
|---|---|---|
| Base (no features) | 10.5 KB | – |
| + Selection | 13.2 KB | 1.6× smaller |
| + Grid + Scrollbar | 14.3 KB | 1.5× smaller |
| + Groups | 13.2 KB | 1.6× smaller |
| + Async + Page | 14.8 KB | 1.4× smaller |
| All features | ~18 KB | 1.2× smaller |

**Traditional virtual lists:** 20–23 KB minimum (all features bundled).

---

## The Three Steps

### 1. `vlist(config)` — create a builder

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
// builder is NOT a list yet
```

### 2. `.use(feature)` — add features

```typescript
import { withSelection, withScrollbar } from 'vlist';

builder
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar({ autoHide: true }));
```

Each `.use()` returns the builder, so calls chain. Features auto-sort by internal priority — you don't need to worry about order.

### 3. `.build()` — get the instance

```typescript
const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .build();

// Now you have a live VList instance
list.scrollToIndex(50);
list.select(1, 2, 3);
list.destroy();
```

---

## Available Features

| Feature | Import | Cost | Description |
|---|---|---|---|
| `withGrid()` | `vlist` | +3.8 KB | 2D grid layout (virtualises by row) |
| `withGroups()` | `vlist` | +2.7 KB | Grouped lists with sticky or inline headers |
| `withAsync()` | `vlist` | +4.3 KB | Lazy loading via adapter |
| `withSelection()` | `vlist` | +2.7 KB | Single / multiple item selection |
| `withScale()` | `vlist` | +3.0 KB | 1M+ item compression |
| `withScrollbar()` | `vlist` | +1.1 KB | Custom scrollbar UI |
| `withPage()` | `vlist` | +0.4 KB | Document-level scrolling |
| `withSnapshots()` | `vlist` | +0.7 KB | Scroll save/restore |

---

## Feature Compatibility

| Combination | Works? |
|---|---|
| `withGrid()` + `withGroups()` | ✅ Grouped grid |
| `withGrid()` + `withSelection()` | ✅ Selectable gallery |
| `withGroups()` + `withSelection()` | ✅ Selectable grouped list |
| `withAsync()` + `withScale()` | ✅ Large async dataset |
| `withPage()` + `withAsync()` | ✅ Infinite scroll feed |
| `withGrid()` + `orientation: 'horizontal'` | ❌ Grid requires vertical |
| `withGroups()` + `orientation: 'horizontal'` | ❌ Groups require vertical |
| `withPage()` + `withScrollbar()` | ❌ Conflicting scroll ownership |
| `reverse: true` + `orientation: 'horizontal'` | ❌ Reverse requires vertical |

The builder throws at runtime if you combine incompatible features.

---

## Complex Example

File browser with grouped grid, multi-select, and custom scrollbar:

```typescript
import {
  vlist,
  withGrid,
  withGroups,
  withSelection,
  withScrollbar,
} from 'vlist';

const browser = vlist({
  container: '#browser',
  items: files,
  item: {
    height: 200,
    template: (file, index, { selected }) => `
      <div class="file-card ${selected ? 'file-card--selected' : ''}">
        <img src="${file.thumbnail}" />
        <span>${file.name}</span>
      </div>
    `,
  },
})
  .use(withGrid({ columns: 6, gap: 12 }))
  .use(withGroups({
    getGroupForIndex: (i) => files[i].category,
    header: {
      height: 40,
      template: (cat) => `<h2 class="category-header">${cat}</h2>`,
    },
    sticky: true,
  }))
  .use(withSelection({ mode: 'multiple' }))
  .use(withScrollbar({ autoHide: true }))
  .build();

// Bundle: ~15.3 KB gzipped

browser.on('selection:change', ({ selected }) => {
  toolbar.setCount(selected.length);
});
```

---

## Conditional Features

Features can be added conditionally before calling `.build()`:

```typescript
import { vlist, withGrid, withSelection } from 'vlist';

let builder = vlist({
  container: '#list',
  items: data,
  item: { height: 200, template: renderItem },
});

if (config.showGrid) {
  builder = builder.use(withGrid({ columns: 4, gap: 16 }));
}
if (config.allowSelection) {
  builder = builder.use(withSelection({ mode: 'multiple' }));
}

const list = builder.build();
```

---

## See Also

- **[Quick Start](./quick-start)** — Copy-paste examples for every use case
- **[Features Overview](/docs/features/overview)** — All features with correct API
- **[Grid](/docs/features/grid)** · **[Groups](/docs/features/groups)** · **[Async](/docs/features/async)**
- **[Selection](/docs/features/selection)** · **[Scale](/docs/features/scale)** · **[Scrollbar](/docs/features/scrollbar)**
- **[API Reference](/docs/api/reference)** — Complete method reference
