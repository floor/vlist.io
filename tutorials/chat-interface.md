# Reverse Mode

> Bottom-anchored lists for chat UIs, message threads, and live feeds

## Overview

Reverse mode flips the list upside-down — starting scrolled to the bottom with newest content visible first. Perfect for chat interfaces, messaging apps, and any UI where the latest content matters most.

### What It Does

Reverse mode:
- ✅ **Starts at bottom** — List initializes scrolled to the bottom
- ✅ **Auto-scrolls on append** — New messages appear at bottom automatically
- ✅ **Preserves scroll on prepend** — Loading older content doesn't cause jumps
- ✅ **Load more at top** — With data adapter, triggers loading near the top
- ✅ **Chronological order maintained** — Items stay oldest-first in data array

### Visual Behavior

**Normal Mode (Default):**
```
┌─────────────────────────┐ ← Starts here (top)
│ Item 0 (oldest)         │
│ Item 1                  │
│ Item 2                  │
│ Item 3                  │
│ Item 4                  │
│ ...                     │
│ Item 99 (newest)        │
└─────────────────────────┘
```

**Reverse Mode:**
```
┌─────────────────────────┐
│ Item 0 (oldest)         │
│ ...                     │
│ Item 95                 │
│ Item 96                 │
│ Item 97                 │
│ Item 98                 │
│ Item 99 (newest)        │
└─────────────────────────┘ ← Starts here (bottom)
```

### Use Cases

| Pattern | Example | Best With |
|---------|---------|-----------|
| **Chat messages** | WhatsApp, Slack, Discord | `reverse: true` |
| **Live feeds** | Twitter timeline, news feeds | `reverse: true` |
| **Comment threads** | Reddit, YouTube comments | `reverse: true` |
| **Activity logs** | System logs, audit trails | `reverse: true` |
| **Traditional lists** | Contacts, files, products | `reverse: false` (default) |



## Quick Start

### Basic Chat UI

```typescript
import { vlist } from 'vlist'

const chat = vlist({
  container: '#messages',
  reverse: true, // Enable reverse mode
  item: {
    height: 60,
    template: (msg) => `
      <div class="message bubble--${msg.sender}">
        <span class="sender">${msg.sender}</span>
        <p>${msg.text}</p>
      </div>
    `
  },
  items: messages // Chronological: oldest first
})
.build()

// New message arrives
chat.appendItems([newMessage]) // Auto-scrolls to bottom if user was there
```

### With Variable Heights

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: (index) => {
      const msg = messages[index]
      if (msg.type === 'image') return 200
      if (msg.type === 'text') return 60
      return 80
    },
    template: renderMessage
  },
  items: messages
})
.build()
```



## How It Works

### Initial Scroll Position

On creation, the list automatically scrolls to the bottom:

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: { height: 60, template: renderMessage },
  items: messages
})
.build()

// Immediately after build():
// - Scrolled to bottom
// - Newest messages visible
// - Older messages above (off-screen)
```

### appendItems Behavior

When you append items, the list auto-scrolls to the bottom **if the user was already at the bottom**:

```typescript
// User is at bottom (viewing newest messages)
chat.appendItems([newMessage])
// → Auto-scrolls to show new message

// User scrolled up (reading older messages)
chat.appendItems([newMessage])
// → Does NOT scroll (preserves reading position)
```

**Detection threshold:** User is considered "at bottom" if within 50px of the bottom.

### prependItems Behavior

When you prepend items (loading older content), scroll position is preserved:

```typescript
// User scrolls to top, triggers "load more"
const olderMessages = await loadOlderMessages()

// Before prepend: viewing message at index 10
chat.prependItems(olderMessages)
// After prepend: still viewing same message (now at index 110)
```

**How it works:**
1. Captures current scroll position and first visible item
2. Adds new items at the beginning
3. Adjusts scroll position to maintain view
4. User sees no jump — older messages appear above seamlessly

### Data Ordering

Items are stored in **chronological order** (oldest first):

```typescript
const messages = [
  { id: 1, text: 'First message', timestamp: 1000 },   // Index 0
  { id: 2, text: 'Second message', timestamp: 2000 },  // Index 1
  { id: 3, text: 'Third message', timestamp: 3000 },   // Index 2
  // ...
  { id: 99, text: 'Latest message', timestamp: 9900 }  // Index 98
]

// Display order (bottom to top):
// - Index 98 at bottom (newest)
// - Index 0 at top (oldest)
```

**Why chronological?**
- Simple mental model
- `appendItems()` adds newest
- `prependItems()` adds oldest
- No array reversal needed

## Configuration

### reverse Option

```typescript
interface BuilderConfig {
  /**
   * Reverse mode for chat-style UIs.
   * When enabled:
   * - The list starts scrolled to the bottom (newest items visible)
   * - `appendItems()` auto-scrolls to bottom if user was already at bottom
   * - `prependItems()` preserves scroll position (older messages load above)
   * - With an adapter, "load more" triggers near the TOP (loading older content)
   *
   * Items stay in chronological order (oldest = index 0, newest = last).
   * Cannot be combined with `orientation: 'horizontal'`.
   *
   * @default false
   */
  reverse?: boolean
}
```

### Restrictions

| Combination | Allowed? | Notes |
|-------------|----------|-------|
| `reverse: true` + vertical | ✅ **Yes** | Default use case |
| `reverse: true` + horizontal | ❌ **No** | Throws error |
| `reverse: true` + `groups` (sticky) | ✅ **Yes** | Sticky header shows current section |
| `reverse: true` + `groups` (inline) | ✅ **Yes** | Set `sticky: false` |
| `reverse: true` + `grid` | ❌ **No** | Not supported |
| `reverse: true` + variable heights | ✅ **Yes** | Fully supported |
| `reverse: true` + selection | ✅ **Yes** | Works seamlessly |
| `reverse: true` + data adapter | ✅ **Yes** | Load more triggers at top |

## Data Operations

### appendItems (Add Newest)

Adds items to the end of the array (newest messages):

```typescript
// New message arrives
const newMessage = { id: 100, text: 'Hello!', timestamp: Date.now() }

chat.appendItems([newMessage])
// → Added to array at index 99
// → Appears at bottom of chat
// → Auto-scrolls if user was at bottom
```

**Auto-scroll behavior:**

```typescript
// User at bottom (within 50px)
chat.appendItems([msg1, msg2, msg3])
// → Scrolls to show msg3 at bottom

// User scrolled up (reading history)
chat.appendItems([msg1, msg2, msg3])
// → No scroll, user keeps reading
// → New messages available below when they scroll down
```

### prependItems (Load Older)

Adds items to the beginning of the array (older messages):

```typescript
// User scrolls to top, load more triggered
const olderMessages = await fetch('/api/messages?before=123')

chat.prependItems(olderMessages)
// → Added to array at index 0-99
// → Previous index 0 now at index 100
// → Scroll position preserved (no jump)
```

**Scroll preservation:**

```typescript
// Before prepend:
// - User viewing message at data index 10
// - Scroll position: 500px

chat.prependItems(100Messages) // Add 100 older messages

// After prepend:
// - Same message now at data index 110
// - Scroll position adjusted to maintain view
// - User sees no jump
```

### setItems (Replace All)

Replaces all items and resets scroll to bottom:

```typescript
chat.setItems(newMessages)
// → All items replaced
// → Scrolls to bottom
// → Use for filters, searches, or complete refreshes
```

### removeItem (Delete Message)

Removes a single item:

```typescript
chat.removeItem(messageId)
// → Item removed
// → Scroll position preserved
// → Gap disappears smoothly
```

## Combining with Other Features

### With Data Adapter

The data adapter automatically triggers "load more" near the **top** in reverse mode:

```typescript
import { vlist } from 'vlist'
import { withAsync } from 'vlist'

const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: 60,
    template: renderMessage
  }
})
.use(withAsync({
  load: async (offset, limit) => {
    // Load older messages
    const response = await fetch(`/api/messages?offset=${offset}&limit=${limit}`)
    const data = await response.json()
    
    return {
      items: data.messages,
      total: data.total,
      hasMore: data.hasMore
    }
  },
  total: 10000,
  placeholder: (index) => ({ id: `temp-${index}`, text: '...' })
}))
.build()

// User scrolls to top → automatically loads older messages
```

**Behavior:**
- Initial load: Last 50 messages (newest)
- User scrolls to top: Loads previous 50 (older)
- Continues until no more data

### With Groups (Date Headers)

Groups work seamlessly with reverse mode - both sticky and inline headers are supported:

#### Inline Headers (iMessage Style)

```typescript
import { vlist } from 'vlist'
import { withGroups } from 'vlist'

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
    return formatDateLabel(date) // "Today", "Yesterday", "Jan 15"
  },
  headerHeight: 28,
  headerTemplate: (label) => `
    <div class="date-divider">${label}</div>
  `,
  sticky: false // Inline headers (iMessage style)
}))
.build()
```

**Result:**
```
┌─────────────────────────┐
│ January 14              │
│ Bob: Hi there           │
│ Alice: Hello!           │
│ January 15 (Today)      │
│ Bob: How are you?       │
│ Alice: Great, thanks!   │
│ Bob: Awesome!           │
└─────────────────────────┘ ← Bottom
```

#### Sticky Headers (Telegram Style)

Sticky headers also work with reverse mode! As you scroll UP through chat history, the current section header sticks at the top - useful for navigation:

```typescript
import { vlist } from 'vlist'
import { withGroups } from 'vlist'

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
    return formatDateLabel(date)
  },
  headerHeight: 28,
  headerTemplate: (label) => `
    <div class="date-divider">${label}</div>
  `,
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

**Choose based on your UI:**
- `sticky: false` - iMessage, WhatsApp style (headers scroll with content)
- `sticky: true` - Telegram style (current section header sticks at top)

### With Selection

Selection works normally in reverse mode:

```typescript
import { vlist } from 'vlist'
import { withSelection } from 'vlist'

const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: 60,
    template: renderMessage
  },
  items: messages
})
.use(withSelection({
  mode: 'multiple'
}))
.build()

// User can select messages with click/keyboard
chat.on('selection:change', ({ selected }) => {
  console.log(`${selected.length} messages selected`)
})
```

### With Variable Heights

Fully supported with efficient height caching:

```typescript
const chat = vlist({
  container: '#messages',
  reverse: true,
  item: {
    height: (index) => {
      const msg = messages[index]
      
      // Different heights based on content
      if (msg.type === 'system') return 40
      if (msg.type === 'image') return 200
      if (msg.type === 'text') {
        const lines = Math.ceil(msg.text.length / 50)
        return 40 + lines * 20
      }
      
      return 60
    },
    template: renderMessage
  },
  items: messages
})
.build()
```

## API Reference

### Methods

All standard methods work in reverse mode:

#### scrollToIndex

```typescript
chat.scrollToIndex(index, align?)
```

Scrolls to item at data index.

**Parameters:**
- `index` — Data index (0 = oldest, length-1 = newest)
- `align` — `'start'`, `'center'`, or `'end'` (default: `'start'`)

**Example:**

```typescript
// Scroll to newest message
chat.scrollToIndex(messages.length - 1, 'end')

// Scroll to specific message
chat.scrollToIndex(42, 'center')
```

#### scrollToBottom

```typescript
chat.scrollToBottom(behavior?)
```

Scrolls to the bottom (newest message).

**Parameters:**
- `behavior` — `'auto'` or `'smooth'` (default: `'auto'`)

**Example:**

```typescript
// Jump to bottom
chat.scrollToBottom()

// Smooth scroll to bottom
chat.scrollToBottom('smooth')
```

#### getVisibleRange

```typescript
const range = chat.getVisibleRange()
// { start: 90, end: 99 } — Viewing messages 90-99
```

Returns currently visible data indices.

### Events

#### scroll

```typescript
chat.on('scroll', ({ scrollTop, direction }) => {
  console.log(`Scrolled to ${scrollTop}px, direction: ${direction}`)
  
  if (direction === 'up' && scrollTop < 100) {
    console.log('Near top - load older messages')
  }
})
```

#### render

```typescript
chat.on('render', ({ range, direction }) => {
  console.log(`Rendered ${range.start}-${range.end}`)
})
```

## Examples

### Simple Chat

```typescript
import { vlist } from 'vlist'

const messages = [
  { id: 1, sender: 'Alice', text: 'Hey there!', timestamp: 1000 },
  { id: 2, sender: 'Bob', text: 'Hi Alice!', timestamp: 2000 },
  { id: 3, sender: 'Alice', text: 'How are you?', timestamp: 3000 }
]

const chat = vlist({
  container: '#chat',
  reverse: true,
  item: {
    height: 60,
    template: (msg) => {
      const div = document.createElement('div')
      div.className = `message ${msg.sender.toLowerCase()}`
      div.innerHTML = `
        <strong>${msg.sender}:</strong>
        <p>${msg.text}</p>
      `
      return div
    }
  },
  items: messages
})
.build()

// Send new message
function sendMessage(text) {
  const newMsg = {
    id: Date.now(),
    sender: 'Bob',
    text: text,
    timestamp: Date.now()
  }
  
  messages.push(newMsg)
  chat.appendItems([newMsg])
}
```

### Chat with Load More

```typescript
import { vlist } from 'vlist'

let messages = []
let oldestTimestamp = Date.now()

const chat = vlist({
  container: '#chat',
  reverse: true,
  item: {
    height: 60,
    template: renderMessage
  },
  items: messages
})
.build()

// Load initial messages
async function init() {
  const data = await fetch('/api/messages/recent').then(r => r.json())
  messages = data.messages
  oldestTimestamp = messages[0]?.timestamp || Date.now()
  chat.setItems(messages)
}

// Load older messages when scrolled to top
chat.on('scroll', async ({ scrollTop }) => {
  if (scrollTop < 100) {
    const olderMessages = await fetch(
      `/api/messages/before/${oldestTimestamp}`
    ).then(r => r.json())
    
    if (olderMessages.length > 0) {
      messages.unshift(...olderMessages)
      oldestTimestamp = olderMessages[0].timestamp
      chat.prependItems(olderMessages)
    }
  }
})

init()
```

### Chat with Date Headers

```typescript
import { vlist } from 'vlist'
import { withGroups } from 'vlist'

function formatDateLabel(date) {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  })
}

const chat = vlist({
  container: '#chat',
  reverse: true,
  item: {
    height: (i) => {
      const msg = messages[i]
      if (msg.type === 'image') return 200
      return 60
    },
    template: (msg) => `
      <div class="message bubble--${msg.sender}">
        ${msg.type === 'image' 
          ? `<img src="${msg.imageUrl}" alt="">`
          : `<p>${msg.text}</p>`
        }
      </div>
    `
  },
  items: messages
})
.use(withGroups({
  getGroupForIndex: (i) => {
    const date = new Date(messages[i].timestamp)
    return formatDateLabel(date)
  },
  headerHeight: 28,
  headerTemplate: (label) => `
    <div class="date-divider">
      <span>${label}</span>
    </div>
  `,
  sticky: false
}))
.build()
```

### Live Feed with Auto-Scroll

```typescript
import { vlist } from 'vlist'

let posts = []
let isAtBottom = true

const feed = vlist({
  container: '#feed',
  reverse: true,
  item: {
    height: 200,
    template: renderPost
  },
  items: posts
})
.build()

// Track if user is at bottom
feed.on('scroll', ({ scrollTop }) => {
  const maxScroll = feed.element.scrollHeight - feed.element.clientHeight
  isAtBottom = scrollTop >= maxScroll - 50
})

// Poll for new posts
setInterval(async () => {
  const newPosts = await fetch('/api/posts/latest').then(r => r.json())
  
  if (newPosts.length > 0) {
    posts.push(...newPosts)
    feed.appendItems(newPosts)
    
    // Show notification if user not at bottom
    if (!isAtBottom) {
      showNotification(`${newPosts.length} new posts`)
    }
  }
}, 5000)
```

## Best Practices

### Do ✅

- **Keep chronological order** — Oldest at index 0, newest at end
- **Use appendItems for new content** — Adds to end, auto-scrolls
- **Use prependItems for history** — Loads older content at beginning
- **Set `sticky: false` with groups** — For iMessage-style date headers
- **Track "at bottom" state** — For showing "new messages" notifications
- **Use data adapter** — Automatic load-more at top

### Don't ❌

- **Don't reverse the array** — Keep chronological order
- **Don't use with horizontal mode** — Not supported
- **Don't use sticky headers** — Use inline headers instead
- **Don't use with grid** — Not supported
- **Don't manually manage scroll** — Let reverse mode handle it

## Troubleshooting

### List doesn't start at bottom

**Symptom:** List starts scrolled to top instead of bottom.

**Cause:** `reverse: true` not set.

**Solution:**

```typescript
const chat = vlist({
  container: '#chat',
  reverse: true, // Add this
  item: { height: 60, template: render },
  items: messages
})
```

### appendItems doesn't auto-scroll

**Symptom:** New messages added but list doesn't scroll.

**Cause:** User scrolled up (reading history).

**Expected behavior:** This is correct! Only auto-scrolls if user was at bottom.

**Check:**

```typescript
chat.on('scroll', ({ scrollTop }) => {
  const maxScroll = chat.element.scrollHeight - chat.element.clientHeight
  const isAtBottom = scrollTop >= maxScroll - 50
  console.log('At bottom:', isAtBottom)
})
```

### prependItems causes jump

**Symptom:** Loading older messages causes scroll position to jump.

**Cause:** This shouldn't happen — it's a bug. Please report!

**Workaround:** Manually preserve scroll:

```typescript
const before = chat.getVisibleRange()
chat.prependItems(olderMessages)
chat.scrollToIndex(before.start + olderMessages.length)
```

### Error: "horizontal orientation cannot be combined with reverse mode"

**Symptom:** Error when using both.

**Cause:** Reverse mode only works in vertical orientation.

**Solution:** Remove `orientation: 'horizontal'`:

```typescript
const chat = vlist({
  container: '#chat',
  // orientation: 'horizontal', // Remove this
  reverse: true,
  item: { height: 60, template: render },
  items: messages
})
```

### Error: "withGroups cannot be used with reverse: true"

**Symptom:** Error when combining groups with reverse mode.

**Cause:** Trying to use sticky headers in reverse mode.

**Solution:** Set `sticky: false`:

```typescript
.use(withGroups({
  getGroupForIndex: (i) => getDateGroup(messages[i]),
  headerHeight: 28,
  headerTemplate: (date) => `<div>${date}</div>`,
  sticky: false // Add this
}))
```

### Messages in wrong order

**Symptom:** Newest messages at top instead of bottom.

**Cause:** Array is reversed.

**Solution:** Keep chronological order:

```typescript
// ✅ Correct: Chronological order
const messages = [
  { id: 1, text: 'First', timestamp: 1000 },
  { id: 2, text: 'Second', timestamp: 2000 },
  { id: 3, text: 'Third', timestamp: 3000 }
]

// ❌ Wrong: Don't reverse the array
const messages = [...originalMessages].reverse() // Don't do this!
```

## Summary

| Feature | Behavior |
|---------|----------|
| **Initial position** | Bottom (newest visible) |
| **appendItems** | Auto-scroll if at bottom |
| **prependItems** | Preserve scroll (no jump) |
| **Data order** | Chronological (oldest first) |
| **Variable heights** | ✅ Fully supported |
| **Groups (inline)** | ✅ Set `sticky: false` |
| **Groups (sticky)** | ✅ Supported |
| **Grid layout** | ❌ Not supported |
| **Horizontal** | ❌ Not supported |
| **Data adapter** | ✅ Load more at top |
| **Selection** | ✅ Works seamlessly |

**Bottom line:** Reverse mode is perfect for chat UIs, message threads, and live feeds where newest content matters most. Keep items in chronological order and let reverse mode handle the rest.

## Further Reading

- [Groups Feature](/docs/features/groups) — Add date headers to chat UIs
- [Async Feature](/docs/features/async) — Infinite scrolling with async loading
- [Selection Feature](/docs/features/selection) — Add message selection
- [API Reference](/docs/api/reference) — Full API documentation
