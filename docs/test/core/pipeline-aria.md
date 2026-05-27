---
test_file: test/core/pipeline-aria.test.ts
source_files:
  - src/core/pipeline.ts
  - src/core/state.ts
coverage:
  tests: 15
  passing: 15
status: passing
v1_delta: null
tags: [core, pipeline, aria, state, engine]
---

# Pipeline ARIA & EngineState Tests

## What We Test
- createEngineState factory: initial values, typed array allocation, capacity resizing, clear method
- ARIA attribute assignment in phase2Commit for interactive mode (role=option, aria-posinset, aria-setsize, element id)
- ARIA attribute assignment for non-interactive mode (role=listitem, no posinset/setsize/id)
- Optimized aria-setsize updates: skipped when totalItems unchanged, applied when totalItems changes
- prevAriaTotal state tracking across commits

## Test Groups
- **createEngineState** (4 tests): correct initial values and typed arrays, resizeCapacity grows buffers when needed, resizeCapacity is no-op when sufficient, clear resets visibleCount and startIndex
- **phase2Commit interactive: true** (5 tests): elements get role=option, aria-posinset = dataIndex+1, aria-setsize = totalItems, id = classPrefix-item-dataIndex, prevAriaTotal updated after commit
- **phase2Commit interactive: false** (3 tests): elements get role=listitem, no aria-posinset or aria-setsize, no id attribute
- **phase2Commit totalItems change** (3 tests): first commit sets aria-setsize on all elements, second commit with same total skips existing elements, commit with changed total updates existing elements

## Known Gaps
- New in v2 (no v1 equivalent) -- no regression comparison available
- No tests for resizeCapacity preserving existing data in buffers during growth
- No tests for aria-posinset updates when visible range shifts (scroll-driven re-render)
