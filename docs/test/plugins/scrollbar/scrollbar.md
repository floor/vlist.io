---
test_file: test/plugins/scrollbar/scrollbar.test.ts
source_files:
  - src/plugins/scrollbar/scrollbar.ts
coverage:
  tests: 85
  passing: 85
status: passing
v1_delta: 0
tags: [plugin, scrollbar, ui, dom, drag]
---

# Scrollbar UI Tests

## What We Test

- createScrollbar initialization (DOM structure, track/thumb elements)
- updateBounds (thumb sizing based on viewport/content ratio, visibility toggle)
- updatePosition (thumb translate based on scroll position)
- show/hide methods (CSS class toggling)
- Track click (jump to clicked position)
- clickBehavior modes (jump, page, scroll with repeat, clamping, auto-hide)
- Thumb drag (dragging class, mouseup cleanup)
- Auto-hide (timer-based hide after scroll stops)
- Destroy (DOM cleanup, event listener removal)
- Viewport hover (show on hover)
- Configuration (minThumbSize, padding CSS variables with uniform/per-side/partial/zero/unset, thumb travel with padding, hover zone width)
- Horizontal mode (classes, thumb width, translateX, track click, thumb drag, destroy)
- Full drag sequence (onScroll during drag, immediate thumb update, final position, listener cleanup, auto-hide after drag, no hide during drag, sequential drags, preventDefault)
- Viewport leave (auto-hide timer, no hide during drag, cancel timer on re-enter)
- Edge cases (zero content height, extreme ratios)
- Destroy with pending RAF

## Test Groups

- **initialization** (3 tests): DOM structure creation, track/thumb elements, CSS classes
- **updateBounds** (8 tests): thumb sizing, viewport/content ratio, visibility toggle, min/max bounds
- **updatePosition** (3 tests): thumb translateY from scroll position, boundary clamping
- **show / hide** (3 tests): CSS class toggling, visibility state
- **track click** (1 test): click on track jumps to position
- **clickBehavior** (10 tests): jump mode, page mode, scroll mode, repeat clicks, clamping, auto-hide integration
- **thumb drag** (2 tests): dragging CSS class, mouseup listener cleanup
- **auto-hide** (2 tests): timer-based hide, timer reset on new scroll
- **destroy** (3 tests): DOM removal, event listener cleanup, safe double-destroy
- **viewport hover** (1 test): show scrollbar on viewport hover
- **configuration** (17 tests): minThumbSize, padding CSS variables (uniform, per-side, partial, zero, unset), thumb travel with padding, hover zone width
- **horizontal mode** (12 tests): horizontal CSS classes, thumb width, translateX, track click, thumb drag, destroy
- **full drag sequence** (8 tests): onScroll callback during drag, immediate thumb update, final position, listener cleanup, auto-hide after drag, no hide during active drag, sequential drags, preventDefault
- **viewport leave** (4 tests): auto-hide timer on leave, no hide during drag, cancel timer on re-enter
- **edge cases** (6 tests): zero content height, extreme viewport/content ratios, boundary conditions
- **scroll/scrollbar - destroy with pending animation frame** (2 tests): destroy cancels pending RAF

## Known Gaps

- None; v1 and v2 have identical test counts and groups
