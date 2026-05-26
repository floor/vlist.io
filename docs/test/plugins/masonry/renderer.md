---
test_file: test/plugins/masonry/renderer.test.ts
source_files:
  - src/plugins/masonry/renderer.ts
  - src/plugins/masonry/types.ts
coverage:
  tests: 53
  passing: 53
status: passing
v1_delta: 0
tags: [plugin, masonry, renderer, dom]
---

# Masonry Renderer Tests

## What We Test

- createMasonryRenderer factory initialization
- DOM rendering (element creation, template invocation, correct item data)
- Element positioning (absolute positioning, top/left from ItemPlacement)
- Element sizing (width/height from column width and item height)
- Selection and focus CSS classes on rendered items
- ARIA attributes (role, aria-selected, aria-posinset, aria-setsize)
- Element recycling with grace period (reuse existing elements, pool management)
- getElement retrieval by index
- clear method (removes all rendered elements)
- destroy method (cleanup, pool disposal)
- Custom class prefix support
- Element pooling (pool creation, element reuse)
- Horizontal mode (swapped axes)
- Multi-column rendering correctness
- Edge cases (empty placements, out-of-range, missing template)
- Template receives correct state (index, selected, focused)
- Existing item updates (re-render in place)
- sortDOM (DOM order correction)
- Group header ARIA attributes

## Test Groups

- **createMasonryRenderer** (2 tests): factory, initialization defaults
- **render** (8 tests): basic rendering, template invocation, item data, DOM structure
- **render - positioning** (3 tests): absolute position from placement data
- **render - sizing** (3 tests): width/height from column width and item size
- **render - selection and focus** (3 tests): CSS class application for selected/focused states
- **render - ARIA** (3 tests): role, aria-selected, aria-posinset, aria-setsize
- **render - recycling** (3 tests): grace period, element reuse from pool
- **getElement** (3 tests): element retrieval by index, missing index handling
- **clear** (3 tests): removes rendered elements, resets state
- **destroy** (1 test): full cleanup
- **custom class prefix** (1 test): non-default class prefix
- **element pooling** (1 test): pool creation and reuse
- **horizontal mode** (1 test): swapped axis rendering
- **multi-column rendering** (2 tests): correct multi-column layout
- **edge cases** (5 tests): empty placements, out-of-range indices, missing template
- **template receives correct state** (2 tests): index, selected, focused passed to template
- **masonry renderer - existing item updates** (5 tests): re-render items already in DOM
- **masonry renderer - sortDOM** (1 test): DOM order correction after render
- **masonry renderer - group header ARIA** (3 tests): ARIA attributes for group headers

## Known Gaps

- None; v1 and v2 have identical test counts and groups
