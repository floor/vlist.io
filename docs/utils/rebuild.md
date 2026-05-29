---
created: 2026-05-29
updated: 2026-05-29
status: published
---

# Rebuild

Seamless list recreation with scroll position continuity. Creates a new list hidden behind the old one, waits for it to render, then swaps in a single frame — no flash.

```ts
import { createVList, grid, rebuild } from "vlist";

list = await rebuild(list, (snap) =>
  createVList({
    container: "#app",
    item: { height: 120, template: renderCard },
    items: data,
  }, [grid({ columns: 3 }), snap]),
);
```

## Why rebuild?

When layout config changes (columns, gap, orientation), the list must be destroyed and recreated. A naive destroy-then-create causes a visible flash — the container empties for one or more frames before the new list renders.

`rebuild` solves this by overlaying the new list behind the old one. The old list stays visible while the new one renders offscreen. Once ready, a single-frame swap (with optional crossfade) replaces old with new.

## How it works

1. **Capture** — Takes a scroll snapshot from the previous list
2. **Create** — Calls your factory with a pre-configured [snapshots](/docs/plugins/snapshots) plugin
3. **Hide** — Positions the new list behind the old one (`position: absolute; visibility: hidden`)
4. **Wait** — Waits for the new list to render (one animation frame by default)
5. **Swap** — Makes the new list visible, optionally crossfades, then destroys the old list

## The snapshot plugin

The `create` callback receives a pre-configured snapshots plugin as its only argument. Include it in your plugin array — it handles scroll position capture and restore automatically:

```ts
list = await rebuild(list, (snap) =>
  createVList(config, [grid({ columns: 3 }), scrollbar(), snap]),
);
```

You don't need to import or configure the [snapshots](/docs/plugins/snapshots) plugin yourself.

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `key` | `string` | — | SessionStorage key for snapshot persistence across page reloads |
| `ready` | `(list) => Promise<void>` | one rAF | Custom ready signal — resolves when the new list is ready to display |
| `delay` | `number` | — | Extra milliseconds to wait after ready before swapping |
| `transition` | `number \| object` | — | Crossfade duration in ms |

### Transition

A number applies the same duration to both fade-in and fade-out. An object uncouples them:

```ts
// Same duration for both
list = await rebuild(list, factory, { transition: 200 });

// Uncoupled: fade in slower, fade out faster with delay
list = await rebuild(list, factory, {
  transition: { fadeIn: 300, fadeOut: 200, fadeOutDelay: 100 },
});
```

| Property | Type | Description |
|----------|------|-------------|
| `fadeIn` | `number` | Fade-in duration for the new list (ms) |
| `fadeOut` | `number` | Fade-out duration for the old list (ms) |
| `fadeOutDelay` | `number` | Delay before starting the fade-out (ms) |

### Session persistence

When `key` is provided, the scroll snapshot is persisted to sessionStorage. On page reload, the snapshots plugin automatically restores the scroll position:

```ts
list = await rebuild(list, factory, { key: "my-list" });
```

## Container requirements

The list container must have `position: relative` (or `absolute`/`fixed`) for the overlay positioning to work. The `.vlist` root element already has `position: relative`, but your outer container needs it too:

```css
#list-container {
  position: relative;
}
```

## Stale rebuilds

When rebuilds overlap (e.g. rapid config changes), use a version counter to discard stale results:

```ts
let version = 0;

async function createView() {
  const v = ++version;
  const newList = await rebuild(list, factory, options);
  if (v !== version) {
    newList.destroy();
    return;
  }
  list = newList;
}
```

For slider-driven controls, debounce the rebuild call to avoid excessive overlap:

```ts
let timer = 0;
slider.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => createView(), 150);
});
```

## Full example

```ts
import { createVList, grid, scrollbar, selection, rebuild } from "vlist";

let list = null;

async function createView() {
  list = await rebuild(
    list,
    (snap) =>
      createVList({
        container: "#app",
        item: {
          height: (_i, ctx) => Math.round(ctx.columnWidth * 0.75),
          template: renderCard,
        },
        items: data,
      }, [grid({ columns, gap }), selection(), scrollbar(), snap]),
    {
      key: "gallery",
      transition: { fadeIn: 300, fadeOut: 200, fadeOutDelay: 100 },
    },
  );

  list.on("scroll", onScroll);
  list.on("selection:change", onSelect);
}

createView();
```

## Examples

- [Photo Album](/examples/photo-album) — grid/masonry gallery with crossfade transitions on layout change
- [Scrollbar](/examples/scrollbar) — contact list with rebuild on scrollbar config change
