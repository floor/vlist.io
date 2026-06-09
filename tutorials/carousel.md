# Carousel

> Build an infinite-loop photo carousel with snap-to-item, variant layouts, and navigation controls.

## Overview

The `carousel()` plugin transforms a virtual list into an infinite-loop carousel aligned with [Material Design 3 Carousel](https://m3.material.io/components/carousel/overview) patterns. Items wrap seamlessly — scrolling past the last item continues to the first with no visual break.

### What You'll Build

By the end of this tutorial you'll have a fully functional photo carousel with:
- **Infinite loop** — Items wrap seamlessly in both directions
- **Snap-to-item** — Slides snap into place on scroll idle
- **7 layout variants** — Full, hero, hero-center, multi, uncontained, multi-aspect, and free
- **Navigation** — Prev/next buttons and dot indicators
- **Scroll-driven CSS** — Opacity, text fade, and effects that respond to scroll position
- **Media stabilization** — Images stay rock-solid during transitions (no "breathing")
- **Image preloading** — Smooth transitions with no layout flash

### Use Cases

| Pattern | Example | Variant |
|---------|---------|---------|
| **Full-screen slideshow** | Product showcase, onboarding | `full` |
| **Hero with peek** | Featured content, news | `hero`, `hero-center` |
| **Multi-browse** | Product catalog, photo gallery | `multi` |
| **Edge-to-edge** | Stories, horizontal feed | `uncontained` |
| **Mixed sizes** | Masonry-style gallery | `multi-aspect` |
| **Free scroll** | Thumbnails, tag cloud | `free` |



## Step 1 — Minimal Carousel

Start with the simplest possible carousel: a list of items with the `carousel()` plugin.

### HTML

```html
<div id="carousel"></div>
```

### JavaScript

```javascript
import { createVList, carousel } from 'vlist'
import 'vlist/styles'

const slides = [
  { id: 1, title: 'Mountain Sunrise' },
  { id: 2, title: 'Ocean Waves' },
  { id: 3, title: 'Forest Trail' },
  { id: 4, title: 'City Skyline' },
  { id: 5, title: 'Desert Dunes' },
]

const list = createVList({
  container: '#carousel',
  item: {
    height: 400,
    template: (item) => `
      <div class="slide">
        <h2>${item.title}</h2>
      </div>
    `,
  },
  items: slides,
}, [carousel()])
```

That's it. You now have an infinite-loop carousel with the default `full` variant — one item fills the viewport edge-to-edge, snapping into place on scroll idle.

### CSS

```css
#carousel {
  width: 100%;
  height: 400px;
  overflow: hidden;
  border-radius: 16px;
}

.slide {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e1e2e;
  color: #fff;
  font-size: 24px;
}
```



## Step 2 — Photo Slides with Images

Replace the placeholder slides with real images. We'll use photo URLs and add a loading transition.

```javascript
const slides = [
  { id: 1, title: 'Mountain Sunrise', location: 'Nepal', img: '/photos/mountain.jpg' },
  { id: 2, title: 'Ocean Waves', location: 'California', img: '/photos/ocean.jpg' },
  { id: 3, title: 'Forest Trail', location: 'Oregon', img: '/photos/forest.jpg' },
  { id: 4, title: 'City Skyline', location: 'Tokyo', img: '/photos/city.jpg' },
  { id: 5, title: 'Desert Dunes', location: 'Sahara', img: '/photos/desert.jpg' },
]

function itemTemplate(item) {
  return `
    <div class="photo-slide">
      <img
        class="photo-slide__img"
        src="${item.img}"
        alt="${item.title}"
        decoding="async"
        onload="this.classList.add('photo-slide__img--loaded')"
      />
      <div class="photo-slide__overlay">
        <span class="photo-slide__title">${item.title}</span>
        <span class="photo-slide__location">${item.location}</span>
      </div>
    </div>
  `
}

const list = createVList({
  container: '#carousel',
  item: {
    height: 400,
    template: itemTemplate,
  },
  items: slides,
}, [carousel()])
```

### Image Loading CSS

The key trick: images start with `opacity: 0` and fade in once loaded.

```css
.photo-slide {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: #1e1e2e;
}

.photo-slide__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.photo-slide__img--loaded {
  opacity: 1;
}

.photo-slide__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32px 24px 24px;
  background: linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.photo-slide__title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.photo-slide__location {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}
```



## Step 3 — Navigation Controls

Add prev/next buttons and dot indicators.

### HTML

Wrap the carousel container with navigation elements:

```html
<div class="carousel-wrap">
  <div id="carousel"></div>

  <button id="btn-prev" class="carousel-nav carousel-nav--prev" title="Previous">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>

  <button id="btn-next" class="carousel-nav carousel-nav--next" title="Next">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </button>

  <div class="carousel-dots" id="carousel-dots"></div>
</div>
```

### Prev / Next

Use the `prev()` and `next()` methods added by the carousel plugin:

```javascript
document.getElementById('btn-prev').addEventListener('click', () => {
  list.prev(1, { behavior: 'smooth', duration: 400 })
})

document.getElementById('btn-next').addEventListener('click', () => {
  list.next(1, { behavior: 'smooth', duration: 400 })
})
```

Both methods accept an optional step count (default `1`) and scroll options. Use `{ behavior: 'auto' }` for instant navigation.

### Dot Indicators

Build dots from the items array and update the active dot on slide change:

```javascript
const dotsEl = document.getElementById('carousel-dots')
let currentIndex = 0

function updateDots() {
  dotsEl.innerHTML = slides
    .map((_, i) =>
      `<span class="carousel-dot ${i === currentIndex ? 'carousel-dot--active' : ''}"
            data-index="${i}"></span>`
    )
    .join('')
}

// Listen for slide changes
list.on('carousel:change', ({ index }) => {
  currentIndex = index
  updateDots()
})

// Click a dot to navigate
dotsEl.addEventListener('click', (e) => {
  const dot = e.target.closest('[data-index]')
  if (!dot) return
  const index = parseInt(dot.dataset.index, 10)
  list.goTo(index, { behavior: 'smooth', duration: 400 })
})

// Initial render
updateDots()
```

### goTo Direction

The `goTo()` method takes an optional `direction` option:

| Direction | Behavior |
|-----------|----------|
| `"auto"` | Shortest path (default) |
| `"forward"` | Always scroll forward, wrapping if needed |
| `"backward"` | Always scroll backward, wrapping if needed |

```javascript
// Jump to slide 3 via the shortest path
list.goTo(3, { behavior: 'smooth' })

// Force forward direction (useful for "skip ahead" buttons)
list.goTo(3, { behavior: 'smooth', direction: 'forward' })
```

### Navigation CSS

Arrows appear on hover over the carousel wrap:

```css
.carousel-wrap {
  position: relative;
  width: 100%;
}

.carousel-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: background 0.2s, opacity 0.2s;
  backdrop-filter: blur(8px);
}

.carousel-wrap:hover .carousel-nav {
  opacity: 1;
}

.carousel-nav--prev { left: 16px; }
.carousel-nav--next { right: 16px; }

.carousel-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px 0;
}

.carousel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
  opacity: 0.4;
  transition: opacity 0.2s, transform 0.2s, background 0.2s;
  cursor: pointer;
}

.carousel-dot--active {
  opacity: 1;
  background: #667eea;
  transform: scale(1.3);
}
```



## Step 4 — Carousel Events and State

### carousel:change

The `carousel:change` event fires whenever the focal item changes — from scrolling, snapping, or programmatic navigation:

```javascript
list.on('carousel:change', ({ index, scrollPosition }) => {
  console.log(`Active slide: ${index}`)
  console.log(`Scroll position: ${scrollPosition}`)

  // Update any external UI
  updateDots()
  updateDetailPanel()
  updateStepCounter()
})
```

### getCarouselState

Read the current carousel state at any time:

```javascript
const { index, scrollPosition } = list.getCarouselState()
console.log(`Currently on slide ${index + 1} of ${slides.length}`)
```

### Building a Detail Panel

Use the change event to sync a side panel showing the current photo's metadata:

```javascript
const detailEl = document.getElementById('photo-detail')

function updateDetailPanel() {
  const item = slides[currentIndex]
  if (!item) return

  detailEl.innerHTML = `
    <div class="photo-detail">
      <img class="photo-detail__img" src="${item.img}" alt="${item.title}" />
      <div class="photo-detail__meta">
        <strong>${item.title}</strong>
        <span>${item.location} · #${item.id}</span>
      </div>
    </div>
  `
}
```

### Step Counter

```javascript
const stepEl = document.getElementById('step-counter')

function updateStepCounter() {
  stepEl.textContent = `${currentIndex + 1} / ${slides.length}`
}
```



## Step 5 — Variants

The `variant` option controls how items are sized and arranged. Each variant defines a slot layout — proportional widths assigned to visible items.

### full

One item fills the viewport edge-to-edge. The default variant.

```javascript
carousel({ variant: 'full' })
```

```
+-------------------------------------------+
|                                           |
|              Active Slide                 |
|                                           |
+-------------------------------------------+
```

Best for: product showcases, onboarding flows, full-screen slideshows.

### hero

One large item with a small peek of the next item on the right.

```javascript
carousel({ variant: 'hero' })
```

```
+-----------------------------------+------+
|                                   |      |
|           Active Slide            | Peek |
|                                   |      |
+-----------------------------------+------+
```

Best for: featured content, news articles, editorial layouts.

### hero-center

One large centered item with small peeks on both sides.

```javascript
carousel({ variant: 'hero-center' })
```

```
+------+---------------------------+------+
|      |                           |      |
| Peek |       Active Slide        | Peek |
|      |                           |      |
+------+---------------------------+------+
```

Best for: centered card carousels, content discovery, featured highlights.

### multi

Multiple items visible at once — one large, one medium, one small.

```javascript
carousel({ variant: 'multi' })
```

```
+----------------------+------------+------+
|                      |            |      |
|    Active (large)    |   Medium   | Small|
|                      |            |      |
+----------------------+------------+------+
```

Best for: product catalogs, photo galleries, media browsers.

### uncontained

All visible items share the same width and scroll past the container edge.

```javascript
carousel({ variant: 'uncontained' })
```

```
+------------------+------------------+----
|                  |                  |
|     Slide 1      |     Slide 2      | Sli
|                  |                  |
+------------------+------------------+----
```

Snap is optional for this variant. Best for: stories, horizontal feeds, card lists.

### multi-aspect

Variable-width items using their native aspect ratios. This variant bypasses the slot-based layout engine entirely — each item keeps its own width derived from its aspect ratio.

```javascript
carousel({ variant: 'multi-aspect' })
```

```
+-----------+------------------+--------+--
|           |                  |        |
|  Portrait |    Landscape     | Square |
|           |                  |        |
+-----------+------------------+--------+--
```

This variant requires a dynamic `width` function on the item config. See [Step 8 — Variable Width and Aspect Ratios](#step-8--variable-width-and-aspect-ratios) for a complete walkthrough.

Best for: photography portfolios, mixed-media galleries.

### free

Items scroll freely with no snap behavior. Snap is disabled by default.

```javascript
carousel({ variant: 'free' })
```

Best for: thumbnails, tag clouds, horizontally scrolling content where precise alignment isn't needed.

### Switching Variants at Runtime

To change variants, destroy the list and recreate it:

```javascript
let currentVariant = 'hero'

function recreateCarousel(variant) {
  currentVariant = variant
  list.destroy()

  list = createVList({
    container: '#carousel',
    item: { height: 400, template: itemTemplate },
    items: slides,
  }, [carousel({ variant: currentVariant })])
}
```

Wire up variant buttons:

```javascript
document.querySelectorAll('[data-variant]').forEach(btn => {
  btn.addEventListener('click', () => {
    recreateCarousel(btn.dataset.variant)
  })
})
```



## Step 6 — Snap and Gap

### Snap

Snap is enabled by default for most variants. When the user stops scrolling, the carousel settles on the nearest item.

```javascript
// Explicit snap control
carousel({ snap: true, snapDuration: 400 })

// Disable snap (items stop wherever the scroll ends)
carousel({ snap: false })
```

| Variant | Snap default |
|---------|-------------|
| `full`, `hero`, `hero-center`, `multi` | `true` (required) |
| `uncontained` | `true` (optional, can disable) |
| `multi-aspect`, `static` | `false` |
| `free` | `false` |

### Gap

Add spacing between items:

```javascript
carousel({ variant: 'hero', gap: 8 })
```

The gap is accounted for in the slot layout — item widths are adjusted so that the total (items + gaps) still fills the container.

### Peek

Control how much of adjacent items is visible:

```javascript
// Fixed pixels
carousel({ variant: 'hero', peek: 56 })

// Percentage of container width
carousel({ variant: 'hero', peek: '10%' })

// Auto (default) — the plugin calculates based on the variant
carousel({ variant: 'hero', peek: 'auto' })
```



## Step 7 — Scroll-Driven CSS Effects

The carousel plugin sets CSS custom properties on each rendered item, updated every scroll frame. Use these for scroll-driven visual effects without any JavaScript.

### Available CSS Variables

| Variable | Type | Description |
|----------|------|-------------|
| `--vlist-carousel-progress` | 0–1 | Distance from focal center (0 = active, 1 = far) |
| `--vlist-carousel-offset` | integer | Signed item distance from focal item |
| `--vlist-carousel-role` | string | `"large"`, `"medium"`, or `"small"` |
| `--vlist-carousel-role-weight` | 0–1 | Text overlay visibility weight — driven by the preset's `textFade` mode |
| `--vlist-carousel-width` | px | Dynamic item width |
| `--vlist-carousel-focal-width` | px | Focal slot width (constant per preset) — use to stabilize media sizing |
| `--vlist-carousel-radius` | px | Read by `vlist-carousel.css` for slide border-radius |

### Fade Non-Active Slides

The simplest way to show text only on the active slide is `--vlist-carousel-role-weight`:

```css
.photo-slide__overlay {
  opacity: var(--vlist-carousel-role-weight, 0);
  transition: opacity 0.15s ease;
}
```

The variable is 1 on the focal slide and drops to 0 as the item moves away. How exactly it drops depends on the preset's **textFade** mode — you don't need to worry about the math, just bind `opacity` and the preset handles the rest.

### textFade Modes

Each preset ships with a `textFade` mode that controls how `--vlist-carousel-role-weight` is computed:

| Mode | Behavior | Used by |
|------|----------|---------|
| `"role"` (default) | `1 - progress` for large items, `0` for medium/small | `hero`, `hero-center`, `multi`, `full` |
| `"viewport"` | Visibility ratio — how much of the item is inside the viewport | `multi-aspect` (no-engine) |
| `"size"` | Ratio of the item's rendered size to the focal slot's size | `uncontained` |

You can override the mode on any custom preset (see [Step 10](#step-10--custom-presets)).

### Grayscale Effect

```css
.photo-slide__img {
  filter: grayscale(var(--vlist-carousel-progress));
}
```

Non-focal slides gradually desaturate. The active slide is full color.

### Scale Effect

```css
.photo-slide {
  transform: scale(calc(1 - var(--vlist-carousel-progress) * 0.1));
}
```

Slides shrink slightly as they move away from center.

### Combined Example

```css
.photo-slide {
  transform: scale(calc(1 - var(--vlist-carousel-progress) * 0.05));
  filter: brightness(calc(1 - var(--vlist-carousel-progress) * 0.3));
}

.photo-slide__overlay {
  opacity: var(--vlist-carousel-role-weight, 0);
  pointer-events: none;
}
```

### Stabilize Images with `--vlist-carousel-focal-width`

When items resize during transitions (e.g. `hero` or `multi`), `object-fit: cover` recalculates which part of the image to show — creating a visual "breathing" effect. Lock the image to the focal slot's width to prevent this:

```css
.photo-slide__img {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: var(--vlist-carousel-focal-width, 100%);
  min-width: var(--vlist-carousel-focal-width, 100%);
  height: 100%;
  object-fit: cover;
}
```

The image stays at the focal size and the parent clips the overflow, creating a smooth parallax-like pan instead of a resize.

### Carousel Stylesheet

Rather than writing these structural rules yourself, import the library stylesheet:

```javascript
import 'vlist/styles/carousel'
```

It provides `.vlist-carousel-slide` classes that handle media stabilization, overlay visibility, and text truncation. Add both the library class and your own class to each element:

```html
<div class="vlist-carousel-slide photo-slide">
  <img class="vlist-carousel-slide__media photo-slide__img" src="..." />
  <div class="vlist-carousel-slide__overlay photo-slide__overlay">
    <span class="vlist-carousel-slide__title photo-slide__title">Title</span>
    <span class="vlist-carousel-slide__subtitle photo-slide__location">Location</span>
  </div>
</div>
```

Your classes handle theming (colors, gradients, fonts). The library classes handle structure (positioning, sizing, overflow). Set `--vlist-carousel-radius` on the slide to control border-radius:

```css
.photo-slide {
  --vlist-carousel-radius: 28px;
  background: #1e1e2e;
}
```



## Step 8 — Variable Width and Aspect Ratios

Most carousel variants use a **slot-based layout engine** — the plugin divides the container into proportional slots (e.g. 70%/20%/10% for `multi`) and resizes every item to fit. But some use cases need items to keep their natural dimensions. That's where variable-width mode comes in.

### How the plugin decides

When the carousel plugin initializes, it resolves the variant to a `SlotConfig`:

1. **SlotConfig returned** — The layout engine takes over. Items are resized to fill slots. Used by `full`, `hero`, `hero-center`, `multi`, `uncontained`.
2. **`null` returned + `item.width` is a function** — No layout engine. The plugin reads each item's width from your function and builds a variable step cache. Each item scrolls at its own width. Used by `multi-aspect`.
3. **`null` returned + no width function** — Uniform sizing fallback. Used by `static`.

This is why `multi-aspect` requires a `width` function — without it, the plugin has no way to know each item's size.

### The width function

The `item.width` option accepts a function that receives an item index and returns a pixel width:

```javascript
item: {
  height: 400,
  width: (index) => {
    const item = slides[index]
    // Derive width from the image's native aspect ratio
    return Math.round(400 * (item.w / item.h))
  },
}
```

The formula is: `width = containerHeight * (nativeWidth / nativeHeight)`.

Given a container height of 400px:
- A 4000x2670 landscape photo becomes **599px** wide (ratio 1.50)
- A 2758x3622 portrait photo becomes **305px** wide (ratio 0.76)
- A 1280x1280 square photo stays **400px** wide (ratio 1.00)

### Your data needs dimensions

Each item must carry its native width and height. These are the original image dimensions, not display dimensions:

```javascript
const slides = [
  { id: 1, title: 'Cactus Spines', img: '/photos/cactus.jpg', w: 2758, h: 3622 },
  { id: 2, title: 'Cafe Laptop', img: '/photos/cafe.jpg', w: 5000, h: 3333 },
  { id: 3, title: 'Wispy Cloud', img: '/photos/cloud.jpg', w: 1280, h: 1280 },
  { id: 4, title: 'Fire Escapes', img: '/photos/fire-escapes.jpg', w: 2448, h: 3264 },
  { id: 5, title: 'Foggy Road', img: '/photos/foggy.jpg', w: 3011, h: 2000 },
]
```

### Full multi-aspect setup

```javascript
const ITEM_HEIGHT = 400

const list = createVList({
  container: '#carousel',
  scroll: { scrollbar: 'none' },
  item: {
    height: ITEM_HEIGHT,
    width: (index) => {
      const item = slides[index]
      return Math.round(ITEM_HEIGHT * (item.w / item.h))
    },
    template: itemTemplate,
  },
  items: slides,
}, [
  carousel({
    variant: 'multi-aspect',
    gap: 8,
  }),
])
```

### How scrolling works in variable-width mode

With uniform-width variants, the plugin can calculate scroll position with simple division: `index = scrollOffset / stepSize`. With variable widths, each item has a different step size, so the plugin builds a **prefix-sum offset table** at setup time and uses **binary search** to find the current item during scroll:

```
stepSizes:   [307, 601, 402, 301, 603]
stepOffsets: [0, 307, 908, 1310, 1611, 2214]  ← cumulative
```

When the scroll position is 950px, the binary search finds that it falls between offset 908 and 1310 — so the focal item is index 2, with a fractional progress of `(950 - 908) / 402 = 0.10`.

### CSS variables in variable-width mode

The same CSS variables are set per item, with two differences: `--vlist-carousel-role` is always `"large"` (no slot roles), and `--vlist-carousel-role-weight` uses `"viewport"` mode by default — fading text based on how much of the item is visible.

```css
/* Overlay fades as item scrolls out of view */
.photo-slide__overlay {
  opacity: var(--vlist-carousel-role-weight, 0);
}

/* Use --vlist-carousel-width for responsive sizing */
.photo-slide__img {
  width: var(--vlist-carousel-width);
  height: 100%;
  object-fit: cover;
}
```

### Adapting to container resize

If the container height changes (e.g. on window resize), the width ratios change too. Since the width function is called during setup, you need to recreate the list:

```javascript
window.addEventListener('resize', debounce(() => {
  const newHeight = document.getElementById('carousel').clientHeight
  if (newHeight !== ITEM_HEIGHT) {
    ITEM_HEIGHT = newHeight
    createCarousel()  // Destroy and recreate
  }
}, 200))
```



## Step 9 — Image Preloading

For a polished experience, preload all images after the initial render. Once loaded, skip the fade-in transition for cached images.

```javascript
let imagesPreloaded = false

function itemTemplate(item) {
  const url = item.img

  // After preloading, skip the fade transition
  if (imagesPreloaded) {
    return `
      <div class="photo-slide">
        <img class="photo-slide__img photo-slide__img--loaded"
             src="${url}" alt="${item.title}" decoding="sync" />
        <div class="photo-slide__overlay">
          <span class="photo-slide__title">${item.title}</span>
          <span class="photo-slide__location">${item.location}</span>
        </div>
      </div>
    `
  }

  // Before preloading, fade in on load
  return `
    <div class="photo-slide">
      <img class="photo-slide__img"
           src="${url}" alt="${item.title}" decoding="async"
           onload="this.classList.add('photo-slide__img--loaded')" />
      <div class="photo-slide__overlay">
        <span class="photo-slide__title">${item.title}</span>
        <span class="photo-slide__location">${item.location}</span>
      </div>
    </div>
  `
}

// Preload all images in the background
function preloadImages(items) {
  return Promise.all(
    items.map(item => new Promise(resolve => {
      const img = new Image()
      img.onload = img.onerror = resolve
      img.src = item.img
    }))
  )
}

// After creating the list, start preloading
preloadImages(slides).then(() => {
  imagesPreloaded = true
})
```

**Why this matters:** Virtual lists recycle DOM elements. When a slide is scrolled out and back in, the template runs again. Without preloading, the image fade plays every time. With preloading, recycled slides appear instantly.



## Step 10 — Custom Presets

Beyond the built-in variants, you can create your own layouts.

### Inline SlotConfig

Define a fixed slot layout directly:

```javascript
carousel({
  variant: { slots: [0.7, 0.2, 0.1], focalSlot: 0 },
})
```

The `slots` array defines proportional widths — they don't need to sum to 1 (they're normalized). `focalSlot` indicates which slot is the "active" item (0-indexed).

### textFade

Add `textFade` to control how `--vlist-carousel-role-weight` is computed for your preset:

```javascript
carousel({
  variant: {
    slots: [0.6, 0.25, 0.15],
    focalSlot: 0,
    textFade: 'size',
  },
})
```

See the [textFade modes table](#textfade-modes) in Step 7 for the three options.

### Dynamic Resolver

A function that receives the container size and peek value:

```javascript
carousel({
  variant: (containerSize, peek) => ({
    slots: containerSize > 800 ? [0.6, 0.25, 0.15] : [0.8, 0.2],
    focalSlot: 0,
    textFade: 'size',
  }),
})
```

This lets you adapt the layout to different screen sizes.

### Registered Presets

Register a named preset for reuse across your app:

```javascript
import { registerPreset } from 'vlist'

registerPreset('panorama', (containerSize, peek) => ({
  slots: [0.8, 0.1, 0.1],
  focalSlot: 0,
}))

// Use it by name
carousel({ variant: 'panorama' })
```

You can also override built-in presets:

```javascript
import { registerPreset, hero } from 'vlist'

// Alias
registerPreset('featured', hero)

// Override
registerPreset('hero', (containerSize, peek) => ({
  slots: [0.85, 0.15],
  focalSlot: 0,
}))
```



## Step 11 — Putting It All Together

Here's the complete carousel with all the pieces assembled — variants, navigation, dots, scroll-driven CSS, and image preloading.

### HTML

```html
<div class="carousel-wrap">
  <div id="carousel"></div>

  <button id="btn-prev" class="carousel-nav carousel-nav--prev" title="Previous">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  </button>
  <button id="btn-next" class="carousel-nav carousel-nav--next" title="Next">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </button>

  <div class="carousel-dots" id="carousel-dots"></div>
</div>

<div id="variant-buttons">
  <button class="variant-btn variant-btn--active" data-variant="hero">Hero</button>
  <button class="variant-btn" data-variant="hero-center">Hero Center</button>
  <button class="variant-btn" data-variant="full">Full</button>
  <button class="variant-btn" data-variant="multi">Multi</button>
  <button class="variant-btn" data-variant="uncontained">Uncontained</button>
  <button class="variant-btn" data-variant="multi-aspect">Multi-Aspect</button>
  <button class="variant-btn" data-variant="free">Free</button>
</div>

<div id="step-counter"></div>
```

### JavaScript

```javascript
import { createVList, carousel } from 'vlist'
import 'vlist/styles'
import 'vlist/styles/carousel'

// ─── Data ──────────────────────────────────────────────────────

const slides = [
  { id: 1, title: 'Himalayan Peaks', location: 'Nepal', img: '/photos/1.jpg', w: 4000, h: 2670 },
  { id: 2, title: 'Coastal Bluffs', location: 'Maine', img: '/photos/2.jpg', w: 2000, h: 1333 },
  { id: 3, title: 'Morning Coffee', location: 'Portland', img: '/photos/3.jpg', w: 3456, h: 2304 },
  { id: 4, title: 'Ocean Pier', location: 'California', img: '/photos/4.jpg', w: 4272, h: 2848 },
  { id: 5, title: 'Golden Hour', location: 'Countryside', img: '/photos/5.jpg', w: 4912, h: 3264 },
]

// ─── State ─────────────────────────────────────────────────────

let list = null
let currentVariant = 'hero'
let currentIndex = 0
let imagesPreloaded = false

// ─── DOM ───────────────────────────────────────────────────────

const dotsEl = document.getElementById('carousel-dots')
const stepEl = document.getElementById('step-counter')

// ─── Template ──────────────────────────────────────────────────

const ITEM_HEIGHT = 400

function itemTemplate(item) {
  const imgClass = imagesPreloaded
    ? 'photo-slide__img photo-slide__img--loaded'
    : 'photo-slide__img'
  const decoding = imagesPreloaded ? 'sync' : 'async'
  const onload = imagesPreloaded
    ? ''
    : 'onload="this.classList.add(\'photo-slide__img--loaded\')"'

  return `
    <div class="vlist-carousel-slide photo-slide">
      <img class="vlist-carousel-slide__media ${imgClass}" src="${item.img}" alt="${item.title}"
           decoding="${decoding}" ${onload} />
      <div class="vlist-carousel-slide__overlay photo-slide__overlay">
        <span class="vlist-carousel-slide__title photo-slide__title">${item.title}</span>
        <span class="vlist-carousel-slide__subtitle photo-slide__location">${item.location}</span>
      </div>
    </div>
  `
}

// ─── Dots ──────────────────────────────────────────────────────

function updateDots() {
  dotsEl.innerHTML = slides
    .map((_, i) =>
      `<span class="carousel-dot ${i === currentIndex ? 'carousel-dot--active' : ''}"
            data-index="${i}"></span>`
    )
    .join('')
}

dotsEl.addEventListener('click', (e) => {
  const dot = e.target.closest('[data-index]')
  if (!dot) return
  const index = parseInt(dot.dataset.index, 10)
  list?.goTo(index, { behavior: 'smooth', duration: 400 })
})

// ─── Step counter ──────────────────────────────────────────────

function updateStep() {
  stepEl.textContent = `${currentIndex + 1} / ${slides.length}`
}

// ─── Create / Recreate ────────────────────────────────────────

function createCarousel() {
  if (list) {
    list.destroy()
    list = null
  }

  const isMultiAspect = currentVariant === 'multi-aspect'

  list = createVList({
    container: '#carousel',
    scroll: { scrollbar: 'none' },
    item: {
      height: ITEM_HEIGHT,
      width: isMultiAspect
        ? (index) => Math.round(ITEM_HEIGHT * (slides[index].w / slides[index].h))
        : undefined,
      template: itemTemplate,
    },
    items: slides,
  }, [
    carousel({
      variant: currentVariant,
      snap: currentVariant !== 'free',
      snapDuration: 400,
      initialIndex: currentIndex,
      gap: 8,
    }),
  ])

  // Sync UI on slide change
  list.on('carousel:change', ({ index }) => {
    currentIndex = index
    updateDots()
    updateStep()
  })

  updateDots()
  updateStep()

  // Preload images
  preloadImages(slides).then(() => { imagesPreloaded = true })
}

// ─── Navigation ────────────────────────────────────────────────

document.getElementById('btn-prev').addEventListener('click', () => {
  list?.prev(1, { behavior: 'smooth', duration: 400 })
})

document.getElementById('btn-next').addEventListener('click', () => {
  list?.next(1, { behavior: 'smooth', duration: 400 })
})

// ─── Variant switching ─────────────────────────────────────────

document.getElementById('variant-buttons').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-variant]')
  if (!btn) return

  const variant = btn.dataset.variant
  if (variant === currentVariant) return

  currentVariant = variant
  document.querySelectorAll('.variant-btn').forEach(b => {
    b.classList.toggle('variant-btn--active', b.dataset.variant === variant)
  })

  createCarousel()
})

// ─── Preload helper ────────────────────────────────────────────

function preloadImages(items) {
  return Promise.all(
    items.map(item => new Promise(resolve => {
      const img = new Image()
      img.onload = img.onerror = resolve
      img.src = item.img
    }))
  )
}

// ─── Init ──────────────────────────────────────────────────────

createCarousel()
```



## Accessibility

The carousel plugin provides built-in accessibility features:

- **Tab** focuses the first carousel item
- **Arrow keys** navigate between items
- Container has `role="region"`, items labeled "item X of N"
- `prefers-reduced-motion` disables item size transitions
- RTL horizontal layout swaps arrow key directions

Add an `ariaLabel` to the list config for screen reader context:

```javascript
createVList({
  container: '#carousel',
  ariaLabel: 'Photo carousel',
  // ...
})
```



## Compatibility

| Plugin | Status |
|--------|--------|
| `selection()` | Compatible |
| `a11y()` | Compatible |
| `scrollbar()` | Compatible (lap progress indicator) |
| `autosize()` | Compatible |
| `scale()` | **Not compatible** — both own virtual scroll space |
| `groups()` | **Not compatible** — infinite wrap doesn't map to grouped sections |



## Summary

| Concept | Key Takeaway |
|---------|-------------|
| **Setup** | `createVList(config, [carousel()])` — one line to add infinite loop |
| **Variants** | 7 built-in layouts from full-screen to free-scroll |
| **Navigation** | `prev()`, `next()`, `goTo()` with smooth or instant behavior |
| **Events** | `carousel:change` fires on every focal item change |
| **CSS variables** | `--vlist-carousel-progress`, `--vlist-carousel-role-weight`, `--vlist-carousel-focal-width` for scroll-driven effects |
| **Stylesheet** | `import 'vlist/styles/carousel'` — structural slide styles with media stabilization |
| **Preloading** | Preload images to avoid fade on recycled elements |
| **Custom layouts** | Inline `SlotConfig` with `textFade`, resolver functions, or registered presets |

## Further Reading

- [Carousel Plugin Reference](/docs/plugins/carousel) — Full API documentation
- [Carousel Example](/examples/carousel) — Live interactive demo
- [Plugin System Tutorial](/tutorials/plugin-system) — Understanding how plugins work
- [Plugin Authoring Tutorial](/tutorials/plugin-authoring) — Writing your own plugins
