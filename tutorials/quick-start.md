# Quick Start

> Get started with vlist in under 5 minutes.

## Installation

```bash
npm install vlist
```

## Examples

### 1. Simple List

```typescript
import { createVList } from 'vlist';
import 'vlist/styles';

const list = createVList({
  container: '#app',
  items: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ],
  item: {
    height: 48,
    template: (item) => `<div>${item.name}</div>`,
  },
});
```

---

### 2. With Selection

```typescript
import { createVList, selection } from 'vlist';

const list = createVList({
  container: '#app',
  items: users,
  item: {
    height: 48,
    template: (user, index, { selected }) => {
      const cls = selected ? 'selected' : '';
      return `<div class="${cls}">${user.name}</div>`;
    },
  },
}, [
  selection({ mode: 'single' })
]);

// Selection API
list.select(5);
list.getSelected();       // [5]
list.getSelectedItems();  // [{ id: 5, ... }]
```

---

### 3. Photo Gallery (Grid)

```typescript
import { createVList, grid, scrollbar } from 'vlist';

const gallery = createVList({
  container: '#gallery',
  items: photos,
  item: {
    height: 200,
    template: (photo) => `
      <div class="card">
        <img src="${photo.url}" />
        <span>${photo.title}</span>
      </div>
    `,
  },
}, [
  grid({ columns: 4, gap: 16 }),
  scrollbar({ autoHide: true })
]);
```

---

### 4. Contact List (A-Z Sections)

```typescript
import { createVList, groups } from 'vlist';

const contacts = createVList({
  container: '#contacts',
  items: sortedContacts,  // Pre-sorted by lastName!
  item: {
    height: 56,
    template: (contact) => `<div>${contact.name}</div>`,
  },
}, [
  groups({
    getGroupForIndex: (i) => sortedContacts[i].lastName[0].toUpperCase(),
    header: {
      height: 36,
      template: (letter) => `<div class="header">${letter}</div>`,
    },
    sticky: true,
  })
]);
```

---

### 5. Chat UI (Reverse Mode)

```typescript
import { createVList, groups } from 'vlist';

const chat = createVList({
  container: '#messages',
  reverse: true,   // Start at bottom
  items: messages, // Oldest first
  item: {
    height: (i) => messages[i].height || 60,
    template: (msg) => `<div class="msg">${msg.text}</div>`,
  },
}, [
  groups({
    getGroupForIndex: (i) => formatDate(messages[i].timestamp),
    header: {
      height: 32,
      template: (date) => `<div class="date">${date}</div>`,
    },
    sticky: false,  // Inline headers (iMessage style)
  })
]);

// New messages auto-scroll to bottom
chat.appendItems([newMessage]);

// Load history preserves scroll
chat.prependItems(olderMessages);
```

---

### 6. Infinite Scroll Feed

```typescript
import { createVList, page, async } from 'vlist';

const feed = createVList({
  container: '#feed',
  item: {
    height: 300,
    template: (post) => {
      if (!post) return `<div class="skeleton">Loading...</div>`;
      return `<article>${post.content}</article>`;
    },
  },
}, [
  page(),
  async({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}`);
        return res.json();
      },
    },
    loading: { cancelThreshold: 15 },
  })
]);
```

---

### 7. Large Dataset (1M+ Items)

```typescript
import { createVList, scale, scrollbar } from 'vlist';

const bigList = createVList({
  container: '#list',
  items: generateItems(5_000_000),
  item: {
    height: 48,
    template: (item) => `<div>#${item.id}: ${item.name}</div>`,
  },
}, [
  scale(),
  scrollbar({ autoHide: true })
]);
```

---

## Common Patterns

### Variable Heights

```typescript
const list = createVList({
  container: '#list',
  items: messages,
  item: {
    height: (index) => messages[index].measuredHeight || 60,
    template: (msg) => `<div>${msg.text}</div>`,
  },
});
```

### Horizontal Scrolling

```typescript
const carousel = createVList({
  container: '#carousel',
  orientation: 'horizontal',
  items: cards,
  item: {
    width: 300,
    height: 400,
    template: (card) => `<div>${card.content}</div>`,
  },
});
```

### Scroll to Item

```typescript
list.scrollToIndex(50, 'center');
list.scrollToItem('user-123', { align: 'start', behavior: 'smooth', duration: 500 });
```

### Events

```typescript
list.on('scroll', ({ scrollTop, direction }) => {
  console.log('Scrolled to:', scrollTop);
});

list.on('item:click', ({ item, index }) => {
  console.log('Clicked:', item);
});
```

### Data Updates

```typescript
list.setItems(newItems);
list.appendItems([item1, item2]);
list.prependItems([item0]);
list.updateItem(5, { name: 'Updated' });
list.removeItem(5);
```

---

## Available Plugins

| Plugin | Description |
|--------|-------------|
| `grid()` | 2D grid layout with WAI-ARIA keyboard nav |
| `masonry()` | Pinterest-style layout with lane-aware nav |
| `groups()` | Grouped lists with sticky/inline headers |
| `async()` | Async data loading |
| `selection()` | Single/multiple selection + 2D keyboard nav |
| `scale()` | Handle 1M+ items |
| `scrollbar()` | Custom scrollbar |
| `page()` | Page-level scrolling |
| `snapshots()` | Scroll save/restore |
| `autosize()` | Automatic item height measurement |
| `sortable()` | Drag-and-drop reordering |
| `transition()` | Smooth animations |
| `table()` | Table layout with headers |
| `a11y()` | Accessibility (keyboard nav, ARIA) |

## Next Steps

- **[Getting Started](/docs/getting-started)** — Installation, configuration, TypeScript
- **[Plugins](/docs/plugins/overview)** — All plugins with examples
- **[API Reference](/docs/api)** — Complete method and event reference
- **[Examples](/examples/)** — Interactive examples