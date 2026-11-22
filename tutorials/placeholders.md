# Placeholders

> Unloaded rows stay on screen, in the same item template, until their data arrives.

`data()` never leaves a hole. An index that has not loaded yet is still a row, and the same `item.template` runs. On the default list the core pipeline marks that row `.vlist-item--placeholder`, and fades it in when the item arrives.

## What a placeholder is

A placeholder is an ordinary item with three extra fields:

- `id` is `__placeholder_` plus the index (`__placeholder_4` for index 4).
- `_isPlaceholder` is `true`.
- `_index` is that same index.

Before any real item has been sampled, the only content field is `label`, twelve mask characters. The mask character is `x`, so that label is `xxxxxxxxxxxx`.

```javascript
import { createVList, data } from 'vlist'
import 'vlist/styles'

const list = createVList({
  container: '#list',
  item: {
    height: 48,
    template: (item) => `<div class="row">${item.name ?? item.label}</div>`,
  },
}, [
  data({
    total: 1000,
    adapter: {
      read: async ({ offset, limit }) => {
        const items = Array.from({ length: limit }, (_, i) => ({
          id: offset + i,
          name: `Row ${offset + i}`,
        }))
        return { items, total: 1000 }
      },
    },
  }),
])
```

The template does not have to branch. Where the row has `.vlist-item--placeholder`, `vlist/styles` turns the text into a skeleton bar. Branch only when a placeholder must not run the real markup, for example a control or an image request.

`isPlaceholderItem` is not exported from `vlist`. `vlist/internals` exports it and `filterPlaceholders`. The check is the `_isPlaceholder` flag.

```javascript
import { isPlaceholderItem } from 'vlist/internals'

const template = (item) => isPlaceholderItem(item)
  ? `<div class="row row--pending">${item.name ?? item.label}</div>`
  : `<div class="row">${item.name}</div>`
```

The core pipeline and the table renderer add `.vlist-item--placeholder` when the id starts with `__placeholder_`.

## Widths that match the data

The first loaded batch is sampled once, up to 20 items. For each item, every field whose name does not start with `_` and is not `id` is recorded as a character length (`String(value ?? "").length`). Items with no such field are skipped. Later placeholders cycle through those profiles: index `N` uses profile `N % profiles.length`, and each field is the mask character repeated to that length (at least one character).

`data()` always uses those defaults. `createPlaceholderManager` is exported from `vlist/internals` and, with no config, uses the mask character `x` and a sample of 20. `data()` does not pass a config, and neither field is an option of `data()`.

`reload()` clears the sampled profiles. The next successful batch is sampled again.

## Styling

Import `vlist/styles`. A placeholder row is at opacity 0.6 and pulses (`vlist-placeholder-pulse`, 2s, opacity 0.6 → 0.4 → 0.6).

Leaf elements (an element with no element children) lose their text color and become a bar:

- background `--vlist-placeholder-bg`
- `border-radius: 4px`
- `width: fit-content`, so the mask length sets the bar width
- `line-height: 1.2` and `transform: scaleY(0.8)`

`strong`, `b`, and `h1`–`h4`, when they are leaves, use `--vlist-placeholder-bg-strong` instead.

Light defaults are `rgba(0, 0, 0, 0.2)` and `rgba(0, 0, 0, 0.24)`. Dark mode uses `rgba(255, 255, 255, 0.3)` and `rgba(255, 255, 255, 0.35)`, under `[data-theme-mode="dark"]`, under `.dark`, and under `prefers-color-scheme: dark` when the page has not set `data-theme-mode`.

```css
.vlist {
  --vlist-placeholder-bg: rgba(0, 0, 0, 0.12);
  --vlist-placeholder-bg-strong: rgba(0, 0, 0, 0.22);
}
```

When the core pipeline replaces a placeholder with a loaded item, the row gains `.vlist-item--replaced` and `vlist/styles` runs `vlist-fade-in` (opacity 0.6 → 1, 0.3s). The class is removed after 300ms, so a longer animation is cut off. Override the animation to change the fade inside that window:

```css
.vlist-item--replaced {
  animation: vlist-fade-in 0.15s ease-out;
}
```

## Loading

Velocity is in px/ms.

- Above `loading.cancelThreshold` (default 15), `data()` does not fetch. The visible unloaded rows stay placeholders, and the fetch waits until the scroll slows.
- Above `loading.preloadThreshold` (default 2) and at or under the cancel threshold, the visible range loads, and `loading.preloadAhead` items (default 50) are requested ahead of the scroll direction.

A failed chunk stays placeholders. The list re-renders and schedules a retry; a later success replaces them. `reload()` drops the loaded pages and the sampled profiles, and it keeps the last total, so the rows stay placeholders for the whole list instead of collapsing. The total updates when the first new chunk arrives. If that reload fails, the placeholders remain.

```javascript
data({
  adapter,
  loading: {
    cancelThreshold: 15,
    preloadThreshold: 2,
    preloadAhead: 50,
  },
})
```

## Tables, grids, masonry, and groups

`grid()` replaces the core pipeline. A new cell is classed `.vlist-item.vlist-grid-item` and gets `data-index`, `data-id`, and a role (`listitem`, or `option` when the list is interactive). An interactive cell also gets an id, `aria-posinset`, and `aria-setsize`. Selection toggles `.vlist-item--selected` and `.vlist-item--focused` the same way as on a loaded cell. The template still runs for a placeholder item. Since vlist 3.8.8 the grid renderer adds `.vlist-item--placeholder` when the id starts with `__placeholder_`. When that id is replaced by a real item, it removes the placeholder class and adds `.vlist-item--replaced` for the fade. The replaced class is removed after 300ms.

`masonry()` draws its own cells. A cell is classed `.vlist-item.vlist-masonry-item`. A group header is `.vlist-group-header` and is not marked as a placeholder. Since vlist 3.8.8 a cell whose id starts with `__placeholder_` gets `.vlist-item--placeholder`. When that id is replaced by a real item, the placeholder class is removed and `.vlist-item--replaced` is added for the same 300ms fade.

A table row is drawn by the table renderer, which adds `.vlist-item--placeholder` from the id prefix. Each cell's text is wrapped so it can be a bar, and a cell with no element gets a `.vlist-table-cell-skeleton` span at 60% of the cell width. Those bars use `--vlist-border` and the same pulse. `vlist/styles/table` hides nested children so only the outer bar shows. The replaced class is added for the same 300ms. `rowAttributes()` does not run on a placeholder row; it runs once when the item has loaded. A selection stored on the placeholder id moves to the real item id at that moment.

With `groups()`, an unloaded gap has no group header. The groups renderer sets the row to `.vlist-item` and adds `.vlist-item--placeholder` when `_isPlaceholder` is true, so the skeleton bars apply. Headers appear when the gap fills and the boundaries are computed again.

Placeholders use the row's existing role. A table placeholder row still gets `aria-rowindex`, set to the data index plus 2. Nothing in the placeholder path sets a separate busy state.

## Motion blur

Optional. The [velocity-loading example](/examples/velocity-loading) smears placeholder rows along the scroll while velocity is above the cancel threshold. The settle fade on `.vlist-item--replaced` is unchanged. `N` is `min(12, max(1.5, velocity * 0.28))`. The offset is `sign * min(22, max(4, velocity * 0.55))`. Vertical lists use `stdDeviation` `"0 N"` and `dy`; horizontal lists use `"N 0"` and `dx`, and widen the filter on x.

```html
    <svg class="motion-defs" width="0" height="0" aria-hidden="true" focusable="false">
        <filter id="velocity-motion" x="-8%" y="-70%" width="116%" height="240%" color-interpolation-filters="sRGB">
            <feGaussianBlur id="velocity-motion-blur" in="SourceGraphic" stdDeviation="0 4" result="smear"></feGaussianBlur>
            <feOffset id="velocity-motion-shift" in="smear" dx="0" dy="8" result="shifted"></feOffset>
            <feComponentTransfer in="shifted" result="trail">
                <feFuncA type="linear" slope="0.7"></feFuncA>
            </feComponentTransfer>
            <feMerge>
                <feMergeNode in="trail"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
        </filter>
    </svg>
```

```js
function motionSpread(velocity) {
  return Math.min(12, Math.max(1.5, velocity * 0.28));
}

function motionShiftAmount(velocity, direction) {
  const sign = direction > 0 ? 1 : -1;
  return sign * Math.min(22, Math.max(4, velocity * 0.55));
}

function updateTrailSpread() {
  if (!motionBlur || !list) return;
  const n = motionSpread(currentVelocity).toFixed(1);
  const axis = listConfig.orientation === "horizontal" ? "x" : "y";
  motionBlur.setAttribute("stdDeviation", axis === "x" ? `${n} 0` : `0 ${n}`);
  if (!motionFilter) return;
  if (axis === "x") {
    motionFilter.setAttribute("x", "-70%");
    motionFilter.setAttribute("y", "-8%");
    motionFilter.setAttribute("width", "240%");
    motionFilter.setAttribute("height", "116%");
  } else {
    motionFilter.setAttribute("x", "-8%");
    motionFilter.setAttribute("y", "-70%");
    motionFilter.setAttribute("width", "116%");
    motionFilter.setAttribute("height", "240%");
  }
}

function updateTrailShift(direction) {
  if (!motionShift || !list || direction === 0) return;
  const shift = motionShiftAmount(currentVelocity, direction).toFixed(1);
  const axis = listConfig.orientation === "horizontal" ? "x" : "y";
  if (axis === "x") {
    motionShift.setAttribute("dx", shift);
    motionShift.setAttribute("dy", "0");
  } else {
    motionShift.setAttribute("dx", "0");
    motionShift.setAttribute("dy", shift);
  }
}
```

```js
    list.element.classList.toggle(
      "vlist--fast",
      reliable && velocity > LOAD_VELOCITY_THRESHOLD,
    );
    updateTrailSpread();
```

```css
.motion-defs {
    position: absolute;
    width: 0;
    height: 0;
}

.vlist .vlist-item--placeholder {
    transition: filter 0.15s ease;
}

.vlist--fast .vlist-item--placeholder {
    contain: none;
    overflow: visible;
    z-index: 2;
    background-color: transparent;
    filter: url("#velocity-motion");
    animation: none;
}
```
