# Scroll Module

> Scroll controller, custom scrollbar, and wheel behavior for vlist.

## Overview

The scroll module handles all scrolling functionality in vlist, including:

- **Scroll Configuration** — unified `scroll` config with wheel, scrollbar, window, and idle settings
- **Custom Scrollbar** — cross-browser consistent scrollbar (the default), with auto-hide and drag support
- **Native Scrolling** — standard browser scrolling with native scrollbar
- **Compressed Scrolling** — manual wheel-based scrolling for large lists (1M+ items)
- **Window Scrolling** — document-level scrolling where the list participates in the page flow
- **Horizontal Scrolling** — left-to-right scrolling with axis-aware positioning and wheel translation
- **Wheel Control** — enable/disable mouse wheel scrolling independently from the scrollbar
- **Velocity Tracking** — smooth scroll momentum detection for smart data loading
- **Scroll Save/Restore** — `getScrollSnapshot()` / `restoreScroll()` for SPA navigation (see [methods.md](./methods.md#snapshot-methods))

## Module Structure

```
src/scroll/
├── index.ts       # Module exports
├── controller.ts  # Scroll controller (native + compressed + window + horizontal modes)
└── scrollbar.ts   # Custom scrollbar component (vertical + horizontal)
```

## Scroll Configuration

All scroll-related settings live under a single `scroll` config object on `VListConfig`:

```typescript
createVList({
  container: '#app',
  item: { height: 48, template: (item) => item.name },
  scroll: {
    wheel: true,                     // enable/disable mouse wheel
    scrollbar: ...,                  // 'native' | 'none' | { options }
    element: window,                 // external scroll element
    idleTimeout: 150,                // idle detection timeout (ms)
  },
});
```

### `scroll.wheel`

**Type:** `boolean`
**Default:** `true`

Controls whether mouse wheel scrolling is enabled.

| Direction | `wheel: true` (default) | `wheel: false` |
|-----------|-------------------------|-----------------|
| **Vertical** | Normal browser wheel scrolling | Wheel events blocked entirely |
| **Horizontal** | Vertical wheel (deltaY) translated to horizontal scroll | Wheel events blocked entirely |

When `true` in horizontal mode, vlist intercepts vertical mouse wheel events (`deltaY`) and translates them into horizontal scroll — so users don't need Shift or a trackpad to scroll. If the user is already producing `deltaX` (trackpad swipe), the browser handles it natively.

When `false`, all wheel events are intercepted and `preventDefault()`'d. The native scrollbar is also hidden (via CSS) to prevent scrollbar-drag scrolling. Navigation must happen through programmatic means — buttons, keyboard, or custom UI.

```typescript
// Default — wheel scrolling enabled
createVList({
  container: '#app',
  item: { height: 48, template },
  // scroll.wheel defaults to true
});

// Disable wheel — button-only navigation
createVList({
  container: '#app',
  item: { height: 48, template },
  scroll: { wheel: false, scrollbar: 'none' },
});
```

### `scroll.scrollbar`

**Type:** `'native' | 'none' | ScrollbarOptions`
**Default:** custom scrollbar (when omitted)

Controls which scrollbar is displayed. The three modes:

| Value | Scrollbar shown | Native hidden | Notes |
|-------|----------------|---------------|-------|
| *omitted* | **Custom** | Yes | Default — consistent cross-browser styling |
| `'native'` | **Browser native** | No | Falls back to custom in compressed mode |
| `'none'` | **None** | Yes | No scrollbar at all |
| `{ autoHide: false }` | **Custom** (configured) | Yes | Object form for fine-tuning |

#### Custom Scrollbar (default)

When `scrollbar` is omitted or an options object is passed, vlist renders its own scrollbar overlay and hides the browser's native scrollbar via CSS. This gives a consistent look across browsers and full control over styling via CSS variables.

The custom scrollbar works in **all modes** — native scroll, compressed scroll, and horizontal scroll.

```typescript
// Default — custom scrollbar with default options
createVList({ container, item });

// Custom scrollbar, always visible (no auto-hide)
createVList({
  container,
  item,
  scroll: { scrollbar: { autoHide: false } },
});

// Custom scrollbar with slow fade
createVList({
  container,
  item,
  scroll: { scrollbar: { autoHide: true, autoHideDelay: 3000 } },
});
```

**Custom scrollbar options (ScrollbarOptions):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoHide` | `boolean` | `true` | Auto-hide scrollbar after idle |
| `autoHideDelay` | `number` | `1000` | Auto-hide delay in milliseconds |
| `minThumbSize` | `number` | `30` | Minimum thumb size in pixels |

#### Native Scrollbar

When `scrollbar: 'native'` is set, the browser's built-in scrollbar is used. This is useful when you want the OS-native look and feel, or when your app already has a scrollbar styling strategy.

In compressed mode (large lists where `overflow: hidden` is required), native scrollbar is not available — vlist automatically falls back to the custom scrollbar.

```typescript
createVList({
  container,
  item,
  scroll: { scrollbar: 'native' },
});
```

#### No Scrollbar

When `scrollbar: 'none'` is set, no scrollbar is shown at all — neither custom nor native. The native scrollbar is hidden via CSS. Useful for:

- Button-only navigation (wizards, step-by-step flows)
- Drag-to-scroll interfaces
- Kiosk or embedded UIs where scroll chrome is unwanted

```typescript
createVList({
  container,
  item,
  scroll: { wheel: false, scrollbar: 'none' },
});
```

### `scroll.element`

**Type:** `Window`
**Default:** `undefined`

When set, the list scrolls with this element instead of its own container. Pass `window` for document-level scrolling (the most common use case).

In window mode:
- The list participates in the normal page flow (no inner scrollbar)
- The browser's native scrollbar controls scrolling
- Compression still works (purely mathematical — no overflow or wheel changes)
- Custom scrollbar is disabled (the browser scrollbar is used)
- Cannot be combined with `direction: 'horizontal'`

```typescript
createVList({
  container: '#list',
  item: { height: 48, template },
  scroll: { element: window },
});
```

See [Window Scrolling](#window-scrolling) for detailed behavior.

### `scroll.idleTimeout`

**Type:** `number`
**Default:** `150`

Milliseconds after the last scroll event before the list is considered "idle". When idle is detected, vlist:

- Loads any pending data ranges skipped during fast scrolling
- Re-enables CSS transitions (removes `.vlist--scrolling` class)
- Resets the velocity tracker

```typescript
createVList({
  container: '#list',
  item: { height: 48, template },
  scroll: { idleTimeout: 200 },
});
```

**Tuning tips:**
- **Mobile/touch devices:** Increase to 200–300ms (scroll events have larger gaps)
- **Desktop with smooth scroll:** Default 150ms works well
- **Aggressive loading:** Decrease to 100ms (loads data sooner after scroll stops)

### Full `ScrollConfig` Interface

```typescript
interface ScrollConfig {
  /** Enable mouse wheel scrolling (default: true) */
  wheel?: boolean;

  /** Scrollbar mode (default: custom scrollbar) */
  scrollbar?: 'native' | 'none' | ScrollbarOptions;

  /** External scroll element for window scrolling */
  element?: Window;

  /** Scroll idle detection timeout in ms (default: 150) */
  idleTimeout?: number;
}

interface ScrollbarOptions {
  /** Auto-hide scrollbar after idle (default: true) */
  autoHide?: boolean;

  /** Auto-hide delay in milliseconds (default: 1000) */
  autoHideDelay?: number;

  /** Minimum thumb size in pixels (default: 30) */
  minThumbSize?: number;
}
```

## Key Concepts

### Independence of Wheel and Scrollbar

`wheel` and `scrollbar` are fully independent — any combination is valid:

| `wheel` | `scrollbar` | Use case |
|---------|-------------|----------|
| `true` | *(default)* | Standard list — wheel + custom scrollbar |
| `true` | `'native'` | Wheel + browser-native scrollbar |
| `true` | `'none'` | Wheel scrolling, no visible scrollbar |
| `false` | *(default)* | Custom scrollbar drag only, no wheel |
| `false` | `'native'` | Native scrollbar drag only, no wheel |
| `false` | `'none'` | Button-only / programmatic navigation |

### Scroll Transition Suppression

During active scrolling, vlist toggles a `.vlist--scrolling` class on the root element. This disables CSS transitions on items to prevent visual jank from transition animations fighting with rapid position updates. When scrolling becomes idle, the class is removed and transitions are re-enabled.

```
Scroll starts → add .vlist--scrolling (transitions disabled)
    ↓
Scrolling active...
    ↓
Scroll stops (idle detected) → remove .vlist--scrolling (transitions re-enabled)
```

### Scroll Modes

The scroll controller operates in multiple modes:

| Mode | Trigger | Behavior |
|------|---------|----------|
| **Native** | Small lists (< ~333K items @ 48px) | `overflow: auto`, browser handles scrolling |
| **Compressed** | Large lists (> browser limit) | `overflow: hidden`, manual wheel handling |
| **Window** | `scroll.element: window` | `overflow: visible`, browser scrolls the page |
| **Horizontal** | `direction: 'horizontal'` | `overflow-x: auto`, reads `scrollLeft` instead of `scrollTop` |

### Mode Switching

```
List Created
    ↓
scroll.element: window?
    ↓
Yes → Window Mode (window scroll events)
No  → Check: totalItems × itemHeight > 16M?
        ↓
      Yes → Compressed Mode (wheel events + custom scrollbar)
      No  → Native Mode (scroll events + scrollbar per config)
```

### Window Scrolling

When `scroll.element: window` is set, the list participates in the normal page flow instead of scrolling inside its own container. This is ideal for search results, feeds, landing pages, and any UI where the list should scroll with the document.

**How it works:**

1. The viewport is set to `overflow: visible` and `height: auto` — no inner scrollbar
2. The scroll controller listens to `window.scroll` (RAF-throttled, passive)
3. The list-relative scroll position is computed from `viewport.getBoundingClientRect().top`
4. Container height is derived from `window.innerHeight` and updated on window resize
5. The browser's native scrollbar is used (custom scrollbar is disabled)

**Compression in window mode:** Compression still works — the content div height is set to the virtual height, and the browser scrolls natively. The compression math (ratio-based position mapping) is purely mathematical; no overflow changes or wheel interception are needed.

```
Page Layout (Window Mode)
┌──────────────────────────┐
│  Page header / nav       │
├──────────────────────────┤
│  VList viewport          │  ← overflow: visible, height: auto
│  ┌────────────────────┐  │
│  │ content div         │  │  ← height = totalHeight (or virtualHeight)
│  │  ┌──────────────┐  │  │
│  │  │ visible items │  │  │  ← positioned within content
│  │  └──────────────┘  │  │
│  └────────────────────┘  │
├──────────────────────────┤
│  Page footer             │
└──────────────────────────┘
     ↕ browser scrollbar scrolls the whole page
```

### Horizontal Scrolling

When `direction: 'horizontal'` is set, the scroll controller adapts all axis-dependent behavior:

| Aspect | Vertical (default) | Horizontal |
|--------|-------------------|------------|
| Scroll property | `scrollTop` | `scrollLeft` |
| Overflow | `overflow: auto` | `overflow-x: auto` |
| Content sizing | `height` set dynamically | `width` set dynamically |
| Item positioning | `translateY` | `translateX` |
| Wheel event | `deltaY` (native) | `deltaY` → `scrollLeft` (translated) |
| Custom scrollbar | Right edge, vertical thumb | Bottom edge, horizontal thumb |

The custom scrollbar automatically adjusts for horizontal mode — it renders along the bottom edge with a horizontal thumb, using `translateX` for positioning and `clientX` for drag tracking.

### Wheel Event Handling

vlist intercepts wheel events in several scenarios:

| Scenario | What happens |
|----------|-------------|
| Vertical + `wheel: true` | No interception — browser handles it natively |
| Vertical + `wheel: false` | Intercept + `preventDefault()` — block all wheel scroll |
| Horizontal + `wheel: true` | Intercept `deltaY` → translate to `scrollLeft`; pass through `deltaX` |
| Horizontal + `wheel: false` | Intercept + `preventDefault()` — block all wheel scroll |
| Compressed mode (any) | Intercept + manual scroll position tracking |

When `wheel: false`, the wheel listener uses `{ passive: false }` to allow `preventDefault()`.

### Velocity Tracking

The controller tracks scroll velocity using a **circular buffer** for optimal performance (zero allocations during scrolling):

```typescript
interface VelocityTracker {
  velocity: number;      // Current velocity (px/ms)
  lastPosition: number;  // Previous scroll position
  lastTime: number;      // Timestamp of last update
  samples: VelocitySample[];  // Pre-allocated circular buffer (8 samples)
  sampleIndex: number;   // Current write index
  sampleCount: number;   // Number of valid samples (0-8)
}

interface VelocitySample {
  position: number;
  time: number;
}
```

The circular buffer pre-allocates 8 sample slots and overwrites the oldest sample on each update, avoiding array allocation/spread operations during scrolling.

**Key constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `VELOCITY_SAMPLE_COUNT` | 8 | Buffer size (~133ms window at 60fps) for smooth averaging |
| `MIN_RELIABLE_SAMPLES` | 3 | Minimum samples before `isTracking()` returns true |
| `STALE_GAP_MS` | 100 | Max gap (ms) before buffer is considered stale |

**Stale gap detection:** When more than 100ms passes between samples (e.g., after idle resets the tracker), the buffer is cleared and the current position becomes the new baseline. This prevents computing bogus low velocity from `small_delta / huge_time_gap` — a problem that caused spurious API requests at the start of scrollbar drags.

**Reliability tracking:** `isTracking()` returns `false` until at least 3 samples have accumulated. The scroll handler uses this to defer loading during the ramp-up phase of a new scroll gesture, rather than trusting near-zero velocity readings.

## API Reference

### Scroll Controller

#### `createScrollController`

Creates a scroll controller for a viewport element. This is the internal scroll engine — `VListConfig.scroll` is the public-facing configuration that feeds into this.

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

#### ScrollController Interface

```typescript
interface ScrollController {
  /** Get current scroll position */
  getScrollTop: () => number;

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

#### ScrollEventData

```typescript
interface ScrollEventData {
  scrollTop: number;
  direction: 'up' | 'down';
  velocity: number;
}
```

### Custom Scrollbar

#### `createScrollbar`

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
  /** Enable scrollbar (default: true) */
  enabled?: boolean;

  /** Auto-hide scrollbar after idle (default: true) */
  autoHide?: boolean;

  /** Auto-hide delay in milliseconds (default: 1000) */
  autoHideDelay?: number;

  /** Minimum thumb size in pixels (default: 30) */
  minThumbSize?: number;
}
```

The `horizontal` parameter (default `false`) switches the scrollbar to horizontal orientation — rendering along the bottom edge, using `translateX` for thumb positioning, and tracking `clientX` during drag.

#### Scrollbar Interface

```typescript
interface Scrollbar {
  /** Show the scrollbar */
  show: () => void;

  /** Hide the scrollbar */
  hide: () => void;

  /** Update scrollbar dimensions */
  updateBounds: (totalSize: number, containerSize: number) => void;

  /** Update thumb position */
  updatePosition: (scrollTop: number) => void;

  /** Check if scrollbar is visible */
  isVisible: () => boolean;

  /** Destroy and cleanup */
  destroy: () => void;
}
```

### Utility Functions

#### `rafThrottle`

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

#### Scroll Position Utilities

```typescript
// Check if at bottom of scrollable area
function isAtBottom(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number,
  threshold?: number
): boolean;

// Check if at top
function isAtTop(scrollTop: number, threshold?: number): boolean;

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

## Usage Examples

### Default — Custom Scrollbar

The default experience: custom scrollbar, wheel enabled, everything automatic.

```typescript
import { createVList } from 'vlist';

const list = createVList({
  container: '#app',
  item: { height: 48, template: (item) => `<div>${item.name}</div>` },
  items: myData,
});
```

### Custom Scrollbar with Options

Fine-tune the custom scrollbar — disable auto-hide so it's always visible:

```typescript
const list = createVList({
  container: '#app',
  item: { height: 48, template },
  items: myData,
  scroll: {
    scrollbar: { autoHide: false },
  },
});
```

### Native Browser Scrollbar

Opt into the browser's built-in scrollbar:

```typescript
const list = createVList({
  container: '#app',
  item: { height: 48, template },
  items: myData,
  scroll: {
    scrollbar: 'native',
  },
});
```

### Button-Only Navigation (Wizard)

Disable wheel and hide all scrollbars — navigation is entirely programmatic:

```typescript
const list = createVList({
  container: '#wizard',
  item: { height: 400, template: renderStep },
  items: wizardSteps,
  scroll: { wheel: false, scrollbar: 'none' },
});

// Navigate with buttons
document.getElementById('next').addEventListener('click', () => {
  currentStep++;
  list.scrollToIndex(currentStep, { align: 'start', behavior: 'smooth', duration: 350 });
});

document.getElementById('prev').addEventListener('click', () => {
  currentStep--;
  list.scrollToIndex(currentStep, { align: 'start', behavior: 'smooth', duration: 350 });
});
```

### Horizontal Carousel

Horizontal list with wheel translation and no visible scrollbar:

```typescript
const list = createVList({
  container: '#carousel',
  direction: 'horizontal',
  item: { width: 200, template: renderCard },
  items: cards,
  scroll: { scrollbar: 'none' },
  // wheel defaults to true — deltaY is translated to horizontal scroll
});
```

### Horizontal — Buttons Only

Horizontal list with no wheel, no scrollbar — arrow buttons only:

```typescript
const list = createVList({
  container: '#carousel',
  direction: 'horizontal',
  item: { width: 200, template: renderCard },
  items: cards,
  scroll: { wheel: false, scrollbar: 'none' },
});

// Prev / Next buttons
btnPrev.addEventListener('click', () => list.scrollToIndex(current - 1));
btnNext.addEventListener('click', () => list.scrollToIndex(current + 1));
```

### Window Scrolling

The list scrolls with the page — no inner container scrollbar:

```typescript
const list = createVList({
  container: '#list',
  item: { height: 88, template: renderUser },
  scroll: { element: window },
  adapter: {
    read: async ({ offset, limit }) => fetchUsers(offset, limit),
  },
});
```

### Scrollbar Drag Only (No Wheel)

Custom scrollbar visible for dragging, but wheel is disabled — useful for embedded contexts where the wheel should scroll the parent page:

```typescript
const list = createVList({
  container: '#sidebar-list',
  item: { height: 36, template: renderMenuItem },
  items: menuItems,
  scroll: { wheel: false },
  // scrollbar defaults to custom — user can drag the scrollbar
});
```

### Aggressive Idle Detection

Load data as soon as scrolling stops (100ms instead of default 150ms):

```typescript
const list = createVList({
  container: '#feed',
  item: { height: 120, template: renderPost },
  adapter: myAdapter,
  scroll: { idleTimeout: 100 },
});
```

### Complete Manual Integration

Using the low-level scroll controller and scrollbar directly:

```typescript
import { createScrollController, createScrollbar } from 'vlist';
import { getCompressionState } from 'vlist';

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

## Scrollbar Styling

### CSS Classes

The custom scrollbar uses these CSS classes (prefix defaults to `vlist`):

```css
/* Track — positioned absolutely inside the viewport */
.vlist-scrollbar {
  position: absolute;
  top: 0;
  right: 0;
  width: var(--vlist-scrollbar-width, 8px);
  height: 100%;
  background: var(--vlist-scrollbar-track-bg, transparent);
  opacity: 0;
  transition: opacity 0.2s;
}

/* Visible state */
.vlist-scrollbar--visible {
  opacity: 1;
}

/* During drag */
.vlist-scrollbar--dragging {
  opacity: 1;
}

/* Thumb */
.vlist-scrollbar-thumb {
  position: absolute;
  width: 100%;
  background: var(--vlist-scrollbar-custom-thumb-bg, rgba(0, 0, 0, 0.3));
  border-radius: var(--vlist-scrollbar-custom-thumb-radius, 4px);
  cursor: pointer;
}

.vlist-scrollbar-thumb:hover {
  background: var(--vlist-scrollbar-custom-thumb-hover-bg, rgba(0, 0, 0, 0.5));
}
```

#### Horizontal Scrollbar CSS

When `direction: 'horizontal'` is set, the scrollbar renders along the bottom edge:

```css
/* Horizontal track — along the bottom */
.vlist--horizontal .vlist-scrollbar {
  top: auto;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  height: var(--vlist-scrollbar-width);
}

/* Horizontal thumb */
.vlist--horizontal .vlist-scrollbar-thumb {
  top: 0;
  left: 0;
  bottom: 0;
  width: auto;
  height: 100%;
}
```

#### Hidden Native Scrollbar CSS

When the custom scrollbar is active or `wheel: false` / `scrollbar: 'none'`, the native scrollbar is hidden:

```css
.vlist-viewport--custom-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.vlist-viewport--custom-scrollbar::-webkit-scrollbar {
  display: none;
}

/* Override for horizontal webkit scrollbar */
.vlist--horizontal .vlist-viewport--custom-scrollbar::-webkit-scrollbar {
  display: none;
  height: 0;
}
```

### CSS Variables

Customize the scrollbar appearance with CSS custom properties:

```css
:root {
  --vlist-scrollbar-width: 8px;
  --vlist-scrollbar-track-bg: transparent;
  --vlist-scrollbar-custom-thumb-bg: rgba(0, 0, 0, 0.3);
  --vlist-scrollbar-custom-thumb-hover-bg: rgba(0, 0, 0, 0.5);
  --vlist-scrollbar-custom-thumb-radius: 4px;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --vlist-scrollbar-custom-thumb-bg: rgba(255, 255, 255, 0.3);
    --vlist-scrollbar-custom-thumb-hover-bg: rgba(255, 255, 255, 0.5);
  }
}
```

## Implementation Details

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

## Performance Considerations

### Passive Event Listeners

Native scroll and window scroll use passive listeners for better performance:

```typescript
viewport.addEventListener('scroll', handler, { passive: true });
```

Wheel interception (compressed mode, horizontal translation, wheel blocking) uses `{ passive: false }` to allow `preventDefault()`.

### RAF Throttling

Use `rafThrottle` to limit callback frequency:

```typescript
const throttledCallback = rafThrottle((scrollTop) => {
  // Heavy operations
  updateViewport(scrollTop);
});
```

### RAF-Throttled Native Scroll

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

## Migration from Old API

The `scroll` config replaces four root-level options:

| Old API | New API |
|---------|---------|
| `scrollElement: window` | `scroll: { element: window }` |
| `idleTimeout: 200` | `scroll: { idleTimeout: 200 }` |
| `wheelScroll: false` | `scroll: { wheel: false }` |
| `scrollbar: { enabled: true }` | `scroll: { scrollbar: { autoHide: true } }` |
| `scrollbar: { enabled: false }` | `scroll: { scrollbar: 'none' }` |

**Before:**
```typescript
createVList({
  container: '#app',
  item: { height: 48, template },
  scrollElement: window,
  idleTimeout: 200,
  wheelScroll: false,
  scrollbar: { enabled: true, autoHide: false },
});
```

**After:**
```typescript
createVList({
  container: '#app',
  item: { height: 48, template },
  scroll: {
    element: window,
    idleTimeout: 200,
    wheel: false,
    scrollbar: { autoHide: false },
  },
});
```

**Scrollbar mode mapping:**

| Old | New | Behavior |
|-----|-----|----------|
| *(omitted)* | *(omitted)* | Custom scrollbar (now the default for all lists) |
| `scrollbar: { enabled: true }` | *(omitted)* or `{ autoHide: ... }` | Custom scrollbar |
| `scrollbar: { enabled: false }` | `scrollbar: 'none'` | No scrollbar |
| *(no equivalent)* | `scrollbar: 'native'` | Browser's native scrollbar |

## Related Modules

- [methods.md](./methods.md#snapshot-methods) — Scroll save/restore (`getScrollSnapshot` / `restoreScroll`)
- [compression.md](./compression.md) — Compression state for large lists
- [render.md](./render.md) — Viewport state management
- [handlers.md](./handlers.md) — Scroll event handler
- [context.md](./context.md) — Context holds scroll controller
- [optimization.md](./optimization.md) — Full list of scroll-related optimizations
- [styles.md](./styles.md) — `.vlist--scrolling` class and CSS containment
- [vlist.md](./vlist.md) — Main vlist documentation (window scrolling, scroll save/restore)

---

*The scroll module provides seamless scrolling for lists of any size — custom scrollbar by default, native as an option, or no scrollbar at all.*