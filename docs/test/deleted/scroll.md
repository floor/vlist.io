---
v1_file: test/builder/scroll.test.ts
v2_equivalent: test/core/scroll.test.ts
v1_tests: 34
action: merge-into
adapt_target: test/core/scroll.test.ts
tags: [scroll, easing, smooth-scroll, animation, rAF, pure-functions]
---

# Scroll Utilities (v1)

## What v1 Tested

- **easeInOutQuad** (8 tests): returns 0 at t=0, returns 1 at t=1, returns 0.5 at t=0.5, ease-in for first half (value < t), ease-out for second half, symmetric around 0.5 (v(t) + v(1-t) = 1), exact values at t=0.25 (0.125) and t=0.75 (0.875), continuous at t=0.5
- **resolveScrollArgs** (14 tests): defaults (align=start, behavior=auto, duration=300), string "center" as align, string "start", string "end", object with all properties, defaults for missing object props, defaults for undefined object props, override only specified props, custom duration only, smooth behavior only, all custom values, zero duration, very short duration (1ms), very long duration (5000ms), extra properties ignored
- **Integration** (3 tests): resolveScrollArgs + easeInOutQuad for smooth scroll, instant scroll defaults, sensible defaults for basic usage
- **Constants** (1 test): SMOOTH_DURATION exported and equals 300
- **createSmoothScroll** (8 tests): jump directly when distance < 1px, animate over multiple frames (mid-animation position check, final position check), cancel previous animation when starting new one, cancelScroll stops animation, cancelScroll safe when no animation running, easing applied during animation (verifies positions at t=0.25 and t=0.75)

## Gap Analysis: v1 vs v2 `test/core/scroll.test.ts`

The current v2 `test/core/scroll.test.ts` has **31 tests** covering `createScrollHandler`:

**Already covered in v2:**
- Factory creation (attach/detach/cancelScroll/smoothScrollTo methods)
- attach() adds scroll/wheel listeners
- detach() removes listeners, cancels animations, clears idle timeout
- Vertical mode (scrollTop reading, scrollTop setting during smooth scroll)
- Horizontal mode (scrollLeft reading, scrollLeft setting)
- cancelScroll() stops animation, safe when idle
- smoothScrollTo() animation (progress, reaches target, jump for < 1px, calls onFrame, cancels previous)
- Custom easing function support (4 tests: custom easing used, easing applied to position, easing through setFn, default easing fallback)
- onFrame callback (fires on scroll, updates scrollDirection forward/backward)
- onIdle callback (fires after timeout, resets scrollDirection, reschedules on new scroll)

**Missing from v2 (present in v1 but not v2):**
- `easeInOutQuad` pure function tests (8 tests) — mathematical correctness, symmetry, continuity
- `resolveScrollArgs` tests (14 tests) — argument parsing for string/object/defaults
- `SMOOTH_DURATION` constant export test
- `createSmoothScroll` with mock rAF (deterministic frame-by-frame animation tests) — v2 uses real timers via setTimeout

## Relevance to v2

- **easeInOutQuad** — STILL RELEVANT if v2 exports or uses this easing function. These are pure math tests. Check if v2 has `DEFAULT_EASING` or equivalent in `src/core/scroll.ts`.
- **resolveScrollArgs** — PARTIALLY RELEVANT. v2's `scrollToIndex` API may parse arguments differently. If v2 has a similar overloaded signature (string | object), these tests apply.
- **createSmoothScroll with mock rAF** — PARTIALLY RELEVANT. v2's scroll handler already tests smooth scrolling but uses real timers. The v1 approach (mocking rAF with a flush function) allows deterministic frame-by-frame assertions. Consider adding deterministic rAF tests to v2 for precise easing verification.
- **Constants** — STILL RELEVANT. Verify v2 exports its scroll constants.

## Adaptation Notes

- Merge the **easeInOutQuad** tests into `test/core/scroll.test.ts` as a new describe block. These are pure function tests — no DOM needed.
- Merge **resolveScrollArgs** tests if v2 has an equivalent argument resolver.
- The v1 `createSmoothScroll` used a controller interface `{ scrollTo, getScrollTop }` and a render function. v2's `createScrollHandler` has a different config shape (`{ state, viewport, horizontal, wheelEnabled, idleTimeout, onFrame, onIdle }`). The smooth scroll is accessed via `handler.smoothScrollTo()`.
- v1 mocked `requestAnimationFrame` with a synchronous flush: `rafCallbacks.push({ id, cb })` then `flushRAF(timestamp)`. This pattern enables deterministic animation testing. Consider adopting it in v2 for the easing tests.
- v1 used `performance.now` mocking to control animation start time. v2 tests use `setTimeout` with real delays (`done` callback pattern).
- The gap in easing coverage is notable: v2 tests verify easing *works* but not mathematical *correctness* (symmetry, continuity, exact values at quarter/half/three-quarter points).
