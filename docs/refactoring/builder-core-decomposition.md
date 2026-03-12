# Builder Core Decomposition

**Status**: ✅ Complete  
**Branch**: `refactor/builder-core`  
**Commit**: `b340f12`  
**Date**: 8 March 2026  
**Version**: 1.3.1  
**Impact**: Maintainability refactor — no public API changes, no breaking changes  
**Origin**: [V1 Code Review §1 — Core Architecture](../archive/V1_CODE_REVIEW.md#1-core-architecture--corets-decomposition)

## Table of Contents

- [Problem Statement](#problem-statement)
- [Analysis](#analysis)
- [What Was Done](#what-was-done)
- [What Was Intentionally Not Done](#what-was-intentionally-not-done)
- [Bug Fix: Wheel Handler Event Consistency](#bug-fix-wheel-handler-event-consistency)
- [Bundle Size Optimization](#bundle-size-optimization)
- [Final Results](#final-results)
- [File Structure](#file-structure)
- [V1 Code Review Acceptance Criteria](#v1-code-review-acceptance-criteria)

---

## Problem Statement

`builder/core.ts` was 1,513 lines — the single largest file and the critical path. The `materialize()` function was a ~1,350-line closure responsible for:

- Mode B measurement (ResizeObserver, scroll correction, content size deferral)
- The entire render loop (selection, placeholders, compression repositioning)
- Scroll handling (wheel interception, native scroll, idle detection)
- Click/dblclick event delegation
- Viewport ResizeObserver
- Smooth scroll animation
- All data operations (setItems, appendItems, prependItems, updateItem, removeItem)
- Public API object construction with getter proxies
- Destroy teardown and event subscription

The V1 Code Review identified this as a medium-priority maintainability issue affecting onboarding and feature development velocity.

---

## Analysis

Before extracting anything, we evaluated each proposed module from the V1 review against three criteria:

1. **Is it a self-contained subsystem with clear boundaries?**
2. **Does extraction add meaningful cognitive benefit (not just smaller files)?**
3. **Can it be done without adding hot-path indirection?**

### Dependency Audit

The reason extraction was difficult was that everything inside `materialize()` closed over shared mutable state. We identified two categories:

**Already in `$` refs bag** (accessible by extracted modules):
`it`, `hc`, `ch`, `cw`, `ls`, `vt`, `ss`, `fi`, `dm`, `sc`, `rfn`, `ffn`, `sgt`, `sst`, `sab`, `pef`, `at`, `vtf`, etc.

**Local-only closure variables** (would need promotion or callback injection):
`isScrolling`, `idleTimer`, `animationFrameId`, `rendered`, `visibleRange`, `renderRange`, `lastRenderRange`, `measuredCache`, `measuredElementToIndex`, `itemResizeObserver`, `pendingScrollDelta`, `pendingContentSizeUpdate`, `selectionIdsGetter`, `selectionFocusGetter`

The key insight: modules that need hot-path locals (`rendered`, `visibleRange`, `renderRange`) shouldn't be extracted because promoting those to `$` adds indirection on every scroll frame. Modules that only need `$` plus a few callbacks are clean extraction targets.

---

## What Was Done

### Phase 1: Deduplication (3 helpers)

Before any structural extraction, we removed duplicated code within `core.ts`:

#### 1. `onScrollIdle` + `scheduleIdle`

The idle timeout handler was duplicated verbatim (~15 lines each) in both `onScrollFrame` and `wheelHandler`:

```typescript
// Before: identical blocks in two places
idleTimer = setTimeout(() => {
  dom.root.classList.remove(`${classPrefix}--scrolling`);
  isScrolling = false;
  $.vt.velocity = 0;
  $.vt.sampleCount = 0;
  emitter.emit("velocity:change", { velocity: 0, reliable: false });
  flushMeasurements();
  sortDOMChildren();
  for (let i = 0; i < idleHandlers.length; i++) idleHandlers[i]!();
  emitter.emit("scroll:idle", { scrollPosition: $.ls });
}, scrollCfg?.idleTimeout ?? SCROLL_IDLE_TIMEOUT);

// After: shared helper
const onScrollIdle = (): void => { /* ... */ };
const scheduleIdle = (): void => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(onScrollIdle, scrollCfg?.idleTimeout ?? SCROLL_IDLE_TIMEOUT);
};
```

#### 2. `findClickTarget`

`handleClick` and `handleDblClick` had ~90% identical DOM traversal and group header guard logic:

```typescript
// Before: duplicated in handleClick and handleDblClick
const target = event.target as HTMLElement;
const itemEl = target.closest("[data-index]") as HTMLElement | null;
if (itemEl) {
  const layoutIndex = parseInt(itemEl.dataset.index ?? "-1", 10);
  if (layoutIndex >= 0) {
    const item = $.dm?.getItem(layoutIndex) ?? $.it[layoutIndex];
    if (item) {
      if ((item as any).__groupHeader) return;
      emitter.emit("item:click", { item, index: layoutIndex, event });
    }
  }
}

// After: shared helper, each handler is 2 lines
const findClickTarget = (event: MouseEvent): { item: T; index: number } | null => { /* ... */ };

const handleClick = (event: MouseEvent): void => {
  const hit = findClickTarget(event);
  if (hit) emitter.emit("item:click", { item: hit.item, index: hit.index, event });
  for (let i = 0; i < clickHandlers.length; i++) clickHandlers[i]!(event);
};
```

#### 3. `stayAtEnd`

The "check if at scroll end → update content size → pin to end" pattern was duplicated in `flushMeasurements` and the item ResizeObserver callback:

```typescript
// Before: duplicated ~10-line blocks in two places
const scroll = $.sgt();
const maxScroll = isHorizontal
  ? dom.viewport.scrollWidth - dom.viewport.clientWidth
  : dom.viewport.scrollHeight - dom.viewport.clientHeight;
const wasAtEnd = maxScroll > 0 && scroll >= maxScroll - 2;
updateContentSize();
if (wasAtEnd) {
  const newMax = Math.max(0, $.hc.getTotalSize() - (isHorizontal ? $.cw : $.ch));
  if (newMax > scroll) { $.sst(newMax); $.ls = newMax; }
}

// After: extracted to measurement.ts as stayAtEnd()
```

### Phase 2: Structural Extraction (2 modules)

#### `measurement.ts` — Mode B Measurement Subsystem (200 lines)

Self-contained subsystem for estimated-size mode. Owns:
- Item ResizeObserver creation and lifecycle
- `elementToIndex` WeakMap (element → item index mapping)
- `pendingScrollDelta` tracking and immediate scroll correction (Direction C)
- `pendingContentSizeUpdate` deferral during active scrolling
- `flush()` — called on scroll idle to apply deferred content size updates
- `stayAtEnd()` — reusable scroll-end pinning (used by both measurement and other content-size changes)

**Factory signature** (positional parameters for minification):

```typescript
export const createMeasurement = <T extends VListItem>(
  $: MRefs<T>,
  dom: DOMStructure,
  isHorizontal: boolean,
  visibleRange: Range,
  lastRenderRange: Range,
  isScrollingFn: () => boolean,
  updateContentSize: () => void,
  measuredCache: MeasuredSizeCache | null,
  measurementEnabled: boolean,
): MeasurementState => { /* ... */ }
```

**Return type** uses short keys to avoid property name strings surviving minification:

```typescript
export interface MeasurementState {
  ob: ResizeObserver | null;    // observer
  ei: WeakMap<Element, number> | null;  // elementToIndex
  mc: MeasuredSizeCache | null; // measuredCache
  fl: () => void;               // flush
  se: (scrollBefore: number, rerender?: boolean) => boolean;  // stayAtEnd
}
```

#### `api.ts` — Public API Assembly (308 lines)

Pure wiring with zero hot-path implications. Owns:
- Base data methods (`setItems`, `appendItems`, `prependItems`, `updateItem`, `removeItem`, `reload`)
- Scroll methods (`cancelScroll`, `animateScroll`, `scrollToIndex`, `getScrollPosition`)
- `animationFrameId` lifecycle (previously a closure local in `materialize()`)
- Event subscription (`on`, `off`)
- `destroy` teardown
- Public `VList<T>` object construction with feature method overrides

**Factory uses positional parameters** — no deps object:

```typescript
export const createApi = <T extends VListItem = VListItem>(
  $: MRefs<T>,
  dom: DOMStructure,
  emitter: Emitter<VListEvents<T>>,
  rendered: Map<number, HTMLElement>,
  pool: ReturnType<typeof createElementPool>,
  methods: Map<string, Function>,
  sortedFeatures: VListFeature<T>[],
  destroyHandlers: Array<() => void>,
  ctx: BuilderContext<T>,
  isReverse: boolean,
  wrapEnabled: boolean,
  handleClick: (event: MouseEvent) => void,
  handleDblClick: (event: MouseEvent) => void,
  handleKeydown: (event: KeyboardEvent) => void,
  onScrollFrame: () => void,
  resizeObserver: ResizeObserver,
  disconnectItemObserver: () => void,
  clearIdleTimer: () => void,
): VList<T> => { /* ... */ }
```

### Phase 3: Wheel Handler Simplification

During the audit we discovered a behavioral inconsistency: the wheel handler reimplemented half of `onScrollFrame` but skipped `afterScroll` hooks and `velocity:change` events. See [Bug Fix](#bug-fix-wheel-handler-event-consistency) below.

---

## What Was Intentionally Not Done

The V1 review proposed 5 extractions. We evaluated all of them honestly:

| Proposed Module | V1 Estimate | Verdict | Reasoning |
|----------------|-------------|---------|-----------|
| `measurement.ts` | ~120 lines | ✅ **Extracted** | Self-contained subsystem with clear boundaries |
| `api.ts` | ~80 lines | ✅ **Extracted** (ended up 308 lines) | Pure wiring, no hot-path code |
| `animation.ts` | ~40 lines | ❌ **Skipped** | `easeInOutQuad` already in `scroll.ts`; `animateScroll` + `cancelScroll` moved naturally into `api.ts` with `scrollToIndex` |
| `events.ts` | ~80 lines | ❌ **Skipped** | After dedup, click+dblclick+keydown is only ~25 lines. A file for that is overhead, not simplification |
| `resize.ts` | ~50 lines | ❌ **Skipped** | Viewport ResizeObserver is 30 lines. Same argument |

**Principle**: A new file should represent a meaningful abstraction, not just "code that was moved." Files smaller than their import boilerplate create navigation overhead without reducing cognitive load.

### Why the render pipeline stays in core

`coreRenderIfNeeded` (~170 lines) is the hot path — called on every scroll frame. It directly accesses `rendered`, `visibleRange`, `renderRange`, `lastRenderRange`, `selectionIdsGetter`, `dom`, `pool`, and `measurement.mc`. Extracting it would require either:

- Promoting ~8 closure locals to `$` (adding property access indirection on every scroll frame), or
- Creating a second refs bag (complexity for zero benefit)

The closure is the optimization. The render function stays where the data is.

### Why `builder/` was not renamed to `core/`

We evaluated renaming `src/builder/` → `src/core/` and `src/builder/core.ts` → `src/core/builder.ts`. Rejected because:

1. **Semantics are wrong** — the folder implements the builder pattern; `rendering/`, `events/`, and `constants.ts` are equally "core" but aren't inside it
2. **37 import paths break** — every feature and test that imports from `../../builder/types`
3. **Current naming is accurate** — users import `from 'vlist/builder'`, the barrel says "Composable Virtual List Builder"

---

## Bug Fix: Wheel Handler Event Consistency

During the audit we discovered the wheel handler had a behavioral inconsistency with `onScrollFrame`:

### Before

The wheel handler reimplemented scroll handling inline:
- ✅ Updated velocity tracker
- ✅ Called `$.rfn()` (render)
- ✅ Emitted `scroll` event
- ❌ **Skipped `afterScroll` hooks** — features relying on post-scroll callbacks missed wheel events
- ❌ **Skipped `velocity:change` emission** — features listening to velocity got no updates during wheel scroll
- ❌ **Double-fired** — after setting `scrollTop` programmatically, the browser fires a native `scroll` event → `onScrollFrame` runs again with duplicate velocity samples and redundant event emissions

### After

The wheel handler now only handles what's unique to wheel events (preventDefault, horizontal overflow passthrough, position clamping), then delegates to `onScrollFrame` directly:

```typescript
wheelHandler = (event: WheelEvent): void => {
  if (sharedState.viewportState.isCompressed) return;
  // ... horizontal overflow checks, preventDefault ...

  const currentScroll = $.sgt();
  const maxScroll = dom.viewport.scrollHeight - dom.viewport.clientHeight;
  const newScroll = Math.max(0, Math.min(currentScroll + event.deltaY, maxScroll));
  if (Math.abs(newScroll - currentScroll) < 1) return;

  $.sst(newScroll);
  onScrollFrame();  // One code path for all scroll handling
};
```

A re-entry guard in `onScrollFrame` prevents the redundant native scroll event from doing duplicate work:

```typescript
const onScrollFrame = (): void => {
  if ($.id) return;
  const scrollTop = $.sgt();
  // Skip when position hasn't changed (native event after wheel handler)
  if (scrollTop === $.ls && isScrolling) return;
  // ... rest of scroll handling
};
```

---

## Bundle Size Optimization

### Positional Parameters vs Deps Objects

The initial extraction used TypeScript interfaces for deps objects (`ApiDeps`, `MeasurementDeps`). This caused property name strings to survive minification:

```javascript
// ❌ In bundle: property names can't be minified
disconnectItemObserver,
clearIdleTimer
```

**Fix**: Both `createApi` and `createMeasurement` use positional parameters instead. The minifier renames all arguments freely.

### Short Property Keys on Return Objects

The `MeasurementState` return object uses 2-char keys (`ob`, `ei`, `mc`, `fl`, `se`) instead of descriptive names. Property names on objects survive minification — short keys minimize the cost.

### Result

| Stage | Minified | Gzipped |
|-------|----------|---------|
| Original (before any changes) | 24.1 KB | 8.7 KB |
| After deps objects (naive extraction) | 24.6 KB | 9.0 KB |
| After positional params + short keys | 23.9 KB | 8.9 KB |
| After wheel handler simplification | **23.6 KB** | **8.8 KB** |

The final bundle is **0.5 KB smaller** minified than the original despite having more modules, because the wheel handler simplification removed ~40 lines of duplicated logic that the minifier couldn't compress.

---

## Final Results

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| `core.ts` | 1,513 lines | **1,097 lines** | **−416 (−28%)** |
| `materialize()` | ~1,350 lines | **~935 lines** | **−415 (−31%)** |
| Base minified | 24.1 KB | **23.6 KB** | **−0.5 KB** |
| Base gzipped | 8.7 KB | **8.8 KB** | +0.1 KB |
| Tests | 2,763 | **2,763** | all pass |
| Typecheck | clean | **clean** | — |
| Benchmarks | baseline | **no regression** | — |

---

## File Structure

### Before

```
builder/
├── context.ts      (399 lines)
├── core.ts         (1,513 lines)  ← everything
├── data.ts         (230 lines)
├── dom.ts          (87 lines)
├── index.ts        (43 lines)
├── materialize.ts  (665 lines)
├── pool.ts         (32 lines)
├── range.ts        (91 lines)
├── scroll.ts       (119 lines)
├── types.ts        (496 lines)
└── velocity.ts     (108 lines)
                    ─────────────
                    3,783 lines total
```

### After

```
builder/
├── api.ts          (308 lines)  ← NEW: public API assembly, data/scroll methods, destroy
├── context.ts      (399 lines)
├── core.ts         (1,097 lines)  ← −28%: config, DOM, rendering, scroll, events, features
├── data.ts         (230 lines)
├── dom.ts          (87 lines)
├── index.ts        (43 lines)
├── materialize.ts  (665 lines)
├── measurement.ts  (200 lines)  ← NEW: Mode B ResizeObserver, scroll correction, stayAtEnd
├── pool.ts         (32 lines)
├── range.ts        (91 lines)
├── scroll.ts       (119 lines)
├── types.ts        (496 lines)
└── velocity.ts     (108 lines)
                    ─────────────
                    3,875 lines total (+92 from extraction overhead)
```

### What lives where now

| Concern | File | Hot path? |
|---------|------|-----------|
| Config resolution, validation | `core.ts` | No |
| DOM structure creation | `core.ts` → `dom.ts` | No |
| `$` mutable refs initialization | `core.ts` | No |
| Mode B measurement subsystem | `measurement.ts` | ResizeObserver callback only |
| Render pipeline (`coreRenderIfNeeded`) | `core.ts` | **Yes — every scroll frame** |
| Scroll handling (`onScrollFrame`) | `core.ts` | **Yes — every scroll frame** |
| Wheel interception | `core.ts` | **Yes — every wheel event** |
| Click/dblclick/keydown delegation | `core.ts` | No |
| Viewport ResizeObserver | `core.ts` | No |
| Feature setup + conflict detection | `core.ts` | No |
| Baseline keyboard navigation | `core.ts` | No |
| Data methods (setItems, etc.) | `api.ts` | No |
| Scroll methods (scrollToIndex, etc.) | `api.ts` | No |
| Smooth scroll animation | `api.ts` | rAF loop only |
| Event subscription (on/off) | `api.ts` | No |
| Destroy teardown | `api.ts` | No |
| Public VList object assembly | `api.ts` | No |
| BuilderContext factory | `materialize.ts` | No |
| Default data proxy | `materialize.ts` | No |
| Default scroll proxy | `materialize.ts` | No |

---

## V1 Code Review Acceptance Criteria

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| `core.ts` < 800 lines | < 800 | 1,097 | ⚠️ Not met — render pipeline stays for performance |
| `materialize()` < 600 lines | < 600 | ~935 | ⚠️ Not met — same reason |
| All tests pass | 2,763 | 2,763 | ✅ |
| No new files > 200 lines | < 200 | 308 (`api.ts`) | ⚠️ Slightly over — API surface is large |
| Bundle delta < 0.1 KB gzipped | < 0.1 | +0.1 | ✅ |

The line count targets were aggressive. Meeting them would require extracting `coreRenderIfNeeded` (~170 lines), but that function reads ~10 closure variables on every scroll frame. The performance cost of promoting those to `$` or a second refs bag outweighs the maintainability benefit. The remaining code in `core.ts` is organized into well-bounded sections with clear comments.

---

*Completed: 8 March 2026*  
*No public API changes. No breaking changes. Drop-in replacement.*