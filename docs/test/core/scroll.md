---
test_file: test/core/scroll.test.ts
source_files:
  - src/core/scroll.ts
  - src/core/state.ts
coverage:
  tests: 29
  passing: 29
status: passing
v1_delta: -5
tags: [core, scroll, animation, easing, idle]
---

# ScrollHandler Tests

## What We Test
- Factory creation returning handler with attach/detach/cancelScroll/smoothScrollTo methods
- attach() wiring scroll and wheel listeners to viewport (or custom scrollTarget)
- detach() cleanup: listener removal, animation cancellation, idle timeout clearing
- Vertical mode reading scrollTop, horizontal mode reading scrollLeft
- smoothScrollTo animation: progress over time, exact target reached, sub-pixel jump, onFrame callback, animation cancellation on new scroll
- Custom easing functions: linear, instant (always 1), quadratic via setFn, default easing fallback
- onFrame callback firing on scroll events
- scrollDirection state tracking (forward=1, backward=-1)
- onIdle callback after idleTimeout, scrollDirection reset on idle, timeout rescheduling on new scroll

## Test Groups
- **createScrollHandler factory** (1 test): returns handler with required methods
- **attach()** (3 tests): adds scroll listener to viewport, adds wheel listener when wheelEnabled, uses scrollTarget instead of viewport when provided
- **detach()** (4 tests): removes scroll listener, removes wheel listener, cancels pending animations, clears idle timeout
- **vertical mode** (2 tests): reads scrollTop for state.scrollPosition, sets scrollTop during smooth scroll
- **horizontal mode** (2 tests): reads scrollLeft for state.scrollPosition, sets scrollLeft during smooth scroll
- **cancelScroll()** (2 tests): stops animation in progress (position frozen), safe to call with no animation
- **smoothScrollTo()** (5 tests): animates to target over duration, reaches exact target at end, jumps directly for distance < 1px, calls onFrame during animation, cancels previous animation on new one
- **smoothScrollTo() with custom easing** (4 tests): linear easing, instant easing (returns 1), quadratic easing via setFn, default easing when none provided
- **onFrame callback** (3 tests): fires on scroll event, updates scrollDirection=1 on forward scroll, updates scrollDirection=-1 on backward scroll
- **onIdle callback** (3 tests): fires after idleTimeout, resets scrollDirection to 0, reschedules timeout on new scroll

## Known Gaps
- v1 had 34 tests; v2 has 29 (delta: -5)
- v1 tested easeInOutCubic function directly (9 tests: t=0, t=1, t=0.5, ease-in half, ease-out half, symmetry, edge cases, continuity) -- v2 moved easing to inline/constants, dropped unit tests for the easing curve itself
- v1 tested resolveScrollToOptions (8 tests: defaults, string align, object with all/missing/undefined properties, custom duration, smooth behavior, all custom values) -- v2 restructured scrollTo options handling, dropped these unit tests
- v1 tested SMOOTH_DURATION export -- not tested in v2
