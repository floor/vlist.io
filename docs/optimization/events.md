---
created: 2026-05-01
updated: 2026-05-01
status: draft
---

# Event System Architecture — Design Options

Evaluation of event system patterns for vlist, focused on how features (internal)
and applications (external) intercept and react to user interactions like
contextmenu, delete, click, and selection changes.

The core question: **how should state settle before events reach the application,
and who gets to intercept?**

---

## Context

vlist's current event system has two layers:

1. **Handler arrays** (`clickHandlers`, `keydownHandlers`) — internal extension
   points. Features push handlers during `setup()`. Core dispatches to them
   on DOM events.
2. **Emitter** (`emitter.emit("item:click", ...)`) — external notification.
   Apps subscribe via `list.on()`.

These two layers serve different audiences but are not formally connected.
The ordering between them varies: click emits the event *before* dispatching
to handlers, meaning the app sees stale selection state on `item:click`.

New events (`item:contextmenu`, `delete`) need a clear lifecycle:
internal state settles first, then the app is notified.

---

## Option A — Handler Arrays

Extend the existing pattern: add `contextMenuHandlers` alongside `clickHandlers`.
Core dispatches to handlers first, then emits the event.

### Flow

```
DOM contextmenu
  → core finds target
  → contextMenuHandlers[i](event)    ← features update state
  → emitter.emit("item:contextmenu") ← app sees settled state
```

### Pros

- Explicit extension point — any feature can hook in
- Ordering is structural, not implicit (handlers before emit)
- Follows established pattern (`clickHandlers`, `keydownHandlers`)
- Features get raw `MouseEvent`, full flexibility

### Cons

- Each new interaction type needs a new array, types, context field, cleanup
- Features must resolve the target item themselves (repeated work)
- No app-level interception — apps can only react, not prevent

### Cost

~28 lines across `types.ts`, `context.ts`, `core.ts`, `materialize.ts`,
and the consuming feature.

---

## Option B — Emitter Listener

Features subscribe to the emitted event via `emitter.on()` during `setup()`.
Since features register before the app (which registers after `build()`),
they fire first.

### Flow

```
DOM contextmenu
  → core finds target
  → emitter.emit("item:contextmenu")
    → feature listener fires first (registered during setup)
    → app listener fires second (registered after build)
```

### Pros

- No new infrastructure — uses existing emitter
- Features get pre-resolved `{ item, index, event }` payload
- Minimal code (~15 lines)

### Cons

- Ordering depends on registration order — implicit, not contractual
- No interception — features cannot prevent the event from reaching the app
- If a second feature listens at a different priority, ordering is unpredictable
- Couples feature behavior to an emitter implementation detail (Set iteration order)

### Cost

~15 lines in the consuming feature only. Zero core changes.

---

## Option C — Before/After Hooks in Core

Add `emitPreventable()` to the emitter. Interaction events get a `before:` phase
where any listener (feature or app) can cancel.

### Flow

```
DOM contextmenu
  → core finds target
  → emitter.emitPreventable("before:contextmenu", { item, index, event, cancel })
    → feature/app can call cancel()
  → if not cancelled:
    → handlers dispatch (state settles)
    → emitter.emit("item:contextmenu")
```

### API

```js
list.on("before:contextmenu", ({ item, index, event, cancel }) => {
  if (shouldSuppress) cancel();
});

list.on("item:contextmenu", ({ item, index, event }) => {
  // state is settled, safe to read selection
  showContextMenu(item);
});
```

### Pros

- Full lifecycle: intercept → settle → react
- Apps and features share the same interception mechanism
- Simple to explain: "`before:X` to intercept, `X` to react"
- Covers unforeseen use cases (drag suppression, disabled items, confirmation)

### Cons

- Every interaction event potentially has a `before:` variant — type surface grows
- Cancellation API is design surface (must get right on first try)
- Baked into core — all users pay the complexity, even those who don't need it
- Non-interaction events (`scroll`, `resize`, `range:change`) don't benefit

### Cost

~50 lines across `emitter.ts`, `core.ts`, `types.ts`, and the consuming feature.

---

## Option D — Handler Arrays (Core) + Event Feature (Opt-in)

Core stays minimal with handler arrays (Option A). A `withEvents` feature
exposes interception to apps, translating the internal extension points
into a user-facing before/after API.

### Flow

```
DOM contextmenu
  → core finds target
  → contextMenuHandlers[i](event)
    → withEvents feature: call before callbacks, check cancel
    → selection feature: update state (if not cancelled)
  → emitter.emit("item:contextmenu") ← app sees settled state
```

### API

```js
builder.use(withEvents({
  "before:contextmenu": ({ item, cancel }) => {
    if (shouldSuppress) cancel();
  },
  "before:delete": ({ items, cancel }) => {
    if (!confirm(`Delete ${items.length} items?`)) cancel();
  },
}));
```

### Pros

- Core stays minimal — handler arrays are the only extension point
- Event lifecycle is a feature, not a primitive — zero cost for apps that don't need it
- Follows vlist's plugin philosophy: simple core, composable features
- The feature can evolve independently (batching, debouncing, filtering)
- Apps that don't need interception just use `list.on()` as usual

### Cons

- Two-layer system: must understand handler arrays *and* the feature
- Feature ordering matters — `withEvents` must register its handlers before
  other features that depend on cancellation
- Slightly more code than C for apps that *do* need interception

### Cost

~28 lines for core handler arrays + ~30 lines for the `withEvents` feature.
Total ~58 lines, but the core portion is ~28.

---

## Comparison

| Criterion            | A (Arrays)  | B (Emitter) | C (Before/After) | D (Arrays + Feature) |
|----------------------|-------------|-------------|-------------------|----------------------|
| Code cost            | ~28 lines   | ~15 lines   | ~50 lines         | ~58 lines            |
| Core complexity      | Low         | None        | Medium            | Low                  |
| Ordering guarantee   | Structural  | Implicit    | Structural        | Structural           |
| App interception     | No          | No          | Yes               | Yes (opt-in)         |
| Feature interception | Yes         | No          | Yes               | Yes                  |
| Follows vlist design | Yes         | Partially   | No (core bloat)   | Yes                  |
| Future extensibility | Medium      | Low         | High              | High                 |

---

## State of the Art

Mature UI component libraries converge on: **internal state settles before
external events fire**, enforced structurally.

- **AG Grid** — centralized event service; internal modules process before app listeners
- **Handsontable** — `beforeX` / `afterX` hook pairs; before can cancel
- **SlickGrid** — pub/sub with internal handlers processing first
- **TanStack Virtual** — headless; no events, entirely the consumer's problem

None rely on listener registration order. All have explicit internal-then-external
pipelines. The before/after pattern appears in libraries with broad interaction
surfaces (grids, spreadsheets). Focused libraries tend toward simpler dispatch.

---

## Recommendation

**Option D** — handler arrays as the core extension mechanism, with an opt-in
`withEvents` feature for app-level interception.

This aligns with vlist's architecture: the core provides clean extension points,
features compose behavior on top. Apps that need simple event handling use
`list.on()`. Apps that need interception opt into `withEvents`. The cost is
zero for the common case and incremental for the advanced case.

The handler array pattern is proven (already used for clicks and keyboard),
structural (not dependent on registration order), and minimal (one array per
interaction type). The `withEvents` feature can evolve independently — adding
batching, filtering, or debouncing later without touching core.
