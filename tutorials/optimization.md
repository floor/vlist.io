# Optimization

> Write fast templates, tune scroll behavior, and fix performance problems.

## Overview

vlist handles the hard parts of scroll performance automatically — element pooling, zero-allocation rendering, CSS containment, and idle detection all work out of the box. This tutorial focuses on what **you** control: templates, data loading, configuration, and CSS.

If you're curious about how vlist works internally, see [Internals: Optimization](/docs/internals/optimization).



## Templates

Templates are the single biggest factor in your control. They run every time an item enters the viewport — including when recycled elements scroll back into view.

### Keep templates simple

String templates are the fastest path. The returned HTML is assigned via `innerHTML` in one shot:

```javascript
// Fast — one string concatenation, no DOM API calls
const template = (item, index, state) =>
  `<div class="row ${state.selected ? 'selected' : ''}">
    <span class="name">${item.name}</span>
    <span class="email">${item.email}</span>
  </div>`
```

Avoid doing work inside templates that doesn't depend on the current item:

```javascript
// Slow — formats the same locale string on every render
const template = (item) => {
  const formatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
  return `<div>${formatter.format(item.date)}</div>`
}

// Fast — create the formatter once outside
const fmt = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })
const template = (item) =>
  `<div>${fmt.format(item.date)}</div>`
```

### Don't store the state reference

The `state` object (`{ selected, focused }`) is a **singleton** reused across all template calls in a frame. Read it immediately — never store it:

```javascript
// Bad — state will be overwritten by the next template call
const template = (item, index, state) => {
  item._state = state
  return `<div>${item.name}</div>`
}

// Good — read what you need right away
const template = (item, index, state) => {
  const cls = state.selected ? 'selected' : ''
  return `<div class="${cls}">${item.name}</div>`
}
```

### Cache expensive templates

If your template does heavy computation (parsing, image processing, complex layouts >1ms per item), cache the result per item:

```javascript
const cache = new WeakMap()

const template = (item, index, state) => {
  let cached = cache.get(item)
  if (!cached) {
    cached = buildExpensiveMarkup(item)
    cache.set(item, cached)
  }
  // State-dependent parts must be applied fresh
  const cls = state.selected ? ' selected' : ''
  return `<div class="item${cls}">${cached}</div>`
}
```

Most templates don't need this. Profile first — if template execution doesn't show up in the flame chart, caching adds complexity for no gain.

### Sanitize user content

If items contain user-generated strings, escape them to prevent XSS — but do it efficiently:

```javascript
// Build the escape function once
const esc = (s) => String(s).replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const template = (item) =>
  `<div class="comment">
    <strong>${esc(item.author)}</strong>
    <p>${esc(item.text)}</p>
  </div>`
```



## Item Sizing

### Fixed heights are fastest

When all items have the same height, vlist can calculate positions with simple multiplication — no lookups needed:

```javascript
createVList({
  container: '#list',
  item: {
    height: 48,   // Fixed — O(1) position calculation
    template: myTemplate,
  },
  items,
})
```

### Variable heights add cost

A height function is called per item during range calculation. Keep it cheap — read a precomputed value, don't measure anything:

```javascript
// Good — lookup from precomputed data
item: {
  height: (index) => items[index].type === 'header' ? 64 : 48,
  template: myTemplate,
}

// Avoid — expensive per-item computation
item: {
  height: (index) => measureTextHeight(items[index].content),
  template: myTemplate,
}
```

### AutoSize for truly dynamic content

If you can't predict heights at all (e.g. rich text, images), use the `autosize()` plugin — it measures items after rendering via `ResizeObserver`:

```javascript
import { createVList, autosize } from 'vlist'

createVList({
  container: '#list',
  item: {
    height: 60,  // Estimate — used before measurement
    template: myTemplate,
  },
  items,
}, [autosize()])
```

The estimate height is used for initial layout. After the first render, measured heights take over. A closer estimate means less layout shift.



## Data Loading

For async datasets loaded via the `data()` plugin, loading strategy directly affects scroll smoothness.

### Velocity-based loading

vlist adapts loading behavior based on how fast the user scrolls:

| Scroll Speed | Behavior |
|-------------|----------|
| **Slow** | Load visible range only |
| **Medium** | Preload items ahead in scroll direction |
| **Fast fling** | Skip loading entirely, defer to idle |

This prevents flooding the network with requests the user will never see.

```javascript
import { createVList, data } from 'vlist'

createVList({
  container: '#list',
  item: { height: 50, template: myTemplate },
}, [
  data({
    adapter: myAdapter,
    loading: {
      cancelThreshold: 12,   // px/ms — skip loading above this
      preloadThreshold: 2,   // px/ms — start preloading above this
      preloadAhead: 50,      // Items to preload in scroll direction
    },
  }),
])
```

### Tuning for your use case

| Scenario | Adjustment |
|----------|-----------|
| Slow API (>500ms) | Increase `preloadAhead` to 100-200 |
| Heavy templates | Decrease `preloadAhead` to 20-30 |
| Disable preloading | Set `preloadThreshold: Infinity` |
| Expensive data transform | Do it in the adapter, not the template |

### Move heavy work to the adapter

If you need to transform data (parsing dates, computing derived fields), do it once in the adapter — not on every template render:

```javascript
const adapter = {
  read: async ({ offset, limit }) => {
    const raw = await fetch(`/api/items?offset=${offset}&limit=${limit}`)
    const data = await raw.json()

    // Transform once on load, not per render
    const items = data.items.map(item => ({
      ...item,
      formattedDate: fmt.format(new Date(item.timestamp)),
      initials: item.name.split(' ').map(n => n[0]).join(''),
    }))

    return { items, total: data.total }
  },
}
```



## Scroll Configuration

### Idle timeout

After the last scroll event, vlist waits for idle before running deferred work (data loads, re-enabling transitions). Default is 150ms.

```javascript
createVList({
  container: '#list',
  scroll: { idleTimeout: 200 }, // ms
  // ...
})
```

| Device | Recommended |
|--------|------------|
| Desktop | 150ms (default) |
| Mobile / touch | 200-300ms (larger gaps between touch events) |
| Aggressive loading | 100ms (loads data sooner after scroll stops) |

### Scrollbar

The native scrollbar works for most cases. For custom UIs, use the `scrollbar()` plugin. To hide the scrollbar entirely (e.g. in carousels):

```javascript
createVList({
  container: '#list',
  scroll: { scrollbar: 'none' },
  // ...
})
```

### Bounded scroll

For very large lists (millions of items), browser scroll containers hit coordinate precision limits around 16 million pixels. vlist's bounded scroll keeps the physical scroll space within safe bounds while mapping to the full logical range. It activates automatically — no configuration needed.

```javascript
// Explicit if you want to force it:
createVList({
  container: '#list',
  scroll: { mode: 'bounded' },
  // ...
})
```



## CSS

### Don't fight containment

vlist sets `contain: layout style` on the content container. If you add styles that break containment (e.g. items with `position: fixed` or styles that overflow the container), you'll lose the performance benefit.

### Avoid transitions on items

vlist suppresses transitions during scroll automatically (via `.vlist--scrolling`). But if you add transitions with `!important` or on pseudo-elements, they'll run on every frame during scroll:

```css
/* Bad — runs 60 times per second during scroll */
.vlist-item {
  transition: all 0.3s ease !important;
}

/* Good — let vlist suppress during scroll */
.vlist-item {
  transition: background 0.2s ease;
}
/* vlist adds: .vlist--scrolling .vlist-item { transition: none } */
```

### Use CSS variables from plugins

Plugins like `carousel()` set per-item CSS variables (`--vlist-carousel-progress`). These are updated via `style.setProperty()` on every scroll frame — which is efficient because it doesn't trigger layout. Use them for scroll-driven effects instead of JavaScript event handlers:

```css
/* Good — CSS-only, no JS per frame */
.slide {
  opacity: calc(1 - var(--vlist-carousel-progress) * 0.4);
}

/* Avoid — JS handler on every scroll event */
list.on('scroll', () => {
  items.forEach(el => {
    el.style.opacity = computeOpacity(el)  // Layout thrash
  })
})
```

### Import only what you need

```javascript
import 'vlist/styles'         // Core — always needed (~9.7 KB)
import 'vlist/styles/extras'  // Optional — loading states, density variants (~1.2 KB)
```



## Diagnosing Problems

### Symptoms and causes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Scroll feels sluggish | Expensive template | Profile templates, move work outside |
| Blank items flash during fast scroll | Data loading too slow | Increase `preloadAhead`, optimize API |
| Scroll jank every few seconds | GC pauses | Check for allocations in templates (new objects, array copies) |
| Items jump or shift | Variable height mismatch | Ensure height function returns accurate values, or use `autosize()` |
| Memory grows over time | Unbounded cache | Check for WeakMap leaks, ensure `data()` LRU eviction is working |
| First render is slow | Too many initial items | Reduce initial dataset, load more on scroll |

### Chrome DevTools workflow

1. Open the **Performance** tab
2. Start recording
3. Scroll the list rapidly for 5-10 seconds
4. Stop recording

**What to look for:**

- **Long tasks (>50ms)** — Click to see the call stack. If your template function appears, it's too expensive.
- **GC pauses** — Yellow/orange bars in the flame chart. Check if templates create objects (new Date, array spreads, object copies).
- **Layout events** — Purple bars. If frequent, you may be reading layout properties (offsetHeight, getBoundingClientRect) inside templates.

### Frame timing

Drop this into your page to log frame drops to the console:

```javascript
let lastFrame = performance.now()
const check = () => {
  const now = performance.now()
  const delta = now - lastFrame
  if (delta > 16.67) console.warn(`Frame drop: ${delta.toFixed(1)}ms`)
  lastFrame = now
  requestAnimationFrame(check)
}
requestAnimationFrame(check)
```

### Performance targets

| Metric | Target |
|--------|--------|
| Scroll FPS | 60fps sustained |
| Initial render | <50ms for 50 items |
| Memory during scroll | Stable (no growth) |
| GC pauses | <5ms |



## Quick Reference

| What You Control | What To Do |
|-----------------|-----------|
| **Templates** | Keep simple, no allocations, hoist work outside |
| **Item height** | Use fixed when possible, cheap function otherwise |
| **Data loading** | Tune `preloadAhead` and thresholds for your API |
| **Idle timeout** | Increase on mobile, decrease for aggressive loading |
| **CSS** | Don't `!important` transitions on items, use plugin CSS vars |
| **Imports** | Only import `vlist/styles/extras` if needed |

## Further Reading

- [Internals: Optimization](/docs/internals/optimization) — How pooling, the pipeline, and scroll handling work under the hood
- [Data Plugin](/docs/plugins/data) — Sparse storage, chunking, and async loading
- [AutoSize Plugin](/docs/plugins/autosize) — Auto-measure items via ResizeObserver
- [Benchmarks](/benchmarks) — Live performance benchmarks
