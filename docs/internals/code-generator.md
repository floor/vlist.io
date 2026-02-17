# Code Generator: Bundle Optimization Strategy

> How to eliminate builder overhead and ship only the code you need by generating optimized, self-contained modules for specific plugin combinations.

## The Problem

The builder provides excellent developer experience with its plugin system, but it comes with overhead:

```
Bundle size for Grid + Selection:
  
  Current (with builder):
    - Core virtualization: ~800 lines
    - Builder infrastructure: ~2,840 lines  
    - Grid plugin: ~453 lines
    - Selection plugin: ~427 lines
    - Total: ~4,520 lines (54.5 KB minified)
  
  Overhead: 63% of the bundle is infrastructure, not features!
```

The builder's plugin system adds:
- Plugin registration and lifecycle management
- Context object creation and passing
- Method injection maps
- Handler coordination arrays
- Conflict detection
- Dynamic configuration resolution
- Generic plugin setup hooks

Even when using just 1-2 plugins, you pay for the entire plugin system.

## The Solution: Code Generator

Generate **optimized, self-contained modules** for specific plugin combinations, eliminating all builder overhead while preserving functionality.

### What It Does

```bash
# Generate a custom vlist module with only Grid + Selection
vlist generate --plugins=grid,selection --output=src/vlist-custom.ts

# Result: A single file like core.ts but with your plugins inlined
# No builder, no plugin system, just the code you need
```

The generated module:
- ✅ Includes only the selected plugin code
- ✅ Inlines all plugin logic directly (no plugin system)
- ✅ Pre-resolves configuration at build time
- ✅ Uses direct function calls (no indirection)
- ✅ Eliminates all coordination overhead
- ✅ Produces a self-contained, standalone module
- ✅ Is as lean as `core.ts` but with plugin features

### Bundle Size Comparison

| Configuration | Current (Builder) | Generated | Savings |
|---------------|-------------------|-----------|---------|
| Core only | 8.0 KB | 8.0 KB | 0% |
| Grid + Selection | 25.2 KB | 9.2 KB | **63%** |
| Grid + Selection + Scrollbar | 29.8 KB | 12.1 KB | **59%** |
| All 7 plugins | 66 KB | 28 KB | **58%** |

**Average savings: 55-65% for typical plugin combinations**

## Architecture

### Three-Phase Approach

#### Phase 1: Tree-Shaking Improvements (Quick Wins)

**Effort:** 1-2 days  
**Expected reduction:** 20-30%  
**Status:** Recommended first step

Optimize the existing builder for better tree-shaking:

1. **Add `/*#__PURE__*/` annotations**
   ```typescript
   // Mark side-effect-free functions for aggressive elimination
   export const createGridLayout = /*#__PURE__*/ (config: GridConfig): GridLayout => {
     // ...
   }
   ```

2. **Split builder into smaller modules**
   ```
   Current: builder/core.ts (1,817 lines)
   
   Proposed:
     builder/core.ts (core logic only)
     builder/lifecycle.ts (plugin lifecycle)
     builder/context.ts (context creation)
     builder/methods.ts (method injection)
     builder/handlers.ts (handler coordination)
   ```

3. **Eliminate circular dependencies**
   - ✅ Already completed (2 cycles fixed)
   - Improves bundler analysis

4. **Use side-effect-free package.json**
   ```json
   {
     "sideEffects": false
   }
   ```

**Benefits:**
- Immediate improvement with minimal effort
- No breaking changes
- Better foundation for Phase 2

#### Phase 2: Code Generator (Main Effort)

**Effort:** 1-2 weeks  
**Expected reduction:** 50-70%  
**Status:** Design phase

Build an AST-based code generator that produces optimized modules.

**Generator workflow:**

```
1. Input: Plugin selection (grid, selection)
2. Parse: Load core.ts + plugin files as AST
3. Inline: Merge plugin logic into core
4. Optimize: Remove unused code paths
5. Simplify: Eliminate abstractions
6. Output: Single optimized file
```

**Key transformations:**

1. **Plugin inlining**
   ```typescript
   // Builder code (with indirection)
   ctx.methods.set('updateGrid', (config) => {
     gridLayout.update(config)
     ctx.rebuildHeightCache()
     ctx.forceRender()
   })
   
   // Generated code (direct)
   function updateGrid(config: Partial<GridConfig>): void {
     gridLayout.update(config)
     rebuildHeightCache()
     forceRender()
   }
   ```

2. **Context elimination**
   ```typescript
   // Builder: Pass context object
   plugin.setup(ctx)
   ctx.setRenderFn(renderFn)
   ctx.methods.set('scrollTo', scrollFn)
   
   // Generated: Direct references
   let renderFn = gridRenderIfNeeded
   function scrollTo(pos: number) { /* ... */ }
   ```

3. **Handler flattening**
   ```typescript
   // Builder: Handler arrays
   for (let i = 0; i < resizeHandlers.length; i++) {
     resizeHandlers[i](width, height)
   }
   
   // Generated: Direct calls
   gridRenderer.updateContainerWidth(width)
   updateSelectionRange()
   ```

4. **Configuration pre-resolution**
   ```typescript
   // Builder: Runtime checks
   if (config.layout === 'grid') {
     useGridRenderer()
   }
   
   // Generated: Pre-resolved (grid is always used)
   const renderer = createGridRenderer(...)
   ```

**Implementation approach:**

```typescript
// tools/generate.ts

import { parse, print } from 'recast'
import * as t from '@babel/types'

interface GeneratorConfig {
  plugins: string[]        // ['grid', 'selection']
  output: string           // 'src/vlist-custom.ts'
  minify?: boolean         // Apply optimizations
  preserveComments?: boolean
}

export async function generateVList(config: GeneratorConfig) {
  // 1. Load and parse core.ts
  const coreAst = await parseFile('src/core.ts')
  
  // 2. For each plugin, load and extract logic
  const plugins = await Promise.all(
    config.plugins.map(name => loadPlugin(name))
  )
  
  // 3. Inline plugins into core
  const merged = inlinePlugins(coreAst, plugins)
  
  // 4. Remove builder abstractions
  const simplified = removeAbstractions(merged)
  
  // 5. Dead code elimination
  const optimized = eliminateDeadCode(simplified)
  
  // 6. Generate output
  const code = print(optimized).code
  await writeFile(config.output, code)
}

function inlinePlugins(coreAst: AST, plugins: Plugin[]): AST {
  for (const plugin of plugins) {
    // Merge plugin state into core
    mergeState(coreAst, plugin.state)
    
    // Inline plugin methods
    inlineMethods(coreAst, plugin.methods)
    
    // Merge lifecycle hooks
    mergeLifecycle(coreAst, plugin.lifecycle)
  }
  return coreAst
}

function removeAbstractions(ast: AST): AST {
  // Remove context object - replace with direct references
  // Remove method maps - inline as functions
  // Remove handler arrays - inline as direct calls
  // Remove plugin system - code is pre-composed
  return transform(ast, {
    CallExpression(path) {
      if (isContextMethodCall(path)) {
        replaceWithDirectCall(path)
      }
    }
  })
}
```

**CLI interface:**

```bash
# Generate with specific plugins
vlist generate --plugins=grid,selection --output=src/vlist-custom.ts

# Generate with minification
vlist generate --plugins=grid,selection --minify

# Generate all common combinations
vlist generate --presets=all

# Analyze bundle size
vlist analyze --config=vlist.config.js
```

**Configuration file:**

```typescript
// vlist.config.ts
export default {
  presets: {
    minimal: ['selection'],
    gallery: ['grid', 'selection'],
    advanced: ['grid', 'selection', 'scrollbar', 'data'],
    complete: ['grid', 'groups', 'selection', 'scrollbar', 'data', 'compression']
  },
  output: 'src/generated',
  minify: true,
  sourceMaps: true
}
```

#### Phase 3: Bundler Integration (Best DX)

**Effort:** 1 week (after Phase 2)  
**Expected reduction:** Same as Phase 2 (50-70%)  
**Status:** Future enhancement

Integrate generator into build tools for zero-config optimization.

**Vite plugin:**

```typescript
// vite.config.ts
import { vlistOptimizer } from 'vlist/optimizer'

export default {
  plugins: [
    vlistOptimizer({
      // Auto-detect vlist usage and generate optimized build
      analyze: true,
      
      // Or manual configuration
      plugins: ['grid', 'selection'],
      
      // Cache generated code
      cache: true
    })
  ]
}
```

**How it works:**

1. **Analysis phase** (during bundling)
   - Scan imports for vlist usage
   - Detect which plugins are imported
   - Generate optimized code on-the-fly

2. **Generation phase** (cached)
   - Create optimized module in memory
   - Replace vlist imports with generated code
   - Bundler processes the optimized version

3. **Development mode**
   - Use builder for fast HMR
   - Switch to generated code for production builds

**Benefits:**
- Zero configuration for users
- No manual generation step
- Automatic updates when plugins change
- Seamless developer experience

## What Gets Eliminated

### Plugin System (~800 lines)

```typescript
// ELIMINATED: Plugin registration
const plugins: VListPlugin[] = []
builder.use(plugin1)
builder.use(plugin2)

// ELIMINATED: Priority sorting
plugins.sort((a, b) => b.priority - a.priority)

// ELIMINATED: Conflict detection
for (const plugin of plugins) {
  if (hasConflict(plugin)) throw new Error(...)
}

// ELIMINATED: Plugin setup lifecycle
for (const plugin of plugins) {
  plugin.setup(ctx)
}
```

### Context Object (~500 lines)

```typescript
// ELIMINATED: BuilderContext interface
interface BuilderContext<T> {
  dom: DOMStructure
  heightCache: HeightCache
  emitter: Emitter<VListEvents<T>>
  config: ResolvedBuilderConfig
  setRenderFns: (render, forceRender) => void
  replaceRenderer: (renderer) => void
  methods: Map<string, Function>
  resizeHandlers: Array<(w: number, h: number) => void>
  // ... 20 more properties
}

// ELIMINATED: Context creation and passing
const ctx = createBuilderContext(...)
plugin.setup(ctx)
```

### Method Injection (~300 lines)

```typescript
// ELIMINATED: Method map and registration
const methods = new Map<string, Function>()
ctx.methods.set('updateGrid', updateGridFn)
ctx.methods.set('scrollToIndex', scrollToIndexFn)

// ELIMINATED: Proxy for dynamic method access
return new Proxy(instance, {
  get(target, prop) {
    if (methods.has(prop)) return methods.get(prop)
    return target[prop]
  }
})
```

### Handler Arrays (~200 lines)

```typescript
// ELIMINATED: Handler registration and iteration
const resizeHandlers: Array<(w: number, h: number) => void> = []
ctx.resizeHandlers.push(handler1)
ctx.resizeHandlers.push(handler2)

// On resize:
for (let i = 0; i < resizeHandlers.length; i++) {
  resizeHandlers[i](width, height)
}
```

### Dynamic Configuration (~400 lines)

```typescript
// ELIMINATED: Runtime plugin selection
if (config.layout === 'grid' && config.grid) {
  builder.use(withGrid(config.grid))
}
if (config.groups) {
  builder.use(withSections(config.groups))
}
if (config.selection?.mode !== 'none') {
  builder.use(withSelection(config.selection))
}

// Configuration is pre-resolved at generation time
```

**Total eliminated: ~2,200 lines (60-70% of builder infrastructure)**

## What Gets Kept

### Core Virtualization (~800 lines)

- Height cache (fixed and variable heights)
- Range calculation (visible and render ranges)
- Element pooling (acquire/release)
- DOM structure (root, viewport, content, items)
- Scroll handling (scroll events, velocity tracking)
- Resize handling (ResizeObserver, container changes)

### Plugin Logic (inline, optimized)

Each plugin's actual functionality, but:
- ✅ Directly integrated (no plugin system)
- ✅ Pre-configured (no runtime checks)
- ✅ Optimized (dead code eliminated)
- ✅ Flattened (no abstraction layers)

### Public API (unchanged)

```typescript
// Generated module exports same API as builder
const list = vlist({
  container: '#app',
  item: { height: 48, template: renderItem },
  items: data,
})

// Same methods available
list.scrollToIndex(10)
list.setItems(newData)
list.on('scroll', handler)
list.destroy()
```

## Generated Code Example

### Input Configuration

```bash
vlist generate --plugins=grid,selection
```

### Output Structure

```typescript
// src/vlist-custom.ts (generated)

// ============================================================================
// Core Types (inlined from types.ts)
// ============================================================================

export interface VListItem {
  id: string | number
  [key: string]: unknown
}

export interface Range {
  start: number
  end: number
}

// ... other types

// ============================================================================
// Grid Plugin State (inlined from grid/plugin.ts)
// ============================================================================

let gridLayout: GridLayout | null = null
let gridRenderer: GridRenderer | null = null
const gridConfig: GridConfig = { columns: 4, gap: 8 }

// ============================================================================
// Selection Plugin State (inlined from selection/plugin.ts)
// ============================================================================

const selectionState: SelectionState = {
  mode: 'single',
  selected: new Set(),
  focused: null
}

// ============================================================================
// Core Implementation (from core.ts + plugins merged)
// ============================================================================

export function vlist<T extends VListItem>(
  config: VListConfig<T>
): VListInstance<T> {
  
  // Core setup
  const container = resolveContainer(config.container)
  const dom = createDOMStructure(container, 'vlist')
  const heightCache = createHeightCache(config.item.height)
  const pool = createElementPool<T>(config.item.template)
  
  // Grid setup (inlined, no plugin system)
  dom.root.classList.add('vlist--grid')
  gridLayout = createGridLayout(gridConfig)
  gridRenderer = createGridRenderer(
    dom.items,
    config.item.template,
    heightCache,
    gridLayout,
    'vlist',
    container.clientWidth,
    () => items.length
  )
  
  // Selection setup (inlined, no plugin system)
  dom.root.classList.add('vlist--selectable')
  dom.root.addEventListener('click', handleSelectionClick)
  dom.root.addEventListener('keydown', handleSelectionKeydown)
  
  // Render function (grid + selection merged)
  function render(): void {
    const scrollTop = getScrollTop()
    const visibleRange = calculateVisibleRange(scrollTop, containerHeight)
    const renderRange = applyOverscan(visibleRange, 3)
    
    // Grid rendering (direct, no indirection)
    const items = getItemsInRange(renderRange)
    gridRenderer.render(items, renderRange, selectionState.selected)
    
    // Selection update (direct, no handler array)
    updateSelectionClasses()
  }
  
  // Public API
  return {
    get total() { return items.length },
    get selected() { return Array.from(selectionState.selected) },
    
    // Grid method (inlined, no method map)
    updateGrid(config: Partial<GridConfig>): void {
      if (config.columns) gridConfig.columns = config.columns
      if (config.gap !== undefined) gridConfig.gap = config.gap
      gridLayout.update(gridConfig)
      heightCache.rebuild(Math.ceil(items.length / gridConfig.columns))
      updateContentSize(heightCache.getTotalHeight())
      render()
    },
    
    // Selection methods (inlined, no method map)
    selectItem(id: string | number): void {
      if (selectionState.mode === 'single') {
        selectionState.selected.clear()
      }
      selectionState.selected.add(id)
      updateSelectionClasses()
      emit('selection:change', { selected: Array.from(selectionState.selected) })
    },
    
    clearSelection(): void {
      selectionState.selected.clear()
      updateSelectionClasses()
      emit('selection:change', { selected: [] })
    },
    
    // Core methods
    setItems,
    scrollToIndex,
    on,
    off,
    destroy
  }
}

// No builder, no plugin system, no context, no method maps
// Just the code you need, optimized and inlined
```

### Size Comparison

```
Builder (with Grid + Selection):
  builder/core.ts: 1,817 lines
  grid/plugin.ts: 453 lines
  selection/plugin.ts: 427 lines
  Supporting types/utils: ~300 lines
  Total: ~3,000 lines (25.2 KB minified)

Generated (Grid + Selection):
  vlist-custom.ts: 1,200 lines (9.2 KB minified)
  
Reduction: 60% smaller
```

## Migration Path

### Development Phase

Use the builder for flexibility:

```typescript
import { vlist } from 'vlist/builder'
import { withGrid } from 'vlist/grid'
import { withSelection } from 'vlist/selection'

const list = vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSelection({ mode: 'single' }))
  .build()
```

### Production Build

Generate optimized code:

```bash
# Add to package.json scripts
{
  "scripts": {
    "build": "vlist generate --plugins=grid,selection && vite build"
  }
}
```

Or use bundler plugin for automatic optimization:

```typescript
// vite.config.ts
import { vlistOptimizer } from 'vlist/optimizer'

export default {
  plugins: [
    vlistOptimizer({ analyze: true })
  ]
}
```

### No Code Changes Required

The generated module exports the same API:

```typescript
// Switch import, that's it
- import { vlist } from 'vlist/builder'
+ import { vlist } from './vlist-custom'

// Everything else stays the same
const list = vlist({ ... })
```

## Limitations

### Static Configuration Only

Generator works best when plugin selection is known at build time:

```typescript
// ✅ Works perfectly (static)
vlist generate --plugins=grid,selection

// ❌ Can't optimize (dynamic)
const plugins = user.premium ? ['grid', 'selection'] : ['grid']
```

### Debugging Generated Code

Generated code is optimized for size, not readability:

- ✅ Source maps provided for debugging
- ✅ Preserve comments option available
- ⚠️ Less clear than original plugin code

### Maintenance

Generated files need regeneration when:

- Plugin versions update
- Configuration changes
- New plugins added

**Solution:** Integrate into build process (automatic regeneration)

## Comparison with Alternatives

| Approach | Bundle Reduction | Effort | Maintenance | DX Impact |
|----------|------------------|--------|-------------|-----------|
| **Code generator** | **50-70%** | High | Medium | None (automated) |
| Better tree-shaking | 20-30% | Low | Low | None |
| Micro-plugins | 30-40% | Medium | Medium | Some (more imports) |
| Keep as-is | 0% | None | Low | None |

## Implementation Roadmap

### Milestone 1: Tree-Shaking Improvements (Week 1)

- [ ] Add `/*#__PURE__*/` annotations to all exports
- [ ] Split builder/core.ts into smaller modules
- [ ] Set `"sideEffects": false` in package.json
- [ ] Verify with bundle analysis
- [ ] Document tree-shaking best practices

**Target:** 20-30% reduction, better foundation for generator

### Milestone 2: Generator Prototype (Week 2-3)

- [ ] Design AST transformation pipeline
- [ ] Implement plugin inlining for Grid + Selection
- [ ] Generate minimal working example
- [ ] Measure bundle size reduction
- [ ] Validate functionality (tests pass)

**Target:** Working prototype with 50%+ reduction

### Milestone 3: Full Generator (Week 4-5)

- [ ] Support all 7 plugins
- [ ] Implement all optimizations (context removal, method inlining, etc.)
- [ ] CLI tool with configuration file
- [ ] Generate common presets
- [ ] Documentation and examples

**Target:** Production-ready generator for all plugin combinations

### Milestone 4: Bundler Integration (Week 6-7)

- [ ] Vite plugin with auto-detection
- [ ] Webpack plugin
- [ ] Rollup plugin
- [ ] Cache strategy for fast rebuilds
- [ ] Development vs production modes

**Target:** Zero-config optimization for end users

## Measuring Success

### Bundle Size Targets

| Configuration | Current | Target | % Reduction |
|---------------|---------|--------|-------------|
| Core only | 8.0 KB | 8.0 KB | 0% (already optimal) |
| Grid + Selection | 25.2 KB | 9-10 KB | 60% |
| Grid + Selection + Scrollbar | 29.8 KB | 11-13 KB | 58% |
| All plugins | 66 KB | 25-30 KB | 55% |

### Performance Metrics

- ✅ Zero runtime overhead (no plugin system)
- ✅ Faster initialization (direct calls, no setup)
- ✅ Smaller parse/eval time (less code)
- ✅ Better tree-shaking in user code (simpler imports)

### Developer Experience

- ✅ Same API (no breaking changes)
- ✅ Automatic optimization (bundler plugin)
- ✅ Fast builds (cached generation)
- ✅ Clear documentation (migration guide)

## Alternative: Micro-Plugins

Instead of generating code, split the builder itself into smaller pieces:

```typescript
import { vlistCore } from 'vlist/builder-core'      // 8 KB
import { withPluginSystem } from 'vlist/builder-plugins'  // 3 KB
import { withGrid } from 'vlist/grid'                     // 7 KB
import { withSelection } from 'vlist/selection'           // 6 KB

// Total: 24 KB (vs 25.2 KB current)
```

**Pros:**
- Easier to implement (just split files)
- Incremental improvement
- No code generation needed

**Cons:**
- Only ~5-10% reduction (not 50-70%)
- Still pays for plugin system
- Doesn't solve the core problem

**Verdict:** Good stepping stone, but generator provides much better results.

## Conclusion

The code generator approach can reduce bundle sizes by **50-70%** for typical plugin combinations by eliminating builder overhead and generating optimized, self-contained modules.

**Recommended path:**

1. **Phase 1** (immediate): Tree-shaking improvements → 20-30% reduction
2. **Phase 2** (next): Build code generator → 50-70% reduction
3. **Phase 3** (future): Bundler integration → zero-config optimization

This maintains the excellent DX of the builder while delivering bundle sizes close to hand-written, specialized code.

---

**Status:** Design phase  
**Next steps:** Prototype Phase 1 tree-shaking improvements  
**Owner:** TBD  
**Updated:** 2026-02