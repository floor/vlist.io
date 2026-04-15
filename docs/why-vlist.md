# Why vlist?

Virtual list libraries have been around for years, but almost all of them are locked to a single framework. **react-window**, **react-virtuoso**, **TanStack Virtual**, **Legend List** — they all assume you're inside React. If you're building with Vue, Svelte, vanilla JS, or a web component, you're either out of luck or reaching for an adapter that was never the primary target.

vlist takes a different approach: **vanilla first, framework optional**.

## The landscape today

| Library | Framework | Dependencies | Gzipped | Tree-shakeable |
|---------|-----------|-------------|---------|----------------|
| react-window | React | 1 (react) | ~6 KB | No |
| react-virtuoso | React | 1 (react) | ~16 KB | No |
| TanStack Virtual | React-first | 1+ | ~10 KB | Partial |
| Legend List v3 | React / RN | 1+ | ~21 KB | No |
| **vlist** | **None** | **0** | **8.7 KB** | **Yes** |

Every library above requires React in your bundle. vlist requires nothing.

## Zero dependencies, by design

No runtime dependencies means no supply chain risk, no version conflicts, no transitive `node_modules` bloat. The entire library is built from scratch in TypeScript.

This isn't a cost-cutting measure — it's an architecture decision. When you own every line of code, you can optimize every line of code.

## Pay only for what you use

vlist uses a builder pattern with opt-in features. The base is 8.7 KB gzipped. Add grid layout? That's 12.8 KB. Need groups with sticky headers? 12.9 KB. Most apps will never ship the full feature set, and the bundler drops everything you don't import.

```typescript
import { vlist, withGrid, withSelection } from 'vlist'

const list = vlist({
  container: '#gallery',
  items: photos,
  item: { height: 200, template: (p) => `<img src="${p.url}" />` },
})
  .use(withGrid({ columns: 4 }))
  .use(withSelection({ mode: 'multiple' }))
  .build()
```

Compare this to monolithic libraries where you ship every feature whether you use it or not.

## Constant memory, regardless of scale

Most virtual list libraries create internal data structures that grow linearly with your dataset. vlist doesn't.

| Dataset size | vlist memory |
|--------------|-------------|
| 10,000 items | ~0.2 MB |
| 100,000 items | ~0.2 MB |
| 1,000,000 items | ~0.4 MB |

No array copying. No ID index maps. O(1) memory complexity. With `withScale()`, vlist handles a million items with the same scroll performance as ten thousand.

## ~26 DOM nodes for 100K items

vlist renders only what's visible plus a small overscan buffer. With 100,000 items in your dataset, roughly 26 DOM elements exist at any given time. The scroll handler runs at 120 FPS with zero allocations on the hot path.

## Everything you need, nothing you don't

| Feature | How |
|---------|-----|
| Lists (vertical & horizontal) | Built-in |
| Grids | `withGrid()` |
| Masonry | `withMasonry()` |
| Data tables | `withTable()` |
| Grouped sections with sticky headers | `withGroups()` |
| Async/infinite loading | `withAsync()` |
| Multi-selection | `withSelection()` |
| 1M+ items with scroll compression | `withScale()` |
| Page-level scrolling | `withPage()` |
| Scroll save/restore | `withSnapshots()` |
| Custom scrollbar | `withScrollbar()` |
| Reverse mode (chat UIs) | `reverse: true` |
| Keyboard navigation & ARIA | Built-in |

Each feature is self-contained. No feature costs you anything until you import it.

## Framework adapters, not framework lock-in

vlist ships adapters for React, Vue, and Svelte. They're thin wrappers — a few lines of glue code that translate framework idioms (refs, hooks, reactivity) into vlist's vanilla API. The core never imports React, never calls `useState`, never touches a virtual DOM.

If your framework doesn't have an adapter yet, you can integrate vlist in an afternoon. It's just DOM.

## Who is vlist for?

- Teams that don't want their UI library choice dictated by their virtualizer
- Projects where bundle size and memory matter
- Anyone rendering large lists, grids, tables, or masonry layouts on the web
- Developers who want one library that works everywhere — plain HTML, React, Vue, Svelte, Web Components, Electron, whatever comes next

## Get started

```bash
npm install vlist
```

Docs and 14+ interactive examples at [vlist.io](https://vlist.io).

---

Built by [Floor IO](https://floor.io) · [GitHub](https://github.com/floor/vlist) · [NPM](https://www.npmjs.com/package/vlist)
