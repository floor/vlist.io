# Constants

> Default values, thresholds, and magic numbers for vlist configuration.

---

## Virtual Scrolling

### DEFAULT_OVERSCAN

Number of extra items to render outside the viewport in each direction.

```typescript
const DEFAULT_OVERSCAN = 3;
```

Higher values reduce blank flashes during fast scrolling at the cost of more DOM nodes.

### DEFAULT_CLASS_PREFIX

Default CSS class prefix for all vlist elements.

```typescript
const DEFAULT_CLASS_PREFIX = 'vlist';
```

All generated CSS classes use this prefix: `vlist`, `vlist-viewport`, `vlist-item`, `vlist-item--selected`, etc.

---

## Data Loading

### LOAD_MORE_THRESHOLD

Distance from the end (in pixels) to trigger infinite scroll loading.

```typescript
const LOAD_MORE_THRESHOLD = 200;
```

Starts loading more data before the user reaches the end, creating a seamless infinite scroll experience.

### INITIAL_LOAD_SIZE

Default number of items to load per initial request.

```typescript
const INITIAL_LOAD_SIZE = 50;
```

### DEFAULT_PAGE_SIZE

Default page size for data manager operations.

```typescript
const DEFAULT_PAGE_SIZE = 50;
```

---

## Velocity-Based Loading

These constants control the velocity-based loading strategy used by `withAsync`. All three are configurable via the `loading` option on `withAsync`.

### CANCEL_LOAD_VELOCITY_THRESHOLD

Velocity threshold above which data loading is skipped entirely (px/ms).

```typescript
const CANCEL_LOAD_VELOCITY_THRESHOLD = 5;
```

During very fast scrolling, loading is deferred until scroll stops (idle). This avoids wasted network requests for ranges the user scrolls past.

### PRELOAD_VELOCITY_THRESHOLD

Velocity threshold above which preloading kicks in (px/ms).

```typescript
const PRELOAD_VELOCITY_THRESHOLD = 2;
```

At medium scroll speeds (between this and `CANCEL_LOAD_VELOCITY_THRESHOLD`), extra items are preloaded ahead of the scroll direction to reduce visible placeholder flicker.

### PRELOAD_ITEMS_AHEAD

Number of items to preload ahead of the scroll direction.

```typescript
const PRELOAD_ITEMS_AHEAD = 50;
```

Only applies when velocity is between `PRELOAD_VELOCITY_THRESHOLD` and `CANCEL_LOAD_VELOCITY_THRESHOLD`. Higher values help slow APIs; lower values suit heavy templates.

---

## Compression (Large Lists)

### MAX_VIRTUAL_SIZE

Maximum virtual size in pixels along the main axis.

```typescript
const MAX_VIRTUAL_SIZE = 16_000_000;  // 16M pixels
```

Browsers have a maximum element size limit (~16.7M pixels). When total content size exceeds this, vlist switches to compressed mode with remapped scroll math. See [Scale](../features/scale.md) for details.

> **Deprecated alias:** `MAX_VIRTUAL_HEIGHT` is kept for backwards compatibility but should not be used in new code.

---

## Scrollbar

### DEFAULT_SCROLLBAR_AUTO_HIDE

Whether the scrollbar auto-hides after idle.

```typescript
const DEFAULT_SCROLLBAR_AUTO_HIDE = true;
```

### DEFAULT_SCROLLBAR_AUTO_HIDE_DELAY

Delay in milliseconds before the scrollbar hides.

```typescript
const DEFAULT_SCROLLBAR_AUTO_HIDE_DELAY = 1000;
```

### DEFAULT_SCROLLBAR_MIN_THUMB_SIZE

Minimum scrollbar thumb size in pixels.

```typescript
const DEFAULT_SCROLLBAR_MIN_THUMB_SIZE = 30;
```

Ensures the thumb is always large enough to click and drag, even for very large lists.

---

## Placeholder

### DEFAULT_MASK_CHARACTER

Character used for masking text in placeholders.

```typescript
const DEFAULT_MASK_CHARACTER = 'x';
```

Placeholder text like `xxxxxxxxxxxx` indicates loading state.

### DEFAULT_MAX_SAMPLE_SIZE

Maximum items to sample for placeholder structure analysis.

```typescript
const DEFAULT_MAX_SAMPLE_SIZE = 20;
```

### PLACEHOLDER_FLAG

Internal flag to identify placeholder items.

```typescript
const PLACEHOLDER_FLAG = '_isPlaceholder';
```

### PLACEHOLDER_ID_PREFIX

Prefix for placeholder item IDs.

```typescript
const PLACEHOLDER_ID_PREFIX = '__placeholder_';
```

Ensures placeholder IDs don't collide with real item IDs.

---

## Sparse Storage

### DEFAULT_CHUNK_SIZE

Default number of items per storage chunk.

```typescript
const DEFAULT_CHUNK_SIZE = 100;
```

### DEFAULT_MAX_CACHED_ITEMS

Default maximum items to keep in memory.

```typescript
const DEFAULT_MAX_CACHED_ITEMS = 10_000;
```

### DEFAULT_EVICTION_BUFFER

Extra items to keep around the visible range during eviction.

```typescript
const DEFAULT_EVICTION_BUFFER = 500;
```

---

## Scroll & Velocity Tracking

vlist has **two independent velocity trackers** with different constants:

| Tracker | Location | Samples | Min Reliable | Purpose |
|---------|----------|---------|--------------|---------|
| **Builder** | `builder/velocity.ts` | 5 | 2 | Emits `velocity:change` events, drives async loading decisions |
| **ScrollController** | `features/scrollbar/controller.ts` | 8 | 3 | Controls scrollbar thumb behavior and scroll idle detection |

The builder tracker is tuned for responsiveness (fewer samples, faster reliable signal). The scrollbar tracker is tuned for stability (more samples, smoother velocity readings).

### Builder Velocity Constants

#### VELOCITY_SAMPLE_COUNT

Number of samples in the builder velocity tracker's circular buffer.

```typescript
const VELOCITY_SAMPLE_COUNT = 5;
```

#### MIN_RELIABLE_SAMPLES

Minimum samples needed before the builder velocity tracker readings are considered reliable.

```typescript
const MIN_RELIABLE_SAMPLES = 2;
```

The `velocity:change` event includes a `reliable` flag that is `true` when `sampleCount >= MIN_RELIABLE_SAMPLES`.

#### STALE_GAP_MS

Maximum time gap (ms) between samples before the buffer is considered stale.

```typescript
const STALE_GAP_MS = 100;
```

After a pause longer than 100ms, previous samples no longer represent the current scroll gesture. The velocity tracker resets its buffer and starts measuring fresh. Set below the idle timeout (150ms) so stale detection triggers before idle.

### SCROLL_IDLE_TIMEOUT

Default timeout for scroll idle detection in milliseconds.

```typescript
const SCROLL_IDLE_TIMEOUT = 150;
```

Determines when scrolling has "stopped" for scrollbar auto-hide, idle callbacks, post-scroll cleanup, and re-enabling CSS transitions (removing `.vlist--scrolling` class).

This value is configurable via the `scroll.idleTimeout` option on `BuilderConfig`. See [Optimization](/tutorials/optimization#configuration-options) for tuning tips.

### DEFAULT_WHEEL_SENSITIVITY

Default wheel sensitivity multiplier.

```typescript
const DEFAULT_WHEEL_SENSITIVITY = 1;
```

Allows adjusting scroll speed in compressed mode.

---

## Overriding Defaults

Most constants have corresponding config options:

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template: renderRow },
  items: myItems,
  overscan: 5,                       // DEFAULT_OVERSCAN
  classPrefix: 'my-list',            // DEFAULT_CLASS_PREFIX
  scroll: {
    idleTimeout: 200,                // SCROLL_IDLE_TIMEOUT
    scrollbar: {
      autoHide: false,               // DEFAULT_SCROLLBAR_AUTO_HIDE
      autoHideDelay: 2000,           // DEFAULT_SCROLLBAR_AUTO_HIDE_DELAY
      minThumbSize: 50,              // DEFAULT_SCROLLBAR_MIN_THUMB_SIZE
    },
  },
}).build()
```

---

## Summary

| Category | Constants | Purpose |
|----------|-----------|---------|
| **Virtual Scrolling** | `DEFAULT_OVERSCAN`, `DEFAULT_CLASS_PREFIX` | Core rendering behavior |
| **Data Loading** | `LOAD_MORE_THRESHOLD`, `INITIAL_LOAD_SIZE`, `DEFAULT_PAGE_SIZE` | Async data fetching |
| **Velocity Loading** | `CANCEL_LOAD_VELOCITY_THRESHOLD`, `PRELOAD_VELOCITY_THRESHOLD`, `PRELOAD_ITEMS_AHEAD` | Velocity-based load strategy |
| **Compression** | `MAX_VIRTUAL_SIZE` | Large list handling |
| **Scrollbar** | `DEFAULT_SCROLLBAR_AUTO_HIDE`, `DEFAULT_SCROLLBAR_AUTO_HIDE_DELAY`, `DEFAULT_SCROLLBAR_MIN_THUMB_SIZE` | Custom scrollbar |
| **Placeholder** | `DEFAULT_MASK_CHARACTER`, `DEFAULT_MAX_SAMPLE_SIZE`, `PLACEHOLDER_FLAG`, `PLACEHOLDER_ID_PREFIX` | Loading state display |
| **Sparse Storage** | `DEFAULT_CHUNK_SIZE`, `DEFAULT_MAX_CACHED_ITEMS`, `DEFAULT_EVICTION_BUFFER` | Memory management |
| **Scroll** | `SCROLL_IDLE_TIMEOUT`, `DEFAULT_WHEEL_SENSITIVITY` | Scroll behavior |
| **Builder Velocity** | `VELOCITY_SAMPLE_COUNT`, `MIN_RELIABLE_SAMPLES`, `STALE_GAP_MS` | Scroll momentum tracking |

---

## Related

- [API Reference](./reference.md) — Config options that override these defaults
- [Events](./events.md) — `velocity:change` event powered by velocity tracker
- [Scale](../features/scale.md) — `MAX_VIRTUAL_SIZE` and compression
- [Async](../features/async.md) — Velocity-based loading strategy
- [Optimization](/tutorials/optimization) — Tuning `idleTimeout` and other options

---

*Central reference for all default values and configurable thresholds in vlist.*