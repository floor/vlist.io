---
created: 2026-05-01
updated: 2026-05-01
status: implemented
---

# Event System Architecture

How features (internal) and applications (external) intercept and react to
user interactions like contextmenu, delete, click, and selection changes.

---

## Decision

**Option A — Handler Arrays**, with the door open to Option D (`withEvents`
feature for app-level interception) if needed later. D is A + an opt-in
feature on top, so starting with A closes no doors.

Options B (emitter listener ordering), C (before/after hooks baked into core),
and D (full handler arrays + withEvents feature) were evaluated and rejected
for now. See [Design Options](#design-options-evaluated) below.

---

## Implementation

### Core: Handler Arrays

`contextMenuHandlers` added alongside the existing `clickHandlers` and
`keydownHandlers`. Core dispatches to handlers first, then emits the event.

```
DOM contextmenu
  → core runs contextMenuHandlers[i](event)  ← features settle state
  → core finds target item
  → emitter.emit("item:contextmenu")         ← app sees settled state
```

Click handler ordering was also fixed — `clickHandlers` now dispatch before
`item:click` is emitted (previously the emit came first, causing apps to see
stale selection state).

**Files changed:** `types.ts`, `core.ts`, `materialize.ts`, `context.ts`,
`builder/types.ts` — one line each for the new array, plus the dispatch
logic in `core.ts`.

### Selection Feature: Configurable `contextMenu`

`withSelection()` gains a `contextMenu` option controlling right-click
selection behavior:

```ts
withSelection({
  mode: "multiple",
  contextMenu: "select",  // default
})
```

| Value      | Behavior |
|------------|----------|
| `"select"` | Right-click an unselected item clears selection and selects it. Right-click an already-selected item keeps current selection. File explorer semantics. |
| `"keep"`   | Right-click never changes selection. Context menu applies to whatever is currently selected. |
| `false`    | No contextmenu handler registered. Selection feature ignores right-clicks entirely. |

The handler shares a `findItemTarget` helper with the click handler to avoid
duplicating target resolution logic.

### Delete Event

Handled inside the selection feature's existing keyboard handler. When
Delete/Backspace is pressed with items selected, emits a `"delete"` event
with `{ selected, items }`. No separate handler array needed — delete is a
derived keyboard event, not a DOM event requiring its own extension point.

### Event Types Added

```ts
"item:contextmenu": { item: T; index: number; event: MouseEvent }
"delete": { selected: Array<string | number>; items: T[] }
```

### Bundle Impact

Zero regression — `withSelection` delta unchanged at +3.0 KB gzipped.

---

## Design Options Evaluated

Four patterns were considered. The comparison and rationale for choosing A
are preserved here for future reference.

### Option A — Handler Arrays (chosen)

Extend the existing pattern: add `contextMenuHandlers` alongside `clickHandlers`.

- **Pros:** Structural ordering, follows established pattern, explicit extension point
- **Cons:** Each interaction type needs a new array; no app-level interception
- **Cost:** ~20 lines across core files + consuming feature

### Option B — Emitter Listener

Features subscribe via `emitter.on()` during `setup()`, relying on registration
order to fire before app listeners.

- **Pros:** No new infrastructure, minimal code (~15 lines)
- **Cons:** Implicit ordering (registration order), no interception, fragile
- **Rejected:** Ordering guarantee is not contractual

### Option C — Before/After Hooks in Core

Add `emitPreventable()` to the emitter with `before:` / `after:` phases.

- **Pros:** Full lifecycle (intercept → settle → react), covers future use cases
- **Cons:** Baked into core, all users pay complexity, design surface for cancellation API
- **Rejected:** Core bloat for a capability most apps don't need

### Option D — Handler Arrays + `withEvents` Feature

Core stays minimal with handler arrays (A). An opt-in `withEvents` feature
exposes before/after interception to apps.

- **Pros:** Core stays minimal, interception is opt-in, follows vlist's plugin philosophy
- **Cons:** Two-layer system, feature ordering matters
- **Deferred:** Can be added later on top of A without any core changes

### Comparison

| Criterion            | A (chosen)  | B            | C              | D (future)           |
|----------------------|-------------|--------------|----------------|----------------------|
| Core complexity      | Low         | None         | Medium         | Low                  |
| Ordering guarantee   | Structural  | Implicit     | Structural     | Structural           |
| App interception     | No          | No           | Yes            | Yes (opt-in)         |
| Feature interception | Yes         | No           | Yes            | Yes                  |
| Follows vlist design | Yes         | Partially    | No             | Yes                  |

### State of the Art

Mature UI component libraries converge on: **internal state settles before
external events fire**, enforced structurally.

- **AG Grid** — centralized event service; internal modules process before app listeners
- **Handsontable** — `beforeX` / `afterX` hook pairs; before can cancel
- **SlickGrid** — pub/sub with internal handlers processing first
- **TanStack Virtual** — headless; no events, entirely the consumer's problem

None rely on listener registration order. All have explicit internal-then-external
pipelines. The before/after pattern appears in libraries with broad interaction
surfaces (grids, spreadsheets). Focused libraries tend toward simpler dispatch.
vlist's handler array approach aligns with the simpler end of this spectrum.
