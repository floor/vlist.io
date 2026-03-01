# Framework Adapters

> Thin wrappers that connect vlist to React, Vue, Svelte, and SolidJS — same engine, idiomatic API per framework.

Each adapter ships as a separate package. It manages the container element lifecycle, wires all features automatically based on your config, syncs items reactively, and cleans up on unmount. vlist does all DOM rendering internally — there is no virtual DOM overhead.

---

## How Adapters Work

You pass a config object (the same shape as core vlist, minus `container`). The adapter:

1. Attaches vlist to the container element your framework provides
2. Reads config fields and chains the appropriate `.use(withX())` calls
3. Calls `.build()` to create the instance
4. Watches for item changes and calls `setItems()` reactively
5. Calls `destroy()` when the component unmounts

You never call `.use()` or `.build()` yourself — the adapter does it for you. All features documented in the core API (async, grid, sections, selection, scale, scrollbar, page, snapshots) are available through config fields.

---

## React

### Install

```bash
npm install @floor/vlist vlist-react
```

### useVList

```tsx
import { useVList } from 'vlist-react';
import '@floor/vlist/styles';

interface User {
  id: number;
  name: string;
}

function UserList({ users }: { users: User[] }) {
  const { containerRef, instanceRef, getInstance } = useVList<User>({
    items: users,
    item: {
      height: 48,
      template: (user) => `<div class="row">${user.name}</div>`,
    },
  });

  return <div ref={containerRef} style={{ height: 500 }} />;
}
```

`useVList` returns:

| Field | Type | Description |
|-------|------|-------------|
| `containerRef` | `React.RefObject<HTMLDivElement>` | Attach to your container element via `ref`. |
| `instanceRef` | `React.RefObject<VList>` | Direct ref to the vlist instance (nullable). |
| `getInstance` | `() => VList \| null` | Stable callback that returns the current instance. |

Items are synced automatically — when `config.items` changes between renders, the adapter calls `setItems()`.

### useVListEvent

Subscribe to vlist events with automatic cleanup on unmount:

```tsx
import { useVList, useVListEvent } from 'vlist-react';

function ClickableList({ users }: { users: User[] }) {
  const { containerRef, instanceRef } = useVList<User>({
    items: users,
    item: { height: 48, template: (user) => `<div>${user.name}</div>` },
  });

  useVListEvent(instanceRef, 'item:click', ({ item, index }) => {
    console.log(`Clicked ${item.name} at index ${index}`);
  });

  useVListEvent(instanceRef, 'scroll', ({ scrollPosition, direction }) => {
    console.log(`Scrolled ${direction} to ${scrollPosition}px`);
  });

  return <div ref={containerRef} style={{ height: 500 }} />;
}
```

The handler ref is kept stable — you can pass inline arrow functions without re-subscribing.

### Calling Instance Methods

Use `instanceRef` or `getInstance()` to call vlist methods imperatively:

```tsx
function ScrollableList({ users }: { users: User[] }) {
  const { containerRef, instanceRef } = useVList<User>({
    items: users,
    item: { height: 48, template: (user) => `<div>${user.name}</div>` },
  });

  const scrollToTop = () => {
    instanceRef.current?.scrollToIndex(0, { behavior: 'smooth' });
  };

  return (
    <>
      <button onClick={scrollToTop}>Scroll to top</button>
      <div ref={containerRef} style={{ height: 500 }} />
    </>
  );
}
```

---

## Vue

### Install

```bash
npm install @floor/vlist vlist-vue
```

### useVList

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useVList } from 'vlist-vue';
import '@floor/vlist/styles';

interface User {
  id: number;
  name: string;
}

const users = ref<User[]>([
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]);

const { containerRef, instance } = useVList<User>({
  items: users.value,
  item: {
    height: 48,
    template: (user) => `<div class="row">${user.name}</div>`,
  },
});
</script>

<template>
  <div ref="containerRef" style="height: 500px" />
</template>
```

`useVList` returns:

| Field | Type | Description |
|-------|------|-------------|
| `containerRef` | `Ref<HTMLDivElement \| null>` | Template ref for the container element. |
| `instance` | `ShallowRef<VList \| null>` | Reactive ref to the vlist instance. |

The config argument can be a plain object or a Vue `Ref`. When a `Ref` is passed, the adapter watches `config.value.items` and calls `setItems()` on change:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue';
import { useVList } from 'vlist-vue';

const users = ref<User[]>([]);

const config = ref({
  items: users.value,
  item: {
    height: 48,
    template: (user: User) => `<div>${user.name}</div>`,
  },
});

const { containerRef, instance } = useVList<User>(config);

// Update items reactively
function loadUsers(newUsers: User[]) {
  config.value = { ...config.value, items: newUsers };
}
</script>
```

### useVListEvent

```vue
<script setup lang="ts">
import { useVList, useVListEvent } from 'vlist-vue';

const { containerRef, instance } = useVList<User>({
  items: users.value,
  item: { height: 48, template: (user) => `<div>${user.name}</div>` },
});

useVListEvent(instance, 'item:click', ({ item, index }) => {
  console.log(`Clicked ${item.name} at index ${index}`);
});
</script>
```

Cleanup is automatic — the subscription is removed in `onBeforeUnmount`.

### Calling Instance Methods

```vue
<script setup lang="ts">
const { containerRef, instance } = useVList<User>({ /* ... */ });

function scrollToTop() {
  instance.value?.scrollToIndex(0, { behavior: 'smooth' });
}
</script>

<template>
  <button @click="scrollToTop">Scroll to top</button>
  <div ref="containerRef" style="height: 500px" />
</template>
```

---

## Svelte

### Install

```bash
npm install @floor/vlist vlist-svelte
```

### vlist Action

The Svelte adapter exports a Svelte action, not a hook. Use it with `use:vlist`:

```svelte
<script>
  import { vlist } from 'vlist-svelte';
  import '@floor/vlist/styles';

  let users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];

  let instance;

  const config = {
    items: users,
    item: {
      height: 48,
      template: (user) => `<div class="row">${user.name}</div>`,
    },
  };
</script>

<div
  use:vlist={{ config, onInstance: (i) => (instance = i) }}
  style="height: 500px"
/>
```

The action accepts an options object:

| Field | Type | Description |
|-------|------|-------------|
| `config` | `VListActionConfig` | vlist config (same as core, minus `container`). |
| `onInstance` | `(instance: VList) => void` | Callback that receives the vlist instance after creation. |

When action parameters change, the `update` function calls `setItems()` with the new items. Cleanup calls `destroy()` automatically when the element is removed from the DOM.

### onVListEvent

A helper that subscribes to a vlist event and returns an unsubscribe function:

```svelte
<script>
  import { vlist, onVListEvent } from 'vlist-svelte';
  import { onDestroy } from 'svelte';

  let instance;
  let unsub;

  function handleInstance(i) {
    instance = i;
    unsub = onVListEvent(instance, 'item:click', ({ item, index }) => {
      console.log(`Clicked ${item.name} at index ${index}`);
    });
  }

  onDestroy(() => unsub?.());
</script>

<div
  use:vlist={{ config, onInstance: handleInstance }}
  style="height: 500px"
/>
```

Unlike the React and Vue event helpers, `onVListEvent` does not auto-clean-up — it returns an `Unsubscribe` function you call yourself (or in `onDestroy`). This matches the Svelte convention where actions manage their own lifecycle.

### Calling Instance Methods

```svelte
<script>
  import { vlist } from 'vlist-svelte';

  let instance;

  function scrollToTop() {
    instance?.scrollToIndex(0, { behavior: 'smooth' });
  }
</script>

<button on:click={scrollToTop}>Scroll to top</button>
<div
  use:vlist={{ config, onInstance: (i) => (instance = i) }}
  style="height: 500px"
/>
```

---

## SolidJS

### Install

```bash
npm install @floor/vlist vlist-solidjs
```

### createVList

```tsx
import { createSignal } from 'solid-js';
import { createVList } from 'vlist-solidjs';
import '@floor/vlist/styles';

interface User {
  id: number;
  name: string;
}

function UserList() {
  const [users] = createSignal<User[]>([
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ]);

  const { setRef, instance } = createVList<User>(() => ({
    items: users(),
    item: {
      height: 48,
      template: (user) => `<div class="row">${user.name}</div>`,
    },
  }));

  return <div ref={setRef} style={{ height: '500px' }} />;
}
```

The config argument is an `Accessor` (a function), following the SolidJS convention. The adapter tracks `config().items` via `createEffect(on(...))` and calls `setItems()` when it changes.

`createVList` returns:

| Field | Type | Description |
|-------|------|-------------|
| `setRef` | `(el: HTMLDivElement) => void` | Ref callback to attach to the container element. |
| `instance` | `Accessor<VList \| null>` | Accessor that returns the vlist instance. |

Cleanup is automatic via `onCleanup`.

### createVListEvent

```tsx
import { createVList, createVListEvent } from 'vlist-solidjs';

function ClickableList() {
  const [users] = createSignal(myUsers);

  const { setRef, instance } = createVList<User>(() => ({
    items: users(),
    item: { height: 48, template: (user) => `<div>${user.name}</div>` },
  }));

  createVListEvent(instance, 'item:click', ({ item, index }) => {
    console.log(`Clicked ${item.name} at index ${index}`);
  });

  return <div ref={setRef} style={{ height: '500px' }} />;
}
```

The subscription is created in `onMount` and cleaned up in `onCleanup` automatically.

### Calling Instance Methods

```tsx
function ScrollableList() {
  const [users] = createSignal(myUsers);
  const { setRef, instance } = createVList<User>(() => ({
    items: users(),
    item: { height: 48, template: (user) => `<div>${user.name}</div>` },
  }));

  const scrollToTop = () => {
    instance()?.scrollToIndex(0, { behavior: 'smooth' });
  };

  return (
    <>
      <button onClick={scrollToTop}>Scroll to top</button>
      <div ref={setRef} style={{ height: '500px' }} />
    </>
  );
}
```

---

## SSR & Meta-Frameworks

vlist is a **client-side library** — it creates and manages DOM elements directly (`document.createElement`, `el.scrollTop`, `clientHeight`, etc.). This is what makes it fast: zero virtual DOM overhead, 120 FPS scrolling, ~26 DOM nodes for 100K items.

This means vlist **cannot render on the server**. In meta-frameworks like Next.js, Nuxt, SvelteKit, and Astro, you need to ensure vlist only runs in the browser.

### The Pattern

Every meta-framework has the same two-step approach:

1. **Fetch data server-side** (fast, close to the database)
2. **Render the list client-side** (where the DOM exists)

### Next.js (App Router)

Mark your vlist component as a client component with `'use client'`. Pass data from a Server Component:

```tsx
// app/users/UserList.tsx — Client Component
'use client'

import { useVList } from 'vlist-react'
import '@floor/vlist/styles'

export function UserList({ users }: { users: User[] }) {
  const { containerRef } = useVList<User>({
    items: users,
    item: { height: 48, template: (u) => `<div>${u.name}</div>` },
  })
  return <div ref={containerRef} style={{ height: '100vh' }} />
}
```

```tsx
// app/users/page.tsx — Server Component (fetches data)
import { UserList } from './UserList'

export default async function UsersPage() {
  const users = await db.users.findMany()
  return <UserList users={users} />
}
```

### Nuxt

Wrap the component in `<ClientOnly>`:

```vue
<template>
  <ClientOnly>
    <VirtualList :users="users" />
  </ClientOnly>
</template>
```

### SvelteKit

Guard with the `browser` check:

```svelte
<script>
  import { browser } from '$app/environment'
  import { vlist as vlistAction } from 'vlist-svelte'
</script>

{#if browser}
  <div use:vlistAction={{ config, onInstance }} style="height: 100vh;" />
{/if}
```

### Astro

Use the `client:only` directive to skip SSR entirely:

```astro
<UserList client:only="react" users={users} />
```

### Async Adapter with API Routes

vlist's `withAsync` pairs naturally with framework API routes — the list fetches pages of data on scroll:

```tsx
// Next.js: app/api/users/route.ts serves the data
// Client component uses the async adapter:
const { containerRef } = useVList({
  item: { height: 64, template: (item) => item ? `<div>${item.name}</div>` : `<div>Loading…</div>` },
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/users?offset=${offset}&limit=${limit}`)
      const data = await res.json()
      return { items: data.items, total: data.total, hasMore: data.hasMore }
    },
  },
})
```

### SEO

Virtualized content is **not present in the server-rendered HTML** — only the empty container ships to the browser. This is fine for dashboards, admin panels, and app-like interfaces. If you need search engines to index the list content, render a static HTML list server-side and hydrate into vlist on the client, or use pagination with `generateStaticParams` / `getStaticPaths`.

---

## Config Reference

All adapters accept `VListConfig` (exported from `@floor/vlist`) minus `container`. This extends `BuilderConfig` with convenience fields that adapters translate into `.use(withX())` calls automatically.

### Core Fields

These are passed directly to the vlist builder:

| Field | Type | Description |
|-------|------|-------------|
| `items` | `T[]` | Data array. Synced reactively when changed. |
| `item` | `ItemConfig<T>` | Item sizing and template. See [Getting Started](./getting-started.md). |
| `overscan` | `number` | Extra items outside viewport (default: 3). |
| `orientation` | `'vertical' \| 'horizontal'` | Scroll axis (default: `'vertical'`). |
| `reverse` | `boolean` | Bottom-anchored mode (default: `false`). |
| `classPrefix` | `string` | CSS class prefix (default: `'vlist'`). |
| `ariaLabel` | `string` | Accessible label for the listbox element. |
| `scroll` | `ScrollConfig` | Scroll behavior — `wheel`, `wrap`, `idleTimeout`, `element`. |

### Feature Fields

When these fields are present in the config, the adapter automatically chains the corresponding `.use(withX())` call.

| Config Field | Feature Enabled | Trigger Condition |
|-------------|----------------|-------------------|
| `scroll.element = window` | `withPage()` | Scroll element is `window`. |
| `adapter` | `withAsync()` | Adapter object is present. |
| `layout = 'grid'` + `grid` | `withGrid()` | Layout is `'grid'` and grid config exists. |
| `groups` | `withGroups()` | Groups config is present. |
| `selection.mode` | `withSelection()` | Selection mode is not `'none'`. |
| `scroll.scrollbar` or `scrollbar` | `withScrollbar()` | Scrollbar is not `'none'`. |

These features are always enabled by the adapter regardless of config:

| Feature | Why |
|---------|-----|
| `withScale()` | Zero cost when below browser limits; protects large lists automatically. |
| `withSelection({ mode: 'none' })` | Ensures the selection system is initialized even when unused (for consistent event wiring). |
| `withSnapshots()` | Zero bundle cost (included in base); enables `getScrollSnapshot`/`restoreScroll`. |

### Feature Config Examples

Enable grid layout:

```typescript
{
  items: photos,
  item: { height: 200, template: renderPhoto },
  layout: 'grid',
  grid: { columns: 4, gap: 16 },
}
```

Enable async loading (omit `items`):

```typescript
{
  item: { height: 80, template: renderItem },
  adapter: {
    read: async ({ offset, limit }) => {
      const res = await fetch(`/api/items?offset=${offset}&limit=${limit}`);
      return res.json();
    },
  },
  loading: { preloadThreshold: 2, preloadAhead: 50 },
}
```

Enable grouped lists with sticky headers:

```typescript
{
  items: contacts,
  item: { height: 56, template: renderContact },
  groups: {
    getGroupForIndex: (i) => contacts[i].lastName[0].toUpperCase(),
    headerHeight: 36,
    headerTemplate: (letter) => `<div class="header">${letter}</div>`,
    sticky: true,
  },
}
```

Enable multi-select:

```typescript
{
  items: users,
  item: {
    height: 48,
    template: (user, i, { selected }) =>
      `<div class="${selected ? 'selected' : ''}">${user.name}</div>`,
  },
  selection: { mode: 'multiple' },
}
```

---

## TypeScript

All adapters are fully generic. Pass your item type to get type-safe config, methods, and events:

```typescript
// React
const { containerRef, instanceRef } = useVList<User>({ ... });

// Vue
const { containerRef, instance } = useVList<User>({ ... });

// Svelte (generic on the action)
use:vlist<User>={{ config, onInstance: (i) => ... }}

// SolidJS
const { setRef, instance } = createVList<User>(() => ({ ... }));
```

Event handlers are typed automatically:

```typescript
// React example — item is typed as User
useVListEvent(instanceRef, 'item:click', ({ item }) => {
  console.log(item.name);  // TypeScript knows item is User
});
```

The adapter config type is exported for external use:

| Adapter | Config Type |
|---------|-------------|
| React | `UseVListConfig<T>` |
| Vue | `UseVListConfig<T>` |
| Svelte | `VListActionConfig<T>` |
| SolidJS | `UseVListConfig<T>` |

Each is `Omit<VListConfig<T>, 'container'>` — the full core config without `container`, since the adapter handles container binding.

---

## API Summary

| | React | Vue | Svelte | SolidJS |
|---|---|---|---|---|
| **Package** | `vlist-react` | `vlist-vue` | `vlist-svelte` | `vlist-solidjs` |
| **Peer deps** | `react >=17` | `vue >=3` | `svelte >=3` | `solid-js >=1` |
| **Main export** | `useVList()` | `useVList()` | `vlist` action | `createVList()` |
| **Event helper** | `useVListEvent()` | `useVListEvent()` | `onVListEvent()` | `createVListEvent()` |
| **Container binding** | `ref={containerRef}` | `ref="containerRef"` | `use:vlist` | `ref={setRef}` |
| **Instance access** | `instanceRef.current` | `instance.value` | `onInstance` callback | `instance()` |
| **Item reactivity** | Re-render triggers `setItems` | `watch` on ref | Action `update` | `createEffect` |
| **Cleanup** | `useEffect` return | `onBeforeUnmount` | Action `destroy` | `onCleanup` |
| **Event cleanup** | Automatic | Automatic | Manual (`Unsubscribe`) | Automatic |

---

## Design Principles

**Mount-based, not virtual-items-based.** Unlike TanStack Virtual (which returns a list of virtual items for the framework to render), vlist adapters let vlist own the DOM entirely. The framework provides a container element; vlist renders, pools, and recycles item elements inside it. This preserves vlist's zero-allocation hot path and avoids virtual DOM diffing on every scroll frame.

**Config-driven feature wiring.** The adapter reads your config and decides which features to enable. You don't compose `.use()` chains — the adapter does it for you. This keeps framework code minimal and ensures features are always wired in the correct priority order.

**Externalised dependencies.** Each adapter declares both `@floor/vlist` and the framework as peer dependencies. The adapter bundle contains only wrapper code — typically under 2 KB before minification.

---

## Related

- [Getting Started](./getting-started.md) — Core API, config options, and vanilla JS usage
- [Features Overview](./features/overview.md) — All features with examples and compatibility matrix
- [Events](./api/events.md) — Complete event reference
- [Types](./api/types.md) — TypeScript type definitions
- [Architecture](./resources/roadmap.md) — Builder pattern, adapter design, competitive position