---
id: "021"
title: Table blank during native scrollbar drag
severity: high
status: investigating
component: plugins/table
related: ["003"]
---

# Issue 021: Table blank during native scrollbar drag

---

## Symptom

When scrolling a table using the **native scrollbar** (drag the scrollbar thumb), data rows disappear — only the sticky header remains. Rows reappear when scrolling slows or stops. The effect is severe and persistent during fast drag, not just occasional blank frames.

Reproduced on:
- **Data Table** example (`table` + `data` plugins, 33K rows) — worst case
- **Large List** example in table mode (`table` plugin, 100K local items) — less frequent but still visible

The **core list renderer has zero blanks** under identical conditions (same items, same scroll speed, same native scrollbar). This isolates the issue to the table plugin's render path.

## Compositor vs Main Thread

Native scrollbar drag is the **only scroll input** that goes through the browser's compositor-first path:

1. User drags the native scrollbar thumb
2. Browser compositor scrolls the viewport and **paints before firing the scroll event**
3. Old rows (positioned via `translateY` for the previous scroll range) are now above/below the viewport — the painted frame shows blank content
4. Scroll event fires → JS renders new rows at correct positions
5. Browser paints again with correct rows

Other scroll inputs are synchronous — JS controls the scroll position before the browser paints:
- **Wheel**: `onWheelEvent` calls `preventDefault()`, sets `scrollTop`, renders — all before paint
- **Custom scrollbar drag**: `mousemove` → `scrollTop = position` → render → paint
- **Navigation buttons**: `smoothScrollTo` via rAF — JS-driven

## Why the Core List Survives

Both core and table experience the same compositor race, but the **core list is fast enough to recover every frame**. The table is not.

Per-frame render cost comparison:
- **Core**: ~23 elements × 1 template call + transform update ≈ fast
- **Table**: ~23 rows × 5+ cells = 115+ DOM operations (createElement, setAttribute, style.cssText, innerHTML per cell) ≈ slow

During fast native scrollbar drag, the scroll position jumps thousands of pixels per frame. With default overscan of 3 and 36px rows, a jump of >~210px means **zero overlap** between old and new ranges — every row must be released and recreated from scratch. The table's per-row cost makes this dramatically slower than the core's per-item cost.

This creates a **jank death spiral**: the render takes too long → misses the frame deadline → compositor advances further → even less overlap → even more rows to recreate → render takes even longer.

## What We Ruled Out

| Hypothesis | Result |
|---|---|
| CSS properties (8 override tests) | No effect |
| `scroll-behavior: smooth` inheritance | Computed value is `auto` on vlist viewport |
| Async/placeholder system | Blanks with 100K local items (no async) |
| In-place element recycling | Implemented and tested — no improvement, reverted |
| Release-before-create DOM ordering | Fixed (release-after-create) — no improvement |
| `scrollPos === lastScrollPosition` bail-out | Removed — no improvement |
| Scale plugin interference | Not active at 100K items (3.6M < 16.7M limit) |
| Scroll event throttling | Events fire, render runs (~26 times during 2s drag) |

## Debug Findings

Puppeteer rAF monitor during manual native scrollbar drag captured:

```
scroll=1023770 dom=23 rows@[1–37]
```

- 23 rows exist in the DOM but are ALL positioned at indices 1–37 (Y ≈ 36–1332px)
- Viewport is scrolled to 1,023,770px — rows are ~1M pixels above the visible area
- This state is **sustained** across 1000+ consecutive frames, not a flicker
- The render function IS called (~26 times during fast drag) but can't keep up

Console instrumentation confirmed:
```
[table:render] {scrollPos: 3117264, range: [86568, 86593], items: 100000, calls: 26}
```

The render runs, produces correct ranges, but the compositor advances faster than JS can update.

## Mitigations Applied

### Release-after-create ordering (aed9b17)

Table renderer now releases stale rows AFTER appending new ones to the DOM, matching the core pipeline's pattern. Prevents any transient state where the visible viewport area has no row elements during a synchronous render cycle.

Does not fix the blank (compositor paints between frames, not during synchronous JS), but is architecturally correct.

### Simplified table render bail-out (aed9b17)

Removed the `scrollPos === lastScrollPosition` bail-out and 4 associated state variables. The table now matches the core pipeline: only bail on range-unchanged. Simpler code, fewer moving parts.

### `engineState.totalSize` sync (471bb9d)

The table plugin syncs `engineState.totalSize` during render so the custom scrollbar plugin receives correct bounds.

## Known Workaround

Adding `scrollbar()` to the plugin array **eliminates blanks entirely**. The custom scrollbar's drag handler is synchronous (mousemove → scrollTop → render → paint), bypassing the compositor race.

## Grid Plugin Comparison (2026-05-28)

The grid plugin at 100K items (native scrolling, no compression) does **not** exhibit blank frames under identical scrollbar drag conditions. This further isolates the issue to per-row DOM cost:

| Layout | Per-item DOM ops | Blank during fast drag |
|--------|-----------------|----------------------|
| **Core list** | 1 element, 1 `innerHTML` | No |
| **Grid** | 1 element, 1 `innerHTML` | No |
| **Table** | 1 row + 5+ cells × (`createElement`, `setAttribute`, `style.cssText`, `innerHTML`) | **Yes** |

The grid's per-item cost is close to the core list — one pooled element with a single template render. The table's 5x cell multiplier pushes it past the frame deadline when the compositor advances faster than JS can update.

This confirms: **the architecture is sound, only the table's per-row DOM cost needs optimization**. Row element recycling (reusing DOM nodes in-place) would eliminate `removeChild`/`appendChild` round-trips — the dominant cost during zero-overlap range jumps.

## Next Steps — Render Performance

The root cause is **table render cost per frame**. Possible approaches:

1. **Row element recycling** — during fast scroll with zero range overlap, reuse existing DOM row elements in-place (update transform + cell content) instead of release → pool → acquire → append cycle. Eliminates removeChild/appendChild round-trips.
2. **Cell pooling** — pool individual cell elements alongside row elements, reducing createElement cost when rows are created from scratch.
3. **Dynamic overscan** — increase overscan based on scroll velocity to maintain range overlap during fast scroll. Reduces the number of rows that need full recreation.
4. **Lightweight fast-scroll mode** — during high-velocity scroll, render simplified placeholder rows (fewer DOM ops per row) and swap in full rows when velocity drops.
5. **Auto-include scrollbar for table** — table plugin injects `scrollbar()` when none is present. Removes the problem entirely but changes default behavior.

## Status

**Investigating** — compositor race confirmed as mechanism, render performance identified as the amplifying factor. Core list proves the architecture works when render is fast enough. Next session: explore row recycling or dynamic overscan to bring table render cost in line with core.
