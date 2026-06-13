---
created: 2026-06-07
updated: 2026-06-13
status: draft
reviewers: GPT-5.5, Opus 4.8, Gemini 3.1, Opus 4.6 (CTO)
---

# RFC-013: Unified Scroll Model

**Status:** Draft
**Author:** floor
**Type:** Core Architecture
**Created:** 2026-06-07
**Depends on:** RFC-012 (Logical Scroll Model)

---

## Summary

Remove the native scroll path. Make bounded logical scroll the only scroll model in vlist. The `scroll: { mode: "bounded" }` option disappears — bounded is how vlist works.

```
Before:  createVList({ scroll: { mode: "bounded" } })   // opt-in
After:   createVList({})                                  // just works
```

---

## Motivation

RFC-012 eliminated the compression dual-path (515 references across 24 files). But it introduced a new dual-path: native scroll vs bounded scroll. Every plugin must handle both. Every test matrix doubles.

### The dual-path problem, again

The native scroll path sizes `vlist-content` to `totalItems × itemSize`. The bounded path sizes it to `viewport × runwayFactor`. Two content models, two scroll contracts, two code paths through the render pipeline.

| Concern | Native path | Bounded path |
|---------|-------------|--------------|
| Content height | `totalItems × itemSize` | `viewport × runwayFactor` |
| Scroll position | Raw `scrollTop` pixel offset | Logical `{ index, offsetPx }` via `ScrollAdapter` |
| Scrollbar | Native (small lists) or virtual (large) | Always virtual |
| Item limit | ~349,525 items at 48px before 16.7M cap | Unlimited |
| Plugin contract | Pixel-based `engineState.scrollPosition` | `ScrollAdapter` |

Plugins must handle both contracts. The render pipeline branches on the mode. Tests run twice. This is the same structural problem RFC-012 solved for compression — one layer up.

### Bounded already works for small lists

The bounded scroll model is not a "large list" feature. It works identically for 10 items:

- Content is `viewport × runwayFactor` or `totalItems × itemSize`, whichever is smaller (already capped in the implementation)
- For a 10-item list at 48px each (480px total), the content is 480px — smaller than the runway. Native behavior is preserved naturally.
- Scroll physics come from the browser's native scroll on the bounded window. No reimplementation.

There is no list size where native scroll is *required for vlist correctness*. (Native scroll remains a platform affordance — OS scrollbar, AT bindings, simple third-party integration — even where it is not architecturally necessary; see §What you lose and Gate SB.)

### The "you should have used bounded" migration

Today, a developer starts with a small list using the default native mode. The list grows. At some point it hits browser limits or needs virtual scrollbar features. The developer must then add `scroll: { mode: "bounded" }`, which may change scroll behavior, scrollbar appearance, and plugin interactions. This is a migration that should never happen — the library should handle any list size from the start.

---

## Design

### Remove the mode option

```ts
// Before (RFC-012)
createVList({
  scroll: { mode: "bounded", runway: 2 }
})

// After (RFC-013)
createVList({})
// the runway multiple stays configurable for power users:
createVList({ scroll: { runway: 2 } })
```

`scroll.mode` is removed from `CreateVListConfig`. The bounded scroll model is the only implementation. The runway multiple remains configurable via `scroll.runway` (default: 2; floor 1.5). Note: the config field is `scroll.runway`, the internal default constant is `BOUNDED_RUNWAY_FACTOR` — this RFC uses "runwayFactor" informally for the concept, but the public surface is `scroll.runway`.

### One scroll contract

`ScrollAdapter` becomes the only way plugins access scroll state. No fallback to raw `engineState.scrollPosition` pixel values.

```ts
// The only scroll contract
interface ScrollAdapter {
  getLogical(): { index: number; offsetPx: number }
  setLogical(pos: { index: number; offsetPx: number }, opts?: ScrollOptions): void
  getPixelEquivalent(): number
  scrollByPx(delta: number): void
}
```

### One scrollbar model

The `scrollbar()` plugin has one mode, not two — the native-vs-virtual branch is removed. But "all scrollbars are virtual" needs a precise default story, because a sub-runway list still has real-sized content and would otherwise paint the OS scrollbar (see Gate SB):

- **Default for 3.0 — virtual overlay scrollbar, bundled and on by default, suppressible.** The viewport sets `overflow` such that the browser scrollbar never paints (`overflow: hidden` on the main axis with scroll driven through the handler), and vlist renders its own overlay scrollbar for *every* list regardless of size. This removes the native↔custom *transition* at the runway boundary — the scrollbar looks and behaves the same at 10 items and 10M. Consumers can opt out (`scrollbar: false`) for headless/embedded cases.
- **Rejected alternative:** keep the OS scrollbar for sub-runway lists and switch to virtual past the runway. This reintroduces a visible discontinuity (native bar suddenly becomes custom as the list grows) — exactly the migration-cliff feel this RFC exists to remove.

The cost is that the virtual scrollbar must reach AT/UX parity before native can be dropped — tracked as **Gate SB** (release gate).

### Content sizing

The content element is always sized to `min(totalItems × itemSize, viewport × runwayFactor)`. For small lists where total content fits the runway, this is just the total content size and **no rebasing occurs** — scroll *physics* are indistinguishable from native. Note this is about scroll feel, not the scrollbar: per §One scrollbar model, the visible scrollbar is the virtual overlay at every size, so there is no native-scrollbar appearance even for small lists.

### Small-list fast path

When `totalItems × itemSize <= containerSize` (all items fit in the viewport), no scroll machinery is needed at all. This is already true today and remains true — it's an optimization, not a mode.

---

## What changes

### Removed

| Component | Today | After |
|-----------|-------|-------|
| `scroll.mode` config option | `"native"` (default) or `"bounded"` | Removed — bounded is the default and only mode |
| Native scroll path in core | Sizes content to `totalItems × itemSize`, reads raw `scrollTop` | Removed |
| Native scrollbar fallback | Scrollbar plugin has native + virtual modes | Virtual only |
| Dual-path plugin handling | Plugins check scroll mode to choose contract | One contract (`ScrollAdapter`) |

### Stays the same

- Bounded scroll implementation (already done in RFC-012)
- `ScrollAdapter` interface
- `overflow-anchor: none` on content
- Virtual scrollbar
- Public API (`scrollToIndex`, `getScrollPosition` returns pixel equivalents)
- Plugins that already route through core's content sizing (default list, autosize, groups, snapshots, a11y, selection, transition, sortable)

### Prerequisite renderer work — ✅ done

> **Status update (2026-06-13).** Earlier drafts of this RFC (and GPT-5.5's review) treated "adapterize the self-managed renderers" as the largest outstanding blocker. That work has since landed. This section is kept for history; see the Implementation status table for the current gate set.

Grid, table, and masonry install `setRenderFn()`, which makes core skip `syncContentSize()`. They previously wrote absolute transforms and full physical content sizes directly, bypassing the bounded runway. As of `54fb8f0` all three now subtract `engineState.baseOffset` from their item transforms and route content sizing through `ctx.updateContentSize()`, which caps to the runway in bounded mode:

- `grid/plugin.ts` — `getOffset(row) - baseOffset` in both layout paths; `updateContentSize(totalSize)`
- `table/plugin.ts` / `table/renderer.ts` — `baseOffset` threaded into the renderer; `updateContentSize(totalSize)`
- `masonry/plugin.ts` / `masonry/renderer.ts` — same pattern

The only direct `content.style` writes remaining in these renderers are **cross-axis** (`table` `minWidth = totalWidth` for horizontal column overflow), which RFC-013 explicitly keeps native and unaffected.

### Simplified

- **Plugin contract**: one scroll model, no branching
- **Scrollbar plugin**: one mode
- **Test matrix**: no mode doubling
- **Developer experience**: no mode choice, no migration cliff
- **Configuration**: one less concept to learn

---

## What you lose

### Native scrollbar disappears — a positioning decision

This is the most consequential tradeoff and deserves explicit discussion, not a footnote.

Under bounded-only, every vlist instance uses a virtual scrollbar. Users who want the OS-native scrollbar appearance lose it. The `scrollbar()` plugin can be styled to match, but it's CSS, not native.

vlist targets non-React developers who expect platform-native behavior. Losing the OS-native scrollbar for every list — not just large ones — is a UX and marketing decision. It affects:
- Accessibility: screen readers and AT interact differently with custom scrollbars
- Platform consistency: macOS overlay scrollbars, Windows always-visible scrollbars, mobile overscroll indicators
- User trust: custom scrollbars can feel "off" to users who notice them

This tradeoff is acceptable if the virtual scrollbar is good enough to be invisible. It must be tested and refined before this RFC ships.

### Other tradeoffs

1. **DevTools `scrollTop` is not the real position.** Inspecting the element in DevTools shows a bounded `scrollTop` (within the runway), not the logical position. Debugging requires the vlist DevTools helper or `getScrollPosition()`.

2. **`IntersectionObserver` on content children.** Code that attaches `IntersectionObserver` to the content div and expects physical scroll height to reflect total items will break. This is already broken by virtualization in general.

3. **Third-party scroll libraries.** Libraries that hook into `scrollTop`/`scrollHeight` (custom scrollbar libraries, scroll-spy, etc.) won't work with the bounded content. This is the same limitation the scale plugin had.

---

## Performance impact

| Metric | Native (today) | Bounded-only | Δ |
|--------|----------------|--------------|---|
| Base bundle | 27.4 KB min / **9.7 KB gz** (ships *both* handlers — bounded is opt-in) | ~25.5 KB min / **~9.0 KB gz** | **−~0.7 KB gz** (~7%) |
| Content layout | Up to 16.7M px for large lists | Always viewport-sized runway | — |
| Scroll precision | Degrades at large offsets | Always near origin | — |
| Plugin code | Dual-path branches | Single path | — |
| Test surface | 2× (both modes) | 1× | **−50%** |

**Bundle detail (measured, `bun run size` + esbuild on `staging`).** The base bundle today ships *both* scroll handlers because bounded is opt-in. Bounded-only deletes the **native** side, not the bounded side:

| Removed | Min (raw) | ~Gz |
|---------|-----------|-----|
| `src/core/scroll.ts` (native handler, 190 lines) | ~1.5 KB | ~0.5 KB |
| Dual-path glue in `create.ts` (`createScrollHandler` branch, ~22 `boundedHandler` null-checks, `MAX_VIRTUAL_SIZE` warning, native `syncContentSize` branch) | ~0.3 KB | ~0.15 KB |
| Native-mode branches in `scrollbar` plugin | ~0.1 KB | ~0.05 KB |
| **Base total** | **~1.9 KB** | **~0.7 KB** |

Plus, outside base: the `scale()` stub entry is deleted entirely (~0.1 KB), and the `scrollbar` plugin's delta shrinks slightly (one mode, not two). `runway.ts` (the ~1.1 KB bounded handler) **stays** — it's the surviving path, so the earlier "bounded adds ~1.1 KB" figure is *not* recovered by this RFC.

The bundle win is real but modest (sub-1 KB gz). The material wins are the non-byte rows: **test surface halves**, the plugin contract collapses to one path, and the "list grew → now reconfigure" migration cliff disappears.

---

## Complexity impact

The "Simplified" list above is real, but it oversells "single path" as pure subtraction. The honest framing is **one harder path instead of two paths** — the win is removing the dual-path *interaction*, not removing complexity outright. Split by audience:

**For library users — unambiguously simpler.** `scroll.mode` disappears as a concept. No native-vs-bounded decision, no `runwayFactor` to discover, and no "my list grew → reconfigure → behavior/scrollbar changes" cliff. One way to scroll, at any size.

**For maintainers / plugin authors — net simpler, but it raises the floor.** What gets deleted is the expensive, compounding kind of complexity:
- two scroll handlers → one (`src/core/scroll.ts` deleted; only `runway.ts` survives)
- the `if (boundedMode || boundedWrap) {…} else {…}` fork in `create.ts`, the scattered `boundedHandler` null-checks, and part of the `scrollGetFn`/`scrollSetFn` indirection that exists to paper over the two modes
- scrollbar: two modes → one; test surface halves

**The catch — `baseOffset` becomes mandatory.** Today `baseOffset` is `0` in native mode (the default), so most code can ignore it — that's what the `// baseOffset is 0 in native mode (byte-identical)` comments in `pipeline.ts`, `grid/plugin.ts`, and `groups` are reassuring readers of. Bounded-only makes `baseOffset` **always live**; every plugin that positions items must understand `offset - baseOffset`, the runway, and rebasing. The "you can ignore this" escape hatch is gone. Likewise, the rebase/momentum machinery (gate B) is complexity that exists *only* because of the bounded model — bounded-only doesn't eliminate it, it **consolidates it into `runway.ts` and makes it load-bearing for everyone.**

**Net.** Simpler to use, simpler to maintain in aggregate (one model + no switch, vs. two models + a switch), but the single surviving model is the more abstract one — a rebasing runway is less intuitive on first read than "a tall div you scroll." The price is a higher floor on what you must understand to touch scroll/positioning code. That price is worth paying, but it should be named, not hidden behind "single path."

---

## Migration

### For vlist users

- Remove `scroll: { mode: "bounded" }` from config — it's now the default and only mode.
- If using `scale()` (already deprecated in RFC-012), remove it entirely.
- If relying on native scrollbar appearance, add and style the `scrollbar()` plugin.

### For plugin authors

- Remove any `scroll.mode` checks.
- Use `ScrollAdapter` exclusively — no raw `scrollTop` reads for scroll position.
- Cross-axis scroll (horizontal table overflow) remains native and unaffected.

**Start now, ahead of Phase D.** Even though making logical state canonical is a post-3.0 follow-up (Phase D), new plugin work should already prefer `ScrollAdapter` (`getLogical()` / `getPixelEquivalent()` / `scrollByPx()`) over direct `engineState.scrollPosition` or `baseOffset` reads wherever possible. Code written against the adapter today needs no change when Phase D lands; code written against raw pixel state will.

### Semver

This is a major breaking change. vlist is at 2.3.0 — this ships as **vlist 3.0**.

Breaking changes:
- `scroll.mode` option removed
- `scale()` plugin removed (deprecated in RFC-012, deleted here)
- Native OS scrollbar no longer appears for any list — the virtual overlay scrollbar (bundled, on by default, `scrollbar: false` to suppress) replaces it at every size; see §One scrollbar model and Gate SB
- `getScrollPosition()` on carousel returns raw logical position instead of lap-normalized value
- `internals.ts` exports reduced (legacy rendering modules deleted in RFC-012 Phase 3b)

Code that explicitly sets `mode: "bounded"` gets a config warning in the last 2.x release, pointing to the 3.0 migration guide.

---

## Implementation

The bounded path exists and is proven for the default list and carousel (RFC-012 Phases 0–4), and the self-managed renderers (grid/table/masonry) and resize geometry have since been routed through it. "Flip the default and delete native" now hinges on **three release gates (B, C, SB) plus an RTL policy** — not the broad "adapterize everything" migration earlier drafts described. Gates A/A′/A″ are landed; gate SB (virtual-scrollbar + accessibility parity) was added after the 2026-06-13 review round, where Codex (GPT-5) and Gemini 3.1 independently raised it as co-equal with Gate B.

### Status

| Gate | Scope | Status | Evidence |
|------|-------|--------|----------|
| **A — Renderers through bounded** | grid/table/masonry subtract `baseOffset`, cap content to runway | ✅ **Done** | `54fb8f0` |
| **(A′) — Resize refreshes runway** | `ResizeObserver` re-derives runway geometry on container resize | ✅ **Done** | `283b2d5` |
| **(A″) — Self-managed plugins bounded-aware** | groups sticky headers; scrollbar max-scroll incl. padding | ✅ **Done** | `e2ba4b0`, `e182f3a` |
| **B — iOS/touch momentum** | rebasing must not kill native fling momentum | 🔴 **Open — release gate** | needs device validation |
| **C — Bounded page-mode proxy** | `page()` works without unbounded document height | 🔴 **Open — release gate** | guarded by throw (`283b2d5`) |
| **SB — Virtual scrollbar + AT parity** | custom overlay scrollbar reaches native scrollbar's UX + screen-reader parity | 🔴 **Open — release gate** | added by 2026-06-13 review (Codex, Gemini) |
| **RTL — Horizontal scroll policy** | `scrollLeft` rebasing semantics in RTL across browsers | 🔴 **Open — needs stated policy** | unaddressed since RFC-012 OQ#3 |
| **D — Adapter as source of truth** | core canonical state becomes logical, not pixel | 🟡 **Non-blocking follow-up** | purity refactor, no behavior change |
| **E — Flip and delete** | remove `scroll.mode` + native path | ⬜ **Blocked on B, C, SB, RTL** | — |

The diff is net positive until Phase E, which is net-negative lines.

### Gate B — iOS/touch momentum (release gate)

This is the **single go/no-go for the flip.** Under opt-in bounded, the momentum-kill affects only opt-in users; under bounded-only it becomes **universal** — every list on every touch device rebases. Touch flings on iOS Safari and Android Chrome animate `scrollTop` natively without emitting wheel events. `maybeRebase()` (`runway.ts`) currently writes `scrollTop` on every event that crosses the 0.25/0.75 band, with no momentum-phase guard — and on iOS, writing `scrollTop` mid-fling cancels the momentum.

Fix direction (commit to option 3, validate on device):
1. ~~Defer rebase to scroll idle~~ alone — **rejected.** A fast fling can exhaust the runway before idle fires, pinning `scrollTop` at the edge and dead-stopping the scroll mid-gesture (worse than a stutter).
2. Increase `BOUNDED_RUNWAY_FACTOR` for headroom — touch fling velocity is physically bounded, so a large runway (e.g. 10–20× viewport ≈ 6–12k px on a phone, still four orders of magnitude under the 16.7M cap) absorbs any single fling.
3. **Both — idle-only rebase + larger runway.** The large runway means a rebase essentially never fires *during* a gesture; idle-only rebase removes the in-fling `scrollTop` writes entirely. This is the intended fix.

Acceptance (on real iOS Safari and Android Chrome — unit tests cannot cover this, happy-dom has no momentum):
- Hard fling traverses, decelerates, and rubber-bands/overscrolls with no detectable stall or stop
- Repeated rapid flings in the same direction (forcing repeated rebases) show no thumb or content judder
- Slow drag-scroll and fling-then-catch land where expected
- No frame drops attributable to a `scrollTop` write mid-gesture

Device validation passing all four is mandatory before Phase E.

### Gate C — Bounded page-mode proxy (release gate)

RFC-012 landed a guard that throws when `page()` and bounded are combined (`283b2d5`). The bounded page-mode proxy was designed (RFC-012 §Phase 2) but never implemented. Bounded-only removes the native fallback, so this is now required, not optional.

This gate is a **hard either/or for 3.0** — bounded-only cannot ship with page mode merely guarded:
- **Either** the bounded page-mode proxy ships: intercept `window` scroll events, translate to bounded logical space, drive the bounded handler, preserving the document-integrated scroll feel page-mode users expect; **or**
- **`page()` is intentionally dropped in 3.0** with a documented migration path and a dev-time error explaining the removal.

A silent break (the throw guard shipping as the 3.0 behavior) is not an acceptable outcome.

### Gate RTL — Horizontal scroll policy

RFC-012 left RTL as open question #3; RFC-013 must close it. In RTL, `scrollLeft` semantics differ across browsers (negative in some, decreasing-from-max in others), and the runway rebase shifts `scrollLeft` directly. Close it as an explicit policy, not a note:
- **If RTL-horizontal is supported in 3.0:** normalize `scrollLeft` semantics across engines, state the supported-browser matrix, and add an RTL horizontal rebase test before the flip.
- **If it is not supported in 3.0:** document that explicitly and add a **dev-time warning (or throw) for bounded horizontal RTL**, so the unsupported configuration fails loudly rather than silently mis-scrolling.

Until one of these lands, RTL horizontal lists are an unverified configuration under bounded-only.

### Gate SB — Virtual scrollbar + accessibility parity (release gate)

Added after the 2026-06-13 review: Codex (GPT-5) and Gemini 3.1 independently flagged that removing the native scroll path commits vlist to a custom scrollbar for **every** list, and native scrollbars provide free ARIA/AT bindings, keyboard behavior, and platform feel that the virtual scrollbar must match before native can be dropped. Per §One scrollbar model, the 3.0 default is a bundled, on-by-default, suppressible overlay scrollbar at every list size.

Acceptance before Phase E:
- **Keyboard:** PageUp/PageDown/Home/End/arrow scrolling work on the scroll region; focus-into-view reveals offscreen focused items
- **Screen readers:** the scroll region exposes `role="scrollbar"` (or an equivalent the AT announces), with correct `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`aria-controls`; SR scroll cues behave comparably to a native scrollable region
- **Pointer:** thumb drag, track click/page, and wheel-over-thumb all map to the correct logical position
- **Feel & theming:** overlay appearance acceptable across macOS/Windows/mobile; honors high-contrast and `prefers-reduced-motion`; `scrollbar: false` cleanly yields no visible scrollbar

This is product risk as much as engine risk and should be QA'd as a release gate, not assumed.

### Phase D — Adapter as source of truth (non-blocking)

RFC-013 §One scroll contract presents `ScrollAdapter.getLogical()` as the sole plugin contract. Core still runs on pixel-based `state.scrollPosition` with the adapter (`adapter.ts`) as a correct wrapper over it. Making logical the canonical representation is a worthwhile cleanup for plugin authors but changes **no behavior** and the pixel-equivalents are already correct — so it must **not** gate the 3.0 release. Ship it as a follow-up refactor.

### Phase E — Flip and delete

Once **B, C, SB, and RTL** are closed (D may trail):
1. Remove `scroll.mode` from config types and validation
2. Remove the native scroll path from `src/core/scroll.ts` and `src/core/create.ts`
3. Remove native-path branches from the scrollbar plugin
4. Remove dual-mode tests (keep bounded tests, delete native-only tests that duplicate them)
5. Update docs: remove "bounded" as an opt-in concept — it's just how vlist scrolls

This phase is net-negative lines. The total RFC is net positive until this point.

---

## Resolved questions

1. **`runwayFactor` — keep internal.** Already tuned 10→3→2 during RFC-012; exposing it invites misuse. The existing `scroll.runway` escape hatch remains for power users but is not promoted in docs.

2. **Page mode — hard gate, not open question.** The bounded page-mode proxy is an unbuilt dependency (see Phase C). It must be implemented and tested before the flip.

3. **Timing — separate 3.0, not a 2.x cleanup.** With renderer routing and resize geometry already landed (gates A/A′/A″), the remaining work is gates B, C, and the RTL policy. Sequence: ship the RFC-012 fixes plus the `mode: "bounded"` deprecation warning as 2.x, close B/C/RTL on real devices, then flip the default and delete native as vlist 3.0. Phase D (adapter-as-source-of-truth) can land after 3.0.

---

## Committee review

| Reviewer | Verdict |
|----------|---------|
| GPT-5.5 | Approve destination, reject framing — "finish adapterizing plugins, then delete native" |
| Opus 4.8 | Approve destination, reject framing — four hard gates under-weighted |
| Gemini 3.1 | Approve — praised implementation, flagged iOS touch momentum |
| Opus 4.6 (CTO) | Approve destination, reject framing — reframed Implementation as Phases A–E |

Consensus: the goal is right, the original framing ("mostly deletion, net-negative lines") was wrong. This revision incorporates all reviewer feedback.

**Post-review update (2026-06-13).** Several reviewers' "not done yet" evidence — grid/table writing full physical content sizes, resize leaving stale runway geometry — was read from this RFC's own (then-current) text rather than the code, and has since landed (`54fb8f0`, `283b2d5`). Re-verification against `staging` reduced the open gate set from "adapterize every renderer, then delete native" to the gates in the Implementation status table; gate A and its siblings are ✅ done, and Phase D (adapter-as-source-of-truth) is reclassified as a non-blocking post-3.0 follow-up.

**Second review round (2026-06-13, GitHub discussion #117).**

| Reviewer | Verdict |
|----------|---------|
| Codex (GPT-5) | **Approve destination, keep Phase E gated.** Re-verified A/A′/A″ against code; ran focused bounded suite (301 pass / 0 fail). Conditions: Gate B device validation, Gate C ship-or-deprecate, RTL support policy, **virtual-scrollbar/AT acceptance as a release gate**, plugin guidance toward `ScrollAdapter` now. |
| Gemini 3.1 | **Approve destination, strictly block Phase E on Gate B and A11y.** Native scrollbars provide free ARIA bindings; the custom scrollbar must reach parity before native is dropped. |

Both reviewers independently elevated **virtual-scrollbar + accessibility parity** to a release gate co-equal with Gate B. This revision adds it as **Gate SB**, resolves the previously-contradictory scrollbar story (§One scrollbar model now specifies a bundled, on-by-default, suppressible overlay scrollbar at every size), tightens Gate C to a hard ship-or-deprecate, makes Gate RTL an explicit supported/unsupported policy, and pulls the "prefer `ScrollAdapter`" guidance forward for plugin authors.

---

## References

- RFC-012: Logical Scroll Model — introduced bounded as opt-in
- RFC-012 implementation review: `docs/refactor/rfc-012-implementation-review.md`
- Bounded scroll implementation: `src/core/runway.ts` (handler), `src/core/adapter.ts` (`ScrollAdapter`) — renamed from `bounded-scroll.ts`/`scroll-model.ts` in `ed5c28e`
- Renderer routing through bounded (gate A): commit `54fb8f0`
- Resize refresh + page guard (gate A′): commit `283b2d5`
- Groups bounded-aware; scrollbar padding bounds (gate A″): commits `e2ba4b0`, `e182f3a`
- Carousel bounded wrap (RFC-012 Phase 4): commit `d67ff72`
- Scale plugin removal + deprecation stub: commits `5a90a36`, `122a4f8`
- Bundle sizes (measured on `staging`, 2026-06-13): base **9.7 KB gz** (27.4 KB min), ships both handlers. Bounded-only removes the native path ≈ **−0.7 KB gz** (→ ~9.0 KB). The ~1.1 KB bounded handler (`runway.ts`) stays.
