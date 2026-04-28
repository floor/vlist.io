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

### focus:change

Fired when keyboard focus moves to a different item. Only emitted when `withSelection` is active. Fires on arrow-key navigation and when `withSnapshots` restores focus after a snapshot restore.

```typescript
list.on('focus:change', ({ id, index }) => {
  console.log(`Focus moved to item ${id} at index ${index}`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string \| number` | ID of the newly focused item. |
| `index` | `number` | Index of the newly focused item. |

> **Note:** This event fires when the focused *item* changes, not when the list gains or loses DOM focus. The focus ring is only visible when the list has DOM focus (`focusin`).

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

Async loading lifecycle — request start and completion. Only emitted when `withAsync` is active.

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

### data:change

Fired when items are updated or removed via `updateItem()` or `removeItem()`.

```typescript
list.on('data:change', ({ type, id }) => {
  console.log(`Item ${id} was ${type}d`)
})
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | `'remove' \| 'update'` | The kind of data change. |
| `id` | `string \| number` | The ID of the affected item. |

---

## Error Events

Contextual error reporting — template failures, feature setup errors, and destroy errors. Always available (no feature required).

### error

Fired when a recoverable error occurs. The list continues operating after emitting this event — template errors render blank elements, feature setup errors skip the broken feature, and destroy errors don't prevent cleanup of remaining handlers.

```typescript
list.on('error', ({ error, context, viewport }) => {
  console.error(`[${context}] ${error.message}`)
  if (viewport) {
    console.log('Viewport state:', viewport)
  }
})
```

| Field | Type | Description |
|-------|------|-------------|
| `error` | `Error` | The error object. |
| `context` | `string` | Where the error occurred — see table below. |
| `viewport` | `ErrorViewportSnapshot?` | Viewport state at the time of the error. Present for template and feature setup errors. Absent for destroy errors (viewport already torn down). |

#### Context strings

| Context | When it fires |
|---------|--------------|
| `template(index=N, id=X)` | A template function threw during render. The item renders as a blank element. |
| `feature.setup(featureName)` | A feature's `setup()` method threw. Remaining features continue initialization. |
| `destroy` | A destroy handler or `feature.destroy()` threw. Remaining cleanup continues. |
| `adapter.read` | An async adapter's `read()` method threw or rejected (requires `withAsync`). |
| `loadMore` | A `loadMore` operation failed (requires `withAsync`). |

#### ErrorViewportSnapshot

When present, the `viewport` field contains a frozen snapshot of the list's state at the moment the error occurred:

```typescript
interface ErrorViewportSnapshot {
  scrollPosition: number
  containerSize: number
  visibleRange: { start: number; end: number }
  renderRange: { start: number; end: number }
  totalItems: number
  isCompressed: boolean
}
```

#### Usage: monitoring template errors in production

```typescript
list.on('error', ({ error, context, viewport }) => {
  // Send to your error tracking service
  myErrorTracker.report({
    message: error.message,
    stack: error.stack,
    tags: { context },
    extra: viewport ?? {},
  })
})
```

#### Usage: detecting broken features during development

```typescript
list.on('error', ({ error, context }) => {
  if (context.startsWith('feature.setup')) {
    console.warn('Feature failed to initialize — the list will work without it:', error)
  }
})
```

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
| `focus:change` | Interaction | `withSelection` | `{ id, index }` |
| `scroll` | Scroll | — | `{ scrollPosition, direction }` |
| `velocity:change` | Scroll | — | `{ velocity, reliable }` |
| `range:change` | Scroll | — | `{ range }` |
| `scroll:idle` | Scroll | — | `{ scrollPosition }` |
| `load:start` | Data | `withAsync` | `{ offset, limit }` |
| `load:end` | Data | `withAsync` | `{ items, total?, offset? }` |
| `data:change` | Data | — | `{ type, id }` |
| `error` | Error | — | `{ error, context, viewport? }` |
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