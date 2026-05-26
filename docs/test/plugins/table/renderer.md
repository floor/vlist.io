---
test_file: test/plugins/table/renderer.test.ts
source_files:
  - src/plugins/table/renderer.ts
  - src/plugins/table/layout.ts
  - src/rendering/sizes.ts
  - src/rendering/scale.ts
  - src/plugins/table/types.ts
coverage:
  tests: 88
  passing: 88
status: passing
v1_delta: 0
tags: [plugin, table, renderer, cells, groups, striped, compressed, pooling]
---

# Table Renderer Tests

## What We Test

- Renderer factory: createTableRenderer returns all required methods
- Row/cell rendering: range-based rendering, cell creation per column, default cell content from item properties, custom cell templates, translateY positioning, row height from sizeCache, cell positioning (left offset and width), row width, DocumentFragment batch insert, ARIA attributes on rows and cells, row borders, column border handling (CSS class, no inline styles)
- Selection and focus: selected/focused CSS classes, aria-selected, selection state updates on re-render
- Change tracking: skip template re-evaluation when item ID unchanged, re-render on ID change, position update on transform change
- Grace period: delayed release of out-of-range rows, release after period expiry
- Element pooling: reuse after clear and re-render
- Element queries: getElement for rendered/non-rendered indices
- Item updates: updateItem cell content, selection state, no-op for non-rendered; updateItemClasses selected/focused class toggle, no-op for non-rendered
- Column layout: updateColumnLayout repositions cells and updates row width
- Clear and destroy: DOM removal, getElement returns undefined after clear
- Cell alignment: left default (no class), center class, right class
- Offset-based rendering: items starting from non-zero offset, index-based getElement
- Null/undefined values: render empty string for null
- Incremental rendering: scrolling through multiple ranges, reuse overlapping rows, empty range handling
- Group headers: setGroupHeaderFn registration, full-width header rows without cells, template content, headerHeight sizing, role=presentation, no aria-selected, mixed data/header rendering, correct cell content alongside headers, mixed-height positioning, type transitions (data to header, header to data), updateItem/updateItemClasses no-op for headers but works for data rows, updateColumnLayout with headers, sizeCache getter pattern, change tracking (skip same header, re-render on ID change), clear/destroy with headers
- Striped rows: odd class on odd indices, disabled by default, explicitly false, preserved with selected/focused classes, correct on ID change/selection change/updateItem/updateItemClasses, offset range striping, scroll range striping, no striped class on group headers, correct after clear, no pooled element class leak
- Compressed positioning: compressed translateY for large tables, absolute when no compression context, position updates on scroll and via updatePositions(), force-mode ratio=1

## Test Groups

- **createTableRenderer** (1 test): factory returns complete method set
- **render** (14 tests): row creation, cell creation, default content, custom templates, translateY, row height, cell positioning, row width, DocumentFragment, ARIA rows, ARIA cells, row borders, column border CSS class, no inline cell borders
- **selection and focus** (4 tests): selected class, focused class, aria-selected, selection update on re-render
- **change tracking** (3 tests): skip on same ID, re-render on ID change, position update
- **grace period release** (2 tests): delayed release, release after expiry
- **element pooling** (1 test): reuse after clear
- **getElement** (2 tests): rendered index, non-rendered index
- **updateItem** (3 tests): cell content update, selection state update, non-rendered no-op
- **updateItemClasses** (3 tests): selected class toggle, focused class toggle, non-rendered no-op
- **updateColumnLayout** (2 tests): cell repositioning, row width update
- **clear** (2 tests): DOM removal, getElement undefined
- **destroy** (1 test): full cleanup
- **cell alignment** (3 tests): left default, center class, right class
- **offset-based rendering** (2 tests): non-zero offset, index-based getElement
- **null and undefined cell values** (1 test): empty string for null
- **incremental rendering** (3 tests): multi-range scrolling, overlapping row reuse, empty range
- **group headers** (22 tests across 10 sub-groups): setGroupHeaderFn (1), rendering group header rows (5), mixed data/headers (3), type transitions (2), updateItem with headers (2), updateItemClasses with headers (2), updateColumnLayout with headers (2), sizeCache getter pattern (1), group header change tracking (2), clear/destroy with headers (2)
- **striped** (14 tests across 6 sub-groups): basic striping (3), striping with selection/focus (2), striping on re-render/update (4), striping with scrolling ranges (2), striping with group headers (1), striping after clear/re-render (2)
- **compressed positioning** (5 tests): compressed translateY, absolute fallback, scroll-based updates, updatePositions(), force-mode ratio=1

## Known Gaps

- None: all 88 v1 tests are present in v2 with identical names
