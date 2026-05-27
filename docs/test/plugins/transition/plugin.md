---
test_file: test/plugins/transition/plugin.test.ts
source_files:
  - src/plugins/transition/plugin.ts
coverage:
  tests: 68
  passing: 68
status: passing
v1_delta: 0
tags: [plugin, transition, animation, insert, remove, groups, batch]
---

# Transition Plugin Tests

## What We Test

- Config resolution: default duration/easing, custom timing, per-animation disable (remove:false, insert:false, both:false), per-animation timing overrides
- Plugin metadata: name, priority, conflicts (grid, table, masonry), destroy method presence
- Setup: capture of baseInsertItem/baseRemoveItem from methods map, _dataToLayoutIndex capture, transformOrigin based on reverse mode
- Off-screen removal: no animation when element not in DOM (via removeItemById), false return for non-existent item, forceRender after off-screen remove
- Animated removal: exit clone creation, clone cleanup after animations finish, data:change and remove:end event emission, false return when removeItemById returns false, base method chaining, translateY for vertical lists, selected-item attribute stripping from clone, cancel previous animation on new remove
- Animated insertion: item insertion via insertItemAt, data:change event emission, base method chaining, default index 0, cancel pending remove on insert, cancel pending insert on new insert, old offset capture by data-id
- Horizontal mode: translateX instead of translateY, scrollLeft for scroll position
- Reverse mode: bottom-center transform origin, scroll to reveal at bottom
- Groups integration: _dataToLayoutIndex for insert position, baseInsertItem chaining from groups, transition wrapper preservation when async groups deletes static overrides, stale base method bypass when data manager is replaced (insert and remove), baseRemoveItem chaining from groups
- Destroy: flush pending remove/insert animations, safe when no animations pending
- Edge cases: rapid insert-then-remove of same item, remove of already-removed item, empty items container, numeric index removal when id doesn't match DOM element, MAX_DURATION clamping (1000ms), safety timeout for animation finalization
- Batch removal (removeItems): method registration during setup, no registration when remove:false, empty array returns 0, single-item delegation to removeItem, multiple visible item removal with animations, clone creation per visible target, selection attribute stripping from clones, clone cleanup after animations, remove:end per item, returns 0 when none removed, off-screen-only batch without animation, cancel pending remove on batch start, offset capture for items below viewport, base method chaining
- Focus/scroll clamp: focus recovery after animated removal
- ensureRange scheduling: ensureRange call when data manager supports it
- Insert sibling slide: existing sibling animation after insert

## Test Groups

- **Config** (6 tests): default timing, custom duration/easing, remove:false, insert:false, both:false, per-animation overrides
- **Metadata** (4 tests): name, priority, conflicts, destroy method
- **Setup** (4 tests): baseInsertItem/baseRemoveItem capture, _dataToLayoutIndex capture, transformOrigin normal, transformOrigin reverse
- **removeItem off-screen** (3 tests): no animation when not in DOM, false for non-existent, forceRender after remove
- **removeItem animated** (8 tests): exit clone and animations, clone cleanup, event emission, false on failed remove, base method chaining, translateY, selection stripping, cancel previous animation
- **insertItem animated** (7 tests): insert and animations, data:change event, base method chaining, default index 0, cancel pending remove, cancel pending insert, old offset capture
- **Horizontal** (2 tests): translateX, scrollLeft
- **Reverse** (2 tests): bottom-center origin, scroll to reveal
- **Groups integration** (6 tests): _dataToLayoutIndex for position, baseInsertItem chaining, wrapper preservation with async groups, stale base remove bypass, stale base insert bypass, baseRemoveItem chaining
- **Destroy** (3 tests): flush pending remove, flush pending insert, safe with no pending
- **Edge cases** (6 tests): rapid insert-then-remove, already-removed item, empty container, numeric index fallback, MAX_DURATION clamp, safety timeout
- **removeItems batch** (14 tests): method registration, no registration when disabled, empty array, single-item delegation, multi-item animation, clone creation, selection stripping, clone cleanup, per-item remove:end, zero when none removed, off-screen batch, cancel pending, offset capture, base method chaining
- **focus/scroll clamp** (1 test): focus recovery after animated removal
- **ensureRange scheduling** (1 test): ensureRange call on data manager
- **insertItem sibling slide** (1 test): sibling animation after insert

## Known Gaps

- None: all 68 v1 tests are present in v2 (v1 tests that referenced base feature chaining by name like "baseRemoveItem when provided by a prior feature" are replaced by v2 equivalents like "removes item via removeItemById in v2 architecture")
