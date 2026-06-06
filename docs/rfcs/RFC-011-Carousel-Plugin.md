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

A `carousel()` plugin that provides infinite-loop scrolling with a configurable layout engine. Items dynamically change size as they move through the carousel, driven by a slot-based layout model aligned with [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) patterns.

```ts
const list = createVList({
  container: "#app",
  items: slides,
  item: { height: 400, template: renderSlide },
}, [carousel({ layout: "hero", gap: 8 })]);
```

---

## Motivation

Real-world carousel patterns (image galleries, onboarding wizards, content spotlights, product carousels) require:

1. **Infinite loop** — item N is followed by item 0 seamlessly, without rewinding.
2. **Dynamic item sizing** — focal items are large, adjacent items are small, and they transition smoothly during scroll.
3. **Variety of layouts** — full-screen, hero with peek, centered, multi-browse, and custom configurations.

The current `scroll.wrap` config rewinds the scroll animation through all items. The carousel plugin replaces this with silent rebasing and a layout engine that handles all variants through configuration.

---

## Architecture

### Three files

```
src/plugins/carousel/
├── plugin.ts    — Scroll loop, rebasing, snap, next/prev/goTo, events
├── engine.ts    — Layout math: sizes, offsets, CSS variables (pure, no DOM)
└── presets.ts   — Named layout configurations (hero, center, full, etc.)
```

**plugin.ts** owns the virtual scroll window (101 cycles, silent rebasing at edges), infinite loop, snap-on-idle, and the public API (methods, events, CSS variables). It delegates layout computation to the engine.

**engine.ts** is pure math. Given a `Layout` (ratios array + focal index), container size, and gap, it computes per-item sizes and positions for any scroll fraction. No DOM, no scroll state — just input → output.

**presets.ts** maps named layouts to `Layout` objects. Each preset is an independent function. Adding a new layout = adding a new function.

### Layout model

A **layout** defines how visible items share the container space at rest. It's an array where each entry is a ratio (0–1) or the keyword `"focal"`:

```ts
type Layout = (number | "focal")[];
```

The `"focal"` entry auto-fills the remaining space (`1 - sum(numbers)`). Its position in the array determines which item is the active/focused one.

```ts
["focal"]                    // full — one item fills the container
["focal", 0.20]              // hero — focal 80%, peek 20%
[0.15, "focal", 0.15]        // center — peek 15%, focal 70%, peek 15%
["focal", 0.30, 0.20, 0.10]  // multi — focal 40%, then decreasing
[0.33, "focal", 0.34]        // uncontained — equal items
```

Named presets resolve to these arrays at setup time, using the `peek` and `containerSize` config:

| Preset | Layout | Description |
|--------|--------|-------------|
| `"full"` | `["focal"]` | One item fills the viewport. Max 2 visible during transition. |
| `"hero"` | `["focal", peek]` | One large + one small peek. |
| `"hero-center"` | `[peek, "focal", peek]` | Large centered + peek on both sides. |
| `"multi"` | `["focal", 0.30, 0.20, 0.10]` | Multiple visible items. |
| `"uncontained"` | `[ratio, "focal", ratio]` | Equal-size items, edge clipping. |
| `"static"` | *(no engine)* | No dynamic sizing. Infinite loop + snap only. |

### Dynamic sizing engine

During a scroll transition (fraction `f` from 0 to 1), items move through layout positions:

- Each item transitions FROM its current position TO the next position
- The outgoing focal shrinks, the incoming item grows, a new peek fades in
- The sum of all visible sizes **always equals containerSize**

At rest (`f = 0`): `[large][peek]` (hero example)  
Mid-scroll (`f = 0.5`): `[shrinking][growing][fading-in]` — three items visible  
At rest (`f = 1`): `[large][peek]` — shifted by one item  

The engine updates item positions, sizes, and CSS variables on every scroll frame via `onAfterScroll`. Items are physically resized (actual pixel width/height), not just CSS-transformed.

### Gap

The `gap` parameter adds spacing between items. The engine subtracts total gap from the available space before computing slot widths, then adds the gap back in offset accumulation. Only visible items (size > 0) contribute gaps.

```ts
carousel({ layout: "hero", gap: 8 })
```

### Anchor offset

For layouts where the focal is not the first position (e.g., `"hero-center"` with `focal` at index 1), the engine computes an anchor offset to shift the viewport so pre-focal items are visible at the leading edge.

---

## API

```ts
type Layout = (number | "focal")[];
type CarouselDirection = "auto" | "forward" | "backward";

carousel(config?: {
  /** Layout preset name or custom layout array (default: "full") */
  layout?: string | Layout;

  /** Snap to nearest item on scroll idle (default: true) */
  snap?: boolean;

  /** Snap animation duration in ms (default: 400) */
  snapDuration?: number;

  /** Peek size for named presets — number (px), string ("15%"), or "auto" (default: "auto") */
  peek?: number | string | "auto";

  /** Gap between items in px (default: 0) */
  gap?: number;

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
}): void;

list.getCarouselState(): {
  index: number;
  progress: number;
  offset: number;
  scrollPosition: number;
  role: "large" | "medium" | "small";
};
```

### Events

```ts
list.on("carousel:change", ({ index, scrollPosition }) => { ... });
```

### CSS variables (per rendered element)

Updated on every scroll frame — no template re-execution needed:

| Variable | Type | Description |
|----------|------|-------------|
| `--vlist-carousel-progress` | 0–1 | Distance from focal center |
| `--vlist-carousel-offset` | integer | Signed item distance from focal |
| `--vlist-carousel-role` | string | `"large"`, `"medium"`, or `"small"` |
| `--vlist-carousel-width` | px | Current item width |

---

## Implementation model

### Virtual scroll window

- 101-cycle finite content size with silent rebasing at edges.
- `getItemFn` wraps virtual indices via modulo: `items[vi % total]`.
- `sizeCache` hooked to report uniform `stepSize` for scroll math.
- `engineState.totalItems` inflated for render pipeline; `list.total` returns real count via `virtualTotalFn`.
- `next()`/`prev()` always target snap positions (`Math.round(pos / stepSize) * stepSize ± stepSize`).

### Item layout override

The engine positions items in `onAfterScroll` by directly setting inline styles (`width`/`height`, `transform`, `display`) on rendered elements. This overrides the render pipeline's static positioning. Items with 0 size are hidden via `display: none`.

The sizeCache remains uniform (for scroll math and item recycling). The visual layout is a post-processing step applied on every frame.

---

## Compatibility

| Plugin | Status |
|--------|--------|
| `selection()` | Compatible — logical indices, ARIA stays at real count |
| `a11y()` | Compatible |
| `scrollbar()` | Compatible (lap progress indicator) |
| `autosize()` | Compatible |
| `scale()` | **Not compatible** — both own virtual scroll space |
| `groups()` | **Not compatible** — infinite wrap doesn't map to grouped sections |

---

## Public API contracts

- `list.total`, selection, click events, ARIA: **real item count**. Virtual cycles are internal.
- `getScrollPosition()`: normalized within one lap.
- `scrollToIndex(i)`: shortest path (forward or backward).
- `next()`/`prev()`: always snap-aligned, never carry fractional residue.

---

## Decisions (locked)

1. **Snap owned by carousel** — cycle-aware snap on idle via `setTimeout`. A generic `snap()` plugin can happen later.
2. **Logical totals** — public API always reports real item count.
3. **CSS-variable-driven effects** — per-element variables updated on scroll. Templates are NOT re-executed per frame.
4. **Engine separation** — pure layout math in `engine.ts`, presets in `presets.ts`, scroll logic in `plugin.ts`.
5. **Layout as data** — `(number | "focal")[]` describes any flat layout. Named presets are sugar.
6. **Gap in engine** — spacing is layout math, not CSS padding. Works for both axes.

---

## Current status

| Feature | Status |
|---------|--------|
| Virtual scroll window (101 cycles, rebasing) | ✅ |
| Infinite loop (next/prev/goTo wrap seamlessly) | ✅ |
| Layout engine (engine.ts) | ✅ |
| Presets — full, hero, hero-center, multi, uncontained, static | ✅ |
| Dynamic item sizing (physical width changes per frame) | ✅ |
| CSS variables (progress, offset, role, width) | ✅ |
| Gap support (engine-owned, both axes) | ✅ |
| Anchor offset (center-aligned layouts) | ✅ |
| Snap-on-idle (setTimeout-based) | ✅ |
| Custom layouts via `(number \| "focal")[]` | ✅ |
| `carousel:change` event | ✅ |
| 62 tests | ✅ |
| +2.2 KB gzipped | ✅ |

---

## Pending

| Feature | Notes |
|---------|-------|
| **Rename** | `variant` → `layout`, `slots` → `ratios`, `focalSlot` → `focal`, `SlotConfig` → `Layout` |
| **Smooth wheel scroll** | Intercept wheel events for controlled stepping instead of raw pixel scroll |
| **Parallax** | `--vlist-carousel-parallax` CSS variable, `prefers-reduced-motion` support |
| **Template state** | `state.carousel` injected at render time |
| **Accessibility** | ARIA roles, keyboard refinement, RTL support |
| **Autoplay** | Auto-advance with pause-on-hover/focus |

---

## Future: layout transforms

The current engine handles **flat layouts** — items placed side-by-side with variable widths. Future layouts may need per-position transforms for 3D, stacked, or perspective effects:

```ts
// Flat layout (today)
carousel({ layout: [0.15, "focal", 0.15] })

// 3D perspective layout (future)
carousel({
  layout: [0.15, "focal", 0.15],
  transforms: (progress, offset) => ({
    rotateY: offset * -15,
    scale: 1 - progress * 0.2,
    translateZ: -progress * 100,
    opacity: 1 - progress * 0.3,
  })
})
```

The CSS variables already provide the data — many 3D effects work via CSS today:

```css
.carousel-item {
  transform: perspective(800px) rotateY(calc(var(--vlist-carousel-offset) * -15deg));
  opacity: calc(1 - var(--vlist-carousel-progress) * 0.3);
}
```

The `transforms` API would add engine-level control for stacked z-index, overlapping items, and non-linear curves.

---

## Alternatives considered

1. **CSS scroll-snap** — doesn't work with virtual scrolling (absolutely positioned items).
2. **Literally unbounded scroll** — risks browser precision at large offsets. Silent rebasing is safer.
3. **Hardcoded variants** — each variant as a separate code path. Replaced by the layout engine where variants are just data.
4. **CSS-only dynamic sizing** — setting width via CSS variables on inner elements. Failed: items need physical pixel sizing by the engine to maintain layout math (sum = containerSize).

---

## References

- [Discussion #105](https://github.com/floor/vlist/discussions/105) — review and spec lock
- [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) — layout variants, specs, accessibility
- Plugin Wizard example (`/examples/plugin-wizard`) — static preset consumer
- Carousel example (`/examples/carousel`) — hero preset with real photos
