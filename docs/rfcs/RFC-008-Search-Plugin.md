---
created: 2026-05-29
updated: 2026-06-02
status: phase-1-implemented
---

# RFC-008: Search Plugin

**Status:** Phase 1 implemented (shipped in `search()` — filter/navigate modes, highlighting, keyboard, ARIA, tree delegation). Phase 2 pending.  
**Author:** floor  
**Type:** Plugin / Feature  
**Created:** 2026-05-29  
**Origin:** [#59](https://github.com/floor/vlist/issues/59) by @AzzaAzza69

---

## Summary

Add a `search()` plugin that provides a ready-to-use search bar with client-side filtering, match navigation, match highlighting, and server-side search integration via the `data()` plugin.

The consumer experience is zero-config:

```ts
const list = createVList({
  container: "#app",
  items: contacts,
  item: { height: 48, template: renderContact },
}, [search()]);
```

This gives a fully functional search bar — type to filter, arrow keys to navigate matches, Enter to select, Escape to clear. Works with every layout (list, grid, table, tree) and scales from local arrays to server-backed datasets.

The feature set is split into two phases:

| Phase | Scope | Priority |
|-------|-------|----------|
| **Phase 1** | Search bar UI, client-side filter/navigate, keyboard, match highlighting, match counter | Core — ship first |
| **Phase 2** | Server-side search via `data()`, debounce, column-aware search (table), fuzzy matching | Power features |

---

## Motivation

Search is the most common interaction pattern after scrolling. Every file browser, contact list, data table, and settings panel needs it. Today, vlist users must build search from scratch — wire up an external input, filter items, call `setItems()`, and manage keyboard focus between the input and the list. This is tedious and error-prone.

@AzzaAzza69 proposed incremental search in [#59](https://github.com/floor/vlist/issues/59), describing the core UX: type-ahead with a visible search bar, timeout-based cancel, and Windows Explorer-style invisible mode. This RFC expands that proposal into a full plugin with two modes, server-side integration, and cross-layout support.

### Competitive landscape

| Library | Built-in search | Server-side | Search bar UI | Highlight |
|---------|----------------|-------------|---------------|-----------|
| **AG Grid** | Quick Filter + column filters | Yes (datasource) | External input | Cell highlight |
| **Handsontable** | Search plugin | Limited | Built-in bar | Yellow highlight |
| **SlickGrid** | DataView.setFilter | Manual | External | CSS classes |
| **TanStack Table** | Column filters | Via query | External | Manual |
| **react-arborist** | Filter prop | No | External | No |
| **vlist (proposed)** | `search()` plugin | Yes (via `data()`) | Built-in bar | Auto `<mark>` |

Most libraries require the consumer to build the search UI and wire the filter logic. vlist's `search()` plugin provides both out of the box.

---

## Architecture

### Rendering model

The search plugin does **not** own the render pipeline (no `setRenderFn`). Instead, it operates at the data layer:

```
User types query  →  search plugin filters items  →  calls list.setItems(filtered)
                     or navigates to match             or updates match index + scrollToIndex
```

This makes search composable with any layout plugin — list, grid, table, tree — because it works upstream of rendering.

**Filter mode**: replaces the visible item set (like sorting).  
**Navigate mode**: keeps all items visible, highlights and scrolls to matches.

### Search bar DOM

The plugin injects a search bar element into the vlist DOM structure:

```
root
├── search-bar (injected by search plugin)
│   ├── input
│   ├── match counter ("3 of 47")
│   ├── prev/next buttons
│   └── close button
├── viewport
│   └── content
```

Position is configurable: `top` (default), `bottom`, or `none` (invisible — keyboard-only, like Windows Explorer type-ahead).

### Interaction with tree plugin

The tree plugin (RFC-007 Phase 2) defines `filterTree()` for search with ancestor preservation. When both `search()` and `tree()` are active, the search plugin delegates filtering to `filterTree()` instead of calling `setItems()`. This preserves tree structure during search.

---

## Phase 1: Core Search

### Config

```ts
interface SearchPluginConfig<T> {
  mode?: "filter" | "navigate";           // default: "filter"
  position?: "top" | "bottom" | "none";   // default: "top"
  placeholder?: string;                   // default: "Search…"
  shortcut?: string;                      // default: "Ctrl+F" / "Cmd+F"
  field?: string | ((item: T) => string); // field(s) to search — default: all string values
  caseSensitive?: boolean;                // default: false
  highlight?: boolean;                    // default: true
  minLength?: number;                     // minimum query length to trigger search — default: 1
  cancelTimeout?: number;                 // auto-close search bar after N ms of inactivity (0 = never) — default: 0
}
```

### Zero-config behavior

```ts
search()
```

With no config:
- Search bar appears at the top
- Filter mode — non-matching items are hidden
- Searches all string-valued properties of each item
- Case-insensitive
- Match text highlighted with `<mark>` in the DOM
- Ctrl+F (Cmd+F on Mac) opens/focuses the search bar
- Escape clears and closes

### Two modes

**Filter mode** (default) — hide non-matching items:

```ts
search({ mode: "filter" })
```

1. User types in search bar
2. Plugin filters items: keeps items where `field(item)` contains the query
3. Calls `list.setItems(filtered)` (or `filterTree()` for trees)
4. List re-renders with only matching items
5. Match counter shows "47 results"
6. Clear restores original items

**Navigate mode** — jump between matches:

```ts
search({ mode: "navigate" })
```

1. User types in search bar
2. Plugin scans items and builds a match index list
3. First match is scrolled into view and highlighted
4. Enter / ArrowDown jumps to next match, Shift+Enter / ArrowUp to previous
5. Match counter shows "3 of 47"
6. All items remain visible — only the current match is focused
7. Clear removes highlights

Navigate mode is useful for log viewers, code displays, and any context where hiding items would lose context.

### Field accessor

By default, the plugin searches all string-valued properties of each item:

```ts
// Searches item.name, item.email, item.role, etc.
search()
```

Narrow to specific fields:

```ts
// Single field
search({ field: "name" })

// Custom accessor
search({ field: (item) => `${item.firstName} ${item.lastName}` })
```

For table layouts, the plugin should search across all visible column values by default.

### Match highlighting

When `highlight: true` (default), the plugin wraps matched text in `<mark>` elements:

```html
<!-- Template returns: "Alice Johnson" -->
<!-- With query "john", rendered as: -->
Alice <mark class="vlist-search-match">John</mark>son
```

**Implementation**: After the template renders each item's innerHTML, the plugin performs a post-render pass that wraps matching substrings in `<mark>` tags. This works for string templates (innerHTML). For templates returning DOM elements, the plugin exposes `state.search` context for manual highlighting.

**Current match** (navigate mode) gets an additional class:

```html
<mark class="vlist-search-match vlist-search-match--current">John</mark>
```

### Template state

The search plugin extends `ItemState` with search context:

```ts
interface SearchState {
  matched: boolean;       // whether this item matches the current query
  query: string;          // current search query (empty string if no search)
  matchIndex: number;     // this item's position in match list (-1 if not matched)
  isCurrent: boolean;     // whether this is the currently focused match (navigate mode)
}
```

Accessible as `state.search` in the template function. Useful for custom highlight rendering:

```ts
const template = (item, index, state) => {
  const cls = state.search?.isCurrent ? "current-match" : "";
  return `<div class="${cls}">${item.name}</div>`;
};
```

### Keyboard

| Key | Action |
|-----|--------|
| Ctrl+F / Cmd+F | Open/focus search bar |
| Escape | Clear query and close search bar |
| Enter | Next match (navigate mode) / close and focus first result (filter mode) |
| Shift+Enter | Previous match (navigate mode) |
| ArrowDown | Next match (when search bar is focused) |
| ArrowUp | Previous match (when search bar is focused) |
| Backspace | Remove last character from query |
| Any printable key | Append to query (when search bar is focused) |

When `position: "none"` (invisible mode), typing any printable key while the list has focus starts the search. Escape or navigation keys (ArrowUp/Down without Shift, PageUp/Down, Home/End) cancel and return to normal list navigation. This matches Windows Explorer's type-ahead behavior and @AzzaAzza69's original proposal.

**`cancelTimeout`**: when set to a non-zero value, the search bar auto-closes after N milliseconds of keyboard inactivity. Useful for the invisible mode where there's no explicit close button.

### Match counter

The search bar displays a match counter:

- **Filter mode**: `"47 results"` (or `"No results"`)
- **Navigate mode**: `"3 of 47"` (current match index of total matches)

### Events

| Event | Payload |
|-------|---------|
| `search:open` | `{}` — search bar opened/focused |
| `search:close` | `{}` — search bar closed |
| `search:change` | `{ query, matches, total }` — query or results changed |
| `search:match` | `{ index, item }` — navigated to a match (navigate mode) |

### CSS Classes

- `.vlist-search` on the search bar container
- `.vlist-search--top` / `.vlist-search--bottom` for position
- `.vlist-search-input` on the input element
- `.vlist-search-counter` on the match counter
- `.vlist-search-prev` / `.vlist-search-next` on navigation buttons
- `.vlist-search-close` on the close button
- `.vlist-search-match` on highlighted match text
- `.vlist-search-match--current` on the currently focused match (navigate mode)
- `.vlist--searching` on the vlist root while search is active

### Methods

| Method | Description |
|--------|-------------|
| `openSearch()` | Open/focus the search bar |
| `closeSearch()` | Clear and close the search bar |
| `setQuery(query)` | Set the search query programmatically |
| `getQuery()` | Get current query |
| `nextMatch()` | Navigate to next match |
| `prevMatch()` | Navigate to previous match |
| `getMatches()` | Get array of matching item indices |

### ARIA

- Search bar: `role="search"`, `aria-label="Search list"`
- Input: `aria-controls` pointing to the list root
- Match counter: `aria-live="polite"` for screen reader announcements
- Current match (navigate mode): `aria-current="true"` on the focused match element

### Plugin interactions

| Plugin | Interaction |
|--------|-------------|
| **selection** | Works — selection operates on filtered items in filter mode |
| **scrollbar** | Works — scrollbar adjusts to filtered content size |
| **scale** | Works — compression recalculates after filter |
| **grid** | Works — grid re-renders with filtered items |
| **table** | Works — Phase 2 adds column-aware search |
| **tree** | Works — delegates to `filterTree()` with ancestor preservation |
| **groups** | Works — filter mode preserves group structure (groups with no matches collapse) |
| **data** | Phase 2 — server-side search integration |
| **autosize** | Works — measurements apply to filtered items |
| **snapshots** | Works — search state is transient, not persisted in snapshots |
| **sortable** | Works — drag operates on filtered/visible items |

### Bundle size target

The search bar UI is lightweight DOM (input + counter + 3 buttons). Filtering is a single `.filter()` call. Target: **+2.0–2.5 KB**.

---

## Phase 2: Power Features

### Server-side search via `data()` plugin

When the `data()` plugin is active, the search plugin can delegate to a server-side search adapter:

```ts
const list = createVList({
  container: "#app",
  item: { height: 48, template: renderContact },
}, [
  data({
    adapter: {
      read: async ({ offset, limit }) => { /* pagination */ },
      search: async ({ query, offset, limit }) => {
        const res = await fetch(`/api/contacts/search?q=${query}&offset=${offset}&limit=${limit}`);
        return res.json(); // { items, total, hasMore }
      },
    },
  }),
  search(),
]);
```

**Flow:**
1. User types query
2. Search plugin debounces (configurable, default 300ms)
3. Calls data plugin's `search` adapter
4. Data plugin replaces items with search results
5. Subsequent scrolling pages through search results (not full dataset)
6. Clear restores the original paginated view

**Debounce strategy:**
- Client-side filter: no debounce — JS is fast enough for 100K+ items
- Server-side search: 300ms default, configurable via `debounce` config option
- First keystroke shows a loading indicator immediately

```ts
search({ debounce: 200 }) // server-side debounce in ms
```

### Column-aware search (table plugin)

When combined with the table plugin, search can target specific columns:

```ts
search({ columns: ["name", "email"] }) // only search these columns
search({ columns: true })              // search all visible columns (default for table)
```

The plugin reads column definitions from the table plugin to know which fields to search. Highlighted matches appear within the correct cell.

### Fuzzy matching

Optional fuzzy search for more forgiving queries:

```ts
search({ fuzzy: true })
```

Uses a lightweight built-in fuzzy scorer (no external dependency). Matches are ranked by score — best match first. Fuzzy mode works best in navigate mode (ranking is meaningless when filtering hides items).

**Implementation**: Simple character-by-character scoring — bonus for consecutive matches, word-start matches, and camelCase boundaries. Not a full fuzzy library (Fuse.js-level), but good enough for type-ahead discovery.

### Advanced query syntax

Optional structured queries for power users:

```ts
search({ syntax: true })
```

Supports field-prefixed search:

```
name:alice role:admin          // field-specific search
"exact phrase"                 // exact match
-archived                      // exclude term
```

This is opt-in. Default behavior is plain substring matching.

---

## Open Questions

1. **Filter mode + `data()` without search adapter** — if `data()` is active but no `search` adapter is defined, should filter mode work on the currently-loaded items only (with a "partial results" warning), or should it be disabled entirely?

   Recommendation: work on loaded items with a visual indicator ("Searching loaded items only"). The consumer can add a search adapter later for full coverage.

2. **Highlight implementation** — post-render innerHTML replacement with `<mark>` is simple but could break event listeners or complex DOM structures in templates. Should highlighting be opt-out, or should we only highlight when the template returns a string (not a DOM element)?

   Recommendation: highlight only string templates by default. For DOM element templates, expose `state.search` for manual highlighting. Add `highlight: false` to opt out entirely.

3. **Search + groups interaction** — in filter mode, should empty groups (all items filtered out) show the group header with a "no results" state, or be hidden entirely?

   Recommendation: hide empty groups entirely. The group header with no items is confusing. `groups` plugin should handle this via a "minimum items" check.

4. **Invisible mode type-ahead vs. tree type-ahead** — the tree plugin (RFC-007) has its own type-ahead for keyboard navigation. When both `search({ position: "none" })` and `tree()` are active, which type-ahead wins?

   Recommendation: tree type-ahead handles single-character jumps (ARIA pattern). Search type-ahead activates on Ctrl+F or after a configurable key sequence. They serve different purposes — tree type-ahead navigates, search filters/navigates with a persistent query.

5. **Should the search bar steal focus from the list?** — when the user opens the search bar, keyboard focus moves to the input. This breaks list keyboard navigation (arrow keys). How to handle?

   Recommendation: search bar captures focus while open. Enter or Escape returns focus to the list at the current/matched item. ArrowDown from the search input moves focus to the first match in the list. This matches the VS Code Ctrl+F pattern.

---

## Implementation Order

```
Phase 1a: Search bar DOM injection + input handling + CSS
Phase 1b: Client-side filter mode (setItems with filtered array)
Phase 1c: Navigate mode (match index, scrollToIndex, prev/next)
Phase 1d: Match highlighting (<mark> post-render pass)
Phase 1e: Keyboard (Ctrl+F, Escape, Enter, Shift+Enter, invisible mode)
Phase 1f: ARIA (role="search", aria-live counter, aria-current on match)
Phase 1g: Tree plugin integration (delegate to filterTree)
Phase 1h: Tests + docs + vlist-search.css

Phase 2a: data() plugin server-side search adapter
Phase 2b: Column-aware search (table plugin)
Phase 2c: Fuzzy matching
Phase 2d: Advanced query syntax
```

---

## Estimated Sizes

| Phase | Estimated gzip delta |
|-------|---------------------|
| Phase 1 | +2.0–2.5 KB |
| Phase 2 (server-side + column + fuzzy + syntax) | +1.5–2.0 KB |
| **Full search plugin** | **+3.5–4.5 KB** |

---

## Relationship to Issue #59

This RFC is a direct evolution of @AzzaAzza69's [incremental search proposal (#59)](https://github.com/floor/vlist/issues/59). The original request maps to this RFC as follows:

| #59 Feature | RFC-008 |
|-------------|---------|
| Typing starts incremental search | `position: "none"` invisible mode — typing while list is focused starts search |
| Subsequent keys append to search string | Standard search input behavior |
| Backspace removes last character | Standard input + invisible mode backspace handling |
| Esc/cursor/page keys cancel | Escape closes, arrow keys return to list nav |
| `cancelTimeout` auto-cancel | `cancelTimeout` config option (default: 0 = no auto-cancel) |
| `position: top/bottom/none` | `position` config option |
| `columnIndex` for table search | Phase 2 column-aware search via `columns` config |
| Search bar shows typed keys | Built-in search bar UI with input display |

The RFC adds: server-side search, match highlighting, navigate mode, match counter, tree integration, fuzzy matching, and ARIA accessibility — making the plugin production-ready across all vlist layouts.
