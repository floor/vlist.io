# VList Documentation

> Comprehensive documentation for the vlist virtual list library.

## 🚀 Quick Start

**New to VList?** Start here:

- **[Quick Start](./QUICKSTART.md)** - Copy-paste examples for every use case
- **[Getting Started](./guides/getting-started.md)** - Install, configure, and understand the core API
- **[Builder Pattern](./guides/builder-pattern.md)** - How to compose features with plugins

## 📚 Documentation Structure

### Guides

| Guide | Description |
|-------|-------------|
| **[Getting Started](./guides/getting-started.md)** | Install, basic usage, item config, scroll config, TypeScript |
| **[Builder Pattern](./guides/builder-pattern.md)** | Plugins, `.use()` / `.build()`, compatibility, bundle costs |
| **[Accessibility](./guides/accessibility.md)** | WAI-ARIA, keyboard navigation, screen reader support |
| **[Mobile](./guides/mobile.md)** | Touch optimisation and mobile considerations |
| **[Optimization](./guides/optimization.md)** | Performance tuning and best practices |
| **[Reverse Mode](./guides/reverse-mode.md)** | Chat UI with auto-scroll and history loading |
| **[Styling](./guides/styling.md)** | CSS customisation, tokens, variants, dark mode |

### Plugins

| Plugin | Bundle Cost | Description |
|--------|-------------|-------------|
| **[Plugins Overview](./plugins/README.md)** | – | All plugins with minimal examples |
| **[Grid](./plugins/grid.md)** | +4.0 KB | 2D grid layout with virtualised rows |
| **[Sections](./plugins/sections.md)** | +4.6 KB | Grouped lists with sticky/inline headers |
| **[Async](./plugins/async.md)** | +5.3 KB | Async data loading with lazy loading |
| **[Selection](./plugins/selection.md)** | +2.3 KB | Single/multiple selection with keyboard nav |
| **[Scale](./plugins/scale.md)** | +2.2 KB | Handle 1M+ items with compression |
| **[Scrollbar](./plugins/scrollbar.md)** | +1.0 KB | Custom scrollbar UI with auto-hide |
| **[Page](./plugins/page.md)** | +0.9 KB | Document-level scrolling |
| **[Snapshots](./plugins/snapshots.md)** | Included | Scroll position save/restore |

### API Reference

| Reference | Description |
|-----------|-------------|
| **[Reference](./api/reference.md)** | Complete API — config types, methods, events, plugin interfaces |
| **[Methods](./api/methods.md)** | All public methods — data, scroll, selection, lifecycle |

### Resources

| Resource | Description |
|----------|-------------|
| **[Benchmarks](./resources/benchmarks.md)** | Performance metrics and live benchmark suites |
| **[Bundle Size](./resources/bundle-size.md)** | Bundle size analysis and optimisation |
| **[Testing](./resources/testing.md)** | Test suite, coverage, and patterns |
| **[Known Issues](./resources/known-issues.md)** | Current limitations and workarounds |
| **[Sandbox](./resources/sandbox.md)** | Interactive example documentation |

### Internals

For contributors and advanced users:

| Internal | Description |
|----------|-------------|
| **[Rendering](./internals/rendering.md)** | DOM rendering, virtualisation, element pooling |
| **[Context](./internals/context.md)** | BuilderContext and plugin system internals |
| **[Handlers](./internals/handlers.md)** | Event handler registration and execution |
| **[Constants](./internals/constants.md)** | Default values and configuration constants |
| **[Code Generator](./internals/code-generator.md)** | Template and code generation utilities |

## 🎯 Find What You Need

**Get started quickly**
→ [Quick Start](./QUICKSTART.md)

**Learn the builder pattern**
→ [Builder Pattern Guide](./guides/builder-pattern.md)

**Add a grid layout**
→ [Grid Plugin](./plugins/grid.md)

**Create a chat UI**
→ [Reverse Mode Guide](./guides/reverse-mode.md) + [Sections Plugin](./plugins/sections.md)

**Load data asynchronously**
→ [Async Plugin](./plugins/async.md)

**Handle 1M+ items**
→ [Scale Plugin](./plugins/scale.md)

**Add selection / keyboard navigation**
→ [Selection Plugin](./plugins/selection.md)

**Customise styles**
→ [Styling Guide](./guides/styling.md)

**See all methods**
→ [API Methods](./api/methods.md)

**Understand accessibility**
→ [Accessibility Guide](./guides/accessibility.md)

**Optimise performance**
→ [Optimisation Guide](./guides/optimization.md)

## 🏗️ Architecture Overview

VList uses a **builder pattern** with explicit plugins:

```typescript
import { vlist, withGrid, withSections, withSelection } from '@floor/vlist';

const list = vlist({
  container: '#app',
  items: photos,
  item: { height: 200, template: renderPhoto },
})
  .use(withGrid({ columns: 4, gap: 16 }))
  .use(withSections({ ... }))
  .use(withSelection({ mode: 'multiple' }))
  .build();
```

**Module organisation:**
- `src/builder/` — Core builder and plugin system
- `src/features/` — All plugins (grid, sections, async, etc.)
- `src/rendering/` — Virtual scrolling calculations
- `src/events/` — Event emitter system

**Bundle sizes:** 8–16 KB gzipped based on features used (vs 20–23 KB for traditional virtual lists)

## 📦 Bundle Size Reference

| Configuration | Gzipped | Plugins Used |
|---------------|---------|--------------|
| Base only | 7.7 KB | None |
| + Selection | 10.0 KB | `withSelection()` |
| + Grid | 11.7 KB | `withGrid()` + `withScrollbar()` |
| + Sections | 12.3 KB | `withSections()` |
| + Async | 13.5 KB | `withAsync()` + `withPage()` |
| + Scale | 9.9 KB | `withScale()` + `withScrollbar()` |
| All plugins | ~16 KB | Everything |

**Traditional virtual lists:** 20–23 KB minimum (all features bundled)

## 🔗 External Links

- **Interactive Examples:** [vlist.dev/sandbox](https://vlist.dev/sandbox)
- **Live Benchmarks:** [vlist.dev/benchmarks](https://vlist.dev/benchmarks)
- **GitHub Repository:** [github.com/floor/vlist](https://github.com/floor/vlist)
- **NPM Package:** [@floor/vlist](https://www.npmjs.com/package/@floor/vlist)

---

**License:** MIT  
**Built by:** [Floor IO](https://floor.io)