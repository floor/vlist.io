---
test_file: test/plugins/sortable/plugin.test.ts
source_files:
  - src/plugins/sortable/plugin.ts
coverage:
  tests: 70
  passing: 70
status: passing
v1_delta: 0
tags: [plugin, sortable, drag-drop, keyboard, accessibility]
---

# Sortable Plugin Tests

## What We Test

- Plugin factory validation (name, priority, conflicts, isSorting method declaration)
- Setup: method registration, destroy handler, pointerdown listener attachment
- Handle config: drag initiation with and without handle selector
- isSorting state tracking across keyboard grab, drop, and cancel
- Pointer drag lifecycle: sort:start on threshold, sort:move on position change, sort:end on pointerup
- Ghost element management: default body append, custom ghostContainer, cleanup
- Keyboard reordering: Space to grab, ArrowDown/ArrowUp to move, Space to drop, Escape to cancel, focus via _focusById, --sorting and --kb-sorting CSS classes, position accumulation, boundary guards
- ARIA attributes: hidden instructions element, aria-roledescription via onCommit hook, cleanup on destroy
- Live region announcements: grab, move, drop, and cancel position announcements
- Edge cases: pointer up below threshold, key blocking in grab mode (allows F-keys and Tab), edge scrolling on drag start, pointer cancel cleanup, escape during pointer drag, drop at same position (sort:cancel), keyboard grab cancelled by pointer drag
- Focus preservation: restore focus after pointer reorder, skip when no prior focus
- Drop index calculation: per-item shifting when dragging down/up, oscillation prevention, large displacement handling, dragIndex within slot
- Visual feedback: --settling class during finalize, drag-source class on dragged item (add, remove, re-apply via onCommit on recycle), escape ghost return animation

## Test Groups

- **factory** (5 tests): name, priority, conflicts (grid, masonry, table, scale), isSorting declaration, config acceptance
- **setup** (3 tests): isSorting method registration, destroy handler registration, pointerdown listener on content container
- **handle config** (3 tests): drag without handle, reject pointerdown outside handle, accept pointerdown on handle
- **isSorting** (4 tests): false initially, true during keyboard grab, false after drop, false after cancel
- **sort events** (6 tests): sort:start on threshold, no start below threshold, sort:end on pointerup, sort:move on position change, no move when position unchanged, sort:end with fromIndex/toIndex
- **ghostContainer** (3 tests): default body append, custom container, cleanup from custom container
- **destroy** (1 test): pointerdown listener removal from content
- **keyboard reordering** (14 tests): Space enters grab, --sorting class, --kb-sorting class, ArrowDown/ArrowUp swap, multi-move accumulation, boundary guards (last index, index 0), Space drops, Escape cancels (removes class, emits sort:cancel), key interception, no grab without focused item, _focusById after move
- **ARIA attributes** (3 tests): hidden instructions element, aria-roledescription via onCommit, instructions removal on destroy
- **live region announcements** (4 tests): grab, move, drop, cancel position text
- **pointer up without drag** (1 test): cleanup without events below threshold
- **keyboard key blocking** (3 tests): blocks unrelated keys, allows F-keys, allows Tab
- **edge scrolling** (2 tests): starts edge scroll loop on drag, clears shifts when pointer leaves viewport
- **pointer cancel** (1 test): cleanup on pointercancel during drag
- **escape cancels pointer drag** (1 test): sort:cancel emission and cleanup
- **drop at same position** (1 test): emits sort:cancel instead of sort:end
- **keyboard grab cancelled by pointer** (1 test): pointer drag cancels active keyboard grab
- **focus preservation** (2 tests): restore focus after reorder, skip when no prior focus
- **drop index calculation** (6 tests): per-item shift down/up, no oscillation on direction reversal, large displacement, dragIndex within slot, full down-then-back-up cycle
- **settling class** (2 tests): added when position changed, added when dropped at same position
- **drag-source class** (3 tests): added to dragged item, removed on cleanup, re-applied via onCommit on element recycle
- **escape animates ghost return** (1 test): animateDrop called on escape during pointer drag

## Known Gaps

- None: all 70 v1 tests are present in v2 (renamed from "feature" to "plugin" terminology, "items" to "content", "afterRenderBatch" to "onCommit hook")
