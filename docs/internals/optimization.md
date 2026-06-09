# Optimization

> How vlist achieves 60fps scrolling with millions of items — and how to get the most out of it.

## Overview

Virtual scrolling is a rendering optimization on its own: instead of creating DOM elements for every item in a list, vlist renders only the items visible in the viewport plus a small overscan buffer. But maintaining 60fps during fast scrolling requires a lot more than that.

This guide explains the optimizations built into vlist, how they work under the hood, and what you can tune in your own code.



## The 2-Phase Pipeline

Every scroll frame runs through a synchronous 2-phase pipeline with **zero intermediate object allocations**.

### Phase 1 — Calculate

Reads the current scroll position and size cache, then writes directly into pre-allocated TypedArray buffers on the `EngineState` singleton:

```
scroll event → read scrollPosition → compute visible range → fill TypedArrays
```

The visible range is determined by binary-searching the size cache for the first and last items within the viewport bounds:

```javascript
// Simplified — actual code in core/pipeline.ts
let visStart = sizeCache.indexAtOffset(scrollPos)
let visEnd = sizeCache.indexAtOffset(scrollPos + containerSize)

// Add overscan buffer
const renderStart = Math.max(0, visStart - overscan)
const renderEnd = Math.min(totalItems - 1, visEnd + overscan)
```

Results are written into TypedArrays (`visibleIndices`, `visibleOffsets`, `visibleSizes`) — no JavaScript objects are allocated. A **range-unchanged fast path** skips the rest of the pipeline entirely when the render range hasn't changed.

### Phase 2 — Commit

Reads the TypedArray buffers and updates the DOM. This phase handles:

1. **Acquire** — Get elements from the pool for new items entering the viewport
2. **Identity bind** — Set `data-index`, `role`, ARIA attributes
3. **Position** — Apply `transform: translateY(Npx)` and set the size
4. **Release** — Return elements leaving the viewport back to the pool

New elements are batched into a single `DocumentFragment` and appended in one DOM operation, avoiding layout thrashing:

```javascript
// Simplified — actual code in core/pipeline.ts
let fragment = null

for (let i = 0; i < count; i++) {
  let element = rendered.get(dataIndex)

  if (element === undefined) {
    // New item — acquire from pool, apply template, position
    const acquired = pool.acquire()
    acquired.innerHTML = template(item, index, itemState)
    acquired.style.transform = `translateY(${offset}px)`

    rendered.set(dataIndex, acquired)
    if (fragment === null) fragment = document.createDocumentFragment()
    fragment.appendChild(acquired)
  } else {
    // Existing item — update position only
    element.style.transform = `translateY(${offset}px)`
  }
}

// Single DOM write
if (fragment) contentElement.appendChild(fragment)

// Release items no longer in range
for (const [idx, el] of rendered) {
  if (!inNewRange(idx)) {
    pool.release(el)
    rendered.delete(idx)
  }
}
```



## Element Pooling

Creating and destroying DOM elements is expensive. vlist maintains a pool of up to 100 recycled elements. When an item scrolls out of view, its element is stripped and returned to the pool. When a new item enters, an element is popped from the pool instead of calling `document.createElement`.

```javascript
// Simplified — actual code in core/pool.ts
acquire() {
  if (pool.length > 0) {
    return pool.pop()
  }
  return template.cloneNode(false)  // Clone a pre-built template
}

release(element) {
  element.className = itemClass      // Reset class
  element.removeAttribute('style')   // Clear inline styles
  element.textContent = ''           // Cheap clear (no HTML parser)

  if (pool.length < MAX_POOL_SIZE) {
    pool.push(element)
  }
}
```

The `release` uses `textContent = ""` rather than `innerHTML = ""` — `textContent` bypasses the HTML parser entirely, making it significantly cheaper.



## Scroll Handling

vlist uses two complementary strategies for processing scroll input.

### Wheel events — synchronous rendering

Mouse wheel events are intercepted with a **non-passive** listener. The handler computes the new scroll position, sets it directly on the viewport, then runs the pipeline synchronously — all within the same event callback. This eliminates the one-frame delay between wheel input and visual update that passive scroll listeners produce.

```javascript
// Simplified — actual code in core/scroll.ts
function onWheelEvent(event) {
  event.preventDefault()
  const next = clamp(current + event.deltaY * WHEEL_SENSITIVITY, 0, max)
  viewport.scrollTop = next

  state.scrollPosition = next
  onFrame()       // Runs the 2-phase pipeline synchronously
  scheduleIdle()
}
```

### Scroll events — passive for touch/native

For touch scrolling and programmatic scroll, a **passive** scroll listener reads the native scroll position and triggers the pipeline. Passive listeners allow the browser to handle scrolling on the compositor thread without waiting for JavaScript.

### Idle detection

After the last scroll event, a configurable timer (default 150ms) fires the idle callback. Idle triggers:
- Pending data loads that were deferred during fast scrolling
- Removal of the `.vlist--scrolling` CSS class (re-enabling transitions)
- Velocity tracker reset

```typescript
createVList({
  container: '#list',
  scroll: { idleTimeout: 200 }, // Increase for mobile (default: 150ms)
  // ...
})
```



## CSS Containment and Compositing

vlist uses CSS containment to limit the scope of browser layout and style calculations:

```css
/* Items container — layout and style are self-contained */
.vlist-content {
  contain: layout style;
}
```

This tells the browser that changes inside the content container won't affect anything outside it, allowing the browser to skip large portions of the layout tree during scroll.

Items are positioned with `position: absolute` and moved with `transform: translateY()`. The `position` and `top/left/right` values come from the `.vlist-item` CSS class — only `transform` and `height` (or `width`) are set per-frame via JavaScript. This minimizes per-element style work.

### Scroll transition suppression

During active scrolling, vlist adds a `.vlist--scrolling` class to disable CSS transitions on items:

```css
.vlist--scrolling .vlist-item,
.vlist--settling .vlist-item {
  transition: none;
}
```

This prevents the browser from running transition animations on elements being repositioned at 60fps — which would be both invisible and expensive.



## Zero-Allocation Hot Path

Garbage collection pauses are the most common cause of scroll jank. vlist eliminates allocations on the scroll hot path through several techniques:

### TypedArray state

All per-frame state lives in pre-allocated `Int32Array` and `Float64Array` buffers on the `EngineState` singleton. No JavaScript objects or arrays are created during scroll:

```
visibleIndices:  Int32Array(capacity)    // Which items to render
visibleOffsets:  Float64Array(capacity)  // Where each item is positioned
visibleSizes:    Float64Array(capacity)  // How tall each item is
```

### Reusable ItemState

The `ItemState` object passed to templates (`{ selected, focused }`) is a singleton — mutated in place before each template call, never allocated:

```javascript
const itemState = { selected: false, focused: false }

// Before each template call:
itemStateFn(index, itemState)  // Mutates in place
template(item, index, itemState)
```

**Important for template authors:** Never store a reference to the `state` parameter — it will be overwritten on the next render.

### In-place focus mutation

Keyboard navigation (`moveFocusUp`, `moveFocusDown`, etc.) mutates the focus index directly on the state object instead of creating a new state:

```javascript
// Not: return { ...state, focusedIndex: newIndex }
// Instead:
state.focusedIndex = newIndex
return state
```

### Velocity tracking

The velocity tracker is a lightweight 2-sample tracker that mutates its own fields in place. No arrays or objects are allocated during scroll:

```javascript
tracker.velocity = Math.abs(newPosition - lastPos) / dt
tracker.sampleCount = Math.min(tracker.sampleCount + 1, 5)
return tracker  // Same object, mutated
```



## Sparse Storage and LRU Eviction

For large async datasets loaded via the `data()` plugin, vlist uses chunk-based sparse storage with LRU (Least Recently Used) eviction.

### How it works

Items are stored in fixed-size chunks. When scrolling to a new region, the needed chunk is loaded. When memory pressure rises, the least recently accessed chunks are evicted — their data is discarded and will be re-fetched if scrolled back into view.

### Batched timestamps

Instead of calling `Date.now()` for each item access (which adds up in hot loops), LRU timestamps are updated in a single batch per render via `touchChunksForRange()`:

```javascript
// One Date.now() call per render cycle
const now = Date.now()
for (let i = chunkStart; i <= chunkEnd; i++) {
  chunks[i].lastAccess = now
}
```



## Velocity-Based Loading

The `data()` plugin adapts its loading strategy based on scroll velocity:

| Scroll Speed | Behavior |
|-------------|----------|
| **Slow** (< `preloadThreshold`) | Load visible range only |
| **Medium** (`preloadThreshold` to `cancelThreshold`) | Preload items ahead in scroll direction |
| **Fast** (> `cancelThreshold`) | Skip loading entirely, defer to idle |

This prevents flooding the network with requests during fast flings — the user won't see the items anyway.

```typescript
createVList({
  container: '#list',
  item: { height: 50, template: myTemplate },
}, [
  data({
    adapter: myAdapter,
    loading: {
      cancelThreshold: 12,   // px/ms — skip loading above this speed
      preloadThreshold: 2,   // px/ms — start preloading above this
      preloadAhead: 50,      // Items to preload in scroll direction
    },
  }),
])
```

**Tuning tips:**
- **Slow API?** Increase `preloadAhead` (e.g. 100-200) to fetch further ahead
- **Heavy templates?** Decrease `preloadAhead` (e.g. 20-30) to avoid DOM work on unseen items
- **Disable preloading:** Set `preloadThreshold: Infinity`



## CSS Architecture

### Split core and extras

vlist ships two CSS files:

| File | Size | Contents |
|------|------|----------|
| `vlist/styles` | ~9.7 KB | Tokens, base layout, item states, scrollbar |
| `vlist/styles/extras` | ~1.2 KB | Loading spinner, empty state, compact/comfortable variants |

Import only what you need:

```javascript
import 'vlist/styles'         // Always needed
import 'vlist/styles/extras'  // Optional — only if using loading states or density variants
```

### Dark mode

vlist supports three dark mode strategies simultaneously:

```css
/* OS-level automatic */
@media (prefers-color-scheme: dark) { ... }

/* Tailwind convention */
.dark { ... }

/* Explicit attribute (vlist.io, custom apps) */
[data-theme-mode="dark"] { ... }
```

This means vlist works out of the box regardless of how your app implements dark mode.



## Template Performance

Templates run on every render — including when recycled elements re-enter the viewport. Keep them fast.

### String templates (fastest)

```javascript
const template = (item, index, state) =>
  `<div class="item ${state.selected ? 'selected' : ''}">${item.name}</div>`
```

The returned string is assigned via `innerHTML`. This is the fastest path for most use cases.

### HTMLElement templates

```javascript
const template = (item, index, state) => {
  const el = document.createElement('div')
  el.className = state.selected ? 'item selected' : 'item'
  el.textContent = item.name
  return el
}
```

Useful when you need programmatic DOM construction. The element replaces the pool element's content.

### Don't store the state reference

The `state` object is reused across all template calls in a single frame:

```javascript
// Bad — state will be overwritten
const template = (item, index, state) => {
  item._state = state  // This reference will point to wrong data
  return `<div>${item.name}</div>`
}

// Good — read state immediately
const template = (item, index, state) => {
  const cls = state.selected ? 'selected' : ''
  return `<div class="${cls}">${item.name}</div>`
}
```

### Consumer-side caching

For templates with expensive computations (>1ms per item), you can cache results:

```javascript
const cache = new WeakMap()

const template = (item, index, state) => {
  let cached = cache.get(item)
  if (!cached) {
    cached = expensiveTemplate(item, index, state)
    cache.set(item, cached)
  }
  const clone = cached.cloneNode(true)
  clone.classList.toggle('selected', state.selected)
  return clone
}
```

Most templates don't need this — only use it if profiling shows template execution as a bottleneck.



## Bounded Scroll

For very large lists (millions of items), browser scroll containers hit coordinate precision limits around 16 million pixels. vlist solves this with **bounded scroll** — a runway-based approach that keeps the physical scroll space within safe bounds while mapping to the full logical range.

This replaced the earlier compression approach and is now the default for large lists. It activates automatically when the total content size exceeds the browser's safe coordinate range.

```typescript
// Bounded scroll is automatic, but you can configure it:
createVList({
  container: '#list',
  scroll: { mode: 'bounded' },
  // ...
})
```

The pipeline subtracts a `baseOffset` when positioning items, so absolute virtual offsets map into the bounded runway. This is transparent to templates and event handlers — `data-index` and all public APIs use real indices.



## Measuring Performance

### Frame timing

```javascript
let lastFrame = performance.now()
const measureFrame = () => {
  const now = performance.now()
  const delta = now - lastFrame
  if (delta > 16.67) {
    console.warn(`Frame drop: ${delta.toFixed(2)}ms`)
  }
  lastFrame = now
  requestAnimationFrame(measureFrame)
}
requestAnimationFrame(measureFrame)
```

### Chrome DevTools

1. Open the **Performance** tab
2. Start recording
3. Scroll the list rapidly for 5-10 seconds
4. Stop recording
5. Look for:
   - **Long tasks** (>50ms) — blocking operations
   - **GC pauses** — too many allocations
   - **Layout thrashing** — DOM read/write interleaving

### Expected performance

With vlist's built-in optimizations:

| Metric | Target |
|--------|--------|
| Scroll FPS | 60fps sustained |
| Initial render | <50ms for 50 items |
| Memory | Stable (no growth during scrolling) |
| GC pauses | <5ms |



## Summary

| Area | Optimization | How It Works |
|------|-------------|-------------|
| **Pipeline** | 2-phase calculate/commit | Synchronous, zero allocation, TypedArray state |
| **Pipeline** | Range-unchanged fast path | Skips pipeline when render range hasn't changed |
| **DOM** | Element pooling | Recycle up to 100 elements with `textContent` reset |
| **DOM** | DocumentFragment batching | Single DOM append per frame |
| **DOM** | CSS-only static positioning | Only `transform` and size set per-frame via JS |
| **Scroll** | Synchronous wheel rendering | Non-passive wheel handler eliminates 1-frame delay |
| **Scroll** | Passive touch/native scroll | Compositor-thread scrolling for touch devices |
| **Scroll** | Idle detection | Defers non-critical work until scroll stops |
| **CSS** | `contain: layout style` | Limits layout/style recalculation scope |
| **CSS** | Transition suppression | Disables transitions during active scroll |
| **Memory** | Zero-allocation hot path | TypedArrays, reusable ItemState, in-place mutation |
| **Memory** | Sparse storage + LRU | Chunk-based eviction for large async datasets |
| **Memory** | Batched LRU timestamps | Single `Date.now()` per render cycle |
| **Loading** | Velocity-based loading | Skip/preload/defer based on scroll speed |
| **Scale** | Bounded scroll | Runway mapping for lists exceeding 16M px |

## Further Reading

- [Data Plugin](/docs/plugins/data) — Sparse storage, chunking, and async loading
- [Scrollbar Plugin](/docs/plugins/scrollbar) — Custom scrollbar and scroll control
- [API Reference](/docs/api) — Full API documentation
- [Benchmarks](/benchmarks) — Live performance benchmarks
