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

Zero-config: a search bar appears at the top, typing filters items (case-insensitive across all string properties), matches are highlighted, `Ctrl/Cmd+F` focuses the bar, the **×** button clears the query, and `Escape` closes.

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
| `field` | `string \| (item) => string` | all string values | Field(s) to search |
| `caseSensitive` | `boolean` | `false` | Case-sensitive matching |
| `highlight` | `boolean \| { within?: string }` | `true` | Wrap matched text in `<mark>`; scope it with `within` |
| `minLength` | `number` | `1` | Minimum query length to trigger search |
| `cancelTimeout` | `number` | `0` | Auto-close after N ms of inactivity (0 = never) |
| `variant` | `"default" \| "md3"` | `"default"` | Visual style of the bar (`"md3"` = Material Design 3 pill) |
| `text` | `SearchText` | English defaults | Consumer-supplied UI text / localization (see [Localization](#localization)) |

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

### Style variant

```ts
search({ variant: "md3" })
```

`"default"` is a compact bar; `"md3"` renders a Material Design 3 search pill (a 40px pill in a 56px row). Both require `import "vlist/styles/search"` and share the same DOM and class names.

## Highlighting

Matched substrings are wrapped in `<mark class="vlist-search-match">` after each render (for string templates). The current match in navigate mode also gets `vlist-search-match--current`.

By default the whole row is scanned, so a query can be marked anywhere it appears — even in fields you didn't search. Scope it to specific elements with `within`:

```ts
// Mark only inside the name, never the badge or metadata.
search({ field: "name", highlight: { within: ".person__name" } })
```

For element templates or fully custom rendering, read `state.search` in your template instead:

```ts
const template = (item, index, state) => {
  const cls = state.search?.isCurrent ? "current" : "";
  return `<div class="${cls}">${item.name}</div>`;
};
```

`state.search` is `{ matched, query, matchIndex, isCurrent }` (or `undefined` when no search is active). It refreshes whenever an item (re)renders.

## Localization

The plugin ships **no inline human-language strings** — all of its text is consumer-supplied, with English defaults ([RFC-010: Externalized UI Text](/docs/rfcs/RFC-010-Externalized-UI-Text)). Override any of it via `text`:

```ts
search({
  text: {
    placeholder: "Filtrer…",
    clear: "Effacer la recherche",
    previous: "Résultat précédent",
    next: "Résultat suivant",
    noResults: "Aucun résultat",
    results: (n) => `${n} résultat${n > 1 ? "s" : ""}`,
    position: (current, total) => `${current} sur ${total}`,
    region: "Recherche", // names the role="search" landmark (unnamed by default)
  },
})
```

| Field | Type | Default | Used for |
|-------|------|---------|----------|
| `placeholder` | `string` | `"Search…"` | Input placeholder + accessible name |
| `clear` | `string` | `"Clear search"` | Clear (×) button label |
| `previous` / `next` | `string` | `"Previous match"` / `"Next match"` | Nav button labels (navigate mode) |
| `noResults` | `string` | `"No results"` | Counter when nothing matches |
| `results` | `(count) => string` | `` `${n} results` `` | Filter-mode counter |
| `position` | `(current, total) => string` | `` `${c} of ${t}` `` | Navigate-mode counter |
| `region` | `string` | `""` (unnamed) | Accessible name for the `role="search"` landmark |

Dynamic counter text uses formatter functions so pluralization and ordering stay in your code. For non-English pages, override `text` **and** set `lang` on the document so screen readers pronounce the labels correctly.

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

The bar uses a modular BEM structure (mirrors the mtrl `_search.scss` component):

- `.vlist-search` — root, plus `--bar`, `--top` / `--bottom`, and `--md3` (variant) modifiers; `role="search"`
- `.vlist-search__container` — the bar container (the pill, in the MD3 variant)
- `.vlist-search__leading-icon` — decorative magnifier (`aria-hidden`, not a control)
- `.vlist-search__input-wrapper` > `.vlist-search__input`
- `.vlist-search__counter` — match count (empty when idle)
- `.vlist-search__nav-prev` / `.vlist-search__nav-next` (+ `--hidden`) — navigate-mode buttons
- `.vlist-search__clear-button` (+ `--hidden` when empty) — the × button
- `.vlist-search-match` / `.vlist-search-match--current` — on highlighted text
- `.vlist--has-search`, `.vlist--search-open`, `.vlist--searching` — on the root

Colors come from theme tokens: the highlight via `--vlist-search-match-bg` and `--vlist-search-match-current-bg`; the MD3 pill via `--vlist-search-md3-surface` and `--vlist-search-md3-state`. Everything else reuses the base `--vlist-*` tokens.

## Notes

- Filtering is non-destructive — it overrides item access, so clearing restores the original list.
- With the **tree** plugin, filter mode delegates to the tree's ancestor-preserving filter.
- Server-side search (via the `data()` plugin), column-aware search for tables, fuzzy matching, and advanced query syntax are planned for Phase 2 (RFC-008).
