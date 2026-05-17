---
created: 2026-05-15
updated: 2026-05-17
status: published
---

# Transition Feature

> FLIP-based enter/exit animations for `insertItem`, `removeItem`, and `removeItems`.

## Overview

The `withTransition()` feature replaces the instant insert/remove with smooth CSS transitions. Removed items collapse and fade out while siblings slide up to fill the gap. Inserted items expand in while siblings slide down.

**Import:**
```typescript
import { vlist, withTransition } from 'vlist';
```

**Key characteristics:**

- **FLIP animation** — First, Last, Invert, Play technique for 60fps transitions
- **Exit animation** — removed item collapses via `scaleY(0)` with fade-out, siblings slide up
- **Enter animation** — new item expands via `scaleY(1)` with fade-in, siblings slide down
- **Off-screen awareness** — skips element animation when the target is outside the viewport, but still animates visible siblings that shift
- **Scroll clamp compensation** — handles bottom-of-list edge case where content shrinks and the browser clamps scroll position
- **Per-animation config** — insert and remove can have independent duration/easing, or be disabled individually
- **Batch removal** — `removeItems()` animates all deleted items simultaneously with overlapping FLIP animations
- **Duration cap** — duration is clamped to 1000ms to prevent visual artifacts when scrolling during long animations
- **Conflict-safe** — automatically skipped when combined with Grid or Table (warns in dev)

## Quick Start

```typescript
import { vlist, withTransition } from 'vlist';

const list = vlist({
  container: '#list',
  items,
  item: {
    height: 56,
    template: (item) => `<div>${item.name}</div>`,
  },
})
  .use(withTransition())
  .build();

// Animated removal — item collapses, siblings slide up
list.removeItem(itemId);

// Batch removal — all items animate simultaneously
list.removeItems([id1, id2, id3]);

// Animated insertion — item expands in, siblings slide down
list.insertItem({ id: 42, name: 'New item' }, 0);
```

## Configuration

```typescript
interface TransitionConfig {
  /** Shared duration in ms (default: 200, max: 1000) */
  duration?: number;
  /** Shared CSS easing (default: cubic-bezier(0.2, 0, 0, 1) — MD3 emphasized) */
  easing?: string;
  /** Insert animation config, or false to disable */
  insert?: TransitionTiming | false;
  /** Remove animation config, or false to disable */
  remove?: TransitionTiming | false;
}

interface TransitionTiming {
  duration?: number;
  easing?: string;
}
```

### Examples

**Default (200ms, MD3 easing):**
```typescript
.use(withTransition())
```

**Custom duration:**
```typescript
.use(withTransition({ duration: 200 }))
```

**Different timing per animation:**
```typescript
.use(withTransition({
  insert: { duration: 200, easing: 'ease-out' },
  remove: { duration: 100, easing: 'ease-in' },
}))
```

**Remove animation only:**
```typescript
.use(withTransition({ insert: false }))
```

## Events

| Event | Payload | When |
|-------|---------|------|
| `data:change` | `{ type: 'insert' \| 'remove', id }` | Immediately after data mutation |
| `remove:end` | `{ id }` | After exit animation completes (or immediately if off-screen) |

```typescript
list.on('remove:end', ({ id }) => {
  console.log(`Item ${id} fully removed`);
});
```

## How It Works

The feature uses the [FLIP technique](https://aerotwist.com/blog/flip-your-animations/):

1. **First** — capture current positions of affected elements
2. **Last** — mutate the data and re-render (elements jump to final positions)
3. **Invert** — use CSS `transform` to push elements back to their old positions
4. **Play** — remove the transforms with a CSS transition so elements animate to their final positions

### Remove Animation

1. Clone the element before removal
2. Remove data and re-render
3. Place clone at original position, set `scaleY(1)`
4. Animate clone to `scaleY(0)` + `opacity: 0` (collapse and fade)
5. Animate siblings to their new positions
6. Clean up clone after transition ends

### Batch Remove Animation

When `removeItems()` is called with multiple IDs:

1. Clone all visible target elements and capture sibling positions
2. Also capture positions of items just below the viewport (they will slide into view)
3. Remove all items from data in one pass, single re-render
4. Animate all clones simultaneously — each clone shifts up to account for removed items above it
5. Animate all siblings (including newly visible ones) to their new positions
6. Clean up all clones after transitions end

If only one ID is passed, it falls back to the single `removeItem` animation.

### Insert Animation

1. Capture positions of elements that will shift
2. Insert data and re-render
3. Set new element to `scaleY(0)` + `opacity: 0`
4. Push shifted elements back to old positions via transform
5. Animate new element to `scaleY(1)` + `opacity: 1` (expand and fade in)
6. Animate shifted elements to final positions

### Bottom-of-List Edge Case

When removing items near the end of a scrollable list, the browser may clamp the scroll position (content becomes shorter than the scroll offset). The feature detects this by comparing `scrollTop` before and after removal, then compensates all FLIP positions by the scroll delta. The exit clone also slides down to match the visual shift.

## Compatibility

| Feature | Compatible |
|---------|:---:|
| Async | ✅ |
| Selection | ✅ |
| Sortable | ✅ |
| Groups | ✅ |
| Scrollbar | ✅ |
| Page | ✅ |
| Scale | ✅ |
| Snapshots | ✅ |
| AutoSize | ✅ |
| **Grid** | **❌** |
| **Table** | **❌** |
| Masonry | ✅ |

Grid and Table use multi-column layouts that are incompatible with the 1D `scaleY` collapse animation. When combined, the transition feature is silently skipped (with a dev-mode warning).

## See Also

- **[API Reference — insertItem](../api/reference.md)** — Insert method docs
- **[API Reference — removeItem](../api/reference.md)** — Remove method docs
- **[API Reference — removeItems](../api/reference.md)** — Batch remove method docs
- **[Events](../api/events.md)** — `data:change` and `remove:end` events
