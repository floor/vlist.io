---
created: 2026-02-17
updated: 2026-11-10
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
| `restorePosition` | `"legacy" \| "anchor"` | `"legacy"` | Which saved position restore uses: the saved pixels, or the saved row and the offset inside it (since 3.7.0) |

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

By default (`restorePosition: "legacy"`), when the item count matches the saved snapshot, restore scrolls to the saved pixel position (`scrollTop`). It falls back to the saved item index and within-item offset when the total count has changed or `scrollTop` is not present.

If rows above the saved position change size before restore — for example through `remeasureItem()`, a layout change with the same item count, or `autosize()` measuring rows later — the saved row moves to a new pixel offset while restore still returns to the original pixel position, landing on a different row than the one that was saved. Set `restorePosition: "anchor"` (since 3.7.0) to restore the saved row instead.

```ts
const list = createVList(config, [
  snapshots({ autoSave: "my-list-scroll", restorePosition: "anchor" }),
]);
```

With `"anchor"`, restore resolves the saved row against the list's current sizes and scrolls to the same fraction into that row, whatever the saved pixels were: a row that grew from 810 to 820 px restores the same place inside it, and rows above it can change size freely. If the saved row no longer exists, restore uses the saved pixels once; if they are absent too, it leaves the scroll position unchanged. On a list that loads data in ranges, the anchor is resolved once more after the visible rows load.

Take snapshots after row sizes have settled. With `autosize()`, items above the viewport keep their estimated size until they are rendered and measured, so rows measured later can shift the position after restore.

## Notes

- Captures: scroll position, first visible item index, sub-pixel offset, selection state, focus
- Works with async data — polls until container is ready, then restores

## Examples

- [Scroll Restore](/examples/scroll-restore) — save and restore scroll position across navigations
- [Contact List](/examples/contact-list) — snapshot with grouped selection
