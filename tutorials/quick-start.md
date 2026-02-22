# Quick Start

> Get started with vlist in under 5 minutes.

## Installation

```bash
npm install @floor/vlist
```

## Examples

### 1. Simple List

```typescript
import { vlist } from '@floor/vlist';
import '@floor/vlist/styles';

const list = vlist({
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
}).build();
```

**Bundle:** 7.7 KB gzipped

---

### 2. With Selection

```typescript
import { vlist, withSelection } from '@floor/vlist';

const list = vlist({
  container: '#app',
  items: users,
  item: {
    height: 48,
    template: (user, index, { selected }) => {
      const cls = selected ? 'selected' : '';
      return `<div class="${cls}">${user.name}</div>`;
    },
  },
})
  .use(withSelection({ mode: 'single' }))
  .build();

// Selection API
list.select(5);
list.getSelected();       // [5]
list.getSelectedItems();  // [{ id: 5, ... }]
```

**Bundle:** 10.0 KB gzipped

---

### 3. Photo Gallery (Grid)

```typescript
import { vlist, withGrid, withScrollbar } from '@floor/vlist';

const gallery = vlist({
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
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 11.7 KB gzipped

---

### 4. Contact List (A-Z Sections)

```typescript
import { vlist, withSections } from '@floor/vlist';

const contacts = vlist({
  container: '#contacts',
  items: sortedContacts,  // Pre-sorted by lastName!
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

---

### 5. Chat UI (Reverse Mode)

```typescript
import { vlist, withSections } from '@floor/vlist';

const chat = vlist({
  container: '#messages',
  reverse: true,   // Start at bottom
  items: messages, // Oldest first
  item: {
    height: (i) => messages[i].height || 60,
    template: (msg) => `<div class="msg">${msg.text}</div>`,
  },
})
  .use(withSections({
    getGroupForIndex: (i) => formatDate(messages[i].timestamp),
    headerHeight: 32,
    headerTemplate: (date) => `<div class="date">${date}</div>`,
    sticky: false,  // Inline headers (iMessage style)
  }))
  .build();

// New messages auto-scroll to bottom
chat.appendItems([newMessage]);

// Load history preserves scroll
chat.prependItems(olderMessages);
```

**Bundle:** 11.9 KB gzipped

---

### 6. Infinite Scroll Feed

```typescript
import { vlist, withPage, withAsync } from '@floor/vlist';

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
  .use(withPage())   // Document-level scrolling
  .use(withAsync({
    adapter: {
      read: async ({ offset, limit }) => {
        const res = await fetch(`/api/posts?offset=${offset}&limit=${limit}`);
        return res.json();
      },
    },
    loading: { cancelThreshold: 15 },
  }))
  .build();
```

**Bundle:** 13.5 KB gzipped

---

### 7. Large Dataset (1M+ Items)

```typescript
import { vlist, withScale, withScrollbar } from '@floor/vlist';

const bigList = vlist({
  container: '#list',
  items: generateItems(5_000_000),
  item: {
    height: 48,
    template: (item) => `<div>#${item.id}: ${item.name}</div>`,
  },
})
  .use(withScale())   // Auto-activates scaling for large datasets
  .use(withScrollbar({ autoHide: true }))
  .build();
```

**Bundle:** 9.9 KB gzipped

---

## Common Patterns

### Variable Heights

```typescript
const list = vlist({
  container: '#list',
  items: messages,
  item: {
    height: (index) => messages[index].measuredHeight || 60,
    template: (msg) => `<div>${msg.text}</div>`,
  },
}).build();
```

### Horizontal Scrolling

```typescript
const carousel = vlist({
  container: '#carousel',
  direction: 'horizontal',
  items: cards,
  item: {
    width: 300,
    height: 400,
    template: (card) => `<div>${card.content}</div>`,
  },
}).build();
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

## Available Features

| Feature | Cost | Description |
|--------|------|-------------|
| `withGrid()` | +4.0 KB | 2D grid layout |
| `withSections()` | +4.6 KB | Grouped lists with headers |
| `withAsync()` | +5.3 KB | Async data loading |
| `withSelection()` | +2.3 KB | Item selection |
| `withScale()` | +2.2 KB | Handle 1M+ items |
| `withScrollbar()` | +1.0 KB | Custom scrollbar |
| `withPage()` | +0.9 KB | Page-level scrolling |

## Next Steps

- **[Getting Started](/docs/getting-started)** — Installation, configuration, TypeScript
- **[Builder Pattern](./builder-pattern)** — Features, composition, bundle costs
- **[Feature Docs](/docs/features/overview)** — All features with examples
- **[API Reference](/docs/api/reference)** — Complete method and event reference
- **[Examples](/examples/)** — 34 interactive examples
