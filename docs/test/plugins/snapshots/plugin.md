---
test_file: test/plugins/snapshots/plugin.test.ts
source_files:
  - src/plugins/snapshots/plugin.ts
coverage:
  tests: 97
  passing: 97
status: passing
v1_delta: 0
tags: [plugin, snapshots, scroll-state, session-storage, cross-mode]
---

# Snapshots Plugin Tests

## What We Test

- Snapshot capture of scroll position, visible index, and offset within item
- Restore logic including sizeCache rebuild, loadVisibleRange fallback, and maxScroll clamping
- NaN/Infinity guards on snapshot fields to prevent corrupt restores
- Auto-restore via config (queueMicrotask scheduling, total bootstrapping)
- autoSave to sessionStorage on scroll idle, selection:change, and focus:change events
- Restore-settle guard that suppresses saves during the restore window
- Selection seeding via _seedSelection before first render
- Focus save/restore via _getFocusedId and _focusById (sync and async paths)
- Cross-mode snapshot fields (dataIndex, dataTotal, offsetRatio) for grid-to-list and list-to-grid transitions
- Cross-mode restoreScroll with _dataToLayoutIndex conversion and offsetRatio-based offset recalculation
- JSON serialization roundtrip for all snapshot fields

## Test Groups

- **Factory** (4 tests): plugin creation, config validation (restore snapshot, empty config, no args)
- **Setup** (2 tests): method registration (getScrollSnapshot, restoreScroll)
- **getScrollSnapshot** (9 tests): index/offset capture in normal and compressed modes, total inclusion, selectedIds and focusedId inclusion/omission based on selection plugin presence
- **restoreScroll** (9 tests): normal mode restore, index clamping, maxScroll clamping, selection restore, NaN/empty selection handling, no-op when totalItems=0
- **NaN Guard** (4 tests): rejects NaN index, NaN offsetInItem, Infinity index, -Infinity offsetInItem
- **sizeCache Rebuild** (5 tests): rebuild on total mismatch, skip when correct, post-rebuild scroll, regression #30 clamp and virtualSize guards
- **loadVisibleRange** (3 tests): prefers loadVisibleRange over reload, falls back to reload, no-op when neither exists
- **Auto-Restore** (8 tests): microtask scheduling, skip when no config/restore, sizeCache rebuild during auto-restore, loadVisibleRange call, NaN handling, totalItems=0 with/without snapshot total
- **Save/Restore Roundtrip** (3 tests): position roundtrip, total preservation, selection roundtrip
- **Edge Cases** (5 tests): index 0/offset 0, last item, negative index clamping, single item list, JSON-parsed snapshot coercion
- **autoSave** (12 tests): save on scroll idle, save on selection:change, restore-settle guard, guard lift after restore, normal save after guard, sessionStorage read and auto-restore, async autoLoad cancellation, no guard without restore, corrupt data handling, save on focus:change, focus guard during settle, focus save after guard lift
- **Selection Seeding** (4 tests): synchronous _seedSelection before render, strip selectedIds from restoreScroll, persist seeded selection, skip when _seedSelection absent
- **Focus Save/Restore** (12 tests): capture focusedId (numeric and string), omit when undefined/absent/totalItems=0, include alongside selectedIds, _focusById via rAF after sync restore, skip when no focusedId/absent _focusById, async _focusById after loadVisibleRange, JSON roundtrip
- **Cross-Mode Snapshot Fields** (6 tests): dataIndex via _layoutToDataIndex, dataTotal via _getTotal, offsetRatio as fraction of item size, omit when converters absent, full grid scenario with all fields
- **Cross-Mode restoreScroll** (11 tests): dataIndex conversion via _dataToLayoutIndex (grid-to-grid, grid-to-list, list-to-grid), raw index fallback (list-to-list), offsetRatio-based offset, clamped offsetInItem fallback, dataTotal bootstrap, snapshot.total fallback, JSON serialization preservation, grid-to-list roundtrip, list-to-grid roundtrip

## Known Gaps

- None: all 97 v1 tests are present in v2 (some renamed from "feature" to "plugin" and "selection feature" to "selection plugin" terminology)
