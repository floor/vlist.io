---
created: 2026-06-06
updated: 2026-06-06
status: spec-locked
---

# RFC-011: Carousel Plugin

**Status:** Spec locked ([discussion #105](https://github.com/floor/vlist/discussions/105))  
**Author:** floor  
**Type:** Plugin / Feature  
**Created:** 2026-06-06  

---

## Summary

Add a `carousel()` plugin that provides true infinite-loop scrolling for carousel and wizard UIs. Instead of the current `scroll.wrap` behavior (which scrolls backward through the entire list to wrap around), the carousel plugin scrolls **forward** seamlessly — item N is followed by item 0 as if the list were circular.

```ts
const list = createVList({
  container: "#app",
  items: slides,
  item: { height: 400, template: renderSlide },
}, [carousel()]);
```

---

## Motivation

The current `scroll.wrap` config in the core handles index wrapping in `scrollToIndex`, but the scroll animation rewinds through all items to reach the other end. For a 16-item wizard, pressing "next" on the last card scrolls backward past 15 cards to reach card 0. This feels broken for carousel UIs where the user expects continuous forward motion.

Real-world carousel patterns (image galleries, onboarding wizards, plugin explorers, testimonial sliders) all require the illusion of an infinite loop — the content wraps but the scroll always moves in the user's direction.

---

## Design

### Implementation model

Use a **finite virtual scroll window with silent rebasing**, not a literally unbounded native scroll position.

- `lapSize = sum(real item sizes)`.
- Virtual slots map to logical items with modulo.
- Start in the middle cycle at `initialIndex`.
- Content size is `lapSize * cycles`, where `cycles` is internal and capped below the browser virtual-size limit.
- When the native/virtual position approaches either edge, jump to the equivalent position in the middle cycle while preserving logical index and fractional offset.
- Empty lists render nothing and all methods no-op.
- Single-item lists render one item; `next`, `prev`, and snap no-op.

This gives the infinite-loop illusion without exposing inflated counts or risking browser scroll limits.

### Plugin responsibilities

| Responsibility | Approach |
|---------------|----------|
| **Virtual scroll window** | Finite multi-cycle content size with silent rebasing at edges |
| **Index modulo** | Override `getItemFn` to wrap indices: `items[index % total]` |
| **Content size** | `lapSize * cycles`, capped below browser limit |
| **scrollToIndex** | Override to compute the shortest-path scroll target |
| **Snap-to-item** | Cycle-aware snap on scroll idle (owned by carousel, not a separate plugin) |
| **Keyboard** | ArrowDown/Right → `next()`, ArrowUp/Left → `prev()` (swapped in RTL for horizontal) |

### Layout variants (MD3-inspired)

The plugin supports four layout modes aligned with [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview):

| Variant | Description | Use case |
|---------|-------------|----------|
| `"full"` | One item fills the viewport. Swipe/button to advance. | Wizards, onboarding, full-screen galleries |
| `"hero"` | One large focal item with small peek items on each side. Focal item scales up, adjacent items scale down. | Featured content, product highlights |
| `"multi"` | Multiple items visible at once. The focal item is slightly larger, adjacent items peek from the edges. | Image galleries, card carousels |
| `"free"` | Items scroll freely without snapping. No focal scaling. Wrap still applies. | Horizontal feeds, continuous browsing |

#### Focal scaling

In `"hero"` and `"multi"` modes, items transition smoothly as they approach or leave the focal position:

- **Scale**: focal item at 100%, adjacent items at `focalScale` (e.g. 85%)
- **Opacity**: focal item at 1.0, adjacent items at `focalOpacity` (e.g. 0.7)
- **CSS-variable driven**: the plugin computes per-visible-element `--vlist-carousel-progress`, `--vlist-carousel-scale`, `--vlist-carousel-opacity`, and `--vlist-carousel-offset` on scroll. Templates should not be re-executed on every scroll frame just to animate opacity or scale.

The same values are also exposed in `state.carousel` at template render time for custom effects.

#### Peek

Adjacent items are partially visible at the viewport edges, hinting that there's more content. Configurable via `peek` (pixels or percentage of viewport). Peek items receive the scaled-down/dimmed treatment in hero/multi modes.

### API

```ts
type CarouselVariant = "full" | "hero" | "multi" | "free";
type CarouselDirection = "auto" | "forward" | "backward";

carousel(config?: {
  /** Layout variant (default: "full") */
  variant?: CarouselVariant;

  /** Snap to the nearest item on scroll idle (default: true, default false for "free") */
  snap?: boolean;

  /** Snap animation duration in ms (default: 400) */
  snapDuration?: number;

  /** Visible peek of adjacent items — number (px), string ("20%"), or "auto" (default: "auto") */
  peek?: number | string | "auto";

  /** Scale factor for non-focal items, 0–1 (default: 0.85, hero/multi only) */
  focalScale?: number;

  /** Opacity for non-focal items, 0–1 (default: 0.7, hero/multi only) */
  focalOpacity?: number;

  /** Number of items visible at once in "multi" mode (default: 3) */
  visibleCount?: number;

  /** Focal alignment in hero/multi modes (default: "center") */
  focalAlign?: "center" | "start";

  /** Initial item index (default: 0) */
  initialIndex?: number;
})
```

### Registered methods

```ts
list.next(step?: number, options?: {
  behavior?: "auto" | "smooth";
  duration?: number;
}): void;

list.prev(step?: number, options?: {
  behavior?: "auto" | "smooth";
  duration?: number;
}): void;

list.goTo(index: number, options?: {
  direction?: CarouselDirection;
  behavior?: "auto" | "smooth";
  duration?: number;
  align?: "start" | "center" | "end";
}): void;

list.getCarouselState(): {
  index: number;          // logical item index, 0..total-1
  progress: number;       // 0 at focal position, 1 at edge
  offset: number;         // signed logical item distance from focal item
  scrollPosition: number; // normalized pixel offset within one lap
};
```

### Template state

The plugin adds `state.carousel` to the template's third argument:

```ts
template: (item, index, state) => {
  const { active, progress, offset } = state.carousel;
  // active: true if this is the focal item
  // progress: 0 (center) to 1 (edge) — distance from focal position
  // offset: signed item distance from focal center
  return `<div style="opacity: ${1 - progress * 0.3}">${item.name}</div>`;
}
```

The same values are mirrored to CSS variables on each rendered element, so visual effects do not require template re-execution:

- `--vlist-carousel-progress` (0–1)
- `--vlist-carousel-offset` (signed integer)
- `--vlist-carousel-scale` (0–1)
- `--vlist-carousel-opacity` (0–1)

### What it replaces

- **`scroll.wrap`** — the core's wrap clamps indices and rewinds the scroll animation. `carousel()` replaces this with silent rebasing for seamless forward/backward motion. Even `variant: "free"` (no snap) is superior to `scroll.wrap` because it never visually rewinds.
- **`scroll.wheel: false`** — the wizard-nav pattern of disabling wheel and using buttons. `carousel()` supports wheel scrolling with snap, making the wheel-disable hack unnecessary.
- **Custom snap-to-item logic** — the plugin-wizard's `scroll:idle` snap handler is replaced by built-in cycle-aware snapping.

### RTL support

In horizontal mode with `dir="rtl"`, "forward" is leftward and "backward" is rightward. The plugin should detect the document or container's `direction` and swap ArrowLeft/ArrowRight mapping accordingly. `next()` and `prev()` remain directionally correct regardless of RTL — only the keyboard mapping changes.

### Future extensions (out of scope for v1)

- **Autoplay** — auto-advance on a timer with pause-on-hover and pause-on-focus. The API should not preclude adding `autoplay?: number | { interval: number; pauseOnHover?: boolean }` later. The `next()` method is the hook point.
- **Indicators** — built-in dot/progress indicators (currently left to the consumer).
- **2D grid carousel** — carousel with grid items (follow-up RFC).

### Compatibility

| Plugin | Interaction |
|--------|------------|
| `selection()` | Compatible — logical indices, ArrowRight/Down → `next()`, ArrowLeft/Up → `prev()`. ARIA set size stays at real item count. |
| `a11y()` | Compatible — logical indices and item IDs |
| `scrollbar()` | Compatible as lap progress indicator. Recommended default: no visible scrollbar. |
| `autosize()` | Compatible — measurements keyed by logical item index, rebasing preserves current item + fractional offset |
| `scale()` | **Not compatible** — both plugins own virtual scroll space |
| `groups()` | **Not compatible** — infinite wrap doesn't map to grouped sections |
| `table()` | **Out of scope for v1** |
| `masonry()` | **Out of scope for v1** |
| `tree()` | **Out of scope for v1** |
| `grid()` | **Out of scope for v1** — 2D grid carousel is a follow-up RFC |

### Public API contracts

- `list.total`, `items`, `getItemAt()`, selection payloads, click payloads, and ARIA set sizes refer to the **real item count**. Virtual slots, cycles, and rebasing are internal implementation details.
- `getScrollPosition()` returns a **normalized logical pixel offset** within one lap. The raw virtual coordinate may be silently rebased and is not a stable public value.
- `scrollToIndex(i)` chooses the **shortest path** (forward or backward).

### Size budget

Target: **+2.0 KB gzipped** — scroll override, modulo mapping, snap logic, focal scaling, peek calculation, CSS variable updates.

---

## Decisions (locked)

Resolved via [discussion #105](https://github.com/floor/vlist/discussions/105):

1. **Snap owned by carousel** — the nearest snap target is cycle-aware. A generic `snap()` plugin can happen later but does not block this RFC.
2. **Logical totals** — `list.total`, selection, ARIA, events all use the real item count. Virtual cycles are strictly internal.
3. **Normalized scroll position** — `getScrollPosition()` returns within one lap. Raw coordinate exposed only via `getCarouselState()`.
4. **CSS-variable-driven effects** — `--vlist-carousel-progress` etc. updated on scroll. Template state mirrors the values at render time but templates are NOT re-executed per frame.
5. **Focal alignment** — defaults to `"center"`, with `focalAlign: "start"` for MD3-style hero shelves.
6. **Explicit methods** — `next()`, `prev()`, `goTo()` registered on the list instance for deterministic wizard/button controls.

---

## Alternatives considered

1. **Duplicate items at boundaries** — render items 0-2 after item N to create visual continuity. Wastes DOM nodes, complicates the render pipeline, and breaks item identity (same item rendered twice).

2. **Enhance `scroll.wrap` in the core** — add infinite-scroll behavior to the core engine. Increases base bundle size for a niche feature. Plugin architecture is the right boundary.

3. **CSS scroll-snap** — use native `scroll-snap-type: x mandatory`. Doesn't work with virtual scrolling (items are absolutely positioned), and browser support for programmatic smooth-scroll + snap is inconsistent.

4. **Literally unbounded scroll** — let the position grow indefinitely. Risks browser precision issues at very large offsets and makes `getScrollPosition()` semantics confusing. Silent rebasing is safer.

---

## Acceptance tests

- From the last item, `next()` moves forward to item 0 without visually rewinding through the list.
- From the first item, `prev()` moves backward to the last item.
- Wheel/touch scroll can cross the boundary in both directions without a visible jump.
- Idle snapping lands on the nearest logical item, except in `variant: "free"` when snap is false.
- `list.total`, click events, selection events, and ARIA counts stay at the real item count.
- DOM node count stays bounded by visible items plus overscan.
- Horizontal and vertical orientations both work.
- Empty and single-item lists are stable no-ops.

---

## Implementation notes

- Avoid inflating `state.totalItems` or `setVirtualTotalFn` — that leaks virtual counts into selection, events, and ARIA.
- If `setRenderFn` is too heavy for v1, add a small internal mapping hook that separates render slot index from logical item index rather than making virtual cycles public.
- The plugin should set `priority: 10` (layout tier) since it replaces the scroll contract.

---

## References

- [Discussion #105](https://github.com/floor/vlist/discussions/105) — review and spec lock
- [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) — layout variant inspiration
- Plugin Wizard example (`/examples/plugin-wizard`) — current consumer of `scroll.wrap`
- Wizard Nav example (`/examples/wizard-nav`) — original carousel pattern
- Carousel example (`/examples/carousel`) — horizontal scrolling without wrap
