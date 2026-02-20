# Getting Started

> Install vlist, configure your first list, and understand the core API.

## Installation

```bash
npm install @floor/vlist
# or: bun add @floor/vlist  |  pnpm add @floor/vlist  |  yarn add @floor/vlist
```

## Basic Usage

A container element with a defined height is required — virtual scrolling needs a fixed viewport to calculate which items are visible.

```html
<div id="list" style="height: 500px;"></div>
```

```typescript
import { vlist } from '@floor/vlist';
import '@floor/vlist/styles';

const list = vlist({
  container: '#list',
  items: [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ],
  item: {
    height: 48,
    template: (item) => `<div class="row">${item.name}</div>`,
  },
}).build();
```

That's a working virtual list. Thousands of items, only ~20 DOM nodes.

---

## Item Configuration

### Fixed height

```typescript
item: {
  height: 48,
  template: (item) => `<div>${item.name}</div>`,
}
```

Fixed height is the fast path — O(1) scroll math, no caching needed.

### Variable height

```typescript
item: {
  height: (index) => items[index].expanded ? 120 : 48,
  template: (item) => `<div>${item.name}</div>`,
}
```

The function receives the **index** (not the item) so you can look up any data. Heights are cached via a prefix-sum array for O(1) offset lookups and O(log n) binary search for reverse lookups.

### Template function

```typescript
type ItemTemplate<T> = (
  item: T,
  index: number,
  state: { selected: boolean; focused: boolean }
) => string | HTMLElement;
```

The third argument `state` carries selection and focus state. Return either an HTML string or a DOM element.

```typescript
item: {
  height: 56,
  template: (user, index, { selected }) => `
    <div class="user-row ${selected ? 'user-row--selected' : ''}">
      <img src="${user.avatar}" />
      <span>${user.name}</span>
    </div>
  `,
}
```

> **Items must have an `id` field** (`string | number`). It's used internally for identity during updates and selection.

---

## Core Config Options

```typescript
interface VListConfig<T> {
  container: HTMLElement | string;  // Required: selector or element
  item: {
    height: number | ((index: number) => number);  // Required for vertical
    width?: number | ((index: number) => number);  // Required for horizontal
    template: (item: T, index: number, state: ItemState) => string | HTMLElement;
  };
  items?: T[];                          // Static items (omit when using withAsync)
  overscan?: number;                    // Extra items rendered outside viewport (default: 3)
  direction?: 'vertical' | 'horizontal'; // Default: 'vertical'
  reverse?: boolean;                    // Start at bottom (chat UI). Default: false
  classPrefix?: string;                 // CSS class prefix (default: 'vlist')
  ariaLabel?: string;                   // Accessible label for the list element
}
```

---

## Scroll Configuration

The `scroll` key controls the scroll system behaviour. All fields are optional.

```typescript
scroll?: {
  element?: HTMLElement | Window;  // Override the scroll container
  wheel?: boolean;                 // Enable mouse wheel (default: true)
  wrap?: boolean;                  // Circular navigation (default: false)
  scrollbar?: 'none' | 'native';   // 'none' = no scrollbar, 'native' = browser default
  idleTimeout?: number;            // ms of no-scroll before 'idle' event fires (default: 150)
}
```

### Window / page scrolling

Pass `window` as the scroll element to let the whole page scroll instead of the container. This is also what `withPage()` does — use the plugin when you want to avoid configuring it manually.

```typescript
const list = vlist({
  container: '#list',
  items: articles,
  item: { height: 300, template: renderArticle },
  scroll: { element: window },
}).build();
```

### Disabling the mouse wheel

Useful for wizard-style interfaces where navigation is button-driven:

```typescript
const wizard = vlist({
  container: '#steps',
  items: steps,
  item: { height: 600, template: renderStep },
  scroll: { wheel: false, scrollbar: 'none' },
}).build();

// Drive navigation programmatically
document.querySelector('#next').addEventListener('click', () => {
  wizard.scrollToIndex(currentStep + 1, { align: 'start', behavior: 'smooth' });
});
```

### Circular navigation

`wrap: true` makes `scrollToIndex` wrap around — handy for carousels:

```typescript
const carousel = vlist({
  container: '#carousel',
  direction: 'horizontal',
  items: slides,
  item: { width: 800, height: 400, template: renderSlide },
  scroll: { wheel: false, wrap: true },
}).build();
```

---

## Horizontal Scrolling

Set `direction: 'horizontal'` and provide `width` instead of (or alongside) `height`:

```typescript
const timeline = vlist({
  container: '#timeline',
  direction: 'horizontal',
  items: events,
  item: {
    width: (i) => events[i].duration * 40,  // variable width
    height: 200,
    template: (event) => `<div class="event">${event.title}</div>`,
  },
}).build();
```

**Restrictions:** `withGrid()`, `withSections()`, and `reverse: true` require vertical direction.

---

## Reverse Mode

`reverse: true` anchors the scroll position to the **bottom** of the list — the standard behaviour for chat and messaging UIs.

```typescript
import { vlist } from '@floor/vlist';

const chat = vlist({
  container: '#messages',
  reverse: true,
  items: messages,  // oldest first
  item: {
    height: (i) => messages[i].height || 60,
    template: (msg) => `
      <div class="message message--${msg.sender}">
        <p>${msg.text}</p>
      </div>
    `,
  },
}).build();

// New message: auto-scrolls to bottom if user was already there
chat.appendItems([newMessage]);

// Load history: preserves the user's scroll position
chat.prependItems(olderMessages);
```

See [Reverse Mode Guide](./reverse-mode.md) for the full scrolling contract and edge cases.

---

## Data Methods

```typescript
list.setItems(items)              // Replace entire dataset
list.appendItems(items)           // Add to end
list.prependItems(items)          // Add to start (preserves scroll)
list.updateItem(id, partialItem)  // Merge update by ID → void
list.removeItem(id)               // Remove by ID → void
```

---

## Scroll Methods

```typescript
// Jump (instant)
list.scrollToIndex(100)
list.scrollToIndex(100, 'center')         // 'start' | 'center' | 'end'

// Animated
list.scrollToIndex(100, { align: 'center', behavior: 'smooth', duration: 300 })
list.scrollToItem('user-42', { align: 'start', behavior: 'smooth' })

// Read position
list.getScrollPosition()                  // pixels from top (or left)

// Snapshots — save/restore scroll position across navigation
const snapshot = list.getScrollSnapshot() // { index, offsetInItem }
list.restoreScroll(snapshot)
```

---

## Events

```typescript
const off = list.on('scroll', ({ scrollTop, direction }) => { ... })
list.on('item:click', ({ item, index, event }) => { ... })
list.on('range:change', ({ range }) => { ... })  // range = { start, end }

off()  // unsubscribe
list.off('scroll', handler)  // or unsubscribe by reference
```

See [API Reference](../api/reference.md) for all events.

---

## TypeScript

Pass your item type as a generic — all methods and events are fully typed:

```typescript
import { vlist, type VList } from '@floor/vlist';

interface Message {
  id: string;
  text: string;
  sender: 'me' | 'them';
  height: number;
}

const chat: VList<Message> = vlist<Message>({
  container: '#chat',
  reverse: true,
  items: [] as Message[],
  item: {
    height: (i) => messages[i].height,
    template: (msg: Message) => `<div>${msg.text}</div>`,
  },
}).build();

// Fully typed:
chat.on('item:click', ({ item }) => {
  console.log(item.sender);  // TypeScript knows this is 'me' | 'them'
});
```

---

## Lifecycle

```typescript
list.destroy()  // Removes DOM, unbinds all listeners, cleans up plugins
```

Always call `destroy()` when unmounting (SPA route changes, component teardown).

---

## Next Steps

| I want to… | Go to |
|---|---|
| Add a grid layout | [Grid Plugin](../plugins/grid.md) |
| Group items with headers | [Sections Plugin](../plugins/sections.md) |
| Load data from an API | [Async Plugin](../plugins/async.md) |
| Add item selection | [Selection Plugin](../plugins/selection.md) |
| Handle 1M+ items | [Scale Plugin](../plugins/scale.md) |
| Use a custom scrollbar | [Scrollbar Plugin](../plugins/scrollbar.md) |
| Scroll the whole page | [Page Plugin](../plugins/page.md) |
| Build a chat UI | [Reverse Mode Guide](./reverse-mode.md) |
| Tune for performance | [Optimization Guide](./optimization.md) |
| Customise styles | [Styling Guide](./styling.md) |
| Complete API | [API Reference](../api/reference.md) |