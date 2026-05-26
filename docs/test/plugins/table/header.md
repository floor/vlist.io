---
test_file: test/plugins/table/header.test.ts
source_files:
  - src/plugins/table/header.ts
  - src/plugins/table/layout.ts
  - src/plugins/table/types.ts
coverage:
  tests: 63
  passing: 63
status: passing
v1_delta: 0
tags: [plugin, table, header, sort, resize, keyboard, accessibility]
---

# Table Header Tests

## What We Test

- Header DOM structure: rowgroup insertion, row element with ARIA, header height, scroll container, CSS custom property, custom class prefix
- Cell creation: ARIA roles (columnheader, aria-colindex), data-column-key, string/DOM labels, custom header templates (string and DOM return), alignment modifier classes
- Sort indicators: sortable class and indicator for sortable columns, ascending/descending indicators, clearing on column change and null key, no indicator for non-sortable
- Resize handles: pointer drag on handles, MIN_DRAG_DELTA threshold, ignore non-resize elements, handle pointerup when not dragging, active class during drag
- Scroll sync: translate scroll container by negative scrollLeft, handle zero scroll
- Click interaction: onSort callback for sortable cells, onClick for any cell, sort cycling (asc to desc to null), no sort for non-sortable, ignore clicks on resize handles, no-op without layout
- Keyboard navigation: tabindex management, ArrowRight/ArrowLeft focus movement, boundary guards, Home/End jump, Enter/Space triggers sort on sortable columns, sort direction cycling via keyboard, no sort on non-sortable, Ctrl+ArrowRight/Left column resize, non-resizable column rejection, ArrowDown returns focus to grid body
- Visibility toggle: hide/show header, idempotent hide/show
- Destroy: rowgroup removal, header height CSS variable clearance
- Rebuild: cell clearing, sort indicator restoration, scroll container width, cell widths, width updates

## Test Groups

- **DOM setup** (6 tests): rowgroup insertion, row ARIA, header height, scroll container, CSS variable, custom class prefix
- **rebuild** (15 tests): cell creation, ARIA attributes, data-column-key, string labels, DOM labels, custom templates (string/DOM return), alignment classes (center, right, left default), sortable class/indicator, non-sortable omission, resize handles, cell clearing, sort indicator restore, scroll container width, cell widths, width update
- **update** (3 tests): scroll container width, cell widths, width update with new layout
- **sort** (5 tests): ascending indicator, descending indicator, clear on different column, clear all on null key, updateSort before rebuild
- **syncScroll** (2 tests): negative scrollLeft translation, zero scroll
- **click interaction** (6 tests): onSort on sortable click, onClick on any click, sort cycling, non-sortable rejection, resize handle click ignore, no layout no-op
- **resize interaction** (5 tests): onResize during pointer drag, MIN_DRAG_DELTA threshold, non-resize element ignore, pointerup without drag, active class on handle
- **keyboard navigation** (15 tests): tabindex setup (first=0, rest=-1), ArrowRight/Left focus, boundary guards (first/last), Home/End jump, Enter/Space sort trigger, sort direction cycling, non-sortable rejection, Ctrl+ArrowRight/Left resize, non-resizable rejection, ArrowDown to grid body
- **visibility** (4 tests): hide, show after hide, idempotent show, idempotent hide
- **destroy** (2 tests): rowgroup removal, CSS variable clearance

## Known Gaps

- None: all 63 v1 tests are present in v2 with identical names
