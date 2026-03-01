# VList Documentation

> Reference documentation for the vlist virtual list library.

## 🚀 Quick Start

**New to VList?** Start with tutorials:

- **[Tutorials](/tutorials)** - Step-by-step learning guides
- **[Quick Start](/tutorials/quick-start)** - Get started in 5 minutes
- **[Framework Adapters](./frameworks.md)** - React, Vue, Svelte, and SolidJS integration
- **[API Reference](./api/reference.md)** - Complete API documentation

## 📚 Documentation Structure

### Tutorials

All learning-oriented content has moved to [/tutorials](/tutorials):

- Getting Started, Builder Pattern, Chat Interface
- Accessibility, Mobile, Optimization, Styling

This documentation now focuses on **reference material** only.

### Framework Adapters

| Adapter | Package | Description |
|--------|---------|-------------|
| **[Framework Adapters](./frameworks.md)** | – | React, Vue, Svelte, and SolidJS integration |

### Features

| Feature | Bundle Cost | Description |
|--------|-------------|-------------|
| **[Features Overview](./features/overview.md)** | – | All features with examples, costs, and compatibility |
| **[Grid](./features/grid.md)** | +4.0 KB | 2D grid layout with virtualised rows |
| **[Masonry](./features/masonry.md)** | +2.9 KB | Pinterest-style shortest-lane layout |
| **[Groups](./features/groups.md)** | +4.6 KB | Grouped lists with sticky/inline headers |
| **[Async](./features/async.md)** | +5.3 KB | Async data loading with lazy loading |
| **[Placeholders](./features/placeholders.md)** | Included | Skeleton loading states (with Async) |
| **[Selection](./features/selection.md)** | +2.3 KB | Single/multiple selection with keyboard nav |
| **[Scale](./features/scale.md)** | +2.2 KB | Handle 1M+ items with scaling |
| **[Scrollbar](./features/scrollbar.md)** | +1.0 KB | Custom scrollbar UI with auto-hide |
| **[Page](./features/page.md)** | +0.9 KB | Document-level scrolling |
| **[Snapshots](./features/snapshots.md)** | Included | Scroll position save/restore |

### API Reference

| Reference | Description |
|-----------|-------------|
| **[Reference](./api/reference.md)** | Complete API — config, properties, methods |
| **[Types](./api/types.md)** | TypeScript type definitions |
| **[Events](./api/events.md)** | Event system and payloads |
| **[Constants](./api/constants.md)** | Default values and thresholds |
| **[Exports](./api/exports.md)** | Low-level utilities and feature authoring |

### Resources

| Resource | Description |
|----------|-------------|
| **[Benchmarks](./resources/benchmarks.md)** | Performance metrics and live benchmark suites |
| **[Bundle Size](./resources/bundle-size.md)** | Bundle size analysis and optimisation |
| **[Testing](./resources/testing.md)** | Test suite, coverage, and patterns |
| **[Architecture](./resources/roadmap.md)** | Architecture and competitive position |
| **[Examples](./resources/examples.md)** | Interactive example documentation |

### Under the Hood

For contributors and advanced users:

| Topic | Description |
|----------|-------------|
| **[Structure](./internals/structure.md)** | Complete source code map |
| **[Context](./internals/context.md)** | BuilderContext and feature system internals |
| **[Rendering](./internals/rendering.md)** | DOM rendering, virtualisation, element pooling |
| **[Scroll](./internals/scrollbar.md)** | Scroll controller, custom scrollbar, velocity tracking |
| **[Orientation](./internals/orientation.md)** | How vertical and horizontal share one code path |
| **[Measurement](./internals/measurement.md)** | Auto-size measurement (Mode B) |

### Refactoring

Version history and migration guides:

| Document | Description |
|----------|-------------|
| **[v0.9.0 Migration Guide](./refactoring/v0.9.0-migration-guide.md)** | Breaking changes and migration from v0.8.2 to v0.9.0 |
| **[Height → Size Refactoring](./refactoring/height-to-size-refactoring.md)** | Complete dimension-agnostic refactoring details |

## 🎯 Find What You Need

**Get started quickly**
→ [Tutorials](/tutorials)

**Use React, Vue, Svelte, or SolidJS**
→ [Framework Adapters](./frameworks.md)

**API Reference**
→ [Complete API](./api/reference.md)

**Add a grid layout**
→ [Grid Feature](./features/grid.md)

**Create a chat UI**
→ [Chat Interface Tutorial](/tutorials/chat-interface)

**Load data asynchronously**
→ [Async Feature](./features/async.md)

**Handle 1M+ items**
→ [Scale Feature](./features/scale.md)

**Add selection / keyboard navigation**
→ [Selection Feature](./features/selection.md)

**Customise styles**
→ [Styling Tutorial](/tutorials/styling)

**See all methods**
→ [API Methods](./api/reference.md)

**Learn accessibility**
→ [Accessibility Tutorial](/tutorials/accessibility)

**Optimise performance**
→ [Optimization Tutorial](/tutorials/optimization)

**Migrate from v0.8.2**
→ [v0.9.0 Migration Guide](./refactoring/v0.9.0-migration-guide.md)

## 📖 Documentation Structure

This repository contains **reference documentation** only:

- **API Reference** - Methods, types, events
- **Features** - Feature-specific reference docs
- **Under the Hood** - Implementation details for contributors
- **Resources** - Benchmarks, bundle size, testing

For **learning content**, see [/tutorials](/tutorials):
- Getting Started, Builder Pattern, Chat Interface
- Accessibility, Mobile, Optimization, Styling

## 📦 Bundle Size Reference

| Configuration | Gzipped | Features Used |
|---------------|---------|--------------|
| Base only | 7.7 KB | None |
| + Selection | 10.0 KB | `withSelection()` |
| + Grid | 11.7 KB | `withGrid()` + `withScrollbar()` |
| + Groups | 12.3 KB | `withGroups()` |
| + Async | 13.5 KB | `withAsync()` + `withPage()` |
| + Scale | 9.9 KB | `withScale()` + `withScrollbar()` |
| All features | ~16 KB | Everything |

**Traditional virtual lists:** 20–23 KB minimum (all features bundled)

## 🔗 External Links

- **Interactive Examples:** [vlist.dev/examples](https://vlist.dev/examples)
- **Live Benchmarks:** [vlist.dev/benchmarks](https://vlist.dev/benchmarks)
- **GitHub Repository:** [github.com/floor/vlist](https://github.com/floor/vlist)
- **NPM Package:** [@floor/vlist](https://www.npmjs.com/package/@floor/vlist)

---

**License:** MIT  
**Built by:** [Floor IO](https://floor.io)
