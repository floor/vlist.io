# RFC-012 Implementation Review — Consolidated Findings

**Date:** 2026-06-07
**Updated:** 2026-06-07
**Reviewers:** GPT-5.5, Gemini 3.1, Opus 4.6 (CTO)
**For:** Opus 4.8

---

## Status

Phases 0–4 complete. Two of three P1 bugs fixed (`283b2d5`). Carousel routed through bounded wrap (`d67ff72`). One P1 remains (grid/table/masonry bypass) — the sole blocker for RFC-013.

## Overall Verdict

The architecture is right. The bounded list path and carousel wrap mode are proven. One P1 bug (renderer bypass) and one mobile risk remain before bounded can become the only scroll model (RFC-013).

| Reviewer | Verdict |
|----------|---------|
| GPT-5.5 | REJECT for release — conditional approve for core prototype |
| Gemini 3.1 | APPROVE — outstanding implementation, one mobile risk |
| Opus 4.6 | APPROVE — P1 fixes needed before RFC-013 can proceed |

---

## What's working well

### `{ index, offsetPx }` — unanimous praise

The scroll-model.ts implementation around `{ index, offsetPx }` is correct. A 10px scroll always feels like 10px regardless of item size. The pixel-equivalent public API is preserved without being constrained by DOM limits. (Gemini, GPT, Opus 4.6 all confirm.)

### `overflow-anchor: none` — correctly applied

Applied in `src/core/dom.ts`. Without it, Chrome/Firefox would fight DOM recycling during scroll, causing stuttering against the bounded runway. (Gemini confirmed.)

### Trackpad momentum — elegantly solved

By intercepting wheel events (`event.preventDefault()` + `setLogical(next)`) when `wheelEnabled` is true, macOS trackpad momentum is absorbed smoothly across rebases. macOS continues firing wheel events during inertial coast, so `setLogical` handles them without the browser snapping. (Gemini confirmed.)

### Scale/compression removal — clean

11,000+ lines of legacy code deleted. The scale plugin, compression context, and all 516 references are gone. `bun test` → 3759 pass. `bun run typecheck` clean. (GPT verified, Opus 4.6 approved.)

---

## P1 — Must fix

### ~~1. Bounded geometry stale after resize~~ ✓ FIXED

**Found by:** GPT-5.5 — **Fixed in:** `283b2d5`
**Fix:** ResizeObserver now calls `boundedHandler.refresh()`. One-liner.

### 2. Grid/table/masonry bypass bounded content sizing

**Found by:** GPT-5.5
**File:** `src/core/create.ts` line 513, `src/plugins/grid/plugin.ts` lines 227-234
**Bug:** Core skips `syncContentSize()` once a plugin installs `setRenderFn()`. Grid (and likely table, masonry) write absolute transforms and content sizes directly. Grid with bounded + 1M × 50px writes 50,000,000px — reintroducing the browser limit.
**Verified:** GPT tested `grid({ columns: 1 }) + bounded + 1M × 50px` → writes full physical size.
**Fix:** Every first-party renderer must route content sizing through the bounded machinery. Renderers need to subtract `baseOffset` and cap content size to the runway. This is the biggest piece of work.
**Impact:** This is the #1 blocker for RFC-013 (bounded-only). If plugins can bypass bounded, it can't be the only mode.

### ~~3. Page mode + bounded conflict~~ ✓ FIXED

**Found by:** GPT-5.5 — **Fixed in:** `283b2d5`
**Fix:** Throws explicit error when `page()` and `scroll: { mode: "bounded" }` are configured together.
**Long term (RFC-013 gate):** Implement bounded page-mode proxy as committed in RFC-012 design section. Page mode must not require unbounded document height.

---

## P2 — Should fix

### 4. Native scrollbar thumb jump on rebase

**Found by:** GPT-5.5
**File:** `src/core/bounded-scroll.ts` line 137
**Bug:** `maybeRebase()` preserves logical position but mutates `scrollTop`/`scrollLeft`. Users dragging the native scrollbar see the thumb jump/recenter. AT/browser scroll range only sees the runway.
**Fix:** Bounded mode should require the virtual scrollbar (or at minimum strongly recommend it). RFC-013 makes this mandatory — all scrollbars virtual.
**Note from Opus 4.6:** This reinforces RFC-013. If bounded-only requires virtual scrollbar, this problem disappears entirely.

### 5. Semver violation

**Found by:** GPT-5.5
**File:** `CHANGELOG.md` line 20, `package.json` line 3
**Bug:** Changelog removes `scale()` and internals immediately. Package is at 2.3.0. This is a semver-major change, not a minor cleanup.
**Fix:** Either:
- Ship as 3.0 (GPT and Opus 4.6 agree this is "vlist 3.0 territory")
- Or keep `scale()` as a no-op with deprecation warning for one 2.x release, then remove in 3.0

---

## P2 — Mobile risk

### 6. Touch momentum killed by rebase on iOS Safari

**Found by:** Gemini 3.1
**Mechanism:** Unlike trackpad wheel events, touch flings on iOS Safari and Android Chrome animate `scrollTop` natively without emitting wheel events. When `onScrollEvent` detects crossing `BOUNDED_REBASE_LOW` (0.25) and calls `maybeRebase()` → `setScrollTop(...)`, iOS Safari instantly kills the native momentum, stopping the scroll dead.
**Window:** With `BOUNDED_RUNWAY_FACTOR = 2`, the native scrollbar has ~0.5× viewport of travel before rebase triggers. A fast mobile flick can hit that in frames.
**Fix options:**
1. **Defer rebase to scroll idle** — detect when scroll events stop firing, rebase then
2. **Increase runway** — `BOUNDED_RUNWAY_FACTOR = 3` or `4` for more headroom
3. **Both** — larger runway + idle-only rebase as safety net
**Status:** This needs testing on actual iOS Safari. Was it covered in the Phase 0 browser matrix?

---

## GPT's broader assessment

> "The shipped model is 'bounded default list,' not yet 'bounded vlist.' Giant native content is still better for small/medium lists, page-integrated document scrolling, and public plugin combinations until those renderers subtract baseOffset and route sizing through the bounded adapter."

> "{ index, offsetPx } is not yet the actual core state — core still runs mostly on pixel-equivalent state.scrollPosition, with helper conversions in scroll-model.ts line 32."

This means Phase 1 of RFC-012 is partially complete. The scroll model layer exists but core hasn't fully migrated to it as the source of truth. This is fine for now but must be completed before RFC-013.

---

## Gemini's broader assessment

> "Incredible work. You pulled out the roots of a very deep architectural debt and replaced it with a strictly superior, cleaner, and more robust bounded runway model."

Gemini sees the implementation as architecturally complete for the default list case. The only open risk is mobile touch momentum.

---

## CTO summary (Opus 4.6)

### Remaining fix priority

| Priority | Item | Status |
|----------|------|--------|
| ~~P1~~ | ~~Resize refresh~~ | ✓ Fixed (`283b2d5`) |
| P1 | Grid/table/masonry bounded routing | **Open** — needs renderer changes |
| ~~P1~~ | ~~Page mode guard (throw)~~ | ✓ Fixed (`283b2d5`) |
| P2 | Semver — decide 3.0 vs compat cycle | Decision, not code |
| P2 | Mobile touch rebase | Needs iOS testing first |
| P2 | Native scrollbar thumb jump | Solved by RFC-013 (virtual-only) |

### Sequence (updated)

1. ~~Fix the three P1s in the current branch~~ — two of three done
2. Fix P1 #2: grid/table/masonry must route content sizing through bounded — sole remaining blocker
3. Test touch momentum on iOS Safari — if it fails, implement idle-only rebase
4. Decide semver strategy (CTO recommendation: ship fixes as 2.x, RFC-013 as 3.0)
5. RFC-013 (bounded-only) lands as vlist 3.0 once all renderers route through bounded

### What's NOT blocking

- RTL normalization — Phase 1 checklist, not a gate
- ARIA scrollbar contract — Phase 1 checklist

---

## RFC-013 Assessment — Unified Scroll Model

**Reviewers:** GPT-5.5, Opus 4.8, Opus 4.6 (CTO)
**Consensus:** Approve the destination, reject the framing.

### The problem with the RFC

RFC-013 presents bounded-only as "mostly deletion, net-negative lines." All three reviewers independently rejected this framing. The real work is additive first — you must build the bounded plumbing into every renderer and page mode before you can delete the native path.

### Four hard gates (must close before the flip)

| Gate | Description | Status |
|------|-------------|--------|
| **1. Renderer routing** (P1 #2) | Grid, table, masonry install `setRenderFn()` and bypass `syncContentSize()`. They write full physical content sizes, reintroducing the browser limit. Every first-party renderer must subtract `baseOffset` and cap content to the runway. | **Open** — sole RFC-012 P1 remaining |
| **2. iOS touch momentum** (P2 #6) | Bounded-only makes rebase universal. Touch flings on iOS Safari animate `scrollTop` natively; `setScrollTop()` during rebase kills momentum. Today this is opt-in risk; under RFC-013 it hits every list. | **Open** — needs device testing, then idle-only rebase |
| **3. Bounded page-mode proxy** | RFC-012 only landed a guard that throws (`283b2d5`). The bounded page-mode proxy was designed but never implemented. Bounded-only removes the native fallback, making this proxy required. | **Open** — unbuilt dependency |
| **4. `{ index, offsetPx }` core migration** | RFC-013 §One scroll contract presents `getLogical()` as the sole contract, but core still runs on pixel-based `state.scrollPosition` with conversion helpers in `scroll-model.ts`. Making the adapter the only contract means finishing this migration. | **Open** — incremental, not just deletion |

### Tradeoff that needs top billing

The RFC treats "native scrollbar disappears" as a footnote. Under bounded-only, this becomes a universal, non-opt-out cost. vlist targets non-React developers who expect platform-native behavior. Losing the OS-native scrollbar for everyone is a UX and positioning decision — it should be discussed as a first-class tradeoff, not listed under "what you lose."

### Open questions resolved

- **Q1 (`runwayFactor` public?):** Keep internal. Already tuned 10→3→2; exposing it invites misuse. The existing `scroll.runway` escape hatch for power users is harmless but shouldn't be promoted.
- **Q3 (timing):** Not alongside Phase 3b cleanup. Because of gates #1–#3, it isn't just-deletion. Sequence: (a) route all renderers through bounded, (b) solve iOS rebase, (c) build bounded page-mode proxy, (d) finish `{ index, offsetPx }` core migration — then flip the default and delete native. That's a 3.0.

### CTO verdict (Opus 4.6)

Reframe the RFC's Implementation section. "Estimated diff: net negative" should read "net positive until the renderers, iOS, and page-mode gates are closed; net negative only at the final flip." The RFC's §Implementation should list the four gates as explicit phases, not present the work as five steps of deletion.

Ship RFC-012 fixes as 2.x. RFC-013 lands as vlist 3.0.

---

## Phase 4 Review — Carousel Bounded Wrap (`d67ff72`)

**Reviewed by:** Opus 4.6 (CTO)
**Verdict:** APPROVE — clean, correct, well-tested.

8 files changed, 291 insertions, 115 deletions. Carousel reduced by 145 lines net.

### What changed

The carousel no longer manages its own rebasing, smooth-scroll animation, or raw `scrollTop` writes. It requests a wrap-capable bounded handler via `ctx.setBoundedWrap` and computes only targets — the handler does all scrolling.

- **`WrapConfig` interface** on bounded handler — callbacks for `lapSize()` and `home()` allow dynamic geometry. Carousel can change `realTotal` without re-initialization.
- **Wrap mode in `applySplit()`** — never clamps logical position, pins scrollTop to runway centre, drives all motion through baseOffset.
- **`wrapRebase()`** — folds logical position toward `home` by whole laps once drift exceeds `thresholdLaps`. Shifts `scrollPosition`, `prevScrollPosition`, and `baseOffset` by the same amount — scrollTop and transforms untouched.
- **Item transforms** subtract `engineState.baseOffset` — translates from logical to runway coordinates. No-op in native mode.
- **Snap-to-item** moved from `setTimeout(200)` to the engine's `onIdle` hook — eliminates the race between timer and scroll momentum.
- **Mock `scrollTo`** now updates `engineState.scrollPosition` — matches real adapter behavior; autosize anchor accumulation test updated accordingly.

### Invariant verification

After `maybeRebase`: `baseOffset = scrollPosition - centre`. After `wrapRebase`: both shift by same whole laps → invariant preserved. scrollTop stays pinned to centre throughout.

### One thing to track

`getScrollPosition()` for a carousel now returns the raw logical position instead of a lap-normalized value. Correct for the scroll adapter model, but a behavior change for consumers. Worth a migration note if this ships as 2.x; absorbed into the 3.0 break otherwise.

### Tests

147 lines of wrap mode tests: content sizing (runway never degenerates), no-clamp verification, fold-back at threshold with visual identity check (`renderSnapshot()`), threshold guard (no fold within threshold).
