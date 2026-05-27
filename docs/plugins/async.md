# Async

Async data loading with pagination, placeholders, and infinite scroll.

```ts
import { createVList, async as asyncPlugin } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 48, template: renderItem },
}, [asyncPlugin({
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`);
      const { items, total } = await res.json();
      return { items, total };
    },
  },
  total: 1000,
})]);
```

### Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `adapter` | `VListAdapter<T>` | required | Data source |
| `total` | `number` | — | Total item count (if known) |
| `autoLoad` | `boolean` | `true` | Auto-load initial data |
| `storage.chunkSize` | `number` | `100` | Items per request |
| `storage.maxCachedItems` | `number` | `10000` | Max cached items |
| `storage.evictionBuffer` | `number` | `500` | Extra items to keep around visible range |
| `loading.cancelThreshold` | `number` | `15` | Velocity above which loading is cancelled (px/ms) |
| `loading.preloadThreshold` | `number` | `2` | Velocity above which preloading kicks in (px/ms) |
| `loading.preloadAhead` | `number` | `50` | Items to preload ahead of scroll direction |

### Adapter Interface

```ts
interface VListAdapter<T> {
  read(params: {
    offset: number;
    limit: number;
    cursor: string | undefined;
    signal: AbortSignal;
  }): Promise<{
    items: T[];
    total?: number;
    cursor?: string;
    hasMore?: boolean;
  }>;
}
```

### Methods

| Method | Description |
|--------|-------------|
| `reload()` | Reset and reload all data |
| `loadVisibleRange()` | Load visible items on demand |
| `getTotal()` | Get total item count |
| `setTotal(n)` | Set total item count |

### Events

| Event | Payload |
|-------|---------|
| `load:start` | `{ offset, limit }` |
| `load:end` | `{ items, total }` |
| `error` | `{ error, context }` |

### Notes

- Velocity-aware: skips loads during fast scroll, loads on idle
- Deduplicates concurrent requests for the same range
- Supports cursor-based pagination via `cursor` in adapter response
- Sets `aria-busy` on root during loading
