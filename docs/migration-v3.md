---
created: 2026-09-15
updated: 2026-10-01
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

**Since 3.1** the choice of input is an option again, on the one `vlist` entry:
`scroll.mode` is `"auto"` (default), `"native"` or `"synthetic"`, and `"auto"` hands a
list past the browser's size limit to synthetic input by itself. Where this page says
`vlist/synthetic`, 3.1 code writes `scroll: { mode: "synthetic" }`, or leaves the
default. 3.1 also moves the framework adapters into the package. See
[3.1](#31-scrollmode-and-framework-entries) below and
[RFC-015](/docs/rfcs/RFC-015-Overflow-Handoff).

## Install

```sh
npm install vlist
```

`latest` is 3.1. The 2.x documentation stays available under [/docs/v2](/docs/v2/).

## What changes in 3.0

| 2.x | 3.0 | Notes |
|---|---|---|
| `scroll.mode: "native"` (default) | Remove the option | `vlist` is native by default. The option threw in 3.0.0; 3.1 accepts it again, with `"auto"` as the default. |
| `scroll.mode: "bounded"` | `import { createVList } from "vlist/synthetic"` | For lists taller than the browser's ~16.7M px element limit. The option throws. In 3.1, leave `scroll.mode` at its default, `"auto"`. |
| `scroll.mode: "synthetic"` from `vlist/synthetic` | Remove the option, keep the import | The entry selects synthetic input by itself. In 3.1, import from `vlist` and keep `scroll.mode: "synthetic"`. |
| `scroll.runway` | Remove the option | No runway exists. |
| `scale()` | Remove the plugin | Use `vlist/synthetic` for huge lists. |
| `PluginContext.setScrollFns(get, set)` | `ctx.setScrollSource({ write, onContentSize? })` | Sources commit positions through `ctx.commitScroll(px)`. |
| `PluginContext.disableDefaultScroll()` | Implied by `setScrollSource` | No separate call. |
| `ctx.setBoundedWrap(config)` | `ctx.setBoundedWrap(config, createHandler)` | Custom wrap providers pass their handler factory. Renamed `ctx.scroll.setWrap` in 3.1; the old name still works. |
| `scroll.scrollbar: "native"` or `"none"` | Unchanged on `vlist` | `"native"` is rejected with synthetic input, which has no browser scrollbar. In 3.1 a synthetic list draws its own; `"none"` skips it. |
| Framework adapters | Unchanged | Pass `factory: createVList` from `vlist/synthetic` to opt in, as since 2.8. In 3.1 they move into the package: see below. |

## 3.1: `scroll.mode` and framework entries

### `scroll.mode`

One entry again. The option chooses who owns input; the synthetic driver is a separate
file that a list downloads only when it needs it, so the `vlist` bundle stays small.

| 3.0.0 | 3.1 | Notes |
|---|---|---|
| `import { createVList } from "vlist"` | Unchanged | Now `"auto"`: native, and synthetic past 16,000,000 px of content, in place. |
| `import { createVList } from "vlist/synthetic"` | `import { createVList } from "vlist"` with `scroll: { mode: "synthetic" }` | The entry still works and is deprecated. It bundles the driver, so it is synthetic from the first frame. |
| Adapters: `factory: createVList` from `vlist/synthetic` | `scroll: { mode: "synthetic" }` | `vlist/config` passes `scroll` through. |
| `content:size:overflow` past the limit | Only with `scroll.mode: "native"` | `"auto"` handles the size instead of warning. |
| `ctx.scroll.setBoundedWrap` | `ctx.scroll.setWrap` | Deprecated alias kept through 3.x. |

A list that goes synthetic has no browser scrollbar, so it draws one: the same
scrollbar as `scrollbar()`, loaded with the synthetic driver. `scroll.scrollbar` options
configure it, `"none"` skips it, and a list with `scrollbar()` keeps that one. Each swap
emits `scroll:mode`. See
[Scroll modes](/docs/scroll-modes).

### Framework entries

The adapters are entries of the `vlist` package. The `vlist-vue`, `vlist-svelte`,
`vlist-solidjs` and `vlist-react` packages are deprecated: their 3.1 releases are built on
the entries and keep the config-based API while you migrate. The entries are feature-first,
like the vanilla builder, so a list bundles only the features it is given.

| 3.0 | 3.1 | Notes |
|---|---|---|
| `vlist-vue` | `vlist/vue` | `useVList(config, plugins)`, `useVListEvent`. |
| `vlist-svelte` | `vlist/svelte` | `use:vlist={{ config, plugins }}`, `onVListEvent`. The action no longer returns the list's methods: take the list from `onInstance`. |
| `vlist-solidjs` | `vlist/solid` | `createVList(() => config, plugins)`, `createVListEvent`. Alias it beside the core builder: `import { createVList as createSolidVList } from "vlist/solid"`. |
| `vlist-react` | `vlist/react` | `useVList(config, plugins)`, `useVListEvent`. |
| Feature fields (`selection: {…}`, `layout: "grid"`, `scrollbar: true`) | Plugins from `vlist` (`[selection({…}), grid({…}), scrollbar()]`) | Plugins are read at mount; `items` changes update the list. |
| `factory: createVList` from `vlist/synthetic` | `scroll: { mode: "synthetic" }` | |

See [Frameworks](/docs/adapters).

## Behaviour to check

- **Huge lists.** Native content cannot exceed the browser's element size limit. If you
  used bounded mode or `scale()`, switch that list to `vlist/synthetic`; the native entry
  emits an error when content passes the limit. In 3.1, the default `scroll.mode:
  "auto"` handles it with no change.
- **Synthetic lists and the scrollbar.** Synthetic input has no browser scrollbar. With
  `vlist/synthetic`, add `scrollbar()`; in 3.1 a `scroll.mode` list draws one by itself.
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
| 3.1 | `scroll.mode` returns as the input choice (`"auto"` default); `vlist/synthetic` is deprecated. The framework adapters become `vlist/vue`, `vlist/svelte`, `vlist/solid` and `vlist/react`; the vlist-* packages are deprecated. |
