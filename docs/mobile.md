# Mobile & Touch Support

> How vlist works on mobile devices, touch interactions, and optimization strategies for mobile browsers.

## Overview

vlist works excellently on mobile devices through native browser scrolling capabilities. The library relies on standard browser scroll behavior rather than custom touch handlers, providing a familiar, high-performance experience on all mobile platforms.

### Quick Summary

| Feature | Mobile Support | Notes |
|---------|----------------|-------|
| **Touch scrolling** | ✅ Native | Momentum, bounce, all standard gestures |
| **Performance** | ✅ Optimized | Virtual rendering, passive listeners, RAF throttling |
| **Responsive layout** | ✅ Automatic | Works at any viewport size |
| **Custom scrollbar drag** | ⚠️ Mouse only | Native scroll still works perfectly |
| **Keyboard navigation** | ❌ N/A | Not applicable on mobile |
| **Browser support** | ✅ Excellent | iOS Safari 12+, Chrome, Firefox, Edge |

---

## Touch Scrolling

### Native Browser Scrolling

vlist uses standard `overflow: auto` on the viewport element, allowing the browser to handle all touch interactions natively:

- **Momentum scrolling** — Swipe and release for inertial scrolling
- **Bounce effect** — Native overscroll behavior on iOS
- **Pinch zoom** — Standard pinch gestures (if not disabled)
- **Pull-to-refresh** — Native browser behavior (if implemented)

All scroll event listeners use `{ passive: true }` for optimal performance:

```javascript
// From scroll controller
viewport.addEventListener('scroll', onScrollFrame, { passive: true });
```

This ensures the browser can immediately handle touch events without waiting for JavaScript, resulting in silky-smooth 60fps scrolling.

### Why Native Scrolling?

Rather than implementing custom touch handlers (`touchstart`, `touchmove`, `touchend`), vlist delegates to the browser's highly-optimized native scrolling:

**✅ Advantages:**
- Better performance (hardware-accelerated)
- Platform-consistent behavior (iOS bounce, Android overscroll glow)
- Automatic handling of edge cases (interrupted gestures, multi-touch, etc.)
- Accessibility features (VoiceOver/TalkBack scrolling)
- Less code to maintain

**❌ Custom touch handling would require:**
- Manual velocity calculation
- Momentum simulation
- Platform-specific behavior replication
- Touch event coordination (prevent conflicts)
- Significantly more code and testing

---

## Performance on Mobile

vlist includes extensive optimizations specifically beneficial for mobile devices:

### Virtual Rendering

Only visible items are rendered in the DOM:

```
Total items: 1,000,000
Rendered items: ~20 (depending on viewport height)
DOM nodes: Minimal
```

This keeps memory usage low and garbage collection pressure minimal — crucial for mobile devices with limited RAM.

### Passive Event Listeners

All scroll listeners are passive, allowing the browser to scroll immediately:

```javascript
{ passive: true }  // Never blocks scrolling
```

### RAF Throttling

Scroll processing is throttled to one update per animation frame (60fps max):

```javascript
requestAnimationFrame(() => {
  updateVisibleItems();
});
```

### CSS Containment

Items use CSS `contain` for better rendering performance:

```css
.vlist-items {
  contain: layout style;
}

.vlist-item {
  contain: content;
  will-change: transform;
}
```

This tells the browser to optimize rendering by isolating item repaints.

### Zero-Allocation Scroll Path

The scroll hot path allocates no objects — no garbage collection during scroll:

```javascript
// Reuses existing range object instead of creating new ones
range.start = newStart;
range.end = newEnd;
```

### Element Pooling

DOM elements are recycled via `createElementPool()`, reducing GC pressure:

```javascript
// Elements are reused, not destroyed and recreated
const el = pool.get();
updateElement(el, newData);
```

---

## Responsive Viewport

### Viewport Meta Tag

All vlist demos include the standard mobile viewport meta tag:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

This ensures proper scaling on mobile devices.

### Container Sizing

vlist adapts to any container size. Common mobile patterns:

```css
/* Full-screen list */
.vlist {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* List within a page */
.vlist {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height (iOS Safari) */
}

/* List with header */
.vlist {
  height: calc(100vh - 60px);
  height: calc(100dvh - 60px);
}
```

### Dynamic Viewport Height

On iOS Safari, the viewport height changes when the address bar shows/hides. Use dynamic viewport units:

```css
.vlist {
  height: 100dvh; /* Dynamic - adjusts to visible area */
  /* height: 100vh; ← Static - may cause layout shifts */
}
```

---

## Custom Scrollbar Limitations

The custom scrollbar (used in compressed mode for 1M+ items) has limited mobile support:

### Mouse Events Only

The scrollbar currently uses mouse events for drag interactions:

```javascript
thumb.addEventListener('mousedown', handleThumbMouseDown);
document.addEventListener('mousemove', handleThumbMouseMove);
document.addEventListener('mouseup', handleThumbMouseUp);
```

**This means:**
- ⚠️ Dragging the scrollbar thumb **does not work** on touch devices
- ✅ Native content scrolling **still works perfectly**
- ✅ The scrollbar **appears** and **auto-hides** correctly
- ⚠️ Hover-based scrollbar visibility **does not work** (no hover state on touch)

### Workaround for Mobile

Configure the scrollbar for mobile-friendly behavior:

```javascript
import { vlist } from 'vlist/builder';
import { withScrollbar } from 'vlist/scroll';

const list = vlist({ /* ... */ })
  .use(withScrollbar({
    autoHide: true,           // Auto-hide after scroll stops
    autoHideDelay: 800,       // Shorter delay for mobile (default: 1000)
    showOnHover: false,       // No hover on touch devices
    showOnViewportEnter: false // No mouse enter on touch devices
  }))
  .build();
```

### Detection-Based Configuration

Detect touch capability and adjust config:

```javascript
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

const scrollbarConfig = isTouchDevice
  ? {
      autoHide: true,
      autoHideDelay: 800,
      showOnHover: false,
      showOnViewportEnter: false
    }
  : {
      autoHide: true,
      autoHideDelay: 1000,
      showOnHover: true,
      showOnViewportEnter: true
    };

const list = vlist({ /* ... */ })
  .use(withScrollbar(scrollbarConfig))
  .build();
```

---

## Mobile-Optimized Configuration

### Recommended Settings

```javascript
import { vlist } from 'vlist/builder';

const list = vlist({
  container: '#list',
  item: {
    height: 60,  // Taller items are easier to tap
    template: (item) => `
      <div style="padding: 16px; min-height: 44px;">
        <!-- Minimum 44px tap target (iOS guidelines) -->
        ${item.name}
      </div>
    `
  },
  items: data,
  scroll: {
    wheel: true,        // Still useful for desktop/trackpads
    smoothing: false    // Native momentum is better on mobile
  }
})
.build();
```

### Touch Target Sizing

Follow platform guidelines for minimum tap target sizes:

| Platform | Minimum Size | Recommended |
|----------|--------------|-------------|
| iOS | 44×44 px | 48×48 px |
| Android | 48×48 dp | 48×48 dp |
| Web (WCAG) | 44×44 px | 48×48 px |

```css
.vlist-item {
  min-height: 48px;
  padding: 12px 16px;
}
```

### Disable Text Selection During Scroll

vlist includes `user-select: none` on items to prevent text selection during scrolling:

```css
.vlist-item {
  user-select: none;
}
```

This prevents accidental text selection when swiping through the list.

---

## Mobile Browser Support

### Supported Browsers

From the main README, vlist supports:

| Browser | Version | Mobile | Notes |
|---------|---------|--------|-------|
| **Chrome** | 60+ | ✅ Android | Excellent support |
| **Safari** | 12+ | ✅ iOS | Includes iOS Safari |
| **Firefox** | 55+ | ✅ Android | Full support |
| **Edge** | 79+ | ✅ Android | Chromium-based |

### iOS-Specific Considerations

**Dynamic Viewport Height:**
```css
.vlist {
  height: 100dvh; /* Adjusts when Safari UI shows/hides */
}
```

**Safe Area Insets:**
```css
.vlist {
  padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
}
```

**Momentum Scrolling (Legacy):**
```css
.vlist-viewport {
  -webkit-overflow-scrolling: touch; /* iOS < 13 */
}
```

Note: `-webkit-overflow-scrolling: touch` is deprecated in iOS 13+ but harmless to include for older devices.

### Android-Specific Considerations

**Overscroll Glow:**
Native Android overscroll glow is preserved (can't be disabled in modern browsers).

**Chrome Address Bar:**
Use dynamic viewport units to account for address bar hide/show:
```css
height: 100dvh;
```

---

## Testing on Mobile

### Device Testing

**Real Device Testing:**
1. Open vlist demo on your phone
2. Test scrolling through large lists (10K, 100K, 1M items)
3. Verify smooth 60fps scrolling
4. Check memory usage doesn't grow during scroll
5. Test rapid flicking (momentum scrolling)

**Remote Debugging:**
- **iOS Safari:** Use Safari on Mac → Develop → [Your iPhone]
- **Android Chrome:** Use `chrome://inspect` on desktop Chrome

### Performance Profiling

**Chrome DevTools (Android):**
```
1. Connect device via USB
2. Enable USB debugging
3. chrome://inspect → Inspect device
4. Performance tab → Record while scrolling
```

**Safari Web Inspector (iOS):**
```
1. Connect device via USB
2. Enable Web Inspector on device
3. Safari → Develop → [Device] → [Page]
4. Timelines tab → Record
```

### Lighthouse Mobile Audit

Run Lighthouse in mobile mode:

```bash
npx lighthouse https://your-vlist-app.com \
  --only-categories=performance \
  --form-factor=mobile \
  --screenEmulation.mobile=true
```

---

## Known Limitations

### 1. Custom Scrollbar Drag

**Issue:** Cannot drag the custom scrollbar on touch devices.

**Why:** Uses mouse events (`mousedown`, `mousemove`, `mouseup`).

**Impact:** Low — users scroll by swiping content, not dragging scrollbars.

**Workaround:** Native scroll works perfectly. Configure scrollbar with `showOnHover: false`.

### 2. Hover States

**Issue:** CSS `:hover` and JavaScript hover events don't work on touch.

**Why:** Touch devices have no persistent hover state.

**Impact:** Minimal — items can use `:active` for tap feedback.

**Workaround:** Use `:active` state for touch feedback:
```css
.vlist-item:active {
  background-color: var(--vlist-bg-hover);
}
```

### 3. Keyboard Navigation

**Issue:** Arrow keys, Home, End not available on virtual keyboards.

**Why:** Mobile keyboards don't have these keys.

**Impact:** None — touch scrolling replaces keyboard navigation.

---

## Future Enhancements

Potential improvements for mobile support:

### 1. Touch Events for Custom Scrollbar

Add touch event handlers to enable scrollbar drag on mobile:

```javascript
thumb.addEventListener('touchstart', handleThumbTouchStart, { passive: false });
thumb.addEventListener('touchmove', handleThumbTouchMove, { passive: false });
thumb.addEventListener('touchend', handleThumbTouchEnd);
```

### 2. Pull-to-Refresh Support

Optional plugin for pull-to-refresh on mobile:

```javascript
.use(withPullToRefresh({
  onRefresh: async () => {
    await loadNewItems();
  }
}))
```

### 3. Swipe Actions

Swipe-to-delete or swipe-to-reveal actions (iOS Mail style):

```javascript
.use(withSwipeActions({
  left: [{ label: 'Delete', action: (item) => { /* ... */ } }],
  right: [{ label: 'Archive', action: (item) => { /* ... */ } }]
}))
```

### 4. Haptic Feedback

Vibration feedback on selection or actions:

```javascript
if ('vibrate' in navigator) {
  navigator.vibrate(10); // 10ms haptic feedback
}
```

---

## Examples

### Full-Screen Mobile List

```javascript
import { vlist } from 'vlist/builder';

const list = vlist({
  container: '#app',
  item: {
    height: 60,
    template: (user) => `
      <div class="user-item">
        <img src="${user.avatar}" alt="${user.name}">
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-email">${user.email}</div>
        </div>
      </div>
    `
  },
  items: users
})
.build();
```

```css
/* Full-screen mobile layout */
#app {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
}

.vlist {
  height: 100dvh; /* Dynamic viewport height */
  padding-bottom: env(safe-area-inset-bottom); /* iPhone notch */
}

/* Touch-friendly tap targets */
.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  min-height: 48px; /* Minimum tap target */
}

/* Touch feedback */
.vlist-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}
```

### Chat UI (Reverse Mode)

```javascript
import { vlist } from 'vlist/builder';

const chat = vlist({
  container: '#chat',
  reverse: true, // Start at bottom (newest messages)
  item: {
    height: (index) => messages[index].height,
    template: (message) => `
      <div class="message ${message.own ? 'own' : 'other'}">
        ${message.text}
      </div>
    `
  },
  items: messages
})
.build();
```

```css
/* Mobile chat layout */
#chat {
  height: calc(100dvh - 60px); /* Minus input bar */
  padding-bottom: env(safe-area-inset-bottom);
}

.message {
  max-width: 80%;
  padding: 8px 12px;
  margin: 4px 8px;
  border-radius: 16px;
  min-height: 44px; /* Tap target for long-press actions */
}

.message.own {
  margin-left: auto;
  background: #007aff;
  color: white;
}

.message.other {
  margin-right: auto;
  background: #e5e5ea;
  color: black;
}
```

---

## Summary

vlist provides **excellent mobile support** through native browser scrolling:

✅ **Native touch scrolling** — All standard gestures work perfectly  
✅ **High performance** — Virtual rendering, passive listeners, optimized rendering  
✅ **Responsive** — Works at any viewport size  
✅ **Cross-browser** — iOS Safari 12+, Android Chrome, Firefox, Edge  
⚠️ **Minor limitation** — Custom scrollbar drag requires mouse (but native scroll works)

The library's reliance on native scrolling rather than custom touch handling results in better performance, platform consistency, and less code complexity — making it an excellent choice for mobile applications with large lists.

---

## Related Documentation

- [Accessibility](accessibility.md) — Screen reader support, ARIA attributes
- [Performance](optimization.md) — Optimization strategies and benchmarks
- [Scroll](scroll.md) — Scroll controller and configuration
- [Browser Support](../README.md#browser-support) — Compatibility matrix

---

**Need help?** Open an issue on [GitHub](https://github.com/your-repo/vlist) or join the discussion.