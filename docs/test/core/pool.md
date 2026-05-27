---
test_file: test/core/pool.test.ts
source_files:
  - src/core/pool.ts
coverage:
  tests: 27
  passing: 27
status: passing
v1_delta: 4
tags: [core, pool, dom, recycling]
---

# Builder Pool Tests

## What We Test
- Pool factory creation with classPrefix
- Element acquisition: new element creation, element reuse from pool, LIFO stack ordering
- Element release: cleanup of className, innerHTML, style, data-index, data-id, aria-selected, aria-posinset, aria-setsize, role attributes
- Max pool size enforcement (hardcoded at 100)
- Pool clear operation and size tracking
- Edge cases: complex attribute cleanup, duplicate release, elements beyond MAX_POOL_SIZE discarded

## Test Groups
- **createPool** (1 test): factory returns pool with acquire, release, clear methods and size=0
- **acquire** (4 tests): returns new HTMLElement div with classPrefix-item class, different elements on successive calls, recycled element with cleaned content, LIFO stack ordering
- **release** (11 tests): element returned to pool, className reset to classPrefix-item, innerHTML cleared, style attribute removed, data-index removed, data-id removed, aria-selected removed, aria-posinset removed, aria-setsize removed, role removed, max pool size respected (100), duplicate release allowed
- **clear** (4 tests): empties pool so next acquire creates new elements, pooling works after clear, safe on empty pool, size resets to 0
- **pool lifecycle** (3 tests): many acquire/release cycles with max size cap, role attribute stays null across cycles, size tracking accuracy
- **edge cases** (4 tests): complex multi-attribute cleanup, 100 elements all recycled within limit, elements beyond MAX_POOL_SIZE discarded on release, pool size capped at 100

## Known Gaps
- v1 had 23 tests; v2 has 27 (delta: +4) -- net gain
- v1 tested custom maxSize parameter (0, 1, very large) -- v2 hardcodes MAX_POOL_SIZE=100, so custom maxSize tests were replaced with hardcoded-limit tests
- v1 tested className clearing; v2 tests className reset to classPrefix-item (behavior change)
