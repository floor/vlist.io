# Plugin System

> Composable virtual list — pay only for the plugins you use.

## Why Plugins?

Different use cases need different features. A contact list doesn't need async loading. A photo gallery doesn't need groups. Bundling everything wastes bytes. With the plugin system, you compose exactly what you need.

---

## The Two Steps

### 1. `createVList(config)` — create the base

```typescript
import { createVList } from 'vlist';

const list = createVList({
  container: '#app',
  items: data,
  item: {
    height: 48,
    template: (item) => `<div>${item.name}</div>`,
  },
});
// You now have a working virtual list
```

### 2. Add plugins as the second argument

```typescript
import { createVList, selection, scrollbar } from 'vlist';

const list = createVList(
  {
    container: '#app',
    items: data,
    item: {
      height: 48,
      template: (item) => `<div>${item.name}</div>`,
    },
  },
  [
    selection({ mode: 'multiple' }),
    scrollbar({ autoHide: true }),
  ]
);

// Now you have a list with selection and custom scrollbar
list.scrollToIndex(50);
list.select(1, 2, 3);
list.destroy();
```

No `.build()` step — `createVList` returns the instance directly. Plugin order doesn't matter; priorities are fixed internally.

---

## Available Plugins

| Plugin | Import | Description |
|---|---|---|
| `grid()` | `vlist` | 2D grid layout (virtualises by row) |
| `groups()` | `vlist` | Grouped lists with sticky or inline headers |
| `data()` | `vlist` | Lazy loading via adapter |
| `selection()` | `vlist` | Single / multiple item selection |
| `scale()` | `vlist` | 1M+ item compression |
| `scrollbar()` | `vlist` | Custom scrollbar UI |
| `page()` | `vlist` | Document-level scrolling |
| `snapshots()` | `vlist` | Scroll save/restore |
| `autosize()` | `vlist` | Dynamic item height |
| `sortable()` | `vlist` | Drag-to-reorder items |
| `transition()` | `vlist` | Smooth fade/slide animations |
| `table()` | `vlist` | Table layout with columns |
| `masonry()` | `vlist` | Masonry grid (auto-flowing columns) |
| `a11y()` | `vlist` | Accessibility enhancements (ARIA, focus management) |

---

## Plugin Compatibility

| Combination | Works? | Notes |
|---|---|---|
| `grid()` + `groups()` | ✅ | Grouped grid |
| `grid()` + `selection()` | ✅ | Selectable gallery |
| `groups()` + `selection()` | ✅ | Selectable grouped list |
| `data()` + `scale()` | ✅ | Large async dataset |
| `page()` + `data()` | ✅ | Infinite scroll feed |
| `grid()` + `masonry()` | ❌ | Layout plugins are mutually exclusive |
| `grid()` + `table()` | ❌ | Layout plugins are mutually exclusive |
| `masonry()` + `table()` | ❌ | Layout plugins are mutually exclusive |
| `transition()` with grouped or nested lists | ❌ | Transition only works with flat lists |
| `page()` + `scrollbar()` | ❌ | Conflicting scroll ownership |
| `grid()` + `orientation: 'horizontal'` | ❌ | Grid requires vertical orientation |
| `groups()` + `orientation: 'horizontal'` | ❌ | Groups require vertical orientation |

If you combine incompatible plugins, the library will throw an error at runtime with a clear message.

---

## Complex Example

File browser with grouped grid, multi-select, and custom scrollbar:

```typescript
import {
  createVList,
  grid,
  groups,
  selection,
  scrollbar,
} from 'vlist';

const browser = createVList(
  {
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
  },
  [
    grid({ columns: 6, gap: 12 }),
    groups({
      getGroupForIndex: (i) => files[i].category,
      header: {
        height: 40,
        template: (cat) => `<h2 class="category-header">${cat}</h2>`,
      },
      sticky: true,
    }),
    selection({ mode: 'multiple' }),
    scrollbar({ autoHide: true }),
  ]
);

browser.on('selection:change', ({ selected }) => {
  toolbar.setCount(selected.length);
});
```

---

## Conditional Plugins

Plugins can be composed conditionally:

```typescript
import { createVList, grid, selection } from 'vlist';

const plugins = [];

if (config.showGrid) {
  plugins.push(grid({ columns: 4, gap: 16 }));
}
if (config.allowSelection) {
  plugins.push(selection({ mode: 'multiple' }));
}

const list = createVList(
  {
    container: '#list',
    items: data,
    item: { height: 200, template: renderItem },
  },
  plugins
);
```

---

## See Also

- **[Quick Start](./quick-start)** — Copy-paste examples for every use case
- **[Plugins Overview](/docs/plugins/overview)** — All plugins with correct API
- **[Grid](/docs/plugins/grid)** · **[Groups](/docs/plugins/groups)** · **[Data](/docs/plugins/data)**
- **[Selection](/docs/plugins/selection)** · **[Scale](/docs/plugins/scale)** · **[Scrollbar](/docs/plugins/scrollbar)**
- **[API Reference](/docs/api)** — Complete method reference
