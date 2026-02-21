# Testing Checklist - Memory Optimization Default

**Date:** February 2026  
**Status:** 🧪 Testing in progress  
**Changes:** Removed copyOnInit and enableItemById flags - optimization now default

---

## Overview

We've made memory optimization the default by removing config flags entirely:
- **Removed:** `copyOnInit` flag - now always uses reference (0.04 MB constant memory)
- **Removed:** `enableItemById` flag - no ID→index Map
- **Removed:** ID-based APIs (`scrollToItem`, `getItemById`, etc.)
- **Changed:** `updateItem` and `removeItem` now take index instead of id

**Code changes:**
- 155 lines removed (217 deleted, 62 added)
- All 1181 tests passing
- Build successful (71.6 KB minified, 23.6 KB gzipped)

---

## Pre-Commit Testing Checklist

### ✅ Phase 1: Automated Tests

- [x] **Unit tests pass:** `bun test` → 1181 pass, 0 fail
- [x] **Build succeeds:** `bun run build` → 71.6 KB minified
- [x] **No TypeScript errors:** Build completes without errors
- [ ] **Benchmarks build:** `bun run build:bench` (in vlist.dev)

### 🔬 Phase 2: Memory Benchmarks

**Memory Optimization Impact benchmark:**  
http://localhost:3338/benchmarks/memory-optimization-comparison

Test with:
- [ ] **10K items** - Verify ~0.04 MB memory usage
- [ ] **100K items** - Verify ~0.04 MB memory usage
- [ ] **1M items** - Verify ~0.04 MB memory usage

**Expected results:**
- Baseline: Should show previous memory usage (with flags)
- Optimized: Should be ~0.04 MB (constant)
- Difference: Should be minimal since optimization is now default

**⚠️ Note:** This benchmark might need updating since flags are removed!

### 🏃 Phase 3: Performance Benchmarks

**Initial Render benchmark:**  
http://localhost:3338/benchmarks/render

Test with JavaScript variant:
- [ ] **10K items** - Should render in <50ms
- [ ] **100K items** - Should render in <500ms
- [ ] **1M items** - Should render without crashing

**Scroll FPS benchmark:**  
http://localhost:3338/benchmarks/scroll

Test with JavaScript variant:
- [ ] **10K items** - Should maintain >55 FPS
- [ ] **100K items** - Should maintain >55 FPS
- [ ] **1M items** - Should maintain >50 FPS

**Memory (JavaScript) benchmark:**  
http://localhost:3338/benchmarks/memory

Test with JavaScript variant:
- [ ] **10K items** - After render < 2 MB, scroll delta < 1 MB
- [ ] **100K items** - After render < 5 MB, scroll delta < 1 MB
- [ ] **1M items** - After render < 50 MB, scroll delta < 5 MB

**ScrollTo benchmark:**  
http://localhost:3338/benchmarks/scrollto

Test with JavaScript variant:
- [ ] **10K items** - ScrollToIndex works smoothly
- [ ] **100K items** - ScrollToIndex works smoothly
- [ ] **1M items** - ScrollToIndex works smoothly

### 📊 Phase 4: Comparison Benchmarks

**Library Comparison:**  
http://localhost:3338/benchmarks/react-window

Compare vlist vs react-window:
- [ ] **100K items** - vlist memory should be competitive or better
- [ ] **100K items** - vlist render time should be competitive
- [ ] **100K items** - vlist scroll FPS should be competitive

### 🔌 Phase 5: Plugin Testing

Test with plugins to ensure they still work:

**Selection Plugin:**
- [ ] Select items by clicking
- [ ] Select multiple items (Shift+click)
- [ ] Keyboard navigation (Arrow keys)
- [ ] Space to select
- [ ] `getSelectedItems()` returns correct items
- [ ] Selection classes applied correctly

**Grid Plugin:**
- [ ] Grid renders correctly
- [ ] Scroll works smoothly
- [ ] Selection works with grid
- [ ] Prepend/append items work

**Scrollbar Plugin:**
- [ ] Scrollbar appears
- [ ] Dragging works
- [ ] Proportional to content
- [ ] Works with selection

**Sections Plugin:**
- [ ] Sections render correctly
- [ ] Headers are sticky
- [ ] Selection works across sections

**Snapshots Plugin:**
- [ ] `captureSnapshot()` works
- [ ] `restoreSnapshot()` works
- [ ] Works with selection state

### 🎨 Phase 6: Integration Testing

**Test in vlist.dev sandbox:**

Navigate to: http://localhost:3338/sandbox

Test various examples:
- [ ] **Basic list** - Renders and scrolls
- [ ] **Variable heights** - Heights calculated correctly
- [ ] **Horizontal scroll** - Works properly
- [ ] **Reverse mode** - Items in reverse order
- [ ] **Grid layout** - Grid renders correctly
- [ ] **Infinite scroll** - Loading works
- [ ] **Selection** - Selection works
- [ ] **Compression** - Large lists work (1M+ items)

### 🧪 Phase 7: Edge Cases

Test edge cases that might break:

**Array mutation (should NOT work):**
- [ ] Create list with items array
- [ ] Mutate array directly: `items.push(newItem)`
- [ ] Verify vlist doesn't automatically update (expected behavior)
- [ ] Verify `setItems(newArray)` DOES work

**Empty states:**
- [ ] Empty items array `[]`
- [ ] No items provided `undefined`
- [ ] Single item `[item]`

**Large datasets:**
- [ ] 1M items - renders without crash
- [ ] 10M items - renders without crash (with compression)
- [ ] Memory stays constant

**Index-based operations:**
- [ ] `updateItem(index, updates)` works
- [ ] `removeItem(index)` works
- [ ] Invalid index handled gracefully
- [ ] Negative index handled gracefully

**Rapid operations:**
- [ ] Rapid scrolling
- [ ] Rapid setItems() calls
- [ ] Rapid selection changes
- [ ] No memory leaks

### 🔍 Phase 8: Visual Testing

**Check UI in browser:**

- [ ] Items render correctly
- [ ] Scroll is smooth
- [ ] No visual glitches
- [ ] Selection highlighting works
- [ ] Grid layout correct
- [ ] Scrollbar appears and functions
- [ ] No console errors
- [ ] No console warnings

### 📱 Phase 9: Cross-Browser Testing

Test in different browsers (if possible):

- [ ] **Chrome** - Everything works
- [ ] **Firefox** - Everything works
- [ ] **Safari** - Everything works
- [ ] **Edge** - Everything works

### 🔄 Phase 10: Backward Compatibility

**Breaking changes documented:**

- [ ] Array mutation no longer detected (expected)
- [ ] `scrollToItem(id)` removed → use `scrollToIndex(index)`
- [ ] `getItemById(id)` removed → use `getItem(index)`
- [ ] `getIndexById(id)` removed → not needed
- [ ] `updateItem(id, ...)` → `updateItem(index, ...)`
- [ ] `removeItem(id)` → `removeItem(index)`

**Migration required:**
- [ ] Document migration path for each breaking change
- [ ] Provide code examples for each change
- [ ] Test migration examples work

---

## Issues Found

### 🐛 Issue Template

Use this template to document any issues:

```
**Issue #X: [Brief description]**

- **Severity:** Critical / High / Medium / Low
- **Component:** [e.g., Selection plugin, Memory benchmark]
- **Steps to reproduce:**
  1. ...
  2. ...
  3. ...
- **Expected:** ...
- **Actual:** ...
- **Browser:** Chrome 120 / Firefox / Safari / etc.
- **Fix needed:** Yes / No / Maybe
```

---

## Known Issues

### Issue #1: Memory benchmark might show wrong data

- **Severity:** Low
- **Component:** Memory optimization benchmark
- **Details:** Benchmark compares baseline vs optimized, but both are now the same (optimized)
- **Fix:** Update benchmark to compare against theoretical baseline or remove it

---

## Sign-Off Checklist

Before committing, verify:

- [ ] All automated tests pass (1181/1181)
- [ ] All memory benchmarks show ~0.04 MB constant usage
- [ ] All performance benchmarks meet targets (>55 FPS, <500ms render)
- [ ] All plugins work correctly
- [ ] All edge cases handled
- [ ] No console errors or warnings
- [ ] Visual testing complete
- [ ] Breaking changes documented
- [ ] Migration guide prepared
- [ ] No critical or high severity issues

---

## Post-Commit Tasks

After committing (if tests pass):

1. [ ] Update vlist README with breaking changes
2. [ ] Update CHANGELOG.md
3. [ ] Update memory-baseline-measurements.md
4. [ ] Remove memory-optimization benchmark (or update it)
5. [ ] Update user documentation
6. [ ] Prepare migration guide
7. [ ] Consider version bump strategy

---

## Test Results

**Testing started:** [Date/Time]  
**Testing completed:** [Date/Time]  
**Tester:** [Name]

**Results:**
- Automated tests: ✅ Pass / ❌ Fail
- Memory benchmarks: ✅ Pass / ❌ Fail
- Performance benchmarks: ✅ Pass / ❌ Fail
- Plugin testing: ✅ Pass / ❌ Fail
- Integration testing: ✅ Pass / ❌ Fail
- Edge cases: ✅ Pass / ❌ Fail
- Visual testing: ✅ Pass / ❌ Fail

**Overall verdict:** ✅ Ready to commit / ❌ More work needed / ⚠️ Proceed with caution

**Notes:**
[Add any additional notes here]

---

*This checklist ensures thorough testing before committing significant changes.*
