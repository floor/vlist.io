# Placeholders

> Realistic skeleton loading states with zero template duplication.

## Overview

The placeholder system generates realistic loading skeletons by capturing **per-item field lengths** from the first loaded data batch. Placeholders carry the same field names as real items, filled with mask characters sized to match actual data — so the **same template** renders both states. The renderer auto-detects placeholders and applies a CSS class; no JS branching needed.

**Key features:**

- **Per-item length profiles** — captures field lengths from each item in the first batch, not aggregates
- **Natural variance** — cycles through real data profiles so each placeholder has unique, realistic sizes
- **Single template** — same `itemTemplate` renders both real and placeholder items
- **CSS-driven styling** — renderer toggles `.vlist-item--placeholder` on the wrapper; CSS handles the rest
- **Zero config** — works automatically with `withAsync()`, no setup required

## How It Works

```
First batch loads (e.g. 25 items)
    ↓
analyzeStructure() captures per-item field lengths
    ↓
LengthProfile[] = [
  { name: 12, email: 24, role: 8 },   ← from item 0
  { name: 17, email: 28, role: 14 },  ← from item 1
  { name: 9,  email: 22, role: 11 },  ← from item 2
  ...
]
    ↓
Placeholder #N uses profiles[N % profiles.length]
    ↓
{ id: '__placeholder_42', name: 'xxxxxxxxxxxx', email: 'xxxxxxxxxxxxxxxxxxxxxxxx', role: 'xxxxxxxx' }
    ↓
Same template renders it → same HTML structure
    ↓
Renderer adds .vlist-item--placeholder to wrapper
    ↓
CSS: color: transparent + background → skeleton block
```

### Before (old approach — template duplication)

```javascript
// ❌ Had to define a separate placeholder template
const placeholderTemplate = () => `
  <div class="item-content">
    <div class="item-avatar item-avatar--placeholder"></div>
    <div class="item-details">
      <div class="item-name item-name--placeholder"></div>
      <div class="item-email item-email--placeholder"></div>
    </div>
  </div>
`;

// ❌ Had to branch on _isPlaceholder in the item template
const itemTemplate = (item, index) => {
  if (item._isPlaceholder) return placeholderTemplate();

  return `
    <div class="item-content">
      <div class="item-avatar">${item.avatar}</div>
      <div class="item-details">
        <div class="item-name">${item.name}</div>
        <div class="item-email">${item.email}</div>
      </div>
    </div>
  `;
};
```

### After (new approach — single template)

```javascript
// ✅ One template for both real items and placeholders
const itemTemplate = (item, index) => {
  const displayName = item.name || '';
  const avatarText = item.avatar || displayName[0] || '';

  return `
    <div class="item-content">
      <div class="item-avatar">${avatarText}</div>
      <div class="item-details">
        <div class="item-name">${displayName}</div>
        <div class="item-email">${item.email || ''}</div>
      </div>
    </div>
  `;
};
```

```css
/* ✅ CSS handles the visual difference */
.vlist-item--placeholder .item-avatar {
    background: #e0e0e4;
    color: transparent;
}

.vlist-item--placeholder .item-name,
.vlist-item--placeholder .item-email {
    color: transparent;
    background: #e0e0e4;
    border-radius: 4px;
    width: fit-content;
    min-width: 30%;
    line-height: 1;
}
```

## Quick Start

Placeholders work automatically with `withAsync()` — no configuration needed:

```javascript
import { vlist, withAsync } from 'vlist';

const list = vlist({
  container: '#app',
  item: {
    height: 72,
    template: (item, index) => `
      <div class="item">
        <div class="item-name">${item.name || ''}</div>
        <div class="item-email">${item.email || ''}</div>
      </div>
    `,
  },
})
.use(withAsync({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/users?offset=${offset}&limit=${limit}`);
      const data = await res.json();
      return { items: data.items, total: data.total };
    },
  },
}))
.build();
```

Then add CSS for the placeholder state:

```css
.vlist-item--placeholder .item-name,
.vlist-item--placeholder .item-email {
    color: transparent;
    background: var(--placeholder-bg, #e0e0e4);
    border-radius: 4px;
    width: fit-content;
    min-width: 30%;
    line-height: 1;
}
```

That's it. The first batch loads, the placeholder system captures field lengths, and all subsequent placeholders have realistic sizes.

## CSS Styling Guide

The renderer applies two CSS classes to placeholder items:

| Class | When | Purpose |
|-------|------|---------|
| `.vlist-item--placeholder` | Item is a placeholder | Style as skeleton |
| `.vlist-item--replaced` | Placeholder just replaced with real data | Fade-in animation (300ms) |

### Core Technique

The trick: mask characters (`x`) determine the **width** of each skeleton block. CSS makes the text transparent and shows a background instead:

```css
.vlist-item--placeholder .field {
    color: transparent;          /* Hide mask characters */
    background: #e0e0e4;        /* Show skeleton block */
    border-radius: 4px;         /* Rounded corners */
    width: fit-content;         /* Width = mask text width (realistic) */
    min-width: 20%;             /* Fallback for pre-analysis state */
    line-height: 1;             /* Tighter blocks, matching text density */
}
```

### Built-in CSS

vlist ships with base placeholder styles in `vlist.css`:

```css
/* Placeholder item — pulsing opacity */
.vlist-item--placeholder {
    opacity: 0.6;
    animation: vlist-placeholder-pulse 2s ease-in-out infinite;
}

@keyframes vlist-placeholder-pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 0.4; }
}

/* Fade-in when placeholder is replaced with real data */
.vlist-item--replaced {
    animation: fade-in 0.3s ease-out;
}
```

### Example: User List Skeleton

```css
/* Avatar — neutral circle */
.vlist-item--placeholder .item-avatar {
    background: var(--placeholder-bg, #e0e0e4);
    color: transparent;
}

/* Text fields — skeleton blocks with realistic widths */
.vlist-item--placeholder .item-name {
    color: transparent;
    background: var(--placeholder-bg, #e0e0e4);
    border-radius: 4px;
    width: fit-content;
    min-width: 40%;
    line-height: 1;
}

.vlist-item--placeholder .item-email {
    color: transparent;
    background: var(--placeholder-bg, #e0e0e4);
    border-radius: 4px;
    width: fit-content;
    min-width: 50%;
    line-height: 1;
}

.vlist-item--placeholder .item-role {
    color: transparent;
    background: var(--placeholder-bg, #e0e0e4);
    border-radius: 4px;
    width: fit-content;
    min-width: 20%;
    line-height: 1;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
    :root { --placeholder-bg: #2a2d35; }
}
```

### Styling Tips

**`line-height: 1`** — Without this, skeleton blocks fill the full line-height (~1.4×), making items appear taller than real data. Setting `line-height: 1` collapses blocks to match the visual density of text.

**`width: fit-content`** — Lets the mask text determine block width. Each placeholder has different mask lengths (derived from real data), producing natural variance.

**`min-width`** — Ensures pre-analysis placeholders (before the first batch loads) still show visible blocks even when fields are empty.

**`border-radius: 4px`** — Softens the skeleton blocks. Adjust to match your design system.

## Configuration

Placeholder behavior is configured through `PlaceholderConfig`, passed via the data manager:

```typescript
interface PlaceholderConfig {
  /** Character used for masking text (default: 'x') */
  maskCharacter?: string;

  /** Maximum items to sample for length profiling (default: 20) */
  maxSampleSize?: number;
}
```

### `maskCharacter`

The character repeated to fill placeholder fields. Default is `x` — chosen because its width closely matches average text character width. Since CSS makes the text transparent, the character is never visible; it only determines skeleton block width.

```javascript
// Default: 'x' — realistic text width
createPlaceholderManager({ maskCharacter: 'x' });

// Wider blocks
createPlaceholderManager({ maskCharacter: 'M' });

// Narrower blocks
createPlaceholderManager({ maskCharacter: 'i' });
```

### `maxSampleSize`

Maximum number of items from the first batch to capture profiles from. Default is `20`. Higher values give more profile variety at the cost of a tiny bit more memory.

```javascript
// Sample more items for greater variety
createPlaceholderManager({ maxSampleSize: 50 });
```

## API Reference

### `createPlaceholderManager`

Creates a placeholder manager instance. Typically you don't call this directly — `withAsync()` manages it internally.

```typescript
function createPlaceholderManager<T extends VListItem>(
  config?: PlaceholderConfig
): PlaceholderManager<T>;
```

### PlaceholderManager Interface

```typescript
interface PlaceholderManager<T extends VListItem> {
  /** Capture per-item field lengths from sample items */
  analyzeStructure: (items: T[]) => void;

  /** Check if structure has been analyzed */
  hasAnalyzedStructure: () => boolean;

  /** Generate a single placeholder item */
  generate: (index: number) => T;

  /** Generate multiple placeholder items */
  generateRange: (start: number, end: number) => T[];

  /** Clear analyzed structure and reset state */
  clear: () => void;
}
```

### Utility Functions

```typescript
/** Check if an item is a placeholder */
function isPlaceholderItem(item: unknown): boolean;

/** Filter out placeholder items from an array */
function filterPlaceholders<T extends VListItem>(items: T[]): T[];

/** Count non-placeholder items in an array */
function countRealItems<T extends VListItem>(items: (T | undefined)[]): number;
```

### Constants

```typescript
/** Default mask character — 'x' for realistic text width */
const DEFAULT_MASK_CHARACTER = 'x';

/** Maximum items to sample for profiles (default: 20) */
const DEFAULT_MAX_SAMPLE_SIZE = 20;

/** Internal flag on placeholder items */
const PLACEHOLDER_FLAG = '_isPlaceholder';

/** ID prefix for placeholder items */
const PLACEHOLDER_ID_PREFIX = '__placeholder_';
```

## How Detection Works

The renderer detects placeholders by checking the item's `id` prefix:

```typescript
// In renderer — when creating a new element
if (String(item.id).startsWith('__placeholder_')) {
  element.classList.add('vlist-item--placeholder');
}

// When item changes (placeholder → real data)
if (wasPlaceholder && !isPlaceholder) {
  element.classList.remove('vlist-item--placeholder');
  element.classList.add('vlist-item--replaced');
  setTimeout(() => element.classList.remove('vlist-item--replaced'), 300);
}
```

This runs in both the builder (`core.ts`) and standalone renderer (`renderer.ts`).

## Per-Item Length Profiles

The key innovation over the old approach (which computed min/max/avg per field across all samples) is capturing **individual item profiles**:

### Old Approach (aggregate stats)

```
Sample 3 items:
  User 1: name="Al"        (2 chars)
  User 2: name="Elizabeth"  (9 chars)
  User 3: name="Bob"       (3 chars)

→ FieldStructure: { minLength: 2, maxLength: 9, avgLength: 5 }
→ All placeholders get name length ~5 (random within 2-9)
→ Uniform appearance, doesn't reflect real data distribution
```

### New Approach (per-item profiles)

```
Sample 3 items:
  User 1: name="Al"        → profile[0] = { name: 2, email: 14, role: 8 }
  User 2: name="Elizabeth"  → profile[1] = { name: 9, email: 26, role: 16 }
  User 3: name="Bob"       → profile[2] = { name: 3, email: 18, role: 7 }

→ Placeholder #0 uses profile[0]: name=2, email=14
→ Placeholder #1 uses profile[1]: name=9, email=26
→ Placeholder #2 uses profile[2]: name=3, email=18
→ Placeholder #3 uses profile[0]: name=2, email=14  (cycles)
→ Each placeholder reflects a real item's proportions
```

### Field Analysis

All fields except `id` and underscore-prefixed fields (`_internal`, `_cache`) are captured. Values are converted to strings to measure length:

| Field type | Example value | Captured length |
|-----------|---------------|-----------------|
| string | `"John Doe"` | 8 |
| number | `42` | 2 (`String(42)`) |
| boolean | `true` | 4 (`String(true)`) |
| null | `null` | 0 (clamped to 1) |
| object | `{ key: "val" }` | 15 (`String(...)`) |

## Template Guidelines

Since the same template renders both states, follow these patterns:

### Use `|| ''` Fallbacks

Pre-analysis placeholders (before the first batch loads) have no data fields. Always provide fallbacks:

```javascript
// ✅ Safe — handles undefined fields
const itemTemplate = (item, index) => `
  <div class="name">${item.name || ''}</div>
  <div class="email">${item.email || ''}</div>
`;

// ❌ Unsafe — crashes when item.name is undefined
const itemTemplate = (item, index) => `
  <div class="name">${item.name}</div>
  <div class="avatar">${item.name[0]}</div>
`;
```

### Avoid Conditional Logic on Field Values

Since all placeholder fields are mask strings (even numbers/booleans), avoid logic that depends on field types:

```javascript
// ❌ Will fail — placeholder age is 'xx', not a number
const template = (item) => `
  <div>${item.age > 18 ? 'Adult' : 'Minor'}</div>
`;

// ✅ CSS handles the difference — no branching needed
const template = (item) => `
  <div class="age">${item.age || ''}</div>
`;
```

### Handle Computed Values Safely

When computing derived values (like display names from multiple fields), guard against undefined:

```javascript
const template = (item, index) => {
  const displayName = item.firstName
    ? `${item.firstName} ${item.lastName}`
    : item.name || '';
  const avatarText = item.avatar || displayName[0] || '';

  return `
    <div class="avatar">${avatarText}</div>
    <div class="name">${displayName}</div>
  `;
};
```

## Placeholder Lifecycle

```
1. List initializes with total (e.g. from snapshot or adapter)
   └─ Placeholders generated with basic fallback (label only)
   └─ Template renders with empty/minimal content
   └─ CSS min-width ensures visible skeleton blocks

2. First batch loads (e.g. items 0-24)
   └─ analyzeStructure() captures 20 length profiles
   └─ Renderer replaces placeholders with real data
   └─ .vlist-item--replaced triggers fade-in animation

3. User scrolls to unloaded range (e.g. items 500-520)
   └─ generate() creates placeholders using profiles[N % 20]
   └─ Same template renders realistic skeleton blocks
   └─ .vlist-item--placeholder triggers pulse animation

4. Data loads for that range
   └─ Renderer detects ID change (placeholder → real)
   └─ Removes .vlist-item--placeholder
   └─ Adds .vlist-item--replaced for fade-in
   └─ Real data visible
```

## Performance

- **Zero overhead for static lists** — placeholder manager is lazily created only when the first unloaded item is requested
- **One-time analysis** — `analyzeStructure()` runs once on the first batch, then never again
- **Minimal memory** — stores up to 20 `LengthProfile` objects (plain `{ field: number }` maps)
- **No DOM queries** — detection is by ID prefix string check, not DOM class inspection
- **Efficient cycling** — `profiles[index % profiles.length]` is a single modulo operation

## Related

- [Async Module](./async.md) — Data loading, sparse storage, and the `withAsync()` feature
- [Scale](./scale.md) — Compression for 1M+ item lists where placeholders are most useful
- [Snapshots](./snapshots.md) — Save/restore scroll position (triggers pre-analysis placeholder state)