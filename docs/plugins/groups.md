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

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `getGroupForIndex` | `(index, item?) => string` | required | Returns group key for item |
| `header.height` | `number \| (group, groupIndex) => number` | — | Header row height (fixed or per-group) |
| `header.template` | `(key, groupIndex) => string \| HTMLElement` | — | Header render function |
| `sticky` | `boolean` | `true` | Sticky headers |

### Methods

| Method | Description |
|--------|-------------|
| `getGroupLayout()` | Returns group layout instance |

### CSS Classes

- `.vlist--grouped` on root
- `.vlist-groups-item` on items and headers

### Notes

- Data must be pre-sorted by group — the plugin inserts header pseudo-items at group boundaries
- Headers are excluded from `aria-setsize` / `aria-posinset` counts
