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

Add a `carousel()` plugin that provides true infinite-loop scrolling for carousel and wizard UIs, aligned with [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) patterns.

Instead of the current `scroll.wrap` behavior (which scrolls backward through the entire list to wrap around), the carousel plugin scrolls **forward** seamlessly — item N is followed by item 0 as if the list were circular.

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

MD3 research (200+ participants) confirms: "A previewed or squished item strongly indicated that there was more content to swipe through."

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
| **Content size** | `lapSize * cycles`, capped below browser limit. `sizeCache` hooked internally — `engineState.totalItems` stays at real count. |
| **scrollToIndex** | Override to compute the shortest-path scroll target |
| **Snap-to-item** | Cycle-aware snap on scroll idle (owned by carousel, not a separate plugin) |
| **Dynamic item widths** | Items change physical width as they move through the layout (large → medium → small) |
| **Parallax** | Item content moves at a different speed than its container |
| **Keyboard** | ArrowDown/Right → `next()`, ArrowUp/Left → `prev()` (swapped in RTL for horizontal) |

---

### Layout variants (MD3-aligned)

Six layout modes aligned with [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview):

| Variant | MD3 Name | Description | Snap | Use case |
|---------|----------|-------------|------|----------|
| `"full"` | Full-screen | One item fills the viewport edge-to-edge. | Required | Wizards, onboarding, immersive feeds |
| `"hero"` | Hero | One large item + one small peek item. Swipe one at a time. | Required | Spotlighting movies, featured apps |
| `"hero-center"` | Center-aligned hero | One large centered item + two small peek items on each side. | Required | Centered featured content |
| `"multi"` | Multi-browse | Multiple visible items: large + medium + small. Browse many at once. | Required | Photo galleries, event feeds |
| `"uncontained"` | Uncontained | Single-size items scroll past the container edge. No size change. | Optional | Text-heavy carousels, traditional behavior |
| `"free"` | Uncontained multi-aspect | Items of various widths scroll freely. No snap. | No | Mixed-ratio content, continuous browsing |

#### Item size roles (MD3)

Items dynamically change between three size roles as they move through the carousel:

| Role | Width | Behavior |
|------|-------|----------|
| **Large** | Customizable max width | Focal item — fully visible content |
| **Medium** | Dynamic | Transitioning item — content may be partially masked |
| **Small** | 40–56dp (min–max) | Preview/peek item — content masked, hints at more |

Items transition between roles smoothly as they scroll. The width change is physical (actual element width), not just a CSS transform. This allows text to reflow and content to adapt at each size.

#### Parallax effect

Item content moves at a different speed than the item container, creating a depth effect:

```
contentOffset = scrollDelta * parallaxFactor  // parallaxFactor < 1.0
```

CSS variable `--vlist-carousel-parallax` is set per element. When `prefers-reduced-motion` is active, parallax is disabled and all items render at the same size.

#### Snap-scrolling behavior

- **Snap-scrolling** (default for all except `"uncontained"` and `"free"`): items snap to the layout grid after scroll ends. In `"full"` and `"hero"` modes, items snap one at a time.
- **Default scrolling** (for `"uncontained"`): items stop anywhere. No layout grid alignment.

#### Peek

Adjacent items are partially visible at the viewport edges — a strong signal that more content exists (MD3 research finding). Configurable via `peek` (pixels, percentage, or `"auto"`). In hero/multi modes, peek items are in the "small" size role.

### API

```ts
type CarouselVariant = "full" | "hero" | "hero-center" | "multi" | "uncontained" | "free";
type CarouselDirection = "auto" | "forward" | "backward";

carousel(config?: {
  /** Layout variant (default: "full") */
  variant?: CarouselVariant;

  /** Snap to the layout grid on scroll idle (default: true, auto for "uncontained", false for "free") */
  snap?: boolean;

  /** Snap animation duration in ms (default: 400) */
  snapDuration?: number;

  /** Visible peek of adjacent items — number (px), string ("20%"), or "auto" (default: "auto") */
  peek?: number | string | "auto";

  /** Maximum width of the large item in px or "auto" (default: "auto") */
  largeItemMaxWidth?: number | "auto";

  /** Parallax factor for item content, 0–1 (default: 0.5, 0 = no parallax) */
  parallax?: number;

  /** Number of items visible at once in "multi" mode (default: 3) */
  visibleCount?: number;

  /** Focal alignment in hero/multi modes (default: "start", "center" for hero-center) */
  focalAlign?: "center" | "start";

  /** Initial item index (default: 0) */
  initialIndex?: number;

  /** Item corner radius in px (default: 28, per MD3 spec) */
  cornerRadius?: number;
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
}): void;

list.getCarouselState(): {
  index: number;          // logical item index, 0..total-1
  progress: number;       // 0 at focal position, 1 at edge
  offset: number;         // signed logical item distance from focal item
  scrollPosition: number; // normalized pixel offset within one lap
  role: "large" | "medium" | "small"; // current item's size role
};
```

### Events

```ts
list.on("carousel:change", ({ index }) => { ... });
```

Emitted when the focal card changes from user scrolling.

### Template state

The plugin adds `state.carousel` to the template's third argument:

```ts
template: (item, index, state) => {
  const { active, progress, offset, role } = state.carousel;
  // active: true if this is the focal item
  // progress: 0 (center) to 1 (edge)
  // offset: signed item distance from focal center
  // role: "large" | "medium" | "small"
  return `<div class="card card--${role}">${item.name}</div>`;
}
```

### CSS variables (per rendered element)

Updated on every scroll frame — no template re-execution needed:

| Variable | Type | Description |
|----------|------|-------------|
| `--vlist-carousel-progress` | 0–1 | Distance from focal center |
| `--vlist-carousel-offset` | integer | Signed item distance from focal |
| `--vlist-carousel-role` | string | `"large"`, `"medium"`, or `"small"` |
| `--vlist-carousel-parallax` | px | Content offset for parallax effect |
| `--vlist-carousel-width` | px | Dynamic item width |

### What it replaces

- **`scroll.wrap`** — the core's wrap clamps indices and rewinds the scroll animation. `carousel()` replaces this with silent rebasing for seamless forward/backward motion. Even `variant: "free"` is superior to `scroll.wrap` because it never visually rewinds.
- **`scroll.wheel: false`** — the wizard-nav pattern of disabling wheel and using buttons. `carousel()` supports wheel scrolling with snap, making the wheel-disable hack unnecessary.
- **Custom snap-to-item logic** — the plugin-wizard's `scroll:idle` snap handler is replaced by built-in cycle-aware snapping.

### Compatibility

| Plugin | Interaction |
|--------|------------|
| `selection()` | Compatible — logical indices, ArrowRight/Down → `next()`, ArrowLeft/Up → `prev()`. ARIA set size stays at real item count. |
| `a11y()` | Compatible — logical indices and item IDs |
| `scrollbar()` | Compatible as lap progress indicator. Recommended default: no visible scrollbar. |
| `autosize()` | Compatible — measurements keyed by logical item index |
| `scale()` | **Not compatible** — both plugins own virtual scroll space |
| `groups()` | **Not compatible** — infinite wrap doesn't map to grouped sections |
| `table()`, `masonry()`, `tree()`, `grid()` | **Out of scope for v1** |

### Public API contracts

- `list.total`, `items`, `getItemAt()`, selection payloads, click payloads, and ARIA set sizes refer to the **real item count**. Virtual cycles are strictly internal — `engineState.totalItems` is inflated for the render pipeline but `list.total` reports the logical count via `virtualTotalFn`.
- `getScrollPosition()` returns a **normalized logical pixel offset** within one lap.
- `scrollToIndex(i)` chooses the **shortest path** (forward or backward).

### Accessibility (MD3-aligned)

| Requirement | Implementation |
|-------------|---------------|
| **Tab to first item** | Initial focus on the first carousel item, not the container |
| **Arrow navigation** | Left/Right (or Up/Down in vertical) moves between items |
| **Space/Enter** | Activates the focused item |
| **ARIA** | Container has `role="region"`, items labeled "item X of N" |
| **Show all** | Consumer provides a "Show all" button for accessibility on scrolling pages |
| **Reduced motion** | `prefers-reduced-motion` disables parallax and item size transitions; all items render at equal size |

### RTL support

In horizontal mode with `dir="rtl"`, "forward" is leftward and "backward" is rightward. The plugin detects the document or container's `direction` and swaps ArrowLeft/ArrowRight mapping accordingly. `next()` and `prev()` remain directionally correct.

### Size budget

Target: **+2.5 KB gzipped** — scroll override, modulo mapping, snap logic, dynamic item widths, parallax, CSS variable updates, accessibility.

---

## Decisions (locked)

Resolved via [discussion #105](https://github.com/floor/vlist/discussions/105):

1. **Snap owned by carousel** — the nearest snap target is cycle-aware. A generic `snap()` plugin can happen later but does not block this RFC.
2. **Logical totals** — `list.total`, selection, ARIA, events all use the real item count. Virtual cycles are strictly internal.
3. **Normalized scroll position** — `getScrollPosition()` returns within one lap. Raw coordinate exposed only via `getCarouselState()`.
4. **CSS-variable-driven effects** — `--vlist-carousel-progress` etc. updated on scroll. Template state mirrors the values at render time but templates are NOT re-executed per frame.
5. **Focal alignment** — defaults to `"start"` for hero, `"center"` for hero-center.
6. **Explicit methods** — `next()`, `prev()`, `goTo()` registered on the list instance for deterministic wizard/button controls.

---

## Alternatives considered

1. **Duplicate items at boundaries** — render items 0-2 after item N to create visual continuity. Wastes DOM nodes, complicates the render pipeline, and breaks item identity.

2. **Enhance `scroll.wrap` in the core** — add infinite-scroll behavior to the core engine. Increases base bundle size for a niche feature. Plugin architecture is the right boundary.

3. **CSS scroll-snap** — use native `scroll-snap-type: x mandatory`. Doesn't work with virtual scrolling (items are absolutely positioned), and browser support for programmatic smooth-scroll + snap is inconsistent.

4. **Literally unbounded scroll** — let the position grow indefinitely. Risks browser precision issues at very large offsets. Silent rebasing is safer.

---

## Acceptance tests

- From the last item, `next()` moves forward to item 0 without visually rewinding through the list.
- From the first item, `prev()` moves backward to the last item.
- Wheel/touch scroll can cross the boundary in both directions without a visible jump.
- Idle snapping lands on the nearest logical item, except in `"uncontained"` (optional) and `"free"` (disabled).
- `list.total`, click events, selection events, and ARIA counts stay at the real item count.
- DOM node count stays bounded by visible items plus overscan.
- Horizontal and vertical orientations both work.
- Empty and single-item lists are stable no-ops.
- In hero/multi modes, items transition between large/medium/small sizes smoothly.
- `prefers-reduced-motion` disables parallax and size transitions.
- RTL horizontal layout swaps arrow key directions.

---

## Implementation phases

| Phase | Scope | Status |
|-------|-------|--------|
| **Phase 1** | `"full"` variant: virtual window, silent rebasing, next/prev/goTo, snap, carousel:change event | ✅ Implemented |
| **Phase 2** | `"hero"` + `"hero-center"`: dynamic item widths (large/small), peek, parallax, CSS variables | Pending |
| **Phase 3** | `"multi"` + `"uncontained"`: multiple visible items, medium size role, default scroll option | Pending |
| **Phase 4** | `"free"`: multi-aspect ratio items, no snap | Pending |
| **Phase 5** | Accessibility: ARIA roles, reduced motion, keyboard refinement, RTL | Pending |

---

## Future extensions (out of scope for v1)

- **Autoplay** — auto-advance on a timer with pause-on-hover and pause-on-focus. The `next()` method is the hook point. API: `autoplay?: number | { interval: number; pauseOnHover?: boolean }`.
- **Indicators** — built-in dot/progress indicators (currently left to the consumer).
- **2D grid carousel** — carousel with grid items (follow-up RFC).

---

## References

- [Discussion #105](https://github.com/floor/vlist/discussions/105) — review and spec lock
- [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) — layout variants, specs, accessibility
- [MD3 Carousel Specs](docs/material-design-carousel.md) — local copy of the full MD3 specification
- Plugin Wizard example (`/examples/plugin-wizard`) — first consumer (Phase 1)
- Wizard Nav example (`/examples/wizard-nav`) — original carousel pattern
- Carousel example (`/examples/carousel`) — horizontal scrolling without wrap
