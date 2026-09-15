---
created: 2026-09-15
updated: 2026-09-15
status: published
---

# Scroll modes

vlist 2.7 has three ways to move a list. They differ in who owns the scroll position
and how large the content element gets. Pick by input device and list size; the
plugins and the public API are the same in all three.

| Mode | Owner of the position | Content element | Item count | Best for |
|---|---|---|---|---|
| `native` (default) | The browser viewport | Full virtual size | Up to the browser's ~16.7M px element limit | Wheel, keyboard, parent scroll handoff, find-in-page, native scrollbar |
| `bounded` | The browser viewport, rebased by vlist | A runway of 2× the viewport | Unbounded | Wheel and keyboard driven lists past the element limit |
| `synthetic` (opt-in, `vlist/synthetic`) | vlist, from pointer and wheel events | The viewport itself | Unbounded | Touch-heavy lists, any size; stays opt-in in 3.0 |

## Native

```ts
import { createVList } from "vlist";

const list = createVList({ container: "#app", items, item: { height: 48, template } });
```

The list is a normal scrolling element: rows are positioned inside a content element
sized to the full virtual height, and the browser scrolls it. Everything the browser
does with a scroller keeps working, including the native scrollbar, find-in-page and
handing momentum to a parent scroller at the edges. The limit is the element size the
browser will lay out, about 16.7 million pixels; past it, positions are clamped and
vlist warns once.

## Bounded

```ts
const list = createVList({
  container: "#app",
  items,
  item: { height: 48, template },
  scroll: { mode: "bounded" },
});
```

The content element is a runway twice the viewport high. The browser still scrolls
it, and when the scroll offset reaches a quarter or three quarters of the runway vlist
moves a logical origin and resets the offset to the middle, so any number of items fits
without coordinate compression ([RFC-012](/docs/rfcs/RFC-012-Logical-Scroll-Model)).
`scroll.runway` sets the multiple (default 2, minimum 1.5).

Known limitation: on touch devices a long native fling can outrun the runway and stall
at its edge. Measured on an iPhone SE (iOS 26.6.1) and a Pixel 8a (Android 17), flings
reached 145 to 226 percent of a 16× runway. Use synthetic mode for touch-heavy lists.
Bounded is deprecated for 3.0 and stays fully supported in 2.x, without runtime
warnings (see [Migration: v2 to v3](/docs/migration-v3)).

## Synthetic

```ts
import { createVList } from "vlist/synthetic";
import { scrollbar } from "vlist";
import "vlist/styles";

const list = createVList({
  container: "#app",
  items,
  item: { height: 48, template },
  scroll: { mode: "synthetic" },
}, [scrollbar()]);
```

vlist owns the position. The stage is the viewport itself with `overflow: clip`; pointer
events (`touch-action: pan-x pinch-zoom`) and wheel events feed a small motion model
with exponential-decay inertia, and rows are placed relative to the owned position.
There is no runway, no rebase and no element-size limit, and touch flings cannot stall
([RFC-014](/docs/rfcs/RFC-014-Scroll-Input-Model)).

What changes for you:

- **No native scrollbar.** Add `scrollbar()`; it applies platform defaults (thin
  overlay on macOS and Android, classic on Windows), reads `scrollbar-width` and
  `scrollbar-color` from the container, and is keyboard and screen-reader accessible.
- **Programmatic scrolls commit synchronously.** `scrollTo`, `scrollToIndex` and
  plugin corrections update `getScrollPosition()`, render and emit `scroll` in the
  call. Native mode behaves the same from 2.8.
- **Supported plugins in 2.7:** table, groups, snapshots, scrollbar, autosize,
  transition, selection, a11y, and from 2.8 `page()`. `carousel()` and `sortable()`
  throw with synthetic mode, as do horizontal lists on right-to-left pages. Vertical
  lists and tables on right-to-left pages are supported.
- **Cost:** the `vlist/synthetic` entry adds about 2.6 KB gzipped to the base; the
  default `vlist` entry is unchanged for everyone who does not opt in.

### Framework adapters (2.8)

The adapters go through `vlist/config`. From vlist 2.8 pass the synthetic factory as
`factory`; the driver is only bundled when you import it:

```tsx
import { useVList } from "vlist-react";
import { createVList } from "vlist/synthetic";

const { containerRef } = useVList({
  factory: createVList,
  scroll: { mode: "synthetic" },
  items,
  item: { height: 48, template: item => String(item.id) },
});
```

Requesting `scroll.mode: "synthetic"` without a factory throws at creation with the
import to add.

## Choosing

- Wheel and keyboard only, under the element limit: native.
- Wheel and keyboard only, any size: bounded in 2.x, synthetic from 3.0.
- Touch, any size: synthetic.
- Document scrolling with `page()`: native in 2.7; native or synthetic entry in 2.8,
  within the element limit.

Try all three side by side in the [large list example](/examples/large-list).
