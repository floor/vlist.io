---
created: 2026-02-17
updated: 2026-05-27
status: published
---

# Page

Window/document scroll mode — the list scrolls with the page instead of inside a viewport.

```ts
import { createVList, page } from "vlist";

const list = createVList({
  container: "#feed",
  item: { height: 200, template: renderPost },
  items: posts,
}, [page()]);
```

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `scrollPadding.top` | `number \| () => number` | `0` | Fixed header offset |
| `scrollPadding.bottom` | `number \| () => number` | `0` | Fixed footer offset |
| `scrollPadding.left` | `number \| () => number` | `0` | Left offset (horizontal mode) |
| `scrollPadding.right` | `number \| () => number` | `0` | Right offset (horizontal mode) |

### Dynamic Scroll Padding

Use a function for headers/footers whose size can change (e.g. collapsible headers):

```ts
const list = createVList({
  container: "#feed",
  item: { height: 200, template: renderPost },
  items: posts,
}, [page({
  scrollPadding: {
    top: () => document.getElementById("sticky-header")!.getBoundingClientRect().height,
    bottom: 48,
  },
})]);
```

Functions are re-evaluated on each scroll frame, so they track resize/collapse changes automatically.

### scrollToIndex in Page Mode

`scrollToIndex` respects padding — items land within the safe visible area:

| Alignment | Behavior |
|-----------|----------|
| `start` | Positions item below the top padding |
| `end` | Positions item above the bottom padding |
| `center` | Centers within the padded safe area |

### Notes

- Disables viewport scroll, listens to `window.scroll` and `window.resize` instead
- Use `scrollPadding` to account for fixed headers/footers
- Useful for infinite feeds, full-page lists, and document-integrated layouts
- If `scroll-behavior: smooth` is set on `html`, it may conflict — remove it or use `scroll-behavior: auto`
