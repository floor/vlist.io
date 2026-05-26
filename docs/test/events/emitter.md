---
test_file: test/events/emitter.test.ts
source_files:
  - src/events/index.ts
coverage:
  tests: 17
  passing: 17
status: passing
v1_delta: 0
tags: [events, emitter]
---

# Event Emitter

## What We Test
- createEmitter: returns instance with on, off, emit, clear methods
- on / emit: handler called with correct payload, multiple handlers for same event, no cross-event calls, no-throw with no listeners, correct payload passthrough
- off: remove handler stops calls, only removes specified handler, removing non-existent handler is safe
- Unsubscribe function: on() returns function, calling it unsubscribes
- clear: clear specific event listeners, clear all listeners (no argument)
- Error handling: handler throwing does not prevent other handlers, error is logged to console
- Type safety: enforces correct payload types at compile time
- Multiple instances: separate state per emitter instance

## Test Groups
- **createEmitter** (1 test): interface shape
- **on / emit** (5 tests): handler called, multiple handlers, no cross-event, no listeners, payload passthrough
- **off** (3 tests): remove handler, only specified, non-existent safe
- **unsubscribe function** (2 tests): returns function, unsubscribes
- **clear** (2 tests): specific event, all events
- **error handling** (2 tests): continue after throw, log error
- **type safety** (1 test): correct payload types
- **multiple emitter instances** (1 test): separate state

## Known Gaps
- No test for once() or one-time listener pattern
- No test for listener ordering guarantees
