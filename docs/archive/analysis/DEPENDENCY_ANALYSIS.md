# VList Dependency Analysis Report

Generated: $(date)

## Summary Statistics

- **Total Files Analyzed**: 46 TypeScript files
- **Circular Dependencies**: ✔ None found
- **Orphan Files**: 4 files (entry points and minimal builds)

## Generated Graphs

1. **deps-graph.svg** (87KB) - Complete dependency graph of all modules
2. **deps-features.svg** (62KB) - Feature modules dependency graph  
3. **deps-builder.svg** (23KB) - Builder module dependency graph
4. **deps-rendering.svg** (8.5KB) - Rendering module dependency graph

## Most Depended Upon Files (by # of dependents)

| File | Dependents | Role |
|------|-----------|------|
| **index.ts** | 13 | Main entry point, aggregates all exports |
| **vlist.ts** | 10 | Core VList class, integrates all features |
| **builder/context.ts** | 8 | Builder context management |
| **builder/types.ts** | 6 | Builder type definitions |
| **features/grid/feature.ts** | 6 | Grid layout feature |
| **features/grid/renderer.ts** | 6 | Grid rendering logic |
| **features/groups/feature.ts** | 6 | Groups feature |
| **features/async/feature.ts** | 5 | Async loading feature |

## Orphan Files (Entry Points)

These files have no dependents (they are entry points):

- **builder/context.ts** - Builder context entry
- **core/lite.ts** - Lite build entry point
- **core/minimal.ts** - Minimal build entry point  
- **index.ts** - Main package entry point

## Key Dependencies

### types.ts
Most widely used type definitions file, imported by 26 modules:
- All feature implementations
- Builder system
- Rendering modules
- Feature managers

### Core Architecture

The dependency analysis reveals a clean, modular architecture:

1. **Foundation Layer**: `types.ts`, `constants.ts`
2. **Rendering Layer**: `rendering/*` modules
3. **Builder Layer**: `builder/*` modules  
4. **Feature Layer**: `features/*` features
5. **Integration Layer**: `vlist.ts`, `index.ts`

### Feature Architecture

All feature features follow a consistent pattern:
- Import from `builder/types.ts`
- Import from base `types.ts`
- Often import from `rendering/index.ts`
- Self-contained with minimal cross-feature dependencies

## Health Metrics

✅ **No circular dependencies** - Clean dependency graph
✅ **Clear module boundaries** - Well-organized feature separation
✅ **Type-safe architecture** - Central types.ts with 26 dependents
✅ **Feature isolation** - Features don't depend on each other
✅ **Layered design** - Clear separation of concerns

## Module Breakdown by Category

### Builder (4 files)
- context.ts, core.ts, data.ts, types.ts, index.ts

### Events (2 files)  
- emitter.ts, index.ts

### Features (8 feature systems, 29 files total)
- async (5 files)
- grid (5 files)
- page (2 files)
- scale (2 files)
- scrollbar (4 files)
- groups (5 files)
- selection (3 files)
- snapshots (2 files)

### Rendering (5 files)
- heights.ts, renderer.ts, scale.ts, viewport.ts, index.ts

## Recommendations

1. ✅ Architecture is sound - no refactoring needed
2. ✅ Keep features isolated - current pattern is excellent
3. ✅ types.ts serves well as the central type hub
4. ✅ No circular dependencies to break
5. ✅ Clear separation between features and core
