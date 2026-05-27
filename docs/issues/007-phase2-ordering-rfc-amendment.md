---
id: "007"
title: Phase 2 ordering aligned with RFC-002 (acquire before release)
severity: low
status: fixed
component: core
related: ["RFC-003 §2.4", "RFC-002-v2"]
---

# Issue 007: Phase 2 ordering aligned with RFC-002 (acquire before release)

---

## History

RFC-002 originally specified Phase 2 sub-phase ordering as:

1. Node Acquisition
2. Identity Binding
3. Positioning
4. Node Release

The v2 implementation initially used release-first ordering. During early stabilization, the RFC-002 amendment copy was updated to document release-first, justified by pool pressure reduction.

## Revised Decision

Release-first was reverted in favor of the original RFC-002 ordering (acquire-first). The reason: releasing before acquiring can cause single-frame visual gaps where an element is removed from the DOM before its replacement is positioned. Pool pressure is not a concern because the pool is pre-allocated with sufficient capacity.

## Fix

Reordered `phase2Commit()` in `src/core/pipeline.ts`:

1. Acquire → Bind → Position loop runs first (all new elements placed in DOM)
2. Release pass runs after (stale elements removed)

Updated `RFC-002-Core-Architecture-v2.md` to match:
- Pipeline diagram: `Acquire → Bind → Position → Release`
- Sub-operations table: Acquisition first, Release last
- Acceptance criterion §7.3: acquire-first ordering

## Status

**Fixed** — `src/core/pipeline.ts`, `docs/rfcs/RFC-002-Core-Architecture-v2.md`
