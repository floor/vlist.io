---
created: 2026-06-06
updated: 2026-06-06
status: draft
---

# RFC-012: Viewport-Sized Content

**Status:** Draft  
**Author:** floor  
**Type:** Core Architecture  
**Created:** 2026-06-06  

---

## Summary

Replace the current model where `vlist-content` physically represents ALL items (potentially millions of pixels tall) with a model where `vlist-content` is always viewport-sized and items are positioned within it via transforms.

This eliminates scroll compression, the scale plugin's coordinate mapping, the carousel's 101-cycle virtual window, and the browser's 16.7M pixel limit — all consequences of a single wrong architectural choice.

```
Before:  <div class="vlist-content" style="height: 4.8e+07px">
After:   <div class="vlist-content" style="height: 600px">
```

---

## Motivation

### The wrong choice

The current architecture sets `vlist-content.style.height` to the total physical size of all items:

```
1,000,000 items × 48px = 48,000,000px
```

This single decision cascades into every part of the codebase:

1. **Browser pixel limit**: Chrome/Safari cap element dimensions at 16,777,216px (2²⁴). Content taller than this loses scroll precision. The scale plugin was created to "compress" the coordinate space to fit under this limit.

2. **Compression everywhere**: The compression is not contained — it leaks into **24 files** and **515 code references**:

   | File | Compression references |
   |------|----------------------|
   | `rendering/scale.ts` | 74 |
   | `rendering/viewport.ts` | 65 |
   | `plugins/scale/plugin.ts` | 64 |
   | `plugins/scrollbar/controller.ts` | 61 |
   | `rendering/renderer.ts` | 56 |
   | `plugins/table/renderer.ts` | 33 |
   | `plugins/grid/plugin.ts` | 27 |
   | `plugins/grid/renderer.ts` | 22 |
   | `plugins/table/plugin.ts` | 21 |
   | `plugins/tree/plugin.ts` | 16 |
   | + 14 more files... | |

   Every renderer asks "am I compressed?" Every scroll calculation branches on it. Every plugin that positions items — grid, table, tree, scrollbar, snapshots — must handle compressed coordinates. `calculateCompressedItemPosition`, `compressionCtx`, `CompressionContext` touch the entire render pipeline.

3. **Carousel virtual inflation**: The carousel plugin inflates `totalItems` by 101× to create a virtual scroll window, then rebases when approaching the edges. This is fragile, leaks virtual indices into the public API, and the loop isn't truly circular.

4. **Performance cost**: Every frame, the render pipeline decompresses coordinates for every visible item. The browser maintains layout state for a multi-million-pixel element. Scroll positions are large floats that lose precision far from the origin.

### The insight

We only render ~15-20 items at a time. The content container doesn't need to represent all items physically. It just needs to hold the visible items — viewport-sized.

The scroll position should be a **logical value** (which item is at the top + how far scrolled past it), not a physical pixel offset into a giant container.

**The compression was not a tradeoff — it was technical debt from a wrong root choice.** Remove the root choice, and 515 compression references become dead code.

---

## Design

### Content model

```
Before:  vlist-content height = totalItems × itemSize  (up to 48M px)
After:   vlist-content height = viewport height         (e.g., 600px)
```

Items are positioned within the viewport-sized content using `transform: translateY(offset)` relative to the logical scroll position, exactly as they are today. The only change is that the content div no longer grows with the number of items.

### Logical scroll position

Today, `engineState.scrollPosition` is a pixel offset into the content (0 to `totalItems × itemSize`). In the new model, it becomes a logical value:

```ts
interface ScrollState {
  index: number;     // top visible item (integer)
  fraction: number;  // 0–1, how far past that item
}
```

Or equivalently, a single float: `position = index + fraction`. The render pipeline maps this to item offsets and sizes to determine which items are visible and where to place them.

### Scroll input

The browser's native scroll needs physical content to scroll. Three options:

#### Option A: Hidden scroll proxy

A hidden div with `overflow: auto` and a tall-enough content child (e.g., `3 × viewport height`) captures native wheel/touch events with browser-provided momentum and inertia. The proxy's `scrollTop` is read on each frame and mapped to the logical position. When the proxy approaches its edges, it silently wraps.

**Pro**: native inertia, native touch physics.  
**Con**: proxy management, small rebasing.

#### Option B: Wheel/touch interception

Intercept `wheel` and `touchmove` events directly. Apply custom inertia/momentum. Map delta to logical position changes.

**Pro**: no proxy, no rebasing, full control.  
**Con**: must reimplement scroll physics. Platform differences.

#### Option C: Hybrid — small overflow window

Content is `3 × viewport height`. Native scroll operates within this window. When `scrollTop` nears the top or bottom, silently rebase to the center.

**Pro**: native inertia, small content, simple.  
**Con**: still has rebasing (but trivial — 1800px window, not millions).

**Recommendation**: Option C for v1. Smallest change from current architecture, native scroll physics preserved. Option A or B can follow.

### Scrollbar

The native scrollbar is meaningless in this model — the content is always viewport-sized. The custom `scrollbar()` plugin already renders a virtual scrollbar for scale mode. In the new model, ALL scrollbars are virtual:

- Thumb position = `logicalPosition / totalItems`
- Thumb size = `visibleCount / totalItems`
- Drag maps back to logical position

This is simpler than today, where the scrollbar has two modes (native vs. compressed).

---

## What changes

### Removed (515 references)

| Component | Today | After |
|-----------|-------|-------|
| **Scale plugin** | Compresses scroll range to fit 16.7M limit | Not needed |
| **`compressionCtx`** | Passed through renderer, grid renderer, table renderer | Removed |
| **`calculateCompressedItemPosition`** | Called per visible item per frame | Removed |
| **`CompressionContext` type** | Threaded through 24 files | Removed |
| **Compression branching** | `if (compressionCtx)` in every renderer | Removed |
| **Carousel 101 cycles** | Virtual inflation + rebasing | Position wraps naturally |
| **Browser limit workarounds** | Content clamped, precision loss | No large content |

### Stays the same

- Item pooling (DOM element recycling)
- Template rendering
- Plugin architecture (`VListPlugin<T>` interface)
- All existing plugins (grid, table, masonry, tree, groups, selection, a11y, etc.)
- The render pipeline's role: logical position → visible items → DOM
- Public API (`scrollToIndex`, `getScrollPosition`, events)

### Simplified

- **Scrollbar**: one mode (virtual), not two (native + compressed)
- **Carousel**: position wraps at `totalItems`, truly circular
- **Renderers**: no compression branching — position items directly
- **Every plugin**: no `compressionCtx` parameter threading

---

## Performance impact

| Metric | Today | After |
|--------|-------|-------|
| Content height | Up to 16.7M px | Viewport height (~600px) |
| Per-frame compression | O(visible) decompression calls | None |
| Scroll precision | Degrades at large offsets | Always near origin |
| Layout cost | Browser maintains huge content layout | Minimal — viewport-sized |
| Memory | Content element sized for all items | Content element sized for viewport |
| Item limit | 16.7M / itemSize (browser cap) | **Unlimited** |
| Code complexity | 515 compression references in 24 files | 0 |

---

## Migration

The change is internal to the core. The public API translates between logical and pixel positions at the boundary:

- `scrollToIndex(i)` → sets `logicalPosition = i`
- `getScrollPosition()` → returns a pixel equivalent from logical position
- Item click events → same logical indices as today

Plugins that read `engineState.scrollPosition` switch to the logical model. Most plugins don't read it directly — they use the sizeCache and render pipeline.

---

## Open questions

1. **Variable-size items**: prefix sums give O(1) offset lookups today. In the logical model, `indexAtOffset` uses binary search on prefix sums keyed by logical index. Performance should be similar.

2. **Accessibility**: screen readers use native scroll position for cues. The virtual scrollbar needs correct ARIA signals (scroll percentage, estimated total).

3. **Page plugin**: uses `document.documentElement.scrollTop` for window-level scrolling. Needs a proxy or interception layer.

4. **Backward compatibility**: clean cutover or opt-in flag? A flag adds complexity; a clean cutover is simpler but breaking for internal plugin authors.

---

## Implementation phases

| Phase | Scope |
|-------|-------|
| **Phase 1** | Option C in core: 3× viewport content with rebasing. Scale plugin simplified to scrollbar-only. No compression in new code paths. |
| **Phase 2** | All scrollbars virtual by default. Native scrollbar mode deprecated. |
| **Phase 3** | Remove `compressionCtx`, `CompressionContext`, `calculateCompressedItemPosition` from render pipeline. Remove scale plugin. |
| **Phase 4** | Carousel simplified — no virtual inflation, position wraps naturally. |

---

## References

- Scale plugin: `src/plugins/scale/plugin.ts`
- Compression module: `src/rendering/scale.ts` (74 references alone)
- Carousel plugin: `src/plugins/carousel/plugin.ts` — 101-cycle virtual window
- Browser scroll limit: Chrome/Safari cap at 16,777,216px (2²⁴)
- 515 compression references across 24 source files
