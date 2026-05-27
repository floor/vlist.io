---
created: 2026-02-10
updated: 2026-05-27
status: published
---

# Scrollbar

Custom scrollbar replacing the native browser scrollbar.

```ts
import { createVList, scrollbar } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
  items: data,
}, [scrollbar()]);
```

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gutter` | `boolean` | `false` | Reserve layout space for the scrollbar (prevents content shift) |
| `autoHide` | `boolean` | `true` | Hide when not scrolling |
| `autoHideDelay` | `number` | `1000` | Delay before hiding (ms) |
| `minThumbSize` | `number` | `15` | Minimum thumb size (px) |
| `showOnHover` | `boolean` | `true` | Show on mouse hover |
| `showOnViewportEnter` | `boolean` | `true` | Show when mouse enters viewport |
| `hoverZoneWidth` | `number` | — | Width of hover detection zone (px) |

## CSS Customisation

Style the scrollbar via CSS custom properties:

```css
.vlist-scrollbar {
  --vlist-custom-scrollbar-width: 8px;
  --vlist-custom-scrollbar-track-color: transparent;
  --vlist-custom-scrollbar-radius: 4px;
  --vlist-custom-scrollbar-padding-top: 2px;
  --vlist-custom-scrollbar-padding-right: 2px;
  --vlist-custom-scrollbar-padding-bottom: 2px;
  --vlist-custom-scrollbar-thumb-color: rgba(0, 0, 0, 0.3);
  --vlist-custom-scrollbar-thumb-hover-color: rgba(0, 0, 0, 0.5);
}
```

## CSS Classes

| Class | Element |
|-------|---------|
| `.vlist-viewport--custom-scrollbar` | Viewport with custom scrollbar enabled |
| `.vlist-viewport--gutter` | Viewport with gutter spacing |
| `.vlist-scrollbar` | Track container |
| `.vlist-scrollbar--visible` | Visible state |
| `.vlist-scrollbar--horizontal` | Horizontal mode variant |
| `.vlist-scrollbar--dragging` | While thumb is being dragged |
| `.vlist-scrollbar__thumb` | Thumb element |

## Notes

- Provides consistent cross-browser scrollbar appearance
- Used internally by the scale plugin for compressed scroll
- `gutter: true` reserves layout space so content doesn't shift when the scrollbar appears — useful for tables and grids where the last column shouldn't be clipped
- The custom scrollbar is an overlay — it does not consume layout space (unlike native scrollbars on Windows/Linux). This avoids the ~17px width discrepancy that affects `autosize()` measurement
