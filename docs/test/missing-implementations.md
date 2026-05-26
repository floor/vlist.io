---
title: Missing Implementations — v1 Features Not Yet in v2
date: 2026-05-26
status: verdicts-complete
total_findings: 48
reimplement: 41
defer: 4
drop: 2
investigate: 1
---

## Bundle Size Baseline (pre-reimplementation)

Measured on 2026-05-26 before any code changes. Track regressions after each phase.

| Plugin | Minified | Gzipped | Delta |
|--------|----------|---------|-------|
| Base (createVList) | 18.6 KB | 6.9 KB | — |
| a11y | 21.5 KB | 7.9 KB | +1.0 KB |
| grid | 24.4 KB | 8.9 KB | +2.0 KB |
| selection | 26.4 KB | 9.2 KB | +2.3 KB |
| scrollbar | 24.8 KB | 8.7 KB | +1.9 KB |
| scale | 30.8 KB | 10.6 KB | +3.7 KB |
| page | 21.0 KB | 7.6 KB | +0.8 KB |
| snapshots | 22.2 KB | 8.1 KB | +1.3 KB |
| transition | 25.3 KB | 8.7 KB | +1.8 KB |
| autosize | 20.5 KB | 7.5 KB | +0.7 KB |
| table | 36.7 KB | 12.7 KB | +5.8 KB |
| groups | 29.6 KB | 10.6 KB | +3.7 KB |
| async | 31.4 KB | 11.5 KB | +4.7 KB |
| masonry | 28.3 KB | 10.4 KB | +3.5 KB |
| sortable | 28.0 KB | 9.9 KB | +3.0 KB |

# Missing Implementations

Features and optimizations from v1 that are missing, broken, or untested in v2. Discovered by cross-referencing deleted v1 test docs against v2 source code.

## Verdicts

- **reimplement** — needed for v2 correctness or performance, must ship before release
- **drop** — intentionally removed, no longer relevant (document why)
- **defer** — nice to have, not blocking v2 release

---

## Category A: Code Missing from v2 (needs reimplementation)

Features that existed in v1 source and are NOT present in v2 source.

| # | Feature | v1 Location | Severity | Verdict | Notes |
|---|---------|-------------|----------|---------|-------|
| 1 | **Config validation** — negative/zero/NaN itemHeight silently accepted | builder/boundary.test.ts | critical | **reimplement** | `src/core/create.ts:57-65` does no validation, falls back to 40 |
| 2 | **Plugin setup error isolation** — one plugin crash kills all subsequent plugins | builder/recovery.test.ts | critical | **reimplement** | `src/core/create.ts:317-321` has no try-catch around plugin setup loop |
| 3 | **Destroy resilience** — one handler throwing prevents all remaining cleanup | builder/recovery.test.ts | critical | **reimplement** | `src/core/create.ts:657-660` no try-catch around destroy loops, causes memory leaks |
| 4 | **Template error handling** — template throw crashes entire render cycle | builder/recovery.test.ts | critical | **reimplement** | `src/core/pipeline.ts:234,297` no try-catch; v1 emitted error event and continued |
| 5 | **Scrolling class toggle** — `.vlist--scrolling` CSS rules exist but no JS toggles the class | integration/features.test.ts | critical | **reimplement** | CSS in vlist.css:268, vlist-grid.css:42, vlist-table.css:225, vlist-masonry.css:42 — all dead |
| 6 | **item:dblclick event** — type defined in types.ts:587 but no listener/emission code | integration/features.test.ts | high | **reimplement** | Dead type — no `addEventListener("dblclick")` anywhere in src/ |
| 7 | **16M content height cap in core** — only exists in scale plugin, core has no guard | builder/memory.test.ts | high | **reimplement** | Core guard + dev warning when exceeding MAX_VIRTUAL_SIZE without scale plugin |
| 8 | **ResizeObserver existence check** — missing RO crashes with ReferenceError | builder/recovery.test.ts | medium | **reimplement** | `src/core/create.ts:445` no typeof check, no descriptive error |
| 9 | **Error viewport snapshot** — type defined but never populated | builder/recovery.test.ts | medium | **defer** | `src/types.ts:571-579` defined; wire up when tackling #2/#3/#4 |
| 10 | **Adapter malformed response validation** — null/undefined items causes crash | builder/recovery.test.ts | medium | **reimplement** | `src/plugins/async/manager.ts` no guard on response.items shape |
| 11 | **scrollbar--no-scrollbar class** — CSS exists in vlist.css:534, no code toggles it | integration/features.test.ts | medium | **defer** | Styling convenience, not functional |
| 12 | **Striped mode** — no feature found in v2 source | groups/async-integration.test.ts | low | **drop** | Intentionally dropped in v2 |
| 13 | **rAF polyfill / graceful degradation** — v2 assumes modern browsers | builder/recovery.test.ts | low | **drop** | v2 targets modern browsers where rAF is universal |

## Category B: Code Exists but Has Zero Tests (needs tests)

Features implemented in v2 source that have no test coverage.

| # | Feature | v2 Source Location | Severity | Verdict | Notes |
|---|---------|-------------------|----------|---------|-------|
| 14 | **Scroll correction after measurement** — visual jump prevention | `src/plugins/autosize/plugin.ts:148-152` (pendingScrollDelta) | critical | **reimplement** | Users see jumps when above-viewport items measure differently |
| 15 | **Grid 2D keyboard navigation** — ArrowDown moves by column count | `src/plugins/grid/plugin.ts:366-371` (nav.ud = columns) | critical | **reimplement** | Selection plugin uses nav.ud/lr but no keyboard event test |
| 16 | **Masonry lane-aware keyboard navigation** — navigate function | `src/plugins/masonry/plugin.ts:151,429-432` | critical | **reimplement** | navigate function exists, zero tests |
| 17 | **Baseline keyboard a11y without selection plugin** | `src/plugins/a11y/plugin.ts` | high | **reimplement** | a11y plugin handles arrow keys, Home/End, Space/Enter — no integration test |
| 18 | **Event payload object reuse** — zero-allocation scroll events | `src/core/create.ts:166-171` (_velEvt, _rangeEvt, _scrollEvt singletons) | high | **reimplement** | Optimization present but no ref-equality regression test |
| 19 | **Sustained scroll bounded element count** — pool stays bounded during scroll | `src/core/pipeline.ts:124` (maxRender cap) | high | **reimplement** | No multi-frame scroll simulation test |
| 20 | **stayAtEnd behavior** — auto-scroll to bottom on measurement | `src/plugins/autosize/plugin.ts:54-64,143-163` | high | **reimplement** | isAtBottom + snapToBottom exist, no autosize-specific test |
| 21 | **Horizontal mode measurement** — width/inlineSize/translateX | `src/plugins/autosize/plugin.ts` | high | **reimplement** | No horizontal autosize test |
| 22 | **scrollPadding + scrollToIndex integration** (page plugin) | `src/plugins/page/plugin.ts:140-168` | high | **reimplement** | Adjusts scrollToIndex offset by padding, no test |
| 23 | **ARIA selection attributes** — aria-selected, aria-activedescendant | `src/plugins/selection/plugin.ts:299` | high | **reimplement** | Source sets aria-activedescendant, no test verifying |
| 24 | **Selection group header skipping** — skipHeaders logic | `src/plugins/selection/plugin.ts:69,86` | high | **reimplement** | Skip logic exists, no behavioral test |
| 25 | **Table _updateItemClasses delegation** | `src/plugins/table/plugin.ts:393` | high | **reimplement** | Registered method, zero tests |
| 26 | **Groups + async sticky header creation** — lazy after data loads | groups/async-integration.test.ts | high | **reimplement** | No test for sticky headers appearing after async data arrives |
| 27 | **Groups + async scroll drift correction** | groups/async-integration.test.ts | high | **reimplement** | No test for scroll adjustment when new headers discovered |
| 28 | **Deferred content size flush** (autosize) | `src/plugins/autosize/plugin.ts:46,166` (pendingContentSizeUpdate) | medium | **reimplement** | Feature exists, no direct test |
| 29 | **Config height vs estimatedHeight precedence** | `src/core/create.ts:57-65` | medium | **reimplement** | No test that explicit height wins |
| 30 | **scrollToIndex with measured (autosize) sizes** | autosize + scrollToIndex interaction | medium | **reimplement** | No test |
| 31 | **focusOnClick behavioral tests** — focus ring on click, shift+click | `src/plugins/selection/plugin.ts` | medium | **reimplement** | Config acceptance tested, behavior not |
| 32 | **Selection focusin/focusout handlers** | `src/plugins/selection/plugin.ts` | medium | **reimplement** | Source has focusin handler, no test |
| 33 | **Selection ID resolution / sparse ID indexing** | `src/plugins/selection/` | medium | **reimplement** | No test for non-sequential item IDs |

## Category C: Missing Integration Tests (cross-feature gaps)

Individual features work but their combinations aren't tested.

| # | Feature Combo | Severity | Verdict | Notes |
|---|--------------|----------|---------|-------|
| 34 | **Performance benchmarks** — init/render/scroll/destroy timing | critical | **reimplement** | 50 v1 tests, zero v2 equivalent. No regression protection. |
| 35 | **DOM structure snapshot tests** — root > viewport > content nesting, ARIA completeness | high | **reimplement** | v1 had snapshot regression tests for every layout mode |
| 36 | **Cross-feature destroy ordering** — multi-plugin destroy sequence | high | **reimplement** | Only 2 basic destroy tests in memory.test.ts |
| 37 | **Data operations with active features** — setItems/append/remove with selection+scrollbar+snapshots | high | **reimplement** | No test |
| 38 | **Async + Table** — table layout with async loading | high | **reimplement** | No integration test |
| 39 | **Async + Grid** — grid layout with async loading | medium | **reimplement** | No integration test |
| 40 | **Scale + keyboard navigation** — navigation with compression active | high | **reimplement** | `test/integration/scale-selection.test.ts` only tests programmatic selection |
| 41 | **Scroll-driven ensureRange** — full scroll → ensureRange → adapter.read pipeline | high | **reimplement** | Manager tests cover loadRange but not scroll trigger |
| 42 | **Multi-page sequential loading** — scroll → load page 1 → scroll → load page 2 | high | **reimplement** | Manager covers chunks, no full lifecycle test |
| 43 | **Async memory management** — cleanup pending requests on destroy, no leak under many scrolls | high | **reimplement** | No test |
| 44 | **Async edge cases** — empty results, scrollToIndex during load, setItems during load | high | **reimplement** | No integration-level test |
| 45 | **Horizontal + scrollbar/selection/snapshots combos** | medium | **reimplement** | Only 2 horizontal tests in core-coverage |
| 46 | **Reverse mode + selection/snapshots** | medium | **reimplement** | No test |
| 47 | **Concurrent operations** — rapid setItems, rapid scroll + data changes, selection during scroll | medium | **reimplement** | No test |
| 48 | **Wheel handler full scroll cycle** — wheel → scrolling class → idle | medium | **reimplement** | Depends on #5 (scrolling class toggle) |

## Category D: Intentionally Changed Architecture (verify, don't recover)

| # | Feature | v1 Approach | v2 Approach | Verdict | Notes |
|---|---------|------------|-------------|---------|-------|
| D1 | SimpleDataManager | Standalone class with CRUD + callbacks | Array in createVList + direct methods | **drop** | v2 core ops tested in lifecycle.test.ts |
| D2 | Data change callbacks | onStateChange/onItemsLoaded | No data:change event in core | **drop** | Async manager has its own callbacks |
| D3 | Partial-set at offset | setItems(items, offset) | Core does full replace; async manager handles offsets | **drop** | By design |
| D4 | newlyRendered allocation guard | Skip array alloc when no afterRenderBatch hooks | v2 uses TypedArrays (EngineState), no per-frame arrays | **drop** | Optimization inherent to architecture |
| D5 | Items wrapper DOM element | `.vlist-items` wrapper | Removed — 3-element structure: root > viewport > content | **drop** | Intentional simplification |
| D6 | Live region element | `.vlist-live-region` for ARIA announcements | Removed | **reimplement** | Needed for a11y compliance — screen readers need announcements |

---

## Summary

| Verdict | Count |
|---------|-------|
| **reimplement** | 41 |
| **defer** | 4 (#9, #11 medium missing code; implicit for low-priority items) |
| **drop** | 7 (#12, #13 low code; D1-D5 architecture) |
| **investigate** | 0 |

### Priority Order for Reimplementation

**Phase 1 — Critical code fixes (ship-blocking):**
#1 config validation, #2 plugin setup isolation, #3 destroy resilience, #4 template error handling, #5 scrolling class toggle

**Phase 2 — Critical tests (code exists, needs tests):**
#14 scroll correction, #15 grid 2D nav, #16 masonry nav, #34 performance benchmarks

**Phase 3 — High code fixes:**
#6 item:dblclick, #7 16M cap in core, D6 live region

**Phase 4 — High tests (code exists, needs tests):**
#17-27 (a11y, event reuse, autosize gaps, selection gaps, groups+async)

**Phase 5 — High integration tests:**
#35-44 (DOM snapshots, destroy ordering, data+features, async combos)

**Phase 6 — Medium items:**
#8, #10 (code fixes) + #28-33 (tests) + #39, #45-48 (integration)
