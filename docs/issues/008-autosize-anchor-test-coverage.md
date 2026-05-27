---
id: "008"
title: Tighten autosize anchor preservation test coverage
severity: low
status: fixed
component: plugins/autosize
related: ["RFC-003 §4"]
---

# Issue 008: Tighten autosize anchor preservation test coverage

---

## Symptom

The autosize plugin's scroll compensation logic works correctly, but test coverage does not exercise all anchor edge cases. Missing scenarios could allow regressions to slip through.

## Current Behavior

- Anchor is approximated by `engineState.startIndex` (first rendered item)
- Deltas accumulate in `pendingScrollDelta` for items measured above the anchor
- Bottom-stick uses a 2px threshold via `isAtBottom()`
- Compensation is applied synchronously before re-rendering

## Proposed Fix

Add targeted tests for:

1. **Measurement change above viewport** — item above the first visible shrinks/grows, scroll position compensates
2. **Measurement change inside viewport** — item within view resizes, no scroll jump
3. **Measurement change below viewport** — item below view resizes, no scroll change
4. **Bottom-stick stability** — when scrolled to bottom, a size change above keeps the list pinned to bottom
5. **Rapid sequential resizes** — multiple items resize in the same frame, deltas accumulate correctly

## Fix

Added 5 tests in `test/plugins/autosize/plugin.test.ts` under `describe("anchor preservation")` with a controllable ResizeObserver mock:

1. **Measurement above viewport** — scroll compensation applied via `scrollTo()`
2. **Measurement inside viewport** — no scroll adjustment
3. **Measurement below viewport** — no scroll adjustment
4. **Bottom-stick stability** — list stays pinned to bottom after size change above
5. **Delta accumulation** — multiple resizes in same frame accumulate correctly

Tests use a custom `scrollTo` override that updates `engineState.scrollPosition` and a dynamic `scrollHeight` getter for bottom-stick detection.

## Status

**Fixed** — `test/plugins/autosize/plugin.test.ts`
