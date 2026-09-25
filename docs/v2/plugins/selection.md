---
created: 2026-02-10
updated: 2026-05-27
status: published
---

# Selection

Single or multi-select with keyboard navigation.

```ts
import { createVList, selection } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [selection({ mode: "multiple" })]);

list.on("selection:change", ({ selected, items }) => {
  console.log("Selected:", selected);
});
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"single" \| "multiple" \| "none"` | `"single"` | Selection mode |
| `initial` | `Array<string \| number>` | `[]` | Pre-selected item IDs |
| `followFocus` | `boolean` | `false` | Auto-select focused item (single mode) |
| `focusOnClick` | `boolean` | `false` | Show focus indicator on click |

## Methods

| Method | Description |
|--------|-------------|
| `select(...ids)` | Select items by ID |
| `deselect(...ids)` | Deselect items |
| `toggleSelect(id)` | Toggle selection |
| `selectAll()` | Select all (multiple mode) |
| `clearSelection()` | Deselect all |
| `getSelected()` | Get selected IDs |
| `getSelectedItems()` | Get selected item objects |
| `selectNext()` | Select next item |
| `selectPrevious()` | Select previous item |

## Events

| Event | Payload |
|-------|---------|
| `selection:change` | `{ selected: ids[], items: T[] }` |
| `focus:change` | `{ id, index }` |
| `delete` | `{ selected, items }` — fired on Delete/Backspace |

## Keyboard

- Arrow keys: navigate
- Space: toggle selection
- Ctrl+A: select all (multiple mode)
- Shift+Click: range select
- Ctrl/Cmd+Click: toggle single item

## ARIA

- Calls `enableListboxRole()` during setup — upgrades `role="list"` to `role="listbox"` and sets `tabindex="0"` on the content element
- Items are upgraded from `role="listitem"` to `role="option"` with `aria-selected` attributes

## Notes

- The item template receives `state.selected` and `state.focused` booleans
- CSS class `.vlist--selectable` added to root

## Examples

- [Contact List](/examples/contact-list) — single and multi-select with keyboard navigation
- [Data Table](/examples/data-table) — row selection in a data table
- [Accessibility](/examples/accessibility) — selection with live ARIA attributes
