---
created: 2026-09-23
updated: 2026-09-23
status: published
---

# Examples

The [examples](/examples/) are interactive pages for the vlist 3 behavior. Each page is a
small app: a list, a side panel, and the source that built it. The live pages are
[vlist.io/examples](https://vlist.io/examples/).

Library scroll modes are described in [Scroll modes](/docs/scroll-modes). This page is
how the example shell applies them.

## Catalog

### Essentials

| Example | What it shows |
|---|---|
| [Basic List](/examples/basic) | Item count, sizing, overscan, scroll-to, and data operations. Vanilla, React, Vue, Svelte, and Solid. |
| [Photo Album](/examples/photo-album) | Grid and masonry, with selection, groups, and snapshots. |
| [Messaging](/examples/messaging) | Reverse chat, date headers, and incoming messages. |
| [Contact List](/examples/contact-list) | A–Z groups, sticky or inline headers, and selection. |
| [Data Table](/examples/data-table) | Resizable columns, sortable headers, and row selection. |
| [Social Feed](/examples/social-feed) | Variable-height posts measured with `autosize()`. |
| [Carousel](/examples/carousel) | Infinite snap carousel. Scroll mode is locked. |
| [Plugin Wizard](/examples/plugin-wizard) | Carousel used as a plugin explorer. |
| [Window Scroll](/examples/window-scroll) | The document scrolls, not an inner list. Scroll mode is locked. |
| [Track List](/examples/track-list) | Lazy music library. List, grid, and table. Chooses the entry itself. |
| [Accessibility](/examples/accessibility) | Listbox roles and `aria-activedescendant`, updated live. |

### Specific

| Example | What it shows |
|---|---|
| [Velocity Loading](/examples/velocity-loading) | Async loading that skips fetches during a fast scroll. |
| [Code Explorer](/examples/code-explorer) | vlist's own source: tree, symbols, and search. |
| [Large Dataset](/examples/large-list) | 100K to 20M items. List, grid, and table. |
| [Variable Sizes](/examples/variable-sizes) | Per-item heights and auto-measured DOM sizes. |
| [Scroll Restore](/examples/scroll-restore) | Save and restore a scroll position across navigations. |
| [Scrollbar](/examples/scrollbar) | Native, custom, and none, with its own controls. |
| [Sortable](/examples/sortable) | Drag-and-drop reorder. |
| [Tree View](/examples/tree) | Expand, collapse, keyboard navigation, and type-ahead. |

### Other

| Example | What it shows |
|---|---|
| [File Browser](/examples/file-browser) | Finder-like table and grid. |
| [Phone pass](/examples/phone-pass) | Device checks for drag, momentum, and carousel wrap. Scroll mode is locked. |

## Scroll switch

Every example side panel starts with a **Scroll** control: Native or Synthetic. It is
injected by the example shell, not copied into each example.

The choice is remembered for the browser session in the cookie `vlist-scroll-mode`.
`?mode=native` or `?mode=synthetic` wins over the cookie. With neither, the page is
native.

Switching modes does not reload the page. The shell calls `rebuild()`
([Rebuild](/docs/utils/rebuild)): the new list is drawn hidden at the previous size,
then swapped in, and the scroll position comes back with it. While that hidden list is
being drawn it is pinned to the old list's width and height, so a layout plugin that
skips a zero-size container still paints the first frame.

An example that imports `createVList` from `"vlist"` gets this automatically. The
example bundler wraps that one export. Imports of `vlist/synthetic` or `vlist/native`
are left alone.

### Locked pages

A page with `data-scroll-mode="locked"` does not show the switch and stays native.
The list on that page is not a normal scroller:

- [Carousel](/examples/carousel) and [Phone pass](/examples/phone-pass) own their own motion.
- [Window Scroll](/examples/window-scroll) scrolls the document.

### Pages that choose the entry themselves

[Track List](/examples/track-list) creates its list with `vlist/synthetic` on vlist 3.
The shell switch does not rebuild it, because that call does not go through the wrapped
`createVList`.

[Large Dataset](/examples/large-list) reads the same cookie and `?mode=`. Choosing a
size above 100,000 items selects Synthetic and updates the switch. 100,000 rows of 48px
still fit in a native element; the next size does not. Native can be turned back on
after that. The list is created through its own factory, so the shell click stores the
mode and the list picks it up the next time that page creates a list.

## Scrollbar

Native mode shows the browser scrollbar. Synthetic mode has no browser bar, because the
viewport does not scroll.

- In Synthetic, the shell adds `scrollbar({ autoHide: false })` when the example did not pass one. An example that already passes `scrollbar()` keeps that instance.
- In Native, the shell removes a custom `scrollbar()` plugin so the browser bar is visible.
- [Scrollbar](/examples/scrollbar) is marked `data-scrollbar-owned`. The shell leaves its plugins alone, and its own Native / Custom / None control stays in charge.

## Recreating a list inside an example

Some controls rebuild the list with different plugins, for example the contact list
header (sticky, inline, off) and the gutter. Those examples do it themselves: they take
`getScrollSnapshot()`, destroy the list, and pass `snapshots({ restore })` into the next
`createVList`. The shell keeps that plugin, so the list returns to the same position.

A Native / Synthetic switch is different. `rebuild()` supplies its own snapshots plugin
for that swap, and the shell uses that one instead of the example's, so the position is
restored once.

## Building

From `vlist.io`:

```bash
bun run dev                 # build examples and benchmarks, then watch the server
bun run build:examples      # dist/examples only
bun examples/build.ts --force
```

Pages serve the bundles in `dist/examples`. The build cache is the example directory
plus the `vlist` dist hash. A change to `examples/build.ts` is not part of that hash, so
rebuild with `--force` after editing the wrapper. A library change needs `bun run build`
in `vlist` first, then a forced example build.

`?variant=` selects a framework directory when the example has one (`vanilla`, `react`,
`vue`, `svelte`, `solidjs`). The scroll wrapper applies to `createVList` imported from
`"vlist"`. React, Svelte, and Solid pages talk to their adapters (`vlist-react`,
`vlist-svelte`, `vlist-solidjs`) and are not wrapped.
