---
test_file: test/plugins/scale/plugin.test.ts
source_files:
  - src/plugins/scale/plugin.ts
  - src/core/create.ts
  - src/plugins/scrollbar/plugin.ts
coverage:
  tests: 38
  passing: 38
status: passing
v1_delta: 0
tags: [plugin, scale, touch, momentum, compressed-mode, jsdom]
---

# Scale Plugin Tests

## What We Test

- Compressed mode activation (total content exceeds 16M px threshold)
- Touch drag scrolling (up/down direction, preventDefault on touchmove)
- Edge clamping (scroll position clamped to 0 and maxScroll)
- Momentum scrolling (RAF scheduling, deceleration over frames)
- Cancellation (new touch cancels momentum, new touch cancels wheel lerp)
- touchcancel event handling
- Empty touch list guard (touchstart with no touches)
- Horizontal mode (touch drag on X axis)
- Cleanup on destroy (event listeners, pending RAF, momentum)
- Integration tests (render after touch scroll, scrollbar coexistence, wheel lerp smooth scrolling, data clear during lerp, leaving compressed mode, clamping while compressed)

## Test Groups

- **compressed mode prerequisites** (2 tests): activation threshold, non-compressed passthrough
- **touch drag scrolling** (5 tests): up/down drag, deltaY calculation, preventDefault
- **edge clamping** (2 tests): clamp to 0 floor, clamp to maxScroll ceiling
- **momentum scrolling** (3 tests): RAF-driven deceleration, velocity decay, stop threshold
- **cancellation** (2 tests): new touch cancels active momentum, new touch cancels active lerp
- **touchcancel** (1 test): touchcancel event stops momentum
- **empty touch list guard** (2 tests): touchstart with empty touches array, touchmove guard
- **horizontal mode** (1 test): touch drag uses clientX for horizontal lists
- **cleanup on destroy** (3 tests): event listener removal, pending RAF cancellation, momentum cleanup
- **integration** (17 tests): render after scroll, scrollbar plugin coexistence, wheel lerp, data clear during lerp, leaving compressed mode, clamping while compressed

## Known Gaps

- None; v1 and v2 have identical test counts
