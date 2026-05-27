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

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gutter` | `boolean` | `false` | Reserve space for scrollbar |
| `autoHide` | `boolean` | `true` | Hide when not scrolling |
| `autoHideDelay` | `number` | `1000` | Delay before hiding (ms) |
| `minThumbSize` | `number` | `15` | Minimum thumb size (px) |
| `showOnHover` | `boolean` | `true` | Show on mouse hover |
| `showOnViewportEnter` | `boolean` | `true` | Show when mouse enters viewport |
| `hoverZoneWidth` | `number` | — | Width of hover detection zone (px) |

### CSS Classes

- `.vlist-viewport--custom-scrollbar` on viewport
- `.vlist-scrollbar-thumb` for the thumb element

### Notes

- Provides consistent cross-browser scrollbar appearance
- Used internally by the scale plugin for compressed scroll
