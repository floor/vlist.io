---
created: 2026-06-06
updated: 2026-06-06
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
| `variant` | `"full" \| "hero" \| "hero-center" \| "multi" \| "uncontained" \| "free"` | `"full"` | Layout variant (see below) |
| `snap` | `boolean` | `true` (`false` for `"free"`) | Snap to nearest item on scroll idle |
| `snapDuration` | `number` | `400` | Snap animation duration in ms |
| `peek` | `number \| string \| "auto"` | `"auto"` | Visible peek of adjacent items (px, `"20%"`, or `"auto"`) |
| `largeItemMaxWidth` | `number \| "auto"` | `"auto"` | Maximum width of the large/focal item |
| `parallax` | `number` | `0.5` | Parallax factor for item content, 0–1 (0 = no parallax) |
| `visibleCount` | `number` | `3` | Number of visible items in `"multi"` mode |
| `focalAlign` | `"center" \| "start"` | `"start"` | Focal alignment (`"center"` for `"hero-center"`) |
| `initialIndex` | `number` | `0` | Initial item index |
| `cornerRadius` | `number` | `28` | Item corner radius in px |

## Variants

| Variant | Description | Snap |
|---------|-------------|------|
| `"full"` | One item fills the viewport edge-to-edge | Required |
| `"hero"` | One large item + one small peek item | Required |
| `"hero-center"` | One large centered item + two small peek items | Required |
| `"multi"` | Multiple visible items: large + medium + small | Required |
| `"uncontained"` | Single-size items scroll past the container edge | Optional |
| `"free"` | Items of various widths scroll freely, no snap | No |

## Methods

| Method | Description |
|--------|-------------|
| `next(step?, options?)` | Advance by `step` items (default 1). Options: `{ behavior, duration }` |
| `prev(step?, options?)` | Go back by `step` items (default 1). Options: `{ behavior, duration }` |
| `goTo(index, options?)` | Navigate to a specific item. Options: `{ direction, behavior, duration }` |
| `getCarouselState()` | Returns `{ index, progress, offset, scrollPosition, role }` |

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

## Template state

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

## CSS variables

Updated per rendered element on every scroll frame:

| Variable | Type | Description |
|----------|------|-------------|
| `--vlist-carousel-progress` | 0–1 | Distance from focal center |
| `--vlist-carousel-offset` | integer | Signed item distance from focal |
| `--vlist-carousel-role` | string | `"large"`, `"medium"`, or `"small"` |
| `--vlist-carousel-parallax` | px | Content offset for parallax effect |
| `--vlist-carousel-width` | px | Dynamic item width |

## How it works

The plugin creates a **finite virtual scroll window** — the content is repeated across multiple cycles with items mapped via modulo. Scrolling past the last item seamlessly continues to the first, without the visual rewind that `scroll.wrap` produces.

When the scroll position approaches either edge of the virtual window, the plugin **silently rebases** to the middle cycle — the user sees continuous forward or backward motion.

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
- `prefers-reduced-motion` disables parallax and item size transitions
- RTL horizontal layout swaps arrow key directions

## Notes

- `list.total`, click events, selection, and ARIA always report the **real item count** — the virtual cycles are strictly internal
- Empty lists render nothing; all methods no-op
- Single-item lists render one item; `next`/`prev` no-op
- `getScrollPosition()` returns a normalized offset within one lap

## Examples

- [Plugin Wizard](/examples/plugin-wizard) — carousel-powered plugin explorer with dots, prev/next, and orientation toggle
