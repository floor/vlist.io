---
created: 2026-09-27
updated: 2026-09-27
status: draft
---

# RFC-015: Overflow Handoff

**Status:** Draft — implemented in [vlist#319](https://github.com/floor/vlist/pull/319), not merged  
**Author:** floor  
**Type:** Core Architecture  
**Created:** 2026-09-27  
**Target:** vlist 3.0.x (additive; `vlist/synthetic` keeps working)  
**Amends:** [RFC-014: Scroll Input Model](RFC-014-Scroll-Input-Model.md) — one entry again, with `scroll.mode` as the input choice  
**Issue:** FLO-247  

---

## Summary

A list created with `vlist` scrolls natively. Its content element is as tall as
its items, and browsers cap element size: Chrome stops at 33,554,428 px. Past
that, the rows beyond the cap cannot be reached. `vlist/synthetic` has no cap,
because its content element is only as large as the viewport, but the choice has
to be made when the list is created, by picking an entry. An application whose
data grows at runtime (a feed, a log, a search that returns more than expected)
cannot know in advance which one it needs.

This RFC makes the choice an option of the one `vlist` entry, and gives it a
default that needs no choice at all:

```ts
import { createVList } from "vlist";

createVList({ container, items, item, scroll: { mode: "auto" } }); // the default
```

| `scroll.mode` | Input |
|---|---|
| `"auto"` (default) | Native. Past 16,000,000 px of content the list hands its input to the synthetic handler **in place**, and takes it back below 12,000,000 px |
| `"native"` | Always native. Past the limit the last rows are out of reach, and `content:size:overflow` says so |
| `"synthetic"` | vlist owns wheel, touch and keys from the start |

The synthetic driver is a separate file, loaded the first time a list needs it.
A list that stays native never downloads it.

## Background

**FLO-247.** A smooth jump past the cap used to leave a native list blank. The
3.0.1 fix commits what the browser applied, so the list stays coherent: it lands
on the last row the browser can show (row 838,851 of a million 40 px rows in
Chrome). The rows after it are still unreachable. This RFC makes them reachable
without the application doing anything.

**RFC-014.** 3.0 removed `scroll.mode` and made synthetic input the separate
`vlist/synthetic` entry (decision of 2026-09-15), so that native users would not
bundle the driver. Loading the driver on demand keeps that property. What an
entry cannot do is change its mind at runtime, and that is what a growing list
needs. So the option comes back, as the choice of input. Bounded mode and
`scroll.runway`, removed with it, stay removed; the code no longer uses the word (vlist#320).

## Design

### A lazy driver

The native entry passes the core a loader,
`() => import("../synthetic/handler")`. In the build that import stays lazy and
points at `dist/synthetic-driver.js`, a self-contained file built on its own.

Letting the bundler split the code was tried first. It moved the constants and
helpers the driver shares with the core into a common chunk, and the base paid
446 B gzipped for no longer inlining them. `scripts/lazy-driver.ts` keeps the
import external instead, in the build, the size gate and the runway gate. The
build checks that `index.js` imports the driver lazily and does not contain it.

The loaded factory is cached per page: after the first list, a handoff is
synchronous.

### Why in place, and not a rebuild

Destroying the list and creating a synthetic one would also work, but it would
lose everything the list holds: rendered elements, focus, selection, listeners
the application registered, plugin state, the references a framework adapter
holds. The core already separates what changes from what does not:

- `createCore` picks one handler, native or logical (`LogicalScrollHandler`), in one place. Both
  implement `ScrollHandler`.
- Writes go through the current handler and `scrollSetFn`. Plugins read and write
  through `ctx.scroll`, never through `scrollTop` on the main axis; the only
  direct reads are `table`'s, on the cross axis.
- `state.scrollPosition` is the logical position in both modes (RFC-012 G4), so
  events and `getScrollPosition()` report the same number before and after.

The handoff swaps the handler and re-points the writer. Nothing else moves.

### When the swap happens

The core checks on every content size change. When the mode asks for a change
of input:

1. **The driver is not loaded yet.** Load it; the check runs again when it
   arrives. Meanwhile the list scrolls natively.
2. **A scroll is in flight**: a native fling, a smooth scroll, a scrollbar drag,
   or a jump (a `scrollToIndex` keeps the list scrolling until the idle
   timeout). The swap waits for idle.
3. **Otherwise**, swap now.

While a swap waits, the content element keeps its native size and the browser
clamps it. That is the state the 3.0.1 fix made safe: every frame renders what the
browser shows. A fling is never cut off.

**A jump the browser clamped.** `setItems(aMillionRows)` followed at once by
`scrollToIndex(last)` writes a position the browser cannot apply yet: the driver
is still loading. The core remembers that a write was clamped while a swap was
coming, and the swap lands on the position that was asked for. Any later scroll
frame, such as the user scrolling back, forgets it.

### The swap

Native → synthetic:

1. Read the logical position, or the clamped jump's target.
2. Detach the native handler; reset the native `scrollTop` to 0.
3. Create the synthetic handler with the config the synthetic entry passes, and
   `refresh(totalSize)`: the content element takes the viewport's size.
4. Attach, and `setLogical(position)`, which renders. During creation (a list
   created past the limit, with the driver already cached) only the refresh
   runs: the core renders and attaches next.
5. Emit `scroll:mode` with `{ mode: "synthetic" }`.

Synthetic → native runs the other way: detach, restore the native handler the
list was built with, `baseOffset` back to 0, write the full content size, set
`scrollTop` to the position (clamped to the new end), commit what the browser
applied, emit `{ mode: "native" }`.

The gap between 12,000,000 and 16,000,000 px keeps a list that hovers around the
limit (a filter toggled on and off) from swapping on every change.

### What the user sees change

A handoff is a change of input model. `"auto"` makes it automatic; it cannot make
it invisible, and the documentation says so:

- **The scrollbar.** Synthetic content is the size of its viewport, so there is
  no native scrollbar: the list draws one when it goes synthetic, and removes it
  if it goes back. A list with `scrollbar()` keeps that one in both modes.
- **Touch inertia** is vlist's own (RFC-014 motion model) instead of the
  platform's, on lists past the limit only.
- **Keys and wheel** are handled by vlist, as in synthetic mode. Scroll events,
  `getScrollPosition()`, `scrollToIndex` and snapshots report the same values.

### Where input is fixed

- **`page()`** scrolls the document; there is no content element to hand over.
  The mode does not apply, and page's own size warning stands.
- **`carousel()`** owns its input already (its wrap runway). The mode does not apply.
- **`vlist/synthetic`**, deprecated, is synthetic whatever the mode.

`scroll.scrollbar` strings style the native scrollbar; with `mode: "synthetic"`
they throw, as they do with the synthetic entry.

## Alternatives considered

- **The opt-in `overflow()` plugin** ([vlist#318](https://github.com/floor/vlist/pull/318)).
  Cheaper (+77 B), but an application has to know to import it. Rejected on
  review: past the limit, a list should keep working without anyone knowing
  there is a limit.
- **Bundling the driver in `vlist`.** Every user would pay about 2.6 KB gzipped,
  whatever the mode: a string in the config cannot be tree-shaken.
- **Bundler code splitting.** Tried; +446 B on the base (see *A lazy driver*).
- **Rebuilding the list.** Rejected above.
- **Compressing the coordinate space (the 2.x `scale()` plugin).** Removed in 3.0:
  the compression ratio leaked into offsets and hit-testing.

## Cost

`bun run size`, gzipped:

| | `next` | This RFC |
|---|---|---|
| `vlist` base (`createVList`) | 10,213 B | 10,531 B (+318 B, of which 17 B for the drawn scrollbar) |
| `dist/synthetic-driver.js` (driver and scrollbar), loaded on demand | — | 6,381 B |

A trim pass took the first version's +405 B down to +301 B: 56 B of it from folding five copies of a validation check into one. The base's 10.0 kB budget is a promise, and every other budget sits within
0.4 KB of its measurement, so all of them go red. See the fifth open question.

## Open questions

1. **Scrollbar without `scrollbar()`.** Decided 2026-09-27
   ([vlist#322](https://github.com/floor/vlist/pull/322)): a synthetic list draws the
   `scrollbar()` plugin's bar by default, shipped in the lazy driver.
   `scroll.scrollbar` options configure it, `"none"` skips it, and a list with
   `scrollbar()` keeps that one.
2. **Adapters.** A `scrollMode` prop on the React, Vue, Svelte and Solid
   components, passed through as `scroll.mode`. Recommendation: yes, in the same
   3.0.x.
3. **Threshold per browser.** Firefox caps element size lower than Chrome
   (around 17.9M px, to be measured). One conservative default below every
   engine's cap is simpler than detection. Recommendation: keep 16,000,000 px,
   measure Firefox and Safari before release.
4. **Semver.** A new option is a feature, and features normally ship in a minor
   release. It is additive, the default only changes lists that are broken today,
   and no 3.1 is planned. It ships in a 3.0.x patch, listed under *Added*.
5. **Budgets.** Raise the base to 10.3 kB, and every scenario by 0.3 kB.

## Gates

| Gate | Evidence |
|---|---|
| Unit | `test/core/scroll-mode.test.ts`: swap up and down; hysteresis; waiting for idle; the clamped jump, and a later scroll winning over it; position and selection kept; `scroll:mode`; `"native"` warns and never swaps; `"synthetic"` from the start; invalid and removed modes refused; `page()`, `carousel()` and the synthetic entry unaffected |
| Browser | `scripts/scroll-mode-browser.mjs` in Chrome: a million 40 px rows. With `"native"` the last row is out of reach (the control). With `"auto"` the driver loads, the last row shows, the wheel moves the list, and shrinking hands back on the same row. Firefox and Safari, keys and the scrollbar still to add |
| Device | iPhone and an Android phone: touch scroll before and after the swap |
| Build | `index.js` loads the driver lazily and does not contain it; `synthetic-driver.js` does |
| Size | Base and scenarios measured without the lazy driver |
