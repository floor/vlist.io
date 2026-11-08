---
created: 2026-02-17
updated: 2026-11-08
status: published
---

# Snapshots

Save and restore scroll position across SPA navigation and list recreation.

```ts
import { createVList, snapshots } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [snapshots({ autoSave: "my-list-scroll" })]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoSave` | `string` | — | Session storage key for auto-save/restore |
| `restore` | `ScrollSnapshot` | — | Restore from a snapshot object |

## Methods

| Method | Description |
|--------|-------------|
| `getScrollSnapshot()` | Capture current scroll and selection state |
| `restoreScroll(snapshot, restoreSelection?)` | Restore from a snapshot |

## Manual Save/Restore

```ts
// Save before navigating away
const snapshot = list.getScrollSnapshot();
sessionStorage.setItem("scroll", JSON.stringify(snapshot));

// Restore on return
const saved = JSON.parse(sessionStorage.getItem("scroll"));
const list = createVList(config, [snapshots({ restore: saved })]);
```

## What restore brings back

When the item count matches the saved snapshot, restore scrolls to the saved pixel position (`scrollTop`). It falls back to the saved item index and within-item offset when the total count has changed or `scrollTop` is not present.

If rows above the saved position change size before restore — for example through `remeasureItem()` or a layout change with the same item count — the saved row moves to a new pixel offset while restore still returns to the original pixel position, landing on a different row than the one that was saved.

Take snapshots after row sizes have settled. With `autosize()`, items above the viewport keep their estimated size until they are rendered and measured, so rows measured later can shift the position after restore.

## Notes

- Captures: scroll position, first visible item index, sub-pixel offset, selection state, focus
- Works with async data — polls until container is ready, then restores

## Examples

- [Scroll Restore](/examples/scroll-restore) — save and restore scroll position across navigations
- [Contact List](/examples/contact-list) — snapshot with grouped selection
