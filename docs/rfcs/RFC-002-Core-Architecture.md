---
created: 2026-05-27
updated: 2026-05-29
status: implemented
---

# RFC-002: vlist v2 Core Architecture

**Status:** Approved (Unanimous 3/3)  
**Authors:** Committee — Claude (Opus), Gemini (3.1 Pro), GPT (Codex)  
**Type:** Architecture  
**Approved:** 2026-05-18  
**Revised:** 2026-05-29 — Acquire-first rationale, implementation notes  
**Discussion:** [github.com/floor/vlist/discussions/68](https://github.com/floor/vlist/discussions/68)

---

## Summary

vlist v2 replaces the v1 monolithic render loop with a strict 2-phase synchronous pipeline backed by pre-allocated typed arrays. An external asynchronous invalidation loop handles measurement. The architecture enforces zero allocation on the scroll hot path while maintaining full behavioral compliance with v1.

---

## 1. The 2-Phase Pipeline

The 3-phase pipeline concept proposed in earlier drafts is rejected. Measurement is not a pipeline phase — it is an external asynchronous observer. The pipeline is strictly synchronous and zero-allocation.

```
┌─────────────────────────────────────────────────────┐
│                   Synchronous Pipeline               │
│                                                     │
│   Phase 1: Calculate & Reconcile                    │
│   ─────────────────────────────                     │
│   Reads: scrollPosition, sizeCache, containerSize   │
│   Writes: EngineState buffers (in-place mutation)   │
│   Output: LayoutWindow                              │
│                                                     │
│              ↓ (no intermediate allocations)         │
│                                                     │
│   Phase 2: Commit                                   │
│   ────────────────                                  │
│   Reads: EngineState buffers directly               │
│   Writes: DOM (batched)                             │
│   Sub-ops: Acquire → Bind → Position → Release      │
│                                                     │
└─────────────────────────────────────────────────────┘
           ↑                          │
           │                          ↓
┌──────────┴──────────────────────────────────────────┐
│   External: Measurement & Invalidation (async)      │
│   ────────────────────────────────────────          │
│   ResizeObserver → sizeCache update →               │
│   anchor preservation → rAF → Phase 1              │
└─────────────────────────────────────────────────────┘
```

### 1.1 Phase 1: Calculate & Reconcile (Zero-Allocation Hot Path)

`EngineState` is a persistent singleton instantiated **once** during `.build()`. It maintains pre-allocated typed arrays that are mutated in-place. The pipeline never allocates intermediate `{ node, transformY, itemData }` objects.

```typescript
class EngineState {
  public visibleIndices: Int32Array;
  public visibleOffsets: Float64Array;
  public visibleSizes: Float64Array;
  public visibleCount = 0;

  constructor(capacity: number) {
    this.visibleIndices = new Int32Array(capacity);
    this.visibleOffsets = new Float64Array(capacity);
    this.visibleSizes = new Float64Array(capacity);
  }

  resizeCapacity(newCapacity: number): void {
    // Cold path only — never called during active scrolling
  }
}
```

Phase 1 populates the `EngineState` buffers and yields a `LayoutWindow`:

```typescript
interface LayoutWindow {
  count: number;       // Number of visible items (0 = empty range)
  startIndex: number;  // First visible index (0 when count is 0)
}
```

The v1 empty range sentinel (`start: 0, end: -1`) is encoded natively as `count = 0, startIndex = 0`.

### 1.2 Phase 2: Commit (Direct Buffer Reads)

Phase 2 reads directly from `EngineState` buffers. It does not allocate arrays or intermediate objects. It iterates `for (let i = 0; i < state.visibleCount; i++)` and applies transforms from `state.visibleOffsets[i]` to DOM nodes.

Phase 2 executes four sub-operations in strict order:

| Sub-operation | Description |
|---|---|
| **1. Node Acquisition** | Borrow elements from the DOM pool. No element creation unless pool is empty. |
| **2. Identity Binding** | Run `render()` callback only if the item data reference changed (reference equality, not deep comparison). |
| **3. Positioning** | Apply `translateY`/`translateX` transform from `state.visibleOffsets[i]`. |
| **4. Node Release** | Return nodes no longer in the visible window back to the pool. Releasing after acquisition ensures new elements are in the DOM before stale ones are removed, preventing single-frame visual gaps. |

Acquire-first ordering ensures no visual gaps during fast scrolling: all new elements are placed in the DOM before any stale elements are removed. Pool pressure is not a concern because the pool is pre-allocated with sufficient capacity.

---

## 2. Dynamic Buffer Sizing

Buffer capacity is **not** a fixed constant. It is derived from the same v1 safety calculation:

```typescript
capacity = Math.ceil(containerHeight / minItemHeight) + overscan * 2;
```

Buffers are reallocated during the **cold path** only (container resize events). The `resizeCapacity()` method:

- **Must never shrink buffers during active scrolling** — only grows or stays the same
- Must include bounds checking to prevent out-of-range access
- Copies existing data when growing (typed array reallocation)

---

## 3. LayoutWindow Non-Contiguous Semantics

For **contiguous layouts** (standard list), `startIndex` dictates the mapping:

```
visibleIndices[i] = startIndex + i   (for i in 0..count)
```

For **non-contiguous layouts** (masonry, grid), `visibleIndices[0..visibleCount)` is **authoritative**. The layout strategy writes arbitrary indices into the buffer — they need not be sequential. Consumers must iterate `visibleIndices` directly, never assume contiguity.

---

## 4. External Asynchronous Invalidation

`ResizeObserver` is **not** a pipeline phase. It is an asynchronous observer that manages the size cache. When a measurement differs from the cached value:

### 4.1 Anchor Preservation Protocol

1. **Identify visual anchor** — the first fully visible item before the size change
2. **Update `sizeCache`** — write the new measured size
3. **Accumulate height delta (Δ)** — sum size differences for all items above the anchor
4. **Synchronously adjust `scrollTop`** — compensate by Δ to prevent visual scroll jumps
5. **Schedule Phase 1** — via `requestAnimationFrame`

This solves the measurement feedback loop without polluting the synchronous pipeline model. It mirrors `src/rendering/measured.ts:102-115`.

---

## 5. Build-Time Compiled Hooks

No closures are created on the hot path. Hooks are collected into arrays during the cold-path `.build()` and iterated linearly:

```typescript
for (let i = 0; i < calculateHooks.length; i++) {
  calculateHooks[i](singletonState);  // Mutates persistent state in-place
}
```

Build-time compilation must validate that no hook allocates objects. The v1 middleware pattern (`next()` closures) is eliminated — hooks receive the singleton state directly and mutate it in-place.

---

## 6. Strict v1 Compliance Guarantees

| Guarantee | v1 Source | v2 Implementation |
|---|---|---|
| Render count safety cap | `src/builder/core.ts:765-778` | Preserved — caps visible items to prevent runaway renders |
| Zero container size early exit | `src/builder/core.ts:745-751` | Preserved — Phase 1 returns immediately with `count = 0` |
| Empty range sentinel | `start: 0, end: -1` pattern | Encoded natively as `visibleCount = 0` on LayoutWindow |
| Overscan application | `src/builder/range.ts:44-50` | Preserved — overscan applied symmetrically around visible range |
| Compressed mode | `src/builder/core.ts:784-790` | Phase 1 maps virtual offsets to physical indices using v1 viewport transformation |
| Synchronous wheel rendering | `src/builder/core.ts:1030-1085` | Wheel events trigger `engine.render()` synchronously, bypassing `rAF` |

---

## 7. Implementation Acceptance Criteria

These criteria were established during committee review and must be met before any implementation issue is considered complete:

1. **Dynamic buffer capacity** — derived from v1 safety calculation (`containerHeight / minItemHeight + overscan * 2`), never shrunk during active scrolling
2. **Authoritative non-contiguous indices** — `visibleIndices[0..visibleCount)` is the source of truth for masonry/grid layouts
3. **Phase 2 strict sub-operation ordering** — Acquire → Bind → Position → Release, no reordering
4. **Measurement anchor preservation** — scroll compensation applied synchronously before rAF schedule
5. **Identity binding via reference equality** — matches v1 item identity semantics, no deep comparison
6. **Zero-allocation hook validation** — build-time compilation rejects hooks that allocate on the hot path

---

## 8. Committee Review History

The specification went through four major revisions based on committee feedback:

- **V1** (3-phase pipeline) — Rejected. Measurement as a pipeline phase created circular dependencies. Reconciliation allocated per-frame objects.
- **V2** (2-phase + external measurement) — Rejected. Insufficient implementation detail. Fixed buffer size, no anchor preservation.
- **V3** (added v1 compliance section) — Rejected. Still lacked dynamic sizing, non-contiguous layout semantics, and Phase 2 sub-operations.
- **V4** (current) — **Approved unanimously.** Addresses all critical gaps: dynamic buffers, non-contiguous semantics, Phase 2 ordering, anchor preservation, identity binding.

**Final Vote:**
| Reviewer | Vote | Notes |
|---|---|---|
| Claude (Opus) | **Approve** | No conditions. Full v1 behavioral compliance confirmed. |
| Gemini (3.1 Pro) | **Approve** | Author. |
| GPT (Codex) | **Approve** | With two acceptance criteria (incorporated into Section 7). |

---

## 9. Implementation Notes

The v2 implementation deviates from this specification in two areas:

- **LayoutWindow** — No separate `LayoutWindow` interface exists. `count` and `startIndex` live directly on `EngineState`, and Phase 1 returns a boolean changed-flag. Semantically equivalent.
- **Phase 2 sub-operations** — Acquire, Bind, and Position are interleaved per-item in a single loop, followed by a batch DOM flush, then Release. The critical invariant (Release after Acquire) is preserved. Interleaving is more cache-friendly than four separate passes.
