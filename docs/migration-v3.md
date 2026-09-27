---
created: 2026-09-15
updated: 2026-09-27
status: draft
---

# Migration: v2 to v3

vlist 3.0 removes the compression-era scroll options and keeps what 2.x users rely on.
Native scrolling stays the default. Synthetic input, the scroll driver that shipped as the
opt-in `vlist/synthetic` entry in 2.7, stays opt-in and becomes the way to handle lists
too large for the browser. Bounded mode, `scroll.mode`, `scroll.runway` and `scale()` are
removed.

The decision record lives in [RFC-014](/docs/rfcs/RFC-014-Scroll-Input-Model). The
3.0.0-next.1 prerelease tried synthetic input as the default; from 3.0.0-next.2 the
default is native again.

**Since 3.0.x** the choice of input is an option again, on the one `vlist` entry:
`scroll.mode` is `"auto"` (default), `"native"` or `"synthetic"`, and `"auto"` hands a
list past the browser's size limit to synthetic input by itself. Where this page says
`vlist/synthetic`, 3.0.x code writes `scroll: { mode: "synthetic" }`, or leaves the
default. See [3.0.x: `scroll.mode`](#30x-scrollmode) below and
[RFC-015](/docs/rfcs/RFC-015-Overflow-Handoff).

## Try the prerelease

```sh
npm install vlist@next
```

`latest` stays on 2.8 until 3.0 ships. The 2.x documentation stays available under
[/docs/v2](/docs/v2/).

## What changes in 3.0

| 2.x | 3.0 | Notes |
|---|---|---|
| `scroll.mode: "native"` (default) | Remove the option | `vlist` is native by default. The option threw in 3.0.0; 3.0.x accepts it again, with `"auto"` as the default. |
| `scroll.mode: "bounded"` | `import { createVList } from "vlist/synthetic"` | For lists taller than the browser's ~16.7M px element limit. The option throws. In 3.0.x, leave `scroll.mode` at its default, `"auto"`. |
| `scroll.mode: "synthetic"` from `vlist/synthetic` | Remove the option, keep the import | The entry selects synthetic input by itself. In 3.0.x, import from `vlist` and keep `scroll.mode: "synthetic"`. |
| `scroll.runway` | Remove the option | No runway exists. |
| `scale()` | Remove the plugin | Use `vlist/synthetic` for huge lists. |
| `PluginContext.setScrollFns(get, set)` | `ctx.setScrollSource({ write, onContentSize? })` | Sources commit positions through `ctx.commitScroll(px)`. |
| `PluginContext.disableDefaultScroll()` | Implied by `setScrollSource` | No separate call. |
| `ctx.setBoundedWrap(config)` | `ctx.setBoundedWrap(config, createHandler)` | Custom wrap providers pass their handler factory. Renamed `ctx.scroll.setWrap` in 3.0.x; the old name still works. |
| `scroll.scrollbar: "native"` or `"none"` | Unchanged on `vlist` | Rejected by `vlist/synthetic`, which has no native scrollbar; add `scrollbar()` there. |
| Framework adapters | Unchanged | Pass `factory: createVList` from `vlist/synthetic` to opt in, as since 2.8. |

## 3.0.x: `scroll.mode`

One entry again. The option chooses who owns input; the synthetic driver is a separate
file that a list downloads only when it needs it, so the `vlist` bundle stays small.

| 3.0.0 | 3.0.x | Notes |
|---|---|---|
| `import { createVList } from "vlist"` | Unchanged | Now `"auto"`: native, and synthetic past 16,000,000 px of content, in place. |
| `import { createVList } from "vlist/synthetic"` | `import { createVList } from "vlist"` with `scroll: { mode: "synthetic" }` | The entry still works and is deprecated. It bundles the driver, so it is synthetic from the first frame. |
| Adapters: `factory: createVList` from `vlist/synthetic` | `scroll: { mode: "synthetic" }` | `vlist/config` passes `scroll` through. |
| `content:size:overflow` past the limit | Only with `scroll.mode: "native"` | `"auto"` handles the size instead of warning. |
| `ctx.scroll.setBoundedWrap` | `ctx.scroll.setWrap` | Deprecated alias kept through 3.x. |

A list that goes synthetic has no native scrollbar: lists that can grow past the limit
should carry `scrollbar()`. Each swap emits `scroll:mode`. See
[Scroll modes](/docs/scroll-modes).

## Behaviour to check

- **Huge lists.** Native content cannot exceed the browser's element size limit. If you
  used bounded mode or `scale()`, switch that list to `vlist/synthetic`; the native entry
  emits an error when content passes the limit. In 3.0.x, the default `scroll.mode:
  "auto"` handles it with no change.
- **Synthetic lists need a scrollbar plugin.** Synthetic input has no browser scrollbar;
  add `scrollbar()`.
- **Horizontal right-to-left lists are not supported** by either entry: both throw at
  creation. Vertical right-to-left lists and tables work in both. Carousel and sortable work
  with both entries; sortable uses a long press on touch unless a `handle` is set.
- **Programmatic scrolls are synchronous** in both entries: `scrollTo`, `scrollToIndex`
  and plugin corrections update `getScrollPosition()` and emit `scroll` in the call.
- **3.0.0-next.1 users:** `vlist/native` remains as a deprecated alias of `vlist`.

## Deprecation ladder

| Version | What happens |
|---|---|
| 2.7 | `vlist/synthetic` opt-in entry ships. |
| 2.8 | Deprecation notices for `scroll.mode`, `scroll.runway`, `scale()` and the old plugin hooks. |
| 3.0 | Those are removed; native stays the default; synthetic input stays opt-in. |
| 3.0.x | `scroll.mode` returns as the input choice (`"auto"` default); `vlist/synthetic` is deprecated. |
