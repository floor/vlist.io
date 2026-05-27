---
created: 2026-02-12
updated: 2026-05-27
status: published
---

# Bundle Size

All measurements are for ESM output with minification enabled. Gzipped delta is the cost of adding that plugin on top of the base bundle.

## Size Table

| Plugin | Minified | Gzipped | Delta |
|--------|----------|---------|-------|
| Base (`createVList`) | {{size:base:min}} KB | {{size:base:gz}} KB | — |
| a11y | {{size:a11y:min}} KB | {{size:a11y:gz}} KB | +{{size:a11y:delta}} KB |
| selection | {{size:selection:min}} KB | {{size:selection:gz}} KB | +{{size:selection:delta}} KB |
| data | {{size:data:min}} KB | {{size:data:gz}} KB | +{{size:data:delta}} KB |
| scrollbar | {{size:scrollbar:min}} KB | {{size:scrollbar:gz}} KB | +{{size:scrollbar:delta}} KB |
| sortable | {{size:sortable:min}} KB | {{size:sortable:gz}} KB | +{{size:sortable:delta}} KB |
| groups | {{size:groups:min}} KB | {{size:groups:gz}} KB | +{{size:groups:delta}} KB |
| scale | {{size:scale:min}} KB | {{size:scale:gz}} KB | +{{size:scale:delta}} KB |
| page | {{size:page:min}} KB | {{size:page:gz}} KB | +{{size:page:delta}} KB |
| snapshots | {{size:snapshots:min}} KB | {{size:snapshots:gz}} KB | +{{size:snapshots:delta}} KB |
| transition | {{size:transition:min}} KB | {{size:transition:gz}} KB | +{{size:transition:delta}} KB |
| autosize | {{size:autosize:min}} KB | {{size:autosize:gz}} KB | +{{size:autosize:delta}} KB |
| **Layout** | | | |
| grid | {{size:grid:min}} KB | {{size:grid:gz}} KB | +{{size:grid:delta}} KB |
| table | {{size:table:min}} KB | {{size:table:gz}} KB | +{{size:table:delta}} KB |
| masonry | {{size:masonry:min}} KB | {{size:masonry:gz}} KB | +{{size:masonry:delta}} KB |

## Tree-Shaking

Only imported plugins are bundled. Dead code elimination has been verified for all 13 plugins.

Example: importing only `createVList` + `selection` produces a **{{size:selection:gz}} KB** gzipped bundle — no cost for unused plugins.

```ts
// Only createVList + selection are bundled — nothing else
import { createVList, selection } from "vlist";
```

## Measuring

```bash
bun run size
```
