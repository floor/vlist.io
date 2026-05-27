---
test_file: test/plugins/scrollbar/plugin.test.ts
source_files:
  - src/plugins/scrollbar/plugin.ts
coverage:
  tests: 27
  passing: 27
status: passing
v1_delta: 3
tags: [plugin, scrollbar, integration]
---

# Scrollbar Plugin Tests

## What We Test

- Factory creation with various config options (autoHide, autoHideDelay, minThumbSize, showOnHover, hoverZoneWidth, gutter)
- Setup wiring into PluginContext (CSS class, destroy handler, hooks, internal methods)
- onResize hook updates scrollbar bounds
- onAfterScroll hook updates scrollbar position
- Plugin destroy (cleanup, double-destroy safety, destroy without setup)
- Destroy handler removes CSS class
- Gutter feature (CSS class toggle, cleanup on destroy)

## Test Groups

- **scrollbar - Factory** (8 tests): plugin creation, config acceptance (autoHide, autoHideDelay, minThumbSize, showOnHover, combined, gutter)
- **scrollbar - Setup** (6 tests): CSS class addition, destroy handler registration, onAfterScroll/onResize hooks, internal method registration, destroy handler execution
- **scrollbar - Resize Handler** (2 tests): updateBounds on resize, different dimensions
- **scrollbar - AfterScroll Hook** (3 tests): position update, scroll position 0, large scroll positions
- **scrollbar - Plugin Destroy** (4 tests): destroy cleanup, double-destroy, destroy without setup, CSS class removal on destroy
- **scrollbar - Gutter** (4 tests): gutter class added when enabled, not added by default, not added when false, removed on destroy

## Known Gaps

- v1 had **withScrollbar - Feature Destroy** but lacked the AfterScroll hook tests added in v2
- v2 adds gutter tests and more factory config tests not present in v1
