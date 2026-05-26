---
test_file: test/core/padding.test.ts
source_files:
  - src/utils/padding.ts
  - src/core/pipeline.ts
  - src/core/sizes.ts
coverage:
  tests: 23
  passing: 23
status: passing
v1_delta: null
tags: [core, padding, pipeline, layout, striped]
---

# Padding Tests

## What We Test
- Padding resolution from various input formats (undefined, 0, single number, [v,h] tuple, [t,r,b,l] quad)
- Main-axis and cross-axis padding extraction for vertical and horizontal orientations
- Main-axis transform offsets applied by phase2Commit (startPadding added to translateY/translateX)
- Cross-axis inline styles (left/right for vertical, top/bottom for horizontal)
- Cross-axis style restoration after pool release and re-acquire
- Range calculation adjustment in phase1Calculate accounting for startPadding
- Combined main + cross padding applied simultaneously (symmetric and asymmetric)
- Striped row styling via oddClass toggle on odd-indexed items

## Test Groups
- **resolvePadding** (5 tests): zero singleton for undefined and 0, single number expansion, [v,h] tuple expansion, [t,r,b,l] CSS-order quad
- **mainAxisPaddingFrom / crossAxisPaddingFrom** (2 tests): vertical axis extraction (top+bottom / left+right), horizontal axis extraction (left+right / top+bottom)
- **phase2Commit padding** (3 tests): startPadding added to translateY, no offset at 0, horizontal translateX offset
- **phase2Commit cross-axis padding** (4 tests): left/right for vertical, top/bottom for horizontal, no styles at 0, styles restored after release/re-acquire
- **phase1Calculate startPadding range adjustment** (3 tests): items rendered when scrolled past startPadding, range starts at 0 when padding exceeds scroll, no adjustment at 0
- **combined main + cross padding** (2 tests): both axes applied simultaneously, asymmetric padding handling
- **phase2Commit striped** (4 tests): odd class toggled on odd-indexed items, no class when oddClass is empty, class updates after release/acquire shift, custom classPrefix support

## Known Gaps
- New in v2 (no v1 equivalent) -- no regression comparison available
- No tests for padding interaction with gap (combined gap + padding)
- No tests for scrollToIndex alignment with padding offsets
