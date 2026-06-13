---
created: 2026-06-06
updated: 2026-06-07
status: approved
---

# RFC-012: Logical Scroll Model

**Status:** Approved (with required amendments)  
**Author:** floor  
**Type:** Core Architecture  
**Created:** 2026-06-06  
**Amended:** 2026-06-07 — committee review (GPT-5.5, Gemini 3.1, Opus 4.6, Opus 4.8, Codex)  

---

## Summary

Replace the current model where `vlist-content` physically represents ALL items (potentially millions of pixels tall) with a **logical scroll model** where scroll position is `{ index, offsetPx }` — not a physical pixel offset into a giant container.

The content container becomes viewport-sized. Items are positioned via transforms relative to the logical scroll position. This eliminates scroll compression, the scale plugin's coordinate mapping, the carousel's 101-cycle virtual window, and the browser's 16.7M pixel limit — all consequences of a single wrong architectural choice.

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

2. **Compression everywhere**: The compression is not contained — it leaks into **24 files** and **516 code references**:

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

The scroll position should be a **logical value** (which item is at the top + how far into that item), not a physical pixel offset into a giant container.

**The compression was not a tradeoff — it was technical debt from a wrong root choice.** Remove the root choice, and 516 compression references become dead code.

---

## Design

### Content model

```
Before:  vlist-content height = totalItems × itemSize  (up to 48M px)
After:   vlist-content height = viewport height         (e.g., 600px)
```

Items are positioned within the viewport-sized content using `transform: translateY(offset)` relative to the logical scroll position, exactly as they are today. The only change is that the content div no longer grows with the number of items.

The content element must set `overflow-anchor: none` to prevent the browser's scroll anchoring from fighting DOM recycling and scroll-window rebasing.

### Logical scroll position

Today, `engineState.scrollPosition` is a pixel offset into the content (0 to `totalItems × itemSize`). In the new model, it becomes a logical value:

```ts
interface ScrollState {
  index: number      // top visible item (integer)
  offsetPx: number   // pixel offset within that item (0 to itemSize)
}
```

The internal primitive is `{ index, offsetPx }` — a pixel offset within the top visible item. This is stable under variable and autosized items: when an item's measured size changes, the pixel offset remains physically meaningful. Fraction (`offsetPx / itemSize`) is derived only for scrollbar thumb position or persistence, never used as the source of truth.

This shape already exists in the codebase as `ScrollSnapshot.offsetInItem` (`src/types.ts:275`).

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

**Recommendation**: Option C for v1. Smallest change from current architecture, native scroll physics preserved. Option A or B can follow if Phase 0 reveals rebasing issues.

**Constraint**: rebasing must never occur during active momentum scrolling or overscroll/rubber-banding — only during idle or non-elastic scroll phases. If this constraint cannot be satisfied in Chrome, Safari, and Firefox, Phase 1 falls back to Option A (hidden proxy) or a larger bounded window.

### Scrollbar

The native scrollbar is meaningless in this model — the content is always viewport-sized. The custom `scrollbar()` plugin already renders a virtual scrollbar for scale mode. In the new model, ALL scrollbars are virtual:

- Thumb position = `logicalPosition / totalItems`
- Thumb size = `visibleCount / totalItems`
- Drag maps back to logical position

This is simpler than today, where the scrollbar has two modes (native vs. compressed).

### Page mode

The page plugin (`src/plugins/page/plugin.ts`) installs custom scroll functions and derives scroll position from `getBoundingClientRect()`. In the current model, the list contributes physical height to the document. In the logical model, it does not.

A giant document spacer would reintroduce the browser pixel limit this RFC exists to eliminate. Page mode will use a **bounded scroll proxy** approach: a document-level spacer capped at a safe size (e.g., 3× viewport), with the same rebasing model as the main scroll input. Alternatively, page mode may intercept window scroll events directly. The full design is Phase 1 work, but the constraint is fixed: **page mode must not require unbounded document height.**

### Plugin migration boundary

Plugins currently access scroll state through `PluginContext` hooks (`onBeforeScroll`, `onAfterScroll`, `getScrollPosition()`) and direct DOM reads. A handful of plugins have leaked past the hook abstraction to read raw `scrollTop`/`scrollLeft` directly.

Phase 1 will introduce a `ScrollAdapter` as the formal boundary between the logical scroll model and plugin code. The exact interface is Phase 1 design work, but its role is defined: plugins that need scroll position go through the adapter, which exposes both logical (`{ index, offsetPx }`) and pixel-equivalent accessors. Direct DOM scroll reads become an anti-pattern.

Cross-axis scroll (e.g., table horizontal overflow) remains native and is not affected by main-axis virtualization.

---

## What changes

### Removed (516 references)

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
| Code complexity | 516 compression references in 24 files | 0 |

---

## Compatibility and semver

This is a breaking change. vlist is pre-1.0, so breaking changes are permitted under semver, but the migration path must be explicit.

### Public API continuity

- `getScrollPosition()` and scroll event payloads continue returning **pixel equivalents** (computed from `index * itemSize + offsetPx`). No API break for consumers reading scroll position.
- `scrollToIndex(i)` continues working as today. `scrollToPosition(px)` translates to the logical model internally.
- Item click events, `data-index`, `aria-posinset` — unchanged.

### Deprecation ladder

| Release | Change |
|---------|--------|
| **v0.next** | Logical scroll model ships as default. `scale()` becomes a no-op that logs a deprecation warning. `ScalePluginConfig` export preserved. |
| **v0.next+1** | `scale()` export removed. Compression helpers removed from `vlist/internals`. |
| **v1.0** (if applicable) | Clean slate — no compression references in the codebase. |

### Known tradeoffs

Viewport-sized content means the browser's native scrollbar, find-in-page, and scroll-to-reveal behaviors no longer work natively. The virtual scrollbar replaces the first; the other two are already limited by virtualization and are not regressions of this RFC.

---

## Migration

The change is internal to the core. The public API translates between logical and pixel positions at the boundary:

- `scrollToIndex(i)` → sets `logicalPosition = { index: i, offsetPx: 0 }`
- `getScrollPosition()` → returns a pixel equivalent from logical position
- Item click events → same logical indices as today

Plugins that read `engineState.scrollPosition` switch to the logical model via the `ScrollAdapter`. Most plugins don't read it directly — they use the sizeCache and render pipeline hooks.

---

## Open questions

1. **Variable-size items**: prefix sums give O(1) offset lookups today. In the logical model, `indexAtOffset` uses binary search on prefix sums keyed by logical index. Performance should be similar.

2. **Accessibility**: screen readers use native scroll position for cues. The virtual scrollbar needs correct ARIA signals (`role="scrollbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-controls`).

3. **RTL**: `scrollLeft` semantics differ across browsers in RTL mode. The rebase implementation must normalize RTL scroll values explicitly.

4. **Autosize anchoring**: when items above the viewport are measured and change size, the logical anchor (`{ index, offsetPx }`) must be adjusted to prevent visual jumps. Anchoring rules for measurements above, inside, and below the viewport are Phase 1 design work.

---

## Implementation phases

| Phase | Scope |
|-------|-------|
| **Phase 0** | Rebase prototype: standalone div with `overflow: auto`, 3× viewport height, item recycling, `scrollTop` rebasing. Test on Chrome, Safari, Firefox (desktop trackpad/wheel/keyboard), iOS Safari (touch momentum, rubber-banding), Android Chrome (touch momentum). Acceptance: rebasing is not detectable during any input mode. If it fails, evaluate larger window or Option A. **Gate for Phase 1.** |
| **Phase 1** | Logical scroll model in core. `{ index, offsetPx }` as internal state. Option C (or fallback) in core. `ScrollAdapter` introduced. `scale()` becomes deprecated no-op. Page mode adapted with bounded scroll proxy. `overflow-anchor: none` on content. |
| **Phase 2** | All scrollbars virtual by default. Native scrollbar mode deprecated. |
| **Phase 3** | Remove `compressionCtx`, `CompressionContext`, `calculateCompressedItemPosition` from render pipeline. Remove scale plugin. |
| **Phase 4** | Carousel simplified — no virtual inflation, position wraps naturally. |

### Phase 1 checklist (deferred from RFC)

These are real work items resolved during Phase 1, not RFC gates:

- `ScrollAdapter` interface design
- Plugin-by-plugin migration
- RTL `scrollLeft` normalization
- Table horizontal overflow / header sync
- ARIA scrollbar contract
- Autosize anchoring rules
- Snapshot save/restore migration
- Unknown/changing total behavior
- Benchmark and regression matrix

---

## Committee review

Reviewed 2026-06-07 by GPT-5.5, Gemini 3.1, Opus 4.6, Opus 4.8, Codex.

| Reviewer | Vote | Key concern |
|----------|------|-------------|
| GPT-5.5 | REJECT | RFC underspecified — wants full migration spec |
| Gemini 3.1 | APPROVE | Rebase risk on Apple devices during momentum |
| Opus 4.6 (CTO) | APPROVE | Direction correct, details are Phase 1 work |
| Opus 4.8 | APPROVE WITH CONCERNS | Split is procedural not technical — found consensus |
| Codex | APPROVE WITH AMENDMENTS | Named the 5 gates vs Phase 1 split |

**Consensus**: architecture approved unanimously. Five amendments adopted (offsetPx, Phase 0, overflow-anchor, semver plan, page-mode commitment). GPT's remaining concerns (plugin migration, ARIA, RTL, autosize) moved to Phase 1 checklist.

---

## References

- Scale plugin: `src/plugins/scale/plugin.ts` (650 lines)
- Compression module: `src/rendering/scale.ts` (74 references alone)
- Carousel plugin: `src/plugins/carousel/plugin.ts` — 101-cycle virtual window
- Browser scroll limit: Chrome/Safari cap at 16,777,216px (2²⁴)
- 516 compression references across 24 source files
- Existing scroll anchor: `ScrollSnapshot.offsetInItem` at `src/types.ts:275`
- Committee reviews: `scratchpad/RFC-012-Logical-Scroll-Model/`
