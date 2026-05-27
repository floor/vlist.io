---
test_file: test/plugins/scrollbar/controller.test.ts
source_files:
  - src/plugins/scrollbar/index.ts
coverage:
  tests: 119
  passing: 119
status: passing
v1_delta: 0
tags: [plugin, scrollbar, controller, velocity, compression, jsdom]
---

# Scroll Controller Tests

## What We Test

- rafThrottle utility (scheduling, deduplication, cancellation)
- Utility functions (isAtBottom, isAtTop, getScrollPercentage, isRangeVisible)
- createScrollController velocity tracking (sample recording, velocity calculation, decay)
- Basic scroll operations (scrollTo, scrollBy, getPosition)
- Window scroll mode with compression (virtualPosition, scale factor mapping)
- Compression mode (compressed scrollTo, scrollBy, position mapping)
- Horizontal mode with wheel event remapping (deltaX/deltaY swap)
- Compressed mode scrollTo and scrollBy
- updateConfig (runtime config changes)
- isAtBottom and getScrollPercentage in compressed mode
- Compressed wheel handling (delta scaling)
- Destroy and edge cases
- Stale velocity gap detection (time gap resets velocity)
- Wheel smoothing (accumulated delta smoothing)
- timeDelta === 0 guard (division by zero protection)
- isTracking reliability (tracking state consistency)

## Test Groups

- **rafThrottle** (6 tests): scheduling, deduplication, cancellation, flush behavior
- **isAtBottom** (5 tests): boundary detection with tolerance
- **isAtTop** (4 tests): boundary detection at scroll position 0
- **getScrollPercentage** (6 tests): percentage calculation, edge cases
- **isRangeVisible** (8 tests): range visibility within viewport
- **velocity tracking** (6 tests): sample recording, velocity calculation, decay over time
- **basic operations** (3 tests): scrollTo, scrollBy, getPosition
- **window scroll mode** (16 tests): virtual position, scale factor, compression in window mode
- **compression mode** (2 tests): compressed mode activation, position mapping
- **horizontal mode** (21 tests): wheel deltaX/deltaY remapping, horizontal scrollTo/scrollBy, track click
- **compressed mode scrollTo** (8 tests): scrollTo with compression factor
- **updateConfig** (2 tests): runtime config update, recompute derived values
- **scrollBy in compressed mode** (2 tests): relative scroll with compression
- **isAtBottom in compressed mode** (2 tests): bottom detection with virtual height
- **getScrollPercentage in compressed mode** (3 tests): percentage with virtual mapping
- **compressed wheel handling** (2 tests): delta scaling for compressed content
- **destroy edge cases** (3 tests): destroy cleanup, double-destroy safety
- **scroll controller stale velocity gap detection** (1 test): time gap resets velocity
- **scroll controller horizontal mode** (4 tests): additional horizontal mode tests
- **scroll controller window mode compression** (2 tests): window mode with compression
- **scroll controller wheel smoothing** (1 test): accumulated delta smoothing
- **scroll/controller - stale velocity gap detection** (3 tests): detailed gap detection with timing
- **scroll/controller - smoothing in compressed wheel** (2 tests): smoothing in compressed wheel events
- **scroll/controller - timeDelta === 0 guard** (1 test): division by zero protection
- **scroll/controller - isTracking reliability** (3 tests): tracking state consistency
- **scroll/controller - stale velocity gap with mocked time** (3 tests): gap detection with fake timers

## Known Gaps

- None; v1 and v2 have identical test counts
