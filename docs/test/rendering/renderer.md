---
test_file: test/rendering/renderer.test.ts
source_files:
  - src/rendering/renderer.ts
  - src/rendering/sizes.ts
coverage:
  tests: 51
  passing: 51
status: passing
v1_delta: 0
tags: [rendering, renderer, pool, dom, aria, compression]
---

# Renderer

## What We Test
- getElement for rendered/non-rendered/cleared/scrolled-out indices
- Element pool reuse when range shifts
- Release grace period (RELEASE_GRACE = 2 frames)
- updateItemClasses on rendered and non-rendered items
- updateItem with new data
- HTMLElement template support
- Element pool overflow (max capacity enforcement, attribute cleaning, pool clear)
- ARIA setsize update when total changes between renders
- Template re-application when item ID changes at same index (placeholder replacement)
- resolveContainer: string selector not found, selector match, HTMLElement passthrough
- createDOMStructure: default settings, aria-label, horizontal layout, vertical layout, viewport overflow, content positioning, items positioning, nesting, custom class prefix
- updateContentHeight/updateContentWidth: set, update, zero, large values
- getContainerDimensions: attached, detached, resize
- Compression context: compression-aware positioning, fallback when not compressed, no context, position updates, empty rendered map
- Cross-axis size in horizontal mode
- Non-compressed fallback compression state
- ARIA setsize caching across renders
- Placeholder class handling (placeholder class, replaced class on data arrival)
- Horizontal position updates (translateX on existing items, updatePositions)
- sortDOM: reorder children to match logical index order

## Test Groups
- **getElement and pool stats** (4 tests): rendered index, after clear, scrolled out with grace, pool reuse
- **updateItem and updateItemClasses** (3 tests): updateItemClasses, updateItem, HTMLElement template
- **element pool overflow** (3 tests): max capacity discard, attribute cleaning, pool clear
- **aria-setsize update** (1 test): update when total changes
- **template re-application** (1 test): re-apply when item ID changes
- **resolveContainer** (3 tests): string not found, string match, HTMLElement passthrough
- **createDOMStructure** (10 tests): defaults, aria-label, no aria-label, horizontal, vertical, viewport styles, content positioning, items positioning, nesting, custom prefix
- **updateContentHeight** (4 tests): set, update, zero, large
- **updateContentWidth** (4 tests): set, update, zero, large
- **getContainerDimensions** (3 tests): attached, detached, resize
- **compression context** (5 tests): compressed positioning, fallback not compressed, no context, position updates, empty rendered
- **cross-axis size** (2 tests): apply height from crossAxisSize, no height without crossAxisSize
- **non-compressed fallback** (1 test): trivial compression state without compressionFns
- **ARIA setsize caching** (2 tests): set on first render, cache and reuse
- **placeholder handling** (2 tests): placeholder class on initial render, replaced class on data arrival
- **horizontal position updates** (2 tests): translateX on existing items, translateX in updatePositions
- **sortDOM** (1 test): reorder children to match logical order

## Known Gaps
- No test for template returning DocumentFragment
- No test for render performance with large range shifts
