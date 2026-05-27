---
test_file: test/core/dom.test.ts
source_files:
  - src/core/dom.ts
coverage:
  tests: 13
  passing: 13
status: passing
v1_delta: -4
tags: [core, dom, aria, container]
---

# Core DOM Tests

## What We Test
- Container resolution from HTMLElement or CSS selector string
- Error handling for missing selectors
- DOM structure creation (root > viewport > content hierarchy)
- Class prefix application to all elements
- ARIA role assignment (listbox vs list) based on interactive flag
- Tabindex presence on content element for interactive mode
- aria-label propagation
- Vertical vs horizontal mode configuration (CSS classes, overflow styles, aria-orientation)

## Test Groups
- **resolveContainer** (3 tests): direct HTMLElement pass-through, string selector resolution, error on missing selector
- **createDOMStructure** (10 tests): element creation, nesting order, class prefix on all elements, listbox role and tabindex on content, list role downgrade for non-interactive, aria-label when provided/absent, vertical mode defaults, horizontal mode configuration

## Known Gaps
- v1 had 17 tests; v2 has 13 (delta: -4)
- v1 tested `items` element (separate from content) and `liveRegion` element creation -- v2 removed the items wrapper and live region from DOM structure, so those 4 tests were intentionally dropped
- No tests for cleanup/teardown of created DOM structure
