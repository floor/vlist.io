---
id: "013"
title: Monolithic dist/index.js causes 20x memory regression in benchmarks
severity: critical
status: fixed
component: build
related: ["RFC-003 §3", "010", "011", "012"]
---

# Issue 013: Monolithic dist/index.js causes 20x memory regression in benchmarks

---

## Symptom

The v2 memory benchmark (10K items, vanilla) reported **147 MB total heap** vs v1's **6.5 MB** — a 20x regression. Scroll delta was **-19.3 MB** (large negative), indicating V8 was shedding compiled code during the scroll phase rather than accumulating leaks.

## Investigation

### Initial hypothesis: per-frame allocations

RFC-003 identified several hot-path allocation sites (Issues 010-012). These were fixed:

- Pre-allocated scroll/idle event singletons (`core/create.ts`)
- Hoisted `releaseIfNotVisible` callback to module scope (`core/pipeline.ts`)
- Hoisted `rangeItems`/`range` in table plugin
- Hoisted `getItem` closure in masonry plugin

After applying all per-frame fixes, the benchmark got **worse**: 190 MB total heap, -159 MB scroll delta. The fixes were correct but irrelevant to the dominant issue.

### Root cause: build architecture

`build.ts` used a wrapper hack to force Bun to include all exports:

```typescript
const wrapperCode = [
  `import { createVList, a11y, scale, scrollbar, grid, selection, page,`,
  `  snapshots, transition, autosize, masonry, async, groups,`,
  `  table, sortable, createStats } from "${entryAbs}";`,
  `export { createVList, a11y, scale, scrollbar, grid, selection, page,`,
  `  snapshots, transition, autosize, masonry, async, groups,`,
  `  table, sortable, createStats };`,
].join("\n");
```

This produced a **1.27 MB monolithic `dist/index.js`** with all 14 plugins inlined. Every consumer — including the benchmark — loaded the entire library regardless of what they imported.

V8 compiles and holds metadata for all loaded code. At ~8-13x source size, the 1.27 MB bundle consumed **10-16 MB of V8 heap** just for compilation artifacts. The large negative scroll delta was V8's GC reclaiming lazy-compiled bytecode during idle periods.

### Failed approach: code splitting

Dynamic `import()` with Bun's `splitting: true` was attempted to load only the needed suite per benchmark page. This produced 61 chunks but **increased** total heap to 52.1 MB — the per-module V8 overhead and chunk loading infrastructure outweighed the savings from excluding unused frameworks.

## Fix

Replace Bun.build bundling with `tsc` transpilation (`tsconfig.build.json`: remove `emitDeclarationOnly: true`). This preserves the module structure:

- `dist/index.js`: **1 KB** of re-exports (was 1.27 MB monolith)
- 78 individual module files in `dist/` mirroring `src/`
- Consumer bundlers tree-shake from the barrel — importing `createVList` alone pulls ~18 KB

Supporting changes:
- `package.json` `files`: `["dist/**/*.js", ...]` (was `["dist/index.js", ...]`)
- `prepublishOnly`: removed `--types` flag (tsc now emits both JS and declarations)

## Results

| Metric | v1 (1.9.1) | v2 before fix | v2 after fix |
|--------|-----------|---------------|--------------|
| After render | 0.07 MB | N/A | 0.08 MB |
| Scroll delta | -0.63 MB | -19.3 MB | 0.02 MB |
| Total heap | 5.9 MB | 147 MB | 5.7 MB |

Note: earlier measurements showed inflated total heap values due to V8's in-memory code cache retaining compiled code from watch-mode builds. See Issue 014 for details. The numbers above were taken after a browser restart with production builds.

## Status

**Fixed** — `build.ts`, `tsconfig.build.json`, `package.json`
