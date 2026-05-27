---
created: 2026-02-10
updated: 2026-05-27
status: published
---

# Accessibility

vlist implements the WAI-ARIA Listbox pattern with full keyboard navigation and screen reader support. The core provides single-select and focus management out of the box — no plugins required.

## ARIA Structure

```
div                                        ← root
  div[tabindex="-1"]                       ← viewport
    div[role="listbox"]                    ← content
      [aria-label]
      [tabindex="0"]
      [aria-activedescendant]
      [aria-orientation]                   (horizontal mode only)
      div[role="option"]                   ← item
        [id="{classPrefix}-item-{index}"]
        [aria-selected="true"]             (when selected)
        [aria-setsize]
        [aria-posinset]
```

- `aria-setsize` and `aria-posinset` on every rendered item — screen readers announce "item 5 of 200"
- `aria-activedescendant` pattern (not roving tabindex) because items are virtual and recycled
- Item `id` attributes are set automatically when `interactive: true`
- `aria-selected` reflects selection state (baseline or selection plugin)
- `aria-busy="true"` during async loading
- `interactive: false` switches `role="listbox"` to `role="list"`, items to `role="listitem"`, and removes `tabindex`

## Keyboard Navigation

**Baseline (built-in):**

Single-select and focus management are built into the core when `interactive: true` (the default). No plugins needed for WAI-ARIA compliant keyboard navigation.

| Key | Action |
|-----|--------|
| Arrow Down/Up | Move focus to next/previous item |
| Arrow Left/Right | Move focus (horizontal mode) |
| Home / End | Focus first / last item |
| Page Up / Page Down | Jump focus by one page of items |
| Space / Enter | Toggle selection on focused item |
| Click | Select and focus clicked item |

Group headers (`__groupHeader` items) are automatically skipped during keyboard navigation.

Events emitted:
- `focus:change` — `{ id, index }` when the focused item changes
- `selection:change` — `{ selected: [id], items: [item] }` when selection changes (empty arrays on deselect)

**With selection plugin:**

The selection plugin replaces baseline behavior entirely, adding multi-select, range selection, and additional keybindings.

| Key | Action |
|-----|--------|
| Arrow Down/Up | Move focus |
| Arrow Left/Right | Move focus (grid/masonry: between columns) |
| Space | Toggle selection |
| Enter | Activate item |
| Home / End | Focus first / last |
| Ctrl+A | Select all (multiple mode) |
| Shift+Arrow | Extend selection |
| Delete/Backspace | Emit `delete` event |
| Escape | Clear selection |

**With sortable plugin:**

| Key | Action |
|-----|--------|
| Space | Grab/drop item |
| Arrow Up/Down | Move grabbed item |
| Escape | Cancel reorder |

## Focus vs. Selection

Focus and selection are separate:
- **Focus** = which item has the keyboard cursor (visual ring, via `:focus-visible`)
- **Selection** = which items are "checked" (highlighted, `aria-selected="true"`)

Arrow keys move focus. Space/Enter toggles selection on the focused item. Click selects without showing the focus ring.

## Configuration

```ts
createVList({
  ariaLabel: "Contact list",
  interactive: true, // default — enables keyboard + a11y
  // ...
});
```

Set `interactive: false` for presentation-only lists (e.g. dashboards, decorative feeds). This removes keyboard handling, changes `role` to `"list"`, and removes `tabindex`. Click events still fire.

## Built-in vs. Plugin

The core provides full WAI-ARIA compliance out of the box. Plugins extend it:

| Capability | Source |
|------------|--------|
| ARIA roles, `aria-setsize`, `aria-posinset` | Built-in (core) |
| `aria-activedescendant` focus tracking | Built-in (core) |
| Arrow/Home/End/PageUp/PageDown navigation | Built-in (core) |
| Single-select via Space/Enter + Click | `a11y()` or `selection()` plugin |
| Multi-select, range select, Ctrl+A | `selection()` plugin |
| 2D grid navigation (left/right between columns) | `grid()` plugin |
| Lane-aware masonry navigation | `masonry()` plugin |
| Live region announcements ("Item N of M") | `a11y()` or `selection()` plugin |
| Drag-and-drop announcements | `sortable()` plugin |

If you only need keyboard navigation without selection, set `interactive: true` (the default) — no plugins required. Add `a11y()` for single-select with screen reader announcements, or `selection()` for full multi-select.

## Screen Reader Tips

- Always set `ariaLabel` for a meaningful listbox announcement
- Items should contain meaningful text content for screen reader navigation
- Group headers (groups plugin) are announced as separators
- Sortable items get `aria-roledescription: "sortable item"` with grab/drop announcements
