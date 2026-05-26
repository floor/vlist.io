---
test_file: test/core/velocity.test.ts
source_files:
  - src/core/velocity.ts
coverage:
  tests: 18
  passing: 18
status: passing
v1_delta: 0
tags: [core, velocity, scroll, momentum]
---

# Builder Velocity Tests

## What We Test
- Velocity tracker creation with zero initial state
- Sample count incrementing and capping
- Velocity calculation after reaching MIN_RELIABLE_SAMPLES (distance over time, absolute distance)
- Averaging velocity across multiple samples
- Stale gap detection: tracker reset when time gap exceeds threshold, no reset for small gaps
- Edge cases: zero time delta, no movement, large position changes, rapid consecutive updates
- In-place mutation semantics (updateVelocityTracker returns same object)
- Real-world scenarios: accelerating scroll tracking, scroll stop detection via stale gap

## Test Groups
- **velocity constants** (1 test): MIN_RELIABLE_SAMPLES equals 2
- **createVelocityTracker** (2 tests): creates tracker with zero velocity and sampleCount, accepts initial position argument
- **basic updates** (2 tests): sample count increments on update, sample count capped at 5
- **velocity calculation** (4 tests): calculates velocity with sufficient samples, velocity as distance over time, absolute distance for backward scroll, averages across samples
- **stale gap detection** (2 tests): resets tracker when time gap exceeds threshold (velocity=0, sampleCount=1), no reset for gaps below threshold
- **edge cases** (4 tests): zero time delta does not compute velocity, no movement yields velocity=0, large position changes tracked, rapid updates cap sample count
- **mutability** (1 test): updateVelocityTracker mutates tracker in place
- **velocity tracking scenarios** (2 tests): tracks accelerating scroll with increasing deltas, detects scroll stop via stale gap reset

## Known Gaps
- v1 had 18 tests; v2 has 18 (delta: 0) -- identical coverage
- None identified
