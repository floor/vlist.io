# Features

> All features are tree-shaken — you only pay for what you import and use.

## Quick Reference

| Feature | Cost | Description |
|---|---|---|
| `withGrid()` | +4.0 KB | 2D grid layout (virtualises by row) |
| `withGroups()` | +4.6 KB | Grouped lists with sticky or inline headers |
| `withAsync()` | +5.3 KB | Lazy loading via adapter with placeholders |
| `withSelection()` | +2.3 KB | Single / multiple item selection with keyboard nav |
| `withScale()` | +2.2 KB | Compress scroll space for 1M+ items |
| `withScrollbar()` | +1.0 KB | Custom scrollbar UI with auto-hide |
| `withPage()` | +0.9 KB | Document-level (window) scrolling |
| `withSnapshots()` | 0 KB | Scroll position save/restore (included in base) |

---

## withGrid() — 2D Grid Layout

```typescript
import { vlist, withGrid } from '@floor/vlist';

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

## withGroups() — Grouped Lists

```typescript
import { vlist, withGroups } from '@floor/vlist';

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

→ [Full docs](./sections.md)

---

## withAsync() — Lazy Loading

```typescript
import { vlist, withAsync } from '@floor/vlist';

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
import { vlist, withSelection } from '@floor/vlist';

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

## withScale() — 1M+ Items

```typescript
import { vlist, withScale, withScrollbar } from '@floor/vlist';

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

## withScrollbar() — Custom Scrollbar

```typescript
import { vlist, withScrollbar } from '@floor/vlist';

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
import { vlist, withPage, withAsync } from '@floor/vlist';

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

## withSnapshots() — Scroll Save/Restore

Included in the base — no import needed.

```typescript
import { vlist } from '@floor/vlist';

const list = vlist({ container: '#list', items, item: { height: 48, template: render } }).build();

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

| | Grid | Masonry | Sections | Async | Selection | Scale | Scrollbar | Page | Snapshots |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Grid** | — | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| **Masonry** | ❌ | — | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Sections** | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Async** | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Selection** | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **Scale** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ❌ | ✅ |
| **Scrollbar** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ | ✅ |
| **Page** | ⚠️ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | — | ✅ |
| **Snapshots** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

| Symbol | Meaning |
|--------|---------|
| ✅ | Fully compatible |
| ⚠️ | Works but may need careful styling |
| ❌ | Cannot combine — builder throws or layout breaks |

**Key constraints:**

- **Grid ↔ Masonry** — Mutually exclusive layout modes
- **Masonry ↔ Sections** — Masonry doesn't support grouped layouts
- **Masonry + reverse** — Not supported
- **Page ↔ Scrollbar** — Page uses the native browser scrollbar; builder throws if both are active
- **Page ↔ Scale** — Page scroll is vertical-only with native overflow; scale requires a controlled scroll container
- **Page + horizontal** — Page scroll is vertical only

---

## See Also

- **[Builder Pattern](/tutorials/builder-pattern)** — How `.use()` / `.build()` works and feature compatibility
- **[Quick Start](/tutorials/quick-start)** — Copy-paste examples combining multiple features
- **[API Reference](../api/reference.md)** — All methods and events
