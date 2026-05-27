---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Groups

Grouped lists with sticky headers.

```ts
import { createVList, groups } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderContact },
  items: contacts, // Must be pre-sorted by group
}, [groups({
  getGroupForIndex: (index, item) => item.lastName[0],
  header: {
    height: 32,
    template: (key) => `<div class="group-header">${key}</div>`,
  },
  sticky: true,
})]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `getGroupForIndex` | `(index, item?) => string` | required | Returns group key for item |
| `header.height` | `number \| (group, groupIndex) => number` | — | Header row height (fixed or per-group) |
| `header.template` | `(key, groupIndex) => string \| HTMLElement` | — | Header render function |
| `sticky` | `boolean` | `true` | Sticky headers |

## Pre-Sort Requirement

Data **must** be sorted by group before passing to vlist. The plugin detects group boundaries by comparing adjacent items — unsorted data produces duplicate/broken headers.

```ts
const sorted = [...contacts].sort((a, b) => a.lastName.localeCompare(b.lastName));
```

## Updating Data

All data methods use **data indices** (your array positions), not layout indices:

```ts
list.appendItems([newContact]);       // Adds to existing group (or creates new one)
list.removeItem("contact-42");        // Header disappears if last item in group
list.setItems(newSortedContacts);     // All groups rebuild
list.scrollToIndex(2, "start");       // Scrolls to 3rd contact, not 3rd layout entry
```

## Async Data

With the `data()` plugin, use the `item` parameter in `getGroupForIndex` instead of looking up by index (the item may not be in your local array):

```ts
getGroupForIndex: (index, item) => item.category
```

## Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getGroupLayout()` | `GroupLayout` | Group layout instance (see below) |

**`GroupLayout`** properties and methods:

| Member | Type | Description |
|--------|------|-------------|
| `totalEntries` | `number` | Data items + group headers |
| `groupCount` | `number` | Number of groups |
| `groups` | `GroupBoundary[]` | All group boundaries |
| `getEntry(layoutIndex)` | `LayoutEntry` | `{ type: "header", group }` or `{ type: "item", dataIndex, group }` |
| `layoutToDataIndex(layoutIndex)` | `number` | Convert layout index to data index |
| `dataToLayoutIndex(dataIndex)` | `number` | Convert data index to layout index |

## CSS Classes

- `.vlist--grouped` on root
- `.vlist-groups-item` on items and headers

## Notes

- Headers are excluded from `aria-setsize` / `aria-posinset` counts
- Group headers are skipped during keyboard navigation
