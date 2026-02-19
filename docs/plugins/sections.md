# Sections Plugin

> Grouped lists with sticky or inline section headers.

## Overview

The sections plugin transforms a flat list into sections with headers. Perfect for alphabetically sorted contacts, categorized items, or any list that needs visual grouping.

### What It Does

The sections plugin:
- ✅ **Inserts section headers** at group boundaries
- ✅ **Sticky headers** (optional) — iOS Contacts style
- ✅ **Index mapping** — Translates between data indices and layout indices
- ✅ **Variable heights** — Headers can have different heights than items
- ✅ **Dynamic grouping** — Updates when data changes
- ✅ **Works with grid** — Full-width headers in grid layouts

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

The plugin:
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
- ✅ **Keyboard navigation** — Focus management respects groups
- ✅ **Pure TypeScript** — Zero dependencies

### Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ All modern browsers

## Quick Start

### With Builder (Recommended)

```typescript
import { vlist } from 'vlist'
import { withSections } from 'vlist'

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
.use(withSections({
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

### GroupsPluginConfig

```typescript
interface GroupsPluginConfig {
  /** Returns group key for item at index (required) */
  getGroupForIndex: (index: number) => string

  /** Height of group headers in pixels (required) */
  headerHeight: number

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

**Purpose:** Fixed height for all headers in pixels.

**Requirements:**
- ✅ Must be a positive number
- ✅ All headers have the same height
- ✅ Used for scroll calculations

```typescript
headerHeight: 36 // 36px tall headers
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

When `sticky: true` (default), the plugin creates a special sticky header element that:

1. **Positions above the viewport** — Uses `position: absolute` with `top: 0`
2. **Updates on scroll** — Shows the current section's header
3. **Smooth transitions** — Pushes up as next header approaches
4. **Efficient** — Only one sticky element (not per-header)

### iOS Contacts Behavior

The sticky header mimics iOS Contacts:

- **Stays at top** while scrolling through a section
- **Pushes up** when the next header approaches
- **Disappears** when scrolled past the bottom of the section
- **Reappears** with the new section's header

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

The sticky header has the class `{classPrefix}-sticky-header`:

```css
/* Default: .vlist-sticky-header */
.vlist-sticky-header {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 10;
  background: var(--vlist-sticky-header-bg, white);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Custom styling */
.vlist-sticky-header {
  background: linear-gradient(to bottom, #f5f5f5, #e0e0e0);
  font-weight: 600;
  border-bottom: 1px solid #ccc;
}
```

## With Grid Layout

Groups work seamlessly with grid layout. Headers automatically span the full width:

```typescript
import { vlist } from 'vlist'
import { withGrid } from 'vlist'
import { withSections } from 'vlist'

const gallery = vlist({
  container: '#gallery',
  item: {
    height: 200,
    template: (photo) => `<img src="${photo.url}" alt="${photo.title}">`
  },
  items: sortedPhotos
})
.use(withGrid({ columns: 4, gap: 16 }))
.use(withSections({
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
│ January 2025 (full-width header)       │
├──────────┬──────────┬──────────┬───────┤
│ Photo 1  │ Photo 2  │ Photo 3  │ Photo │
│          │          │          │   4   │
├──────────┼──────────┼──────────┼───────┤
│ Photo 5  │ Photo 6  │ Photo 7  │ Photo │
│          │          │          │   8   │
├────────────────────────────────────────┤
│ February 2025 (full-width header)      │
├──────────┬──────────┬──────────┬───────┤
│ Photo 9  │ Photo 10 │ Photo 11 │ Photo │
│          │          │          │  12   │
└──────────┴──────────┴──────────┴───────┘
```

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

// The plugin translates:
// Data index 2 → Layout index 4 (after A-header, Alice, Amy, B-header)
```

## Combining with Reverse Mode

### Chat UI with Date Headers

The sections plugin **works seamlessly with reverse mode** - both sticky and inline headers are supported:

```typescript
import { vlist } from 'vlist'
import { withSections } from 'vlist'

const chat = vlist({
  container: '#messages',
  reverse: true, // Chat UI mode
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
.use(withSections({
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
.use(withSections({
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
| `direction: 'horizontal'` + groups | ❌ **No** | Groups only work in vertical mode |

**Choose based on your UI:**
- `sticky: false` - iMessage, WhatsApp style (headers scroll with content)
- `sticky: true` - Telegram style (current section header sticks at top for navigation)

## API Reference

### Plugin Priority

**Priority:** `10` (runs early)

The sections plugin runs before most other plugins because it:
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

The plugin adds `.vlist--grouped` to the root element:

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

Sticky headers add minimal overhead, but if you don't need them:

```typescript
sticky: false // Saves ~0.5ms per scroll frame
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
.use(withSections({
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
.use(withSections({
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
.use(withSections({
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
.use(withSections({
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

## Best Practices

### Do ✅

- **Pre-sort items by group** — Required for correct header placement
- **Use simple group keys** — Fast string comparison
- **Use data indices** — All API methods use data indices, not layout indices
- **Set `sticky: false` for chat UIs** — iMessage-style inline headers
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
.use(withSections({
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
| **Reverse mode** | ✅ Only with `sticky: false` |
| **Horizontal mode** | ❌ Not supported |
| **Dynamic updates** | ✅ Automatic group rebuild |
| **Keyboard navigation** | ✅ Works seamlessly |

**Bottom line:** Groups transform flat lists into organized sections with minimal overhead. Use sticky headers for iOS Contacts style, or inline headers for chat UIs.

## Further Reading

- [Grid Plugin](./grid.md) — Combine groups with grid layout
- [Selection Plugin](./selection.md) — Add selection to grouped lists
- [Plugin System](./README.md) — How plugins work
- [API Reference](../api/methods.md) — Full API documentation
