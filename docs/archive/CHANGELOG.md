## [1.5.3] - 2026-04-14

### Added

- **selection**: Add Shift+keyboard range selection in multiple mode

## [1.5.2] - 2026-04-14

### Added

- **snapshots**: Add autoSave for automatic sessionStorage save/restore (#12)
- **core**: Rename accessible config to interactive (#19)

## [1.5.1] - 2026-04-14

### Added

- **table**: Left/Right arrow keys scroll horizontally by column width
- **build**: Write dist/size.json with accurate tree-shaken base bundle size
- **styles**: Modular CSS, rgba state colors, striped/selected fix, dark mode consistency
- Add scroll.gutter option for native scrollbar space reservation

### Changed

- **groups,table**: Optimize feature bundle sizes
- **builder**: Remove unused measurement.ts, fix build.ts unused var
- **core**: Reduce base bundle from 11.3 KB to 10.3 KB gzipped

### Fixed

- **autoSize**: Smooth scroll to bottom without visible correction jump
- **autoSize**: Scroll-to-bottom not reaching the end with auto-sized items
- **selection**: Preserve selection across async loading
- **scale**: Keyboard navigation broken in compressed scroll mode
- **a11y**: Home/End navigate to first/last item in grid mode
- **build**: Use wrapper entry points to prevent Bun tree-shaking dist
- Use position:relative for group sticky header, remove viewport margin-top
- Add gutter to BuilderConfig.scroll inline type (TS2353)

## [1.4.4] - 2026-04-11

### Changed

- O(1)/O(log k) masonry navigation with per-lane index arrays

### Fixed

- **async**: Reset scroll position to 0 on reload
- Add missing i2s to MRefs mock in materialize test
- **selection**: Use scroll-if-needed on focusin instead of center-scroll
- Non-null assertion for groupLayout in groups feature
- PreventDefault for recognized nav keys at boundaries in navigate path
- Swap arrow keys for horizontal orientation in grid/masonry nav
- Grid/masonry keyboard navigation and scroll-on-click

## [1.4.3] - 2026-04-10

### Added

- **groups**: Orientation-aware header config (height/width)
- **groups**: Compat layer for legacy headerHeight/headerTemplate
- **groups**: Collapse first inline header when sticky headers are active

### Changed

- **sticky**: Template-driven via renderInto callback
- **sticky**: Pre-cache offsets/sizes, inline small functions, compact module
- **sticky**: Optimize scroll-tick hot path and fix variable-height headers

### Fixed

- Null assertion for groupLayout in renderInto closure
- **css**: Remove redundant .vlist-sticky-group rule
- **sticky**: Update container size in complete() for variable header heights
- Align push transition timing with viewport-below-header layout
- Rewrite sticky header with slider-based push transition (#8)
- Push viewport below sticky header — scrollbar no longer overlaps (#8)

## [1.4.2] - 2026-04-10

### Added

- Scroll.wrap support in core baseline + followFocus option (#4)

### Changed

- Core single-select baseline + shared scrollToFocus (#4)

### Fixed

- Resolve typecheck errors — unused variable and parameter
- Remove container :focus-visible outline per WAI-ARIA Listbox pattern (#9)
- Include CSS padding in compression slack + rename bottomPad → slack
- Scrollbar reaches bottom + remove debug logs + fix tests
- Eliminate bottom gap by using exact padding formula
- Arrow-down from top no longer scrolls unnecessarily
- Use fractional item count for bottom-edge alignment in scrollToFocus
- Replace near-bottom interpolation with bottom padding for compressed scroll (#7)
- Empty list after End → Tab → Shift+Tab in compressed mode (#2)
- Skip group headers in focus and selection (#5)
- Account for CSS padding in scrollToFocus edge-scroll
- Hide focus ring on mouse click, show only on keyboard navigation
- **core**: Add PageUp/PageDown to baseline keyboard handler
- **scale**: Correct scroll-to-index alignment in compressed mode

## [1.4.1] - 2026-04-09

### Added

- Contextual error reporting
- **selection**: Add selectNext and selectPrevious methods
- **core**: Add accessible config to disable keyboard navigation
- **async**: Add reload({ snapshot }) for automatic scroll restore
- **async**: Add skipInitialLoad option to reload for snapshot restore optimization
- **scale**: Add force option to enable compressed mode on any list size
- **utils**: Export createStats and types from public API
- **api**: Expose getItemAt and getIndexById on public VList API
- **vlist**: Complete V1 code review — items #7, #10, #13b/d, #14b/c
- **table**: Add placeholder skeleton styling for table rows
- **styles**: Add consolidated dark mode support with prefers-color-scheme, .dark class, and color-scheme
- **striped**: Add "data", "even", "odd" modes for group-aware striping
- **export**: Clean up
- **padding**: Move padding from item config to top-level CSS-based approach
- **item**: Add padding property for content inset at list boundaries
- **item**: Add gap property for consistent spacing between items
- **utils**: Add createStats module for scroll statistics
- **events**: Add scroll:idle and destroy events
- **table**: Add striped row style with dedicated --vlist-bg-striped variable
- **table**: Add withGroups compatibility for grouped data tables
- **a11y**: Reorder DOM children on scroll idle for screen readers
- **item**: Add striped option for reliable zebra-stripe styling
- **table**: Add withTable feature — virtualized data table with columns, resize, sort
- **grid,masonry**: Responsive resize with context injection
- **selection**: Scope hover highlight and pointer cursor behind --selectable class
- **a11y**: Keyboard focus, focus-visible, and baseline navigation
- **types**: Add VListConfig type for framework adapters

### Changed

- **scale**: Remove redundant destroy cleanup, add clamping tests
- **scroll**: Raise LOAD_VELOCITY_THRESHOLD from 5 to 12 px/ms
- **range**: Move padding-aware scroll logic into calcScrollToPosition
- **builder**: Extract measurement and api modules, simplify wheel handler
- Reorganize constant sections by feature
- Clean up constant naming conventions
- **table**: Micro-optimizations for runtime performance
- **table**: Move inline styles to dedicated CSS file
- Rename withSections to withGroups
- Rename MAX_VIRTUAL_HEIGHT → MAX_VIRTUAL_SIZE, GridHeightContext → GridSizeContext
- **types**: Rename BuiltVList to VList, remove legacy types

### Fixed

- **css**: Hide container focus outline when a row is selected
- **table**: Keyboard focus/selection classes not applied in table mode
- **selection**: Keyboard scroll in compressed mode (scale)
- **selection**: Smart keyboard scroll + PageUp/PageDown support (#3)
- **table**: Add compressed positioning support for withScale compatibility
- **scale**: Normalize scroll sensitivity for compressed lists
- **api**: Re-apply template on updateItem for all renderers
- **grid**: Add placeholder class support to grid renderer
- **test**: Type restoreScrollMock parameter to fix TS2493 tuple error
- **scale**: Propagate clamped scroll position through scrollTo pipeline
- **scale**: Complete force compression lifecycle — native scroll sync, grid state, drift guard
- **scale**: Use exact offset math when ratio=1 to eliminate bottom gap
- **render**: Clear stale DOM nodes when last item removed — empty range returns end:-1
- **test**: Apply CI_MULTIPLIER to all timing thresholds in performance tests
- **ci**: Pin setup-bun to v2.1.3 to avoid transient 401 errors
- **test**: Apply CI_MULTIPLIER to grid scroll performance threshold
- **types**: Widen removeItem signature to string | number, fix mock types in tests
- **async**: Convert row-space renderRange to item indices when grid is active
- **async**: Optimize removeItem — force render, debounced gap refill, O(cached) shift
- **async**: Shift items in sparse storage on removeItem
- **async**: Use live render range in loadPendingRange instead of stale saved coordinates
- **table**: Account for cross-axis padding in column width resolution
- **async**: Eagerly analyze placeholder structure on first setItems with adapter
- **tests**: Add missing getStripeIndexFn, setStripeIndexFn and sif to mock contexts
- **masonry**: Extract overscan constant and reduce release grace
- **table**: Reduce excessive DOM elements and remove grace period
- **grid**: Reduce excessive DOM elements in render range
- **rendering**: Minimal-move DOM sort to preserve :hover state on scroll idle
- **test**: Resolve 6 type errors in builder test stubs
- **core**: Replace UA sniffing with pointer: coarse detection
- **table**: Add missing TestItem generic to withTable call in sort test
- **table**: Resolve ARIA required-children violations
- Resolve type errors in test files
- **grid,masonry**: Implement smooth scrollToIndex with createSmoothScroll
- **scroll**: Skip core wheel handler when compression is active
- **scroll**: Use DOM scroll limit in wheel handler, reset velocity at boundary
- **async**: Add deceleration debounce and boundary flush to prevent excessive API requests
- **scroll**: Allow horizontal scrolling in wheel handler for tables with wide columns
- **a11y**: Move role=listbox from root to items container
- **table**: Center resize handle on column border with pseudo-element
- **table**: Reset inherited vlist-item border-bottom on table rows
- **builder**: Skip only undefined items in render loop, not falsy values
- **grid**: Remove trailing gap at bottom of grid
- **a11y**: Clear focus ring on blur and remove viewport from tab order
- **builder**: Revert core inlined renderer optimizations causing positioning bug

## [1.4.0] - 2026-04-06

### Added

- Contextual error reporting
- **selection**: Add selectNext and selectPrevious methods
- **core**: Add accessible config to disable keyboard navigation
- **async**: Add reload({ snapshot }) for automatic scroll restore
- **async**: Add skipInitialLoad option to reload for snapshot restore optimization
- **scale**: Add force option to enable compressed mode on any list size
- **utils**: Export createStats and types from public API
- **api**: Expose getItemAt and getIndexById on public VList API
- **vlist**: Complete V1 code review — items #7, #10, #13b/d, #14b/c
- **table**: Add placeholder skeleton styling for table rows
- **styles**: Add consolidated dark mode support with prefers-color-scheme, .dark class, and color-scheme
- **striped**: Add "data", "even", "odd" modes for group-aware striping
- **export**: Clean up
- **padding**: Move padding from item config to top-level CSS-based approach
- **item**: Add padding property for content inset at list boundaries
- **item**: Add gap property for consistent spacing between items
- **utils**: Add createStats module for scroll statistics
- **events**: Add scroll:idle and destroy events
- **table**: Add striped row style with dedicated --vlist-bg-striped variable
- **table**: Add withGroups compatibility for grouped data tables
- **a11y**: Reorder DOM children on scroll idle for screen readers
- **item**: Add striped option for reliable zebra-stripe styling
- **table**: Add withTable feature — virtualized data table with columns, resize, sort
- **grid,masonry**: Responsive resize with context injection
- **selection**: Scope hover highlight and pointer cursor behind --selectable class
- **a11y**: Keyboard focus, focus-visible, and baseline navigation
- **types**: Add VListConfig type for framework adapters

### Changed

- **scroll**: Raise LOAD_VELOCITY_THRESHOLD from 5 to 12 px/ms
- **range**: Move padding-aware scroll logic into calcScrollToPosition
- **builder**: Extract measurement and api modules, simplify wheel handler
- Reorganize constant sections by feature
- Clean up constant naming conventions
- **table**: Micro-optimizations for runtime performance
- **table**: Move inline styles to dedicated CSS file
- Rename withSections to withGroups
- Rename MAX_VIRTUAL_HEIGHT → MAX_VIRTUAL_SIZE, GridHeightContext → GridSizeContext
- **types**: Rename BuiltVList to VList, remove legacy types

### Fixed

- **table**: Add compressed positioning support for withScale compatibility
- **scale**: Normalize scroll sensitivity for compressed lists
- **api**: Re-apply template on updateItem for all renderers
- **grid**: Add placeholder class support to grid renderer
- **test**: Type restoreScrollMock parameter to fix TS2493 tuple error
- **scale**: Propagate clamped scroll position through scrollTo pipeline
- **scale**: Complete force compression lifecycle — native scroll sync, grid state, drift guard
- **scale**: Use exact offset math when ratio=1 to eliminate bottom gap
- **render**: Clear stale DOM nodes when last item removed — empty range returns end:-1
- **test**: Apply CI_MULTIPLIER to all timing thresholds in performance tests
- **ci**: Pin setup-bun to v2.1.3 to avoid transient 401 errors
- **test**: Apply CI_MULTIPLIER to grid scroll performance threshold
- **types**: Widen removeItem signature to string | number, fix mock types in tests
- **async**: Convert row-space renderRange to item indices when grid is active
- **async**: Optimize removeItem — force render, debounced gap refill, O(cached) shift
- **async**: Shift items in sparse storage on removeItem
- **async**: Use live render range in loadPendingRange instead of stale saved coordinates
- **table**: Account for cross-axis padding in column width resolution
- **async**: Eagerly analyze placeholder structure on first setItems with adapter
- **tests**: Add missing getStripeIndexFn, setStripeIndexFn and sif to mock contexts
- **masonry**: Extract overscan constant and reduce release grace
- **table**: Reduce excessive DOM elements and remove grace period
- **grid**: Reduce excessive DOM elements in render range
- **rendering**: Minimal-move DOM sort to preserve :hover state on scroll idle
- **test**: Resolve 6 type errors in builder test stubs
- **core**: Replace UA sniffing with pointer: coarse detection
- **table**: Add missing TestItem generic to withTable call in sort test
- **table**: Resolve ARIA required-children violations
- Resolve type errors in test files
- **grid,masonry**: Implement smooth scrollToIndex with createSmoothScroll
- **scroll**: Skip core wheel handler when compression is active
- **scroll**: Use DOM scroll limit in wheel handler, reset velocity at boundary
- **async**: Add deceleration debounce and boundary flush to prevent excessive API requests
- **scroll**: Allow horizontal scrolling in wheel handler for tables with wide columns
- **a11y**: Move role=listbox from root to items container
- **table**: Center resize handle on column border with pseudo-element
- **table**: Reset inherited vlist-item border-bottom on table rows
- **builder**: Skip only undefined items in render loop, not falsy values
- **grid**: Remove trailing gap at bottom of grid
- **a11y**: Clear focus ring on blur and remove viewport from tab order
- **builder**: Revert core inlined renderer optimizations causing positioning bug

## [1.3.9] - 2026-03-30

### Added

- **selection**: Add selectNext and selectPrevious methods
- **core**: Add accessible config to disable keyboard navigation
- **async**: Add reload({ snapshot }) for automatic scroll restore
- **async**: Add skipInitialLoad option to reload for snapshot restore optimization
- **scale**: Add force option to enable compressed mode on any list size
- **utils**: Export createStats and types from public API
- **api**: Expose getItemAt and getIndexById on public VList API

### Fixed

- **api**: Re-apply template on updateItem for all renderers
- **grid**: Add placeholder class support to grid renderer
- **test**: Type restoreScrollMock parameter to fix TS2493 tuple error
- **scale**: Propagate clamped scroll position through scrollTo pipeline
- **scale**: Complete force compression lifecycle — native scroll sync, grid state, drift guard
- **scale**: Use exact offset math when ratio=1 to eliminate bottom gap
- **render**: Clear stale DOM nodes when last item removed — empty range returns end:-1
- **test**: Apply CI_MULTIPLIER to all timing thresholds in performance tests
- **ci**: Pin setup-bun to v2.1.3 to avoid transient 401 errors

## [1.3.7] - 2026-03-12

### Added

- **vlist**: Complete V1 code review — items #7, #10, #13b/d, #14b/c

### Fixed

- **test**: Apply CI_MULTIPLIER to grid scroll performance threshold

## [1.3.6] - 2026-03-11

### Added

- **table**: Add placeholder skeleton styling for table rows

### Fixed

- **types**: Widen removeItem signature to string | number, fix mock types in tests
- **async**: Convert row-space renderRange to item indices when grid is active
- **async**: Optimize removeItem — force render, debounced gap refill, O(cached) shift
- **async**: Shift items in sparse storage on removeItem
- **async**: Use live render range in loadPendingRange instead of stale saved coordinates

## [1.3.5] - 2026-03-09

### Fixed

- **table**: Account for cross-axis padding in column width resolution
- **async**: Eagerly analyze placeholder structure on first setItems with adapter

## [1.3.4] - 2026-03-09

### Added

- **styles**: Add consolidated dark mode support with prefers-color-scheme, .dark class, and color-scheme
- **striped**: Add "data", "even", "odd" modes for group-aware striping
- **export**: Clean up
- **padding**: Move padding from item config to top-level CSS-based approach
- **item**: Add padding property for content inset at list boundaries
- **item**: Add gap property for consistent spacing between items

### Changed

- **range**: Move padding-aware scroll logic into calcScrollToPosition

### Fixed

- **tests**: Add missing getStripeIndexFn, setStripeIndexFn and sif to mock contexts

## [1.3.2] - 2026-03-08

### Changed

- **builder**: Extract measurement and api modules, simplify wheel handler

## [1.3.1] - 2026-03-07

### Added

- **utils**: Add createStats module for scroll statistics
- **events**: Add scroll:idle and destroy events

### Changed

- Reorganize constant sections by feature
- Clean up constant naming conventions

### Fixed

- **masonry**: Extract overscan constant and reduce release grace
- **table**: Reduce excessive DOM elements and remove grace period
- **grid**: Reduce excessive DOM elements in render range
- **rendering**: Minimal-move DOM sort to preserve :hover state on scroll idle

## [1.3.0] - 2026-03-06

### Fixed

- **test**: Resolve 6 type errors in builder test stubs
- **core**: Replace UA sniffing with pointer: coarse detection
- **table**: Add missing TestItem generic to withTable call in sort test

## [1.2.9] - 2026-03-06

### Added

- **table**: Add striped row style with dedicated --vlist-bg-striped variable

### Fixed

- **table**: Resolve ARIA required-children violations
- Resolve type errors in test files

## [1.2.8] - 2026-03-05

### Added

- **table**: Add withGroups compatibility for grouped data tables
- **a11y**: Reorder DOM children on scroll idle for screen readers

### Fixed

- **grid,masonry**: Implement smooth scrollToIndex with createSmoothScroll

## [1.2.5] - 2026-03-02

### Fixed

- **scroll**: Skip core wheel handler when compression is active

## [1.2.4] - 2026-03-02

### Fixed

- **scroll**: Use DOM scroll limit in wheel handler, reset velocity at boundary
- **async**: Add deceleration debounce and boundary flush to prevent excessive API requests
- **scroll**: Allow horizontal scrolling in wheel handler for tables with wide columns

## [1.2.3] - 2026-03-02

### Added

- **item**: Add striped option for reliable zebra-stripe styling
- **table**: Add withTable feature — virtualized data table with columns, resize, sort
- **grid,masonry**: Responsive resize with context injection
- **selection**: Scope hover highlight and pointer cursor behind --selectable class
- **a11y**: Keyboard focus, focus-visible, and baseline navigation
- **types**: Add VListConfig type for framework adapters

### Changed

- **table**: Micro-optimizations for runtime performance
- **table**: Move inline styles to dedicated CSS file
- Rename withSections to withGroups
- Rename MAX_VIRTUAL_HEIGHT → MAX_VIRTUAL_SIZE, GridHeightContext → GridSizeContext
- **types**: Rename BuiltVList to VList, remove legacy types

### Fixed

- **a11y**: Move role=listbox from root to items container
- **table**: Center resize handle on column border with pseudo-element
- **table**: Reset inherited vlist-item border-bottom on table rows
- **builder**: Skip only undefined items in render loop, not falsy values
- **grid**: Remove trailing gap at bottom of grid
- **a11y**: Clear focus ring on blur and remove viewport from tab order
- **builder**: Revert core inlined renderer optimizations causing positioning bug

## [1.2.2] - 2026-03-01

### Added

- **table**: Add withTable feature — virtualized data table with columns, resize, sort
- **grid,masonry**: Responsive resize with context injection
- **selection**: Scope hover highlight and pointer cursor behind --selectable class
- **a11y**: Keyboard focus, focus-visible, and baseline navigation
- **types**: Add VListConfig type for framework adapters

### Changed

- **table**: Micro-optimizations for runtime performance
- **table**: Move inline styles to dedicated CSS file
- Rename withSections to withGroups
- Rename MAX_VIRTUAL_HEIGHT → MAX_VIRTUAL_SIZE, GridHeightContext → GridSizeContext
- **types**: Rename BuiltVList to VList, remove legacy types

### Fixed

- **table**: Center resize handle on column border with pseudo-element
- **table**: Reset inherited vlist-item border-bottom on table rows
- **builder**: Skip only undefined items in render loop, not falsy values
- **grid**: Remove trailing gap at bottom of grid
- **a11y**: Clear focus ring on blur and remove viewport from tab order
- **builder**: Revert core inlined renderer optimizations causing positioning bug

## [1.2.0] - 2026-03-01

### Added

- **grid,masonry**: Responsive resize with context injection
- **selection**: Scope hover highlight and pointer cursor behind --selectable class
- **a11y**: Keyboard focus, focus-visible, and baseline navigation
- **types**: Add VListConfig type for framework adapters

### Changed

- Rename withSections to withGroups
- Rename MAX_VIRTUAL_HEIGHT → MAX_VIRTUAL_SIZE, GridHeightContext → GridSizeContext
- **types**: Rename BuiltVList to VList, remove legacy types

### Fixed

- **grid**: Remove trailing gap at bottom of grid
- **a11y**: Clear focus ring on blur and remove viewport from tab order
- **builder**: Revert core inlined renderer optimizations causing positioning bug

## [1.0.0] - 2026-02-26

### Added

- **masonry**: Add masonry layout feature with shortest-lane placement

### Changed

- **grid**: Remove tick() — always call render(), rely on change tracking
- **selection**: Feed selection state through render pipeline instead of DOM bypass
- **builder**: Apply patterns 9-11 to core inlined renderer
- **renderer**: Apply patterns 9-11 — grace period, change tracking, lazy fragment
- **grid**: Apply feature optimization playbook
- **masonry**: Reduce bundle weight — flatten types, remove dead code
- **masonry**: Optimize scroll hot path and fix boundary thrashing

### Fixed

- **scale**: Correct scrollbar detection to prevent duplicates

## [0.9.9] - 2026-02-24

### Added

- **async**: Reload visible placeholders on network recovery

### Changed

- **selection**: Avoid O(total) rebuildIdIndex with async data

## [0.9.8] - 2026-02-24

### Fixed

- **grid**: Rebuild size cache on resize for dynamic height functions
- **core**: Use main-axis dimension for containerSize in horizontal mode
- **grid**: Use cross-axis container dimension for horizontal grid sizing
- **grid**: Swap CSS width/height in horizontal mode for correct aspect ratio

## [0.9.6] - 2026-02-24

### Added

- **rendering**: Add Mode B auto-measurement with MeasuredSizeCache
- **placeholder**: Per-item length profiles from first batch, CSS-driven skeleton
- **snapshots**: Add restore config, total in snapshot, NaN guard, tests
- **async**: Add storage config option for chunk size control
- **async**: Add autoLoad option to defer initial data loading
- **scroll**: Implement scroll.wheel and scroll.scrollbar config options

### Fixed

- **snapshots**: Restore scroll position with async autoLoad:false
- **async**: Restore placeholder replacement in onItemsLoaded and reload
- **async**: Prevent duplicate requests on reload and optimize initial load
- **types**: Add ScrollConfig type annotation to fix TypeScript error
- **types**: Add disableWheelHandler stub to simplified context
- **scale**: Prevent scroll beyond bottom + rename variables for horizontal support
- **page**: Prevent scroll conflicts in window scroll mode

## [0.9.2] - 2026-02-22

### Changed

- Complete plugin→feature terminology migration
- Rename plugin to feature for consistency

### Fixed

- **tests**: Resolve all TypeScript errors in test files
- Remove unused Range import in sections/feature.ts

## [0.9.1] - 2026-02-21

### Added

- **grid**: Allow horizontal orientation

### Fixed

- **grid**: Swap axes for horizontal orientation positioning
- **builder**: Use correct container dimension for horizontal orientation

## [0.9.0] - 2026-02-21

### Added

- **sections**: Add horizontal mode support

### Changed

- Rename direction to orientation for semantic clarity
- **viewport**: Update ViewportState and CompressionState to use size terminology
- **cleanup**: Systematically rename all height references to size
- **breaking**: Remove HeightCache backward compatibility for v0.9.0
- **tests**: Update all test files to use SizeCache API
- **core**: Update entire codebase to use SizeCache
- **core**: Add SizeCache implementation and tests

### Fixed

- **async**: Fix scrollPosition parameter usage in async plugin
- **events**: Complete scroll event API migration to scrollPosition
- **types**: Complete dimension-agnostic refactoring - all tests passing
- **build**: Complete SizeCache migration in all remaining files

## [0.8.2] - 2026-02-20

### Fixed

- **selection**: Restore O(1) ID lookups to prevent selectAll freeze

## [0.8.1] - 2026-02-20

### Added

- **builder**: Make memory optimization default - remove config flags
- **builder**: Add memory optimization config flags

### Changed

- **core**: Remove browser detection from wheel handler - apply to all browsers
- **builder**: Use short keys on refs object to reduce bundle size
- **builder**: Decompose core.ts with refs-object pattern (Option A)
- Remove deprecated core files, simplify build, fix gzip display

### Fixed

- **core**: Disable wheel interception on mobile devices
- **core**: Add wheel interception for Chrome/Safari to prevent scroll race condition
- **range**: Use accurate visible item counting to prevent blank areas during fast scrolling
- **tests**: Update removeItem tests to use index parameter
- **types**: Resolve TypeScript declaration generation errors
- **builder**: Remove array copying from setItems()

## [0.7.6] - 2026-02-19

### Added

- **animation**: Add placeholder pulse and smooth fade-in on replacement

### Fixed

- **scale**: Add touch scroll support for compressed mode on iOS/mobile
- **builder**: Add missing invalidateRendered stub to simplified context
- **async**: Prevent endless loadMore cascade at bottom of sparse lists
- **async**: Reload now clears DOM, shows placeholders, and loads only visible range
- **scale**: Smooth scroll interpolation to fix Firefox compressed scroll-up bug

## [0.7.3] - 2026-02-18

### Added

- Remove createVList from public API and bump to 0.7.3

## [0.7.2] - 2026-02-18

### Changed

- **core**: Move full.ts to vlist.ts as main entry point

## [0.7.0] - 2026-02-18

### Added

- Move framework adapters to separate packages
- **groups**: Implement smooth scrolling in scrollToIndex override
- **groups**: Allow sticky headers with reverse mode

### Changed

- Simplify exports - builder-only API
- Update build script for new module structure
- Update all imports and rename plugin functions
- Reorganize core files into core/ directory
- Rename rendering files
- Rename feature modules for clarity
- Rename plugins/ to features/ and render/ to rendering/

### Fixed

- **builder**: Show native scrollbars by default
- **build**: Smart line-breaking for esbuild-wasm compatibility
- **build**: Add line breaks for esbuild-wasm compatibility
- **package**: Export package.json for tool compatibility
- **package**: Add default export conditions and reorder exports
- **package**: Correct TypeScript declaration paths for Bundlephobia
- **tests**: Resolve 8 TypeScript errors in plugins tests
- **tests**: Resolve 15 TypeScript errors in data plugin tests
- **tests**: Resolve 58 TypeScript errors across 6 test files
- **types**: Fix remaining TypeScript errors (19→0 errors)
- **types**: Fix TypeScript errors in builder and plugins (43→19 errors)
- **adapters**: Use relative imports in React and Vue adapters
- **svelte**: Use relative imports instead of package name

## [0.5.1] - 2026-02-16

### Added

- **grid**: Full groups support with proper layout and positioning
- **grid**: Implement groups-aware grid layout algorithm
- **grid**: Support full-width group headers in grid layout
- **core**: Add double-click support and grid+groups combination
- Add ultra-lightweight core-light entry point (4.9 KB)
- **plugin**: Extract window scroll mode to plugin
- **builder**: Add built-in velocity tracking with circular buffer
- **builder**: Self-contained composable builder with plugin system
- **scroll**: Add hover zone for scrollbar discovery and remove will-change
- **scroll**: Add horizontal scrolling support
- **a11y**: Enhanced accessibility — aria-setsize, aria-posinset, aria-activedescendant, aria-busy, live region
- **scroll**: Add scroll.wrap for circular navigation
- **scroll**: Implement scroll config with wheel control and custom scrollbar as default
- **sandbox**: Add reverse-chat example
- **reverse**: Add reverse mode for chat-style UIs
- **adapters**: Add React, Vue, and Svelte framework adapters
- **scroll**: Add scroll position save/restore

### Changed

- **tests**: Reorganize test structure to match src/ organization
- **builder**: Replace replaceRenderer with cleaner replaceTemplate API
- Organize all plugins under src/plugins/ folder
- **constants**: Reduce cancel load velocity threshold from 25 to 15 px/ms
- **types**: Fix circular dependencies
- **builder**: Remove legacy monolithic implementation and fix horizontal/window modes
- **core**: Make builder pattern the default entry point
- **data**: Remove dead concurrent dedup guard in loadRange
- Move sandbox and docs to vlist.dev

### Fixed

- **tests**: Fix window resize handler to emit events and check 1px threshold
- **tests**: Fix remaining scroll controller import path
- **tests**: Implement horizontal mode DOM styling
- **tests**: Fix grid+groups combination and update test expectations
- **tests**: Update import paths after plugin refactoring
- **tests**: Add backwards compatibility for selection methods with mode='none'
- **tests**: Fix live region and validation tests
- **tests**: Fix groups and grid mode by adding plugin getter overrides
- **tests**: Update validation error messages and add grid/groups/horizontal validations
- **tests**: Fix spread operator bug destroying getters - Phase 1 progress
- **grid**: Correct total height calculation for grid+groups combination
- **builder**: Restore replaceRenderer for grid plugin compatibility
- **grid**: Update scroll height after dynamic column change
- **vlist**: Resolve TypeScript errors in plugin config passing
- **core,builder**: Update lastScrollTop before rendering in all scroll operations
- **compression**: Eliminate gap at bottom when scrolled to end
- **builder**: Sync viewport state and scrollbar bounds with compression
- **grid**: Calculate visible/render range for scroll virtualization
