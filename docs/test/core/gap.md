---
test_file: test/core/gap.test.ts
source_files:
  - src/core/pipeline.ts
  - src/core/sizes.ts
  - src/core/create.ts
coverage:
  tests: 14
  passing: 14
status: passing
v1_delta: null
tags: [core, gap, pipeline, sizes, layout]
---

# Gap Tests

## What We Test
- Gap subtraction from DOM element sizing in phase2Commit (vertical height, horizontal width)
- No subtraction when gap is zero
- Offsets spaced by itemSize + gap
- Size cache baking gap into slot sizes (fixed and variable)
- Trailing gap removal from total content size
- End-to-end gap wiring through createVList (fixed sizes, variable sizes, zero gap, setItems, appendItems, empty list)

## Test Groups
- **phase2Commit gap** (4 tests): subtracts gap from element height (vertical) and width (horizontal), no subtraction at gap=0, offsets correctly spaced
- **size cache with gap** (4 tests): fixed slot = itemSize + gap, variable slot = sizeFn(i) + gap, trailing gap excluded from totalSize, zero items returns 0
- **createVList with gap** (6 tests): content size excludes trailing gap for fixed and variable heights, gap=0 has no effect, setItems recalculates with gap, appendItems preserves gap, empty list size is 0

## Known Gaps
- New in v2 (no v1 equivalent) -- no regression comparison available
- No tests for gap interaction with autosize/measured items
- No tests for gap in horizontal mode at the createVList integration level
