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

For one-time events, use the emitter's `once` method (available on the internal emitter, not the public API):

```typescript
emitter.once('load:end', ({ items }) => {
  console.log('First load complete:', items.length)
})
```

---

## Interaction Events

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

---

## Data Events

### load:start

Fired when an async data load begins. Only emitted when `withAsync` is active.

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

---

## Complete Event Map

```typescript
interface VListEvents<T extends VListItem = VListItem> {
  'item:click':        { item: T; index: number; event: MouseEvent }
  'item:dblclick':     { item: T; index: number; event: MouseEvent }
  'selection:change':  { selected: Array<string | number>; items: T[] }
  'scroll':            { scrollPosition: number; direction: 'up' | 'down' }
  'velocity:change':   { velocity: number; reliable: boolean }
  'range:change':      { range: Range }
  'load:start':        { offset: number; limit: number }
  'load:end':          { items: T[]; total?: number; offset?: number }
  'error':             { error: Error; context: string }
  'resize':            { height: number; width: number }
}
```

---

## Emitter Implementation

### Error Isolation

Event handlers are wrapped in try-catch to prevent one handler from breaking others:

```typescript
listeners[event]?.forEach((handler) => {
  try {
    handler(payload);
  } catch (error) {
    console.error(`[vlist] Error in event handler for "${event}":`, error);
  }
});
```

### Memory Management

Listeners are stored in `Set`s for O(1) add/remove. The `on()` method returns an unsubscribe function, enabling clean cleanup:

```typescript
const subscriptions: Unsubscribe[] = []

subscriptions.push(list.on('scroll', handleScroll))
subscriptions.push(list.on('selection:change', handleSelection))

// Cleanup
subscriptions.forEach(unsub => unsub())
```

### createEmitter

The low-level emitter factory, exported for feature authors:

```typescript
function createEmitter<T extends EventMap>(): Emitter<T>
```

Returns an object with `on`, `off`, `emit`, `once`, `clear`, and `listenerCount` methods. See [Types](./types.md#emitter) for the full interface.

---

## Related

- [Types](./types.md#event-types) — `VListEvents`, `EventHandler`, `Unsubscribe`
- [API Reference](./reference.md#on) — `on` and `off` method signatures
- [Constants](./constants.md#scroll--velocity-tracking) — `VELOCITY_SAMPLE_COUNT`, `MIN_RELIABLE_SAMPLES`, `STALE_GAP_MS`
- [Exports](./exports.md) — `createEmitter` for feature authoring

---

*The event system provides clean decoupling between vlist internals and consumer code.*