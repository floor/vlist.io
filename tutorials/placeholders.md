# Placeholders

> Unloaded rows stay visible while data is on its way, and a directional smear while the scroll is fast.

`data()` does not leave a hole when a row has not loaded. It renders a placeholder through the same item template, marked so you can style it, and fades the real row in when the item arrives.

## When a row is a placeholder

A placeholder is an item whose id starts with `__placeholder_`. The renderer adds `{classPrefix}-item--placeholder` (`.vlist-item--placeholder` with the default prefix). The first loaded batch is sampled, up to 20 items, and later placeholders cycle through those field lengths, so a skeleton is about as wide as the real text. Before any profile exists, the fallback label is twelve mask characters.

Two speeds decide whether a fetch runs:

- Above `loading.cancelThreshold` (default `15` px/ms) `data()` skips the chunk fetch. Unloaded rows stay placeholders until the scroll slows or settles.
- Between the preload threshold (default `2` px/ms) and the cancel threshold, it preloads ahead of the scroll direction.

When a placeholder is replaced by a loaded item, the row gains `.vlist-item--replaced` for 300 ms. `vlist/styles` fades that class in (`vlist-fade-in`, 0.3s). Failed loads keep the placeholders too, and `reload()` keeps the last total so the list does not collapse while the new data arrives.

## Styling

Leaf text inside a placeholder is drawn as a skeleton: transparent type, a rounded bar, and a pulse. Heavier elements (headings, `strong`, `b`) use a stronger bar. Override `.vlist-item--placeholder` and `.vlist-item--replaced` in your own stylesheet. The replaced fade is the one shipped in `vlist/styles`; leave it in place if you add the smear below.

## Motion blur

While the scroll is fast, the [velocity-loading example](/examples/velocity-loading) smears placeholder rows along the scroll axis: a one-axis gaussian, offset in the scroll direction, drawn at 0.7 alpha behind the row. The settle fade on `.vlist-item--replaced` is unchanged.

`N` is `min(12, max(1.5, velocity * 0.28))`. The offset is `sign * min(22, max(4, velocity * 0.55))`, and `sign` follows the scroll direction. A vertical list (the default) uses `stdDeviation` `"0 N"`, `dy` equal to that offset and `dx` 0. A horizontal list uses `"N 0"`, `dx` equal to that offset and `dy` 0, and widens the filter region on x.

Toggle `.vlist--fast` from `velocity:change` when the sample is reliable and velocity is above the same 15 px/ms threshold. Update the shift from the scroll delta, and skip the shift when the delta is 0.

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
