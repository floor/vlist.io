---
created: 2026-05-27
updated: 2026-07-08
status: published
---

# Framework Adapters

vlist has official adapters for React, Vue, Svelte, and SolidJS. Each adapter is a thin, framework-idiomatic wrapper that manages the vlist lifecycle (create on mount, `destroy()` on unmount) and hands you a declarative config object.

All four adapters share a single config layer (`vlist/config`), so the config shape — including auto-wiring and the `plugins` escape hatch — is identical across frameworks. Requires **vlist ≥ 2.6.0**.

## Configuration

Every adapter accepts the same high-level config (`VListConfig`): the core `createVList` options minus `container` (the adapter owns that via a ref/node), plus convenience "feature fields" that are translated into plugins for you.

You can configure plugins two ways, and they can be combined:

1. **Convenience fields** — declarative, no plugin imports (see [Auto-Wiring](#auto-wiring)).
2. **Explicit `plugins`** — an escape hatch for full control or custom/third-party plugins.

```ts
// convenience fields
useVList({ item, items, layout: "grid", grid: { columns: 3 }, selection: { mode: "single" } });

// explicit plugins (equivalent)
useVList({ item, items, plugins: [grid({ columns: 3 }), selection({ mode: "single" })] });
```

When both are present, an explicit plugin **overrides** the auto-wired one of the same name (rather than duplicating it), so `plugins` always wins.

## React

```bash
npm install vlist-react
```

```tsx
import { useVList } from "vlist-react";
import { grid } from "vlist";
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

`useVList(config)` returns `{ containerRef, instanceRef, getInstance }`. Lifecycle is auto-managed — `destroy()` runs on unmount.

## Vue

```bash
npm install vlist-vue
```

```vue
<script setup>
import { useVList } from "vlist-vue";
import { selection } from "vlist";
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

`useVList(config)` returns `{ containerRef, instance }`. Pass a `ref` as the config to reactively re-set items when `config.items` changes.

## Svelte

```bash
npm install vlist-svelte
```

The Svelte adapter is an action. It takes an options object with a `config` key (and an optional `onInstance` callback):

```svelte
<script>
import { vlist } from "vlist-svelte";
import { scrollbar } from "vlist";
import "vlist/styles";

let items = [...];
</script>

<div use:vlist={{
  config: {
    item: { height: 48, template: renderItem },
    items,
    plugins: [scrollbar()],
  },
}} />
```

## SolidJS

```bash
npm install vlist-solidjs
```

The SolidJS primitive takes a config **accessor** (a function returning the config) so it stays reactive, and returns `{ setRef, instance }`:

```tsx
import { createVList } from "vlist-solidjs";
import { data } from "vlist";
import "vlist/styles";

function MyList() {
  const { setRef } = createVList(() => ({
    item: { height: 48, template: renderItem },
    items: items(),
    plugins: [data({ adapter: myAdapter })],
  }));

  return <div ref={setRef} />;
}
```

## Auto-Wiring

Instead of importing and passing plugins, you can set convenience fields and the adapter wires the matching plugin for you:

| Config field | Plugin added |
| --- | --- |
| `layout: "grid"` + `grid: { … }` | `grid` |
| `layout: "masonry"` + `masonry: { … }` | `masonry` |
| `groups: { … }` | `groups` |
| `selection: { mode: … }` | `selection` |
| `scrollbar: { … }` — custom overlay scrollbar (the default when omitted) | `scrollbar` |
| `adapter` (+ optional `loading`) | `data` |
| `item.estimatedHeight` / `estimatedWidth` (no explicit size) | `autosize` |
| `scroll: { element: window }` | `page` |

By default the adapters use vlist's **custom overlay scrollbar** (auto-hiding). To use the browser's **native** scrollbar instead, set `scroll: { scrollbar: "native" }`; to hide the scrollbar entirely, use `scroll: { scrollbar: "none" }`.

For example, this is enough to render a 3-column grid — no plugin import needed:

```ts
useVList({
  item: { height: 48, template: renderItem },
  items,
  layout: "grid",
  grid: { columns: 3 },
});
```

## Events

Each adapter ships an event helper that subscribes with automatic cleanup:

- **React** — `useVListEvent(instanceRef, event, handler)`
- **Vue** — `useVListEvent(instanceRef, event, handler)`
- **Svelte** — `onVListEvent(instance, event, handler)` (returns an unsubscribe fn)
- **SolidJS** — `createVListEvent(instance, event, handler)`

```tsx
import { useVList, useVListEvent } from "vlist-react";

const { containerRef, instanceRef } = useVList({ /* … */ });
useVListEvent(instanceRef, "selection:change", ({ selected }) => {
  console.log(selected);
});
```

## Vanilla JS

No adapter needed — use `createVList()` directly with an explicit plugin array (there is no auto-wiring at the core level):

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

If you want the adapters' convenience config (feature fields → plugins) without a framework, import the shared resolver from `vlist/config`:

```ts
import { createVListFromConfig } from "vlist/config";

const list = createVListFromConfig({
  container: document.getElementById("app"),
  item: { height: 48, template: renderItem },
  items: data,
  layout: "grid",
  grid: { columns: 3 },
});
```
