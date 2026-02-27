# Scrollbar Internals

> Low-level scroll controller, custom scrollbar component, and implementation details.

This page documents the internal APIs and implementation details of the scroll system. For user-facing configuration, see [Scrollbar](../features/scrollbar.md).

## Scroll Controller

### createScrollController

Creates a scroll controller for a viewport element. This is the internal scroll engine — `BuilderConfig.scroll` is the public-facing configuration that feeds into this.

```typescript
function createScrollController(
  viewport: HTMLElement,
  config?: ScrollControllerConfig
): ScrollController;

interface ScrollControllerConfig {
  /** Enable compressed scroll mode (manual wheel handling) */
  compressed?: boolean;

  /** Compression state for calculating bounds */
  compression?: CompressionState;

  /**
   * External scroll element for window/document scrolling.
   * When set, the controller listens to this element's scroll events
   * and computes list-relative positions from the viewport's bounding rect.
   */
  scrollElement?: Window;

  /** Enable horizontal scrolling mode */
  horizontal?: boolean;

  /**
   * Enable mouse wheel scrolling (default: true).
   * In horizontal mode, translates deltaY → scrollLeft.
   * When false, blocks all wheel events.
   */
  wheelScroll?: boolean;

  /** Wheel sensitivity multiplier (default: 1) */
  sensitivity?: number;

  /** Enable smooth scrolling interpolation */
  smoothing?: boolean;

  /** Idle timeout in milliseconds (default: 150) */
  idleTimeout?: number;

  /** Callback when scroll position changes */
  onScroll?: (data: ScrollEventData) => void;

  /** Callback when scrolling becomes idle */
  onIdle?: () => void;
}
```

### ScrollController Interface

```typescript
interface ScrollController {
  /** Get current scroll position */
  getScrollPosition: () => number;

  /** Set scroll position */
  scrollTo: (position: number, smooth?: boolean) => void;

  /** Scroll by delta */
  scrollBy: (delta: number) => void;

  /** Check if at top */
  isAtTop: () => boolean;

  /** Check if at bottom */
  isAtBottom: (threshold?: number) => boolean;

  /** Get scroll percentage (0-1) */
  getScrollPercentage: () => number;

  /** Get current scroll velocity (px/ms, absolute value) */
  getVelocity: () => number;

  /**
   * Check if the velocity tracker is actively tracking with enough samples.
   * Returns false during ramp-up (first few frames of a new scroll gesture)
   * when the tracker doesn't have enough samples yet.
   */
  isTracking: () => boolean;

  /** Check if currently scrolling */
  isScrolling: () => boolean;

  /** Update configuration */
  updateConfig: (config: Partial<ScrollControllerConfig>) => void;

  /** Enable compressed mode */
  enableCompression: (compression: CompressionState) => void;

  /** Disable compressed mode (revert to native scroll) */
  disableCompression: () => void;

  /** Check if compressed mode is active */
  isCompressed: () => boolean;

  /** Check if in window scroll mode */
  isWindowMode: () => boolean;

  /**
   * Update the container height used for scroll calculations.
   * In window mode, call this when the window resizes.
   */
  updateContainerHeight: (height: number) => void;

  /** Destroy and cleanup */
  destroy: () => void;
}
```

### ScrollEventData

```typescript
interface ScrollEventData {
  scrollPosition: number;
  direction: 'up' | 'down';
  velocity: number;
}
```

## Custom Scrollbar

### createScrollbar

Creates a custom scrollbar for a viewport. Works in both compressed and native scroll modes, and supports both vertical and horizontal orientation.

```typescript
function createScrollbar(
  viewport: HTMLElement,
  onScroll: ScrollCallback,
  config?: ScrollbarConfig,
  classPrefix?: string,
  horizontal?: boolean
): Scrollbar;

type ScrollCallback = (position: number) => void;

interface ScrollbarConfig {
  /** Auto-hide scrollbar after idle (default: true) */
  autoHide?: boolean;

  /** Auto-hide delay in milliseconds (default: 1000) */
  autoHideDelay?: number;

  /** Minimum thumb size in pixels (default: 30) */
  minThumbSize?: number;

  /** Show scrollbar when hovering near the scrollbar edge (default: true) */
  showOnHover?: boolean;

  /** Width of the invisible hover zone in pixels (default: 16) */
  hoverZoneWidth?: number;

  /** Show scrollbar when the mouse enters the list viewport (default: true) */
  showOnViewportEnter?: boolean;
}
```

The `horizontal` parameter (default `false`) switches the scrollbar to horizontal orientation — rendering along the bottom edge, using `translateX` for thumb positioning, and tracking `clientX` during drag.

### Scrollbar Interface

```typescript
interface Scrollbar {
  /** Show the scrollbar */
  show: () => void;

  /** Hide the scrollbar */
  hide: () => void;

  /** Update scrollbar dimensions */
  updateBounds: (totalSize: number, containerSize: number) => void;

  /** Update thumb position */
  updatePosition: (scrollPosition: number) => void;

  /** Check if scrollbar is visible */
  isVisible: () => boolean;

  /** Destroy and cleanup */
  destroy: () => void;
}
```

## Utility Functions

### rafThrottle

Throttle a function using requestAnimationFrame.

```typescript
function rafThrottle<T extends (...args: any[]) => void>(
  fn: T
): ((...args: Parameters<T>) => void) & { cancel: () => void };

// Usage
const throttledScroll = rafThrottle(handleScroll);
element.addEventListener('scroll', throttledScroll);

// Cleanup
throttledScroll.cancel();
```

### Scroll Position Utilities

```typescript
// Check if at bottom of scrollable area
function isAtBottom(
  scrollPosition: number,
  scrollSize: number,
  clientSize: number,
  threshold?: number
): boolean;

// Check if at top
function isAtTop(scrollPosition: number, threshold?: number): boolean;

// Get scroll percentage (0-1)
function getScrollPercentage(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number;

// Check if a range is visible in scroll viewport
function isRangeVisible(
  rangeStart: number,
  rangeEnd: number,
  visibleStart: number,
  visibleEnd: number
): boolean;
```

## Complete Manual Integration

Using the low-level scroll controller and scrollbar directly:

```typescript
import { createScrollController, createScrollbar, getCompressionState } from '@floor/vlist';

function createScrollSystem(viewport, totalItems, itemHeight) {
  const compression = getCompressionState(totalItems, itemHeight);

  const controller = createScrollController(viewport, {
    compressed: compression.isCompressed,
    compression: compression.isCompressed ? compression : undefined,
    onScroll: handleScroll,
    onIdle: handleIdle,
  });

  const scrollbar = createScrollbar(
    viewport,
    (position) => controller.scrollTo(position),
    { autoHide: true },
    'vlist',
    false // vertical
  );

  scrollbar.updateBounds(compression.virtualHeight, viewport.clientHeight);

  function handleScroll({ scrollTop }) {
    scrollbar.updatePosition(scrollTop);
    scrollbar.show();
    updateViewport(scrollTop);
  }

  function handleIdle() {
    // scrollbar auto-hides via its own timer
  }

  return {
    controller,
    scrollbar,
    destroy: () => {
      controller.destroy();
      scrollbar.destroy();
    },
  };
}
```

## Scroll Mode Implementation

### Native Mode

In native mode, the controller listens to the standard scroll event:

```typescript
// Native mode setup
viewport.style.overflow = 'auto';       // vertical
// or
viewport.style.overflow = 'hidden';     // horizontal
viewport.style.overflowX = 'auto';

viewport.addEventListener('scroll', handleNativeScroll, { passive: true });

function handleNativeScroll() {
  const scrollTop = viewport[scrollProp]; // scrollTop or scrollLeft
  // Update state, trigger callbacks
}
```

### Window Mode

In window mode, the controller listens to `window.scroll` and computes the list-relative position from the viewport's bounding rect:

```typescript
// Window mode setup — no overflow changes, no wheel interception
window.addEventListener('scroll', handleWindowScroll, { passive: true });

function handleWindowScroll() {
  // The viewport's bounding rect tells us how far the list has scrolled
  // relative to the window. When rect.top = 0, scrollTop = 0.
  // When rect.top = -500, the list has scrolled 500px past the window top.
  const rect = viewport.getBoundingClientRect();
  const scrollTop = Math.max(0, -rect.top);
  // Update state, trigger callbacks
}
```

**Key differences from native/compressed modes:**

| Aspect | Native/Compressed | Window |
|--------|-------------------|--------|
| Scroll listener | `viewport.scroll` / `viewport.wheel` | `window.scroll` |
| `getScrollTop()` | `viewport.scrollTop` / tracked position | tracked `scrollPosition` |
| `scrollTo(pos)` | `viewport.scrollTop = pos` / tracked | `window.scrollTo(listDocumentTop + pos)` |
| Compression | Changes overflow, intercepts wheel | Purely mathematical (no overflow/wheel changes) |
| Custom scrollbar | Per config (default: custom) | Disabled (browser scrollbar used) |

### Compressed Mode

In compressed mode, the controller intercepts wheel events:

```typescript
// Compressed mode setup
viewport.style.overflow = 'hidden';  // Hide native scrollbar
viewport.addEventListener('wheel', handleWheel, { passive: false });

function handleWheel(event: WheelEvent) {
  event.preventDefault();  // Prevent page scroll

  const delta = event.deltaY * sensitivity;
  scrollPosition = clamp(scrollPosition + delta, 0, maxScroll);

  // Trigger callbacks with virtual scroll position
}
```

### Wheel Interception (Native Mode)

In native mode, an optional wheel listener handles two scenarios:

```typescript
const handleWheelScroll = (event: WheelEvent): void => {
  if (horizontal && wheelScroll) {
    // Translate deltaY → scrollLeft (skip if deltaX is already present)
    if (event.deltaX !== 0 || event.deltaY === 0) return;
    event.preventDefault();
    viewport.scrollLeft += event.deltaY * sensitivity;
  } else {
    // wheelScroll disabled — block all wheel events
    event.preventDefault();
  }
};

// Attached when: horizontal mode OR wheelScroll is false
const needsWheelListener = horizontal || !wheelScroll;
if (needsWheelListener) {
  viewport.addEventListener('wheel', handleWheelScroll, { passive: false });
}
```

### Scroll Position Conversion

When switching between native and compressed modes, scroll position is converted:

```typescript
// Native → Compressed
const ratio = viewport.scrollTop / (actualHeight - viewport.clientHeight);
scrollPosition = ratio * maxScroll;

// Compressed → Native
const ratio = scrollPosition / maxScroll;
viewport.scrollTop = ratio * (actualHeight - viewport.clientHeight);
```

> **Note:** In window mode, `enableCompression` and `disableCompression` skip overflow and wheel changes entirely — compression is purely mathematical. The content div height is set to the virtual height by `vlist.ts`, and the browser scrolls natively.

### Native Scrollbar Hiding

The `vlist-viewport--custom-scrollbar` CSS class is added to the viewport in these scenarios:

1. **Custom scrollbar is active** — hides native to avoid double scrollbar
2. **`scrollbar: 'none'`** — hides native, no custom is created
3. **`wheel: false`** — hides native to prevent scrollbar-drag scrolling

This class uses `scrollbar-width: none` (Firefox), `-ms-overflow-style: none` (IE/Edge), and `::-webkit-scrollbar { display: none }` (Chrome/Safari) to hide the native scrollbar while keeping `overflow: auto` for programmatic scroll support.

### Idle Detection

The controller detects when scrolling stops using a configurable timeout (default: 150ms):

```typescript
let idleTimer: number | null = null;

function scheduleIdleCheck() {
  if (idleTimer) clearTimeout(idleTimer);

  idleTimer = setTimeout(() => {
    isScrolling = false;
    onIdle?.();  // Triggers pending loads, removes .vlist--scrolling, resets velocity
  }, config.idleTimeout ?? 150);  // Configurable via scroll.idleTimeout
}
```

## Performance Internals

### Passive Event Listeners

Native scroll and window scroll use passive listeners for better performance:

```typescript
viewport.addEventListener('scroll', handler, { passive: true });
```

Wheel interception (compressed mode, horizontal translation, wheel blocking) uses `{ passive: false }` to allow `preventDefault()`.

### RAF Throttling

In native mode, `handleNativeScroll` is wrapped with `rafThrottle` to guarantee at most one scroll processing per animation frame, preventing redundant work:

```typescript
const throttledScroll = rafThrottle(handleNativeScroll);
viewport.addEventListener('scroll', throttledScroll, { passive: true });
```

### Velocity Sampling (Circular Buffer)

Velocity is calculated using a pre-allocated circular buffer of 8 samples:

```typescript
const SAMPLE_COUNT = 8;
const STALE_GAP_MS = 100;
const MIN_RELIABLE_SAMPLES = 3;

function updateVelocityTracker(tracker, newPosition) {
  const now = performance.now();
  const timeDelta = now - tracker.lastTime;

  // Stale gap detection: reset buffer after a pause (>100ms)
  // Prevents bogus low velocity from small_delta / huge_time_gap
  if (timeDelta > STALE_GAP_MS) {
    tracker.sampleCount = 0;
    tracker.sampleIndex = 0;
    tracker.velocity = 0;
    // Record baseline — real velocity computed on next update
    tracker.samples[0] = { position: newPosition, time: now };
    tracker.sampleIndex = 1;
    tracker.sampleCount = 1;
    return tracker;
  }

  // Write to current slot (no allocation)
  const currentSample = tracker.samples[tracker.sampleIndex]!;
  currentSample.position = newPosition;
  currentSample.time = now;

  // Advance index (wrap around)
  tracker.sampleIndex = (tracker.sampleIndex + 1) % SAMPLE_COUNT;
  tracker.sampleCount = Math.min(tracker.sampleCount + 1, SAMPLE_COUNT);

  // Calculate average velocity (only with enough data)
  if (tracker.sampleCount >= 2) {
    const oldestIndex = (tracker.sampleIndex - tracker.sampleCount + SAMPLE_COUNT) % SAMPLE_COUNT;
    const oldest = tracker.samples[oldestIndex]!;
    tracker.velocity = (newPosition - oldest.position) / (now - oldest.time);
  }

  return tracker;
}

// Reliability check — used by scroll handler to defer loading during ramp-up
function isTrackerReliable(tracker) {
  return tracker.sampleCount >= MIN_RELIABLE_SAMPLES;
}
```

This approach:
- Eliminates array allocation and garbage collection during scrolling
- Detects stale gaps after idle to prevent misleading velocity readings
- Provides explicit reliability signaling via `isTracking()`

## Scrollbar Interactions

### Track Click

Click on track jumps to position (works for both vertical and horizontal):

```typescript
function handleTrackClick(event: MouseEvent) {
  const trackRect = track.getBoundingClientRect();
  const clickPos = event[clientPosProp] - trackRect[rectPosProp]; // clientY/clientX

  // Center thumb at click position
  const thumbTop = clickPos - thumbSize / 2;
  const scrollRatio = thumbTop / maxThumbTravel;
  const scrollPosition = scrollRatio * maxScroll;

  onScroll(scrollPosition);
}
```

### Thumb Drag

Drag thumb to scroll proportionally:

```typescript
function handleMouseMove(event: MouseEvent) {
  const delta = event[clientPosProp] - dragStartPos; // clientY/clientX delta
  const scrollDelta = (delta / maxThumbTravel) * maxScroll;
  const newPosition = dragStartScrollPosition + scrollDelta;

  // Update thumb immediately for responsive feel
  thumb.style.transform = translateFn(newPosition / maxScroll * maxThumbTravel);

  // Throttle scroll callback with RAF
  onScroll(clamp(newPosition, 0, maxScroll));
}
```

## Technical Notes

### Smooth Scroll Rendering Fix (v0.4.0)

**Issue:** In versions prior to 0.4.0, smooth scrolling and scrollbar dragging showed a blank list during animation in non-compressed mode. Items only appeared when the animation completed.

**Root Cause:** The internal `lastScrollTop` state variable was not being updated before calling `renderIfNeeded()`, causing the visible range calculation to use stale scroll position values. This made the renderer think the range hadn't changed, so it skipped rendering.

**Execution Flow (Broken):**
```typescript
scrollSetTop(newPos);     // Update DOM scroll position
renderIfNeeded();         // ❌ Uses OLD lastScrollTop value
// Range appears unchanged → skips rendering
// Native scroll event fires later → updates lastScrollTop (too late!)
```

**Solution:** Update `lastScrollTop` immediately after updating the scroll position and before rendering:

```typescript
scrollSetTop(newPos);     // Update DOM
lastScrollTop = newPos;   // Update state
renderIfNeeded();         // ✅ Uses correct value
```

**Locations Fixed:**
1. `animateScroll()` function (smooth scroll animations)
2. Scroll controller proxy `scrollTo()` method (scrollbar dragging)
3. Scroll controller proxy `scrollBy()` method (programmatic scrolling)

**Impact:** Only affected non-compressed mode (lists < ~500K items). Compressed mode already worked correctly due to its different scroll mechanism.

This pattern already existed in other parts of the codebase (reverse mode, appendItems, prependItems) but was missing from scroll operations. The fix ensures state and DOM updates happen synchronously.

## Related Modules

- [Scrollbar](../features/scrollbar.md) — User-facing scroll configuration and usage examples
- [Scale](../features/scale.md) — Compression state for large lists
- [Rendering](./rendering.md) — Viewport state management
- [Context](./context.md) — BuilderContext holds scroll controller and wires event handlers

---

*Internal scroll APIs for advanced use cases and feature authoring. Most users should use `BuilderConfig.scroll` — see [Scrollbar](../features/scrollbar.md).*