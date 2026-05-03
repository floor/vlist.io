---
created: 2026-02-24
updated: 2026-04-16
status: published
---

# Constants

> Default values, thresholds, and magic numbers for vlist configuration.

---

## Core

### OVERSCAN

Number of extra items to render outside the viewport in each direction.

```typescript
const OVERSCAN = 3;
```

Higher values reduce blank flashes during fast scrolling at the cost of more DOM nodes.

### CLASS_PREFIX

Default CSS class prefix for all vlist elements.

```typescript
const CLASS_PREFIX = 'vlist';
```

All generated CSS classes use this prefix: `vlist`, `vlist-viewport`, `vlist-item`, `vlist-item--selected`, etc.

---

## Async Loading

These constants control the data loading strategy used by `withAsync` — thresholds, batch sizes, and velocity-aware preloading. All are configurable via the `loading` option on `withAsync`.

### LOAD_THRESHOLD

Distance from the end (in pixels) to trigger infinite scroll loading.

```typescript
const LOAD_THRESHOLD = 200;
```

Starts loading more data before the user reaches the end, creating a seamless infinite scroll experience.

### INITIAL_LOAD_SIZE

Default number of items to load per initial request.

```typescript
const INITIAL_LOAD_SIZE = 50;
```

### LOAD_SIZE

Default load size for data manager operations.

```typescript
const LOAD_SIZE = 50;
```

### PRELOAD_AHEAD

Number of items to preload ahead of the scroll direction.

```typescript
const PRELOAD_AHEAD = 50;
```

Only applies when velocity is between `PRELOAD_VELOCITY_THRESHOLD` and `LOAD_VELOCITY_THRESHOLD`. Higher values help slow APIs; lower values suit heavy templates.

### LOAD_VELOCITY_THRESHOLD

Velocity threshold above which data loading is skipped entirely (px/ms).

```typescript
const LOAD_VELOCITY_THRESHOLD = 12;
```

During very fast scrolling, loading is deferred until scroll stops (idle). This avoids wasted network requests for ranges the user scrolls past.

### PRELOAD_VELOCITY_THRESHOLD

Velocity threshold above which preloading kicks in (px/ms).

```typescript
const PRELOAD_VELOCITY_THRESHOLD = 2;
```

At medium scroll speeds (between this and `LOAD_VELOCITY_THRESHOLD`), extra items are preloaded ahead of the scroll direction to reduce visible placeholder flicker.

---

## Scale

### MAX_VIRTUAL_SIZE

Maximum virtual size in pixels along the main axis.

```typescript
const MAX_VIRTUAL_SIZE = 16_000_000;  // 16M pixels
```

Browsers have a maximum element size limit (~16.7M pixels). When total content size exceeds this, vlist switches to compressed mode with remapped scroll math. See [Scale](../features/scale.md) for details.

---

## Scrolling

### SCROLL_IDLE_TIMEOUT

Default timeout for scroll idle detection in milliseconds.

```typescript
const SCROLL_IDLE_TIMEOUT = 150;
```

Determines when scrolling has "stopped" for scrollbar auto-hide, idle callbacks, post-scroll cleanup, and re-enabling CSS transitions (removing `.vlist--scrolling` class).

This value is configurable via the `scroll.idleTimeout` option on `BuilderConfig`. See [Optimization](/tutorials/optimization#configuration-options) for tuning tips.

### WHEEL_SENSITIVITY

Default wheel sensitivity multiplier.

```typescript
const WHEEL_SENSITIVITY = 1;
```

Allows adjusting scroll speed in compressed mode.

---

## Scrollbar

### SCROLLBAR_AUTO_HIDE

Whether the scrollbar auto-hides after idle.

```typescript
const SCROLLBAR_AUTO_HIDE = true;
```

### SCROLLBAR_AUTO_HIDE_DELAY

Delay in milliseconds before the scrollbar hides.

```typescript
const SCROLLBAR_AUTO_HIDE_DELAY = 1000;
```

### SCROLLBAR_MIN_THUMB_SIZE

Minimum scrollbar thumb size in pixels.

```typescript
const SCROLLBAR_MIN_THUMB_SIZE = 30;
```

Ensures the thumb is always large enough to click and drag, even for very large lists.

---

## Sparse Storage

### CHUNK_SIZE

Default number of items per storage chunk.

```typescript
const CHUNK_SIZE = 100;
```

### MAX_CACHED_ITEMS

Default maximum items to keep in memory.

```typescript
const MAX_CACHED_ITEMS = 10_000;
```

### EVICTION_BUFFER

Extra items to keep around the visible range during eviction.

```typescript
const EVICTION_BUFFER = 500;
```

---

## Velocity

vlist has **two independent velocity trackers** with different constants:

| Tracker | Location | Samples | Min Reliable | Purpose |
|---------|----------|---------|--------------|---------|
| **Builder** | `builder/velocity.ts` | 5 | 2 | Emits `velocity:change` events, drives async loading decisions |
| **ScrollController** | `features/scrollbar/controller.ts` | 8 | 3 | Controls scrollbar thumb behavior and scroll idle detection |

The builder tracker is tuned for responsiveness (fewer samples, faster reliable signal). The scrollbar tracker is tuned for stability (more samples, smoother velocity readings).

### VELOCITY_SAMPLE_COUNT

Number of samples in the builder velocity tracker's circular buffer.

```typescript
const VELOCITY_SAMPLE_COUNT = 5;
```

### MIN_RELIABLE_SAMPLES

Minimum samples needed before the builder velocity tracker readings are considered reliable.

```typescript
const MIN_RELIABLE_SAMPLES = 2;
```

The `velocity:change` event includes a `reliable` flag that is `true` when `sampleCount >= MIN_RELIABLE_SAMPLES`.

### STALE_GAP_MS

Maximum time gap (ms) between samples before the buffer is considered stale.

```typescript
const STALE_GAP_MS = 100;
```

After a pause longer than 100ms, previous samples no longer represent the current scroll gesture. The velocity tracker resets its buffer and starts measuring fresh. Set below the idle timeout (150ms) so stale detection triggers before idle.

---

## Placeholder

### MASK_CHARACTER

Character used for masking text in placeholders.

```typescript
const MASK_CHARACTER = 'x';
```

Placeholder text like `xxxxxxxxxxxx` indicates loading state.

### MAX_SAMPLE_SIZE

Maximum items to sample for placeholder structure analysis.

```typescript
const MAX_SAMPLE_SIZE = 20;
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

## Overriding Defaults

Most constants have corresponding config options:

```typescript
const list = vlist({
  container: '#app',
  item: { height: 48, template: renderRow },
  items: myItems,
  overscan: 5,                       // OVERSCAN
  classPrefix: 'my-list',            // CLASS_PREFIX
  scroll: {
    idleTimeout: 200,                // SCROLL_IDLE_TIMEOUT
    scrollbar: {
      autoHide: false,               // SCROLLBAR_AUTO_HIDE
      autoHideDelay: 2000,           // SCROLLBAR_AUTO_HIDE_DELAY
      minThumbSize: 50,              // SCROLLBAR_MIN_THUMB_SIZE
    },
  },
}).build()
```

---

## Summary

| Category | Constants | Purpose |
|----------|-----------|---------|
| **Core** | `OVERSCAN`, `CLASS_PREFIX` | Rendering behavior and CSS prefix |
| **Async Loading** | `LOAD_THRESHOLD`, `INITIAL_LOAD_SIZE`, `LOAD_SIZE`, `PRELOAD_AHEAD`, `LOAD_VELOCITY_THRESHOLD`, `PRELOAD_VELOCITY_THRESHOLD` | Data loading and velocity strategy |
| **Scale** | `MAX_VIRTUAL_SIZE` | Large list compression |
| **Scrolling** | `SCROLL_IDLE_TIMEOUT`, `WHEEL_SENSITIVITY` | Scroll behavior |
| **Scrollbar** | `SCROLLBAR_AUTO_HIDE`, `SCROLLBAR_AUTO_HIDE_DELAY`, `SCROLLBAR_MIN_THUMB_SIZE` | Custom scrollbar |
| **Sparse Storage** | `CHUNK_SIZE`, `MAX_CACHED_ITEMS`, `EVICTION_BUFFER` | Memory management |
| **Velocity** | `VELOCITY_SAMPLE_COUNT`, `MIN_RELIABLE_SAMPLES`, `STALE_GAP_MS` | Scroll momentum tracking |
| **Placeholder** | `MASK_CHARACTER`, `MAX_SAMPLE_SIZE`, `PLACEHOLDER_FLAG`, `PLACEHOLDER_ID_PREFIX` | Loading state display |

---

## Related

- [API Reference](./reference.md) — Config options that override these defaults
- [Events](./events.md) — `velocity:change` event powered by velocity tracker
- [Scale](../features/scale.md) — `MAX_VIRTUAL_SIZE` and compression
- [Async](../features/async.md) — Velocity-based loading strategy
- [Optimization](/tutorials/optimization) — Tuning `idleTimeout` and other options

---

*Central reference for all default values and configurable thresholds in vlist.*