# Scrollbar Module

> Custom scrollbar UI with auto-hide and smooth dragging.

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
- **Scroll Save/Restore** — `getScrollSnapshot()` / `restoreScroll()` for SPA navigation (see [Snapshots](./snapshots.md))

## Module Structure

```
src/features/scrollbar/
├── index.ts       # Module exports
├── feature.ts      # withScrollbar() feature
├── controller.ts  # Scroll controller (native + scaled + window + horizontal modes)
└── scrollbar.ts   # Custom scrollbar component (vertical + horizontal)
```

## Scroll Configuration

All scroll-related settings live under a single `scroll` config object on `BuilderConfig`:

```typescript
vlist({
  container: '#app',
  item: { height: 48, template: (item) => item.name },
  scroll: {
    wheel: true,                     // enable/disable mouse wheel
    wrap: false,                     // wrap around at boundaries
    scrollbar: ...,                  // 'native' | 'none' | { options }
    element: window,                 // external scroll element
    idleTimeout: 150,                // idle detection timeout (ms)
  },
});
```

### scroll.wheel

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
vlist({
  container: '#app',
  item: { height: 48, template },
  // scroll.wheel defaults to true
});

// Disable wheel — button-only navigation
vlist({
  container: '#app',
  item: { height: 48, template },
  scroll: { wheel: false, scrollbar: 'none' },
});
```

### scroll.wrap

**Type:** `boolean`
**Default:** `false`

Wraps around when `scrollToIndex` goes past the boundaries of the list.

| Index | `wrap: false` (default) | `wrap: true` |
|-------|-------------------------|--------------|
| **Past last item** | Clamped to last item | Wraps to beginning |
| **Negative index** | Clamped to 0 | Wraps from end |

When `true`, `scrollToIndex` applies modulo arithmetic to the index:
- `scrollToIndex(totalItems)` → scrolls to index `0`
- `scrollToIndex(-1)` → scrolls to the last item
- `scrollToIndex(totalItems + 5)` → scrolls to index `5`

This is useful for carousels, wizards, and any circular navigation pattern where prev/next buttons should loop endlessly.

```typescript
// Carousel with wrap-around navigation
const list = vlist({
  container: '#carousel',
  item: { height: 300, template: renderSlide },
  items: slides,
  scroll: { wheel: false, scrollbar: 'none', wrap: true },
});

let current = 0;

// These never need boundary checks — wrap handles it
btnNext.addEventListener('click', () => {
  current++;
  list.scrollToIndex(current, { align: 'start', behavior: 'smooth' });
});

btnPrev.addEventListener('click', () => {
  current--;
  list.scrollToIndex(current, { align: 'start', behavior: 'smooth' });
});
```

> **Note:** `wrap` only affects `scrollToIndex`. It does not create an infinite/repeating list — the items array stays finite. The wrapping is purely navigational.

### scroll.scrollbar

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
vlist({ container, item });

// Custom scrollbar, always visible (no auto-hide)
vlist({
  container,
  item,
  scroll: { scrollbar: { autoHide: false } },
});

// Custom scrollbar with slow fade
vlist({
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
| `showOnHover` | `boolean` | `true` | Show scrollbar when hovering near the scrollbar edge |
| `hoverZoneWidth` | `number` | `16` | Width in px of the invisible hover zone along the scrollbar edge |
| `showOnViewportEnter` | `boolean` | `true` | Show scrollbar when the mouse enters the list viewport |

When `showOnHover` is `true`, an invisible hover zone is placed along the scrollbar edge. Moving the mouse into this zone reveals the scrollbar, and it stays visible as long as the cursor remains over the zone or the track — the auto-hide timer is suspended while hovering.

When `showOnViewportEnter` is `false`, the scrollbar only appears on scroll or when hovering near the scrollbar edge (if `showOnHover` is `true`). This is useful for cleaner UIs where you don't want the scrollbar to flash every time the mouse enters the list.

#### Native Scrollbar

When `scrollbar: 'native'` is set, the browser's built-in scrollbar is used. This is useful when you want the OS-native look and feel, or when your app already has a scrollbar styling strategy.

In compressed mode (large lists where `overflow: hidden` is required), native scrollbar is not available — vlist automatically falls back to the custom scrollbar.

```typescript
vlist({
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
vlist({
  container,
  item,
  scroll: { wheel: false, scrollbar: 'none' },
});
```

### scroll.element

**Type:** `Window`
**Default:** `undefined`

When set, the list scrolls with this element instead of its own container. Pass `window` for document-level scrolling (the most common use case).

In window mode:
- The list participates in the normal page flow (no inner scrollbar)
- The browser's native scrollbar controls scrolling
- Compression still works (purely mathematical — no overflow or wheel changes)
- Custom scrollbar is disabled (the browser scrollbar is used)
- Cannot be combined with `orientation: 'horizontal'`

```typescript
vlist({
  container: '#list',
  item: { height: 48, template },
  scroll: { element: window },
});
```

See [Window Scrolling](#window-scrolling) for detailed behavior.

### scroll.idleTimeout

**Type:** `number`
**Default:** `150`

Milliseconds after the last scroll event before the list is considered "idle". When idle is detected, vlist:

- Loads any pending data ranges skipped during fast scrolling
- Re-enables CSS transitions (removes `.vlist--scrolling` class)
- Resets the velocity tracker

```typescript
vlist({
  container: '#list',
  item: { height: 48, template },
  scroll: { idleTimeout: 200 },
});
```

**Tuning tips:**
- **Mobile/touch devices:** Increase to 200–300ms (scroll events have larger gaps)
- **Desktop with smooth scroll:** Default 150ms works well
- **Aggressive loading:** Decrease to 100ms (loads data sooner after scroll stops)

### Full ScrollConfig Interface

```typescript
interface ScrollConfig {
  /** Enable mouse wheel scrolling (default: true) */
  wheel?: boolean;

  /** Wrap around at boundaries (default: false) */
  wrap?: boolean;

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

  /** Show scrollbar when hovering near the scrollbar edge (default: true) */
  showOnHover?: boolean;

  /** Width of the invisible hover zone in pixels (default: 16) */
  hoverZoneWidth?: number;

  /** Show scrollbar when the mouse enters the list viewport (default: true) */
  showOnViewportEnter?: boolean;
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
| **Horizontal** | `orientation: 'horizontal'` | `overflow-x: auto`, reads `scrollLeft` instead of `scrollTop` |

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

When `orientation: 'horizontal'` is set, the scroll controller adapts all axis-dependent behavior:

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

**Key constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `VELOCITY_SAMPLE_COUNT` | 8 | Buffer size (~133ms window at 60fps) for smooth averaging |
| `MIN_RELIABLE_SAMPLES` | 3 | Minimum samples before `isTracking()` returns true |
| `STALE_GAP_MS` | 100 | Max gap (ms) before buffer is considered stale |

**Stale gap detection:** When more than 100ms passes between samples (e.g., after idle resets the tracker), the buffer is cleared and the current position becomes the new baseline. This prevents computing bogus low velocity from `small_delta / huge_time_gap` — a problem that caused spurious API requests at the start of scrollbar drags.

**Reliability tracking:** `isTracking()` returns `false` until at least 3 samples have accumulated. The scroll handler uses this to defer loading during the ramp-up phase of a new scroll gesture, rather than trusting near-zero velocity readings.

For the circular buffer implementation, see [Scrollbar Internals](../internals/scrollbar.md#velocity-sampling-circular-buffer).

## Usage Examples

### Default — Custom Scrollbar

The default experience: custom scrollbar, wheel enabled, everything automatic.

```typescript
import { vlist } from '@floor/vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template: (item) => `<div>${item.name}</div>` },
  items: myData,
});
```

### Custom Scrollbar with Options

Fine-tune the custom scrollbar — disable auto-hide so it's always visible:

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
  scroll: {
    scrollbar: { autoHide: false },
  },
});
```

### Scrollbar — Hover to Reveal Only

Show the scrollbar only when hovering near the edge or on scroll — not when the mouse enters the list:

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
  scroll: {
    scrollbar: {
      showOnViewportEnter: false, // don't show on list enter
      showOnHover: true,          // show when hovering near the edge
      hoverZoneWidth: 20,         // 20px hover zone
      autoHideDelay: 800,         // hide after 800ms idle
    },
  },
});
```

### Scrollbar — Minimal (Scroll-Only)

Show the scrollbar only while actively scrolling — no hover zone, no viewport enter:

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
  scroll: {
    scrollbar: {
      showOnViewportEnter: false,
      showOnHover: false,
      autoHide: true,
      autoHideDelay: 500,
    },
  },
});
```

### Native Browser Scrollbar

Opt into the browser's built-in scrollbar:

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
  scroll: {
    scrollbar: 'native',
  },
});
```

### Button-Only Navigation (Wizard)

Disable wheel and hide all scrollbars — navigation is entirely programmatic.
With `wrap: true`, prev/next loop endlessly without boundary checks:

```typescript
const list = vlist({
  container: '#wizard',
  item: { height: 400, template: renderStep },
  items: wizardSteps,
  scroll: { wheel: false, scrollbar: 'none', wrap: true },
});

let currentStep = 0;

// No boundary checks needed — wrap handles it
document.getElementById('next').addEventListener('click', () => {
  currentStep++;
  list.scrollToIndex(currentStep, { align: 'start', behavior: 'smooth', duration: 350 });
});

document.getElementById('prev').addEventListener('click', () => {
  currentStep--;
  list.scrollToIndex(currentStep, { align: 'start', behavior: 'smooth', duration: 350 });
});
```

> Without `wrap: true`, you would need to clamp manually:
> `currentStep = Math.max(0, Math.min(currentStep, total - 1))`

### Horizontal Carousel

Horizontal list with wheel translation and no visible scrollbar:

```typescript
const list = vlist({
  container: '#carousel',
  orientation: 'horizontal',
  item: { width: 200, template: renderCard },
  items: cards,
  scroll: { scrollbar: 'none' },
  // wheel defaults to true — deltaY is translated to horizontal scroll
});
```

### Horizontal — Buttons Only

Horizontal list with no wheel, no scrollbar — arrow buttons only:

```typescript
const list = vlist({
  container: '#carousel',
  orientation: 'horizontal',
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
const list = vlist({
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
const list = vlist({
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
const list = vlist({
  container: '#feed',
  item: { height: 120, template: renderPost },
  adapter: myAdapter,
  scroll: { idleTimeout: 100 },
});
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

/* Hover zone — always pointer-events:auto so mouseenter fires
   even when the track is hidden. Width set via JS from hoverZoneWidth config. */
.vlist-scrollbar-hover {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  z-index: 9;
  pointer-events: auto;
}

.vlist-scrollbar-hover--horizontal {
  top: auto;
  right: auto;
  bottom: 0;
  left: 0;
  width: 100%;
  height: auto;
}
```

#### Horizontal Scrollbar CSS

When `orientation: 'horizontal'` is set, the scrollbar renders along the bottom edge:

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
vlist({
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
vlist({
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

- [Scrollbar Internals](../internals/scrollbar.md) — Low-level `createScrollController`, `createScrollbar`, implementation details, velocity circular buffer, track/thumb interaction code
- [Snapshots](./snapshots.md) — Scroll save/restore (`getScrollSnapshot` / `restoreScroll`)
- [Scale](./scale.md) — Compression state for large lists
- [Rendering](../internals/rendering.md) — Viewport state management
- [Context](../internals/context.md) — BuilderContext holds scroll controller and wires event handlers
- [Optimization](/tutorials/optimization) — Full list of scroll-related optimizations
- [Styling](/tutorials/styling) — `.vlist--scrolling` class and CSS containment

---

*The scroll module provides seamless scrolling for lists of any size — custom scrollbar by default, native as an option, or no scrollbar at all.*