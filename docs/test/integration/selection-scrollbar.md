---
test_file: test/integration/selection-scrollbar.test.ts
source_files:
  - src/plugins/selection/plugin.ts
  - src/plugins/scrollbar/plugin.ts
  - src/core/create.ts
coverage:
  tests: 7
  passing: 7
status: passing
v1_delta: null
tags: [integration, selection, scrollbar]
---

# Selection + Scrollbar Integration

## What We Test
- Selection plugin combined with custom scrollbar plugin
- Selecting items with scrollbar present
- Keyboard navigation (selectNext) with scrollbar
- selectAll with scrollbar present
- selection:change event with scrollbar
- ScrollToIndex to selected item with scrollbar
- Clean destroy of both plugins

## Test Groups
- **selection with custom scrollbar** (5 tests): create with both, select items, keyboard navigation, selectAll, selection:change event
- **scrollToIndex with selection** (1 test): scroll to selected item with center alignment
- **destroy with selection + scrollbar** (1 test): clean destroy after selectAll, root removed from DOM

## Known Gaps
- No test for scrollbar visual update when selection changes
- No test for mouse interaction combining scrollbar drag with selection
