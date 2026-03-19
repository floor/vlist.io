# Snapshots Feature

> Save and restore scroll position for SPA navigation and tab switching.

## Overview

The `withSnapshots()` feature enables **scroll position save/restore** for seamless navigation in Single Page Applications. Capture the exact scroll position and restore it later, preserving the user's place in the list — including selection state.

**Import:**
```typescript
import { vlist, withSnapshots } from '@floor/vlist';
```

**Bundle cost:** Included in base (0 KB additional)

## Quick Start

```typescript
import { vlist, withSnapshots } from '@floor/vlist';

const list = vlist({
  container: '#list',
  items: users,
  item: {
    height: 64,
    template: (user) => `<div>${user.name}</div>`,
  },
})
  .use(withSnapshots())
  .build();

// Save scroll position before navigation
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('list-scroll', JSON.stringify(snapshot));

// Later — restore by passing the snapshot at creation time
const saved = sessionStorage.getItem('list-scroll');

const list2 = vlist({ /* same config */ })
  .use(withSnapshots(saved ? { restore: JSON.parse(saved) } : undefined))
  .build();
// Scroll is restored automatically after build() — user never sees position 0
```

## API

### withSnapshots(config?)

Creates the snapshots feature. Accepts an optional configuration object.

```typescript
withSnapshots(config?: SnapshotConfig): VListFeature
```

**Config:**
```typescript
interface SnapshotConfig {
  /**
   * Snapshot to restore automatically after build() completes.
   *
   * When provided, restoreScroll() is scheduled via queueMicrotask —
   * it runs right after .build() returns but before the browser paints,
   * so the user never sees position 0.
   */
  restore?: ScrollSnapshot;
}
```

**Example — auto-restore from sessionStorage:**
```typescript
const saved = sessionStorage.getItem('scroll');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({ ... })
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();
// If snapshot existed, scroll + selection are restored automatically
```

### getScrollSnapshot()

Captures the current scroll position, total item count, and selection state.

```typescript
list.getScrollSnapshot(): ScrollSnapshot
```

**Returns:**
```typescript
interface ScrollSnapshot {
  index: number;                      // First visible item index
  offsetInItem: number;               // Pixels scrolled into that item
  total?: number;                     // Total item count at snapshot time
  selectedIds?: Array<string | number>; // Selected IDs (if selection is active)
}
```

**Example:**
```typescript
const snapshot = list.getScrollSnapshot();
// { index: 523, offsetInItem: 12, total: 5000, selectedIds: [3, 7, 42] }
```

The `total` field is included automatically so that the snapshot is self-contained — useful when restoring with `withAsync()` where you need to set the initial total.

### `restoreScroll(snapshot)`

Restores scroll position from a snapshot. Can also be called manually after build.

```typescript
list.restoreScroll(snapshot: ScrollSnapshot): void
```

**Parameters:**
- `snapshot` - Snapshot object from `getScrollSnapshot()`

**Example:**
```typescript
list.restoreScroll({ index: 523, offsetInItem: 12, total: 5000 });
```

> **Prefer `withSnapshots({ restore })`** over manual `restoreScroll()` when recreating a list — it handles timing automatically via `queueMicrotask`.

## Use Cases

### SPA Navigation — Destroy & Recreate (Recommended)

The cleanest pattern: pass the snapshot to `withSnapshots({ restore })` when recreating the list.

```typescript
import { vlist, withSnapshots } from '@floor/vlist';

const STORAGE_KEY = 'list-scroll';
let list;

function createList() {
  const saved = sessionStorage.getItem(STORAGE_KEY);
  const snapshot = saved ? JSON.parse(saved) : undefined;

  list = vlist({
    container: '#list',
    items: users,
    item: { height: 64, template: renderUser },
  })
    .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
    .build();
}

function navigateAway() {
  // Save snapshot
  const snapshot = list.getScrollSnapshot();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

  // Destroy list
  list.destroy();
  list = null;

  // Show detail page...
}

function goBack() {
  // Recreate list — snapshot is restored automatically
  createList();
}
```

### SPA Navigation (Back/Forward via History API)

```typescript
import { vlist, withSnapshots } from '@floor/vlist';

const list = vlist({
  container: '#list',
  items: users,
  item: { height: 64, template: renderUser },
})
  .use(withSnapshots())
  .build();

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
    list.restoreScroll(e.state.scrollSnapshot);
  }
});
```

### Session Storage (Debounced Auto-Save)

```typescript
import { vlist, withSnapshots } from '@floor/vlist';

const saved = sessionStorage.getItem('product-list-scroll');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({
  container: '#list',
  items: products,
  item: { height: 200, template: renderProduct },
})
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();

// Auto-save on scroll (debounced)
let saveTimeout;
list.on('scroll', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const snap = list.getScrollSnapshot();
    sessionStorage.setItem('product-list-scroll', JSON.stringify(snap));
  }, 500);
});
```

### Tab Switching

For **synchronous lists** (no `withAsync`), you can use `restoreScroll()` directly:

```typescript
const lists = { recent: null, popular: null, saved: null };
const snapshots = { recent: null, popular: null, saved: null };

function switchTab(tabName) {
  const currentTab = getCurrentTab();
  if (lists[currentTab]) {
    snapshots[currentTab] = lists[currentTab].getScrollSnapshot();
  }

  setCurrentTab(tabName);

  if (lists[tabName] && snapshots[tabName]) {
    lists[tabName].restoreScroll(snapshots[tabName]);
  }
}
```

For tabs with **async data** (using `withAsync()`), prefer `reload({ snapshot })` — it resets the data source, seeds the total from the snapshot, skips the initial page load, and restores scroll position in one call:

```typescript
const lists = { recent: null, popular: null, saved: null };
const snapshots = { recent: null, popular: null, saved: null };

async function switchTab(tabName) {
  // Save current tab's snapshot
  const currentTab = getCurrentTab();
  if (lists[currentTab]) {
    snapshots[currentTab] = lists[currentTab].getScrollSnapshot();
  }

  // Switch to new tab
  setCurrentTab(tabName);

  // Reload with snapshot — handles everything
  await lists[tabName].reload(
    snapshots[tabName] ? { snapshot: snapshots[tabName] } : undefined
  );
  // vlist: resets data → seeds total → skips page 1 → restores scroll → loads target page
}
```

### Local Storage (Persist Across Sessions)

```typescript
import { vlist, withSnapshots } from '@floor/vlist';

const saved = localStorage.getItem('reading-position');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({
  container: '#list',
  items: articles,
  item: { height: 300, template: renderArticle },
})
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();

// Save before unload
window.addEventListener('beforeunload', () => {
  const snap = list.getScrollSnapshot();
  localStorage.setItem('reading-position', JSON.stringify(snap));
});
```

## How It Works

### Snapshot Structure

Instead of saving raw `scrollTop` pixels, snapshots save:

1. **Item index** — Which item is at the top of the viewport
2. **Offset within item** — How many pixels into that item
3. **Total** — Total item count at snapshot time
4. **Selected IDs** — Selection state (if `withSelection()` is active)

**Why this approach?**

✅ **Survives list recreation** — Index-based, not pixel-based
✅ **Works with compression** — Independent of virtual height
✅ **Handles data changes** — Restores to same item even if list changed
✅ **Works with variable heights** — Doesn't depend on total height
✅ **Self-contained** — Total and selection included in one JSON blob

### Example

```typescript
// User scrolled to item 500, 12 pixels into it
const snapshot = list.getScrollSnapshot();
// { index: 500, offsetInItem: 12, total: 5000 }

// Later, recreate the list with the snapshot
const newList = vlist({ ... })
  .use(withSnapshots({ restore: snapshot }))
  .build();
// Scrolls to item 500, 12 pixels in — automatically
```

### Auto-Restore Timing

When you pass `restore` to `withSnapshots()`:

1. `build()` runs all feature setup synchronously
2. `queueMicrotask` schedules `restoreScroll()`
3. Restoration runs before the browser paints
4. User never sees position 0

This is more reliable than calling `restoreScroll()` manually after `build()`, because the microtask timing is guaranteed to fire before the next paint.

## Advanced Usage

### With Selection State

When `withSelection()` is installed, snapshots **automatically include selection**:

```typescript
import { vlist, withSelection, withSnapshots } from '@floor/vlist';

const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .use(withSnapshots())
  .build();

// Select some items
list.select(3, 7, 42);

// Save — selectedIds are included automatically
const snapshot = list.getScrollSnapshot();
// { index: 0, offsetInItem: 0, total: 5000, selectedIds: [3, 7, 42] }
sessionStorage.setItem('list-state', JSON.stringify(snapshot));

// Restore — selection is restored automatically too
const saved = JSON.parse(sessionStorage.getItem('list-state'));
const list2 = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .use(withSnapshots({ restore: saved }))
  .build();
// Scroll position AND selection are both restored
```

No need to save or restore selection separately — it's all in the snapshot.

### With Async Data

When using `withAsync()`, pass the snapshot's `total` to avoid a loading flash:

**List creation** — pass the snapshot to both features:

```typescript
import { vlist, withAsync, withSnapshots } from '@floor/vlist';

const saved = sessionStorage.getItem('scroll');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({ ... })
  .use(withAsync({
    adapter,
    autoLoad: !snapshot,           // Skip autoLoad when restoring
    total: snapshot?.total,        // Use snapshot total — no hardcoded constant
  }))
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();
```

**Runtime reload** — pass the snapshot to `reload()` directly:

For SPAs where the list already exists (e.g., switching categories or data sources), pass the snapshot to `reload()` instead of recreating the list:

```typescript
// Save snapshot before switching away
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('current-tab', JSON.stringify(snapshot));

// Switch data source and restore position in one call
const saved = sessionStorage.getItem('other-tab');
const otherSnapshot = saved ? JSON.parse(saved) : undefined;
await list.reload(otherSnapshot ? { snapshot: otherSnapshot } : undefined);
// vlist: resets data → skips page 1 → restores scroll → loads target page
```

When a snapshot with meaningful data (`total > 0` AND `index > 0`) is passed to `reload()`, it automatically:

1. Seeds the total from the snapshot (so the virtual height is correct)
2. Skips `loadInitial()` (no wasted page 1 fetch)
3. Restores scroll position to the snapshot's index
4. Loads the page containing that index

No manual coordination between `withAsync` and `withSnapshots` is needed.

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

✅ `withGrid()` — Saves first visible row
✅ `withGroups()` — Saves data index (not layout index)
✅ `withAsync()` — Works with lazy-loaded data (pass `total` from snapshot)
✅ `withScale()` — Compression-aware
✅ `withPage()` — Works with page-level scrolling
✅ `withSelection()` — Selection automatically included in snapshots

### Platform Support

✅ All browsers with `sessionStorage` / `localStorage`
✅ Works with browser back/forward navigation
✅ Works with SPA routers (React Router, Vue Router, etc.)

## Best Practices

### Use `withSnapshots({ restore })` for List Recreation

```typescript
// ✅ Best — auto-restores via queueMicrotask, user never sees position 0
const list = vlist({ ... })
  .use(withSnapshots({ restore: snapshot }))
  .build();
```

### Use sessionStorage for Navigation

```typescript
// ✅ Good — Clears on tab close
sessionStorage.setItem('scroll', JSON.stringify(snapshot));
```

### Use localStorage for Long-Term Persistence

```typescript
// ✅ Good — Persists across sessions
localStorage.setItem('reading-position', JSON.stringify(snapshot));
```

### Clear Old Snapshots

```typescript
// Clear snapshots for deleted items
function cleanupSnapshots() {
  const raw = sessionStorage.getItem('scroll');
  if (raw) {
    const snapshot = JSON.parse(raw);
    if (snapshot.total && snapshot.index >= snapshot.total) {
      sessionStorage.removeItem('scroll');  // Index no longer valid
    }
  }
}
```

### Validate Before Restore

```typescript
const saved = sessionStorage.getItem('scroll');
if (saved) {
  try {
    const snapshot = JSON.parse(saved);
    // NaN/Infinity are guarded internally, but you can also check here
    if (Number.isFinite(snapshot.index)) {
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

### restoreScroll does nothing (total is 0)

**Problem:** With `withAsync()`, the total hasn't been set yet when restoring.

**Solution A — Use `reload({ snapshot })` (recommended for runtime reloads):**

`reload({ snapshot })` handles this automatically — it seeds the total from the snapshot before restoring, so you don't need to coordinate anything:
```typescript
await list.reload({ snapshot: savedSnapshot });
// Total is set from snapshot.total → restoreScroll works immediately
```

**Solution B — Pass total at creation time (for initial list setup):**
```typescript
.use(withAsync({
  adapter,
  autoLoad: !snapshot,
  total: snapshot?.total,
}))
.use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
```

### Corrupt snapshot data (NaN values)

**Problem:** Snapshot was corrupted in storage (e.g. partial JSON, undefined fields).

**Solution:** `restoreScroll()` internally guards against `NaN` and `Infinity` — it silently no-ops. You don't need to validate manually, but you can if you want defensive code.

## See Also

- [Types — `ScrollSnapshot`](../api/types.md#scrollsnapshot) — `index`, `offsetInItem`, `total`, `selectedIds`
- [Types — `ReloadOptions`](../api/types.md#reloadoptions) — `snapshot` option for `reload()`
- [Types — `ScrollToOptions`](../api/types.md#scrolltooptions) — `align`, `behavior`, `duration`
- [Selection](./selection.md) — Selection state included in snapshots automatically
- [Async](./async.md) — Pass `snapshot.total` to `withAsync` to avoid loading flash on restore, or use `reload({ snapshot })` at runtime

## Examples

- [Scroll Restore](/examples/scroll-restore) — Save and restore scroll position across navigations
- [Velocity Loading](/examples/velocity-loading) — Snapshots combined with async loading, scale, and selection