# Bundle Size & Tree-Shaking

> How vlist's entry points affect your bundle, what tree-shaking can and cannot do, and how to ship the least code possible.

## The Problem

Virtual list libraries are typically all-or-nothing: you import the library and get every feature whether you use it or not. A simple contact list ships the same bytes as a million-item grid with sticky headers, compression, and async loading.

vlist solves this with **three entry points** at different size/feature trade-offs, plus **separate plugin modules** that only enter your bundle when explicitly imported.

## Entry Points

### Measured sizes (from `bun run build`)

| Entry point | Minified | Gzipped | Modules | Features |
|-------------|----------|---------|---------|----------|
| `vlist/core` | 8.0 KB | 3.3 KB | 1 (self-contained) | Basic virtual scrolling |
| `vlist/builder` | 14.8 KB | 5.6 KB | 1 (self-contained) | Virtual scrolling + plugin system |
| `vlist` | 54.5 KB | 17.9 KB | 34 | Everything |

### `vlist/core` — 8.0 KB

The lightest option. A single self-contained file with zero imports — height cache, emitter, DOM structure, element pool, renderer, range calculations, and scroll handling are all inlined.

```typescript
import { createVList } from 'vlist/core'

const list = createVList({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
})
```

**Includes:** virtual scrolling, element pooling, variable heights, data methods (setItems, appendItems, prependItems, updateItem, removeItem), scroll methods (scrollToIndex, scrollToItem), events (scroll, range:change, item:click, resize), ResizeObserver, ARIA accessibility, window scroll mode, scroll save/restore.

**Does NOT include:** selection, custom scrollbar, async data adapter, compression (1M+ items), grid layout, grouped lists with sticky headers, reverse mode.

**Tree-shaking:** Not applicable — it's a single file with no imports. What you see is what you get.

### `vlist/builder` — 14.8 KB

The composable option. Also a single self-contained file (zero imports), but adds a plugin system on top of the core rendering engine. You pick features via `.use()` and only the plugins you import enter your bundle.

```typescript
import { vlist } from 'vlist/builder'
import { withSelection } from 'vlist/selection'
import { withScrollbar } from 'vlist/scroll'

const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
})
.use(withSelection({ mode: 'multiple' }))
.use(withScrollbar({ autoHide: true }))
.build()
```

**Includes everything in core, plus:** reverse mode, plugin extension system (.use/.build API), component replacement hooks, handler registration arrays, method registration.

**Does NOT include (until you `.use()` them):** selection, custom scrollbar, async data, compression, grid, groups, snapshots.

**Tree-shaking:** Works perfectly. Each plugin is a separate entry point. If you don't import `withGrid`, grid code is never in your bundle.

### `vlist` — 54.5 KB

The full bundle. Every feature, zero configuration. One import, one function call.

```typescript
import { createVList } from 'vlist'

const list = createVList({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
  selection: { mode: 'single' },
  scroll: { scrollbar: { autoHide: true } },
  // Everything available via config
})
```

**Includes:** everything.

**Tree-shaking:** ❌ **Does not work.** This is the critical point — read on.

## Why Tree-Shaking Fails on `createVList`

### The root cause

The monolithic `createVList` factory in `vlist.ts` unconditionally imports every feature module at the top of the file:

```typescript
// vlist.ts — these imports are always executed
import { createSelectionState } from "./selection"
import { createScrollController, createScrollbar } from "./scroll"
import { createDataManager } from "./data"
import { createGridLayout, createGridRenderer } from "./grid"
import { createGroupLayout, createStickyHeader } from "./groups"
import { getCompression, calculateCompressedItemPosition } from "./render"
// ... 34 modules total
```

Feature selection happens at **runtime** via config checks:

```typescript
if (config.layout === 'grid') {
  // use grid code
}
if (config.groups) {
  // use groups code
}
if (config.selection?.mode !== 'none') {
  // use selection code
}
```

A bundler (webpack, rollup, vite, bun, esbuild) performs tree-shaking via **static analysis** — it reads import/export statements at build time and eliminates code that is never imported. But it **cannot evaluate runtime values** like `config.layout === 'grid'`.

From the bundler's perspective:
1. `createVList` is exported and used ✓
2. `createVList` calls `createGridLayout` inside its body ✓
3. Therefore `createGridLayout` is reachable and must be kept ✓

The bundler is correct — it can't prove that the grid code path will never execute, because `config` is a runtime argument.

### What bundlers actually do

```
Your code:
  import { createVList } from 'vlist'
  createVList({ container: '#app', item: { height: 48, template: fn }, items })

Bundler sees:
  ✓ createVList is used
  ✓ createVList imports createGridLayout (used in an if-branch)
  ✓ createVList imports createGroupLayout (used in an if-branch)
  ✓ createVList imports createScrollbar (used in an if-branch)
  ✓ createVList imports createDataManager (used in an if-branch)
  → Must keep ALL of them. Cannot prove they won't run.

Result: 54.5 KB — same as importing everything.
```

Even if you never set `layout: 'grid'` in your config, the grid code ships. Even if you never pass an `adapter`, the sparse storage and placeholder code ships.

### Verified with measurements

```
Import only createVList (from vlist.ts):  52.4 KB — 33 modules bundled
Import via barrel index (from index.ts):  55.8 KB — 34 modules bundled
Import from vlist/core:                    8.0 KB —  1 module bundled
Import from vlist/builder:                14.8 KB —  1 module bundled (+ plugins)
```

The 3 KB difference between `vlist.ts` and `index.ts` is the barrel's re-exports of types and utilities. The important number: **52.4 KB is the floor** for any import path that touches `createVList`. Tree-shaking saves nothing.

## How the Builder Solves This

The builder avoids the monolithic import problem by using **separate entry points** for each feature:

```
vlist/builder      → src/builder/core.ts      (self-contained, 14.8 KB)
vlist/selection    → src/selection/plugin.ts   (separate file, 5.9 KB)
vlist/scroll       → src/scroll/plugin.ts      (separate file, 8.6 KB)
vlist/data         → src/data/plugin.ts        (separate file, 12.2 KB)
vlist/compression  → src/compression/plugin.ts (separate file, 6.8 KB)
vlist/grid         → src/grid/plugin.ts        (separate file, 7.2 KB)
vlist/groups       → src/groups/plugin.ts      (separate file, 9.2 KB)
vlist/snapshots    → src/snapshots/plugin.ts   (separate file, 1.1 KB)
```

When you write:

```typescript
import { vlist } from 'vlist/builder'
import { withScrollbar } from 'vlist/scroll'
```

The bundler sees two separate files. It never encounters `vlist/grid`, `vlist/groups`, `vlist/data`, etc. — they simply don't exist in the import graph. No static analysis needed; the code is physically absent.

### Bundle composition examples

| What you import | Minified | Gzipped |
|-----------------|----------|---------|
| Builder only (no plugins) | 14.8 KB | 5.6 KB |
| Builder + scrollbar | 19.3 KB | 7.0 KB |
| Builder + selection + scrollbar | 25.2 KB | 9.1 KB |
| Builder + data + scrollbar | 27.0 KB | 10.4 KB |
| Builder + grid + scrollbar | 22.0 KB | 9.9 KB |
| Builder + compression + scrollbar | 21.6 KB | 8.4 KB |
| Builder + all plugins | ~66 KB | ~25 KB |
| Monolithic `createVList` | 54.5 KB | 17.9 KB |

Note: builder + all plugins is *larger* than the monolithic bundle because each plugin carries its own setup/teardown code that the monolithic factory inlines. The builder wins when you use fewer than ~5 plugins.

## Plugin Sizes

Each plugin's size when imported standalone:

| Plugin | Minified | Gzipped | What it adds |
|--------|----------|---------|--------------|
| `withSelection` | 5.9 KB | 2.2 KB | Click/keyboard selection, ARIA, CSS classes |
| `withScrollbar` | 8.6 KB | 3.0 KB | Custom scrollbar DOM, drag, auto-hide, hover |
| `withData` | 12.2 KB | 4.8 KB | Sparse storage, placeholders, adapter, velocity loading |
| `withCompression` | 6.8 KB | 2.6 KB | 1M+ items, scroll-space compression |
| `withGrid` | 7.2 KB | 3.1 KB | 2D grid renderer, column layout, gap |
| `withGroups` | 9.2 KB | 3.6 KB | Grouped lists, sticky headers |
| `withSnapshots` | 1.1 KB | 0.6 KB | Scroll save/restore |

## Framework Adapter Sizes

The framework adapters are thin wrappers that import from the monolithic `vlist` entry point:

| Adapter | Own size | Total (with vlist) | Runtime included |
|---------|----------|--------------------|-----------------|
| `vlist/react` | 0.7 KB | 55.2 KB + React | React 17+ |
| `vlist/vue` | 0.5 KB | 55.0 KB + Vue | Vue 3 |
| `vlist/svelte` | 0.3 KB | 54.8 KB + vlist | None (plain function) |

The adapters import `createVList` from `vlist`, so they pull in the full monolithic bundle. They do not currently work with the builder entry point.

## Why Two Self-Contained Files?

Both `vlist/core` and `vlist/builder` are self-contained — they inline their height cache, emitter, DOM helpers, element pool, and renderer instead of importing shared modules. This seems wasteful (code duplication), but it's intentional:

### The module boundary tax

When code is split across modules, each module adds overhead:

- **Module wrapper** — Bun/webpack/rollup wrap each module in a function scope
- **Import resolution** — the bundler must resolve and link import references
- **Cross-module function calls** — can't be inlined by the minifier
- **Type interface objects** — adapter patterns for replaceable components add allocations

The previous builder architecture imported from 10 separate modules (render/heights, render/virtual, render/renderer, render/compression, scroll/controller, events/emitter, etc.) and measured **25.6 KB**. After inlining everything into one file: **14.8 KB** — a 42% reduction from eliminating module boundaries alone.

### The compression story

The original `render/virtual.ts` unconditionally imported `render/compression.ts` because every viewport calculation called `getCompressionState()`. This dragged 2.6 KB of compression code into the builder even though compression is a separate plugin.

The fix: `virtual.ts` now defines simple non-compressed range calculations inline. Compression functions are injectable via callback parameters. The builder core uses the simple path; the `withCompression` plugin injects the full compression implementation when installed.

This is the same principle as the monolithic tree-shaking problem, applied at the module level: if module A unconditionally imports module B, you can't eliminate B even if A only uses it conditionally.

## Decision Guide

```
Do you need virtual scrolling only?
  → vlist/core (8.0 KB min / 3.3 KB gzip)
    Smallest possible. No plugins, no extensibility.

Do you need 1-3 specific features and care about bundle size?
  → vlist/builder + plugins (14.8 KB + only what you use)
    Pay-per-feature. Each unused plugin costs zero bytes.

Do you want everything with zero configuration?
  → vlist (54.5 KB min / 17.9 KB gzip)
    One import, one function call. No decisions needed.

Are you building a prototype or internal tool?
  → vlist (54.5 KB min / 17.9 KB gzip)
    Bundle size doesn't matter here. Ship fast.
```

## Measuring Your Bundle

### With Bun

```bash
bun build your-app.ts --minify --outdir dist
# Check dist/your-app.js size
```

### With Vite

```bash
npx vite build
# Check dist/assets/*.js sizes in output
```

### Quick size check for any entry point

```bash
# Minified size
bun build node_modules/vlist/dist/builder/index.js --minify | wc -c

# Gzipped size
bun build node_modules/vlist/dist/builder/index.js --minify | gzip -c | wc -c
```

## Summary

| Question | Answer |
|----------|--------|
| Does tree-shaking work on `vlist`? | ❌ No — `createVList` imports everything unconditionally |
| Does tree-shaking work on `vlist/builder`? | ✅ Yes — plugins are separate entry points |
| Does tree-shaking work on `vlist/core`? | N/A — single file, nothing to shake |
| What's the smallest possible bundle? | 8.0 KB (`vlist/core`) |
| What's the smallest with plugins? | 14.8 KB (`vlist/builder` with no plugins) |
| Why is the builder self-contained? | Module boundaries add ~42% overhead vs inlining |
| Do framework adapters use the builder? | No — they import the full monolithic `createVList` |