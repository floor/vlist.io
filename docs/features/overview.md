# Features

> All features are tree-shaken — you only pay for what you import and use.

## Quick Reference

| Feature | Cost (gzipped) | Description |
|---|---|---|
| `withAsync()` | +{{size:withAsync:delta}} KB | Lazy loading via adapter with placeholders |
| `withSelection()` | +{{size:withSelection:delta}} KB | Single / multiple item selection with keyboard nav |
| `withGrid()` | +{{size:withGrid:delta}} KB | 2D grid layout (virtualises by row) |
| `withTable()` | +{{size:withTable:delta}} KB | Data table with resizable columns, sortable headers |
| `withMasonry()` | +{{size:withMasonry:delta}} KB | Pinterest-style shortest-lane placement |
| `withGroups()` | +{{size:withGroups:delta}} KB | Grouped lists with sticky or inline headers |
| `withScrollbar()` | +{{size:withScrollbar:delta}} KB | Custom scrollbar UI with auto-hide |
| `withPage()` | +{{size:withPage:delta}} KB | Document-level (window) scrolling |
| `withScale()` | +{{size:withScale:delta}} KB | Compress scroll space for 1M+ items |
| `withAutoSize()` | +{{size:withAutoSize:delta}} KB | Auto-measure items via ResizeObserver (Mode B) |
| `withSortable()` | +{{size:withSortable:delta}} KB | Drag-and-drop reordering with smooth item shifting |
| `withSnapshots()` | +{{size:withSnapshots:delta}} KB | Scroll position save/restore |

---

## withAsync() — Lazy Loading

```typescript
import { vlist, withAsync } from 'vlist';

const feed = vlist({
  container: '#feed',
  item: {
    height: 80,
    template: (item) => {
      if (!item) return `<div class="skeleton"></div>`;
      return `<div>${item.title}</div>`;
    },
  },
})
  .use(withAsync({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`);
        return res.json(); // { items, total, hasMore }
      },
    },
    loading: { cancelThreshold: 5, preloadThreshold: 2, preloadAhead: 50 },
  }))
  .build();
```

→ [Full docs](./async.md)

---

## withSelection() — Item Selection

```typescript
import { vlist, withSelection } from 'vlist';

const list = vlist({
  container: '#list',
  items: users,
  item: {
    height: 48,
    template: (user, i, { selected }) =>
      `<div class="${selected ? 'selected' : ''}">${user.name}</div>`,
  },
})
  .use(withSelection({ mode: 'multiple', initial: [1, 2] }))
  .build();

list.select(5);            // select by id
list.deselect(1);          // deselect by id
list.toggleSelect(3);      // toggle by id
list.selectAll();
list.clearSelection();
list.getSelected();        // → [2, 5]
list.getSelectedItems();   // → [{ id: 2, ... }, { id: 5, ... }]
```

→ [Full docs](./selection.md)

---

## withSortable() — Drag & Drop Reorder

```typescript
import { vlist, withSortable } from 'vlist';

const list = vlist({
  container: '#list',
  items: tasks,
  item: {
    height: 56,
    template: (task) => `
      <div class="task">
        <span class="grip">&#x2807;</span>
        ${task.name}
      </div>
    `,
  },
})
  .use(withSortable({ handle: '.grip' }))
  .build();

list.on('sort:end', ({ fromIndex, toIndex }) => {
  const reordered = [...tasks];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  list.setItems(reordered);
});
```

Items shift out of the way as you drag — like iOS. Cannot combine with `withGrid()`, `withMasonry()`, or `withTable()`.

→ [Full docs](./sortable.md)

---

## withGrid() — 2D Grid Layout

```typescript
import { vlist, withGrid } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" alt="${photo.title}" />`,
  },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .build();

```

→ [Full docs](./grid.md)

---

## withTable() — Data Table

```typescript
import { vlist, withTable, withSelection } from 'vlist';

const table = vlist({
  container: '#employees',
  items: employees,
  item: { height: 40, template: () => '' },
})
  .use(withTable({
    columns: [
      { key: 'name',       label: 'Name',       width: 220, sortable: true },
      { key: 'email',      label: 'Email',      width: 280, sortable: true },
      { key: 'department', label: 'Department',  width: 140, sortable: true },
      { key: 'role',       label: 'Role',        width: 180 },
    ],
    rowHeight: 40,
    headerHeight: 44,
  }))
  .use(withSelection({ mode: 'single' }))
  .build();
```

Leverages all of vlist's core — virtualization, element pooling, size caching, scroll compression — and layers column-aware rendering on top. Rows are the unit of virtualization (same as a plain list), so `withScale`, `withAsync`, `withSelection`, and all other features compose unchanged.

→ [Full docs](./table.md)

---

## withMasonry() — Pinterest Layout

```typescript
import { vlist, withMasonry } from 'vlist';

const gallery = vlist({
  container: '#gallery',
  items: photos,
  item: {
    height: (index) => photos[index].aspectRatio * 200,
    template: (photo) => `<img src="${photo.url}" alt="${photo.title}" />`,
  },
})
  .use(withMasonry({ columns: 3, gap: 12 }))
  .build();
```

Items flow into the shortest column, creating an organic packed layout with no wasted space. Unlike grid, each item can have a different height.

→ [Full docs](./masonry.md)

---

## withGroups() — Grouped Lists

```typescript
import { vlist, withGroups } from 'vlist';

// Sticky headers (Telegram-style contact list)
const contacts = vlist({
  container: '#contacts',
  items: sortedContacts, // must be pre-sorted by group
  item: { height: 56, template: (c) => `<div>${c.name}</div>` },
})
  .use(withGroups({
    getGroupForIndex: (i) => sortedContacts[i].lastName[0].toUpperCase(),
    headerHeight: 36,
    headerTemplate: (letter) => `<div class="header">${letter}</div>`,
    sticky: true,
  }))
  .build();
```

→ [Full docs](./groups.md)

---

## withScrollbar() — Custom Scrollbar

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#list',
  items: data,
  item: { height: 48, template: renderItem },
})
  .use(withScrollbar({
    autoHide: true,
    autoHideDelay: 1000,
    minThumbSize: 20,
    showOnHover: true,
    hoverZoneWidth: 16,
    showOnViewportEnter: true,
  }))
  .build();
```

→ [Full docs](./scrollbar.md)

---

## withPage() — Document Scrolling

```typescript
import { vlist, withPage, withAsync } from 'vlist';

const blog = vlist({
  container: '#articles',
  item: { height: 400, template: (post) => `<article>${post.title}</article>` },
})
  .use(withPage())     // window scroll instead of container scroll
  .use(withAsync({
    adapter: { read: async ({ offset, limit }) => fetchPosts(offset, limit) },
  }))
  .build();
```

Cannot combine with `withScrollbar()` or `orientation: 'horizontal'`.

→ [Full docs](./page.md)

---

## withScale() — 1M+ Items

```typescript
import { vlist, withScale, withScrollbar } from 'vlist';

const bigList = vlist({
  container: '#list',
  items: generateItems(2_000_000),
  item: { height: 48, template: (item) => `<div>${item.id}</div>` },
})
  .use(withScale())                      // auto-activates above browser limit
  .use(withScrollbar({ autoHide: true }))
  .build();
```

→ [Full docs](./scale.md)

---

## withAutoSize() — Auto-Measurement

Measure items via `ResizeObserver` for content with unpredictable sizes.

```typescript
import { vlist, withAutoSize } from 'vlist';

const feed = vlist({
  container: '#feed',
  items: posts,
  item: {
    estimatedHeight: 120,
    template: (post) => `<article>${post.text}</article>`,
  },
})
  .use(withAutoSize())
  .build();
```

Items render at the estimated size, then snap to their measured height. Each item is measured once and cached.

> [Full docs](./autosize.md)

---

## withSnapshots() — Scroll Save/Restore

```typescript
import { vlist, withSnapshots } from 'vlist';

const list = vlist({ container: '#list', items, item: { height: 48, template: render } })
  .use(withSnapshots())
  .build();

// Save before navigation
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('scroll', JSON.stringify(snapshot));

// Restore on return
const saved = JSON.parse(sessionStorage.getItem('scroll') ?? 'null');
if (saved) list.restoreScroll(saved);
```

→ [Full docs](./snapshots.md)

---

## Feature Compatibility

Most features compose freely. This matrix shows the known constraints:

| | Table | Grid | Masonry | Groups | Async | Selection | Sortable | Scale | Scrollbar | Page | Snapshots | AutoSize |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Table** | — | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| **Grid** | ❌ | — | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ⚠️ | ✅ | ❌ |
| **Masonry** | ❌ | ❌ | — | ❌ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Groups** | ✅ | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Async** | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Selection** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sortable** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Scale** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ❌ | ✅ | ✅ |
| **Scrollbar** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ | ✅ | ✅ |
| **Page** | ⚠️ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | — | ✅ | ✅ |
| **Snapshots** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| **AutoSize** | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully compatible |
| ⚠️ | Works but may need careful styling |
| ❌ | Cannot combine — builder throws or layout breaks |

**Key constraints:**

- **Table ↔ Grid ↔ Masonry ↔ Sortable** — Mutually exclusive layout modes; sortable is for flat lists only
- **Table + Groups** — ✅ Full-width group headers in data tables, sticky headers sit below column header
- **Grid + Groups** — ✅ Full-width group headers span the grid
- **Masonry ↔ Groups** — Masonry doesn't support grouped layouts
- **Masonry + reverse** — Not supported
- **Page ↔ Scrollbar** — Page uses the native browser scrollbar; builder throws if both are active
- **Page ↔ Scale** — Page scroll is vertical-only with native overflow; scale requires a controlled scroll container
- **Page + horizontal** — Page scroll is vertical only

---

## See Also

- **[Builder Pattern](/tutorials/builder-pattern)** — How `.use()` / `.build()` works and feature compatibility
- **[Quick Start](/tutorials/quick-start)** — Copy-paste examples combining multiple features
- **[API Reference](../api/reference.md)** — All methods and events