---
created: 2026-02-22
updated: 2026-05-02
status: published
---

# Snapshots Feature

> Save and restore scroll position for SPA navigation and tab switching.

## Overview

The `withSnapshots()` feature enables **scroll position save/restore** for seamless navigation in Single Page Applications. Capture the exact scroll position and restore it later, preserving the user's place in the list — including selection state and keyboard focus.

**Import:**
```typescript
import { vlist, withSnapshots } from 'vlist';
```

**Bundle cost:** +0.7 KB gzipped

## Quick Start

The simplest way to persist scroll position: pass an `autoSave` key and everything is handled automatically — save, restore, and async data coordination.

```typescript
import { vlist, withAsync, withSnapshots } from 'vlist';

const list = vlist({
  container: '#list',
  items: users,
  item: {
    height: 64,
    template: (user) => `<div>${user.name}</div>`,
  },
})
  .use(withSnapshots({ autoSave: 'my-list' }))
  .build();

// That's it — scroll position, selection, and keyboard focus are saved
// to sessionStorage on scroll idle, selection change, and focus change,
// and restored automatically on the next build().
```

With async data, no extra plumbing is needed — `withSnapshots` cancels the initial load and bootstraps the total from the saved snapshot:

```typescript
const list = vlist({ container: '#list', item: { height: 64, template: renderUser } })
  .use(withAsync({ adapter }))
  .use(withSnapshots({ autoSave: 'my-list' }))
  .build();
// First visit: autoLoad fetches data normally
// Return visit: autoLoad is cancelled, scroll + selection restored from snapshot
```

For manual control, use `restore` and `getScrollSnapshot()` instead — see [Manual Save/Restore](#manual-saverestore).

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
   * Automatically save and restore snapshots via sessionStorage.
   *
   * Pass a string key — snapshots are saved whenever scroll becomes
   * idle, selection changes, or keyboard focus moves, and restored
   * automatically on the next build(). When withAsync is present,
   * autoLoad is cancelled and the total is bootstrapped from the snapshot.
   */
  autoSave?: string;

  /**
   * Snapshot to restore automatically after build() completes.
   *
   * When provided, restoreScroll() is scheduled via queueMicrotask —
   * it runs right after .build() returns but before the browser paints,
   * so the user never sees position 0.
   *
   * Ignored when autoSave is set (autoSave reads from sessionStorage).
   */
  restore?: ScrollSnapshot;
}
```

**Example — automatic (recommended):**
```typescript
const list = vlist({ ... })
  .use(withSnapshots({ autoSave: 'my-list' }))
  .build();
// Saves on scroll idle, selection change, and focus change — restores on next build()
```

**Example — manual restore:**
```typescript
const saved = sessionStorage.getItem('scroll');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({ ... })
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();
```

### getScrollSnapshot()

Captures the current scroll position, total item count, and selection state.

```typescript
list.getScrollSnapshot(): ScrollSnapshot
```

**Returns:**
```typescript
interface ScrollSnapshot {
  index: number;                        // First visible item index (layout-level)
  offsetInItem: number;                 // Pixels scrolled into that item
  total?: number;                       // Virtual total at snapshot time
  dataIndex?: number;                   // Data-level index (stable across layouts)
  dataTotal?: number;                   // Actual item count (not virtual rows)
  offsetRatio?: number;                 // Offset as 0–1 fraction of item size
  selectedIds?: Array<string | number>; // Selected IDs (if withSelection is active)
  focusedId?: string | number;          // Focused item ID (if withSelection is active)
}
```

**Example:**
```typescript
const snapshot = list.getScrollSnapshot();
// { index: 523, offsetInItem: 12, total: 5000, selectedIds: [3, 7, 42], focusedId: 7 }
```

The `total` field is included automatically so that the snapshot is self-contained — useful when restoring with `withAsync()` where you need to set the initial total. The `focusedId` field is only present when an item has keyboard focus.

When `withGrid()` or `withGroups()` is active, the snapshot also includes `dataIndex`, `dataTotal`, and `offsetRatio` — these enable cross-mode restore (e.g., a snapshot taken in grid mode can be restored in list mode). See [Cross-Mode Restore](#cross-mode-restore-listgridtable).

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

With `autoSave`, the list handles everything — no manual save/restore code needed:

```typescript
import { vlist, withSnapshots } from 'vlist';

let list;

function createList() {
  list = vlist({
    container: '#list',
    items: users,
    item: { height: 64, template: renderUser },
  })
    .use(withSnapshots({ autoSave: 'user-list' }))
    .build();
  // On return visits, scroll position is restored automatically
}

function navigateAway() {
  // Snapshot is already saved (autoSave handles it on scroll idle)
  list.destroy();
  list = null;
}

function goBack() {
  createList(); // Restored from sessionStorage automatically
}
```

### With Async Data

No extra plumbing needed — `withSnapshots({ autoSave })` coordinates with `withAsync()` automatically:

```typescript
import { vlist, withAsync, withSnapshots } from 'vlist';

const list = vlist({
  container: '#list',
  item: { height: 64, template: renderUser },
})
  .use(withAsync({ adapter }))
  .use(withSnapshots({ autoSave: 'user-list' }))
  .build();
// First visit: autoLoad fetches from offset 0
// Return visit: autoLoad is cancelled, total bootstrapped from snapshot,
//               scroll restored, data loaded at the restored position
```

For **runtime reloads** (e.g., switching data sources), pass the snapshot to `reload()` directly:

```typescript
// Save snapshot before switching
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem('current-tab', JSON.stringify(snapshot));

// Switch data source and restore in one call
const saved = sessionStorage.getItem('other-tab');
const otherSnapshot = saved ? JSON.parse(saved) : undefined;
await list.reload(otherSnapshot ? { snapshot: otherSnapshot } : undefined);
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

For tabs with **async data** (using `withAsync()`), prefer `reload({ snapshot })`:

```typescript
const lists = { recent: null, popular: null, saved: null };
const snapshots = { recent: null, popular: null, saved: null };

async function switchTab(tabName) {
  const currentTab = getCurrentTab();
  if (lists[currentTab]) {
    snapshots[currentTab] = lists[currentTab].getScrollSnapshot();
  }

  setCurrentTab(tabName);

  await lists[tabName].reload(
    snapshots[tabName] ? { snapshot: snapshots[tabName] } : undefined
  );
}
```

### SPA Navigation (Back/Forward via History API)

```typescript
import { vlist, withSnapshots } from 'vlist';

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
    const snapshot = list.getScrollSnapshot();
    history.pushState({ scrollSnapshot: snapshot }, '', link.href);
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

### Local Storage (Persist Across Sessions)

For long-term persistence (e.g., reading position), use manual save to `localStorage`:

```typescript
import { vlist, withSnapshots } from 'vlist';

const saved = localStorage.getItem('reading-position');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({
  container: '#list',
  items: articles,
  item: { height: 300, template: renderArticle },
})
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();

window.addEventListener('beforeunload', () => {
  const snap = list.getScrollSnapshot();
  localStorage.setItem('reading-position', JSON.stringify(snap));
});
```

### Manual Save/Restore

When `autoSave` doesn't fit (e.g., custom storage, conditional saves), use the manual pattern:

```typescript
import { vlist, withSnapshots } from 'vlist';

const saved = sessionStorage.getItem('list-scroll');
const snapshot = saved ? JSON.parse(saved) : undefined;

const list = vlist({
  container: '#list',
  items: users,
  item: { height: 64, template: renderUser },
})
  .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
  .build();

// Save before navigating away
function navigateAway() {
  const snap = list.getScrollSnapshot();
  sessionStorage.setItem('list-scroll', JSON.stringify(snap));
  list.destroy();
}
```

### Cross-Mode Restore (List/Grid/Table)

When toggling between layout modes (list ↔ grid ↔ table), snapshots survive the transition automatically. Capture a snapshot before destroying the old list, then pass it to the new layout:

```typescript
import { vlist, withAsync, withGrid, withTable, withSnapshots } from 'vlist';

let list = null;
let currentMode = 'list';

function switchLayout(mode) {
  // 1. Capture snapshot from current layout
  let snapshot = null;
  if (list) {
    snapshot = list.getScrollSnapshot();
    list.destroy();
  }

  currentMode = mode;

  // 2. Build new layout with the snapshot
  const builder = vlist({
    container: '#list',
    item: { height: mode === 'grid' ? 200 : 56, template: renderItem },
  });

  builder.use(withAsync({ adapter }));

  if (mode === 'grid')  builder.use(withGrid({ columns: 4, gap: 8 }));
  if (mode === 'table') builder.use(withTable({ columns, rowHeight: 36 }));

  builder.use(withSnapshots(snapshot ? { restore: snapshot } : undefined));

  list = builder.build();
}
```

**How it works under the hood:**

When `withGrid()` or `withGroups()` is active, `getScrollSnapshot()` stores three extra fields:

- **`dataIndex`** — The data-level item index (e.g., grid row 3 with 4 columns → data index 12). This is stable across layout changes because it refers to the actual item, not a virtual row or group-offset index.
- **`dataTotal`** — The actual item count (e.g., 100 items, not the 25 grid rows that `total` would report). Used to bootstrap the data manager correctly when restoring in a different mode.
- **`offsetRatio`** — The scroll offset within the item as a 0–1 fraction (e.g., 60px into a 200px grid row = 0.3). When restoring in list mode (56px items), this becomes `0.3 × 56 = 16.8px` — much more accurate than using the raw 60px.

On restore, `restoreScroll()` resolves the correct layout index using whichever conversion methods are available:

| Saved in | Restored in | How it resolves |
|----------|-------------|-----------------|
| Grid/Groups | Grid/Groups | `dataIndex` → `_dataToLayoutIndex()` → layout index |
| Grid/Groups | List/Table | `dataIndex` used directly (1:1 mapping) |
| List/Table | Grid/Groups | `index` → `_dataToLayoutIndex()` → layout index |
| List/Table | List/Table | `index` used as-is |

This is fully automatic — no special handling needed in your code. Just pass the snapshot.

## How It Works

### Snapshot Structure

Instead of saving raw `scrollTop` pixels, snapshots save:

1. **Item index** — Which item is at the top of the viewport (layout-level)
2. **Offset within item** — How many pixels into that item
3. **Total** — Virtual total at snapshot time
4. **Data index** — Data-level index, stable across layout changes (when grid/groups active)
5. **Data total** — Actual item count, not virtual rows (when grid/groups active)
6. **Offset ratio** — Offset as a 0–1 fraction of item size (for cross-mode restore)
7. **Selected IDs** — Selection state (if `withSelection()` is active)
8. **Focused item ID** — Keyboard focus position (if `withSelection()` is active)

**Why this approach?**

✅ **Survives list recreation** — Index-based, not pixel-based
✅ **Survives layout mode changes** — Data-level fields adapt across list/grid/table
✅ **Works with compression** — Independent of virtual height
✅ **Handles data changes** — Restores to same item even if list changed
✅ **Works with variable heights** — Doesn't depend on total height
✅ **Self-contained** — Total, selection, and focus included in one JSON blob

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

### With Selection and Focus State

When `withSelection()` is installed, snapshots **automatically include selection and keyboard focus**:

```typescript
import { vlist, withSelection, withSnapshots } from 'vlist';

const list = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .use(withSnapshots())
  .build();

// Select some items, navigate with arrow keys
list.select(3, 7, 42);

// Save — selectedIds and focusedId are included automatically
const snapshot = list.getScrollSnapshot();
// { index: 0, offsetInItem: 0, total: 5000, selectedIds: [3, 7, 42], focusedId: 7 }
sessionStorage.setItem('list-state', JSON.stringify(snapshot));

// Restore — scroll, selection, and focus are all restored
const saved = JSON.parse(sessionStorage.getItem('list-state'));
const list2 = vlist({ ... })
  .use(withSelection({ mode: 'multiple' }))
  .use(withSnapshots({ restore: saved }))
  .build();
// When the user tabs into the list, the focus ring appears on item 7
```

No need to save or restore selection or focus separately — it's all in the snapshot.

> **Focus ring timing:** The focus ring is not shown immediately on restore. It appears only when the user tabs into the list, at which point it jumps directly to the previously focused item. This avoids showing an unexpected focus ring on page load.

### With Async Data

With `autoSave`, no manual coordination is needed:

```typescript
const list = vlist({ ... })
  .use(withAsync({ adapter }))
  .use(withSnapshots({ autoSave: 'my-list' }))
  .build();
// withSnapshots reads the saved snapshot, cancels autoLoad, bootstraps
// the total, restores scroll, and loads data at the restored position.
```

With `restore` (manual), pass the snapshot to both features:

```typescript
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

```typescript
await list.reload(snapshot ? { snapshot } : undefined);
// Seeds total → skips page 1 → restores scroll → loads target page
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

> **Note:** With `autoSave`, saves are already debounced — they fire on `scroll:idle` (150ms after scrolling stops), on `selection:change`, and on `focus:change` (arrow-key navigation). No manual debouncing needed.

For manual save patterns, debounce with a timeout:

```typescript
let saveTimeout;

list.on('scroll', () => {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const snapshot = list.getScrollSnapshot();
    sessionStorage.setItem('scroll', JSON.stringify(snapshot));
  }, 300);
});
```

## Compatibility

### Works With All Features

✅ `withGrid()` — Saves data index and offset ratio; restores correctly in list or table mode
✅ `withGroups()` — Saves data index (excludes headers); restores correctly when group structure changes
✅ `withTable()` — 1:1 index mapping; snapshots are compatible with list mode out of the box
✅ `withAsync()` — `autoSave` cancels autoLoad and bootstraps total automatically
✅ `withScale()` — Compression-aware save/restore
✅ `withPage()` — Works with page-level scrolling
✅ `withSelection()` — Selection and keyboard focus automatically included in snapshots

### Platform Support

✅ All browsers with `sessionStorage` / `localStorage`
✅ Works with browser back/forward navigation
✅ Works with SPA routers (React Router, Vue Router, etc.)

## Best Practices

### Use `autoSave` for Most Cases

```typescript
// ✅ Best — fully automatic, no manual plumbing
const list = vlist({ ... })
  .use(withSnapshots({ autoSave: 'my-list' }))
  .build();
```

### Use `restore` for Custom Storage

```typescript
// ✅ Good — manual control when autoSave doesn't fit (localStorage, History API, etc.)
const list = vlist({ ... })
  .use(withSnapshots({ restore: snapshot }))
  .build();
```

### Use sessionStorage for Navigation

```typescript
// ✅ Good — Clears on tab close (autoSave uses this automatically)
sessionStorage.setItem('scroll', JSON.stringify(snapshot));
```

### Use localStorage for Long-Term Persistence

```typescript
// ✅ Good — Persists across sessions (use manual restore pattern)
localStorage.setItem('reading-position', JSON.stringify(snapshot));
```

### Clear Old Snapshots

```typescript
function cleanupSnapshots() {
  const raw = sessionStorage.getItem('my-list');
  if (raw) {
    const snapshot = JSON.parse(raw);
    if (snapshot.total && snapshot.index >= snapshot.total) {
      sessionStorage.removeItem('my-list');  // Index no longer valid
    }
  }
}
```

### Validate Before Manual Restore

```typescript
// NaN/Infinity are guarded internally, but you can validate defensively:
const saved = sessionStorage.getItem('scroll');
if (saved) {
  try {
    const snapshot = JSON.parse(saved);
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

**Solution A — Use `autoSave` (recommended):**

`autoSave` handles async coordination automatically — it cancels autoLoad, bootstraps the total from the saved snapshot, and restores scroll position:
```typescript
.use(withAsync({ adapter }))
.use(withSnapshots({ autoSave: 'my-list' }))
```

**Solution B — Use `reload({ snapshot })` for runtime reloads:**

```typescript
await list.reload({ snapshot: savedSnapshot });
// Total is set from snapshot.total → restoreScroll works immediately
```

**Solution C — Pass total manually at creation time:**
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

- [Types — `ScrollSnapshot`](../api/types.md#scrollsnapshot) — `index`, `offsetInItem`, `total`, `dataIndex`, `dataTotal`, `offsetRatio`, `selectedIds`, `focusedId`
- [Types — `ReloadOptions`](../api/types.md#reloadoptions) — `snapshot` option for `reload()`
- [Types — `ScrollToOptions`](../api/types.md#scrolltooptions) — `align`, `behavior`, `duration`
- [Selection](./selection.md) — Selection state included in snapshots automatically
- [Async](./async.md) — `autoSave` coordinates with `withAsync` automatically, or use `reload({ snapshot })` at runtime

## Examples

- [Scroll Restore](/examples/scroll-restore) — Save and restore scroll position across navigations
- [Track List](/examples/track-list) — Cross-mode restore across list, grid, and table layouts
- [Velocity Loading](/examples/velocity-loading) — `autoSave` with async loading, scale, and selection