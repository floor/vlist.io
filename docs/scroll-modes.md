---
created: 2026-09-15
updated: 2026-09-23
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
  `page()`. Horizontal lists on right-to-left pages throw at creation — in this entry and in
  `vlist`; vertical lists and tables on right-to-left pages are supported in both.
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

## Measured on 3.0.0-next.3

Vanilla lists, three runs each, median reported. The window was on a MacBook built-in display running at 120 Hz. Browsers: Chrome 153, Chromium 130, Firefox 156, Safari 26.4.

Inside one browser, native and synthetic match. The gap between browsers is the frame rate that browser delivered, not a difference between the two entries. Dropped frames were 0% and position lag was 0 px on every scroll that completed.

### Initial render

Median time to create the list, in milliseconds.

| Items | Mode | Chrome | Chromium | Firefox | Safari |
|:---:|:---|:---:|:---:|:---:|:---:|
| 10K | Native | 0.6 ms | 0.9 ms | 1 ms | 2 ms |
| 10K | Synthetic | 0.6 ms | 0.7 ms | 1 ms | 2 ms |
| 100K | Native | 0.6 ms | 0.8 ms | 2 ms | 2 ms |
| 100K | Synthetic | 0.6 ms | 0.8 ms | 2 ms | 2 ms |
| 1M | Native | 1.5 ms | 3.7 ms | 10 ms | 5 ms |
| 1M | Synthetic | 1.4 ms | 3.8 ms | 12 ms | 5 ms |

### Scroll

The scroll test moves about 36,000 px. It does not walk the whole list, so a native 1M run is not a test of the element-size clamp.

| Items | Mode | Chrome | Chromium | Firefox | Safari |
|:---:|:---|:---:|:---:|:---:|:---:|
| 10K | Native | 120 fps | 120 fps | 30 fps | 60 fps |
| 10K | Synthetic | 120 fps | 120 fps | 30 fps | 60 fps |
| 100K | Native | 120 fps | 120 fps | 30 fps | 60 fps |
| 100K | Synthetic | 120 fps | 120 fps | 30 fps | 60 fps |
| 1M | Native | 120 fps | 120 fps | — | 60 fps |
| 1M | Synthetic | 120 fps | 120 fps | 30 fps | 60 fps |

Frame time at p95 follows that rate: about 9.2 ms in Chrome and Chromium, 18 ms in Safari, 34 ms in Firefox. Native and synthetic stay on the same figure.

Firefox, native, 1M did not scroll. The benchmark reported that the scroll driver did not move the list, on three attempts. Synthetic at 1M did scroll.

### Scroll to an index

Median time for a `scrollTo`, in milliseconds. The time depends on the browser and does not depend on the entry or the list length.

| Items | Mode | Chrome | Chromium | Firefox | Safari |
|:---:|:---|:---:|:---:|:---:|:---:|
| 10K | Native | 41 ms | 41 ms | 166 ms | 81 ms |
| 10K | Synthetic | 41 ms | 41 ms | 166 ms | 81 ms |
| 100K | Native | 42 ms | 41 ms | 166 ms | 81 ms |
| 100K | Synthetic | 41 ms | 41 ms | 166 ms | 82 ms |
| 1M | Native | 42 ms | 41 ms | 167 ms | 80 ms |
| 1M | Synthetic | 41 ms | 41 ms | 166 ms | 82 ms |

### Memory

`performance.memory` exists in Chrome and Chromium only. Firefox and Safari saved a Memory row with status 0 and no heap numbers. Those rows are not a measurement.

Heap allocated by creating the list, in MB. Native and synthetic match. The resident heap is noisier, because a later GC moves it, so it is a poor comparison.

| Items | Mode | Chrome | Chromium |
|:---:|:---|:---:|:---:|
| 10K | Native | 0.07 MB | 0.11 MB |
| 10K | Synthetic | 0.08 MB | 0.13 MB |
| 100K | Native | 0.41 MB | 0.45 MB |
| 100K | Synthetic | 0.43 MB | 0.46 MB |
| 1M | Native | 3.85 MB | 3.88 MB |
| 1M | Synthetic | 3.86 MB | 3.88 MB |

## Choosing

- Lists within the browser's element size limit, or when native scrolling behaviour
  matters: `vlist`.
- Lists past the limit: `vlist/synthetic`.
- Touch-heavy lists that should move the same way on every platform: `vlist/synthetic`.
- Document scrolling with `page()`: either entry, within the element limit.

Try both in the [large list example](/examples/large-list).
