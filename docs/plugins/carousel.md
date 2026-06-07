---
created: 2026-06-06
updated: 2026-06-07
status: published
---

# Carousel

Infinite-loop scrolling with snap-to-item, aligned with [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) patterns.

```ts
import { createVList, carousel } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 400, template: renderSlide },
  items: slides,
}, [carousel()]);

list.on("carousel:change", ({ index }) => {
  console.log("Active slide:", index);
});
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `variant` | `CarouselVariant \| SlotConfig` | `"full"` | Layout variant (see below), or a custom `SlotConfig` object |
| `snap` | `boolean` | `true` (`false` for `"free"`) | Snap to nearest item on scroll idle |
| `snapDuration` | `number` | `400` | Snap animation duration in ms |
| `peek` | `number \| string \| "auto"` | `"auto"` | Visible peek of adjacent items (px, `"20%"`, or `"auto"`) |
| `gap` | `number` | `0` | Gap between items in px |
| `initialIndex` | `number` | `0` | Initial item index |

```ts
type CarouselVariant = "static" | "full" | "hero" | "hero-center" | "multi" | "uncontained" | "free";
```

### Custom variant

Pass a `SlotConfig` object to define a custom slot layout:

```ts
carousel({
  variant: { slots: [0.7, 0.2, 0.1], focalSlot: 0 },
});
```

## Variants

| Variant | Description | Snap |
|---------|-------------|------|
| `"full"` | One item fills the viewport edge-to-edge | Required |
| `"hero"` | One large item + one small peek item | Required |
| `"hero-center"` | One large centered item + two small peek items | Required |
| `"multi"` | Multiple visible items: large + medium + small | Required |
| `"uncontained"` | Single-size items scroll past the container edge | Optional |
| `"free"` | Items of various widths scroll freely, no snap | No |
| `"static"` | Items use their native size, no layout engine | No |

## Methods

| Method | Description |
|--------|-------------|
| `next(step?, options?)` | Advance by `step` items (default 1). Smooth by default; pass `{ behavior: "auto" }` for instant. |
| `prev(step?, options?)` | Go back by `step` items (default 1). Smooth by default; pass `{ behavior: "auto" }` for instant. |
| `goTo(index, options?)` | Navigate to a specific item. Instant by default; pass `{ behavior: "smooth" }` to animate. Options: `{ direction, behavior, duration }` |
| `getCarouselState()` | Returns `{ index, scrollPosition }` |

### goTo direction

| Direction | Behavior |
|-----------|----------|
| `"auto"` | Shortest path (default) |
| `"forward"` | Always scroll forward, wrapping if needed |
| `"backward"` | Always scroll backward, wrapping if needed |

## Events

| Event | Payload |
|-------|---------|
| `carousel:change` | `{ index, scrollPosition }` — emitted when the focal item changes |

## CSS variables

Updated per rendered element on every scroll frame:

| Variable | Type | Description |
|----------|------|-------------|
| `--vlist-carousel-progress` | 0–1 | Distance from focal center |
| `--vlist-carousel-offset` | integer | Signed item distance from focal |
| `--vlist-carousel-role` | string | `"large"`, `"medium"`, or `"small"` |
| `--vlist-carousel-width` | px | Dynamic item width |

Use these in your CSS for scroll-driven effects:

```css
.slide {
  opacity: calc(1 - var(--vlist-carousel-progress) * 0.4);
  filter: grayscale(var(--vlist-carousel-progress));
}
```

## How it works

The plugin creates a **bounded virtual scroll window** — the content is repeated across multiple cycles with items mapped via modulo. Scrolling past the last item seamlessly continues to the first.

Internally, the carousel delegates to the **bounded scroll handler** (RFC-012) via `ctx.setBoundedWrap`. When the scroll position drifts too far from the middle cycle, the handler folds the logical position back by whole laps — the user sees continuous forward or backward motion with no visual discontinuity.

## Compatibility

| Plugin | Status |
|--------|--------|
| `selection()` | Compatible — logical indices, ARIA stays at real count |
| `a11y()` | Compatible |
| `scrollbar()` | Compatible (lap progress indicator) |
| `autosize()` | Compatible |
| `scale()` | **Not compatible** — both own virtual scroll space |
| `groups()` | **Not compatible** — infinite wrap doesn't map to grouped sections |

## Accessibility

- Tab focuses the first carousel item
- Arrow keys navigate between items
- Container has `role="region"`, items labeled "item X of N"
- `prefers-reduced-motion` disables item size transitions
- RTL horizontal layout swaps arrow key directions

## Notes

- `list.total`, click events, selection, and ARIA always report the **real item count** — the virtual cycles are strictly internal
- Empty lists render nothing; all methods no-op
- Single-item lists render one item; `next`/`prev` no-op
- `getScrollPosition()` returns a normalized offset within one lap

## Examples

- [Carousel](/examples/carousel) — MD3-aligned photo carousel with variant layouts and real photos
- [Plugin Wizard](/examples/plugin-wizard) — carousel-powered plugin explorer with dots, prev/next, and orientation toggle
