---
id: "003"
title: Blank frames during fast native scroll
severity: high
status: open
component: core/scroll
related: ["002"]
---

# Issue 003: Blank frames during fast native scroll

---

## Symptom

When scrolling fast via wheel or trackpad (not custom scrollbar drag — that's issue 002), the list shows blank frames. Items are not visible despite the viewport having moved. Items reappear when scrolling slows.

This is NOT the same as issue 002 (which was rAF throttle in the scrollbar thumb drag handler). This affects native scroll and is reproduced in v1 as well.

## Investigation So Far

### wheelRendered flag (v2 only)

The `wheelRendered` boolean in `src/core/scroll.ts` was identified as a potential cause — it suppresses the scroll event immediately following a wheel event to avoid double-rendering. During browser momentum, the suppressed scroll event could carry a new position.

**Fix attempted:** replaced with position-equality check (`pos === state.scrollPosition`). Did not resolve the issue — the blank frames also occur in v1 which does not have this flag.

### What's ruled out

- **Custom scrollbar rAF throttle** — fixed in issue 002, unrelated
- **Safety cap formula** (`containerSize / 1`) — inert, never clamps in practice
- **Range-unchanged fast path** — correct behavior, items are already positioned

## Possible Causes (to investigate)

1. **Browser paint timing** — at very high scroll velocities, the browser may paint before the JS pipeline has time to position items for the new scroll offset
2. **Overscan insufficiency** — the overscan buffer may not be large enough to cover the distance scrolled per frame at high velocity
3. **Event coalescing** — multiple scroll position changes within a single frame, pipeline only renders the last one but paint shows intermediate states
4. **Synchronous layout thrashing** — reading `scrollTop` after writing transforms could force a relayout

## Next Steps

- Profile with Chrome DevTools Performance panel to identify whether blank frames correlate with long frame times or paint timing
- Compare overscan buffer size vs. scroll delta per frame
- Check if increasing overscan eliminates the issue
- Investigate whether `will-change: transform` or `content-visibility` affects the behavior

## Status

**Open** — needs further investigation
