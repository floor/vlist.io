---
created: 2026-05-27
updated: 2026-10-01
status: published
---

# Frameworks

Vue, Svelte, SolidJS and React each have an entry in the `vlist` package itself: `vlist/vue`, `vlist/svelte`, `vlist/solid` and `vlist/react`. An entry manages the list's lifecycle for you: it creates the list on mount and calls `destroy()` on unmount.

The entries are feature-first, like the vanilla builder. You import plugins from `vlist` and pass them explicitly, so an app only bundles the features it uses. Every entry builds on the core from `vlist` and carries no copy of its own.

```bash
npm install vlist
```

The frameworks are optional peer dependencies: install only the one you use. Requires **vlist ≥ 3.1.0**.

## Configuration

Every entry takes two things:

1. **`config`** — the options of core `createVList`, without `container`. The entry owns the element through a ref, a node or a setter.
2. **`plugins`** — the features, from `vlist`: `grid()`, `selection()`, `scrollbar()` and the rest.

```ts
import { grid, selection } from "vlist";

useVList({ item, items }, [grid({ columns: 3 }), selection({ mode: "single" })]);
```

Plugins are read once, at mount. Changing them means remounting the list (in React, with a `key`). An `items` change updates the list in place. `scroll.mode` and the other structural options also take effect only at mount.

A list with no plugins is a plain list: it keeps the browser's native scrollbar and stays a display-only `role="list"`. Add `scrollbar()` for vlist's auto-hiding custom overlay scrollbar. Add `selection()` or `a11y()` for the WAI-ARIA listbox roles and keyboard navigation.

## Vue

```vue
<script setup>
import { useVList, useVListEvent } from "vlist/vue";
import { selection } from "vlist";
import "vlist/styles";

const { containerRef, instance } = useVList(
  { item: { height: 48, template: renderItem }, items: data },
  [selection({ mode: "single" })],
);

useVListEvent(instance, "selection:change", ({ selected }) => {
  console.log(selected);
});
</script>

<template>
  <div ref="containerRef" />
</template>
```

`useVList(config, plugins?)` returns `{ containerRef, instance }`. `instance` is a shallow ref to the list once it is mounted. If you pass a `ref` as the config, the list updates when its `items` change.

## Svelte

The Svelte entry is an action. It works in Svelte 4 and 5. It takes an options object with `config`, optional `plugins`, and an optional `onInstance` callback that receives the list:

```svelte
<script>
import { vlist, onVListEvent } from "vlist/svelte";
import { scrollbar } from "vlist";
import "vlist/styles";

let items = [...];

function ready(list) {
  onVListEvent(list, "item:click", ({ item }) => console.log(item));
}
</script>

<div use:vlist={{
  config: {
    item: { height: 48, template: renderItem },
    items,
  },
  plugins: [scrollbar()],
  onInstance: ready,
}} />
```

The action returns `{ update, destroy }`, and a change to `config.items` updates the list. Reach the list's methods, such as `scrollToIndex()`, through `onInstance`.

## SolidJS

The SolidJS primitive takes a config **accessor** (a function returning the config), so it stays reactive. It returns `{ setRef, instance }`:

```tsx
import { createVList, createVListEvent } from "vlist/solid";
import { grid } from "vlist";
import "vlist/styles";

function MyList() {
  const { setRef, instance } = createVList(
    () => ({ item: { height: 48, template: renderItem }, items: items() }),
    [grid({ columns: 3 })],
  );

  createVListEvent(instance, "item:click", ({ item }) => console.log(item));

  return <div ref={setRef} />;
}
```

The entry is `vlist/solid`. Its `createVList` keeps the Solid primitive idiom, so it shares its name with the core builder. In a file that uses both, alias one of them:

```ts
import { createVList } from "vlist";
import { createVList as createSolidVList } from "vlist/solid";
```

## Vanilla JS

No entry needed: use `createVList()` directly, with the same plugin array:

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

## React

```tsx
import { useVList, useVListEvent } from "vlist/react";
import { grid } from "vlist";
import "vlist/styles";

function MyList({ items }) {
  const { containerRef, instanceRef } = useVList(
    { item: { height: 48, template: renderItem }, items },
    [grid({ columns: 3 })],
  );

  useVListEvent(instanceRef, "item:click", ({ item }) => console.log(item));

  return <div ref={containerRef} />;
}
```

`useVList(config, plugins?)` returns `{ containerRef, instanceRef, getInstance }`. Plugins are read at mount, so give the component a `key` that changes when they should.

## Events

Each entry ships an event helper that subscribes with automatic cleanup:

- **Vue** — `useVListEvent(instance, event, handler)`
- **Svelte** — `onVListEvent(list, event, handler)`, which returns an unsubscribe function
- **SolidJS** — `createVListEvent(instance, event, handler)`
- **React** — `useVListEvent(instanceRef, event, handler)`

## Migrating from the `vlist-*` packages

The `vlist-vue`, `vlist-svelte`, `vlist-solidjs` and `vlist-react` packages are deprecated. Two changes move a list to the entries:

1. **The import path.**

   | Deprecated package | Use |
   | --- | --- |
   | `vlist-vue` | `vlist/vue` |
   | `vlist-svelte` | `vlist/svelte` |
   | `vlist-solidjs` | `vlist/solid` |
   | `vlist-react` | `vlist/react` |

2. **Features become plugins.** The packages took feature fields in the config and wired the plugins for you. The entries take the plugins themselves: the second argument of `useVList` and `createVList`, or `plugins` next to `config` in the Svelte action. A `plugins` array that sat inside the config moves out the same way.

   | Config field | Plugin |
   | --- | --- |
   | `layout: "grid"` + `grid: { … }` | `grid({ … })` |
   | `layout: "masonry"` + `masonry: { … }` | `masonry({ … })` |
   | `groups: { … }` | `groups({ … })` |
   | `selection: { … }` | `selection({ … })` |
   | `a11y: true` or `a11y: { … }` | `a11y()` or `a11y({ … })` |
   | `scrollbar: true` or `scrollbar: { … }` | `scrollbar()` or `scrollbar({ … })` |
   | `scroll: { scrollbar: { … } }` | keep it, and add `scrollbar({ … })` |
   | `snapshots: true` | `snapshots()` |
   | `adapter` (+ optional `loading`) | `data({ adapter, loading })` |
   | `item.estimatedHeight` / `estimatedWidth` with no fixed size | `autosize()` |
   | `scroll: { element: window }` | `page()` |

```ts
// before
import { useVList } from "vlist-react";
useVList({ items, item, scrollbar: true, selection: { mode: "single" } });

// after
import { useVList } from "vlist/react";
import { scrollbar, selection } from "vlist";
useVList({ items, item }, [scrollbar(), selection({ mode: "single" })]);
```

One more difference in Svelte: the deprecated action also returned the list's methods. The entry's action returns only `{ update, destroy }`, so take the list from `onInstance`.
