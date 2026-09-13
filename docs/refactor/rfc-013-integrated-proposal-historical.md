> **Historical — superseded locally 2026-09-10.** Snapshot of the proposal read from [discussion #117](https://github.com/floor/vlist/discussions/117). Follow [canonical RFC-013](../rfcs/RFC-013-Spatial-Navigation-Model.md); this text does not authorize a synthetic default.


# RFC-013: Spatial Navigation Model

**Status:** Draft · **Target:** vlist 3.0 · **Extends:** RFC-012 (Logical Scroll Model)

> **v3 ships the 1D case only.** This RFC adopts a camera/navigation *model* (virtualization
> as a camera over a coordinate space) but its v3 *deliverable* is the unified 1D scroll
> engine — one scroll model, no native-vs-bounded duality. 2D/Z are fenced as explicitly
> future phases (§7). The model is the *why*; the 1D engine is the *what ships*.
>
> This document merges two prior RFC-013 drafts that collided on the number: *Unified Scroll
> Model* (bounded-only, [discussion #117](https://github.com/floor/vlist/discussions/117)) and
> *Spatial Navigation Model* (camera/frustum). Full gate-by-gate implementation detail lives
> in `docs/refactor/rfc-013-implementation-plan.md`.

---

## 0. Scope fence (read first)

| In v3 | NOT in v3 (future phases of this RFC) |
|-------|----------------------------------------|
| One scroll model (bounded-only); native viewport path removed | 2D co-equal X/Y virtualization |
| A navigation engine that **owns its input** — **scoped-minimal synthetic touch** (§4, resolved) | Z / depth, 3D fly-through |
| Overscan reframed as a **culling margin** with a DOM-node cap (Phase A — back-compatible) | Frustum-3D culling shapes, spatial index |
| The camera vocabulary + the public 1D API, unchanged for consumers | `navigateTo({x,y,z})`, `getCameraPosition()` |
| Synthetic boundary = **hard stop** (no rubber-band); scroll-chaining passthrough | Rubber-band / spring overscroll, full iOS feel-parity |

The whole RFC is unshippable if it drifts past this line. 2D/Z are sketched in §7 so the v3
engine is built without foreclosing them — not so they ship in 3.0.

---

## 1. Summary

RFC-012 replaced the giant physical `vlist-content` with a **logical scroll position** and a
small bounded runway. This RFC generalizes that result into one sentence:

> A virtualized list is a **camera over a virtual coordinate space.** The viewport is the
> camera's projection window. *Navigation* moves the camera; *rendering* projects the items
> inside the view (plus a culling margin) into the DOM.

Scroll is **1D camera translation** — one navigation mode. **v3 makes that the only scroll
model** (no native-vs-bounded duality) and runs it on an engine that can drive its own input,
which is what finally resolves the iOS touch-momentum problem (§4). The same engine is the
foundation 2D/Z build on later — but **v3 ships 1D.**

---

## 2. Motivation — two problems, one resolution

RFC-012 left two things unresolved, and they have the **same** fix:

1. **The dual path.** Native scroll vs bounded scroll — every plugin handles both, the test
   matrix doubles. This was the original *Unified Scroll Model* motivation: collapse to one
   model. (Settled; see §3.)
2. **The native runway's touch story is fragile.** To scroll past the bounded runway you
   *rebase* (shift `baseOffset` + write `scrollTop`), and writing `scrollTop` mid-fling kills
   iOS Safari momentum. This is **concrete in today's code**: `runway.ts:171-196` calls
   `setScrollTop()` **synchronously inside `onScrollEvent`** — i.e. during an active native
   fling — with **no** `scrollend`/fling guard, and `BOUNDED_RUNWAY_FACTOR = 2`
   (`constants.ts:90`) gives only a 2× viewport runway that a fast fling exhausts in under a
   second. The *Spatial* draft called this out on 2026-06-07; an adversarial review (Gemini,
   2026-06-13) confirmed it is a nest of races — `scrollend` timing, rapid-fling runway
   exhaustion, overscroll cancellation, scroll-anchoring conflict.

Both resolve by **owning the input** instead of leaning on native scroll. The camera model
names *why*: a camera doesn't ask the browser where it is — it *is* the source of truth and
projects items accordingly. That reframing turns "fight native momentum" into "drive
momentum," a tuning problem rather than a race.

---

## 3. Settled decisions (from discussion #117 — not re-litigated)

These are fixed; reviewers should not re-open them. Detail and status in the implementation plan.

- **Bounded is the only scroll model.** `scroll.mode` is removed. Ships as **vlist 3.0**.
- **`page()` stays a native-document island** behind the `skipDefaultScroll` seam — not a
  bounded proxy. Keeps its existing ~349,525-item ceiling (not a regression). *(Gate C)*
- **All scrollbars are virtual** — a bundled, on-by-default, suppressible overlay at every
  size; AT/UX parity is a release gate. *(Gate SB)*
- **RTL** horizontal under bounded-only is fail-loud unless explicitly normalized + tested.
  *(Gate RTL)*
- **Adapter-as-source-of-truth** is a post-3.0 refactor. *(Gate D)*

What this RFC *adds* to #117 is the camera framing and the **navigation-engine decision**
(§4) — now **resolved to scoped-minimal synthetic touch**, which is how **Gate B** is solved.

---

## 4. The navigation engine — decision: scoped-minimal synthetic touch

Two engines satisfy the same `camera → visible region → render` contract. v3 must pick the
**touch input path**; everything else (wheel, keyboard, scrollbar) is already shared.

| Engine | Content box | Input | Momentum | Net |
|--------|-------------|-------|----------|-----|
| **A — Native runway** (RFC-012 Option C) | `viewport × runway` | native touch + synthetic wheel | the browser's; **rebasing can interrupt it** | broad support; fragile on iOS |
| **B — Synthetic** (RFC-012 Option B) | exactly `viewport` | wheel + touch/pointer + keys, **owned inertia** | ours; **no rebase, no `scrollTop` write** | clean; must build inertia |

**The wheel/trackpad path is already synthetic** — `onWheelEvent` (`runway.ts:216-246`) does
`preventDefault()` + `setLogical()`, bypassing native scroll; `smoothScrollTo` is synthetic;
Gate SB makes the scrollbar virtual. The **only** input still flowing through native scroll
(`onScrollEvent`, `runway.ts:154-167`) is **touch momentum and native-scrollbar drag** — and
touch momentum is exactly Gate B's pain. *(The earlier "~90% synthetic" framing was imprecise:
it's true for wheel/keyboard/programmatic, not for the touch fling path, which is 100% native
today. Corrected per committee review.)*

### Decision: **Option B, scoped to a minimal v3-sized deliverable.**

B is chosen because it **dissolves the entire `scrollTop`-mid-fling bug class** rather than
managing it (A only makes the race rarer; see "A, and why not" below). The committee's
load-bearing objection was B's *cost* — answered by **scoping B to the minimum that ships**,
deferring the expensive feel-parity work:

**Ships in v3 (the minimal synthetic engine):**
- **Content = viewport** (no runway); intercept `touchstart/move/end` + pointer.
- **Exponential-decay inertia**: `v(t) = v₀ · e^(−friction·t)`, seeded by touch-end velocity
  from the existing tracker (`velocity.ts`; ~16ms `touchmove` cadence is fine for capture).
  Position by transform via `setLogical`. This is ~50 lines — a known, standard model.
- **Scroll-chaining passthrough** (~10 lines): when logical position is at `0` or `max` and
  the touch delta would push past it, **do not `preventDefault()`** — let the parent scroll.
  This is the boundary-detection native scroll gives for free; without it, embedded lists trap
  the gesture.
- **Boundary = hard stop** (no rubber-band) in v3. Documented as a known limitation.

**Explicitly deferred to post-3.0 (the "tar pit" the committee feared):**
- Rubber-band / spring overscroll (the compositor-tied iOS feel).
- Full iOS-native deceleration-curve parity (v3 ships a good-enough curve, tunable on device).

**Known limitations shipped honestly (not hidden):**
- **`passive: false` on `touchmove`** opts out of compositor-thread scrolling. On low-end
  Android this can add a one-frame start latency (the JS handler must run first). Accepted
  tradeoff — the same one the wheel handler already makes (`runway.ts:329`).
- **`touch-action: none`** on the viewport disables browser pull-to-refresh and edge
  back/forward swipe *over the list*. Fine for full-page lists; for small embedded widgets it
  is a behavior change — call it out in the migration guide.
- Boundary hard-stop (above) until post-3.0 rubber-band lands.

**A, and why not (kept as the documented fallback).** Hardened native-runway = rebase on
`scrollend` (Safari 16.4+/Chrome 114+) instead of synchronously in `onScrollEvent`;
`BOUNDED_RUNWAY_FACTOR` 2 → ~50× so fling exhaustion is unreachable; abort rebase while
`scrollTop ∉ [0, maxScrollTop]`; keep `overflow-anchor: none`. It is less new code, but its
**residual risk is a *stall*** — an intermittent momentum hard-stop on iOS under `scrollend`
mistiming that may never fully close. We prefer B's residual (a *tunable feel gap*) over A's
(a *catastrophic stall*). If scoped-B's device validation (§8) fails feel acceptance, A is the
fallback and B becomes the first post-3.0 spatial increment.

---

## 5. Overscan as a culling margin (Phase A — back-compatible, v3-eligible)

Independent of the engine choice, the camera model reframes **overscan** as a **culling
margin** around the viewport — *which items sit in the DOM just past the visible edges*.

- **Distance is the internal primitive** (pixels per side), correct under variable item sizes
  where a fixed "3 items" is an inconsistent physical buffer. Drops into the existing range
  calc: `indexAtOffset(camPos − margin) … indexAtOffset(camPos + viewport + margin)`.
- **Default unit is viewport-relative** (≈ 0.3–0.5 × viewport per side), auto-adapting to
  device size — consistent with RFC-012's runway-factor reasoning.
- **Hard DOM-node cap (required).** A viewport-relative margin over a list of tiny items can
  resolve to a huge node count, so the margin is clamped to a `maxOverscanNodes` budget
  (per side). The cap, not the distance, bounds the worst case — a margin that would exceed it
  is truncated. *(Committee flagged the uncapped distance as a DOM-blowup risk.)*
- **No double-counting.** `overscan: 3` (item-count) and the pixel margin are **not** additive:
  the item-count API converts to a pixel margin (`overscan × estimatedItemSize`) and the range
  calc uses the single resulting band. The conversion is explicit in the implementation plan.
- **`overscan: 3` (item-count) stays** for back-compat and a predictable DOM-node budget.
- **1D = a band on the two ends.** (2D ring / 3D shell are §7, not v3.)

Back-compatible at defaults and independently useful, so it can land in v3 regardless of the
engine decision. It is also the seam through which 2D/Z later attach.

---

## 6. The load-bearing question — answered

The open question was **the cost of Option B**: a v3-sized deliverable, or a multi-quarter
feel-parity tar pit? The committee review (§12) resolved it by **separating the cheap core
from the expensive feel-work** (§4):

1. **Is synthetic touch shippable in v3?** Yes — *scoped*. The inertia core is a standard
   exponential-decay model (~50 lines) seeded by the existing velocity tracker. The genuinely
   hard parts the committee surfaced are handled by scoping, not heroics:
   - **Scroll chaining** → boundary passthrough (~10 lines): don't `preventDefault()` at the
     logical edge, let the parent scroll. *(Was unmentioned in the prior draft — now in §4.)*
   - **`passive:false` Android jank** and **`touch-action:none` side effects** → accepted,
     documented limitations (§4), not silent.
   - **Rubber-band / iOS feel-parity** → **deferred post-3.0.** This is the tar-pit risk; v3
     does not take it on. Boundary is a hard stop in v3.
2. **Is A a viable fallback?** Yes, and it is documented as such (§4). A's residual is a
   *stall* (catastrophic); B-scoped's is a *tunable feel gap*. We ship B and keep A as the
   fallback if device feel-acceptance (§8) fails.
3. **The smaller-than-feared path to B** is exactly what v3 ships (item 1). The expensive
   surface is fenced to post-3.0.
4. **Lock-in:** none that hurts v3. The public API (`scrollToIndex` / `getScrollPosition`,
   1D pixel-equivalent) is frozen forever (§7); choosing B now does not foreclose A as a
   fallback, since both satisfy the same `camera → visible region → render` contract.

> Reviewers attacking this RFC should now attack the **scope line** in §4 — is the
> deferred-vs-shipped split honest? — not whether B is "doable" in the abstract.

---

## 7. Fenced future phases (NOT v3 — sketch only)

Listed so the v3 engine is built without foreclosing them. None of this ships in 3.0.

| Phase | Scope |
|-------|-------|
| **F1 — 2D visible region** | co-equal X/Y range computation; overscan becomes a **ring** (pad all four sides); per-axis virtual scrollbars. Likely defaults to the synthetic engine (native 2D would mean rebasing two axes at once). |
| **F2 — Z / depth** | a depth coordinate; culling becomes a **shell** (box or sphere); 3D projection; `navigateTo({z})`. Genuinely speculative — a model check, probably YAGNI for DOM. |
| **F3 — Spatial index** | grids stay O(1)/axis via prefix sums; free-form 2D/3D layouts (scatter, masonry-2D) may need a grid-hash / R-tree. |

Public API forward-compat constraint (so v3 doesn't paint us in): `scrollToIndex` and
`getScrollPosition` (1D pixel-equivalent) stay forever; a future `navigateTo` /
`getCameraPosition` generalizes them without breaking 1D consumers.

---

## 8. Verification (scoped-B is the target; A is the fallback)

A layered ladder, with an honest correction from Gemini's review baked in:

| Layer | Engine | Role |
|-------|--------|------|
| 1 — invariants | `bun test` happy-dom | deterministic logic (TDD, same commit) |
| 2 — real engines | Android Emulator (real Chrome) + iOS Simulator (real WebKit) | **fast-fail filter** — catch failures cheaply; **does NOT certify** (trackpad ≠ finger; emulator input ≠ true compositor pipeline) |
| 3 — physical device | iPhone + Android | **the gate** — clears Gate B; calibrates the factor / tunes the feel |

For **Option A** the validation target is the *binary* "does a `scrollTop` write stall
momentum?" (a stall is catastrophic). For **Option B** the target is *feel parity* (tunable) —
friendlier to validate, still device-gated.

---

## 9. What you lose (bounded-only, 1D)

- **Native OS scrollbar** for every list — the virtual overlay replaces it at all sizes (Gate
  SB). Accessibility/platform-feel parity is therefore a release gate, not a footnote.
- **DevTools `scrollTop`** is always ~0 under scoped-synthetic B (the runway-local value only
  if the A fallback ships), not the logical position. Use `getScrollPosition()`.
- **Native find-in-page / scroll-to-reveal** for offscreen items — already limited by
  virtualization; not a new regression.
- **`page()`'s ceiling stays** ~349,525 items (the 16.7M px document cap) — its existing
  limit, consciously not raised.

---

## 10. Implementation

Full detail and live status: `docs/refactor/rfc-013-implementation-plan.md`. Summary of the
gate set (B's *mechanism* is the §4 scoped-synthetic engine):

| Gate | Scope | Status |
|------|-------|--------|
| **A / A′ / A″** | renderers + resize + self-managed plugins routed through bounded | ✅ done (`54fb8f0`, `283b2d5`, `e2ba4b0`, `e182f3a`) |
| **B — touch momentum** | **decided: scoped-minimal synthetic** (§4) — ~50-line inertia + ~10-line chaining passthrough; rubber-band deferred | 🔴 open — release gate; device feel-validated |
| **C — page() island** | `skipDefaultScroll` ⇒ no bounded handler + full-height sizing; one seam | 🟡 small implementation |
| **SB — virtual scrollbar + AT parity** | overlay at every size reaches native scrollbar UX + SR parity — **explicit ARIA/keyboard/focus checklist** | 🔴 open — **ship-blocker**; zero a11y today |
| **RTL — horizontal policy** | normalize `scrollLeft` + test, or fail-loud | 🔴 open — needs policy |
| **D — adapter as source of truth** | logical state canonical, not pixel | 🟡 non-blocking, post-3.0 |
| **E — flip + delete** | remove `scroll.mode` + native viewport path | ⬜ blocked on B, C, SB, RTL |

### Gate C — page() as a native-document island
`page()` keeps native **document** scroll behind the `skipDefaultScroll` seam — it never used
the native *viewport* handler bounded-only deletes (`create.ts:757`) and leaves `baseOffset`
at 0. Discipline: page's native-ness stays behind that **one** seam, never `if (pageMode)`
checks across the pipeline. Known limit: ~349,525-item document cap (existing, not raised).

### Gate SB — virtual scrollbar + accessibility parity **(ship-blocker)**
Removing native scroll commits vlist to a custom scrollbar for **every** list — including users
who today set `scrollbar: "native"` (`src/types.ts`). Native scrollbars give free ARIA/AT
bindings and keyboard behavior; today `src/plugins/scrollbar/scrollbar.ts` builds track/thumb
DOM with **zero** of it. Making this mandatory while the replacement has no accessibility
semantics is a **breaking a11y regression**, so Gate SB is a hard release gate with an explicit
acceptance checklist — *every* box must be proven (committee: all three reviewers independently
flagged this as the ship-blocker):

- [ ] `role="scrollbar"` on the thumb element.
- [ ] `aria-valuenow` / `aria-valuemin` / `aria-valuemax` reflect logical position, **updated
      per frame for sighted users but throttled for SR** (e.g. settle/idle) to avoid flooding.
- [ ] `aria-controls` → the viewport element; `aria-orientation` matches the axis.
- [ ] **Keyboard**: `PageUp`/`PageDown`, arrows, `Home`/`End` map to logical position —
      built in, not dependent on the opt-in `a11y` plugin.
- [ ] **Focus management**: the scrollbar is reachable and operable by keyboard users.
- [ ] **Pointer**: drag / track-click / wheel over the scrollbar map to logical position.
- [ ] Theming + `prefers-reduced-motion` respected.
- [ ] `scrollbar: false` yields **no** scrollbar DOM and no a11y nodes.
- [ ] Automated acceptance tests for each of the above (SR snapshot, keyboard, pointer).
- [ ] **`page()` carve-out**: it keeps the document's native scrollbar (no virtual overlay).

Until this checklist is green, the "no native scrollbar" decision (§3) is not shippable.

### Gate RTL — horizontal policy
RTL horizontal under bounded-only is **broken today** and must not ship silently. `scrollLeft`
in RTL has three incompatible behaviors across engines (negative in Firefox/Chrome,
positive-decreasing in old WebKit), and bounded `applySplit` (`runway.ts:128-145`) assumes a
simple positive offset. **v3 default: fail-loud** — a dev-time `throw`/warning for bounded
horizontal RTL. Lifting it to *supported* requires normalizing `scrollLeft` across the engine
matrix **and** an RTL rebase/scroll test; until then, fail-loud is the only honest option.
*(With scoped-synthetic B owning position by transform rather than `scrollLeft`, normalization
becomes tractable post-3.0 — but v3 ships fail-loud.)*

### Phase D — adapter as source of truth (non-blocking)
Make `ScrollAdapter` canonical instead of a wrapper over pixel state. No behavior change; ships
after 3.0. New plugin work should prefer `ScrollAdapter` now.

### Phase E — flip + delete
Once B/C/SB/RTL close: remove `scroll.mode`, delete the native viewport path
(`src/core/scroll.ts`), drop native-path scrollbar branches, remove dual-mode tests, update
docs. Net-negative lines.

---

## 11. Migration

### For vlist users
- Remove `scroll: { mode: "bounded" }` from config — it's now the default and only mode.
- If using `scale()` (deprecated in RFC-012), remove it entirely.
- If relying on native scrollbar appearance, configure/style the `scrollbar()` overlay.
- **Embedded/widget lists:** v3 sets `touch-action: none` on the viewport, which disables
  browser pull-to-refresh and edge back/forward swipe *over the list*. Full-page lists are
  unaffected; small embedded widgets should verify this is acceptable (§4 known limitations).

### For plugin authors
- Remove any `scroll.mode` checks.
- Use `ScrollAdapter` exclusively — no raw `scrollTop` reads for scroll position.
- Cross-axis scroll (horizontal table overflow) remains native and unaffected.
- **Start now, ahead of Phase D:** prefer `ScrollAdapter` (`getLogical()` /
  `getPixelEquivalent()` / `scrollByPx()`) over `engineState.scrollPosition` / `baseOffset`.
  Adapter-written code needs no change when Phase D lands; raw-pixel code will.

### Semver
Major breaking change → **vlist 3.0**. Breaking changes:
- `scroll.mode` removed; `scale()` plugin removed.
- Native OS scrollbar no longer appears for any list — virtual overlay replaces it (Gate SB).
- `getScrollPosition()` on carousel returns raw logical position, not the lap-normalized value.
  *(Verify before listing: carousel does not override `scrollGetFn` (`create.ts:630`), so it
  may already return raw logical — if so this is not a change and should be dropped from this
  list to avoid confusing the migration.)*
- `internals.ts` exports reduced (legacy rendering modules deleted in RFC-012 Phase 3b).

**Deprecation path (concrete).** Today `create.ts:190` reads `rawConfig.scroll?.mode` with **no
warning**. The last 2.x release must emit a one-time `console.warn` whenever `scroll.mode` is
set (either value), pointing to the 3.0 migration guide — so 3.0's removal isn't a silent break.

---

## 12. Review history

**Committee (2026-06-07).** GPT-5.5 / Opus 4.8 / Gemini 3.1 / Opus 4.6 (CTO): approve the
destination, reject the original "mostly deletion" framing → reframed as phased gates.

**Discussion #117 (2026-06-13).** Codex (GPT-5) and Gemini 3.1 independently elevated
**virtual-scrollbar + accessibility parity** to a release gate co-equal with Gate B (→ Gate
SB). Gate C resolved to the page-mode island (no bounded proxy). Re-verification against
`staging` confirmed gates A/A′/A″ landed.

**Gemini's Gate B review (2026-06-13).** REJECTED the native-runway-rebasing plan as a nest of
races (idle-timeout brittleness → use `scrollend`; rapid-fling runway exhaustion → 50×;
overscroll cancellation → guard; scroll-anchoring → `overflow-anchor:none`, already present).
This directly motivated §4: rather than harden native-runway indefinitely, evaluate the
**synthetic engine** (Option B), which the prior Spatial draft had already proposed.

**Revision (2026-06-13).** Merges the Unified Scroll Model and Spatial Navigation drafts;
adopts the camera framing; reopens Gate B as the §4 A/B decision (synthetic proposed); fences
2D/Z. Submitted for adversarial review of Option B's cost (§6).

**Deliberative committee (2026-06-14, [#117](https://github.com/floor/vlist/discussions/117)).**
A three-agent local committee (Claude Opus 4.6, Codex/GPT-5, Grok) deliberated over multiple
rounds via Floor Agents. **Outcome: rejected as written** — destination endorsed, but: (1) the
doc described Option A as `scrollend`-rebasing while the code does synchronous `setScrollTop`
in `onScrollEvent` with `FACTOR=2`; (2) Option B was under-costed (scroll-chaining,
`passive:false` jank, `touch-action` side effects, overscroll all unaddressed); (3) **Gate SB
has zero ARIA today** — unanimous ship-blocker; (4) RTL and the overscan cap were unscoped.
Notably, Claude *reversed* approve→reject in round 2 after the code-grounded objections.
Full review record: `docs/refactor/rfc-013-committee-review-2026-06-14.md`.

**This revision (2026-06-14).** Resolves §4 to **scoped-minimal synthetic touch** (ships the
~50-line inertia core + ~10-line chaining passthrough; defers rubber-band/feel-parity
post-3.0; documents `passive:false`/`touch-action` limits). Corrects the Option A↔code
contradiction and the "90% synthetic" claim. Turns Gate SB into an explicit ARIA/keyboard/focus
checklist. Caps overscan distance; scopes RTL fail-loud; adds the concrete `scroll.mode`
deprecation. Addresses every committee objection.

---

## References

- RFC-012: Logical Scroll Model — introduced bounded as opt-in
- Implementation plan (gate detail, verification ladder): `docs/refactor/rfc-013-implementation-plan.md`
- RFC-012 implementation review: `docs/refactor/rfc-012-implementation-review.md`
- Discussion: [#117](https://github.com/floor/vlist/discussions/117)
- Bounded scroll implementation: `src/core/runway.ts` (handler), `src/core/adapter.ts` (`ScrollAdapter`)
- Gate A commits: `54fb8f0` (renderer routing), `283b2d5` (resize + page guard), `e2ba4b0`, `e182f3a`
- Bundle: base **9.7 KB gz**; native-path removal ≈ **−0.7 KB gz**; the bounded handler (~1.1 KB) stays
- Frustum culling — the standard 3D-engine technique the overscan margin generalizes