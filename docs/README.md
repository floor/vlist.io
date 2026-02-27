# VList Documentation

> Reference documentation for the vlist virtual list library.

## 🚀 Quick Start

**New to VList?** Start with tutorials:

- **[Tutorials](/tutorials)** - Step-by-step learning guides
- **[Quick Start](/tutorials/quick-start)** - Get started in 5 minutes
- **[API Reference](./api/reference.md)** - Complete API documentation

## 📚 Documentation Structure

### Tutorials

All learning-oriented content has moved to [/tutorials](/tutorials):

- Getting Started, Builder Pattern, Chat Interface
- Accessibility, Mobile, Optimization, Styling

This documentation now focuses on **reference material** only.

### Features

| Feature | Bundle Cost | Description |
|--------|-------------|-------------|
| **[Features Overview](./features/overview.md)** | – | All features with minimal examples |
| **[Grid](./features/grid.md)** | +4.0 KB | 2D grid layout with virtualised rows |
| **[Sections](./features/sections.md)** | +4.6 KB | Grouped lists with sticky/inline headers |
| **[Async](./features/async.md)** | +5.3 KB | Async data loading with lazy loading |
| **[Selection](./features/selection.md)** | +2.3 KB | Single/multiple selection with keyboard nav |
| **[Scale](./features/scale.md)** | +2.2 KB | Handle 1M+ items with scaling |
| **[Scrollbar](./features/scrollbar.md)** | +1.0 KB | Custom scrollbar UI with auto-hide |
| **[Page](./features/page.md)** | +0.9 KB | Document-level scrolling |
| **[Snapshots](./features/snapshots.md)** | Included | Scroll position save/restore |

### API Reference

| Reference | Description |
|-----------|-------------|
| **[Reference](./api/reference.md)** | Complete API — config types, methods, events, feature interfaces |
| **[Methods](./api/reference.md)** | All public methods — data, scroll, selection, lifecycle |

### Resources

| Resource | Description |
|----------|-------------|
| **[Benchmarks](./resources/benchmarks.md)** | Performance metrics and live benchmark suites |
| **[Bundle Size](./resources/bundle-size.md)** | Bundle size analysis and optimisation |
| **[Testing](./resources/testing.md)** | Test suite, coverage, and patterns |
| **[Known Issues](./resources/known-issues.md)** | Current limitations and workarounds |
| **[Roadmap](./resources/roadmap.md)** | Completion analysis and competitive position |
| **[Examples](./resources/examples.md)** | Interactive example documentation |

### Internals

For contributors and advanced users:

| Internal | Description |
|----------|-------------|
| **[Structure](./internals/structure.md)** | Complete source code map |
| **[Rendering](./internals/rendering.md)** | DOM rendering, virtualisation, element pooling |
| **[Context](./internals/context.md)** | BuilderContext and feature system internals |
| **[Orientation](./internals/orientation.md)** | How vertical and horizontal share one code path |

### Refactoring

Version history and migration guides:

| Document | Description |
|----------|-------------|
| **[v0.9.0 Migration Guide](./refactoring/v0.9.0-migration-guide.md)** | Breaking changes and migration from v0.8.2 to v0.9.0 |
| **[Height → Size Refactoring](./refactoring/height-to-size-refactoring.md)** | Complete dimension-agnostic refactoring details |

## 🎯 Find What You Need

**Get started quickly**
→ [Tutorials](/tutorials)

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
- **Internals** - Implementation details for contributors
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
| + Sections | 12.3 KB | `withSections()` |
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
