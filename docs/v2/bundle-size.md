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
| Base (`createVList`) | 27.8 KB | 9.9 KB | — |
| a11y | 31.0 KB | 11.1 KB | +1.2 KB |
| selection | 37.1 KB | 12.7 KB | +2.8 KB |
| data | 41.4 KB | 14.7 KB | +4.8 KB |
| scrollbar | 34.8 KB | 11.9 KB | +2.0 KB |
| sortable | 37.2 KB | 12.9 KB | +3.0 KB |
| groups | 43.7 KB | 15.2 KB | +5.3 KB |
| scale | — | — | no-op stub (deprecated, removed in 3.0) |
| page | 30.2 KB | 10.6 KB | +0.8 KB |
| snapshots | 31.0 KB | 11.0 KB | +1.2 KB |
| transition | 34.4 KB | 11.8 KB | +2.0 KB |
| autosize | 30.8 KB | 10.9 KB | +1.0 KB |
| **Layout** | | | |
| grid | 34.8 KB | 12.3 KB | +2.5 KB |
| table | 46.1 KB | 15.7 KB | +5.8 KB |
| masonry | 39.0 KB | 14.0 KB | +4.1 KB |

## Tree-Shaking

Only imported plugins are bundled. Dead code elimination has been verified for all 13 plugins.

Example: importing only `createVList` + `selection` produces a **12.7 KB** gzipped bundle — no cost for unused plugins.

```ts
// Only createVList + selection are bundled — nothing else
import { createVList, selection } from "vlist";
```

## Measuring

```bash
bun run size
```
