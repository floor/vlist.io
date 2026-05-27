---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# Framework Adapters

vlist has official adapters for React, Vue, Svelte, and SolidJS. Each adapter wraps `createVList` with framework-idiomatic APIs.

Note: adapters are in separate packages and will be updated for v2. The core `vlist` package is framework-agnostic (vanilla JS).

## React

```bash
npm install vlist-react
```

```tsx
import { useVList } from "vlist-react";
import "vlist/styles";

function MyList({ items }) {
  const { containerRef } = useVList({
    item: { height: 48, template: renderItem },
    items,
    plugins: [grid({ columns: 3 })],
  });

  return <div ref={containerRef} />;
}
```

Note: React adapter auto-manages lifecycle — `destroy()` is called on unmount.

## Vue

```bash
npm install vlist-vue
```

```vue
<script setup>
import { useVList } from "vlist-vue";
import "vlist/styles";

const { containerRef } = useVList({
  item: { height: 48, template: renderItem },
  items: data,
  plugins: [selection({ mode: "single" })],
});
</script>

<template>
  <div ref="containerRef" />
</template>
```

## Svelte

```bash
npm install vlist-svelte
```

```svelte
<script>
import { vlist } from "vlist-svelte";
import "vlist/styles";

let items = [...];
</script>

<div use:vlist={{
  item: { height: 48, template: renderItem },
  items,
  plugins: [scrollbar()],
}} />
```

## SolidJS

```bash
npm install vlist-solidjs
```

```tsx
import { createVList } from "vlist-solidjs";
import "vlist/styles";

function MyList() {
  const { ref } = createVList({
    item: { height: 48, template: renderItem },
    items: data(),
    plugins: [data({ adapter: myAdapter })],
  });

  return <div ref={ref} />;
}
```

## Auto-Wiring

Adapters automatically detect plugin configs and add the corresponding plugins. For example, passing `grid: { columns: 3 }` in the config automatically adds the grid plugin — no explicit plugin import needed.

## Events

Each framework uses its native event pattern:
- **React**: callback props or `useEffect` with `instance.on()`
- **Vue**: composable returns `on()` helper, auto-cleans on unmount
- **Svelte**: action returns `on()`, or use event forwarding
- **SolidJS**: `onCleanup` auto-destroys

## Vanilla JS

No adapter needed — use `createVList()` directly:

```ts
import { createVList, selection } from "vlist";
import "vlist/styles";

const list = createVList({
  container: document.getElementById("app"),
  item: { height: 48, template: renderItem },
  items: data,
}, [selection()]);

// Cleanup when done
list.destroy();
```
