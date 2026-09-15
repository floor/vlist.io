---
created: 2026-09-15
updated: 2026-09-16
status: published
---

# Scroll modes

vlist 3.0 has two ways to move a list, chosen by the entry you import. They differ in who
owns the scroll position and how large the content element gets. Plugins and the public
API are the same with both.

| Entry | Owner of the position | Content element | List size | Best for |
|---|---|---|---|---|
| `vlist` (default) | The browser viewport | Full virtual size | Up to the browser's element size limit, about 16 million px | Native scrollbar, native touch momentum, parent scroll handoff, find-in-page |
| `vlist/synthetic` (opt-in) | vlist, from pointer, wheel and keyboard events | The viewport itself | Unbounded | Huge lists and application-owned touch motion |

Bounded mode, `scroll.mode`, `scroll.runway` and `scale()` were removed in 3.0. See
[Migration: v2 to v3](/docs/migration-v3), or the [2.x scroll modes page](/docs/v2/scroll-modes).

## Native

```ts
import { createVList } from "vlist";

const list = createVList({ container: "#app", items, item: { height: 48, template } });
```

The list is a normal scrolling element: rows sit inside a content element sized to the
full virtual height, and the browser scrolls it. Everything the browser does with a
scroller keeps working, including the native scrollbar, find-in-page and handing momentum
to a parent scroller at the edges. `scroll.scrollbar: "none"` hides the browser scrollbar,
and `scrollbar()` replaces it with a custom one.

The limit is the element size the browser will lay out. When content grows past
16,000,000 px, the list emits an `error` event once, with the context
`content:size:overflow`, pointing to `vlist/synthetic`.

## Synthetic

```ts
import { createVList } from "vlist/synthetic";
import { scrollbar } from "vlist";
import "vlist/styles";

const list = createVList({
  container: "#app",
  items,
  item: { height: 48, template },
}, [scrollbar()]);
```

Importing the factory selects synthetic input; there is no option to set. vlist owns the
position. The viewport clips its content, pointer events (`touch-action: pan-x pinch-zoom`
on vertical lists), wheel and keyboard events feed a small motion model with
exponential-decay inertia, and rows are placed relative to the owned position. There is no
element-size limit ([RFC-014](/docs/rfcs/RFC-014-Scroll-Input-Model)).

What changes for you:

- **No native scrollbar.** Add `scrollbar()`; it applies platform defaults (thin
  overlay on macOS and Android, classic on Windows), reads `scrollbar-width` and
  `scrollbar-color` from the container, and is keyboard and screen-reader accessible.
  The entry rejects the `"native"` and `"none"` scrollbar strings.
- **Programmatic scrolls commit synchronously.** `scrollTo`, `scrollToIndex` and
  plugin corrections update `getScrollPosition()`, render and emit `scroll` in the
  call, as with the native entry.
- **Plugins:** every plugin works with this entry, including `carousel()`, `sortable()` and
  `page()`. Horizontal lists on right-to-left pages throw and point to `vlist`; vertical
  lists and tables on right-to-left pages are supported.
  `page()` keeps native document scrolling with either entry. Plugin conflicts are
  unchanged.
- **Boundaries:** same-axis touch stops at the list's edges without handing off to the
  parent page. Use `vlist` when boundary gestures must scroll the page.
- **Cost:** the `vlist/synthetic` entry adds {{size:synthetic:delta}} KB gzipped to the
  base; the default `vlist` entry does not include the driver.

### Framework adapters

The adapters go through `vlist/config`. Pass the synthetic factory as `factory`; the
driver is only bundled when you import it:

```tsx
import { useVList } from "vlist-react";
import { createVList } from "vlist/synthetic";

const { containerRef } = useVList({
  factory: createVList,
  items,
  item: { height: 48, template: item => String(item.id) },
});
```

## Choosing

- Lists within the browser's element size limit, or when native scrolling behaviour
  matters: `vlist`.
- Lists past the limit: `vlist/synthetic`.
- Touch-heavy lists that should move the same way on every platform: `vlist/synthetic`.
- Document scrolling with `page()`: either entry, within the element limit.

Try both in the [large list example](/examples/large-list).
