# Mobile

> Touch interactions, responsive layout, and mobile-specific tips.

## Overview

vlist uses native browser scrolling — `overflow: auto` on the viewport — so touch interactions work out of the box. Momentum scrolling, bounce effects, swipe gestures, and platform-specific overscroll behavior are all handled by the browser, not by JavaScript.

This means you get hardware-accelerated, platform-consistent scrolling with zero configuration. This tutorial covers the things you should be aware of when targeting mobile.



## How Scroll Works on Mobile

### Touch scrolling

Touch scroll events are handled via a **passive** listener — the browser scrolls on the compositor thread without waiting for JavaScript:

```javascript
viewport.addEventListener('scroll', onScrollEvent, { passive: true })
```

This gives you native momentum scrolling, iOS bounce, and Android overscroll glow — all free.

### Wheel events (desktop/trackpad)

On desktop, vlist intercepts wheel events with a non-passive listener for synchronous rendering. This doesn't affect mobile — touch devices don't fire wheel events.

You can disable wheel interception if your list is only used on mobile:

```javascript
createVList({
  container: '#list',
  scroll: { wheel: false },
  // ...
})
```



## Responsive Layout

### Container sizing

vlist fills whatever container you give it. The key decision on mobile is how to size that container.

```css
/* Full-screen list */
#list {
  height: 100dvh;
}

/* List below a fixed header */
#list {
  height: calc(100dvh - 60px);
}

/* List in a flex layout */
.page {
  display: flex;
  flex-direction: column;
  height: 100dvh;
}
#list {
  flex: 1;
  min-height: 0; /* Required for flex children to shrink */
}
```

### Dynamic viewport height

On iOS Safari and Android Chrome, the browser UI (address bar, toolbar) shows and hides as you scroll, changing the viewport height. Use `dvh` (dynamic viewport height) instead of `vh`:

```css
/* Good — adjusts when browser UI shows/hides */
#list {
  height: 100dvh;
}

/* Avoid — can cause layout shifts on mobile */
#list {
  height: 100vh;
}
```

### Safe area insets

On devices with notches or rounded corners (iPhone, some Android), use `env()` to keep content out of the unsafe area:

```css
#list {
  padding-bottom: env(safe-area-inset-bottom);
}

/* Or if the list has a bottom toolbar */
.toolbar {
  padding-bottom: env(safe-area-inset-bottom);
}
```



## Touch Targets

Items need to be large enough to tap accurately. Follow platform guidelines:

| Platform | Minimum | Recommended |
|----------|---------|-------------|
| iOS (HIG) | 44x44 px | 48x48 px |
| Android (MD3) | 48x48 dp | 48x48 dp |
| WCAG 2.5.8 | 44x44 px | 48x48 px |

```javascript
createVList({
  container: '#list',
  item: {
    height: 56,  // Comfortable tap target
    template: (item) => `
      <div class="list-item">
        <span class="list-item__name">${item.name}</span>
        <span class="list-item__detail">${item.detail}</span>
      </div>
    `,
  },
  items,
})
```

```css
.list-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  min-height: 48px;
}
```

### Touch feedback

vlist sets `user-select: none` on items to prevent accidental text selection during swipes. For tap feedback, use `:active` instead of `:hover`:

```css
/* Hover doesn't exist on touch — use :active */
.vlist-item:active {
  background-color: rgba(0, 0, 0, 0.05);
}
```



## Custom Scrollbar

The `scrollbar()` plugin supports both mouse and touch drag on the scrollbar thumb. It uses `mousedown`/`mousemove`/`mouseup` and `touchstart`/`touchmove`/`touchend` events.

### Mobile-friendly configuration

On touch devices, users scroll by swiping content, not by dragging a scrollbar. Configure accordingly:

```javascript
import { createVList, scrollbar } from 'vlist'

const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

createVList({
  container: '#list',
  item: { height: 56, template: myTemplate },
  items,
}, [
  scrollbar({
    autoHide: true,
    autoHideDelay: isTouchDevice ? 800 : 1000,
    showOnHover: !isTouchDevice,       // No hover state on touch
    showOnViewportEnter: !isTouchDevice,
  }),
])
```

### Or hide it entirely

For carousels or lists where the scrollbar adds no value on mobile:

```javascript
createVList({
  container: '#list',
  scroll: { scrollbar: 'none' },
  // ...
})
```



## Idle Timeout

Mobile touch events have larger gaps between them than desktop scroll events. Increase the idle timeout to avoid premature idle detection:

```javascript
createVList({
  container: '#list',
  scroll: {
    idleTimeout: 250, // Default 150ms — increase for mobile
  },
  // ...
})
```

When idle fires, vlist loads deferred data, re-enables CSS transitions, and resets the velocity tracker. Too short a timeout on mobile can cause data loads mid-fling.



## Performance

vlist's architecture is already optimized for mobile constraints (limited RAM, weaker CPU):

- **Virtual rendering** — Only ~20 items in the DOM regardless of list size
- **Element pooling** — DOM elements are recycled, not destroyed and recreated
- **Zero-allocation scroll path** — No GC pauses during scroll
- **CSS containment** — `.vlist-content` uses `contain: layout style`, items use `contain: content` and `will-change: transform`
- **Passive scroll listener** — Browser scrolls on compositor thread, not blocked by JS

### What to watch for

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Janky scroll on first load | Too many initial items | Start with fewer items, load more on scroll |
| Scroll pauses briefly | GC from template allocations | Avoid creating objects in templates |
| Items flash white | Images loading slowly | Use placeholder backgrounds, preload images |
| List height jumps | iOS address bar showing/hiding | Use `dvh` units |



## Examples

### Full-Screen Contact List

```javascript
import { createVList } from 'vlist'
import 'vlist/styles'

createVList({
  container: '#contacts',
  scroll: { idleTimeout: 250 },
  item: {
    height: 64,
    template: (contact) => `
      <div class="contact">
        <img class="contact__avatar" src="${contact.avatar}" alt="" />
        <div class="contact__info">
          <div class="contact__name">${contact.name}</div>
          <div class="contact__phone">${contact.phone}</div>
        </div>
      </div>
    `,
  },
  items: contacts,
})
```

```css
#contacts {
  height: 100dvh;
  padding-bottom: env(safe-area-inset-bottom);
}

.contact {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
}

.contact__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
}

.contact__name {
  font-size: 16px;
  font-weight: 600;
}

.contact__phone {
  font-size: 14px;
  color: #888;
}

.vlist-item:active {
  background: rgba(0, 0, 0, 0.04);
}
```

### Mobile Chat

```javascript
import { createVList } from 'vlist'

createVList({
  container: '#chat',
  reverse: true,
  scroll: { idleTimeout: 250 },
  item: {
    height: (index) => messages[index].height,
    template: (msg) => `
      <div class="bubble bubble--${msg.own ? 'own' : 'other'}">
        ${msg.text}
      </div>
    `,
  },
  items: messages,
})
```

```css
#chat {
  height: calc(100dvh - 56px); /* Minus input bar */
  padding-bottom: env(safe-area-inset-bottom);
}

.bubble {
  max-width: 75%;
  padding: 8px 12px;
  margin: 4px 16px;
  border-radius: 18px;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.bubble--own {
  margin-left: auto;
  background: #007aff;
  color: white;
}

.bubble--other {
  margin-right: auto;
  background: #e5e5ea;
  color: #1c1c1e;
}
```



## Browser Support

| Browser | Minimum | Notes |
|---------|---------|-------|
| iOS Safari | 15+ | `dvh` units require iOS 15.4+ |
| Chrome (Android) | 108+ | `dvh` units require Chrome 108+ |
| Firefox (Android) | 94+ | Full support |
| Samsung Internet | 20+ | Chromium-based |

For older browsers, fall back to `100vh` with a JavaScript resize handler.



## Summary

| Area | Recommendation |
|------|---------------|
| **Scrolling** | Works natively — nothing to configure |
| **Height** | Use `dvh` units, not `vh` |
| **Safe areas** | Use `env(safe-area-inset-bottom)` for notch devices |
| **Tap targets** | Minimum 48px height |
| **Touch feedback** | `:active` not `:hover` |
| **Scrollbar** | Hide or set `showOnHover: false` on touch |
| **Idle timeout** | Increase to 200-300ms |
| **Performance** | Virtual rendering handles it — keep templates fast |

## Further Reading

- [Optimization](/tutorials/optimization) — Template performance and data loading
- [Styling](/tutorials/styling) — CSS customization and theming
- [Scrollbar Plugin](/docs/plugins/scrollbar) — Custom scrollbar configuration
- [Chat Interface](/tutorials/chat-interface) — Reverse mode for messaging UIs
