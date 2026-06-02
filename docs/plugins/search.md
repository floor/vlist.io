---
created: 2026-06-02
updated: 2026-06-02
status: published
---

# Search

A ready-to-use search bar with client-side filtering, match navigation, and `<mark>` highlighting. Works with every layout — it operates at the data layer, upstream of rendering.

```ts
import { createVList, search } from "vlist";
import "vlist/styles/search";

const list = createVList({
  container: "#app",
  items: contacts,
  item: { height: 48, template: renderContact },
}, [search()]);
```

Zero-config: a search bar appears at the top, typing filters items (case-insensitive across all string properties), matches are highlighted, `Ctrl/Cmd+F` focuses the bar, and `Escape` clears and closes.

## Modes

**Filter** (default) — hide non-matching items:

```ts
search({ mode: "filter" })
```

Non-matching items are virtually hidden (non-destructive — clearing the query restores them). The counter shows `"47 results"`.

**Navigate** — keep all items, jump between matches:

```ts
search({ mode: "navigate" })
```

All items stay visible; the current match is scrolled into view and highlighted. `Enter` / `↓` goes to the next match, `Shift+Enter` / `↑` to the previous. The counter shows `"3 of 47"`. Useful for log/code viewers where hiding items loses context.

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `"filter" \| "navigate"` | `"filter"` | Hide non-matches, or navigate between them |
| `position` | `"top" \| "bottom" \| "none"` | `"top"` | Search bar placement; `"none"` = invisible, keyboard-only |
| `placeholder` | `string` | `"Search…"` | Input placeholder |
| `field` | `string \| (item) => string` | all string values | Field(s) to search |
| `caseSensitive` | `boolean` | `false` | Case-sensitive matching |
| `highlight` | `boolean` | `true` | Wrap matched text in `<mark>` |
| `minLength` | `number` | `1` | Minimum query length to trigger search |
| `cancelTimeout` | `number` | `0` | Auto-close after N ms of inactivity (0 = never) |

### Field accessor

```ts
search()                                              // all string properties
search({ field: "name" })                             // a single property
search({ field: (item) => `${item.first} ${item.last}` }) // custom
```

### Invisible mode (type-ahead)

```ts
search({ position: "none" })
```

No visible bar. Typing a printable key while the list is focused starts the search (Windows Explorer-style type-ahead); `Backspace` edits, `Escape` cancels. Pair with `cancelTimeout` to auto-reset after a pause.

## Highlighting

Matched substrings are wrapped in `<mark class="vlist-search-match">` after each render (for string templates). The current match in navigate mode also gets `vlist-search-match--current`. For element templates or custom rendering, read `state.search` in your template:

```ts
const template = (item, index, state) => {
  const cls = state.search?.isCurrent ? "current" : "";
  return `<div class="${cls}">${item.name}</div>`;
};
```

`state.search` is `{ matched, query, matchIndex, isCurrent }` (or `undefined` when no search is active). It refreshes whenever an item (re)renders.

## Methods

| Method | Description |
|--------|-------------|
| `openSearch()` | Open / focus the search bar |
| `closeSearch()` | Clear the query and close the bar |
| `setQuery(query)` | Set the query programmatically |
| `getQuery()` | Current query |
| `nextMatch()` / `prevMatch()` | Navigate matches |
| `getMatches()` | Array of matching item indices |

## Events

| Event | Payload |
|-------|---------|
| `search:open` | `undefined` |
| `search:close` | `undefined` |
| `search:change` | `{ query, matches, total }` |
| `search:match` | `{ index, item, matchIndex, matches }` (navigate mode) |

## Keyboard

| Key | Action |
|-----|--------|
| `Ctrl/Cmd+F` | Open / focus the search bar |
| `Escape` | Clear and close |
| `Enter` / `↓` | Next match |
| `Shift+Enter` / `↑` | Previous match |

## CSS Classes

- `.vlist-search` (+ `--top` / `--bottom`) on the bar
- `.vlist-search-input`, `.vlist-search-counter`, `.vlist-search-prev` / `-next` / `-close`
- `.vlist-search-match` / `.vlist-search-match--current` on highlighted text
- `.vlist--search-open` / `.vlist--searching` on the root

Theme the highlight via `--vlist-search-match-bg` and `--vlist-search-match-current-bg`.

## Notes

- Filtering is non-destructive — it overrides item access, so clearing restores the original list.
- With the **tree** plugin, filter mode delegates to the tree's ancestor-preserving filter.
- Server-side search (via the `data()` plugin), column-aware search for tables, fuzzy matching, and advanced query syntax are planned for Phase 2 (RFC-008).
