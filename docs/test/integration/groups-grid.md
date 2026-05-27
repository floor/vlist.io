---
test_file: test/integration/groups-grid.test.ts
source_files:
  - src/plugins/groups/plugin.ts
  - src/plugins/selection/plugin.ts
  - src/core/create.ts
coverage:
  tests: 6
  passing: 6
status: passing
v1_delta: null
tags: [integration, groups, selection]
---

# Groups + Selection Integration

## What We Test
- Groups plugin combined with selection plugin
- Selecting items across different groups
- Clearing selection across groups (selectAll then clearSelection)
- Group header rendering in the DOM
- Items rendered alongside group headers
- Destroy cleanup with groups + selection

## Test Groups
- **groups with selection** (3 tests): create with both plugins, select across groups, clear selection across groups
- **groups rendering** (2 tests): group header elements rendered, items rendered alongside headers
- **destroy with groups** (1 test): clean destroy with groups + selection

## Known Gaps
- No test for sticky header behavior during scroll
- No test for groups + grid combined (the file name says groups-grid but it tests groups + selection)
- No test for group collapse/expand
