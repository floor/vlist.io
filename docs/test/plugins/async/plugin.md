---
test_file: test/plugins/async/plugin.test.ts
source_files:
  - src/plugins/async/plugin.ts
coverage:
  tests: 33
  passing: 33
status: passing
v1_delta: -66
tags: [plugin, async, integration, lifecycle]
---

# Async Plugin Tests

## What We Test

- Factory creation with adapter, loading config, and onIdle hook
- Setup wiring into PluginContext (reload, loadVisibleRange, getTotal, setTotal methods)
- Destroy handler registration during setup
- Initial load via adapter.read on setup (autoLoad: true default)
- load:start / load:end event emission
- ARIA attributes (aria-busy toggled on load events)
- Error handling when adapter.read throws
- Reload method (forceRender, scrollTo(0), re-calls adapter.read)
- autoLoad: false with explicit total (skip initial load, register total)
- onIdle hook (no-op when no pending range, no-op when destroyed)
- loadVisibleRange method (triggers forceRender, no-op when visibleCount is 0)
- Network recovery via window 'online' event (re-loads visible range, skips when destroyed)
- Destroy cleanup (idle timer, online listener, plugin.destroy())

## Test Groups

- **async - Factory** (4 tests): plugin name/priority, loading config acceptance, default thresholds, onIdle hook presence
- **async - Setup** (5 tests): reload/loadVisibleRange method registration, destroy handler, loadInitial on setup, load:start emission
- **async - ARIA Attributes** (2 tests): aria-busy set on load:start, removed on load:end
- **async - Error Handling** (1 test): adapter errors on loadInitial do not crash
- **async - Reload Method** (4 tests): forceRender call, scrollTo(0), adapter.read re-call with autoLoad, no adapter.read with autoLoad: false
- **async - autoLoad: false with total** (4 tests): total set without loading, getTotal/setTotal method registration, setTotal updates total
- **async - onIdle Hook** (2 tests): safe call with no pending range, skipped when destroyed
- **async - loadVisibleRange Method** (2 tests): triggers forceRender, skips ensureRange when visibleCount is 0
- **async - Network Recovery** (3 tests): online event does not crash, skips ensureRange when destroyed, cleanup on destroy
- **async - Destroyed State** (1 test): onIdle skipped when destroyed
- **async - Destroy Cleanup** (2 tests): idle timer cleanup, plugin.destroy() safe
- (3 tests uncategorized in remaining describe blocks)

## Known Gaps

- v1 had **feature.test.ts** (77 tests) + **integration.test.ts** (22 tests) = 99 tests covering the async feature layer. v2 plugin.test.ts has 33 tests (-66). Many v1 integration tests (cross-feature composition with builder, scroll-driven loading, placeholder rendering) are not yet ported to v2.
- v1 integration tests covered scroll-triggered ensureRange, placeholder display during loading, and multi-page sequential loading — these scenarios are not directly tested in the v2 plugin file.
