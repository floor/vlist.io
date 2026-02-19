# VList Refactoring Documentation

This directory contains documentation for major refactoring efforts in the VList project.

## 📚 Documents

### [module-organization-complete.md](./module-organization-complete.md)
**Module Organization Refactoring - Completed January 2025**

Complete documentation of the major refactoring that reorganized VList from a dual-entry system to a builder-only architecture with clearer module naming.

**Key Changes:**
- Renamed `plugins/` → `features/` for clarity
- Renamed `render/` → `rendering/` (noun form)
- Improved module names: `compression` → `scale`, `data` → `async`, `scroll` → `scrollbar`, etc.
- Single builder-only entry point (removed monolithic API)
- **2-3x bundle size reduction** (20-23 KB → 8-12 KB gzip) with optimal tree-shaking

**Status:** ✅ Complete - All tests passing (1739/1739)

### [decompose-builder-core.md](./decompose-builder-core.md)
**Decompose `builder/core.ts` — In Progress February 2025**

Decomposition of the largest file in the project (1900 lines) into focused modules. Comparing two approaches for extracting closure-heavy code from `materialize()`.

**Key Changes:**
- Phase 1: Extracted pure utilities (velocity, DOM, pool, range, scroll) into sibling files
- Phase 1: Reused existing HeightCache and Emitter modules instead of inlined copies
- Phase 2: Extracted BuilderContext, data proxy, scroll proxy via shared mutable refs object
- Short property keys on refs object to preserve minification

**Status:** 🔄 In progress — Option A (refs object) complete, Option B (getter-setter deps) planned

### [decompose-core-option-b.md](./decompose-core-option-b.md)
**Option B Plan: Getter-Setter Deps — February 2025**

Design and pre-implementation analysis of the alternative extraction approach. Hot-path variables stay as bare `let` locals (optimal minification); extracted factories receive getter/setter closures instead of a shared mutable object. Theoretical analysis raises concerns about memory and bundle overhead — to be validated empirically.

### [module-organization-plan.md](./module-organization-plan.md)
**Original Refactoring Plan**

The detailed plan that guided the module organization refactoring, including:
- Rationale for changes
- Step-by-step implementation plan
- Risk assessment
- Bundle size projections
- Breaking changes documentation

## 🎯 Summary of Major Changes

### Directory Structure

```
Before:                          After:
src/                             src/
├── plugins/              →      ├── features/
│   ├── compression/      →      │   ├── scale/
│   ├── data/             →      │   ├── async/
│   ├── scroll/           →      │   ├── scrollbar/
│   ├── window/           →      │   ├── page/
│   ├── groups/           →      │   ├── sections/
│   └── ...                      │   └── ...
├── render/               →      ├── rendering/
└── index.ts (monolithic) →      └── index.ts (builder-only)
```

### API Changes

**Before (Dual Entry):**
```typescript
// Option 1: Monolithic (20-23 KB gzip)
import { createVList } from 'vlist'

// Option 2: Builder (8-12 KB gzip)
import { vlist } from 'vlist/builder'
import { withGrid } from 'vlist/grid'
```

**After (Builder Only):**
```typescript
// Single entry with tree-shaking (8-12 KB gzip)
import { vlist, withGrid, withSections } from 'vlist'

const list = vlist(config)
  .use(withGrid({ columns: 4 }))
  .use(withSections({ ... }))
  .build()
```

### Module Name Improvements

| Old Name | New Name | Rationale |
|----------|----------|-----------|
| `compression` | **scale** | Better conveys large dataset handling |
| `data` | **async** | Explicitly about asynchronous loading |
| `scroll` | **scrollbar** | Specific to custom scrollbar UI |
| `window` | **page** | Page-level scrolling is more intuitive |
| `groups` | **sections** | Clearer for grouped lists with headers |
| `render` | **rendering** | Better as noun (the process) |
| `virtual.ts` | **viewport.ts** | More precise terminology |

## 📈 Impact

### Bundle Size Reduction

- **Before:** 20-23 KB gzip (all features bundled)
- **After:** 8-12 KB gzip (only used features)
- **Improvement:** 2-3x smaller bundles

### Developer Experience

✅ Single, clear API (no confusion)  
✅ Optimal tree-shaking  
✅ Intuitive naming  
✅ Explicit plugin usage  
✅ Modern library pattern  

## 🔗 Related Documentation

- [Architecture Overview](../internals/) - Internal architecture details
- [Dependency Analysis](../analysis/) - Madge dependency reports
- [API Documentation](../api/) - Public API reference
- [Plugin Guides](../plugins/) - Individual plugin documentation

## 📅 History

- **January 2025** - Module organization refactoring completed
  - Branch: `refactor/module-organization`
  - Duration: ~2.5 hours
  - Result: ✅ All tests passing, 2-3x bundle size reduction
- **February 2025** - Decompose `builder/core.ts` (in progress)
  - Branch: `refactor/decompose-core-refs-object` (Option A complete)
  - Branch: `refactor/decompose-core-getter-setter` (Option B planned)
  - Option A result: core.ts 1900 → 1053 lines, bundle +0.7% (71.4 → 71.9 KB), 1184 tests pass

## 🚀 Future Refactoring

Potential future refactoring efforts may be documented here as they are planned and completed.

---

**Last Updated:** February 19, 2025