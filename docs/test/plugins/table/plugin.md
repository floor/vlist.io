---
test_file: test/plugins/table/plugin.test.ts
source_files:
  - src/plugins/table/plugin.ts
  - src/plugins/table/types.ts
coverage:
  tests: 70
  passing: 70
status: passing
v1_delta: -8
tags: [plugin, table, columns, resize, sort, aria]
---

# Table Plugin Tests

## What We Test

- Plugin factory validation (name, priority, conflicts, column/rowHeight requirements)
- DOM setup: table CSS class, ARIA roles (grid, rowgroup), aria-colcount, header creation, header height CSS variable, content min-width
- Render function replacement via setRenderFn (v2 API replacing v1 setRenderFns)
- Engine state tracking: prevRangeStart/End, scrollPosition, renderRange with overscan
- Column resize and sort event emission
- Public API methods: updateColumns, resizeColumn, getColumnWidths, setSort, getSort, _getTableLayout
- Container resize handling: re-resolve column widths, update content min-width
- Sort configuration: initial state from config, default asc direction
- Configuration options: function-based rowHeight, explicit header height, global and per-column resizable
- Destroy cleanup: CSS class removal, role removal (root and content), aria-colcount removal, header element removal, min-width reset, plugin.destroy()
- Integration: cell rendering, virtualization, updateColumns re-render, selection getters, column-borders class, header scroll sync, sort indicator restore, column:sort emission, _updateTableForGroups and _replaceTableRenderer exposure

## Test Groups

- **Factory** (5 tests): name/priority, conflicts with grid/masonry, empty columns throws, missing rowHeight/estimatedRowHeight throws, valid config accepted
- **Setup** (13 tests): table CSS class, role=grid on root, role=rowgroup on content, aria-colcount, horizontal/reverse rejection, header creation, header cells, header height CSS variable, default header height, content min-width, setRenderFn replacement, destroy handler registration
- **Render Functions** (8 tests): setRenderFn replacement, no render if destroyed, first render, skip unchanged position, re-render on scroll change, force render, zero totalItems, zero container height
- **Engine State** (3 tests): prevRangeStart/End update, scrollPosition tracking, renderRange with overscan
- **Events** (2 tests): column:resize on resizeColumn, column:sort on header click
- **Public Methods** (13 tests): updateColumns/resizeColumn/getColumnWidths/setSort/getSort/_getTableLayout exposure, getColumnWidths returns keyed widths, setSort updates state, setSort null clears, resizeColumn by key/index emits event, invalid key no-op, updateColumns rebuilds and re-renders
- **Resize Handler** (3 tests): no errors on resize, re-resolve column widths, update content min-width
- **Sort** (2 tests): initial sort from config, default asc direction
- **Configuration** (5 tests): function-based rowHeight, default header height for function rowHeight, explicit header height, global resizable:false, per-column resizable override
- **Destroy** (6 tests): table CSS class removal, role removal from root and content, aria-colcount removal, header removal, min-width reset, plugin.destroy() cleanup
- **Integration** (10 tests): cell rendering, virtualization, updateColumns re-render, selection getters, column-borders class, header scroll sync, sort indicator after updateColumns, column:sort emission, _updateTableForGroups exposure, _replaceTableRenderer exposure

## Known Gaps

- **column:click event** (v1 tested emit of column:click on header cell click; v2 does not test this separately)
- **range:change events** (v1 had 3 tests for range:change emission on range change, scroll, and no-change; v2 does not test range:change events in the plugin file)
- **content size handler** (v1 tested content size handler invocation; removed in v2 plugin architecture)
- **aria-label migration** (v1 tested moving aria-label from items to root and restoring on destroy; not present in v2)
- **viewportState/lastRenderRange** (v1 tested viewportState.scrollPosition, visibleRange, renderRange, and lastRenderRange; v2 replaced with engineState covering prevRangeStart/End, scrollPosition, renderRange)
- **handler registration** (v1 tested individual registration of afterScroll, resize, destroy, content size handlers; v2 tests destroy handler only, other hooks registered implicitly)
