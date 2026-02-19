# Decompose `builder/core.ts` — Option B: Getter-Setter Deps

**Date:** February 2025
**Status:** 📋 Planned — will implement and compare empirically with Option A
**Branch:** `refactor/decompose-core-getter-setter` *(not yet created)*
**Baseline:** `staging` (same as Option A)

---

## Pre-Implementation Analysis

Theoretical analysis suggests Option A may be the more efficient choice, but we will implement Option B to compare empirically. Key concerns to validate:

| Criterion | Option A (refs) | Option B (estimate) |
|---|---|---|
| Bundle size | +0.5 KB (71.9 KB) | est. +1.0 KB (~72.4 KB) |
| Memory per instance | +0.3 KB | est. +3.2 KB (48 closures × ~56 bytes) |
| Hot-path overhead/frame | ~50–100ns | 0ns |
| core.ts lines | 1053 | est. ~1100 |
| Hot-path readability | `$.hc`, `$.ls` (short keys) | bare `heightCache`, `lastScrollTop` ✅ |
| Double-call risk | none | `acc.vtf()()` on 12 of 28 fields |
| Mental model | one rule: "use `$`" | three concepts: locals, getters, setters |

### Concerns to Validate

**Memory:** Each getter and setter is a separate `Function` object on the V8 heap (~56 bytes each). 48 closures × 56 bytes = ~2,700 bytes, plus the accessor object itself (~600 bytes) = **~3.2 KB per list instance**. Option A adds only the `$` object: **~0.3 KB**. To be confirmed with actual implementation.

**Bundle:** The accessor object literal is more verbose than a plain value object (function wrappers `() => x` and `(v) => { x = v }` vs plain `x`). Factory reads are also longer (`acc.hc()` vs `$.hc`). Estimated net: ~500–600 bytes larger than Option A. To be measured.

**Runtime:** Both are expected to be negligible. Option A's property lookups (~50–100ns/frame) are invisible next to DOM operations (~10,000–100,000ns/frame). Option B's cold-path function calls (~2–5ns/read) should be equally irrelevant.

**Correctness risk:** 12 of 28 refs are function-valued (`virtualTotalFn`, `renderIfNeededFn`, `scrollGetTop`, etc.). Reading these through a getter produces a double-call: `acc.vtf()()` — get the function, then call it. Missing one set of parens is a silent bug. Option A has no equivalent hazard (`$.vtf()` is unambiguous). Implementation will reveal whether this is a practical problem or manageable with discipline.

---

## Summary

Option B extracts the same three blocks from `materialize()` as Option A (BuilderContext, data proxy, scroll proxy), but uses **getter/setter closures** instead of a shared mutable refs object. Hot-path variables remain as bare `let` in `materialize()` for optimal minification.

## Motivation

Option A's refs object (`$`) has a measurable cost: every mutable variable access becomes a property lookup (`$.hc`, `$.ch`, etc.) — including inside the scroll hot path (`coreRenderIfNeeded`, `onScrollFrame`). Property names survive minification even with short keys, adding ~0.5 KB to the bundle.

Option B keeps hot-path code untouched. Only the extracted factory code pays the indirection cost, and that code runs infrequently (plugin setup, data mutations, user-initiated scrolls).

---

## Design

### Core Idea

The extracted factory receives **accessor functions** that close over `materialize()`'s local `let` variables. Reads go through getter functions. Writes go through setter functions. The function names are local parameters inside the factory — they minify to single letters.

### What Changes vs Option A

| Concern | Option A (refs) | Option B (getter-setter) |
|---------|----------------|--------------------------|
| Hot-path code (`coreRenderIfNeeded`, `onScrollFrame`) | Uses `$.hc`, `$.ch`, `$.ls`, etc. | Uses bare `heightCache`, `containerHeight`, `lastScrollTop` |
| Extracted factory code | Uses `$.hc`, `$.ch`, etc. | Calls `getHC()`, `getCH()` or destructures from accessor |
| Mutable state writes from factory | `$.hc = newCache` | `setHC(newCache)` |
| Object literal at call site | `const $: MRefs<T> = { hc: ..., ch: ..., ... }` | `{ getHC: () => heightCache, setHC: (v) => { heightCache = v }, ... }` |
| Property names in bundle | Short keys survive minification (`$.hc`) | Accessor property names survive, but fewer total sites |
| Hot-path minification | `e.hc` (3 chars) | `a` (1 char) — bare local |

### Accessor Object Shape

```typescript
// Defined in materializectx.ts
export interface MAccessors<T extends VListItem> {
  // Readers — return current value of the closure variable
  hc: () => HeightCache;
  ch: () => number;
  cw: () => number;
  it: () => T[];
  ls: () => number;
  dm: () => any;
  sc: () => any;
  vtf: () => (() => number);
  sgt: () => (() => number);
  sst: () => ((pos: number) => void);
  sab: () => ((threshold?: number) => boolean);
  sic: () => boolean;
  rfn: () => (() => void);
  ffn: () => (() => void);
  gvr: () => MRefs<T>['gvr'];   // reuse the function signature from Option A
  gsp: () => MRefs<T>['gsp'];
  pef: () => ((el: HTMLElement, idx: number) => void);
  at: () => ItemTemplate<T>;
  vt: () => { velocity: number; sampleCount: number };
  id: () => boolean;
  ii: () => boolean;
  fi: () => number;
  ss: () => Set<string | number>;
  la: () => string;
  vre: () => boolean;
  st: () => HTMLElement | Window;

  // Writers — update the closure variable
  // Only for properties the factory actually needs to WRITE
  setHC: (v: HeightCache) => void;
  setDM: (v: any) => void;
  setSC: (v: any) => void;
  setVTF: (v: () => number) => void;
  setSGT: (v: () => number) => void;
  setSST: (v: (pos: number) => void) => void;
  setSIC: (v: boolean) => void;
  setRFN: (v: () => void) => void;
  setFFN: (v: () => void) => void;
  setGVR: (v: MAccessors<T>['gvr']) => void;
  setGSP: (v: MAccessors<T>['gsp']) => void;
  setPEF: (v: (el: HTMLElement, idx: number) => void) => void;
  setAT: (v: ItemTemplate<T>) => void;
  setVRE: (v: boolean) => void;
  setST: (v: HTMLElement | Window) => void;
  setSS: (v: Set<string | number>) => void;
  setFI: (v: number) => void;
  setLA: (v: string) => void;
  setCH: (v: number) => void;
  setCW: (v: number) => void;
  setIT: (v: T[]) => void;
  setLS: (v: number) => void;
}
```

### Call Site in `core.ts`

```typescript
// core.ts — inside materialize()

// Hot-path variables stay as bare locals (unchanged from before extraction)
let heightCache = createHeightCache(mainAxisSizeConfig, items.length);
let containerHeight = dom.viewport.clientHeight;
let lastScrollTop = 0;
let items: T[] = initialItems ? [...initialItems] : [];
// ... all 28 let variables remain as-is ...

// Accessor object — one-time cost, closures capture the let variables
const acc: MAccessors<T> = {
  hc: () => heightCache,    setHC: (v) => { heightCache = v; },
  ch: () => containerHeight, setCH: (v) => { containerHeight = v; },
  it: () => items,           setIT: (v) => { items = v; },
  ls: () => lastScrollTop,   setLS: (v) => { lastScrollTop = v; },
  // ... etc for all 28 variables ...
};

const ctx = createMaterializeCtx(acc, deps);
```

### Factory Usage

```typescript
// materializectx.ts
export const createMaterializeCtx = <T extends VListItem>(
  acc: MAccessors<T>,
  deps: MDeps<T>,
): BuilderContext<T> => {
  const { dom, emitter, resolvedConfig, ... } = deps;

  return {
    get heightCache() {
      return acc.hc() as any;
    },
    rebuildHeightCache(total?: number) {
      acc.hc().rebuild(total ?? acc.vtf()());
    },
    setHeightConfig(newConfig) {
      acc.setHC(createHeightCache(newConfig, acc.vtf()()));
    },
    // ...
  };
};
```

### Hot-Path Code — Unchanged

```typescript
// core.ts — coreRenderIfNeeded stays exactly as Phase 1 left it
// (bare local variables, no $.xx or acc.xx)
const coreRenderIfNeeded = (): void => {
  if (isDestroyed) return;

  const total = virtualTotalFn();
  getVisibleRange(lastScrollTop, containerHeight, heightCache, total, visibleRange);
  applyOverscan(visibleRange, overscan, total, renderRange);
  // ... all bare locals, minify to single letters ...
};
```

---

## Bundle Size Analysis

### Why It Should Be Smaller Than Option A

| Source of overhead | Option A | Option B |
|---|---|---|
| Hot-path property accesses (~90 sites) | `$.hc`, `$.ch`, `$.ls` — property names in bundle | Bare locals — minify to single letters |
| Accessor object creation | `{ hc: val, ch: val, ... }` — 28 key-value pairs | `{ hc: () => v, setHC: (x) => { v = x }, ... }` — 28 getters + ~20 setters |
| Factory property reads | `$.hc` per read | `acc.hc()` → `a()` after minification |

**Estimated comparison:**

- Option A hot-path overhead: ~90 accesses × ~4 chars each (`e.hc`) = ~360 chars
- Option B hot-path overhead: 0 (bare locals)
- Option A accessor creation: ~28 × 10 chars = ~280 chars
- Option B accessor creation: ~48 × 20 chars = ~960 chars (getters + setters are more verbose)
- Option B accessor reads in factory: `a()` (2 chars) vs Option A `e.hc` (4 chars), ~100 sites × 2 char savings = ~200 chars

**Net estimate:** Option B should be **~400–600 bytes smaller** than Option A short-keys, but the accessor object boilerplate partially offsets this. The actual difference may be marginal — hence the comparison.

### Worst Case

If the accessor boilerplate (getter/setter function wrappers) exceeds the hot-path savings, Option B could be slightly LARGER than Option A. This is the main risk and the reason we're comparing both approaches on real code before deciding.

---

## Implementation Plan

### Step 1: Branch from staging

```bash
git checkout staging
git checkout -b refactor/decompose-core-getter-setter
```

### Step 2: Apply Phase 1 (cherry-pick or redo)

Phase 1 (pure utility extraction) is identical between Option A and B. Either cherry-pick the Phase 1 commit from the refs branch, or re-apply the same changes:

- Extract `velocity.ts`, `dom.ts`, `pool.ts`, `range.ts`, `scroll.ts`
- Delete inlined HeightCache/Emitter, import from existing modules
- Verify: 1184 tests, 70.5 KB bundle

### Step 3: Create `MAccessors<T>` interface and factories

New file `builder/materializectx.ts` (different content from Option A):

- `MAccessors<T>` — getter/setter interface
- `MDeps<T>` — immutable deps (same as Option A)
- `createMaterializeCtx(acc, deps)` — returns `BuilderContext<T>`
- `createDefaultDataProxy(acc, deps, ctx)` — returns data manager
- `createDefaultScrollProxy(acc, deps)` — returns scroll controller

### Step 4: Update `core.ts`

- Keep all `let` variables as-is (bare locals)
- Create accessor object that wraps them with getter/setter closures
- Replace ctx/proxy object literals with factory calls
- **DO NOT touch** `coreRenderIfNeeded`, `onScrollFrame`, or other hot-path code

### Step 5: Verify

```bash
bun test                 # 1184 tests, 0 fail
bun run build --types    # Check bundle size vs baseline (71.4 KB) and Option A (71.9 KB)
```

---

## Comparison Criteria

After both options are implemented, compare on:

| Criterion | Weight | Notes |
|---|---|---|
| `dist/index.js` size | **High** | Original: 71.4 KB. Must be ≤72 KB. |
| `core.ts` line count | **Medium** | Target: ≤1100 lines. |
| Hot-path readability | **Medium** | Can a new developer follow `coreRenderIfNeeded`? |
| Factory readability | **Low** | Extracted code is read less frequently. |
| Accessor boilerplate | **Low** | One-time cost in `core.ts`, acceptable if not excessive. |

---

## Risks

1. **Accessor boilerplate may negate savings.** 28 getters + ~20 setters = ~48 closure wrappers. Each is `(v)=>{x=v}` or `()=>x` — small individually but adds up. If total overhead exceeds hot-path savings, Option B loses on bundle size.

2. **Double-call pattern.** Some accessor reads return functions that then get called: `acc.vtf()()` (get virtualTotalFn, then call it). This is ugly and a potential source of bugs. Consider whether frequently-called function refs should be passed differently.

3. **Stale-read risk is lower than Option A** (each getter always reads the live `let` variable), but **stale-write risk** exists if a factory caches a setter and calls it after the variable has been reassigned by another path.

---

## Runtime & Memory Analysis

### Runtime Speed

Both options add negligible overhead compared to DOM operations in the render cycle.

- **Hot path (60fps):** `coreRenderIfNeeded` does ~30 mutable variable reads per frame. Option A pays ~1–3ns per property lookup (V8 inline cache on monomorphic object) = ~50–100ns total. Option B pays 0ns (bare locals). A single `element.style.transform = ...` costs ~1,000–5,000ns. DOM dominates by 1000×.
- **Cold path (rare):** Option B's getter calls (~2–5ns each) are slightly more expensive than Option A's property lookups (~1–3ns). Irrelevant since cold-path methods run at most a few times per second.

### Memory

- **Option A:** 1 plain object with 28 properties. ~300–400 bytes per list instance.
- **Option B:** 1 accessor object with 48 properties (28 getters + 20 setters). Each arrow function is a `Function` object on the V8 heap (~56 bytes). 48 × 56 = ~2,700 bytes for function objects + ~600 bytes for the accessor object = **~3,200 bytes per list instance**. These survive until `destroy()` is called.

For an app with 10 list instances: Option A adds ~3 KB total, Option B adds ~32 KB.

### Bundle Size Estimate

- Option A hot-path overhead: ~90 accesses × ~4 chars (`e.hc`) = ~360 chars
- Option B hot-path overhead: 0 chars (bare locals) — saves 360 chars
- Option B accessor creation: ~48 properties × ~20 chars (closure wrappers) = ~960 chars
- Option B factory reads: `a()` (2 chars) vs `e.hc` (4 chars) — but double-call sites `a()()` add back. ~100 reads × mixed = ~+100 chars
- **Net estimate: Option B ~500–600 bytes larger than Option A**

## Related

- [decompose-builder-core.md](./decompose-builder-core.md) — Parent document covering both options
- Branch `refactor/decompose-core-refs-object` — Option A implementation (complete)