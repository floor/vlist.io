---
test_file: test/integration/core-coverage.test.ts
source_files:
  - src/core/create.ts
  - src/core/pipeline.ts
  - src/core/hooks.ts
  - src/core/state.ts
  - src/core/sizes.ts
  - src/core/pool.ts
  - src/core/scroll.ts
  - src/core/types.ts
coverage:
  tests: 34
  passing: 34
status: passing
v1_delta: null
tags: [integration, core, pipeline, hooks, scroll]
---

# Core Coverage

## What We Test
- createVList validation: duplicate plugins, conflicting plugins, string container selector, invalid selector
- Data mutation paths: prependItems, insertItem (end), removeItem (nonexistent), removeItems (with missing ids), updateItem (nonexistent)
- Scroll paths: center/end alignment, empty list scrollToIndex, smooth scrolling with custom easing, elastic overshoot easing, scroll:idle event
- Horizontal mode: content width, scrollLeft for horizontal scrollToIndex
- Hook runners: commit, idle, afterScroll, resize hooks; compileHooks with all hook types; skip plugins without hooks
- Pipeline edge cases: HTMLElement templates, item identity changes, same-id re-render, same-reference skip, focused class toggling, horizontal sizing, phase1 early-exit, zero container size

## Test Groups
- **createVList validation** (4 tests): duplicate plugin names, conflicting plugins, string selector, invalid selector
- **createVList data mutations** (5 tests): prepend, insert at end, remove nonexistent, removeItems partial, update nonexistent
- **createVList scroll** (6 tests): center alignment, end alignment, empty list noop, smooth with custom easing, elastic easing, scroll:idle event
- **createVList horizontal** (2 tests): content width, scrollLeft
- **hook runners** (7 tests): commit, idle, afterScroll, resize, compileHooks all types, compileHooks empty
- **pipeline** (7 tests): HTMLElement template, identity change re-render, same-id re-render, same-reference skip, focused class toggle, horizontal sizing, phase1 early-exit
- **scroll handler horizontal wheel** (3 tests): vertical wheel in horizontal mode, deltaX passthrough, cross-axis overflow

## Known Gaps
- No test for phase2Commit with selection state applied
- No test for compileHooks priority ordering
