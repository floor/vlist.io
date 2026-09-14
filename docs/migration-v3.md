---
created: 2026-09-15
updated: 2026-09-15
status: draft
---

# Migration: v2 to v3

vlist 3.0 removes a scroll model rather than adding one. The synthetic input driver that
shipped as the opt-in `vlist/synthetic` entry in 2.7 becomes the only model in core:
the list owns its input, content is viewport-sized by construction, and the bounded
runway, `baseOffset` and coordinate compression disappear. Native viewport scrolling
stays available as an opt-in `vlist/native` entry. Nothing in this guide changes 2.x
behaviour; 2.8 announces the deprecations and 3.0 applies them.

The decision record lives in [RFC-014](/docs/rfcs/RFC-014-Scroll-Input-Model). The
3.0 default flip itself is conditional on consumer feedback from the 2.7 opt-in and on
the size gate (base at or below 9.9 KB gzipped with the driver included).

## Try it today

Every 3.0 behaviour is available in 2.7 behind the opt-in entry, so you can migrate
before 3.0 ships:

```ts
import { createVList } from "vlist/synthetic";
import { scrollbar, table } from "vlist";

const list = createVList({
  container: "#app",
  items,
  item: { height: 48, template: renderItem },
  scroll: { mode: "synthetic" },
}, [table({ columns }), scrollbar()]);
```

## What changes in 3.0

| 2.x | 3.0 | Notes |
|---|---|---|
| `scroll.mode: "native"` (default) | `import { createVList } from "vlist/native"` | Keep native scrolling for parent scroll handoff, find-in-page or a browser scrollbar. |
| `scroll.mode: "bounded"` | Remove the option | Synthetic input handles unbounded item counts without a runway. |
| `scroll.mode: "synthetic"` from `vlist/synthetic` | `import { createVList } from "vlist"` | The default; the option is accepted and ignored. |
| `scroll.runway` | Remove the option | No runway exists. |
| `scroll.scrollbar: "native"` | `vlist/native` | Synthetic core has no native main-axis scrollbar. Use `scrollbar()` for a visible bar. |
| `scroll.scrollbar: "none"` | Omit `scrollbar()` | Nothing to hide in synthetic core. |
| `scroll.scrollbar: { ... }` and omission (`vlist/config` and adapters) | Unchanged | Still maps to the `scrollbar()` plugin. |
| `scale()` | Remove the plugin | Already deprecated in 2.4; `vlist/config` stops installing its compatibility stub. |
| `PluginContext.setScrollFns(get, set)` | `ctx.setScrollSource({ write, onContentSize? })` | The getter was already unused; sources commit through `ctx.commitScroll(px)`. |
| `PluginContext.disableDefaultScroll()` | Implied by `setScrollSource` | No separate call. |
| `page()` with synthetic mode throws | Supported | The document is the external scroll source; content must fit the 16,777,216 px element limit (throws at creation when known, warns once later). |

## Behaviour to check

- **Programmatic scrolls are synchronous.** `scrollTo`, `scrollToIndex` and plugin
  corrections commit position, render and emit `scroll` in the call; the later DOM
  event is deduped. Code that waited a frame for `getScrollPosition()` to update can
  drop the wait.
- **No native scrollbar.** Add `scrollbar()` (it reads `scrollbar-width` and
  `scrollbar-color` from the container and applies platform defaults) or keep
  `vlist/native`.
- **Touch and wheel feel.** Inertia, boundary behaviour and axis locking are the
  driver's; the device results are in the RFC-014 decision record.
- **Framework adapters.** `useVList` and friends go through `vlist/config`; 2.8 adds a
  way to select the synthetic factory from there (see the adapters guide once it lands).

## Deprecation ladder

| Version | What happens |
|---|---|
| 2.7 | `vlist/synthetic` opt-in entry ships. |
| 2.8 | Deprecation notices (JSDoc and documentation) for the table above; the unsolicited `scale()` warning from `vlist/config` stops; no runtime warning for bounded mode. |
| 3.0 | Removals applied; `vlist/native` entry added; base bundle at or below 9.9 KB. |
