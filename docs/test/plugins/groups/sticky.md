---
test_file: test/plugins/groups/sticky.test.ts
source_files:
  - src/plugins/groups/sticky.ts
coverage:
  tests: 18
  passing: 18
status: passing
v1_delta: 0
tags: [plugin, groups, sticky-header, dom]
---

# Groups Sticky Header Tests

## What We Test

- createStickyHeader factory (DOM element creation, initial state)
- DOM element lifecycle (element attached to root, class naming, initial hidden state)
- Destroy safety (cleanup without errors, double destroy)
- Empty layout handling (no-op when layout has no groups)
- Update with scroll positioning (header visibility based on scroll position)
- Push-out transforms (transition when next group header pushes current sticky header)
- Horizontal mode (left/transform axis swap for horizontal scrolling)
- DOM element templates (header content rendered via template function)
- Transition completion (push-out animation end state)
- Visibility, hide, and refresh methods
- stickyOffset configuration

## Test Groups

- **createStickyHeader** (14 tests): factory creation, DOM element lifecycle, destroy safety, empty layout, update with scroll positioning, push-out transforms, horizontal mode, DOM templates, transition completion
- **createStickyHeader -- update** (variable tests): scroll-based header swap, push-out transforms, position calculations
- **createStickyHeader -- visibility and refresh** (4 tests): show/hide toggle, refresh after layout change, stickyOffset

## Known Gaps

- None; v1 and v2 have identical test counts (18)
- Uncovered lines in source (96-97, 154-155, 179, 185-192, 209-212) are sticky header transition animations and DOM position updates requiring real layout calculations (getBoundingClientRect, offsetTop, scrollTop) that happy-dom does not support. These paths are exercised through builder integration tests.
