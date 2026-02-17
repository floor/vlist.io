# VList Documentation

> Comprehensive documentation for the vlist virtual list library.

## 🚀 Quick Start

**New to VList?** Start here:

- **[Quick Start Guide](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[Getting Started](./guides/getting-started.md)** - Complete introduction and configuration
- **[Builder Pattern](./guides/builder-pattern.md)** - How to compose features with plugins

## 📚 Documentation Structure

### Guides

User-facing guides for common tasks and patterns:

| Guide | Description |
|-------|-------------|
| **[Getting Started](./guides/getting-started.md)** | Complete introduction, configuration, and usage |
| **[Builder Pattern](./guides/builder-pattern.md)** | Composable plugins - pay only for what you use |
| **[Accessibility](./guides/accessibility.md)** | WAI-ARIA, keyboard navigation, screen reader support |
| **[Mobile](./guides/mobile.md)** | Touch optimization and mobile considerations |
| **[Optimization](./guides/optimization.md)** | Performance tuning and best practices |
| **[Reverse Mode](./guides/reverse-mode.md)** | Chat UI with auto-scroll and history loading |
| **[Styling](./guides/styling.md)** | CSS customization, tokens, variants, dark mode |

### Plugins

Feature plugin documentation with usage examples:

| Plugin | Bundle Cost | Description |
|--------|-------------|-------------|
| **[Plugins Overview](./plugins/README.md)** | - | **All plugins with examples** |
| **[Grid](./plugins/grid.md)** | +4.0 KB | 2D grid layout with virtualized rows |
| **[Sections](./plugins/sections.md)** | +4.6 KB | Grouped lists with sticky/inline headers |
| **[Async](./plugins/async.md)** | +5.3 KB | Async data loading with lazy loading |
| **[Selection](./plugins/selection.md)** | +2.3 KB | Single/multiple selection with keyboard nav |
| **[Scale](./plugins/scale.md)** | +2.2 KB | Handle 1M+ items with compression |
| **[Scrollbar](./plugins/scrollbar.md)** | +1.0 KB | Custom scrollbar UI with auto-hide |
| **[Page](./plugins/page.md)** | +0.9 KB | Document-level scrolling |
| **[Snapshots](./plugins/snapshots.md)** | Included | Scroll position save/restore |

### API Reference

Complete API documentation:

| Reference | Description |
|-----------|-------------|
| **[Methods](./api/methods.md)** | All public methods - data, scroll, selection, lifecycle |
| **[Events](./api/events.md)** | Event system and available events |
| **[Types](./api/types.md)** | TypeScript interfaces and type definitions |

### Resources

Additional documentation and tools:

| Resource | Description |
|----------|-------------|
| **[Benchmarks](./resources/benchmarks.md)** | Performance metrics and live benchmark suites |
| **[Bundle Size](./resources/bundle-size.md)** | Bundle size analysis and optimization |
| **[Testing](./resources/testing.md)** | Test suite, coverage, and patterns |
| **[Known Issues](./resources/known-issues.md)** | Current limitations and workarounds |
| **[Sandbox](./resources/sandbox.md)** | Interactive example documentation |

### Internals

For contributors and advanced users:

| Internal | Description |
|----------|-------------|
| **[Rendering](./internals/rendering.md)** | DOM rendering, virtualization, element pooling |
| **[Context](./internals/context.md)** | BuilderContext and plugin system internals |
| **[Handlers](./internals/handlers.md)** | Event handler registration and execution |
| **[Constants](./internals/constants.md)** | Default values and configuration constants |
| **[Code Generator](./internals/code-generator.md)** | Template and code generation utilities |

## 🎯 Find What You Need

### I want to...

**Get started quickly**
→ [Quick Start Guide](./QUICKSTART.md)

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

**Add selection/keyboard navigation**
→ [Selection Plugin](./plugins/selection.md)

**Customize styles**
→ [Styling Guide](./guides/styling.md)

**See all methods**
→ [API Methods](./api/methods.md)

**Understand accessibility**
→ [Accessibility Guide](./guides/accessibility.md)

**Optimize performance**
→ [Optimization Guide](./guides/optimization.md)

## 🏗️ Architecture Overview

VList uses a **builder pattern** with explicit plugins:

```typescript
import { vlist, withGrid, withSections, withSelection } from 'vlist';

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

**Module organization:**
- `src/builder/` - Core builder and plugin system
- `src/features/` - All plugins (grid, sections, async, etc.)
- `src/rendering/` - Virtual scrolling calculations
- `src/events/` - Event emitter system

**Bundle sizes:** 8-12 KB gzipped based on features used (vs 20-23 KB for traditional virtual lists)

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

**Traditional virtual lists:** 20-23 KB minimum (all features bundled)

## 🔗 External Links

- **Interactive Examples:** [vlist.dev/sandbox](https://vlist.dev/sandbox)
- **Live Benchmarks:** [vlist.dev/benchmarks](https://vlist.dev/benchmarks)
- **GitHub Repository:** [github.com/floor/vlist](https://github.com/floor/vlist)
- **NPM Package:** [@floor/vlist](https://www.npmjs.com/package/@floor/vlist)

## 💡 Tips

- **Use QUICKSTART.md** for copy-paste ready examples
- **Plugin docs are independent** - read only what you need
- **Check bundle-size.md** for optimization strategies
- **All examples are at** [vlist.dev/sandbox](https://vlist.dev/sandbox)

---

**License:** MIT  
**Built by:** [Floor IO](https://floor.io)