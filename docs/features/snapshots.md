# Snapshots Feature

> Save and restore scroll position for SPA navigation and tab switching.

## Overview

The `withSnapshots()` feature enables **scroll position save/restore** for seamless navigation in Single Page Applications. Capture the exact scroll position and restore it later, preserving the user's place in the list.

**Import:**
```typescript
// Included in base builder - no need to import feature
import { vlist } from 'vlist';
```

**Bundle cost:** Included in base (no additional cost)

## Quick Start

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

// Save scroll position before navigation
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('list-scroll', JSON.stringify(snapshot));

// Restore after navigation
const saved = JSON.parse(sessionStorage.getItem('list-scroll'));
if (saved) {
  list.restoreScroll(saved);
}
```

## API

### `getScrollSnapshot()`

Captures the current scroll position.

```typescript
list.getScrollSnapshot(): ScrollSnapshot
```

**Returns:**
```typescript
interface ScrollSnapshot {
  index: number;          // First visible item index
  offsetInItem: number;   // Pixels scrolled into that item
}
```

**Example:**
```typescript
const snapshot = list.getScrollSnapshot();
// { index: 523, offsetInItem: 12 }
```

### `restoreScroll(snapshot)`

Restores scroll position from a snapshot.

```typescript
list.restoreScroll(snapshot: ScrollSnapshot): void
```

**Parameters:**
- `snapshot` - Snapshot object from `getScrollSnapshot()`

**Example:**
```typescript
list.restoreScroll({ index: 523, offsetInItem: 12 });
```

## Use Cases

### SPA Navigation (Back/Forward)

```typescript
import { vlist } from 'vlist';

const list = vlist({
  container: '#list',
  items: users,
  item: { height: 64, template: renderUser },
}).build();

// Before navigating to detail page
document.querySelectorAll('.user-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Save scroll position
    const snapshot = list.getScrollSnapshot();
    history.pushState({ scrollSnapshot: snapshot }, '', link.href);
    
    // Navigate (load detail page)
    loadDetailPage(link.href);
  });
});

// When user navigates back
window.addEventListener('popstate', (e) => {
  if (e.state?.scrollSnapshot) {
    // Restore scroll position
    list.restoreScroll(e.state.scrollSnapshot);
  }
});
```

### Session Storage (Page Reload)

```typescript
const list = vlist({
  container: '#list',
  items: products,
  item: { height: 200, template: renderProduct },
}).build();

// Save on scroll (debounced)
let saveTimeout;
list.on('scroll', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const snapshot = list.getScrollSnapshot();
    sessionStorage.setItem('product-list-scroll', JSON.stringify(snapshot));
  }, 500);
});

// Restore on page load
window.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('product-list-scroll');
  if (saved) {
    const snapshot = JSON.parse(saved);
    list.restoreScroll(snapshot);
  }
});
```

### Tab Switching

```typescript
const lists = {
  recent: null,
  popular: null,
  saved: null,
};

const snapshots = {
  recent: null,
  popular: null,
  saved: null,
};

function switchTab(tabName) {
  // Save current tab's scroll
  const currentTab = getCurrentTab();
  if (lists[currentTab]) {
    snapshots[currentTab] = lists[currentTab].getScrollSnapshot();
  }
  
  // Switch to new tab
  setCurrentTab(tabName);
  
  // Restore new tab's scroll
  if (lists[tabName] && snapshots[tabName]) {
    lists[tabName].restoreScroll(snapshots[tabName]);
  }
}
```

### Local Storage (Persist Across Sessions)

```typescript
const list = vlist({
  container: '#list',
  items: articles,
  item: { height: 300, template: renderArticle },
}).build();

// Save before unload
window.addEventListener('beforeunload', () => {
  const snapshot = list.getScrollSnapshot();
  localStorage.setItem('reading-position', JSON.stringify(snapshot));
});

// Restore on load
const saved = localStorage.getItem('reading-position');
if (saved) {
  const snapshot = JSON.parse(saved);
  list.restoreScroll(snapshot);
}
```

## How It Works

### Snapshot Structure

Instead of saving raw `scrollTop` pixels, snapshots save:

1. **Item index** - Which item is at the top of the viewport
2. **Offset within item** - How many pixels into that item

**Why this approach?**

✅ **Survives list recreation** - Index-based, not pixel-based  
✅ **Works with compression** - Independent of virtual height  
✅ **Handles data changes** - Restores to same item even if list changed  
✅ **Works with variable heights** - Doesn't depend on total height  

### Example

```typescript
// User scrolled to item 500, 12 pixels into it
const snapshot = list.getScrollSnapshot();
// { index: 500, offsetInItem: 12 }

// Later, recreate the list
const newList = vlist({ ... }).build();

// Restore to exact position
newList.restoreScroll(snapshot);
// Scrolls to item 500, 12 pixels in
```

## Advanced Usage

### With Selection State

If using `withSelection()`, you can save both scroll and selection:

```typescript
import { vlist, withSelection } from 'vlist';

const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .build();

// Save scroll + selection
const state = {
  scroll: list.getScrollSnapshot(),
  selectedIds: list.getSelectedIds(),
};
sessionStorage.setItem('list-state', JSON.stringify(state));

// Restore both
const saved = JSON.parse(sessionStorage.getItem('list-state'));
if (saved) {
  list.restoreScroll(saved.scroll);
  saved.selectedIds.forEach(id => list.selectItem(id));
}
```

### With Filters/Sorting

```typescript
// Save snapshot per filter state
const snapshots = new Map();

function applyFilter(filterKey) {
  // Save current filter's scroll
  const currentFilter = getCurrentFilter();
  snapshots.set(currentFilter, list.getScrollSnapshot());
  
  // Apply new filter
  const filtered = applyFilterLogic(allItems, filterKey);
  list.setItems(filtered);
  
  // Restore new filter's scroll if exists
  const snapshot = snapshots.get(filterKey);
  if (snapshot) {
    list.restoreScroll(snapshot);
  }
}
```

### Debounced Save

For better performance, debounce snapshot saves:

```typescript
let saveTimeout;

list.on('scroll', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const snapshot = list.getScrollSnapshot();
    sessionStorage.setItem('scroll', JSON.stringify(snapshot));
  }, 300);  // Save 300ms after scroll stops
});
```

## Compatibility

### Works With All Features

✅ `withGrid()` - Saves first visible row  
✅ `withSections()` - Saves data index (not layout index)  
✅ `withAsync()` - Works with lazy-loaded data  
✅ `withScale()` - Compression-aware  
✅ `withPage()` - Works with page-level scrolling  
✅ `withSelection()` - Can save selection separately  

### Platform Support

✅ All browsers with `sessionStorage` / `localStorage`  
✅ Works with browser back/forward navigation  
✅ Works with SPA routers (React Router, Vue Router, etc.)  

## Best Practices

### Use sessionStorage for Navigation

```typescript
// ✅ Good - Clears on tab close
sessionStorage.setItem('scroll', JSON.stringify(snapshot));
```

### Use localStorage for Long-Term Persistence

```typescript
// ✅ Good - Persists across sessions
localStorage.setItem('reading-position', JSON.stringify(snapshot));
```

### Clear Old Snapshots

```typescript
// Clear snapshots for deleted items
function cleanupSnapshots() {
  const snapshot = JSON.parse(sessionStorage.getItem('scroll'));
  if (snapshot && snapshot.index >= list.total) {
    sessionStorage.removeItem('scroll');  // Index no longer valid
  }
}
```

### Validate Before Restore

```typescript
const saved = sessionStorage.getItem('scroll');
if (saved) {
  try {
    const snapshot = JSON.parse(saved);
    if (snapshot.index < list.total) {
      list.restoreScroll(snapshot);
    }
  } catch (e) {
    console.warn('Invalid snapshot:', e);
  }
}
```

## Troubleshooting

### Scroll doesn't restore correctly

**Problem:** List items changed between save and restore

**Solution:** Snapshots are index-based. If the item at that index is different, scroll position will be "correct" but content will differ.

### Scroll jumps on restore

**Problem:** Variable height items and heights changed

**Solution:** Ensure heights are consistent between save and restore, or remeasure items before restoring.

### Snapshot seems outdated

**Problem:** Snapshot saved for different dataset

**Solution:** Include dataset version in snapshot:
```typescript
const snapshot = {
  ...list.getScrollSnapshot(),
  version: dataVersion,
  timestamp: Date.now(),
};
```

## See Also

- **[Features Overview](./README.md)** - All available features
- **[Builder Pattern](/tutorials/builder-pattern)** - How to compose features
- **[API Methods](/docs/api/reference)** - Complete method reference
- **[Examples](/examples/scroll-restore/)** - Interactive example

---

**Bundle cost:** Included in base (no additional cost)  
**Priority:** 90 (runs last - needs all features ready)  
**Methods added:** `getScrollSnapshot()`, `restoreScroll()`
