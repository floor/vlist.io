# Groups Feature

> Grouped lists with sticky or inline section headers.

## Overview

The groups feature transforms a flat list into sections with headers. Perfect for alphabetically sorted contacts, categorized items, or any list that needs visual grouping.

### What It Does

The groups feature:
- ✅ **Inserts section headers** at group boundaries
- ✅ **Sticky headers** (optional) — iOS Contacts style
- ✅ **Index mapping** — Translates between data indices and layout indices
- ✅ **Variable heights** — Headers can have different heights than items
- ✅ **Dynamic grouping** — Updates when data changes
- ✅ **Works with grid** — Full-width headers in grid layouts
- ✅ **Works with table** — Full-width group headers in data tables

### How It Works

Given a sorted list of contacts:

```typescript
const contacts = [
  { id: 1, name: 'Alice', lastName: 'Anderson' },
  { id: 2, name: 'Amy', lastName: 'Adams' },
  { id: 3, name: 'Bob', lastName: 'Brown' },
  { id: 4, name: 'Carol', lastName: 'Carter' },
  // ... 10,000 more contacts
]
```

The feature:
1. **Groups items** by first letter: A, B, C...
2. **Inserts headers** at boundaries: [A-header, Alice, Amy, B-header, Bob, C-header, Carol...]
3. **Virtualizes everything** — Only visible headers + items are rendered
4. **Maintains index mapping** — `scrollToIndex(2)` scrolls to Bob (data index 2), not the 4th layout item

### Key Features

- ✅ **Sticky headers** — Headers stick to top while scrolling (optional)
- ✅ **Efficient rendering** — Headers are virtualized like items
- ✅ **Dynamic updates** — Add/remove items, groups rebuild automatically
- ✅ **Works with variable heights** — Items and headers can have different heights
- ✅ **Grid compatible** — Headers span full width in grid layouts
- ✅ **Table compatible** — Group headers span full table width, no cells
- ✅ **Keyboard navigation** — Focus management respects groups
- ✅ **Pure TypeScript** — Zero dependencies



## Quick Start

### With Builder (Recommended)

```typescript
import { vlist, withGroups } from '@floor/vlist'

const contacts = vlist({
  container: '#contacts',
  item: {
    height: 56,
    template: (contact) => {
      const div = document.createElement('div')
      div.className = 'contact-item'
      div.textContent = contact.name
      return div
    }
  },
  items: sortedContacts // IMPORTANT: Must be pre-sorted by group
})
.use(withGroups({
  getGroupForIndex: (index) => sortedContacts[index].lastName[0],
  headerHeight: 36,
  headerTemplate: (letter) => {
    const div = document.createElement('div')
    div.className = 'section-header'
    div.textContent = letter
    return div
  },
  sticky: true // Default: true
}))
.build()
```



## Configuration

### GroupsFeatureConfig

```typescript
interface GroupsFeatureConfig {
  /** Returns group key for item at index (required) */
  getGroupForIndex: (index: number) => string

  /** Height of group headers in pixels, or a function for variable heights */
  headerHeight: number | ((group: string, groupIndex: number) => number)

  /** Render function for headers (required) */
  headerTemplate: (key: string, groupIndex: number) => HTMLElement | string

  /** Enable sticky headers — iOS Contacts style (default: true) */
  sticky?: boolean
}
```

### getGroupForIndex

**Purpose:** Determines which group an item belongs to.

**Requirements:**
- ✅ Must be deterministic (same index always returns same group)
- ✅ Items must be **pre-sorted** by group
- ✅ Returns a string (group key)

```typescript
// Alphabetical grouping
getGroupForIndex: (i) => contacts[i].lastName[0].toUpperCase()

// Date grouping (chat messages)
getGroupForIndex: (i) => {
  const date = new Date(messages[i].timestamp)
  return date.toLocaleDateString()
}

// Category grouping
getGroupForIndex: (i) => products[i].category
```

### headerHeight

**Purpose:** Height of group headers in pixels — either a fixed number or a function for variable heights.

**Requirements:**
- ✅ Must be a positive number (or a function returning one)
- ✅ Used for scroll calculations

```typescript
// Fixed height for all headers
headerHeight: 36

// Variable height per group
headerHeight: (group, groupIndex) => groupIndex === 0 ? 48 : 32
```

### headerTemplate

**Purpose:** Renders the header element.

**Signature:**
```typescript
headerTemplate: (key: string, groupIndex: number) => HTMLElement | string
```

**Parameters:**
- `key` — Group key (e.g., "A", "2026-01-15", "Electronics")
- `groupIndex` — Zero-based index of this group (0 for first group, 1 for second, etc.)

**Return Value:**
- `HTMLElement` — Direct DOM element
- `string` — HTML string (will be parsed)

```typescript
// Returns HTMLElement
headerTemplate: (letter, groupIndex) => {
  const div = document.createElement('div')
  div.className = 'section-header'
  div.textContent = letter
  div.setAttribute('data-group-index', String(groupIndex))
  return div
}

// Returns HTML string
headerTemplate: (letter) => `
  <div class="section-header">${letter}</div>
`
```

### sticky

**Purpose:** Enable/disable sticky headers.

**Values:**
- `true` (default) — Headers stick to top while scrolling
- `false` — Headers scroll with content (inline headers)

```typescript
sticky: true  // iOS Contacts style
sticky: false // iMessage style (inline date headers)
```

## Sticky Headers

### How Sticky Headers Work

When `sticky: true` (default), the feature creates a special sticky header element that:

1. **Template-driven** — The sticky header receives a `renderInto(slot, groupIndex)` callback, the same pattern as item rendering. It has zero knowledge of template format (string vs HTMLElement) — the feature owns that logic in one place
2. **Recycled slot elements** — Two permanent `.sticky-group` divs swap content via the `renderInto` callback, avoiding DOM churn during fast scrolling
3. **Pre-cached offsets** — Header positions and sizes are cached in flat arrays on rebuild, keeping the per-tick scroll handler free of function calls and allocations
4. **Smooth push transition** — Both slots are translated independently to create the push-out effect
5. **First header collapsed** — When sticky is active, the first group's inline header is collapsed to zero height (the sticky header already displays it)

### iOS Contacts Behavior

The sticky header mimics iOS Contacts:

- **Stays at top** while scrolling through a section
- **Pushes up** when the next header approaches
- **Disappears** when scrolled past the bottom of the section
- **Reappears** with the new section's header
- The first group's inline header is automatically hidden — the sticky header shows it instead, preventing duplication

### Visual Example

```
┌─────────────────────────┐
│ 🔒 A (sticky)           │ ← Sticky header at top
├─────────────────────────┤
│ Alice Anderson          │
│ Amy Adams               │
│ Andy Allen              │
│ B                       │ ← Next header approaching
│ Bob Brown               │
│ Brian Baker             │
└─────────────────────────┘

// Scroll down...

┌─────────────────────────┐
│ 🔒 B (sticky)           │ ← Now showing "B"
├─────────────────────────┤
│ Bob Brown               │
│ Brian Baker             │
│ Betty Bennett           │
│ C                       │
│ Carol Carter            │
│ Chris Cooper            │
└─────────────────────────┘
```

### Styling Sticky Headers

The sticky header container has the class `{classPrefix}-sticky-header` and contains two `.sticky-group` slot elements:

```css
.vlist-sticky-header {
  /* Set automatically by the library */
  position: absolute;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}

/* Style the slot elements that hold header content */
.sticky-group {
  position: absolute;
  will-change: transform;
}
```

## With Grid Layout

Groups work seamlessly with grid layout. Headers automatically span the full width:

```typescript
import { vlist, withGrid, withGroups } from '@floor/vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" alt="${photo.title}">`
  },
  items: sortedPhotos
})
.use(withGrid({ columns: 4, gap: 16 }))
.use(withGroups({
  getGroupForIndex: (i) => {
    const date = new Date(sortedPhotos[i].date)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  },
  headerHeight: 40,
  headerTemplate: (monthYear) => `<div class="month-header">${monthYear}</div>`,
  sticky: true
}))
.build()
```

**Result:**
```
┌────────────────────────────────────────┐
│ January 2026 (full-width header)       │
├──────────┬──────────┬──────────┬───────┤
│ Photo 1  │ Photo 2  │ Photo 3  │ Photo │
│          │          │          │   4   │
├──────────┼──────────┼──────────┼───────┤
│ Photo 5  │ Photo 6  │ Photo 7  │ Photo │
│          │          │          │   8   │
├────────────────────────────────────────┤
│ February 2026 (full-width header)      │
├──────────┬──────────┬──────────┬───────┤
│ Photo 9  │ Photo 10 │ Photo 11 │ Photo │
│          │          │          │  12   │
└──────────┴──────────┴──────────┴───────┘
```

## With Table Layout

Groups work seamlessly with data tables. Group headers render as full-width rows without cells, and the sticky group header sits below the table's column header row:

```typescript
import { vlist, withTable, withGroups } from '@floor/vlist'

const table = vlist({
  container: '#employees',
  items: sortedEmployees,
  item: { height: 40, template: () => '' },
})
.use(withTable({
  columns: [
    { key: 'name',       label: 'Name',       width: 220 },
    { key: 'email',      label: 'Email',       width: 280 },
    { key: 'department', label: 'Department',  width: 160 },
  ],
  rowHeight: 40,
  headerHeight: 44,
}))
.use(withGroups({
  getGroupForIndex: (i) => sortedEmployees[i].department,
  headerHeight: 32,
  headerTemplate: (dept) => `<div class="group-label">${dept}</div>`,
  sticky: true,
}))
.build()
```

**Result:**
```
┌──────────────────────────────────────────────────────┐
│  Name           │  Email              │  Department   │  ← column header (sticky, z-index 5)
├──────────────────────────────────────────────────────┤
│  Engineering                                         │  ← group header (full-width, no cells)
├──────────────────────────────────────────────────────┤
│  Alice Anderson  │  alice@acme.com     │  Engineering  │
│  Bob Brown       │  bob@acme.com       │  Engineering  │
├──────────────────────────────────────────────────────┤
│  Marketing                                           │  ← group header
├──────────────────────────────────────────────────────┤
│  Carol Carter    │  carol@acme.com     │  Marketing    │
│  Dave Davis      │  dave@acme.com      │  Marketing    │
└──────────────────────────────────────────────────────┘
```

**How it works:**

- The table renderer detects group header pseudo-items via `setGroupHeaderFn`
- Group headers render as full-width rows with a single content container (no cells)
- Group headers use `role="presentation"` (not data rows) and are excluded from selection
- Sticky group headers are offset by the table column header height, so they sit below it
- Column resize updates group header width alongside data rows

**Key difference from grid integration:** The grid path replaces the entire renderer. The table path configures the existing renderer in-place — because the table renderer is more complex (cells, alignment, resize), it's cheaper and safer to teach it about headers than to rebuild it.

## Striped Rows with Groups

When using `item.striped` with grouped lists, group header pseudo-items can break the alternating row pattern. The `striped` option accepts string modes that control how the even/odd index is calculated relative to group headers.

### Modes

| Value | Behavior |
|-------|----------|
| `true` | All items count, including group headers. Headers shift the stripe pattern. |
| `"data"` | Group headers are excluded from the count. The stripe index is continuous across groups — a group ending on an odd row means the next group starts on even. |
| `"even"` | Counter resets to 0 after each group header. The first data row in every group is always **even** (non-striped). This matches **macOS Finder** behavior. |
| `"odd"` | Counter resets after each group header. The first data row in every group is always **odd** (striped). |

Without `withGroups`, all string modes behave identically to `true` — the stripe index function defaults to the identity.

### Example: macOS Finder Style

```typescript
const list = vlist({
  container: '#file-list',
  items: files,
  item: {
    height: 28,
    striped: 'even',   // ← reset per group, first row always even
    template: renderFileRow,
  },
})
  .use(withTable({ columns, rowHeight: 28, headerHeight: 28 }))
  .use(withGroups({
    getGroupForIndex: (i) => getFileKind(files[i]),
    headerHeight: 32,
    headerTemplate: (key) => `<div class="group-header">${key}</div>`,
  }))
  .build();
```

With `"even"`, each group's rows start fresh:

```
── Folders ──────────────────────────
  Documents        even  (no stripe)
  Downloads        odd   (striped)
  Pictures         even  (no stripe)
── JavaScript ───────────────────────
  index.js         even  (no stripe)  ← reset
  utils.js         odd   (striped)
── TypeScript ───────────────────────
  types.ts         even  (no stripe)  ← reset
```

With `"data"`, the count would continue across groups:

```
── Folders ──────────────────────────
  Documents        0  even
  Downloads        1  odd
  Pictures         2  even
── JavaScript ───────────────────────
  index.js         3  odd    ← continues
  utils.js         4  even
── TypeScript ───────────────────────
  types.ts         5  odd    ← continues
```

### CSS

The stripe class is `.vlist-item--odd`. Style it with:

```css
.vlist-item--odd {
  background: rgba(0, 0, 0, 0.03);
}
```

### Performance

All string modes use a precomputed `Int32Array` stripe map built once when the group layout is created (and rebuilt on `setItems`/`appendItems`/etc.). The per-item cost on the scroll hot path is a single array lookup — same O(1) as the `true` mode's bitwise check.

## Data Operations

### Adding Items

When you add items, groups rebuild automatically:

```typescript
// Append new contacts
contacts.appendItems([
  { id: 101, name: 'Zoe', lastName: 'Zhang' }
])
// Group "Z" is created if it doesn't exist

// Prepend contacts
contacts.prependItems([
  { id: 0, name: 'Aaron', lastName: 'Abbott' }
])
// Added to group "A"
```

**Important:** New items must be inserted in sorted order, or you must resort and call `setItems()`.

### Removing Items

```typescript
contacts.removeItem(42)
// If this was the last item in group "M", the header disappears
```

### Replacing All Items

```typescript
contacts.setItems(newSortedContacts)
// All groups rebuild based on new data
```

### Scrolling to Items

Use data indices, not layout indices:

```typescript
// Scroll to Bob (3rd contact in data array)
contacts.scrollToIndex(2, 'start')

// The feature translates:
// Data index 2 → Layout index 4 (after A-header, Alice, Amy, B-header)
```

## Combining with Reverse Mode

### Reverse Mode with Date Headers

The groups feature **works seamlessly with reverse mode** - both sticky and inline headers are supported:

```typescript
import { vlist, withGroups } from '@floor/vlist'

const chat = vlist({
  container: '#messages',
  reverse: true, // Bottom-anchored mode
  item: {
    height: (index) => messages[index].type === 'image' ? 200 : 60,
    template: (msg) => `
      <div class="message bubble--${msg.sender}">
        <span class="sender">${msg.sender}</span>
        <p>${msg.text}</p>
      </div>
    `
  },
  items: messages // Chronological order: oldest first
})
.use(withGroups({
  getGroupForIndex: (i) => {
    const date = new Date(messages[i].timestamp)
    return date.toLocaleDateString()
  },
  headerHeight: 28,
  headerTemplate: (date) => `
    <div class="date-header">${date}</div>
  `,
  sticky: false // Inline headers (iMessage style)
}))
.build()
```

### Sticky Headers in Reverse Mode

Sticky headers also work with reverse mode! As you scroll UP through chat history, the current section header sticks at the top - useful for navigation:

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: (index) => messages[index].type === 'image' ? 200 : 60,
    template: renderMessage
  },
  items: messages
})
.use(withGroups({
  getGroupForIndex: (i) => {
    const date = new Date(messages[i].timestamp)
    return date.toLocaleDateString()
  },
  headerHeight: 28,
  headerTemplate: (date) => `<div class="date-header">${date}</div>`,
  sticky: true // Sticky header shows current section as you scroll up
}))
.build()
```

**Visual behavior:**
```
┌─────────────────────────┐
│ 🔒 Dec 12 (sticky top)  │ ← Shows current section
├─────────────────────────┤
│ Alice: Message          │
│ Bob: Another message    │
│ ...scroll down...       │
│ Dec 14                  │ ← Next header
│ ...more messages...     │
│ Today                   │
│ You: Latest message     │
└─────────────────────────┘ ← Started here (bottom)
```

As you scroll up through history, older section headers stick at the top - perfect for orientation.

### Compatibility

| Configuration | Allowed? | Notes |
|---------------|----------|-------|
| `reverse: true` + `sticky: false` | ✅ **Yes** | iMessage-style inline date headers |
| `reverse: true` + `sticky: true` | ✅ **Yes** | Sticky header shows current section while scrolling |
| `orientation: 'horizontal'` + groups | ✅ **Yes** | Horizontal carousels with category headers (sticky headers stick to left edge) |
| `withTable()` + `withGroups()` | ✅ **Yes** | Grouped data tables with full-width section headers |

**Choose based on your UI:**
- `sticky: false` - iMessage, WhatsApp style (headers scroll with content)
- `sticky: true` - Telegram style (current section header sticks at top/left for navigation)
- `orientation: 'horizontal'` - Photo galleries, product carousels (headers stick to left edge in horizontal mode)
- `withTable()` - Sectioned data tables (sticky group header sits below column header)

## API Reference

### Feature Priority

**Priority:** `10` (runs early)

The groups feature runs before most other features because it:
- Transforms the item list (inserts headers)
- Replaces the height function
- Modifies the template

### Methods

#### Standard List Methods

All standard methods work with groups, using **data indices** (not layout indices):

```typescript
// Data operations
contacts.setItems(newContacts)      // Rebuilds groups
contacts.appendItems(moreContacts)  // Adds to existing groups
contacts.prependItems(contacts)     // Prepends to groups
contacts.removeItem(42)             // Removes from group

// Scrolling (data indices)
contacts.scrollToIndex(10, 'center') // Scrolls to 11th contact
contacts.getVisibleRange()           // Returns { start, end } in data indices

// Selection (data indices)
contacts.selectItems(['id1', 'id2'])
contacts.getSelected()               // Returns data item IDs
```

### Properties

#### items

**Type:** `readonly T[]`

**Returns:** Original data items (without headers)

```typescript
console.log(contacts.items.length) // 10,000 contacts (no headers)
```

#### element

**Type:** `HTMLElement`

**Returns:** Root container element

```typescript
const root = contacts.element
console.log(root.classList.contains('vlist--grouped')) // true
```

### Events

Groups inherit all standard events:

```typescript
contacts.on('render', ({ range, direction }) => {
  console.log('Rendered:', range) // Data indices
})

contacts.on('scroll', ({ scrollTop, direction }) => {
  console.log('Scrolled to:', scrollTop)
})
```

### CSS Classes

The feature adds `.vlist--grouped` to the root element:

```css
.vlist--grouped {
  /* Custom styles for grouped lists */
}

.vlist--grouped .section-header {
  background: #f5f5f5;
  font-weight: 600;
  padding: 8px 16px;
}
```

## Performance

### Benchmark: 10,000 Contacts with Groups

| Metric | Without Groups | With Groups | Overhead |
|--------|----------------|-------------|----------|
| **Initial render** | 12ms | 14ms | +2ms |
| **Scroll (60fps)** | 8ms | 9ms | +1ms |
| **Add 100 items** | 15ms | 18ms | +3ms |
| **Memory** | 2.4 MB | 2.6 MB | +8% |

**Conclusion:** Groups add minimal overhead (~10-15%) with massive UX benefits.

### Optimization Tips

#### 1. Efficient Group Keys

Use simple, deterministic keys:

```typescript
// ✅ Good: Direct property access
getGroupForIndex: (i) => items[i].category

// ❌ Bad: Complex computation
getGroupForIndex: (i) => {
  const date = new Date(items[i].timestamp)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

// ✅ Better: Pre-compute and cache
const groupKeys = items.map(item => {
  const date = new Date(item.timestamp)
  return date.toLocaleDateString()
})
getGroupForIndex: (i) => groupKeys[i]
```

#### 2. Simple Header Templates

Prefer direct DOM creation over HTML strings:

```typescript
// ✅ Fast: Direct DOM creation
headerTemplate: (letter) => {
  const div = document.createElement('div')
  div.className = 'section-header'
  div.textContent = letter
  return div
}

// ⚠️ Slower: HTML parsing
headerTemplate: (letter) => `
  <div class="section-header">
    <span class="letter">${letter}</span>
  </div>
`
```

#### 3. Disable Sticky When Not Needed

Sticky headers use pre-cached arrays and recycled DOM elements, adding negligible overhead per scroll frame. But if you don't need them, disabling avoids the sticky container entirely.

```typescript
sticky: false
```

## Examples

### Alphabetical Contacts

```typescript
const contacts = vlist({
  container: '#contacts',
  item: {
    height: 56,
    template: (contact) => `
      <div class="contact">
        <img src="${contact.avatar}" alt="">
        <div>
          <div class="name">${contact.firstName} ${contact.lastName}</div>
          <div class="email">${contact.email}</div>
        </div>
      </div>
    `
  },
  items: sortedContacts
})
.use(withGroups({
  getGroupForIndex: (i) => sortedContacts[i].lastName[0].toUpperCase(),
  headerHeight: 36,
  headerTemplate: (letter) => `
    <div class="section-header">${letter}</div>
  `
}))
.build()
```

### Date-Grouped Chat Messages

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: (i) => messages[i].height || 60,
    template: renderMessage
  },
  items: messages
})
.use(withGroups({
  getGroupForIndex: (i) => {
    const date = new Date(messages[i].timestamp)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString()
  },
  headerHeight: 28,
  headerTemplate: (label) => `
    <div class="date-divider">
      <span>${label}</span>
    </div>
  `,
  sticky: false // Inline headers for chat
}))
.build()
```

### Category-Grouped Products

```typescript
const categories = ['Electronics', 'Clothing', 'Home', 'Sports']

const catalog = vlist({
  container: '#catalog',
  item: {
    height: 120,
    template: (product) => `
      <div class="product-card">
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="price">$${product.price}</p>
      </div>
    `
  },
  items: sortedProducts
})
.use(withGroups({
  getGroupForIndex: (i) => sortedProducts[i].category,
  headerHeight: 48,
  headerTemplate: (category) => `
    <div class="category-header">
      <h2>${category}</h2>
      <span class="count">${getCategoryCount(category)} items</span>
    </div>
  `
}))
.build()
```

### Photo Gallery with Month Headers

```typescript
const gallery = vlist({
  container: '#gallery',
  item: {
    height: 200,
    template: (photo) => `
      <div class="photo-card">
        <img src="${photo.thumbnail}" alt="${photo.title}">
        <div class="overlay">${photo.title}</div>
      </div>
    `
  },
  items: sortedPhotos
})
.use(withGrid({ columns: 4, gap: 16 }))
.use(withGroups({
  getGroupForIndex: (i) => {
    const date = new Date(sortedPhotos[i].date)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  },
  headerHeight: 40,
  headerTemplate: (monthYear) => `
    <div class="month-header">
      <h3>${monthYear}</h3>
    </div>
  `
}))
.build()
```

### Horizontal Product Carousel with Categories

```typescript
const carousel = vlist({
  container: '#carousel',
  orientation: 'horizontal',
  item: {
    width: 200,
    template: (product) => `
      <div class="product-card">
        <img src="${product.image}" alt="${product.name}">
        <h4>${product.name}</h4>
        <p class="price">$${product.price}</p>
      </div>
    `
  },
  items: sortedProducts
})
.use(withGroups({
  getGroupForIndex: (i) => sortedProducts[i].category,
  headerHeight: 60, // Width in horizontal mode
  headerTemplate: (category) => `
    <div class="category-header">
      <h3>${category}</h3>
    </div>
  `,
  sticky: true // Sticks to left edge in horizontal mode
}))
.build()
```

**Horizontal mode notes:**
- Headers stick to the **left edge** instead of top
- `headerHeight` becomes the **width** of the header in horizontal mode
- Push-out effect happens **leftward** when the next category approaches
- Perfect for product carousels, photo timelines, story feeds

## Best Practices

### Do ✅

- **Pre-sort items by group** — Required for correct header placement
- **Use simple group keys** — Fast string comparison
- **Use data indices** — All API methods use data indices, not layout indices
- **Set `sticky: false` for bottom-anchored UIs** — iMessage-style inline headers (chat, logs, activity feeds)
- **Cache group keys** — If computation is expensive

### Don't ❌

- **Don't unsort items** — Headers will appear in wrong places
- **Don't use layout indices** — Always use data indices
- **Don't use sticky headers with reverse mode** — Will throw error
- **Don't compute group keys in render** — Pre-compute and cache
- **Don't forget headerHeight** — Required parameter

## Troubleshooting

### Headers in Wrong Places

**Symptom:** Headers appear randomly or duplicated.

**Cause:** Items are not pre-sorted by group.

**Solution:** Sort items before passing to vlist:

```typescript
const sortedContacts = [...contacts].sort((a, b) => 
  a.lastName.localeCompare(b.lastName)
)
```

### Error: "cannot be used with reverse: true"

**Symptom:** Error when combining groups with reverse mode.

**Cause:** Trying to use sticky headers in reverse mode.

**Solution:** Set `sticky: false`:

```typescript
.use(withGroups({
  // ...
  sticky: false // Required for reverse mode
}))
```

### scrollToIndex Not Working

**Symptom:** Scrolls to wrong position.

**Cause:** Using layout index instead of data index.

**Solution:** Always use data index:

```typescript
// ✅ Correct: Data index
contacts.scrollToIndex(2) // Scrolls to 3rd contact

// ❌ Wrong: Layout index (includes headers)
// Don't try to calculate layout indices manually
```

### Sticky Header Not Updating

**Symptom:** Sticky header shows wrong group.

**Cause:** Items added without rebuilding groups.

**Solution:** Use proper data methods:

```typescript
// ✅ Correct: Rebuilds groups
contacts.appendItems(newContacts)

// ❌ Wrong: Manual manipulation
contacts.items.push(newContact) // Don't do this!
```

### Performance Issues

**Symptom:** Slow scrolling with many groups.

**Cause:** Complex group key computation or header template.

**Solution:** Pre-compute and simplify:

```typescript
// Pre-compute group keys
const groupKeys = items.map(item => computeGroupKey(item))

// Simple group key lookup
getGroupForIndex: (i) => groupKeys[i]

// Simple header template
headerTemplate: (key) => {
  const div = document.createElement('div')
  div.textContent = key
  return div
}
```

## Summary

| Feature | Support |
|---------|---------|
| **Sticky headers** | ✅ Default behavior |
| **Inline headers** | ✅ Set `sticky: false` |
| **Variable heights** | ✅ Items and headers can differ |
| **Grid layout** | ✅ Full-width headers |
| **Table layout** | ✅ Full-width headers, no cells |
| **Reverse mode** | ✅ Only with `sticky: false` |
| **Horizontal mode** | ✅ Sticky headers stick to left edge |
| **Dynamic updates** | ✅ Automatic group rebuild |
| **Keyboard navigation** | ✅ Works seamlessly |
| **Template-driven** | ✅ Same `renderInto` pattern as items |

**Bottom line:** Groups transform flat lists into organized sections with minimal overhead. Use sticky headers for iOS Contacts style, or inline headers for bottom-anchored UIs (chat, logs, activity feeds).

## See Also

- [Types — `GroupsConfig`](../api/types.md#groupsconfig) — `getGroupForIndex`, `headerHeight`, `headerTemplate`, `sticky`
- [Exports — Groups](../api/exports.md#groups) — `createGroupLayout`, `buildLayoutItems`, `createStickyHeader`
- [Grid](./grid.md) — Full-width group headers spanning the grid
- [Table](./table.md) — Full-width group headers in data tables, sticky headers below column header
- [Selection](./selection.md) — Selection works with data indices, skipping group headers

## Examples

- [Contact List](/examples/contact-list) — A–Z grouped contacts with sticky section headers and selection
- [Messaging](/examples/messaging) — Reverse-mode chat with date group headers
