---
v1_file: test/builder/core.test.ts
v2_equivalent: test/integration/core-coverage.test.ts
v1_tests: 67
action: merge-into
adapt_target: test/integration/core-coverage.test.ts
tags: [builder, gap, padding, wheel, horizontal, a11y, keyboard, selection, validation, smooth-scroll, resize]
---

# Builder Core (v1)

## What v1 Tested

- **Smoke Tests** (3 tests): vlist exports a function, returns builder with use()/build(), use() supports method chaining
- **Item Gap Support** (7 tests): gap with fixed height (total size = n*(h+g)-g), gap with variable height, items positioned with gap spacing (translateY offsets), no effect when gap=0, single item without trailing gap, empty list with gap, gap preserved after setItems
- **Padding Support** (10 tests): equal padding (number shorthand), vertical/horizontal [v,h] tuple, per-side [t,r,b,l] tuple, main-axis padding added to content height, asymmetric main-axis padding, per-side main-axis padding, no effect when padding=0, gap+padding combined, padding preserved after setItems, empty list with padding (still adds padding height), no box-sizing when padding=0
- **Wheel Handler — Horizontal Scroll Passthrough** (6 tests): no preventDefault on predominantly horizontal wheel with horizontal overflow, still preventDefault on vertical wheel with horizontal overflow, forward deltaX to scrollLeft on diagonal gestures, no deltaX forwarding without horizontal overflow, no forwarding when deltaX=0, accumulate deltaX over multiple events
- **Validation Errors** (5 tests): throw on non-number/non-function item.height, throw on non-number/non-function item.width (horizontal), throw on invalid estimatedHeight (negative), throw on string estimatedHeight, throw on conflicting features
- **Scrollbar None** (1 test): add no-scrollbar class when scroll.scrollbar="none"
- **Horizontal Mode** (9 tests): scrollLeft for positioning, vertical wheel converted to horizontal scroll, native horizontal wheel not intercepted, page scroll at horizontal boundary (start), page scroll at horizontal boundary (end), predominantly-horizontal trackpad not intercepted, predominantly-vertical trackpad intercepted, scrollToIndex uses horizontal setter, convert vertical wheel deltaY to horizontal scroll
- **Wheel Handler Full Scroll Cycle** (2 tests): emit scroll event + add scrolling class on vertical wheel, skip full cycle when clamped at boundary
- **Core Baseline Single-Select** (17 tests): keyboard nav without withSelection doesn't throw, aria-activedescendant on focusin, clear aria-activedescendant on focusout, ArrowDown/ArrowUp/Home/End navigation, arrow keys do NOT select (focus only), no wrap past first/last item, Space selects focused item, Enter selects focused item, Space toggles deselect, focus ring visible after Space/Enter, move focus away without deselecting, replace selection on different item, click selects and focuses, no focus ring on mouse click, restore focus ring on keyboard after click, click toggles deselect, click replaces selection, PageDown/PageUp, restore focus position on re-focus, preserve selection across blur/re-focus
- **Smooth scrollToIndex** (3 tests): jump immediately for short distances, start animation for distant item, cancel previous animation on new scroll
- **Resize Observer** (1 test): resize handlers called after significant resize

## Relevance to v2

- **Smoke Tests** — OBSOLETE. v2 uses `createVList()` factory, not `vlist().use().build()` builder pattern.
- **Item Gap Support** — STILL RELEVANT. v2 has `test/core/gap.test.ts` already. Compare coverage — the v1 tests may cover cases the v2 tests miss (variable height + gap, gap preserved after setItems).
- **Padding Support** — STILL RELEVANT. v2 has `test/core/padding.test.ts` already. Compare coverage — v1 tests cover [v,h] tuple, [t,r,b,l] tuple, gap+padding combined, empty list with padding.
- **Wheel Handler** — STILL RELEVANT. Horizontal scroll passthrough, boundary detection, deltaX forwarding, and vertical-to-horizontal wheel conversion are important behaviors. Check if v2 tests cover these in `test/core/scroll.test.ts` or elsewhere.
- **Validation Errors** — PARTIALLY RELEVANT. v2 config validation may have different error messages. The concept (throw on invalid height, conflicting features) transfers.
- **Scrollbar None** — STILL RELEVANT. CSS class for hiding native scrollbar.
- **Horizontal Mode** — STILL RELEVANT. Horizontal scrolling, wheel conversion, boundary passthrough are all v2 features.
- **Core Baseline Single-Select** — STILL RELEVANT. The baseline a11y keyboard navigation (without withSelection plugin) is critical. Tests cover: aria-activedescendant, focus ring vs selection distinction, Space/Enter toggle, click behavior, :focus-visible awareness, PageDown/PageUp, blur/re-focus state preservation.
- **Smooth scrollToIndex** — STILL RELEVANT. Covered partially in v2's scroll tests but the builder-level integration (scrollToIndex triggering smooth animation) may not be.
- **Resize Observer** — STILL RELEVANT. Resize handler wiring and trigger behavior.

## Adaptation Notes

- This is a large file (67 tests). Split across existing v2 test files:
  - Gap tests: compare with and merge into `test/core/gap.test.ts`
  - Padding tests: compare with and merge into `test/core/padding.test.ts`
  - Wheel/scroll tests: merge into `test/core/scroll.test.ts`
  - Baseline a11y/keyboard: merge into `test/core/a11y.test.ts` or `test/core/pipeline-aria.test.ts`
  - Validation: new section in `test/integration/core-coverage.test.ts`
  - Horizontal mode: could be a new `test/core/horizontal.test.ts` or merged into existing files
- Replace `vlist<T>({...}).build()` with `createVList(config)`.
- JSDOM-specific code (`new JSDOM()`, `dom.window.Event`, `dom.window.FocusEvent`, `dom.window.KeyboardEvent`, `dom.window.MouseEvent`) needs happy-dom equivalents.
- The `:focus-visible` stub pattern (overriding `root.matches`) is needed because happy-dom also doesn't support `:focus-visible`. Preserve this pattern.
- WheelEvent creation helper (`createWheelEvent` with `Object.defineProperty` for deltaX/deltaY) is needed because test DOM environments don't support WheelEvent init dict properties.
- The baseline single-select tests are the most valuable — they test behavior that exists WITHOUT the selection plugin, using only the core keyboard/focus/click handlers.
- `createContainer` and `createTestItems` from `test/helpers/factory` need v2 equivalents.
