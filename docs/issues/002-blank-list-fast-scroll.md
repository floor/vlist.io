---
id: "002"
title: Blank list during fast scrollbar drag
severity: high
status: fixed
component: plugins/scrollbar
related: []
---

# Issue 002: Blank list during fast scrollbar drag

---

## Symptom

When dragging the custom scrollbar thumb quickly, the list goes completely blank — no items visible despite being present in the DOM. Items reappear when scrolling slows or stops.

v1 handles the same speed without issues.

## Root Cause

The scrollbar thumb drag handler (`src/plugins/scrollbar/scrollbar.ts:528-556`) used **rAF throttling** for the `onScroll` callback:

```typescript
// BEFORE — the bug
if (animationFrameId === null) {
  animationFrameId = requestAnimationFrame(() => {
    onScroll(lastRequestedPosition);  // sets viewport.scrollTop
    animationFrameId = null;
  });
}
```

Per the HTML spec, the browser's "update the rendering" step processes events in this order:

1. **Scroll events** (from previous `scrollTop` assignments)
2. **rAF callbacks**
3. **Paint**

This means:
1. Scroll event fires → pipeline renders items for the **previous** frame's scroll position
2. rAF callback fires → scrollbar sets `viewport.scrollTop` to the **new** position
3. Paint → items positioned for old scroll, viewport at new scroll → **blank**

Items were always one frame behind the viewport — confirmed by Puppeteer diagnostics showing `getBoundingClientRect()` of all DOM items outside the viewport despite correct `domCount` (17-18 elements).

### Why wheel scroll worked fine

The wheel handler (`src/core/scroll.ts:68-108`) sets `viewport.scrollTop` and calls the pipeline **synchronously** within the event handler, bypassing the scroll event entirely (via `wheelRendered` flag). No rAF delay.

### Why `scrollTop += delta` tests passed

The `perf-scroll.mjs` test uses `vp.scrollTop += delta` which triggers a scroll event in the same frame's scroll event processing phase. The pipeline runs for the correct position. Only the rAF-deferred scrollbar drag created the one-frame lag.

## Fix

**Commit:** `fix(scrollbar): remove rAF throttle from thumb drag to prevent one-frame lag`

Removed the rAF indirection and call `onScroll` synchronously from `handleMouseMove`. The browser naturally coalesces multiple `scrollTop` assignments per frame, so manual throttling is unnecessary.

```diff
-    // Throttle scroll callback with RAF
-    lastRequestedPosition = newPosition;
-
-    if (animationFrameId === null) {
-      animationFrameId = requestAnimationFrame(() => {
-        if (lastRequestedPosition !== null) {
-          onScroll(lastRequestedPosition);
-        }
-        animationFrameId = null;
-      });
-    }
+    // Call synchronously — rAF throttle causes a one-frame lag because
+    // the HTML spec processes scroll events BEFORE rAF callbacks, so the
+    // pipeline would always render for the previous frame's scroll position.
+    lastRequestedPosition = newPosition;
+    onScroll(newPosition);
```

Also simplified `handleMouseUp` — no longer needs to cancel rAF or flush a pending position.

## Verification

Puppeteer blank frame test (30-frame scrollbar drag across full track):
- **Before:** 30/30 blank frames (100%)
- **After:** 0/30 blank frames (0%)

**Status:** Fixed
