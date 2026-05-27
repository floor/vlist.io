---
test_file: test/rendering/sort.test.ts
source_files:
  - src/rendering/sort.ts
coverage:
  tests: 13
  passing: 13
status: passing
v1_delta: 0
tags: [rendering, sort, dom, accessibility, minimal-move]
---

# sortRenderedDOM

## What We Test
- No-op for empty keys, single element, already-sorted DOM
- Reorder DOM children to match sorted index order (out-of-order, reverse, non-contiguous)
- Skip undefined elements from getElement callback
- Minimal-move property: elements already in correct position are never touched (no insertBefore/appendChild calls)
- No DOM mutations when already sorted (zero moves)
- Single element moved when two items swapped at end
- No moves when scrolling down appends at end (typical scroll scenario)
- Element identity preservation (same DOM nodes, not clones)
- Realistic grid scenario (new row appended at end, already sorted)

## Test Groups
- **sortRenderedDOM** (13 tests): empty keys, single element, already sorted, reorder out-of-order, reverse, non-contiguous, skip undefined, minimal-move (3 tests: partial order, already sorted, end swap), scroll-down append, element identity, grid scenario

## Known Gaps
- No test for performance with very large DOM (1000+ elements)
