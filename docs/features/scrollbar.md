---
created: 2026-02-22
updated: 2026-05-01
status: published
---

# Scrollbar Module

> Custom scrollbar UI with auto-hide and smooth dragging.

## Overview

The scroll module handles all scrolling functionality in vlist, including:

- **Scroll Configuration** — unified `scroll` config with wheel, scrollbar, window, and idle settings
- **Custom Scrollbar** — cross-browser consistent scrollbar via `.use(withScrollbar())`, with auto-hide and drag support
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
**Default:** `undefined` (native browser scrollbar)

Controls which scrollbar is displayed. These options apply to the `scroll.scrollbar` field in `VListConfig` (the framework adapter config). For the core builder API, use `.use(withScrollbar())` to enable the custom scrollbar.

| Value | Scrollbar shown | Native hidden | Notes |
|-------|----------------|---------------|-------|
| *omitted* | **Browser native** | No | Default — standard browser scrollbar |
| `'native'` | **Browser native** | No | Explicit native; falls back to custom in compressed mode |
| `'none'` | **None** | Yes | No scrollbar at all |
| `{ autoHide: false }` | **Custom** (configured) | Yes | Object form for fine-tuning (requires `withScrollbar()` in core builder) |

#### Custom Scrollbar

To use the custom scrollbar, explicitly add `.use(withScrollbar())` in the core builder API. When using a framework adapter's `VListConfig`, pass a scrollbar options object to `scroll.scrollbar`.

The custom scrollbar works in **all modes** — native scroll, compressed scroll, and horizontal scroll.

```typescript
// Custom scrollbar via builder API (recommended)
import { vlist, withScrollbar } from 'vlist';

vlist({ container, item })
  .use(withScrollbar())
  .build();

// Custom scrollbar, always visible (no auto-hide)
vlist({ container, item })
  .use(withScrollbar({ autoHide: false }))
  .build();

// Custom scrollbar with slow fade
vlist({ container, item })
  .use(withScrollbar({ autoHide: true, autoHideDelay: 3000 }))
  .build();
```

**Custom scrollbar options (ScrollbarOptions):**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoHide` | `boolean` | `true` | Auto-hide scrollbar after idle. When `false`, the scrollbar is always visible as long as content overflows. |
| `autoHideDelay` | `number` | `1000` | Auto-hide delay in milliseconds |
| `minThumbSize` | `number` | `15` | Minimum thumb size in pixels. Also controllable via `--vlist-custom-scrollbar-min-thumb-size`. |
| `showOnHover` | `boolean` | `true` | Show scrollbar when hovering near the scrollbar edge |
| `hoverZoneWidth` | `number` | `wallPadding + 16` | Width in px of the invisible hover zone along the scrollbar edge. Defaults to the wall-side padding (`right` for vertical, `bottom` for horizontal) plus 16px reach buffer. |
| `showOnViewportEnter` | `boolean` | `true` | Show scrollbar when the mouse enters the list viewport |
| `gutter` | `boolean` | `false` | Reserve layout space for the scrollbar — content shrinks to make room so the scrollbar never overlaps items. Equivalent to CSS `scrollbar-gutter: stable`. |
| `padding` | `number \| { top?, right?, bottom?, left? }` | `2` | Inset the track from the viewport edges. A single number applies to all sides. An object allows per-side control — omitted sides default to `2`. Thumb travel range adjusts automatically. Also controllable via `--vlist-custom-scrollbar-padding-{side}`. |
| `clickBehavior` | `'jump' \| 'scroll'` | `'scroll'` | What happens when clicking the track (not the thumb). `'scroll'` scrolls by one page toward the click — hold the mouse button to continue scrolling smoothly, matching macOS native scrollbar behavior. `'jump'` centers the thumb at the click position instantly. |

When `showOnHover` is `true`, an invisible hover zone is placed along the scrollbar edge. Moving the mouse into this zone reveals the scrollbar, and it stays visible as long as the cursor remains over the zone or the track — the auto-hide timer is suspended while hovering. The default `hoverZoneWidth` is the wall-side padding (`right` for vertical, `bottom` for horizontal) plus 16px, so the zone always covers the full inset track area regardless of how much padding is set; increase it if you want a wider reach from the edge.

When `autoHide` is `false`, the scrollbar is visible immediately and stays visible as long as content overflows — no user interaction is needed to reveal it. The `autoHideDelay`, `showOnHover`, and `showOnViewportEnter` options have no effect in this mode since the scrollbar never hides.

When `showOnViewportEnter` is `false`, the scrollbar only appears on scroll or when hovering near the scrollbar edge (if `showOnHover` is `true`). This is useful for cleaner UIs where you don't want the scrollbar to flash every time the mouse enters the list.

When `clickBehavior` is `'scroll'` (the default), clicking the track scrolls by one `containerSize` toward the click immediately. Holding the mouse button then triggers smooth continuous scrolling after a 350ms initial delay — the scroll accelerates at a fixed speed and stops automatically when the thumb reaches the cursor, at a boundary, or on mouseup. This matches the native macOS scrollbar feel. Use `'jump'` to instantly center the thumb at the clicked position instead.

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

  /** Scrollbar mode (default: native browser scrollbar). Use withScrollbar() for custom. */
  scrollbar?: 'native' | 'none' | ScrollbarOptions;

  /** External scroll element for window scrolling */
  element?: Window;

  /** Scroll idle detection timeout in ms (default: 150) */
  idleTimeout?: number;
}

interface ScrollbarOptions {
  /** Auto-hide scrollbar after idle (default: true). When false, scrollbar is always visible. */
  autoHide?: boolean;

  /** Auto-hide delay in milliseconds (default: 1000) */
  autoHideDelay?: number;

  /** Minimum thumb size in pixels (default: 15). Also settable via --vlist-custom-scrollbar-min-thumb-size. */
  minThumbSize?: number;

  /** Show scrollbar when hovering near the scrollbar edge (default: true) */
  showOnHover?: boolean;

  /** Width of the invisible hover zone in pixels (default: wallPadding + 16). */
  hoverZoneWidth?: number;

  /** Show scrollbar when the mouse enters the list viewport (default: true) */
  showOnViewportEnter?: boolean;

  /**
   * Reserve layout space for the scrollbar (default: false).
   * When true, content shrinks to make room for the scrollbar track so it
   * never overlaps items. Equivalent to CSS `scrollbar-gutter: stable`.
   */
  gutter?: boolean;

  /**
   * Inset between the scrollbar track and the viewport edges (default: 2).
   * Accepts a single number (all sides) or per-side object: { top?, right?, bottom?, left? }.
   * Omitted sides default to 2. Thumb travel range is recalculated automatically.
   * Can also be set globally via `--vlist-custom-scrollbar-padding-{side}` CSS variables.
   */
  padding?: number | { top?: number; right?: number; bottom?: number; left?: number };

  /**
   * Behavior when clicking the scrollbar track (not the thumb) (default: 'scroll').
   * - `'scroll'` — scrolls by one page toward the click; hold for smooth continuous
   *               scrolling, matching macOS native scrollbar behavior. Auto-stops
   *               when the thumb reaches the cursor.
   * - `'jump'`  — instantly centers the thumb at the clicked position.
   */
  clickBehavior?: 'jump' | 'scroll' | 'page';
}
```

## Key Concepts

### Independence of Wheel and Scrollbar

`wheel` and `scrollbar` are fully independent — any combination is valid:

| `wheel` | `scrollbar` | Use case |
|---------|-------------|----------|
| `true` | *(default)* | Standard list — wheel + native scrollbar |
| `true` | `'native'` | Same as default (explicit native) |
| `true` | `'none'` | Wheel scrolling, no visible scrollbar |
| `false` | *(default)* | Native scrollbar drag only, no wheel |
| `false` | `'native'` | Same as above (explicit native) |
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

### Default — Native Scrollbar

The default experience: native browser scrollbar, wheel enabled, everything automatic.

```typescript
import { vlist } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template: (item) => `<div>${item.name}</div>` },
  items: myData,
}).build();
```

### Custom Scrollbar with Options

Fine-tune the custom scrollbar — disable auto-hide so it's always visible:

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
})
  .use(withScrollbar({ autoHide: false }))
  .build();
```

### Scrollbar — Hover to Reveal Only

Show the scrollbar only when hovering near the edge or on scroll — not when the mouse enters the list:

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
})
  .use(withScrollbar({
    showOnViewportEnter: false, // don't show on list enter
    showOnHover: true,          // show when hovering near the edge
    hoverZoneWidth: 20,         // explicit override (default is wallPadding + 16)
    autoHideDelay: 800,         // hide after 800ms idle
  }))
  .build();
```

### Scrollbar — Minimal (Scroll-Only)

Show the scrollbar only while actively scrolling — no hover zone, no viewport enter:

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
})
  .use(withScrollbar({
    showOnViewportEnter: false,
    showOnHover: false,
    autoHide: true,
    autoHideDelay: 500,
  }))
  .build();
```

### Scrollbar with Gutter (Reserved Space)

Reserve layout space so the scrollbar track never overlaps content — equivalent to CSS `scrollbar-gutter: stable`:

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
})
  .use(withScrollbar({ gutter: true }))
  .build();
```

Use this when precise content width matters — tables where the last column shouldn't be clipped, grids with exact column widths, or any UI where overlay scrollbars would obscure content.

### Scrollbar with Padding (Floating)

Add breathing room between the scrollbar track and the viewport edges. The default is `2px` on all sides — increase it for a more detached, floating appearance.

A single number applies to all sides:

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
})
  .use(withScrollbar({ padding: 4 }))
  .build();
```

Or control each side independently — for example, more vertical breathing room while keeping sides tight:

```typescript
.use(withScrollbar({
  padding: { top: 8, bottom: 8, right: 2, left: 2 },
}))
```

Omitted sides default to `2px`, so `{ right: 6 }` gives `right=6`, all others `2`.

The thumb travel range adjusts automatically — it spans `top` to `bottom` (vertical) or `left` to `right` (horizontal), never exceeding the padded area.

You can also set padding globally via CSS without touching JavaScript:

```css
#my-list {
  --vlist-custom-scrollbar-padding-top: 8px;
  --vlist-custom-scrollbar-padding-right: 2px;
  --vlist-custom-scrollbar-padding-bottom: 8px;
  --vlist-custom-scrollbar-padding-left: 2px;
}
```

### Scrollbar — Jump to Position on Click

Opt out of the default page-scroll behavior and jump the thumb directly to the clicked position:

```typescript
import { vlist, withScrollbar } from 'vlist';

const list = vlist({
  container: '#app',
  item: { height: 48, template },
  items: myData,
})
  .use(withScrollbar({ clickBehavior: 'jump' }))
  .build();
```

Use this when you want click-to-seek behavior — clicking anywhere on the track instantly repositions the scroll, without the page-by-page progression.

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
/* Track — positioned absolutely inside the viewport.
   Inset per side via --vlist-custom-scrollbar-padding-{side} (default: 2px each). */
.vlist-scrollbar {
  position: absolute;
  top: var(--vlist-custom-scrollbar-padding-top, 2px);
  right: var(--vlist-custom-scrollbar-padding-right, 2px);
  bottom: var(--vlist-custom-scrollbar-padding-bottom, 2px);
  width: var(--vlist-custom-scrollbar-width, 8px);
  background: var(--vlist-custom-scrollbar-track-color, transparent);
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
  background: var(--vlist-custom-scrollbar-thumb-color, rgba(0, 0, 0, 0.3));
  border-radius: var(--vlist-custom-scrollbar-radius, 8px);
  cursor: pointer;
}

.vlist-scrollbar-thumb:hover {
  background: var(--vlist-custom-scrollbar-thumb-hover-color, rgba(0, 0, 0, 0.5));
}

/* Hover zone — always pointer-events:auto so mouseenter fires
   even when the track is hidden. Width is set via JS: wallPadding + 16 by default,
   or the explicit hoverZoneWidth config value. */
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

#### Gutter CSS

When `gutter: true` is set, `vlist-viewport--gutter` is added to the viewport element. Padding on the viewport shrinks the scrollable content box so items stay clear of the scrollbar track:

```css
/* Vertical: right-wall inset + track width + left breathing room */
.vlist-viewport--gutter {
  padding-right: calc(
    var(--vlist-custom-scrollbar-padding-right) +
    var(--vlist-custom-scrollbar-width) +
    var(--vlist-custom-scrollbar-padding-left)
  );
}

/* Horizontal: bottom-wall inset + track height + top breathing room */
.vlist--horizontal .vlist-viewport--gutter {
  padding-right: 0;
  padding-bottom: calc(
    var(--vlist-custom-scrollbar-padding-bottom) +
    var(--vlist-custom-scrollbar-width) +
    var(--vlist-custom-scrollbar-padding-top)
  );
}
```

#### Horizontal Scrollbar CSS

When `orientation: 'horizontal'` is set, the scrollbar renders along the bottom edge:

```css
/* Horizontal track — along the bottom, inset from left, right, and bottom edges */
.vlist-scrollbar--horizontal {
  top: auto;
  left: var(--vlist-custom-scrollbar-padding-left, 2px);
  right: var(--vlist-custom-scrollbar-padding-right, 2px);
  bottom: var(--vlist-custom-scrollbar-padding-bottom, 2px);
  width: auto;
  height: var(--vlist-custom-scrollbar-width);
}

/* Horizontal thumb */
.vlist-scrollbar--horizontal .vlist-scrollbar-thumb {
  top: 0;
  left: 0;
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
  /* Custom overlay scrollbar (withScrollbar feature) */
  --vlist-custom-scrollbar-width: 8px;
  --vlist-custom-scrollbar-track-color: transparent;
  --vlist-custom-scrollbar-radius: calc(var(--vlist-custom-scrollbar-width) / 2); /* pill by default */
  --vlist-custom-scrollbar-padding-top: 2px;    /* inset per side */
  --vlist-custom-scrollbar-padding-right: 2px;
  --vlist-custom-scrollbar-padding-bottom: 2px;
  --vlist-custom-scrollbar-padding-left: 2px;
  --vlist-custom-scrollbar-min-thumb-size: 15px;
  --vlist-custom-scrollbar-thumb-color: rgba(0, 0, 0, 0.3);
  --vlist-custom-scrollbar-thumb-hover-color: rgba(0, 0, 0, 0.5);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --vlist-custom-scrollbar-thumb-color: rgba(255, 255, 255, 0.3);
    --vlist-custom-scrollbar-thumb-hover-color: rgba(255, 255, 255, 0.5);
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
| *(omitted)* | *(omitted)* | Native browser scrollbar (default) |
| `scrollbar: { enabled: true }` | *(omitted)* or `{ autoHide: ... }` | Custom scrollbar |
| `scrollbar: { enabled: false }` | `scrollbar: 'none'` | No scrollbar |
| *(no equivalent)* | `scrollbar: 'native'` | Browser's native scrollbar |

## See Also

- [Types — `ScrollbarOptions`](../api/types.md#scrollbaroptions) — `autoHide`, `autoHideDelay`, `minThumbSize`, `showOnHover`, `hoverZoneWidth`, `showOnViewportEnter`, `gutter`, `padding`, `clickBehavior`
- [Constants — Scrollbar](../api/constants.md#scrollbar) — `SCROLLBAR_AUTO_HIDE`, `SCROLLBAR_AUTO_HIDE_DELAY`, `SCROLLBAR_MIN_THUMB_SIZE`
- [Events — `scroll:idle`](../api/events.md#scrollidle) — Fires when scrolling stops, used for auto-hide timing
- [Scrollbar Internals](../internals/scrollbar.md) — Low-level `createScrollController`, `createScrollbar`, velocity circular buffer, track/thumb interaction
- [Scale](./scale.md) — Scroll compression for large lists (always use custom scrollbar with scale)
- [Page](./page.md) — Document scrolling (custom scrollbar has no effect with page mode)

## Examples

- [Photo Album](/examples/photo-album) — Grid gallery with auto-hide scrollbar
- [Large List](/examples/large-list) — 100K–5M items with compressed scrollbar
- [File Browser](/examples/file-browser) — Custom scrollbar in list and grid views