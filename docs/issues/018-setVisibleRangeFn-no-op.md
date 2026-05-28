---
id: "018"
title: setVisibleRangeFn is exposed on PluginContext but does nothing
severity: low
status: open
component: core/create
related: ["RFC-002"]
---

# Issue 018: setVisibleRangeFn is exposed on PluginContext but does nothing

---

## Symptom

Plugins can call `ctx.setVisibleRangeFn(fn)` during setup, but the provided function is never used. The core always uses its own visible range calculation.

## Root Cause

`create.ts:314` — the implementation is a no-op with a comment: `/* wired in Phase B when scale plugin consumes it */`.

The method is declared in the `PluginContext` interface (`core/types.ts`) and exposed to all plugins, but no wiring exists.

## Impact

Low immediate risk — no plugin currently calls it expecting it to work. But it's a public contract that promises something it doesn't deliver. A third-party plugin author could call it and get silent failure.

## Suggested Fix

Either wire it (if scale or another plugin needs it) or remove it from `PluginContext` until it's needed. Dead API surface is worse than a missing API — one is a trap, the other is a gap.
