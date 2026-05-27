---
v1_file: test/features/async/integration.test.ts
v2_equivalent: null
v1_tests: 22
action: adapt
adapt_target: test/plugins/async/integration.test.ts
tags: [async, adapter, loading-state, error-recovery, race-conditions, memory, edge-cases]
---

# Async Adapter End-to-End (v1)

## What v1 Tested

- **Loading State Transitions** (5 tests): aria-busy set during initial load, aria-busy cleared after load completes, adapter called on build, handle rapid scroll events during loading, handle scroll during active load
- **Error Recovery** (4 tests): adapter error handled gracefully (sync throw wrapped in async), adapter returning malformed response, adapter returning null, adapter returning invalid items array
- **Race Conditions** (2 tests): overlapping requests handled correctly (later request wins), rapid scrolling without memory buildup
- **Loading Transitions** (3 tests): aria-busy during async load, render content after load completes, handle scrolling to unloaded range
- **Memory Management** (3 tests): cleanup pending requests on destroy, no memory leak with many scroll events, multiple destroy calls without error
- **Edge Cases** (5 tests): adapter returning empty results, adapter with varying response sizes, adapter with extremely slow responses (500ms), scrollToIndex during active load, setItems while async loading

## Relevance to v2

- **Loading State Transitions** — STILL RELEVANT. aria-busy is an accessibility requirement. The list must indicate loading state via aria-busy="true" during async operations and clear it when complete.
- **Error Recovery** — STILL RELEVANT. Async adapters can fail in many ways (throw, reject, return malformed data, return null). The plugin must handle all gracefully without crashing.
- **Race Conditions** — STILL RELEVANT. Rapid scrolling triggers multiple concurrent adapter.read() calls. Later requests must supersede earlier ones. Stale responses must be discarded.
- **Loading Transitions** — STILL RELEVANT. The transition from placeholder to real content after async load is a core visual behavior.
- **Memory Management** — STILL RELEVANT. Pending requests must be aborted or ignored on destroy. No memory buildup from many scroll events (no growing arrays of callbacks).
- **Edge Cases** — STILL RELEVANT. Empty results, varying sizes, slow responses, scrollToIndex during load, setItems during load are all real-world scenarios.

## Adaptation Notes

- Replace `vlist<T>({...}).use(withAsync({adapter})).build()` with v2's async plugin registration.
- The `VListAdapter<T>` interface has `read({ offset, limit })` returning `{ items, total, hasMore }`. Check if v2 uses the same interface shape.
- The `createMockAdapter(total, { delay, failRate, returnEmpty })` helper is reusable — it creates a mock adapter with configurable delay, failure rate, and empty response mode.
- JSDOM setup (`new JSDOM(...)`) replaced with happy-dom `setupDOM`/`teardownDOM`.
- `simulateScroll(list, scrollTop)` — set viewport scrollTop + dispatch scroll event. Same pattern in v2.
- `waitForAsync(ms)` — simple `setTimeout` promise. Same in v2.
- The `mock()` function from `bun:test` wraps the adapter's `read` to verify call counts and arguments.
- aria-busy assertions: `list.element.getAttribute("aria-busy")`. v2's root element accessor may differ.
- The race condition test verifies that when two requests are in flight, only the later one's results are applied. This requires careful adapter delay tuning to ensure overlap.
- The memory management test scrolls many times and verifies no growing internal state. In v1 this checked that the number of pending callbacks didn't accumulate.
- "setItems while async loading" tests that synchronous data replacement works even when an async load is in progress. The async load's response should be discarded.
- Consider grouping these with the existing v2 async tests in `test/plugins/async/` rather than creating a separate integration file.
