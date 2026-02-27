# vlist v1.0 — Code Review & Enhancement Plan

> Comprehensive analysis of the vlist codebase at v1.0.1, identifying areas for improvement across architecture, correctness, documentation, developer experience, and competitive positioning.

*Review date: February 27, 2026*
*Reviewed version: @floor/vlist 1.0.1 (303 commits, 25 days)*
*Reviewer context: 10+ years TypeScript, extensive virtual scrolling experience*

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Current Health Snapshot](#current-health-snapshot)
- [Enhancement Areas](#enhancement-areas)
  - [1. Core Architecture — `core.ts` Decomposition](#1-core-architecture--corets-decomposition)
  - [2. Public API Surface — `VList` vs `BuiltVList` Alignment](#2-public-api-surface--vlist-vs-builtvlist-alignment)
  - [3. Bundle Size Claims — Verification & Transparency](#3-bundle-size-claims--verification--transparency)
  - [4. Mobile Detection — Replace UA Sniffing](#4-mobile-detection--replace-ua-sniffing)
  - [5. CONTRIBUTING.md — Stale Documentation](#5-contributingmd--stale-documentation)
  - [6. CI/CD Pipeline — Automated Quality Gates](#6-cicd-pipeline--automated-quality-gates)
  - [7. Error Handling & Developer Diagnostics](#7-error-handling--developer-diagnostics)
  - [8. CSS Architecture — Custom Property Defaults](#8-css-architecture--custom-property-defaults)
  - [9. Memory Safety — Leak Prevention Audit](#9-memory-safety--leak-prevention-audit)
  - [10. Rendering Pipeline — Edge Case Hardening](#10-rendering-pipeline--edge-case-hardening)
  - [11. Tree-Shaking Validation Infrastructure](#11-tree-shaking-validation-infrastructure)
  - [12. Feature Composition — Conflict Matrix Documentation](#12-feature-composition--conflict-matrix-documentation)
  - [13. Accessibility — ARIA Compliance Gaps](#13-accessibility--aria-compliance-gaps)
  - [14. Test Infrastructure Improvements](#14-test-infrastructure-improvements)
- [Priority Matrix](#priority-matrix)
- [Implementation Roadmap](#implementation-roadmap)
- [Appendix: File-Level Notes](#appendix-file-level-notes)

---

## Executive Summary

vlist v1.0.1 is in **excellent shape** — zero test failures across 2,268 tests, clean typecheck, zero runtime dependencies, and a well-designed builder/feature architecture. The items below are not defects; they are opportunities to move from **very good** to **best-in-class** in terms of maintainability, developer experience, and competitive confidence.

**14 enhancement areas identified (1 completed):**
- 🔴 **3 high priority** — risk or correctness impact (1 ✅ done)
- 🟡 **6 medium priority** — DX, trust, or maintainability
- 🟢 **5 lower priority** — polish and future-proofing

---

## Current Health Snapshot

| Metric | Value | Grade |
|--------|-------|-------|
| Source code | 16,574 lines / 50 files | — |
| Tests | 2,268 passing / 36,595 assertions | ✅ A+ |
| Type safety | Strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | ✅ A+ |
| Build | 24ms, clean | ✅ A+ |
| Typecheck | 0 errors | ✅ A+ |
| Dependencies | 0 runtime | ✅ A+ |
| Bundle | 81.9 KB min / 27.0 KB gzip (full) | ✅ Good |
| Architecture | Builder + features, zero circular deps | ✅ A+ |
| Test/source ratio | 2.7:1 by line count | ✅ Excellent |

---

## Enhancement Areas

---

### 1. Core Architecture — `core.ts` Decomposition

**Priority:** 🟡 Medium
**Impact:** Maintainability, onboarding, feature development velocity
**Effort:** Large (multi-session refactor)

#### Problem

`builder/core.ts` is 1,349 lines — the single largest file and the critical path. The `materialize()` function is a ~1,180-line closure responsible for:

- DOM creation + orientation-specific sizing
- The entire render loop (measurement, compression, selection, placeholders)
- Scroll handling (wheel interception, native scroll, idle detection)
- Click/dblclick event delegation
- ResizeObserver management (both viewport and item measurement)
- Smooth scroll animation (easeInOutQuad)
- All data operations (setItems, appendItems, prependItems, updateItem, removeItem)
- Public API object construction with getter proxies

The `materialize.ts` extraction (662 lines) was a good first step, but the concern density in `core.ts` remains high.

#### Risk

- New contributors face a significant cognitive barrier
- Any change to the render loop risks side effects in scroll handling, and vice versa
- Feature developers must understand the entire closure to know what `$` refs they can safely touch

#### Proposed Decomposition

Extract these self-contained concerns into sibling modules under `builder/`:

| New Module | Lines (approx) | Responsibility |
|-----------|----------------|----------------|
| `builder/measurement.ts` | ~120 | Item ResizeObserver creation, `flushMeasurements()`, `pendingScrollDelta` tracking, measured cache coordination |
| `builder/animation.ts` | ~40 | `easeInOutQuad`, `animateScroll()`, `cancelScroll()` |
| `builder/events.ts` | ~80 | `handleClick`, `handleDblClick`, `handleKeydown` delegation |
| `builder/resize.ts` | ~50 | Viewport `ResizeObserver` creation and size tracking |
| `builder/api.ts` | ~80 | Public API object construction (`api` const at L1277-1326) |

Each module would receive the `$` refs object and the `BuilderContext` dependencies as parameters, preserving the existing pattern.

#### Acceptance Criteria

- [ ] `core.ts` < 800 lines after extraction
- [ ] `materialize()` function < 600 lines
- [ ] All 2,268 tests still pass with zero changes
- [ ] No new files larger than 200 lines
- [ ] Bundle size delta < 0.1 KB gzipped (no runtime overhead)

#### Implementation Notes

The `$` refs pattern already makes this straightforward — extracted functions take `$: MRefs<T>` as their first parameter and close over the same mutable state. The key is ensuring the extraction is purely structural (moving code, not changing logic).

```
// Example: builder/measurement.ts
export const createItemMeasurement = <T extends VListItem>(
  $: MRefs<T>,
  measuredCache: MeasuredSizeCache | null,
  measuredElementToIndex: WeakMap<Element, number> | null,
  isHorizontal: boolean,
  visibleRange: Range,
  isScrolling: () => boolean,
  updateContentSize: () => void,
): { observer: ResizeObserver | null; flush: () => void } => {
  // ... extracted from core.ts L383-510
}
```

---

### 2. ~~Public API Surface — `VList` vs `BuiltVList` Alignment~~ ✅ COMPLETED

**Priority:** 🔴 High
**Impact:** Developer trust, TypeScript DX, documentation accuracy
**Effort:** Small
**Status:** ✅ Completed — February 27, 2026

#### What was done

`BuiltVList` was renamed to `VList` across the entire codebase. The legacy `VList` interface (and 5 other dead types) were removed from `types.ts`. Clean break — no deprecated alias.

**Changes:**
- `src/builder/types.ts` — renamed `BuiltVList` → `VList` with updated JSDoc
- `src/builder/core.ts` — updated import + 3 type annotations
- `src/builder/index.ts` — exports `VList`, removed `BuiltVList`
- `src/index.ts` — exports `VList` from builder, removed legacy `VList`+`VListConfig` from types
- `src/types.ts` — removed 6 dead interfaces: `VList`, `VListConfig`, `VListUpdateConfig`, `LoadingConfig`, `InternalState`, `RenderedItem` (~325 lines deleted)
- 7 test files — mechanical `BuiltVList` → `VList` rename
- 4 framework adapters (React, Vue, Svelte, SolidJS) — `BuiltVList` → `VList`

**Verification:** 0 typecheck errors, 2,268 tests passing, 81.9 KB / 27.0 KB gzip (unchanged).

#### Acceptance Criteria

- [x] Exactly one interface describes the return type of `.build()`
- [x] No public type includes methods that don't exist on the runtime object
- [x] All feature-added methods are properly typed as optional (they depend on `.use()` calls)
- [x] README code examples typecheck against the actual return type

---

### 3. Bundle Size Claims — Verification & Transparency

**Priority:** 🟡 Medium
**Impact:** Marketing credibility, competitive positioning
**Effort:** Medium

#### Problem

The README claims:

> **8–12 KB gzipped** — pay only for features you use

And per-feature sizes:

| Feature | Claimed Size |
|---------|-------------|
| Base | 7.7 KB |
| + Grid | +4.0 KB |
| + Sections | +4.6 KB |
| + Async | +5.3 KB |

But the actual full bundle is **27.0 KB gzipped**. The claims are about tree-shaken imports, which are theoretical — they depend entirely on the consumer's bundler.

This isn't dishonest (it's how every library reports size), but the numbers are **unverified**. There's no automated process to measure them, so they may have drifted from reality as code was added.

#### Proposed Fix

1. **Create a `benchmarks/size/` directory** with minimal entry points:

```
benchmarks/size/
├── base-only.ts          # import { vlist } from '@floor/vlist'
├── with-grid.ts          # + withGrid
├── with-sections.ts      # + withSections
├── with-async.ts         # + withAsync
├── with-selection.ts     # + withSelection
├── with-scale.ts         # + withScale
├── with-all.ts           # Everything
└── measure.ts            # Script: build each, gzip, report
```

2. **Add `bun run size` script** that builds each entry, gzips, and outputs a table
3. **Run in CI** and fail if any delta exceeds ±0.5 KB from documented values
4. **Update README** with measured values and a "last verified" date

#### Acceptance Criteria

- [ ] Automated size measurement script exists
- [ ] Each feature combination has a measured gzipped size
- [ ] README sizes match measured values (within 0.2 KB)
- [ ] CI checks size regression on every push

---

### 4. Mobile Detection — Replace UA Sniffing

**Priority:** 🔴 High
**Impact:** Correctness on hybrid devices, future-proofing
**Effort:** Small

#### Problem

```typescript
// builder/core.ts L196-200
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  ) ||
  (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
```

This regex-based UA detection is fragile:

- **False negatives:** Samsung Galaxy Fold in desktop mode, Chrome OS tablets, Windows touch laptops
- **False positives:** Chrome DevTools device emulation, bots with mobile UA strings
- **Maintenance burden:** New device classes (foldables, car displays) require regex updates
- **Deprecated:** `navigator.userAgent` is being frozen/reduced by browsers (Client Hints initiative)

The `isMobile` flag is used to decide whether to preserve native touch scrolling (skip wheel handler). Getting this wrong either breaks touch scrolling on real mobile devices or adds unnecessary wheel interception on desktop touch devices.

#### Proposed Fix

Replace with capability detection:

```typescript
// Option A: Pointer media query (best)
const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
const isTouchPrimary = hasCoarsePointer;

// Option B: Touch event support (fallback)
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// Option C: Combined (most robust)
const isMobile =
  window.matchMedia('(pointer: coarse)').matches ||
  (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);
```

**Why `pointer: coarse`?**
- Detects the actual input method, not the device brand
- Works on foldables, tablets, touch laptops
- No maintenance as new devices ship
- Standards-based, supported in all modern browsers

#### Acceptance Criteria

- [ ] No `navigator.userAgent` regex in source code
- [ ] Touch scrolling works on iOS Safari, Android Chrome
- [ ] Wheel handler works on desktop Chrome, Firefox, Safari
- [ ] No false mobile detection in Chrome DevTools emulation
- [ ] Handles pointer changes (e.g., disconnecting a mouse from a tablet)

#### Migration Risk

Low — the `isMobile` flag is used in exactly one place (wheel handler gate). The behavioral change is: some edge-case devices that were incorrectly classified will now work correctly.

---

### 5. CONTRIBUTING.md — Stale Documentation

**Priority:** 🔴 High
**Impact:** Contributor onboarding, project credibility
**Effort:** Small

#### Problem

CONTRIBUTING.md references an architecture that no longer exists:

| Reference in CONTRIBUTING.md | Current Reality |
|----|-----|
| `src/plugins/` | Renamed to `src/features/` |
| `src/core.ts` | Removed (builder-only API) |
| `src/vlist.ts` | Removed |
| `src/render/` | Renamed to `src/rendering/` |
| `render/heights.ts` | Renamed to `rendering/sizes.ts` |
| `render/compression.ts` | Renamed to `rendering/scale.ts` |
| `render/virtual.ts` | Renamed to `rendering/viewport.ts` |
| `VListPlugin` interface | Renamed to `VListFeature` |
| "Plugin" terminology throughout | Now "Feature" everywhere |
| Project structure tree | Doesn't match actual file layout |

#### Proposed Fix

Complete rewrite of CONTRIBUTING.md to reflect the v1.0 architecture:

- Update project structure tree to match `src/` exactly
- Replace all "plugin" references with "feature"
- Update file path references
- Add the builder/feature pattern explanation
- Reference `materialize.ts` and the `$` refs pattern
- Update the "Adding a New Feature" section with current conventions
- Add note about the `MRefs` pattern for feature authors

#### Acceptance Criteria

- [ ] Every file path in CONTRIBUTING.md exists on disk
- [ ] Every interface name matches the current codebase
- [ ] Project structure tree matches `find src -type f` output
- [ ] A new contributor can follow "Adding a New Feature" and succeed

---

### 6. CI/CD Pipeline — Automated Quality Gates

**Priority:** 🟡 Medium
**Impact:** Regression prevention, contributor confidence, badge credibility
**Effort:** Small

#### Problem

With 2,268 tests, there is no automated CI to run them on push. The README badge shows a static test count, not a live status. Any contributor (or even the authors) can accidentally push a regression that breaks tests, and nobody will know until someone manually runs `bun test`.

#### Proposed Fix

Add `.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run typecheck
      - run: bun test
      - run: bun run build
      # Optional: size check
      - run: bun run size --ci
```

Additionally:

- Replace the static test badge with a live GitHub Actions badge
- Add a bundle size badge (from the size check step)
- Consider adding a coverage report step

#### Acceptance Criteria

- [ ] CI runs on every push to main and on every PR
- [ ] CI fails if: tests fail, typecheck fails, or build fails
- [ ] README badges reflect live CI status
- [ ] CI time < 60 seconds (Bun is fast)

---

### 7. Error Handling & Developer Diagnostics

**Priority:** 🟢 Lower
**Impact:** Developer experience when things go wrong
**Effort:** Medium

#### Problem

The library validates inputs at construction time (container required, item config required, size config required), which is good. However, runtime errors during usage lack context:

1. **`setItems()` with wrong shape** — no validation, silently renders garbage
2. **Template function throws** — caught by emitter's `try/catch`, logged to console, but the item slot goes blank with no recovery
3. **`scrollToIndex()` with out-of-range index** — silently clamped, no warning in dev mode
4. **Feature conflicts at runtime** — detected at build time, but if someone dynamically adds features after `.build()`, there's no guard
5. **Missing adapter response fields** — `withAsync` doesn't validate adapter responses

#### Proposed Fix

Add a development-mode diagnostics layer:

```typescript
// Constants
const __DEV__ = process.env.NODE_ENV !== 'production';

// Usage in setItems
const setItems = (items: T[]) => {
  if (__DEV__) {
    if (!Array.isArray(items)) {
      console.warn('[vlist] setItems() expects an array, got:', typeof items);
      return;
    }
    if (items.length > 0 && items[0] && !('id' in items[0])) {
      console.warn('[vlist] Items must have an "id" property. First item:', items[0]);
    }
  }
  // ... existing logic
};
```

The `__DEV__` guard ensures these checks are tree-shaken in production builds.

#### Acceptance Criteria

- [ ] All public methods validate inputs in dev mode
- [ ] Warning messages include `[vlist]` prefix and actionable guidance
- [ ] All warnings are eliminated in production builds (zero overhead)
- [ ] Template errors provide the item index and item data in the error message

---

### 8. CSS Architecture — Custom Property Defaults

**Priority:** 🟢 Lower
**Impact:** Styling DX, out-of-box experience
**Effort:** Small

#### Problem

CSS custom properties are defined under `[data-theme-mode="light"]` and `[data-theme-mode="dark"]` selectors. If consumers don't add `data-theme-mode` to their DOM, **no design tokens are applied** and the list renders with browser defaults (no background, no borders, no spacing).

```css
/* vlist.css L38 — only applies if data-theme-mode="light" is set */
[data-theme-mode="light"] {
    --vlist-bg: #ffffff;
    /* ... */
}
```

Most consumers will import the CSS and expect it to work immediately.

#### Proposed Fix

Add `:root` defaults that work without any attribute:

```css
/* Default tokens (works without data-theme-mode) */
:root {
    --vlist-bg: #ffffff;
    --vlist-bg-hover: #f9fafb;
    --vlist-border: #e5e7eb;
    --vlist-text: #111827;
    /* ... all light mode values as defaults ... */
}

/* Light mode override (explicit) */
[data-theme-mode="light"] {
    /* Same values — exists for explicitness */
}

/* Dark mode override */
[data-theme-mode="dark"] {
    --vlist-bg: #111827;
    /* ... */
}

/* Auto dark mode (respects system preference) */
@media (prefers-color-scheme: dark) {
    :root:not([data-theme-mode]) {
        --vlist-bg: #111827;
        /* ... dark values ... */
    }
}
```

This gives three behaviors:
1. **No attribute** → light mode defaults, auto-dark via `prefers-color-scheme`
2. **`data-theme-mode="light"`** → forced light mode
3. **`data-theme-mode="dark"`** → forced dark mode

#### Acceptance Criteria

- [ ] List renders correctly with zero configuration (no `data-theme-mode` attribute needed)
- [ ] System dark mode preference is respected when no explicit theme is set
- [ ] Explicit `data-theme-mode` overrides system preference
- [ ] Existing users who set `data-theme-mode` see no visual change

---

### 9. Memory Safety — Leak Prevention Audit

**Priority:** 🟡 Medium
**Impact:** Long-running applications, SPA navigation
**Effort:** Medium

#### Problem

The library creates several long-lived references that must be cleaned up on `destroy()`:

| Resource | Created In | Cleaned Up? |
|---------|-----------|-------------|
| `ResizeObserver` (viewport) | `core.ts` L986 | ✅ Yes (destroy handlers) |
| `ResizeObserver` (item measurement) | `core.ts` L383` | ⚠️ Needs verification |
| `setTimeout` (idle timer) | `core.ts` L844 | ⚠️ `clearTimeout` in destroy? |
| `requestAnimationFrame` | `core.ts` L343 | ⚠️ `cancelAnimationFrame` in destroy? |
| Scroll event listener | `core.ts` (via scroll target) | ✅ Yes |
| Wheel event listener | `core.ts` L859 | ⚠️ Needs verification |
| Click/dblclick listeners | `core.ts` L932, L955 | ✅ Yes |
| Keydown listener | `core.ts` L974 | ✅ Yes |
| Feature destroy handlers | Various | ✅ Via `destroyHandlers` array |
| Element pool references | `pool.ts` | ⚠️ `pool.clear()` called? |
| `rendered` Map | `core.ts` L371 | ⚠️ Cleared on destroy? |
| `WeakMap` (measured elements) | `core.ts` L375 | ✅ WeakMap auto-GCs |
| Emitter listeners | `emitter.ts` | ⚠️ `emitter.clear()` called? |

#### Proposed Fix

1. **Audit `destroy()` function** (L1236-1273) against every resource allocation
2. **Add cleanup for any missing resources:**
   - `clearTimeout(idleTimer)` if pending
   - `cancelAnimationFrame(animationFrameId)` if pending
   - `itemResizeObserver?.disconnect()`
   - `pool.clear()`
   - `rendered.clear()`
   - `emitter.clear()`
3. **Add a memory leak integration test:**

```typescript
it('should not leak after destroy', () => {
  const list = vlist({ ... }).build();
  // Interact with list
  list.destroy();
  // Verify: no lingering timers, observers, or listeners
  // Verify: DOM elements removed
  // Verify: rendered map empty
});
```

#### Acceptance Criteria

- [ ] Every `addEventListener` has a corresponding `removeEventListener` in destroy
- [ ] Every `setTimeout` / `setInterval` has a `clearTimeout` / `clearInterval` in destroy
- [ ] Every `requestAnimationFrame` has a `cancelAnimationFrame` in destroy
- [ ] Every `ResizeObserver` has a `.disconnect()` in destroy
- [ ] Element pool is cleared on destroy
- [ ] Emitter listeners are cleared on destroy
- [ ] Integration test verifies no leaks after create/destroy cycle

---

### 10. Rendering Pipeline — Edge Case Hardening

**Priority:** 🟢 Lower
**Impact:** Robustness under unusual conditions
**Effort:** Medium

#### Problem

The render loop handles the normal case well but some edge cases deserve attention:

#### 10a. Rapid `setItems()` During Scroll

If `setItems()` is called while a scroll animation is in progress, the animation continues targeting the old item count. The `cancelScroll()` isn't called automatically.

**Fix:** `setItems()` should call `cancelScroll()` before updating data.

#### 10b. Zero-Height Container

If the container has `height: 0` (e.g., in a collapsed accordion), `containerSize` is 0, which makes `calcVisibleRange` return `{ start: 0, end: 0 }`. When the container expands later, the ResizeObserver fires and triggers a render — but the first render might flash with stale positions.

**Fix:** Skip initial render when containerSize is 0; render on first resize instead.

#### 10c. Template Returning Empty String

If the template function returns `""`, `innerHTML` clears the element but the element still occupies space with its height. The element renders as a blank row.

**Fix:** In development mode, warn when template returns falsy.

#### 10d. Items with Duplicate IDs

If two items share the same `id`, the rendered Map (keyed by index) works correctly, but `updateItem(id, updates)` and `removeItem(id)` (which search by ID) will only find the first match.

**Fix:** In development mode, warn about duplicate IDs in `setItems()`.

#### Acceptance Criteria

- [ ] `setItems()` cancels in-progress smooth scroll
- [ ] Zero-height container doesn't cause visual flash on expand
- [ ] Dev-mode warning for empty template return
- [ ] Dev-mode warning for duplicate item IDs

---

### 11. Tree-Shaking Validation Infrastructure

**Priority:** 🟡 Medium
**Impact:** Bundle size accuracy, marketing credibility
**Effort:** Medium

#### Problem

The feature architecture is designed for tree-shaking, but there's no automated verification that unused features are actually eliminated by consumer bundlers. If an internal import accidentally pulls in a feature's code, the tree-shaking promise breaks silently.

#### Proposed Fix

Create a `scripts/verify-treeshake.ts` script:

```typescript
// For each feature combination, build a minimal consumer app,
// verify the output doesn't contain code from unused features.

const scenarios = [
  {
    name: 'base-only',
    imports: `import { vlist } from '@floor/vlist'`,
    mustNotContain: ['withGrid', 'withMasonry', 'withSections', 'withAsync',
                     'withSelection', 'withScale', 'withScrollbar', 'withPage'],
  },
  {
    name: 'grid-only',
    imports: `import { vlist, withGrid } from '@floor/vlist'`,
    mustNotContain: ['withMasonry', 'withSections', 'withAsync', 'withSelection'],
  },
  // ... more scenarios
];
```

For each scenario:
1. Write a temp file with the imports + minimal usage
2. Build with `Bun.build` (and optionally esbuild/rollup for cross-bundler validation)
3. Read the output and search for `mustNotContain` strings
4. Report pass/fail and output size

#### Acceptance Criteria

- [ ] Script verifies tree-shaking for at least 6 feature combinations
- [ ] Script runs in < 5 seconds
- [ ] Integrated into CI
- [ ] Catches regressions where internal imports accidentally pull in unused features

---

### 12. Feature Composition — Conflict Matrix Documentation

**Priority:** 🟢 Lower
**Impact:** Developer experience, preventing invalid configurations
**Effort:** Small

#### Problem

Features declare conflicts in code (`conflicts?: readonly string[]`), but there's no user-facing documentation of which combinations are valid. A developer has to try a combination and read the error message to discover it's invalid.

Known conflicts and constraints:
- `withGrid` + `reverse: true` → error
- `withMasonry` + `withGrid` → conflict (both position items in 2D)
- `withMasonry` + `withSections` → likely conflict (untested?)
- `withPage` + `withScrollbar` → redundant? conflicting?
- `withScale` + `withMasonry` → unknown

#### Proposed Fix

1. **Create a compatibility matrix** in the docs:

| | Grid | Masonry | Sections | Async | Selection | Scale | Scrollbar | Page | Snapshots |
|---|---|---|---|---|---|---|---|---|---|
| **Grid** | — | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Masonry** | ❌ | — | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Sections** | ✅ | ❌ | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Async** | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Selection** | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| **Scale** | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| **Scrollbar** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ❌ | ✅ |
| **Page** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | — | ✅ |
| **Snapshots** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |

*(Values above are illustrative — need verification against actual `conflicts` declarations)*

2. **Add runtime conflict detection** for combinations not explicitly declared but known to be problematic
3. **Document orientation constraints** (which features support horizontal mode)

#### Acceptance Criteria

- [ ] Compatibility matrix published in docs
- [ ] Every `conflicts` declaration in code is reflected in the matrix
- [ ] Orientation support documented per feature
- [ ] Matrix verified by integration tests

---

### 13. Accessibility — ARIA Compliance Gaps

**Priority:** 🟡 Medium
**Impact:** WCAG compliance, screen reader UX
**Effort:** Medium

#### Problem

The library has solid ARIA foundations (`role="option"`, `aria-selected`, `aria-setsize`, `aria-posinset`, `aria-activedescendant`), but some gaps remain:

#### 13a. Missing `role="listbox"` Validation

The root element gets `role="listbox"` only if `ariaLabel` is provided. Without it, the root has no ARIA role, making the list invisible to screen readers.

**Fix:** Always set `role="listbox"` on the root element, regardless of `ariaLabel`.

#### 13b. Virtual Items Not Announced

When the visible range changes during scrolling, screen readers don't know new items are available. There's no `aria-live` region announcing range changes.

**Fix:** Add a visually-hidden live region that announces "Showing items X to Y of Z" on range change (debounced).

#### 13c. Grid Mode ARIA

In grid mode, items should use `role="gridcell"` within `role="row"` containers, not `role="option"` within `role="listbox"`. The current implementation uses list semantics even in grid layout.

**Fix:** When `withGrid` is active, use `role="grid"` on root, and wrap each row in a `role="row"` container.

#### 13d. Focus Management on Data Change

When `setItems()` or `removeItem()` is called and the focused item disappears, focus is lost. There's no focus recovery strategy.

**Fix:** When the focused item is removed, move focus to the nearest remaining item.

#### Acceptance Criteria

- [ ] `role="listbox"` always present (or `role="grid"` with withGrid)
- [ ] Screen reader announces visible range on scroll (debounced)
- [ ] Grid mode uses proper grid ARIA roles
- [ ] Focus recovery works when focused item is removed

---

### 14. Test Infrastructure Improvements

**Priority:** 🟢 Lower
**Impact:** Test reliability, contributor DX
**Effort:** Medium

#### Problem

The test suite is comprehensive (2,268 tests) but has a few structural items to address:

#### 14a. No Coverage Reporting in CI

The `coverage/lcov.info` file exists but is from February 11 and not updated automatically. There's no coverage threshold enforcement.

**Fix:** Add `bun test --coverage` to CI, set minimum threshold (e.g., 90% lines).

#### 14b. JSDOM Limitations

Several tests mock `ResizeObserver`, `IntersectionObserver`, `requestAnimationFrame`, and `performance.now()` manually. These mocks are scattered across test files with slightly different implementations.

**Fix:** Create a shared `test/helpers/` directory:

```
test/helpers/
├── dom.ts          # JSDOM setup, standard mocks
├── factory.ts      # createTestList(), createTestItems()
├── assertions.ts   # Custom matchers (toBeInRange, toHaveRenderedItems)
└── timers.ts       # Fake timers, RAF mocking
```

#### 14c. No Snapshot Testing for DOM Output

The render pipeline's DOM output is only tested via element counting and attribute checks. There's no snapshot of the actual HTML structure, so subtle DOM changes (e.g., missing attributes, wrong nesting) can slip through.

**Fix:** Add a few structural snapshot tests for key configurations (base, grid, sections, masonry).

#### Acceptance Criteria

- [ ] Coverage reporting in CI with minimum threshold
- [ ] Shared test helpers eliminate mock duplication
- [ ] DOM structure snapshot tests for base, grid, sections, and masonry configurations
- [ ] Coverage report accessible as CI artifact

---

## Priority Matrix

### 🔴 High Priority (Do First)

| # | Enhancement | Effort | Impact |
|---|------------|--------|--------|
| ~~2~~ | ~~VList vs BuiltVList alignment~~ | ~~Small~~ | ✅ Completed |
| 4 | Replace UA sniffing | Small | Correctness on real devices |
| 5 | Update CONTRIBUTING.md | Small | Contributor onboarding |

### 🟡 Medium Priority (Do Soon)

| # | Enhancement | Effort | Impact |
|---|------------|--------|--------|
| 1 | core.ts decomposition | Large | Long-term maintainability |
| 3 | Bundle size verification | Medium | Marketing credibility |
| 6 | CI/CD pipeline | Small | Regression prevention |
| 9 | Memory leak audit | Medium | Long-running app safety |
| 11 | Tree-shaking validation | Medium | Bundle size promises |
| 13 | ARIA compliance gaps | Medium | Accessibility compliance |

### 🟢 Lower Priority (Nice to Have)

| # | Enhancement | Effort | Impact |
|---|------------|--------|--------|
| 7 | Dev-mode diagnostics | Medium | DX when things go wrong |
| 8 | CSS custom property defaults | Small | Out-of-box experience |
| 10 | Rendering edge cases | Medium | Robustness |
| 12 | Conflict matrix docs | Small | DX for feature composition |
| 14 | Test infrastructure | Medium | Contributor DX |

---

## Implementation Roadmap

### Sprint 1 — Quick Wins (1-2 days)

- [ ] **#5** Rewrite CONTRIBUTING.md
- [ ] **#4** Replace UA sniffing with `pointer: coarse`
- [x] **#2** ~~Resolve VList/BuiltVList type duplication~~ ✅
- [ ] **#6** Add GitHub Actions CI

### Sprint 2 — Trust & Verification (2-3 days)

- [ ] **#3** Create bundle size measurement script
- [ ] **#11** Create tree-shaking verification script
- [ ] **#9** Memory leak audit + destroy() hardening
- [ ] **#8** CSS custom property defaults

### Sprint 3 — Architecture (3-5 days)

- [ ] **#1** core.ts decomposition (measurement, animation, events, resize, api)
- [ ] **#13** ARIA compliance improvements
- [ ] **#12** Feature compatibility matrix

### Sprint 4 — Polish (2-3 days)

- [ ] **#7** Development-mode diagnostics layer
- [ ] **#10** Rendering edge case hardening
- [ ] **#14** Test infrastructure improvements (helpers, coverage, snapshots)

---

## Appendix: File-Level Notes

Quick reference for files that need attention, sorted by priority.

| File | Lines | Note |
|------|-------|------|
| `builder/core.ts` | 1,349 | Primary decomposition target (#1) |
| `types.ts` | ~460 | ✅ Legacy types removed (#2) |
| `CONTRIBUTING.md` | 240 | Complete rewrite needed (#5) |
| `builder/materialize.ts` | 662 | Good extraction — review for completeness |
| `styles/vlist.css` | ~340 | Add `:root` defaults (#8) |
| `builder/pool.ts` | 33 | Verify `clear()` is called on destroy (#9) |
| `events/emitter.ts` | 100 | Verify `clear()` is called on destroy (#9) |
| `rendering/renderer.ts` | 792 | Good structure, no changes needed |
| `rendering/sizes.ts` | 230 | Clean, well-documented |
| `features/*/feature.ts` | Various | All follow consistent pattern ✅ |

---

## Related Documentation

- [Dependency Analysis](./DEPENDENCY_ANALYSIS.md) — Module coupling metrics
- [Madge Report](./MADGE_ANALYTICS_REPORT.md) — Full dependency graph analysis
- [Roadmap](../resources/roadmap.md) — Feature completion tracking
- [Known Issues](../resources/known-issues.md) — Current limitations
- [Architecture](../internals/structure.md) — Source code map

---

*This document is a living analysis. Items should be checked off as they're addressed and new findings added as the codebase evolves.*