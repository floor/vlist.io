---
v1_file: test/integration/scale-keyboard-nav.test.ts
v2_equivalent: null
v1_tests: 24
action: adapt
adapt_target: test/integration/scale-keyboard-nav.test.ts
tags: [scale, compression, keyboard-navigation, a11y, selection, large-dataset]
---

# Scale/Compression Keyboard Navigation (v1)

## What v1 Tested

- **Scale + Baseline A11y Navigation** (10 tests): focusIn sets initial focus to item 0, ArrowDown moves 0 to 1, ArrowDown then ArrowUp round-trips, ArrowUp at item 0 stays, Home navigates to first, End navigates to last without corrupting scroll state, End then Home round-trips, PageDown advances by one page, PageUp moves back by a page, sequential ArrowDown keeps scroll position within compressed bounds
- **Scale + withSelection Navigation** (10 tests): focusIn sets focus to item 0, ArrowDown moves 0 to 1, ArrowUp at 0 stays, End navigates to last without corrupting scroll state, Home navigates to first, End then Home round-trips, PageDown advances by one page, PageUp moves back, Space/Enter selects focused item after End, sequential ArrowDown keeps scroll within compressed bounds
- **Scale with Small Dataset** (4 tests): Home goes to item 0, End goes to last item, ArrowDown/ArrowUp navigate normally, End then ArrowUp focuses second-to-last

## Relevance to v2

- **Scale + Baseline Navigation** — STILL RELEVANT. When compression is active (large datasets mapped to a smaller scroll range), keyboard navigation must correctly map logical indices to compressed scroll positions. The critical test is "End navigates to last item without corrupting scroll state" — compression can cause scroll position drift if the mapping is imprecise.
- **Scale + withSelection** — STILL RELEVANT. Selection must work correctly with compressed scroll positions. Space/Enter after navigating to the End item must select the actual last item, not a nearby item caused by compression rounding.
- **Scale with Small Dataset** — STILL RELEVANT. When scale is applied to a small dataset (where compression ratio is 1:1 or close), navigation should behave identically to non-compressed mode. This verifies no regression from the compression code path.
- **Sequential ArrowDown bounds** — STILL RELEVANT. The test verifies that pressing ArrowDown many times in sequence keeps the scroll position within the compressed content bounds (doesn't overshoot past the compressed content height).

## Adaptation Notes

- Replace `vlist<T>({...}).use(withScale({force:true})).build()` with v2's scale/compression plugin.
- Replace `withSelection(...)` with v2's selection plugin.
- v1 tests used 1M items (`createItemArray(1_000_000)`) with `withScale({ force: true })` to force compression. v2's compression API may differ.
- The test setup uses the same keyboard/focus helper pattern as grid-masonry-nav:
  - `focusIn()`, `fireKey(key)`, `clickItem(index)`, `itemEl(index)`, `hasClass(index, cls)`, `ariaSelected(index)`
  - `:focus-visible` stub via `root.matches` override
- JSDOM setup replaced with happy-dom.
- The "without corrupting scroll state" tests check that after End navigation, the scroll position is reasonable (not NaN, not negative, within compressed bounds). This catches bugs where compression ratio calculation produces invalid positions.
- The "sequential ArrowDown" test presses ArrowDown in a loop (e.g., 50 times) and verifies scroll position stays bounded. This catches accumulation errors in the compressed scroll mapping.
- The "small dataset" tests use ~50 items with `withScale({ force: true })` where compression ratio is near 1:1, verifying that the compression code path doesn't break simple navigation.
- PageDown/PageUp tests verify that page-size calculation works with compression. The page size in items depends on `containerSize / compressedItemSize`, not `containerSize / realItemSize`.
- `aria-activedescendant` assertions use regex like `/item-0$/` to match the ID suffix. v2's ID format may differ.
