---
created: 2026-06-06
updated: 2026-06-09
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
| `variant` | `CarouselVariant \| SlotConfig \| SlotConfigResolver` | `"full"` | Layout variant name, a `SlotConfig` object, or a resolver function |
| `snap` | `boolean` | `true` (`false` for `"free"`) | Snap to nearest item on scroll idle |
| `snapDuration` | `number` | `400` | Snap animation duration in ms |
| `peek` | `number \| string \| "auto"` | `"auto"` | Visible peek of adjacent items (px, `"20%"`, or `"auto"`) |
| `gap` | `number` | `0` | Gap between items in px |
| `initialIndex` | `number` | `0` | Initial item index |

```ts
type CarouselVariant = "full" | "hero" | "hero-center" | "multi" | "uncontained" | "static" | "free" | (string & {});
```

The type accepts any string — built-in names are autocompleted, but you can pass any name registered via `registerPreset()`.

### Custom variant

There are three ways to define a custom layout:

**Inline `SlotConfig`** — a fixed slot layout:

```ts
carousel({
  variant: { slots: [0.7, 0.2, 0.1], focalSlot: 0 },
});
```

**`SlotConfigResolver` function** — a dynamic resolver that receives the container size and peek value:

```ts
carousel({
  variant: (containerSize, peek) => ({
    slots: [0.6, 0.4],
    focalSlot: 0,
  }),
});
```

**Registered preset** — a named resolver added to the global registry (see [Presets](#presets)).

## Variants

| Variant | Description | Snap |
|---------|-------------|------|
| `"full"` | One item fills the viewport edge-to-edge | Required |
| `"hero"` | One large item + one small peek item | Required |
| `"hero-center"` | One large centered item + two small peek items | Required |
| `"multi"` | Multiple visible items: large + medium + small | Required |
| `"uncontained"` | Single-size items scroll past the container edge | Optional |
| `"multi-aspect"` | Variable-width items using native aspect ratios, no layout engine | No |
| `"free"` | Items of various widths scroll freely, no snap | No |
| `"static"` | Items use their native size, no layout engine | No |

## Presets

Presets are named `SlotConfigResolver` functions stored in a global registry. Built-in variants (`full`, `hero`, `hero-center`, `multi`, `uncontained`) are pre-registered — you can add your own or override existing ones.

```ts
import { registerPreset, getPreset, resolvePreset } from "vlist";
```

| Function | Description |
|----------|-------------|
| `registerPreset(name, resolver)` | Register a named preset. Overwrites any existing preset with the same name. |
| `getPreset(name)` | Get a resolver by name, or `undefined` if not registered. |
| `resolvePreset(name, containerSize, peek)` | Resolve a name to a `SlotConfig`. Returns `null` if the name is unknown or the resolver returns `null`. |

```ts
type SlotConfigResolver = (containerSize: number, peek: number) => SlotConfig | null;
```

A resolver returning `null` means "no layout engine" — the plugin falls back to variable-width item rendering (used by `multi-aspect` and `static` variants, which are not registered as presets).

### Registering a custom preset

```ts
import { registerPreset, full } from "vlist";

// A new preset with custom slot proportions
registerPreset("panorama", (containerSize, peek) => ({
  slots: [0.8, 0.1, 0.1],
  focalSlot: 0,
}));

// An alias for an existing preset
registerPreset("full-h", full);

// Use it by name
carousel({ variant: "panorama" });
```

### Built-in preset exports

Each built-in preset is also exported as a named `SlotConfigResolver` function for direct use:

```ts
import { full, hero, heroCenter, multi, uncontained } from "vlist";

const config = hero(800, 56);
// { slots: [0.93, 0.07], focalSlot: 0 }
```

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
