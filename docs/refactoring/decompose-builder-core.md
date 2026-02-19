# Decompose `builder/core.ts`

**Date:** February 2025
**Status:** 🔄 In progress — Option A implemented, Option B planned
**Branches:**
- `refactor/decompose-core-refs-object` — Option A (refs object) ✅
- *(planned)* `refactor/decompose-core-getter-setter` — Option B (getter-setter deps)

---

## Pre-Implementation Estimates

Theoretical analysis gives Option A an edge on bundle size and memory, but Option B has better hot-path readability. Both will be implemented and compared empirically before a final decision.

| Criterion | Option A (refs) | Option B (estimate) |
|---|---|---|
| Bundle size | +0.5 KB (71.9 KB) | est. +1.0 KB (~72.4 KB) |
| Memory per instance | +0.3 KB | est. +3.2 KB (48 closures × ~56 bytes) |
| Hot-path overhead/frame | ~50–100ns (negligible) | 0ns |
| core.ts lines | 1053 | est. ~1100 |
| Hot-path readability | `$.hc`, `$.ls` (short keys) | bare `heightCache`, `lastScrollTop` ✅ |
| Double-call risk | none | `acc.vtf()()` on 12 of 28 fields |

Full Option B analysis: [decompose-core-option-b.md](./decompose-core-option-b.md)

---

## Problem

`src/builder/core.ts` was the largest file in the project at **1900 lines**. It contained two distinct concerns:

1. **Pure utility functions (L55–465, ~410 lines)** — velocity tracking, height cache, event emitter, DOM structure, element pool, range calculations, scroll helpers. These were intentionally inlined when sub-modules shipped separately, but since we now emit a single `index.js` bundle, Bun.build inlines everything at build time anyway.

2. **`materialize()` (L547–1900, ~1350 lines)** — the function that wires up the entire virtual list. Heavy internal closure state with ~30 mutable `let` variables, making extraction harder. Contains the BuilderContext object (~270 lines), default data-manager proxy (~120 lines), and default scroll-controller proxy (~40 lines).

## Goal

Reduce `core.ts` from ~1900 to ~800–900 lines without changing any public API (`vlist()`, `materialize()` signature, `BuiltVList<T>`).

## Constraints

- 1184 tests must pass — zero regressions
- `dist/index.js` must stay the same size (or smaller)
- No new external dependencies
- No classes — keep the functional composition style
- Keep the existing file naming style — lowercase, no hyphens, `.ts`

---

## Phase 1: Extract Inlined Utilities

Pure functions with zero dependencies on `materialize()` closure state. Extracted to sibling files in `src/builder/`, imported back into `core.ts`.

| Extracted to | What | Lines |
|---|---|---|
| `builder/velocity.ts` | `VelocityTracker`, `createVelocityTracker`, `updateVelocityTracker` + constants | 108 |
| `builder/dom.ts` | `DOMStructure`, `resolveContainer`, `createDOMStructure` | 86 |
| `builder/pool.ts` | `createElementPool` | 32 |
| `builder/range.ts` | `calcVisibleRange`, `applyOverscan`, `calcScrollToPosition` | 80 |
| `builder/scroll.ts` | `easeInOutQuad`, `resolveScrollArgs`, `DEFAULT_SMOOTH_DURATION` | 54 |

For HeightCache and Emitter, the inlined copies in `core.ts` were simplified duplicates of modules that already existed in `rendering/heights.ts` and `events/emitter.ts`. Both are functionally equivalent, so the inlined copies were deleted and replaced with imports from the existing modules. This deduplication actually made the bundle **smaller** since the rendering and events modules were already pulled into the bundle by plugins.

### Phase 1 Results

| Metric | Before | After |
|---|---|---|
| `core.ts` lines | 1900 | 1500 |
| `dist/index.js` | 71.4 KB | 70.5 KB (−0.9 KB) |
| Tests | 1184 pass | 1184 pass |

---

## Phase 2: Extract `materialize()` Internals

The BuilderContext object, default data-manager proxy, and default scroll-controller proxy are the three largest blocks inside `materialize()`. They read and write ~28 mutable `let` variables from the closure (e.g. `heightCache`, `containerHeight`, `lastScrollTop`, `items`, `renderIfNeededFn`).

JavaScript doesn't have pass-by-reference for primitives, so extracting these blocks to a separate file requires a mechanism to share mutable state.

### Option A: Refs Object

**Branch:** `refactor/decompose-core-refs-object`

All 28 mutable variables are grouped into a single `$` (MRefs) object. Both `core.ts` and the extracted `materializectx.ts` read/write through `$.xxx`.

```
// core.ts — before
let containerHeight = dom.viewport.clientHeight;
// ...later...
containerHeight = newMainAxis;

// core.ts — after
const $: MRefs<T> = { ch: dom.viewport.clientHeight, ... };
// ...later...
$.ch = newMainAxis;
```

**Key files:**
- `builder/materializectx.ts` — `MRefs<T>` interface + `createMaterializeCtx()`, `createDefaultDataProxy()`, `createDefaultScrollProxy()` factories
- `builder/core.ts` — creates `$`, passes it to factories, uses `$.xx` everywhere

**Short keys:** Property names survive minification (`$.heightCache` → `e.heightCache` in the bundle, while a bare `let heightCache` → `e`). Using 2–3 character keys (`$.hc` instead of `$.heightCache`) recovered ~2.7 KB of the initial 4.1 KB overhead.

**Readable via JSDoc and doc-table in MRefs:**

| Key | Meaning |
|-----|---------|
| `it` | items |
| `hc` | heightCache |
| `ch` | containerHeight |
| `ls` | lastScrollTop |
| `rfn` | renderIfNeededFn |
| ... | *(28 keys total, documented in interface)* |

#### Option A Results

| Metric | Original | Phase 1 | Phase 2 (long keys) | Phase 2 (short keys) |
|---|---|---|---|---|
| `core.ts` | 1900 | 1500 | 1089 | **1053** |
| `dist/index.js` | 71.4 KB | 70.5 KB | 74.6 KB ❌ | **71.9 KB** (+0.7%) |
| Tests | 1184 | 1184 | 1184 | **1184** |

**Trade-offs:**
- ✅ core.ts reduced by 45% (1900 → 1053)
- ✅ Bundle nearly unchanged (+0.5 KB / +0.7%)
- ✅ Clear separation: ctx factory, data proxy, scroll proxy in own file
- ⚠️ Short keys reduce readability (`$.hc` vs `heightCache`)
- ⚠️ Every mutable variable access is now a property lookup (`$.xx`) instead of a bare local

### Option B: Getter-Setter Deps *(planned)*

**Branch:** `refactor/decompose-core-getter-setter` *(not yet created)*
**Plan:** [decompose-core-option-b.md](./decompose-core-option-b.md)

Instead of a shared mutable object, the extracted factories receive getter/setter closures that capture `materialize()`'s local `let` variables. Hot-path variables stay as bare locals for optimal minification.

**Expected trade-offs:**
- ✅ Hot-path variables stay as bare locals (best minification)
- ✅ `coreRenderIfNeeded` and `onScrollFrame` are completely untouched
- ⚠️ est. +3.2 KB memory/instance — 48 getter/setter closures × 56 bytes each on V8 heap (to be validated)
- ⚠️ Larger bundle expected — accessor object with function wrappers is more verbose (to be measured)
- ⚠️ Double-call pattern — 12 of 28 refs are function-valued, requiring `acc.vtf()()` (to be evaluated in practice)
- ⚠️ More lines in core.ts — keeps 28 `let` declarations AND adds ~48-line accessor object

---

## File Structure After Decomposition

```
src/builder/
├── core.ts              # vlist() + materialize() — down from 1900 to ~1050 lines
├── materializectx.ts    # BuilderContext, data proxy, scroll proxy factories
├── velocity.ts          # VelocityTracker
├── dom.ts               # DOMStructure, resolveContainer, createDOMStructure
├── pool.ts              # createElementPool
├── range.ts             # calcVisibleRange, applyOverscan, calcScrollToPosition
├── scroll.ts            # easeInOutQuad, resolveScrollArgs
├── context.ts           # (existing) Simplified context for non-materialize path
├── data.ts              # (existing) SimpleDataManager
├── types.ts             # (existing) BuilderConfig, BuilderContext, etc.
└── index.ts             # (existing) Barrel export for vlist
```

---

## Verification

After each change:

```bash
bun run build --types    # Must succeed, check index.js size
bun test                 # 1184 tests, 0 fail
```

## What Was NOT Changed

- No class conversions — kept functional composition style
- `vlist()` and `materialize()` function signatures unchanged
- `BuiltVList<T>` public API unchanged
- No new external dependencies
- No changes to `src/rendering/` or `src/events/` (only reused existing modules)
