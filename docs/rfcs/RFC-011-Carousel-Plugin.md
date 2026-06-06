---
created: 2026-06-06
updated: 2026-06-06
status: draft
---

# RFC-011: Carousel Plugin

**Status:** Draft  
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

### Core principle

The scroll position is unbounded — it can grow past `totalSize` or go negative. The render pipeline maps indices via modulo:

```
visibleIndex = ((scrollIndex % total) + total) % total
```

Items are positioned relative to the viewport using their modulo'd index. No item duplication — the same item pool is reused, just with wrapped indices.

### Plugin responsibilities

| Responsibility | Approach |
|---------------|----------|
| **Unbounded scroll** | Override scroll setter to allow positions beyond `[0, totalSize]` |
| **Index modulo** | Override `getItemFn` to wrap indices: `items[index % total]` |
| **Content size** | Set content size to a large virtual range (e.g. `totalSize * 1000`) so native scrollbar has room |
| **scrollToIndex** | Override to compute the shortest-path scroll target: forward or backward, whichever is closer |
| **Snap-to-item** | Optional: snap to the nearest item boundary on scroll idle |
| **Keyboard** | ArrowDown/Right always moves forward, ArrowUp/Left always moves backward — never jumps across the entire list |

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
- **Transitions**: driven by scroll position, not CSS transitions — ensures 60fps with no layout thrash

The plugin exposes `state.carousel.focal` (boolean) and `state.carousel.progress` (0–1 distance from focal center) to the template, so the consumer can apply custom effects.

#### Peek

Adjacent items are partially visible at the viewport edges, hinting that there's more content. Configurable via `peek` (pixels or percentage of viewport). Peek items receive the scaled-down/dimmed treatment in hero/multi modes.

### API

```ts
carousel(config?: {
  /** Layout variant (default: "full") */
  variant?: "full" | "hero" | "multi" | "free";

  /** Snap to the nearest item on scroll idle (default: true, ignored for "free") */
  snap?: boolean;

  /** Snap animation duration in ms (default: 400) */
  snapDuration?: number;

  /** Visible peek of adjacent items in px or "auto" (default: "auto") */
  peek?: number | "auto";

  /** Scale factor for non-focal items, 0–1 (default: 0.85, hero/multi only) */
  focalScale?: number;

  /** Opacity for non-focal items, 0–1 (default: 0.7, hero/multi only) */
  focalOpacity?: number;

  /** Number of items visible at once in "multi" mode (default: 3) */
  visibleCount?: number;
})
```

#### Template state

The plugin adds `state.carousel` to the template's third argument:

```ts
template: (item, index, state) => {
  const { focal, progress } = state.carousel;
  // focal: true if this is the center item
  // progress: 0 (center) to 1 (edge) — distance from focal position
  return `<div style="opacity: ${1 - progress * 0.3}">${item.name}</div>`;
}
```

### What it replaces

- `scroll.wrap` in the core becomes unnecessary for carousel use cases — the plugin handles wrapping at a higher level with better UX
- The `scroll.wheel: false` pattern (wizard-nav) can use carousel instead for a more natural feel
- Custom snap-to-item logic in examples (plugin-wizard's `scroll:idle` handler) is replaced by built-in snap

### Interactions with other plugins

| Plugin | Interaction |
|--------|------------|
| `selection()` | Works — focusedIndex wraps via modulo |
| `scrollbar()` | The virtual content size gives the scrollbar a proportional thumb; alternatively, hide it (`scrollbar: "none"`) |
| `scale()` | Not compatible — carousel uses its own virtual scroll space |
| `groups()` | Not compatible — infinite wrap doesn't map to grouped sections |
| `grid()` | Compatible — items wrap in grid rows |
| `autosize()` | Compatible — measured sizes wrap with the items |

### Size budget

Target: **+2.0 KB gzipped** — scroll override, modulo mapping, snap logic, focal scaling, peek calculation.

---

## Alternatives considered

1. **Duplicate items at boundaries** — render items 0-2 after item N to create visual continuity. Wastes DOM nodes, complicates the render pipeline, and breaks item identity (same item rendered twice).

2. **Enhance `scroll.wrap` in the core** — add infinite-scroll behavior to the core engine. Increases base bundle size for a niche feature. Plugin architecture is the right boundary.

3. **CSS scroll-snap** — use native `scroll-snap-type: x mandatory`. Doesn't work with virtual scrolling (items are absolutely positioned), and browser support for programmatic smooth-scroll + snap is inconsistent.

---

## Open questions

1. Should the snap behavior be part of `carousel()` or a separate `snap()` plugin?
2. How should `list.total` report — the real item count, or the virtual inflated count?
3. Should `getScrollPosition()` return the raw unbounded position or the modulo'd position?
4. Should focal scaling be CSS-driven (transform + opacity via classes) or JS-driven (inline styles per frame)? CSS is cleaner but limits custom effects; JS is more flexible but needs care on the hot path.
5. In `"hero"` mode, should the hero item be configurable (e.g. always the center, or always the left) or always centered?
6. Should `carousel()` expose `goTo(index)` / `next()` / `prev()` methods, or rely on `scrollToIndex` with wrap?

---

## References

- Plugin Wizard example (`/examples/plugin-wizard`) — current consumer of `scroll.wrap`
- Wizard Nav example (`/examples/wizard-nav`) — original carousel pattern
- Carousel example (`/examples/carousel`) — horizontal scrolling without wrap
