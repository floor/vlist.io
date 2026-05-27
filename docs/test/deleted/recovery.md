---
v1_file: test/builder/recovery.test.ts
v2_equivalent: null
v1_tests: 32
action: adapt
adapt_target: test/integration/recovery.test.ts
tags: [error-handling, resilience, adapter-errors, resize-observer, state-corruption, destroy]
---

# Error Handling and Recovery (v1)

## What v1 Tested

- **Invalid Configuration** (7 tests): missing container (throws), undefined items, null items, missing itemHeight (throws), invalid template function (throws), template that throws emits error event with `tpl(` context, template returning invalid HTML (null)
- **Contextual Error Reporting** (6 tests): viewport snapshot included in template error events (scrollPosition, containerSize, visibleRange, renderRange, totalItems, isCompressed), feature setup errors caught with continuation to remaining features, error event emitted when feature setup fails (context = feature name), destroy cleanup continues when a handler throws, collected destroy errors emitted before clearing emitter, render loop survives when multiple items throw
- **Adapter Errors** (6 tests): adapter read throws synchronously, adapter read rejects (async), adapter returns malformed response, adapter returns null, adapter returns invalid items array, repeated adapter errors
- **ResizeObserver Errors** (2 tests): missing ResizeObserver throws, ResizeObserver.observe() throwing
- **State Corruption Recovery** (3 tests): external DOM manipulation (items removed), operations after viewport removal, setItems after DOM corruption
- **Event Handler Errors** (2 tests): error propagation from event listeners, multiple event listeners registration
- **Memory Leak Prevention** (3 tests): DOM cleanup with async adapter mid-load, DOM cleanup after destroy, multiple destroy calls safe
- **Graceful Degradation** (3 tests): requestAnimationFrame polyfill works, core browser APIs available, style manipulation works

## Relevance to v2

- **Invalid Configuration** — STILL RELEVANT. v2 must validate config and throw on missing container, missing height, invalid template. Error event emission for template errors is a key resilience feature.
- **Contextual Error Reporting** — STILL RELEVANT. The viewport snapshot in error events (scrollPosition, containerSize, ranges) is valuable for debugging. Feature setup error isolation (one feature failing shouldn't break others) is critical for plugin architecture.
- **Adapter Errors** — STILL RELEVANT. Async adapter error handling is universal. Tests cover sync throws, async rejects, malformed responses, null returns, invalid items arrays. All need adaptation to v2's async plugin API.
- **ResizeObserver Errors** — STILL RELEVANT. v2 still requires ResizeObserver. Missing/broken ResizeObserver must throw clearly.
- **State Corruption Recovery** — PARTIALLY RELEVANT. External DOM manipulation is an edge case but important for robustness. The exact behavior may differ in v2 (crash vs graceful degradation).
- **Event Handler Errors** — STILL RELEVANT. Error propagation behavior in the event emitter should be tested.
- **Memory Leak Prevention** — STILL RELEVANT. Destroy cleanup, especially mid-async-load, and idempotent destroy are fundamental.
- **Graceful Degradation** — PARTIALLY RELEVANT. rAF polyfill test may not apply if v2 assumes modern browsers. Core API availability checks are still useful.

## Adaptation Notes

- Replace `vlist<T>({...}).build()` with `createVList(config)`.
- Replace `withAsync({ adapter })` with v2's async plugin API.
- The error event shape `{ error: Error, context: string, viewport?: {...} }` may differ in v2. Check v2's error event type.
- Feature setup error isolation tests need adaptation: `ctx.destroyHandlers`, `ctx.methods.set()`, `ctx.emitter` are v1 BuilderContext APIs. Map to v2's PluginContext equivalents.
- The `suppressConsoleError` / `restoreConsoleError` pattern should be preserved to avoid noisy test output.
- `VListAdapter<T>` interface (with `read({ offset, limit })`) may be renamed in v2.
- Destroy-continues-on-error tests are particularly valuable — they verify that one broken cleanup handler doesn't prevent subsequent handlers from running.
- The "template throws" tests use a counter to let initial render succeed then fail on re-render via `setItems` with new IDs. This pattern needs careful adaptation.
- DOM cleanup assertion `container.querySelector(".vlist")` needs the v2 root element class name.
