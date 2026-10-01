---
created: 2026-09-15
updated: 2026-09-27
status: published
---

# Scroll modes

A vlist list moves in one of two ways. They differ in who owns the scroll position and
how large the content element gets. `scroll.mode` chooses between them, and its default
chooses for you. Plugins and the public API are the same either way.

| Input | Owner of the position | Content element | List size | Best for |
|---|---|---|---|---|
| Native | The browser viewport | Full virtual size | Up to the browser's element size limit, about 16 million px | Native scrollbar, native touch momentum, parent scroll handoff, find-in-page |
| Synthetic | vlist, from pointer, wheel and keyboard events | The viewport itself | Unbounded | Huge lists and application-owned touch motion |

```ts
import { createVList } from "vlist";

const list = createVList({
  container: "#app",
  items,
  item: { height: 48, template },
  scroll: { mode: "auto" }, // the default: "auto" | "native" | "synthetic"
});
```

| `scroll.mode` | Input |
|---|---|
| `"auto"` (default) | Native. Past 16,000,000 px of content the list hands its input to the synthetic handler in place, and takes native input back below 12,000,000 px |
| `"native"` | Always native. Past the limit the last rows are out of reach, and the list says so |
| `"synthetic"` | Synthetic from the start |

The synthetic driver is not in the `vlist` bundle. It is a separate file,
`synthetic-driver.js` (about 3.4 KB gzipped), downloaded the first time a list needs it.
A list that stays native never downloads it; until it arrives, a list scrolls natively.

Bounded mode, `scroll.runway` and `scale()` were removed in 3.0 and are still refused.
`scroll.mode` came back in 3.0.x as this choice of input
([RFC-015](/docs/rfcs/RFC-015-Overflow-Handoff)). See
[Migration: v2 to v3](/docs/migration-v3), or the [2.x scroll modes page](/docs/v2/scroll-modes).

## Native

The list is a normal scrolling element: rows sit inside a content element sized to the
full virtual height, and the browser scrolls it. Everything the browser does with a
scroller keeps working, including the native scrollbar, find-in-page and handing momentum
to a parent scroller at the edges. `scroll.scrollbar: "none"` hides the browser scrollbar,
and `scrollbar()` replaces it with a custom one.

The limit is the element size the browser will lay out (Chrome stops at 33,554,428 px).
vlist treats 16,000,000 px of content as the limit. With `scroll.mode: "native"`, a list
that grows past it emits an `error` event once, with the context `content:size:overflow`,
and the rows past the browser's cap cannot be reached.

## Synthetic

```ts
import { createVList, scrollbar } from "vlist";
import "vlist/styles";

const list = createVList({
  container: "#app",
  items,
  item: { height: 48, template },
  scroll: { mode: "synthetic" },
}, [scrollbar()]);
```

vlist owns the position. The viewport clips its content, pointer events (`touch-action:
pan-x pinch-zoom` on vertical lists), wheel and keyboard events feed a small motion model
with exponential-decay inertia, and rows are placed relative to the owned position. There
is no element-size limit ([RFC-014](/docs/rfcs/RFC-014-Scroll-Input-Model)).

What changes for you:

- **Its own scrollbar.** The browser draws none for synthetic content, so the list
  draws one: the `scrollbar()` plugin's, downloaded with the synthetic driver and
  mounted when the list goes synthetic (removed if it goes back to native). It applies
  platform defaults (thin overlay on macOS and Android, classic on Windows), reads
  `scrollbar-width` and `scrollbar-color` from the container, and is keyboard and
  screen-reader accessible. `scroll.scrollbar` options configure it, `"none"` skips it,
  and a list with `scrollbar()` keeps that one. `"native"` asks for the browser's
  scrollbar, so `mode: "synthetic"` rejects it.
- **Programmatic scrolls commit synchronously.** `scrollTo`, `scrollToIndex` and
  plugin corrections update `getScrollPosition()`, render and emit `scroll` in the
  call, as with native input.
- **Plugins:** every plugin works with synthetic input, including `sortable()`.
  `page()` scrolls the document, so `scroll.mode` does not apply to it. `carousel()`
  runs its own loop on its runway with `"auto"` and `"native"`, and on the synthetic
  handler with `"synthetic"`. Horizontal lists on right-to-left pages throw at creation in
  every mode; vertical lists and tables on right-to-left pages are supported. Plugin
  conflicts are unchanged.
- **Boundaries:** same-axis touch stops at the list's edges without handing off to the
  parent page. Use `mode: "native"` when boundary gestures must scroll the page.
- **First frames:** with `mode: "synthetic"` the driver is downloaded when the list is
  created, so a wheel or touch in the first moments is still native. The deprecated
  `vlist/synthetic` entry bundles the driver instead, for lists that must be synthetic
  from their first frame; it adds {{size:synthetic:delta}} KB gzipped to the base.

## Auto

`"auto"` is the default because it needs no decision: a list scrolls natively for as long
as the browser can lay it out, and only a list that grows past the limit changes input.

- **In place.** The list, its DOM, its plugins, the selection, focus and the scroll
  position stay. Only who owns input and the size of the content element change.
- **Never mid-gesture.** A swap waits until the list is idle, so a fling or a smooth
  scroll is never cut off. Until then the browser clamps the list, which vlist renders
  correctly.
- **Jumps land.** A `scrollToIndex` the browser could not apply while a swap was
  pending, such as the last row right after `setItems`, lands where it was asked once
  the list is synthetic.
- **Both ways.** A list that shrinks below 12,000,000 px takes native input back, on
  the same row. The gap between the two thresholds keeps a list that hovers around the
  limit, a filter toggled on and off, from swapping on every change.
- **Observable.** Each swap emits `scroll:mode` with `{ mode: "native" | "synthetic" }`.
- **Scrollbar.** Past the limit the list has no native scrollbar. Lists that can grow
  that large should carry `scrollbar()`, which looks the same in both modes.

```ts
list.on("scroll:mode", ({ mode }) => console.log(`input is ${mode} now`));
```

### Framework entries

The framework entries (`vlist/vue`, `vlist/svelte`, `vlist/solid`, `vlist/react`) pass
`scroll` to the core. Set the mode like any other option. It takes effect at mount:

```tsx
import { useVList } from "vlist/react";

const { containerRef } = useVList({
  items,
  item: { height: 48, template: item => String(item.id) },
  scroll: { mode: "synthetic" },
});
```

## Measured on 3.0.0-next.3

Vanilla lists, three runs each, median reported. The window was on a MacBook built-in display running at 120 Hz. Browsers: Chrome 153, Chromium 130, Firefox 156, Safari 26.4.

These runs used the `vlist` and `vlist/synthetic` entries of that release; the engines
are the ones `scroll.mode` selects today. Inside one browser, native and synthetic match. The gap between browsers is the frame rate that browser delivered, not a difference between the two entries. Dropped frames were 0% and position lag was 0 px on every scroll that completed.

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

- Most lists: leave the default, `"auto"`. Native while the browser can lay the list
  out, synthetic past that, with nothing to configure.
- When native behaviour must hold whatever the size (parent scroll handoff,
  find-in-page), and you accept the limit: `"native"`.
- Touch-heavy lists that should move the same way on every platform: `"synthetic"`.
- Document scrolling with `page()`: native, within the element limit.

Try the modes in the [large list example](/examples/large-list).
