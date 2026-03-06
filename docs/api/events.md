# Events

> Type-safe event system for vlist — subscribe to scroll, interaction, data, and lifecycle events.

---

## Subscribing

Use `on` to subscribe and the returned function to unsubscribe:

```typescript
const unsub = list.on('item:click', ({ item, index, event }) => {
  console.log('clicked', item)
})

// Later
unsub()
```

Or use `off` with the handler reference:

```typescript
const handler = ({ item }) => console.log(item)
list.on('item:click', handler)
list.off('item:click', handler)
```

### Collecting subscriptions

Store unsubscribe functions for batch cleanup:

```typescript
const subscriptions: Unsubscribe[] = []

subscriptions.push(list.on('scroll', handleScroll))
subscriptions.push(list.on('selection:change', handleSelection))

// Cleanup
subscriptions.forEach(unsub => unsub())
```

### Error isolation

Event handlers are wrapped in try-catch — one handler throwing won't break others:

```typescript
listeners[event]?.forEach((handler) => {
  try {
    handler(payload)
  } catch (error) {
    console.error(`[vlist] Error in event handler for "${event}":`, error)
  }
})
```

### Once (emitter only)

The internal emitter exposes a `once` method for one-time subscriptions. This is available to feature authors via `BuilderContext`, not on the public `VList` API:

```typescript
ctx.emitter.once('load:end', ({ items }) => {
  console.log('First load complete:', items.length)
})
```

See [Exports](./exports.md#event-emitter) for the standalone `createEmitter` factory.

---

## Interaction Events

User-driven events — clicks, double-clicks, and selection changes.

### item:click

Fired when an item is clicked.

```typescript
list.on('item:click', ({ item, index, event }) => {
  console.log(`Clicked item ${index}:`, item)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | The clicked item. |
| `index` | `number` | Item index in the list. |
| `event` | `MouseEvent` | The original DOM mouse event. |

### item:dblclick

Fired when an item is double-clicked.

```typescript
list.on('item:dblclick', ({ item, index, event }) => {
  openEditor(item)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `item` | `T` | The double-clicked item. |
| `index` | `number` | Item index in the list. |
| `event` | `MouseEvent` | The original DOM mouse event. |

### selection:change

Fired when the selection changes. Only emitted when `withSelection` is active.

```typescript
list.on('selection:change', ({ selected, items }) => {
  console.log(`${selected.length} items selected`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `selected` | `Array<string \| number>` | IDs of currently selected items. |
| `items` | `T[]` | The selected item objects. |

---

## Scroll Events

Scroll position, velocity, visible range, and idle detection.

### scroll

Fired on every scroll position change.

```typescript
list.on('scroll', ({ scrollPosition, direction }) => {
  console.log(`Scrolled ${direction} to ${scrollPosition}px`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `scrollPosition` | `number` | Current scroll offset along the main axis in pixels. |
| `direction` | `'up' \| 'down'` | Scroll direction. |

### velocity:change

Fired when the scroll velocity is updated. Emitted on every scroll frame after the builder's velocity tracker processes the new position.

```typescript
list.on('velocity:change', ({ velocity, reliable }) => {
  if (reliable && velocity > 5) {
    console.log('Fast scrolling — hiding heavy UI')
  }
})
```

| Field | Type | Description |
|-------|------|-------------|
| `velocity` | `number` | Absolute scroll velocity in px/ms. |
| `reliable` | `boolean` | `true` when enough samples have accumulated (`sampleCount >= MIN_RELIABLE_SAMPLES`). `false` during the first few frames after idle or a stale gap reset. |

The `reliable` flag prevents false positives — after the velocity tracker resets (stale gap > 100ms or idle), the first frames produce near-zero velocity from small deltas. Wait for `reliable: true` before making loading or UI decisions based on velocity.

### range:change

Fired when the visible item range changes.

```typescript
list.on('range:change', ({ range }) => {
  console.log(`Visible: ${range.start}–${range.end}`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `range` | `Range` | The new visible range (`{ start, end }`). |

### scroll:idle

Fired when scrolling stops — after the idle timeout elapses (`SCROLL_IDLE_TIMEOUT`, default 150ms). This is the moment vlist reorders DOM for accessibility, flushes deferred measurements, and resets velocity to zero.

```typescript
list.on('scroll:idle', ({ scrollPosition }) => {
  console.log(`Scrolling stopped at ${scrollPosition}px`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `scrollPosition` | `number` | Final scroll offset when idle was detected. |

Use cases:
- **Deferred rendering** — swap lightweight placeholders for expensive content after scrolling stops
- **Analytics** — track what the user actually stopped to look at
- **Lazy image loading** — only load high-res images when the user pauses
- **Save scroll position** — snapshot on idle rather than every frame

---

## Data Events

Async loading lifecycle — request start, completion, and errors. Only emitted when `withAsync` is active.

### load:start

Fired when an async data load begins.

```typescript
list.on('load:start', ({ offset, limit }) => {
  console.log(`Loading ${limit} items from offset ${offset}`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `offset` | `number` | Starting offset of the request. |
| `limit` | `number` | Number of items requested. |

### load:end

Fired when an async data load completes.

```typescript
list.on('load:end', ({ items, total, offset }) => {
  console.log(`Loaded ${items.length} items, total: ${total}`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `T[]` | The loaded items. |
| `total` | `number` | Total item count (if reported by the adapter). |
| `offset` | `number` | Starting offset of the completed request. |

### error

Fired when an error occurs during data loading or event handling.

```typescript
list.on('error', ({ error, context }) => {
  console.error(`Error in ${context}:`, error.message)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | `Error` | The error object. |
| `context` | `string` | Where the error occurred (e.g. `'loadMore'`, `'adapter.read'`). |

---

## Lifecycle Events

Container-level events — resize, destroy, and instance lifecycle.

### resize

Fired when the list container is resized (detected via `ResizeObserver`).

```typescript
list.on('resize', ({ height, width }) => {
  console.log(`Container resized to ${width}×${height}`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `height` | `number` | New container height in pixels. |
| `width` | `number` | New container width in pixels. |

This event fires regardless of scroll orientation. Both dimensions are always provided.

### destroy

Fired just before the instance is torn down. This is the last event emitted — all DOM cleanup, feature teardown, and handler removal have already happened, but the emitter is still active. After this event, the emitter is cleared.

```typescript
list.on('destroy', () => {
  console.log('List destroyed — cleaning up external resources')
})
```

No payload — the event signals teardown is imminent.

Use cases:
- **External cleanup** — tear down intersection observers, analytics trackers, or external state tied to the list
- **Coordination** — notify other parts of your app that the list no longer exists

---

## Summary

| Event | Category | Requires | Payload |
|-------|----------|----------|---------|
| `item:click` | Interaction | — | `{ item, index, event }` |
| `item:dblclick` | Interaction | — | `{ item, index, event }` |
| `selection:change` | Interaction | `withSelection` | `{ selected, items }` |
| `scroll` | Scroll | — | `{ scrollPosition, direction }` |
| `velocity:change` | Scroll | — | `{ velocity, reliable }` |
| `range:change` | Scroll | — | `{ range }` |
| `scroll:idle` | Scroll | — | `{ scrollPosition }` |
| `load:start` | Data | `withAsync` | `{ offset, limit }` |
| `load:end` | Data | `withAsync` | `{ items, total?, offset? }` |
| `error` | Data | `withAsync` | `{ error, context }` |
| `resize` | Lifecycle | — | `{ height, width }` |
| `destroy` | Lifecycle | — | — |

---

## Related

- [Types](./types.md#event-types) — `VListEvents`, `EventHandler`, `Unsubscribe`
- [API Reference](./reference.md#on) — `on` and `off` method signatures
- [Constants](./constants.md#velocity) — `VELOCITY_SAMPLE_COUNT`, `MIN_RELIABLE_SAMPLES`, `STALE_GAP_MS`
- [Exports](./exports.md#event-emitter) — `createEmitter` for feature authoring

---

*All events are type-safe — TypeScript infers the payload type from the event name.*