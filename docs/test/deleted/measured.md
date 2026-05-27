---
v1_file: test/builder/measured.test.ts
v2_equivalent: test/rendering/measured.test.ts
v1_tests: 44
action: merge-into
adapt_target: test/rendering/measured.test.ts
tags: [auto-size, measurement, resize-observer, scroll-correction, horizontal, mode-b, integration]
---

# Mode B Auto-Size Measurement (v1)

## What v1 Tested

- **estimatedHeight Config** (10 tests): create list with estimatedHeight, render items, measure via ResizeObserver (mock fires synchronously with configurable sizes), unobserve after measurement, update content size to reflect measured sizes, position items using measured sizes after rebuild, handle setItems with measured cache, handle appendItems, handle empty items, destroy cleanly
- **Scroll Correction (Direction C)** (4 tests): apply scroll correction when above-viewport items measured larger, no correction when measured matches estimated, handle scroll events after measurement, emit range:change when measurements cause range shift
- **Content Size** (3 tests): set content size based on mixed measured/estimated, update content size when items change, shrink content size on item removal
- **Horizontal Mode (estimatedWidth)** (7 tests): create horizontal list with estimatedWidth, render items horizontally, measure width (inlineSize) in horizontal mode, position with translateX, set content width (not height), update content width after measurement, unobserve after horizontal measurement
- **Config Precedence and Validation** (5 tests): height (Mode A) wins when both height and estimatedHeight set, width wins over estimatedWidth in horizontal, throw when neither height nor estimatedHeight set (vertical), throw when neither width nor estimatedWidth set (horizontal), variable height function (Mode A) over estimatedHeight
- **scrollToIndex** (3 tests): scroll to index with measured sizes, scroll to last item, scroll to first item
- **Variable Measured Sizes** (4 tests): items with different measured sizes, position correctly with mixed sizes, items measuring smaller than estimated, items measuring exactly as estimated
- **ARIA Attributes** (2 tests): ARIA attributes on items container, ARIA attributes on rendered items
- **Interaction with Scroll Events** (3 tests): render new items when scrolling down, handle rapid scrolling, handle getScrollPosition
- **stayAtEnd** (2 tests): snap to new end when user at bottom and content grows, no snap when not at bottom
- **Flush (Deferred Content Size Update)** (1 test): defer content size update during scroll, apply on idle

## Gap Analysis: v1 vs v2 `test/rendering/measured.test.ts`

The current v2 `test/rendering/measured.test.ts` has **47 tests** covering the `createMeasuredSizeCache` pure data structure:

**Covered in v2:** Factory/defaults, getSize (estimated vs measured), setMeasuredSize/isMeasured, getOffset (prefix sums), getTotalSize, indexAtOffset (binary search), rebuild (preserve/discard measurements), consistency invariants, edge cases (empty, single, large, zero-size items), isVariable, getEstimatedSize.

**Missing from v2 (only in v1):**
- Full integration tests with DOM: ResizeObserver firing, element measurement, unobserve after measurement
- Scroll correction (Direction C): adjusting scroll position when above-viewport items measure differently
- Content size updates reflected in DOM (content element style.height changes)
- Horizontal mode: estimatedWidth, inlineSize measurement, translateX positioning, content width
- Config precedence: height vs estimatedHeight, variable function vs estimated
- scrollToIndex with measured sizes
- stayAtEnd behavior with measurement-driven content growth
- Deferred content size flush on idle
- ARIA attribute verification in measured mode

## Relevance to v2

- **estimatedHeight Config / ResizeObserver Integration** — STILL RELEVANT. v2 has `test/plugins/autosize/plugin.test.ts` which may cover some of this. The integration (build list with estimatedHeight, ResizeObserver fires, sizes update, content height adjusts) is critical.
- **Scroll Correction** — STILL RELEVANT. When items above the viewport measure larger/smaller than estimated, the scroll position must be corrected to prevent visual jumps. This is subtle and high-value.
- **Content Size** — STILL RELEVANT. Content element height must reflect the mix of measured and estimated sizes.
- **Horizontal Mode** — STILL RELEVANT. Horizontal estimatedWidth, inlineSize measurement, translateX positioning are all needed.
- **Config Precedence** — STILL RELEVANT. Explicit height (Mode A) must take priority over estimatedHeight (Mode B). This prevents ambiguity.
- **stayAtEnd** — STILL RELEVANT. Auto-scroll-to-bottom when content grows while user is at the bottom.
- **Flush** — STILL RELEVANT. Deferring content size updates during active scrolling prevents layout thrashing.

## Adaptation Notes

- The v2 `test/rendering/measured.test.ts` tests the pure `MeasuredSizeCache` data structure. The v1 tests are integration tests that test the full measurement pipeline including DOM, ResizeObserver, and scroll correction.
- The integration tests should go into `test/plugins/autosize/plugin.test.ts` or a new `test/plugins/autosize/integration.test.ts`.
- v1 used a custom JSDOM-based ResizeObserver mock with configurable per-item sizes (`mockItemSizes` Map), deferred measurements (`deferredItemIndices`), and a `flushDeferredMeasurements()` function. v2 needs an equivalent mock strategy for happy-dom.
- v1's mock returned proper `borderBoxSize` entries with `blockSize` and `inlineSize`, differentiating container vs item observations via `data-index` attribute.
- Replace `vlist<T>({...}).use(withAutoSize()).build()` with v2's autosize plugin API.
- `simulateScroll(list, scrollTop)` helper (set scrollTop + dispatch scroll event) needs v2 equivalent.
- The scroll correction tests are the highest-value gap — they verify a subtle behavior that users notice (content jumping during scroll as items are measured).
- The stayAtEnd tests require simulating the user being at the bottom then content growing — check if v2 has this feature.
