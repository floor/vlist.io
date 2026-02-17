# Accessibility

> WAI-ARIA listbox implementation, keyboard navigation, screen reader support, and focus management for vlist.

## Overview

vlist implements the [WAI-ARIA Listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) to provide a fully accessible virtual list experience. Because virtual lists only render a subset of items in the DOM at any time, standard accessibility patterns need careful adaptation — vlist handles this transparently.

### What's Covered

| Feature | Standard | Description |
|---------|----------|-------------|
| **ARIA roles** | WAI-ARIA 1.2 | `role="listbox"` on root, `role="option"` on items |
| **Positional context** | `aria-setsize` / `aria-posinset` | Screen readers announce "item 5 of 10,000" |
| **Focus tracking** | `aria-activedescendant` | Root element declares focused item by ID |
| **Selection state** | `aria-selected` | Each item reflects its selection state |
| **Loading state** | `aria-busy` | Announced during async data fetching |
| **Live region** | `aria-live="polite"` | Selection changes announced to screen readers |
| **Keyboard navigation** | WAI-ARIA Practices | Arrow keys, Home, End, Space, Enter |
| **Focus visibility** | `:focus-visible` | Keyboard-only focus ring (no mouse outline) |

### Works Across All Modes

Every accessibility feature works in all vlist configurations:

- ✅ List mode (vertical, horizontal)
- ✅ Grid mode
- ✅ Core (lightweight) mode
- ✅ Groups / sticky headers
- ✅ Reverse mode (chat UI)
- ✅ Compressed mode (1M+ items)
- ✅ Window scrolling
- ✅ Async adapter

---

## ARIA Roles & Attributes

### DOM Structure

vlist produces the following accessible DOM hierarchy:

```
div.vlist [role="listbox"] [tabindex="0"] [aria-label="..."]
  └── div.vlist-viewport
       └── div.vlist-content
            └── div.vlist-items
                 ├── div.vlist-item [role="option"] [id="vlist-0-item-3"]
                 │     [aria-selected="false"]
                 │     [aria-setsize="10000"]
                 │     [aria-posinset="4"]
                 ├── div.vlist-item [role="option"] [id="vlist-0-item-4"]
                 │     [aria-selected="true"]
                 │     ...
                 └── ...
  └── div.vlist-live-region [aria-live="polite"] [aria-atomic="true"]
       (visually hidden — announces selection changes)
```

### Root Element

The root element receives:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `"listbox"` | Identifies the widget as a list of selectable items |
| `tabindex` | `"0"` | Makes the list focusable via Tab key |
| `aria-label` | User-provided | Describes the list's purpose to screen readers |
| `aria-activedescendant` | Element ID | Points to the currently focused item (set on keyboard/click) |
| `aria-busy` | `"true"` | Present only during async data loading |

### Item Elements

Each rendered item receives:

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `role` | `"option"` | Identifies the element as a selectable option |
| `id` | `"vlist-{n}-item-{index}"` | Unique ID referenced by `aria-activedescendant` |
| `aria-selected` | `"true"` / `"false"` | Reflects selection state |
| `aria-setsize` | Total item count | Enables "item X of Y" announcements |
| `aria-posinset` | 1-based position | Enables "item X of Y" announcements |

---

## Configuration

### `ariaLabel`

**Type:** `string`
**Default:** `undefined`

Sets `aria-label` on the root element. Always provide this — screen readers need it to identify the list.

```typescript
const list = vlist({
  container: '#app',
  ariaLabel: 'Contact list',
  item: { height: 48, template },
  items: contacts,
});
```

Without `ariaLabel`, screen readers will announce the list generically (e.g., "listbox") without context. Good labels are short and descriptive:

| ✅ Good | ❌ Bad |
|---------|--------|
| `"Contact list"` | `"List of all the contacts in the system"` |
| `"Search results"` | `"Results"` |
| `"Chat messages"` | `"Messages list container"` |
| `"Photo gallery"` | `"Gallery"` (too vague if multiple galleries exist) |

### `selection.mode`

**Type:** `'none' | 'single' | 'multiple'`
**Default:** `'none'`

Enables keyboard navigation and selection. When set to anything other than `'none'`, the full keyboard interaction model activates (arrow keys, Home/End, Space/Enter).

```typescript
const list = vlist({
  container: '#app',
  ariaLabel: 'Task list',
  item: { height: 48, template },
  items: tasks,
  selection: { mode: 'multiple' },
});
```

> **Note:** Keyboard focus tracking (`aria-activedescendant`) and the live region for selection announcements only activate when selection mode is not `'none'`.

### `classPrefix`

**Type:** `string`
**Default:** `'vlist'`

The class prefix also affects ARIA element IDs. Each instance generates IDs like `{classPrefix}-{instanceId}-item-{index}`. If you have multiple lists on the same page, you can use the default — the instance counter ensures uniqueness automatically.

---

## Keyboard Navigation

When `selection.mode` is `'single'` or `'multiple'`, the following keyboard interactions are available:

| Key | Action |
|-----|--------|
| `↑` Arrow Up | Move focus to the previous item (wraps to last) |
| `↓` Arrow Down | Move focus to the next item (wraps to first) |
| `Home` | Move focus to the first item |
| `End` | Move focus to the last item |
| `Space` | Toggle selection on the focused item |
| `Enter` | Toggle selection on the focused item |
| `Tab` | Move focus into / out of the list (standard browser behavior) |

### How Focus Works

vlist uses the **`aria-activedescendant` pattern** rather than roving `tabindex`. This is the correct approach for virtual lists because:

1. **Items are recycled** — the element pool constantly reuses DOM nodes, so moving `tabindex="0"` between items would be fragile
2. **Items may not exist** — the focused item might be outside the rendered range (scrolled off-screen)
3. **One focus point** — the root element stays focused (receives all keyboard events), and `aria-activedescendant` tells the screen reader which item is logically active

```
User presses ↓
  → Root keeps DOM focus
  → root.setAttribute('aria-activedescendant', 'vlist-0-item-5')
  → Screen reader announces item 5's content
  → Item 5 scrolled into view if needed
  → CSS class .vlist-item--focused applied for visual indicator
```

### Focus vs. Selection

These are separate concepts:

| Concept | What it is | Visual indicator | ARIA attribute |
|---------|-----------|------------------|----------------|
| **Focus** | Keyboard cursor position (single index) | `.vlist-item--focused` class | `aria-activedescendant` on root |
| **Selection** | Chosen items (set of IDs) | `.vlist-item--selected` class | `aria-selected` on each item |

Arrow keys move **focus** without changing **selection**. Press Space or Enter to **select** the focused item.

---

## Screen Reader Support

### Positional Context

Without `aria-setsize` and `aria-posinset`, a screen reader navigating a virtual list would have no idea how many items exist or where the current item falls in the sequence. vlist sets these on every rendered item:

```
Screen reader output:
  "Alice Johnson, item 5 of 10,000"
  "Bob Smith, item 6 of 10,000"
```

When the total item count changes (e.g., after `appendItems()` or `setItems()`), `aria-setsize` is updated on all visible items during the next render cycle.

### Active Descendant

When keyboard focus moves, the root element's `aria-activedescendant` is updated to point to the focused item's `id`. The screen reader follows this reference and announces the item's content without the item needing actual DOM focus.

```typescript
// After pressing ↓ twice:
// root.getAttribute('aria-activedescendant') === 'vlist-0-item-1'
// The element with id="vlist-0-item-1" has role="option"
// Screen reader reads its text content
```

### Selection Announcements (Live Region)

vlist creates a visually-hidden live region inside the root element:

```html
<div aria-live="polite" aria-atomic="true"
     class="vlist-live-region"
     style="position:absolute;width:1px;height:1px;...">
</div>
```

When selection changes, the live region is updated and the screen reader announces:

| Selection count | Announcement |
|----------------|--------------|
| 0 | *(cleared — no announcement)* |
| 1 | `"1 item selected"` |
| 3 | `"3 items selected"` |

The live region uses `aria-live="polite"` so announcements don't interrupt the user's current reading flow.

### Loading State

When using an async adapter, vlist sets `aria-busy="true"` on the root element while data is loading. Screen readers may announce this as "busy" or defer reading until loading completes. The attribute is removed when `load:end` fires.

```typescript
const list = vlist({
  container: '#app',
  ariaLabel: 'User directory',
  item: { height: 48, template },
  adapter: {
    read: async ({ offset, limit }) => {
      // aria-busy="true" set automatically on load:start
      const data = await fetchUsers(offset, limit);
      // aria-busy removed automatically on load:end
      return data;
    },
  },
});
```

---

## Unique Element IDs

Each vlist instance generates a unique ID prefix using a module-level counter:

```
Instance 0:  vlist-0-item-0,  vlist-0-item-1,  vlist-0-item-2, ...
Instance 1:  vlist-1-item-0,  vlist-1-item-1,  vlist-1-item-2, ...
```

This ensures that multiple lists on the same page never produce duplicate IDs, which would break `aria-activedescendant` references.

The ID format is `{classPrefix}-{instanceId}-item-{index}`:

| Segment | Source | Example |
|---------|--------|---------|
| `classPrefix` | Config (default: `"vlist"`) | `vlist` |
| `instanceId` | Module-level counter | `0`, `1`, `2`, ... |
| `index` | Item's position in the data | `0`, `1`, `42`, ... |

> **Note:** The full vlist and core (lightweight) vlist maintain separate instance counters. This is safe because you never use both for the same container.

---

## CSS & Focus Styles

### Focus Ring

The root element uses `:focus-visible` so the focus ring only appears during keyboard navigation, not on mouse click:

```css
/* No outline on mouse focus */
.vlist:focus {
  outline: none;
}

/* Keyboard focus ring */
.vlist:focus-visible {
  outline: 2px solid var(--vlist-focus-ring);
  outline-offset: 2px;
}
```

### Item States

Focused and selected items receive CSS classes for visual differentiation:

| Class | When applied | Default style |
|-------|-------------|---------------|
| `.vlist-item--focused` | Arrow key navigation moves to the item | *(combined with focused-visible below)* |
| `.vlist-item--focused-visible` | Available for keyboard-only focus ring on the item | `outline: 2px solid var(--vlist-focus-ring)` |
| `.vlist-item--selected` | Item is in the selection set | `background-color: var(--vlist-bg-selected)` |

### Design Tokens

Override these CSS custom properties to match your design system:

```css
:root {
  --vlist-focus-ring: #3b82f6;           /* Focus ring color */
  --vlist-bg-selected: #eff6ff;          /* Selected item background */
  --vlist-bg-selected-hover: #dbeafe;    /* Selected item hover */
  --vlist-border-selected: #3b82f6;      /* Selected item accent */
}
```

Dark mode tokens are set automatically via `prefers-color-scheme: dark` or the `.dark` class. See [styles.md](./styles.md) for the full token reference.

---

## Grid Mode

Grid mode (`layout: 'grid'`) follows the same accessibility model:

- Each grid item gets `role="option"`, unique `id`, `aria-setsize`, `aria-posinset`, and `aria-selected`
- `aria-setsize` reflects the **total item count** (not the row count)
- `aria-posinset` uses the **flat item index** (not row/column)
- Keyboard navigation moves through items linearly (↑↓ move by one item, not by row)

```typescript
const gallery = vlist({
  container: '#gallery',
  ariaLabel: 'Photo gallery',
  layout: 'grid',
  grid: { columns: 4, gap: 8 },
  item: { height: 200, template: photoTemplate },
  items: photos,
  selection: { mode: 'single' },
});

// Screen reader: "Beach sunset, item 13 of 200"
```

---

## Core (Lightweight) Mode

The core entry point (`vlist/core`) provides the same ARIA attributes as the full bundle:

- ✅ `role="listbox"` / `role="option"`
- ✅ `aria-label`, `tabindex="0"`
- ✅ `aria-setsize`, `aria-posinset`
- ✅ Unique element IDs
- ✅ `aria-selected` (always `"false"` — core has no selection)

Core does **not** include:

- ❌ Keyboard navigation (no selection module)
- ❌ `aria-activedescendant` (no focus tracking)
- ❌ Live region (no selection changes to announce)
- ❌ `aria-busy` (no async adapter)

```typescript
import { vlist } from 'vlist/core';

const list = vlist({
  container: '#app',
  ariaLabel: 'Log entries',
  item: { height: 24, template: logTemplate },
  items: logs,
});

// Items have aria-setsize and aria-posinset ✓
// No keyboard selection (core is read-only display)
```

---

## Best Practices

### Always Set `ariaLabel`

Every list should have a descriptive label. Without it, screen readers announce a generic "listbox" with no context.

```typescript
// ✅ Good
vlist({
  ariaLabel: 'Search results for "typescript"',
  ...
});

// ❌ Missing label
vlist({
  // Screen reader: "listbox" — user has no idea what this list contains
  ...
});
```

### Use Semantic Templates

Your `template` function generates the content that screen readers will read. Use meaningful text, not just visual decoration:

```typescript
// ✅ Good — screen reader gets useful content
const template = (item) => {
  const el = document.createElement('div');
  el.textContent = `${item.name} — ${item.email}`;
  return el;
};

// ❌ Bad — screen reader gets nothing useful
const template = (item) => {
  return `<div class="avatar" style="background-image: url(${item.photo})"></div>`;
};
```

If your template is primarily visual, add a visually-hidden text label:

```typescript
const template = (item) => {
  return `
    <img src="${item.photo}" alt="" />
    <span class="sr-only">${item.name}</span>
  `;
};
```

### Handle the `state` Parameter

The template function receives an `ItemState` with `selected` and `focused` booleans. Use these for visual feedback:

```typescript
const template = (item: Item, index: number, state: ItemState) => {
  const el = document.createElement('div');
  el.textContent = item.name;
  if (state.selected) {
    el.innerHTML += ' <span aria-hidden="true">✓</span>';
  }
  return el;
};
```

> The `aria-hidden="true"` on the checkmark prevents the screen reader from reading "check mark" — the selection state is already conveyed via `aria-selected`.

### Don't Interfere with Focus

vlist manages focus on the root element. Avoid:

- Setting `tabindex` on item content (breaks `aria-activedescendant` pattern)
- Adding interactive elements (buttons, links) inside items without careful focus management
- Calling `element.focus()` on individual items

If you need interactive content inside items, consider handling clicks via event delegation on the list's `item:click` event rather than embedding focusable elements.

---

## Testing Accessibility

### Automated Testing

vlist includes 40 dedicated accessibility tests in `test/accessibility.test.ts` covering:

- `aria-setsize` / `aria-posinset` on all rendered items
- Unique element IDs with no collisions across instances
- `aria-activedescendant` updates on keyboard navigation and click
- `aria-busy` during async loading
- Live region creation, announcements, and cleanup
- Baseline ARIA attributes (roles, tabindex, aria-label, aria-selected)
- Core mode and grid mode coverage

### Manual Testing

For manual verification:

1. **Tab into the list** — focus ring should appear on the root element
2. **Press ↓** — screen reader should announce the first item with position ("item 1 of N")
3. **Press ↓↓↓** — each item announced with updated position
4. **Press Space** — screen reader should announce selection ("1 item selected")
5. **Press Home / End** — should jump to first / last item
6. **Check with screen reader off** — no visible live region, no broken layout

### Recommended Screen Readers

| Platform | Screen Reader | Notes |
|----------|--------------|-------|
| macOS | VoiceOver | Built-in, activate with ⌘F5 |
| Windows | NVDA | Free, widely used |
| Windows | JAWS | Commercial, industry standard |
| Linux | Orca | GNOME's built-in reader |

---

## Implementation Details

### Performance Considerations

The accessibility attributes are designed for minimal performance impact:

- **`aria-setsize`** — tracked via `lastAriaSetSize`; existing items only updated when total changes (rare, on data mutation — not every scroll frame)
- **`aria-posinset`** — set once when an item is rendered; never changes for a given index
- **`id`** — set once when an item is rendered; overwritten on pool recycle
- **`role="option"`** — set once per element lifetime in the pool's `acquire()` function
- **`aria-activedescendant`** — one `setAttribute` call on the root per keyboard/click event
- **Live region** — one `textContent` assignment per selection change

The total bundle size cost for all accessibility features is **+1.4 KB minified** (+0.4 KB gzipped).

### Element Pooling

The element pool sets `role="option"` once when creating a new element. This attribute persists through recycles since the pool's `release()` function only clears styling and data attributes. When a recycled element is rendered for a new item, `id`, `aria-setsize`, `aria-posinset`, and `aria-selected` are all overwritten with the correct values.

### Compression Mode

In compressed mode (1M+ items), all ARIA attributes work identically. The `aria-setsize` reflects the true total item count (e.g., 1,000,000), and `aria-posinset` reflects the true position — even though the scroll height is compressed to fit within browser limits.

---

## Related Documentation

- [Selection](./selection.md) — Selection state management and keyboard interaction internals
- [Handlers](./handlers.md) — Scroll, click, and keyboard event handler implementation
- [Render](./render.md) — Element pool, DOM structure, and renderer details
- [Styles](./styles.md) — CSS tokens, variants, focus ring, and dark mode
- [Main Documentation](./vlist.md) — Full configuration and API reference