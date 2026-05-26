---
test_file: test/rendering/aria.test.ts
source_files:
  - src/rendering/aria.ts
coverage:
  tests: 7
  passing: 7
status: passing
v1_delta: 0
tags: [rendering, aria, accessibility]
---

# ARIA Resolvers

## What We Test
- createAriaResolvers lazy resolution of data-space totals and positions
- Fallback to fallbackTotal when _getTotal is not registered in methods map
- Using _getTotal when registered in methods map
- Fallback to layoutIndex + 1 when _layoutToDataIndex is not registered
- Using _layoutToDataIndex when registered (maps layout indices through group headers)
- Lazy caching of resolved functions (methods.get called once per resolver)
- Dynamic fallbackTotal changes reflected without recreation
- Dynamic _getTotal changes reflected without recreation

## Test Groups
- **createAriaResolvers** (7 tests): fallback total, registered _getTotal, fallback posInSet, registered _layoutToDataIndex, lazy caching, dynamic fallbackTotal, dynamic _getTotal

## Known Gaps
- No test for edge case where _layoutToDataIndex returns -1 (header indices)
