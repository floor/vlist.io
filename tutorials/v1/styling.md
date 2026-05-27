# Styles

> CSS styling system for vlist with design tokens, variants, dark mode support, and performance-optimized CSS.

## Overview

vlist uses a CSS custom properties (design tokens) system that provides:

- **Zero runtime overhead** — Pure CSS, no JavaScript styling
- **Dark mode support** — Three strategies: `prefers-color-scheme`, `.dark` class, or `[data-theme-mode]` attribute
- **Customizable** — Override tokens to match your design system
- **Variants** — Pre-built compact, comfortable, and borderless styles
- **Tailwind compatible** — Works alongside Tailwind CSS v4+
- **Performance-optimized** — CSS containment, `will-change`, and scroll transition suppression
- **Modular CSS** — Core styles + opt-in feature stylesheets for grid, masonry, table, and extras

## Quick Start

### Import Styles

```typescript
import { vlist } from 'vlist';
import 'vlist/styles';

const list = vlist({
  container: '#app',
  item: {
    height: 48,
    template: (item) => `<div>${item.name}</div>`,
  },
  items: data
});
```

### Import Feature Styles

CSS is split into **core** + **feature modules** so you only load what you use:

| Import | File | Size | Contents |
|--------|------|------|----------|
| `vlist/styles` | `vlist.css` | 7.4 KB | Tokens, base list, item states, scrollbar, groups, horizontal mode |
| `vlist/styles/grid` | `vlist-grid.css` | 1.2 KB | Grid layout item styles |
| `vlist/styles/masonry` | `vlist-masonry.css` | 1.3 KB | Masonry layout item styles |
| `vlist/styles/table` | `vlist-table.css` | 7.2 KB | Table layout (header, rows, cells, resize) |
| `vlist/styles/extras` | `vlist-extras.css` | 1.1 KB | Variants, loading/empty states, enter animation |

```typescript
// Core styles (always required)
import 'vlist/styles';

// Feature styles — import alongside the matching feature
import 'vlist/styles/grid';     // when using withGrid()
import 'vlist/styles/masonry';  // when using withMasonry()
import 'vlist/styles/table';    // when using withTable()

// Optional extras (variants, loading states, animations)
import 'vlist/styles/extras';
```

### Using a CDN

```html
<!-- Core (always required) -->
<link rel="stylesheet" href="https://unpkg.com/vlist/dist/vlist.css">

<!-- Feature styles (import what you use) -->
<link rel="stylesheet" href="https://unpkg.com/vlist/dist/vlist-grid.css">
<link rel="stylesheet" href="https://unpkg.com/vlist/dist/vlist-masonry.css">
<link rel="stylesheet" href="https://unpkg.com/vlist/dist/vlist-table.css">

<!-- Optional extras -->
<link rel="stylesheet" href="https://unpkg.com/vlist/dist/vlist-extras.css">
```

## CSS Classes

### Structure Classes

| Class | Element | Description |
|-------|---------|-------------|
| `.vlist` | Root | Container element, sets dimensions and overflow |
| `.vlist-viewport` | Scrollable area | Handles scroll with native scrollbar |
| `.vlist-content` | Content wrapper | Sets total height (or width in horizontal mode) for scroll |
| `.vlist-items` | Items container | Holds rendered item elements |
| `.vlist-item` | Individual item | Positioned absolutely with transforms |

### State Classes

| Class | Description |
|-------|-------------|
| `.vlist-item--selected` | Applied to selected items |
| `.vlist-item--focused` | Applied to keyboard-focused item |
| `.vlist-item--odd` | Applied to odd-indexed items when `item.striped` is enabled |
| `.vlist-item--placeholder` | Applied to placeholder items during async loading |
| `.vlist-item--replaced` | Applied briefly when a placeholder is replaced with real data |
| `.vlist-item--enter` | Applied briefly for slide-in animation (requires extras CSS) |
| `.vlist--scrolling` | Applied to root during active scroll (suppresses CSS transitions) |
| `.vlist--selectable` | Applied to root when selection is enabled |

### Layout Modifier Classes

| Class | Description |
|-------|-------------|
| `.vlist--horizontal` | Horizontal scroll mode — swaps scroll axis, item positioning, and border direction |
| `.vlist--grid` | Grid layout mode (requires `vlist/styles/grid`) |
| `.vlist--masonry` | Masonry layout mode (requires `vlist/styles/masonry`) |
| `.vlist--table` | Table layout mode (requires `vlist/styles/table`) |
| `.vlist--grouped` | Applied when `groups` config is present |

### Custom Scrollbar Classes

Used in compressed mode (1M+ items):

| Class | Description |
|-------|-------------|
| `.vlist-scrollbar` | Scrollbar track container |
| `.vlist-scrollbar--visible` | Shows the scrollbar |
| `.vlist-scrollbar--dragging` | Active during thumb drag |
| `.vlist-scrollbar-thumb` | Draggable thumb element |
| `.vlist-viewport--custom-scrollbar` | Hides native scrollbar when custom scrollbar is active |
| `.vlist-viewport--no-scrollbar` | Hides scrollbar completely (`scroll.scrollbar: "none"`) |
| `.vlist-viewport--gutter` | Reserves layout space for the scrollbar track (`gutter: true`) |
| `.vlist-viewport--gutter-stable` | Reserves stable gutter space for native scrollbar |

---

## Design Tokens

All visual properties are controlled via CSS custom properties defined in `:root`.

### Theme-Invariant Tokens

These are set once and never change between light/dark modes:

```css
:root {
  /* Spacing */
  --vlist-item-padding-x: 1rem;
  --vlist-item-padding-y: 0.75rem;
  --vlist-border-radius: 0.5rem;

  /* Transitions */
  --vlist-transition-duration: 150ms;
  --vlist-transition-timing: ease-in-out;

  /* Native (webkit) scrollbar */
  --vlist-scrollbar-width: 8px;
  --vlist-scrollbar-track-color: transparent;
  --vlist-scrollbar-radius: 4px;

  /* Custom overlay scrollbar (withScrollbar feature) */
  --vlist-custom-scrollbar-width: 8px;
  --vlist-custom-scrollbar-track-color: transparent;
  --vlist-custom-scrollbar-radius: 8px;
  --vlist-custom-scrollbar-padding-top: 2px;    /* per-side inset */
  --vlist-custom-scrollbar-padding-right: 2px;
  --vlist-custom-scrollbar-padding-bottom: 2px;
  --vlist-custom-scrollbar-padding-left: 2px;
}
```

### Color Tokens (Light Mode)

Light mode colors are the `:root` defaults — they apply with no setup:

```css
:root {
  --vlist-bg: #ffffff;                              /* Item background */
  --vlist-bg-striped: rgba(0, 0, 0, 0.02);         /* Zebra stripe (subtle) */
  --vlist-bg-hover: rgba(0, 0, 0, 0.04);           /* Hover state */
  --vlist-bg-selected: rgba(59, 130, 246, 0.12);   /* Selected state (blue tint) */
  --vlist-bg-selected-hover: rgba(59, 130, 246, 0.18); /* Selected + hover (stronger) */
  --vlist-border: #e5e7eb;                          /* Borders / dividers */
  --vlist-border-selected: #3b82f6;                 /* Selected accent */
  --vlist-text: #111827;                            /* Primary text */
  --vlist-text-muted: #6b7280;                      /* Secondary text */
  --vlist-focus-ring: #3b82f6;                      /* Keyboard focus outline */
  --vlist-group-header-bg: #f3f4f6;                 /* Group header background */
  --vlist-scrollbar-thumb-color: #d1d5db;                           /* Native scrollbar thumb */
  --vlist-scrollbar-thumb-hover-color: #9ca3af;                     /* Native scrollbar hover */
  --vlist-custom-scrollbar-thumb-color: rgba(0, 0, 0, 0.3);        /* Custom overlay thumb */
  --vlist-custom-scrollbar-thumb-hover-color: rgba(0, 0, 0, 0.5);  /* Custom overlay hover */
  --vlist-placeholder-bg: rgba(0, 0, 0, 0.2);      /* Placeholder skeleton */
}
```

#### State Hierarchy

The state backgrounds follow a clear visual hierarchy — each level is more prominent than the last:

| State | Opacity | Purpose |
|-------|---------|---------|
| Striped | 2% black | Decorative zebra — barely visible |
| Hover | 4% black | Interactive feedback — clearly visible |
| Selected | 12% blue | Distinct accent color |
| Selected + hover | 18% blue | Stronger — confirms "still pointing at this" |

### Color Tokens (Dark Mode)

Dark mode overrides only the color tokens. The same set is applied via three selectors for different integration patterns:

```css
/* All three selectors set the same dark color tokens */
[data-theme-mode="dark"],    /* Explicit attribute */
.dark {                       /* Tailwind convention */
  --vlist-bg: #111827;
  --vlist-bg-striped: rgba(255, 255, 255, 0.02);
  --vlist-bg-hover: rgba(255, 255, 255, 0.06);
  --vlist-bg-selected: rgba(59, 130, 246, 0.2);
  --vlist-bg-selected-hover: rgba(59, 130, 246, 0.28);
  --vlist-border: #374151;
  --vlist-border-selected: #3b82f6;
  --vlist-text: #f9fafb;
  --vlist-text-muted: #9ca3af;
  --vlist-focus-ring: #3b82f6;
  --vlist-group-header-bg: #1e2433;
  --vlist-scrollbar-thumb-color: #4b5563;
  --vlist-scrollbar-thumb-hover-color: #6b7280;
  --vlist-custom-scrollbar-thumb-color: rgba(255, 255, 255, 0.3);
  --vlist-custom-scrollbar-thumb-hover-color: rgba(255, 255, 255, 0.5);
  --vlist-placeholder-bg: rgba(255, 255, 255, 0.3);
}

/* OS-level preference (auto, no JS needed) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme-mode="light"]):not([data-theme-mode="dark"]) {
    /* Same dark tokens as above */
  }
}
```

---

## Customization

### Override Tokens

Apply custom values to match your design system:

```css
:root {
  --vlist-bg: #fafafa;
  --vlist-bg-selected: rgba(14, 165, 233, 0.15);
  --vlist-border-selected: #0ea5e9;
  --vlist-focus-ring: #0ea5e9;
  --vlist-border-radius: 0.75rem;
}
```

### Scoped Customization

Apply different styles to specific lists:

```css
.my-custom-list {
  --vlist-bg: #1e1e2e;
  --vlist-text: #cdd6f4;
  --vlist-bg-selected: rgba(137, 180, 250, 0.2);
}
```

```html
<div id="my-list" class="my-custom-list"></div>
```

### Custom Class Prefix

Change the default `vlist` prefix:

```typescript
const list = vlist({
  container: '#app',
  classPrefix: 'mylist',  // Uses .mylist, .mylist-item, etc.
  // ...
});
```

Then update your CSS accordingly:

```css
.mylist { /* ... */ }
.mylist-item { /* ... */ }
.mylist-item--selected { /* ... */ }
```

---

## Zebra Striping

Virtual lists recycle DOM elements out of document order, so CSS `:nth-child(even/odd)` **does not work** for logical striping. vlist solves this with JavaScript-based striping that toggles a `.vlist-item--odd` class based on the real item index.

### Enable Striping

```typescript
const list = vlist({
  container: '#app',
  item: {
    height: 48,
    striped: true,            // true, "even", "odd", or "data"
    template: (item) => `...`,
  },
  items: data
});
```

### Striping Modes

| Mode | Description |
|------|-------------|
| `true` | Simple alternation by item index |
| `"even"` | Even items get the odd class (resets per group) |
| `"odd"` | Odd items get the odd class (resets per group) |
| `"data"` | Skips group headers — only data items alternate |

The `.vlist-item--odd` class is styled in `vlist.css` using the `--vlist-bg-striped` token. Selected state always overrides the stripe background.

---

## Variants

Variants are opt-in CSS classes from `vlist/styles/extras`.

### Compact

Reduced padding for dense lists:

```html
<div id="list" class="vlist vlist--compact"></div>
```

### Comfortable

Increased padding for touch-friendly lists:

```html
<div id="list" class="vlist vlist--comfortable"></div>
```

### Borderless

Remove container and item borders:

```html
<div id="list" class="vlist vlist--borderless"></div>
```

### Combining Variants

```html
<div id="list" class="vlist vlist--compact vlist--borderless"></div>
```

---

## Dark Mode

vlist supports three dark mode strategies. All three set the same color tokens — use whichever matches your app.

### 1. Automatic (OS Preference)

Works with zero JavaScript — dark colors apply when the user's system prefers dark:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme-mode="light"]):not([data-theme-mode="dark"]) {
    /* dark tokens applied automatically */
  }
}
```

This is skipped when an explicit `data-theme-mode` attribute is set, preventing conflicts with manual toggles.

### 2. Tailwind / Class-Based

Use the `.dark` class on any ancestor element:

```html
<html class="dark">
  <body>
    <div id="list"></div>
  </body>
</html>
```

### 3. Explicit Attribute

Use `data-theme-mode` for full control (light/dark toggle):

```html
<html data-theme-mode="dark">
  <body>
    <div id="list"></div>
  </body>
</html>
```

Switch themes by changing the attribute:

```typescript
document.documentElement.dataset.themeMode = 'light'; // or 'dark'
```

---

## Template Styling

Style items directly in your template function:

```typescript
const list = vlist({
  container: '#app',
  item: {
    height: 64,
    template: (item, index, { selected, focused }) => `
    <div class="flex items-center gap-4 w-full">
      <img
        src="${item.avatar}"
        class="w-10 h-10 rounded-full"
        alt="${item.name}"
      />
      <div class="flex-1 min-w-0">
        <div class="font-medium truncate ${selected ? 'text-blue-600' : ''}">${item.name}</div>
        <div class="text-sm text-gray-500 truncate">${item.email}</div>
      </div>
    </div>
  `,
  },
  items: users,
})
.use(withSelection({ mode: 'single' }))
.build();
```

### Template Context

The template function receives useful state:

```typescript
item: {
  height: 48,
  template: (item, index, context) => {
    const { selected, focused } = context;
    // selected: boolean - Is this item selected?
    // focused: boolean - Is this item keyboard-focused?
    return `...`;
  },
}
```

---

## Tailwind CSS Integration

vlist works alongside Tailwind CSS out of the box. Tailwind utility classes can be used freely inside templates, and vlist's `.dark` class integration matches Tailwind's dark mode convention.

### Dark Mode

Tailwind's class-based dark mode (`.dark` on `<html>`) is natively supported — vlist detects it and applies dark tokens automatically:

```html
<html class="dark">
  <body>
    <div id="list"></div> <!-- vlist picks up dark mode -->
  </body>
</html>
```

No extra configuration needed. Tailwind and vlist share the same `.dark` class convention.

### Utility Classes in Templates

Use Tailwind classes directly in your item templates:

```typescript
const list = vlist({
  container: '#app',
  item: {
    height: 64,
    template: (item, index, { selected }) => `
      <div class="flex items-center gap-3 px-4 w-full">
        <img src="${item.avatar}" class="w-8 h-8 rounded-full" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">${item.name}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 truncate">${item.email}</div>
        </div>
        ${selected ? '<div class="w-2 h-2 rounded-full bg-blue-500"></div>' : ''}
      </div>
    `,
  },
  items: users,
})
.use(withSelection({ mode: 'single' }))
.build();
```

> **Tip:** Tailwind's `dark:` variants work inside templates because the `.dark` class is on an ancestor element.

### Overriding Tokens with Tailwind

You can remap vlist tokens to Tailwind's color palette using `@theme` or plain CSS:

```css
/* Map vlist tokens to your Tailwind theme */
:root {
  --vlist-bg-selected: theme('colors.blue.100 / 0.5');
  --vlist-border-selected: theme('colors.blue.500');
  --vlist-focus-ring: theme('colors.blue.500');
  --vlist-border-radius: theme('borderRadius.lg');
}
```

### Preflight Considerations

Tailwind's [Preflight](https://tailwindcss.com/docs/preflight) reset is generally compatible with vlist. However, if you notice unexpected styling (e.g., borders or margins on vlist elements), ensure `vlist/styles` is imported **after** Tailwind's base layer:

```css
/* Your main CSS file */
@import 'tailwindcss';

/* vlist styles after Tailwind base — ensures vlist rules take precedence */
@import 'vlist/styles';
@import 'vlist/styles/extras';
```

---

## Loading & Empty States

These classes are defined in `vlist/styles/extras`.

### Loading Overlay

The loading overlay adapts to light/dark mode automatically via `color-mix()`:

```css
.vlist-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: color-mix(in srgb, var(--vlist-bg) 80%, transparent);
  backdrop-filter: blur(4px);
  z-index: 20;
}

.vlist-loading-spinner {
  width: 2rem;
  height: 2rem;
  border: 4px solid var(--vlist-border);
  border-top-color: var(--vlist-focus-ring);
  border-radius: 50%;
  animation: vlist-spin 1s linear infinite;
}
```

### Empty State

```css
.vlist-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--vlist-text-muted);
  padding: 2rem;
  text-align: center;
}

.vlist-empty-text {
  font-size: 1.125rem;
  font-weight: 500;
}

.vlist-empty-subtext {
  font-size: 0.875rem;
  margin-top: 0.25rem;
  opacity: 0.75;
}
```

---

## Animations

### Placeholder → Real Data

When async-loaded items replace placeholders, a subtle fade-in is applied automatically via core CSS:

```css
@keyframes vlist-fade-in {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.vlist-item--replaced {
  animation: vlist-fade-in 0.3s ease-out;
}
```

### Item Enter (Extras)

For a slide-in effect on new items, use the `.vlist-item--enter` class from `vlist/styles/extras`:

```css
@keyframes vlist-item-enter {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vlist-item--enter {
  animation: vlist-item-enter 0.2s ease-out;
}
```

---

## CSS Performance Optimizations

vlist applies several CSS-level performance optimizations automatically.

### CSS Containment

```css
/* Items container — layout and style containment */
.vlist-items {
  contain: layout style;
}

/* Individual items — content containment + compositing hint */
.vlist-item {
  contain: content;
  will-change: transform;
}
```

- **`contain: layout style`** on the items container tells the browser that layout/style changes inside won't affect outside elements
- **`contain: content`** on items is a stricter containment that enables more aggressive optimization
- **`will-change: transform`** promotes items to their own compositing layer for smooth GPU-accelerated positioning

### Static Positioning via CSS

Item positioning uses CSS classes instead of inline `style.cssText`. The `.vlist-item` class sets `position: absolute; top: 0; left: 0; right: 0` — only the dynamic `height` and `transform` (for Y positioning) are set via JavaScript. This eliminates per-element CSS string parsing.

### Scroll Transition Suppression

During active scrolling, the `.vlist--scrolling` class is added to the root element. This disables CSS transitions on items to prevent visual jank:

```css
.vlist--scrolling .vlist-item {
  transition: none;
}
```

When scrolling stops (idle detected), the class is removed and transitions are re-enabled. This ensures smooth 60fps scrolling while preserving animations during interaction.

> **Note:** Never add `transition: transform` to `.vlist-item` — items are positioned via `transform: translateY()`, and transitioning that property causes jittery, sluggish scrolling instead of crisp repositioning.

---

## Best Practices

### 1. Use Design Tokens

Always use CSS custom properties instead of hardcoding values:

```css
/* ✅ Good */
.my-item {
  background: var(--vlist-bg-selected);
}

/* ❌ Avoid */
.my-item {
  background: #dbeafe;
}
```

### 2. Scope Custom Styles

Use specific selectors to avoid conflicts:

```css
/* ✅ Good — scoped */
#my-list .vlist-item {
  font-size: 14px;
}

/* ❌ Avoid — too broad */
.vlist-item {
  font-size: 14px;
}
```

### 3. Use `background-color` Not `background` for Item Overrides

If you style `.vlist-item--odd` or other item states, use `background-color` (longhand) so the library's selected/hover states can properly override via the `background` shorthand:

```css
/* ✅ Good — longhand, won't fight with selected state */
.my-list .vlist-item--odd {
  background-color: rgba(0, 0, 0, 0.03);
}

/* ❌ Avoid — shorthand can override selected state */
.my-list .vlist-item--odd {
  background: rgba(0, 0, 0, 0.03);
}
```

### 4. Keep Templates Lightweight

For best performance, keep template CSS minimal:

```typescript
// ✅ Good — uses existing classes
item: {
  height: 48,
  template: (item) => `
    <div class="flex items-center gap-2">
      <span>${item.name}</span>
    </div>
  `,
}

// ❌ Avoid — complex inline styles
item: {
  height: 48,
  template: (item) => `
    <div style="display:flex;align-items:center;gap:8px;padding:12px;">
      <span>${item.name}</span>
    </div>
  `,
}
```

### 5. Test Dark Mode

Always verify your customizations work in both light and dark modes. Use your browser's DevTools to toggle `prefers-color-scheme`, or set `data-theme-mode="dark"` on the root element.

---

*See also: [Getting Started](/docs/getting-started) | [API Reference](/docs/api/reference)*