---
test_file: test/integration/async-page.test.ts
source_files:
  - src/plugins/async/plugin.ts
  - src/plugins/page/plugin.ts
  - src/core/create.ts
coverage:
  tests: 12
  passing: 12
status: passing
v1_delta: null
tags: [integration, async, page]
---

# Async + Page Integration

## What We Test
- Async data loading combined with page (window scroll) plugin
- Initial data chunk loading on creation
- Placeholder rendering before data arrives and replacement after load
- Reload via the reload method
- autoLoad: false suppressing initial load and manual loadVisibleRange
- Adapter error handling (network errors)
- Destroy cleanup with async resources
- No loads triggered after destroy

## Test Groups
- **async data loading** (4 tests): initial load, total from adapter, placeholder rendering, placeholder replacement after data arrives
- **async with page** (2 tests): window scroll mode with async, scroll padding configuration
- **reload** (1 test): reload triggers additional adapter reads
- **autoLoad** (2 tests): suppress initial load, manual load after autoLoad: false
- **error handling** (1 test): adapter throws network error, list remains stable
- **destroy with async** (2 tests): clean destroy, no loads after destroy

## Known Gaps
- No test for concurrent scroll-triggered loads during page mode
- No test for adapter returning hasMore: false to stop further loads
