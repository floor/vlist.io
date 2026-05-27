---
test_file: test/plugins/autosize/plugin.test.ts
source_files:
  - src/plugins/autosize/plugin.ts
coverage:
  tests: 28
  passing: 28
status: passing
v1_delta: +16
tags: [plugin, autosize, resize-observer, scroll-anchor]
---

# Autosize Plugin Tests

## What We Test

- Factory creation (name, priority, independent instances, gap config)
- Setup wiring into PluginContext (setSizeConfig, destroy handler, isMeasured/setMeasuredSize/getMeasuredCount methods, onCommit/onIdle hooks)
- Measured size tracking (isMeasured before/after, getMeasuredCount increments)
- onCommit hook (observes unmeasured rendered elements via ResizeObserver, skips already-measured items, clears explicit height for natural measurement)
- onIdle hook (safe to call with no pending update)
- Destroy cleanup (no errors, safe double-destroy, destroy before setup, destroyHandlers disconnect observer, plugin.destroy() disconnects observer, safe after destroyHandlers run)
- Gap config (sizeFn returns estimated size with gap=0 default)
- Anchor preservation and scroll compensation (compensates scroll when item above viewport resizes larger, no compensation for items inside or below viewport, snap-to-bottom when at bottom, accumulates deltas from multiple items)

## Test Groups

- **autosize factory** (3 tests): name/priority, independent instances, gap config acceptance
- **autosize setup** (7 tests): setSizeConfig call, destroy handler, isMeasured/setMeasuredSize/getMeasuredCount method registration, onCommit/onIdle hook presence
- **autosize measured size tracking** (2 tests): isMeasured state transitions, getMeasuredCount increments
- **autosize onCommit hook** (3 tests): observes unmeasured elements, skips measured items, clears explicit height
- **autosize onIdle hook** (1 test): safe no-op call
- **autosize destroy** (7 tests): clean destroy, double-destroy safety, destroy before setup, destroyHandler disconnect, plugin.destroy() disconnect, safe after handler run
- **autosize gap config** (1 test): default gap=0 returns estimated size
- **autosize anchor preservation** (4 tests): scroll compensation for above-viewport resizes, no compensation for in-viewport/below-viewport items, snap-to-bottom, multi-item delta accumulation

## Known Gaps

- v1 had 12 tests; v2 has 28 tests (+16). The v2 adds comprehensive anchor preservation / scroll compensation tests and expanded destroy lifecycle tests that did not exist in v1.
- No missing coverage relative to v1.
