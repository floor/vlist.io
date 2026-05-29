---
created: 2026-02-10
updated: 2026-05-27
status: published
---

# Accessibility

vlist implements the WAI-ARIA composite widget pattern with full keyboard navigation and screen reader support. ARIA semantics are **plugin-driven** — the `a11y()` or `selection()` plugin upgrades the list from a static `role="list"` to an interactive `role="listbox"`.

## ARIA Structure

**Default (no interaction plugin):**

```
div                                        ← root
  div[tabindex="-1"]                       ← viewport
    div[role="list"]                       ← content
      [aria-label]
      [aria-orientation]                   (horizontal mode only)
      div[role="listitem"]                 ← item
        [aria-setsize]
        [aria-posinset]
```

**With `a11y()` or `selection()` plugin:**

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
- Item `id` attributes are set automatically when `a11y()` or `selection()` is active
- `aria-selected` reflects selection state
- `aria-busy="true"` during async loading
- The `a11y()` and `selection()` plugins call `enableListboxRole()` during setup, which upgrades `role="list"` to `role="listbox"` and items from `role="listitem"` to `role="option"`

## Focusable Descendant Neutralization

vlist automatically sets `tabindex="-1"` on all natively focusable elements inside rendered items (`<a href>`, `<button>`, `<input>`, `<select>`, `<textarea>`, `[tabindex]`). This follows the WAI-ARIA composite widget pattern: the list container owns the single tab stop, and internal focusable elements are removed from sequential tab order.

Elements remain clickable, programmatically focusable, and visible to screen readers — only their participation in `Tab`/`Shift+Tab` navigation is removed. This prevents focus from jumping into the middle of a virtualized list, which would break both keyboard navigation and scroll position.

Neutralization is applied automatically in all render paths (initial render, scroll updates, `setItems()`, plugin renderers).

## Keyboard Navigation

**With `a11y()` plugin:**

Single-select and focus management. Add `a11y()` for WAI-ARIA compliant keyboard navigation.

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

**With `selection()` plugin:**

The selection plugin replaces a11y behavior entirely, adding multi-select, range selection, and additional keybindings.

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

**With `sortable()` plugin:**

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
  // ...
}, [a11y()]); // or selection() for multi-select
```

Without `a11y()` or `selection()`, the list uses `role="list"` with no keyboard handling — suitable for presentation-only lists (e.g. dashboards, decorative feeds). Click events still fire.

## Plugins and ARIA

| Capability | Source |
|------------|--------|
| `role="list"`, `aria-setsize`, `aria-posinset` | Built-in (core) |
| Focusable descendant neutralization | Built-in (core) |
| `role="listbox"` upgrade, `tabindex="0"` | `a11y()` or `selection()` plugin |
| `aria-activedescendant` focus tracking | `a11y()` or `selection()` plugin |
| Arrow/Home/End/PageUp/PageDown navigation | `a11y()` or `selection()` plugin |
| Single-select via Space/Enter + Click | `a11y()` or `selection()` plugin |
| Multi-select, range select, Ctrl+A | `selection()` plugin |
| 2D grid navigation (left/right between columns) | `grid()` plugin |
| Lane-aware masonry navigation | `masonry()` plugin |
| Live region announcements ("Item N of M") | `a11y()` or `selection()` plugin |
| Drag-and-drop announcements | `sortable()` plugin |

Add `a11y()` for single-select with screen reader announcements, or `selection()` for full multi-select. You don't need both — `a11y()` is a no-op when `selection()` is active.

## Screen Reader Tips

- Always set `ariaLabel` for a meaningful listbox announcement
- Items should contain meaningful text content for screen reader navigation
- Group headers (groups plugin) are announced as separators
- Sortable items get `aria-roledescription: "sortable item"` with grab/drop announcements
