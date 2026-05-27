---
v1_file: test/builder/memory.test.ts
v2_equivalent: test/integration/memory.test.ts
v1_tests: 24
action: merge-into
adapt_target: test/integration/memory.test.ts
tags: [memory, gc-pressure, heap, content-cap, event-reuse, destroy]
---

# Memory Optimizations (v1)

## What v1 Tested

- **Content Height Cap** (6 tests): cap at 16M px for large lists without compression, no cap under 16M px, no cap when compression (withScale) active, exact boundary (16M/itemHeight items), one item past boundary, virtualization still works with capped height
- **Reusable Event Payloads** (8 tests): scroll event values correct, direction on reversal, velocity:change values, range:change values, same scroll payload object reused across emits, same velocity payload reused, same range:change payload reused
- **Conditional newlyRendered Allocation** (3 tests): render without afterRenderBatch hooks, update during scroll without hooks, elements added to rendered Map inside loop
- **Guarded claimPlaceholderSelection** (3 tests): render without async data manager, scroll without placeholder claim overhead, correct data-id during scroll without async
- **Sustained Scroll Stability** (3 tests): bounded rendered element count during sustained scroll (100 frames), bounded count when bouncing direction, no DOM element accumulation during rapid scrolling
- **Destroy Cleanup** (2 tests): clear all rendered items on destroy, no events after destroy

## Relevance to v2

- **Content Height Cap** — PARTIALLY RELEVANT. Check if v2 preserves the 16M px cap in its engine. If so, adapt directly. If v2 uses a different strategy (e.g., always uses scale/compression), some tests are obsolete.
- **Reusable Event Payloads** — STILL RELEVANT. Zero-allocation scroll paths are a core performance goal. v2 event emitter may use the same reuse pattern. The "same object reference" tests are critical for verifying no GC pressure.
- **Conditional newlyRendered Allocation** — PARTIALLY RELEVANT. The internal optimization may have changed names but the principle (skip allocation when no hooks need it) should be tested.
- **Guarded claimPlaceholderSelection** — PARTIALLY RELEVANT. This was specific to the v1 async/selection interaction. v2 may handle placeholder selection differently. Check if `claimPlaceholderSelection` exists in v2.
- **Sustained Scroll Stability** — STILL RELEVANT. Verifying bounded DOM element count during sustained scrolling is fundamental to any virtual list. The exact element count bounds may differ.
- **Destroy Cleanup** — STILL RELEVANT. DOM cleanup and event listener removal on destroy are universal requirements.

## Adaptation Notes

- v2 already has `test/integration/memory.test.ts` — merge relevant tests into that file rather than creating a new one.
- Replace `vlist<T>({...}).build()` with `createVList(config)`.
- Replace `createTestItems` / `createContainer` with v2 test helper equivalents.
- The `simulateScroll` helper (setting scrollTop + dispatching scroll event) needs v2's scroll simulation pattern.
- JSDOM-specific setup (`new JSDOM(...)`) should be replaced with happy-dom via `setupDOM` / `teardownDOM`.
- `withScale({ force: true })` becomes the v2 scale plugin equivalent.
- Event names (`scroll`, `velocity:change`, `range:change`) may differ in v2.
- The payload reuse tests (checking `scrollPayloads[0] === scrollPayloads[1]`) are the most valuable — they catch accidental object creation regressions.
- `instance.element.querySelectorAll("[data-index]")` may need different selectors in v2.
