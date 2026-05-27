---
created: 2026-02-17
updated: 2026-05-27
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

## Notes

- Captures: scroll position, first visible item index, sub-pixel offset, selection state, focus
- Survives compression mode changes (scale plugin)
- Works with async data — polls until container is ready, then restores
