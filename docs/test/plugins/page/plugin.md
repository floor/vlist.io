---
test_file: test/plugins/page/plugin.test.ts
source_files:
  - src/plugins/page/plugin.ts
coverage:
  tests: 39
  passing: 39
status: passing
v1_delta: -11
tags: [plugin, page, window-scroll]
---

# Page Plugin Tests

## What We Test

- Factory creation with default and custom config
- DOM modifications (overflow hidden, height removal on viewport)
- Context method delegation (disableDefaultScroll, disableDefaultResize, setScrollFns)
- Scroll position functions (getScrollPosition, setScrollPosition using window)
- Handler registration (scroll and resize on window)
- Window resize handler with sub-pixel filtering
- Destroy cleanup (event listener removal, DOM restoration)
- scrollPadding (top/bottom/left/right, dynamic functions, horizontal mode, hero visible scenario)

## Test Groups

- **page - Factory** (2 tests): plugin creation, name/priority
- **page - DOM Modifications** (5 tests): overflow hidden, height removal, viewport style changes
- **page - Context Method Delegation** (5 tests): disableDefaultScroll, disableDefaultResize, setScrollFns wiring
- **page - Scroll Position Functions** (4 tests): getScrollPosition/setScrollPosition using window.scrollY/scrollTo
- **page - Handler Registration** (2 tests): scroll and resize event listeners on window
- **page - Window Resize Handler** (5 tests): resize recalculation, sub-pixel event filtering
- **page - Destroy Cleanup** (5 tests): event listener removal, DOM style restoration
- **page - scrollPadding** (11 tests): static top/bottom/left/right padding, dynamic function padding, horizontal mode, hero visible scenario

## Known Gaps

- v1 had **withPage - scrollPadding scrollToIndex** group (scrollToIndex offset by padding) not yet ported to v2
- v1 had 50 tests total; v2 has 39 — the scrollPadding scrollToIndex integration tests account for the delta
