# RFC-013 — Unified Scroll Model: Implementation Plan

Status: **Planning** · Target: **vlist 3.0** · Depends on: RFC-012 (shipped, opt-in bounded)

This plan turns [RFC-013](../rfcs/RFC-013-Unified-Scroll-Model.md) into ordered,
verifiable work. The architecture is approved (committee + discussion #117); what
remains is closing four gates and then deleting the native viewport path.

**The governing fact:** every gate except **B** can be settled in code and CI.
**Gate B (touch momentum) can only be settled on a physical device.** So B is
sequenced first as a spike — if it fails, the flip is off and the rest of this
plan does not start.

---

## 1. Gate set (from RFC-013)

| Gate | What | Kind | Blocks 3.0 flip? |
|------|------|------|------------------|
| A / A′ / A″ | Renderers + resize + self-managed plugins through bounded | ✅ done (`54fb8f0`, `283b2d5`, `e2ba4b0`, `e182f3a`) | — |
| **B** | Rebasing must not kill native fling momentum | **Empirical (device)** | **Yes — hardest** |
| **SB** | Virtual scrollbar + accessibility parity | Engineering + QA | **Yes** |
| **C** | `page()` as native-document island (one seam) | Small engineering | Yes (small) |
| **RTL** | Horizontal `scrollLeft` policy | Decision + impl/guard | Yes |
| E | Flip default + delete native viewport path | Deletion | — (the flip itself) |
| D | Adapter as source of truth | Refactor | No — post-3.0 |

---

## 2. Sequencing

```
            ┌─ B spike (device) ─ GO/NO-GO ─┐
2.x prep ───┤                                ├─ E (flip + delete) ── 3.0 ── D (post)
            ├─ C seam ───────────────────────┤
            ├─ SB audit → SB build ──────────┤
            └─ RTL decision → impl/guard ────┘
```

| Step | Workstream | Gate on prior |
|------|-----------|---------------|
| 0 | 2.x prep — deprecation warning, ship RFC-012 fixes | none |
| 1 | **B spike** — prototype + device validation | **none — do first** |
| 2 | C, SB, RTL (parallel) | B spike passed |
| 3 | E — flip + delete | B, C, SB, RTL closed |
| 4 | D — adapter canonical | after 3.0 |

Rationale: B is the only gate that can invalidate the whole effort, and it needs
no other work to prototype. Run it before investing in C/SB/RTL. C/SB/RTL are
independent and parallelizable once B says GO.

---

## 3. Step 0 — 2.x preparation (no breaking changes)

Ship on the current `staging`/2.x line, ahead of the flip.

- **Deprecation warning** for `scroll: { mode: "bounded" }` — one-time `console.warn`,
  "bounded is becoming the default in 3.0; remove this option." Pattern mirrors the
  existing `scale()` stub (`src/plugins/scale/plugin.ts`).
- Land any remaining RFC-012 follow-ups so 2.x is the stable base the flip branches from.

**Acceptance:** warning fires once; no behavior change; existing tests green.

---

## 4. Step 1 — Gate B spike (the go/no-go)

### Goal
Prove that bounded rebasing never stalls native fling momentum on real iOS Safari
and Android Chrome. This is the single decision the whole RFC rests on.

### Approach — "idle-only rebase + larger runway"
Two changes to `src/core/runway.ts` + one constant:

1. **Rebase only when scrolling is idle, never mid-gesture.** Today `maybeRebase()`
   (`runway.ts:171`) is called from `onScrollEvent()` on every event that crosses the
   `BOUNDED_REBASE_LOW`/`HIGH` band — including during momentum. Move the rebase out of
   the per-event path and trigger it from the idle boundary (`onIdle`/`scheduleIdle`,
   `runway.ts:249`). During an active gesture, `scrollTop` moves freely within the
   runway; `baseOffset` is only re-centred once motion settles.

   **Critical: an idle rebase must force a render.** Today rebase runs *before*
   `onFrame()` in `onScrollEvent`, so transforms are recomputed with the new
   `baseOffset`. At idle there is no following frame, and the synthetic scroll event the
   re-centre emits is dropped by the "logical unchanged" guard (`runway.ts:157`) — so
   nothing re-renders. After mutating `baseOffset` at idle, the handler **must** call the
   render path explicitly (force a frame), or every visible item sits at the stale
   `offset - oldBaseOffset` and jumps on the next interaction. Add this to the idle path,
   not just the rebase function.
2. **Enlarge the runway so a single fling cannot exhaust it.** Raise
   `BOUNDED_RUNWAY_FACTOR` (`src/constants.ts:90`, currently `2`) to a measured value
   (candidate range **12–16×** viewport). With idle-only rebase, the only failure mode
   is a fling long enough to hit a hard runway edge (0 or `maxScrollTop`) before idle
   fires — a larger runway makes that physically unreachable in one gesture.
3. **Wheel/trackpad path unchanged.** `onWheelEvent()` is already synthetic and
   re-derives the split each frame via `applySplit()`; it never depends on `maybeRebase`.

The runway stays four orders of magnitude under the 16.7M cap even at 16× (≈12k px on
a 768px phone), so item-count headroom is unaffected.

### Deliverable: standalone device test page
A single HTML file in `vlist.io` (e.g. `examples/_bench/momentum.html`) that mounts a
large bounded list, openable directly on a phone via `staging.vlist.io`, instrumented
with the measurable signals below (not vibes).

### Telemetry — measurable, binary signals
Track and display live:
- **Programmatic `scrollTop` writes during an active/momentum phase** — must be **0**.
  (Instrument `setScrollTop`; flag any write while a touch gesture or momentum is in
  flight. This is the direct proxy for "did we touch scrollTop mid-fling," replacing the
  unprovable "dropped frame attributable to a write.")
- **Hard-edge hits** — count of `scrollTop` reaching `0` or `maxScrollTop` during a
  gesture. Must be **0** (a hit = ran out of runway = the dead-stop failure).
- **Max single-fling travel** (logical px) — the empirical number that must sit comfortably
  below `maxScrollTop`; this is what sizes `RUNWAY_FACTOR`, not the assumption.
- **Frame gaps** — count of `requestAnimationFrame` intervals over a threshold (e.g. > 32 ms)
  during flings.

### Acceptance matrix (device, not unit tests)
On real iOS Safari **and** Android Chrome:
- [ ] Hard fling traverses, decelerates, and rubber-bands with **no stall or stop**
- [ ] Programmatic-scroll-writes-during-momentum counter = **0**
- [ ] Hard-edge-hit counter = **0** across repeated rapid same-direction flings
- [ ] Slow drag and fling-then-catch land where expected
- [ ] Frame-gap count negligible (no systematic > 32 ms gaps during flings)
- [ ] Max single-fling travel measured and < `maxScrollTop` with margin → confirms `RUNWAY_FACTOR`

### If it fails
Escalate runway size and re-measure; if idle-only rebase still can't cover the worst
fling without a hard-edge stop, the unified flip is **not viable as specified** —
reopen the native-vs-bounded question rather than ship a stalling scroll. This is the
RFC's stated fallback.

### Files
`src/core/runway.ts`, `src/constants.ts`; new `vlist.io/examples/_bench/momentum.html`.

---

## 5. Step 2a — Gate C: page() as a native-document island

### Goal
`page()` keeps its own window scroll + full-height document; the bounded handler is
simply not installed for it. No window-rebasing proxy.

### Approach — one named seam
- **Name the contract.** `skipDefaultScroll` is the sanctioned **external-scroll-provider**
  escape hatch: a plugin that owns its own scroll source. Document it as exactly that, not
  as an incidental flag. Today `page()` is its only user — assert that (a test that fails if
  any other plugin sets it without sign-off), so it can't quietly become a second mode.
- **Don't create the bounded handler when a plugin owns scroll.** Under bounded-only,
  replace the `if (boundedMode || boundedWrap)` gate (`create.ts:607`) with
  "create the bounded handler unless `skipDefaultScroll`." Page mode
  (`disableDefaultScroll()`, `plugin.ts:56`) → `boundedHandler` stays `null`.
- **Full-height sizing falls out for free.** `syncContentSize()` already sizes to full
  height in the `else` (no-bounded-handler) branch (`create.ts:530`); with no handler in
  page mode, that path runs.
- **`baseOffset` stays 0.** Page plugin never touches it; renderers draw `offset - 0`.
- **Replace the throw guard with the seam** (`create.ts:601`). But keep the
  `page()` + carousel (`boundedWrap`) incompatibility — carousel *requires* the bounded
  wrap handler, which page mode suppresses. That combination stays an explicit throw with a
  clear message; only the `page()` + `mode:"bounded"` arm of the old guard goes away.

### Runtime size guard (required — not just a doc note)
The page island deliberately reintroduces full document height and the 16.7M px cap, so it
must **fail loud**, not silently clamp. The existing guard already covers this: the
no-bounded-handler branch emits an `error` event when `totalSize > MAX_VIRTUAL_SIZE`
(`create.ts:532`). Two actions:
- **Retain it through Phase E** — do not delete it with the native viewport path.
- **Reword the message** — today it says "Enable bounded scroll," which is meaningless for
  page mode in 3.0. New message: page mode caps at ~`MAX_VIRTUAL_SIZE/itemSize` items;
  migrate large feeds to a viewport-virtualized list.

### Discipline
The only place core may know page is different is the `skipDefaultScroll` seam. **No
`if (pageMode)` checks elsewhere.** A reviewer should be able to grep and find external-scroll
branching in exactly one spot.

### Acceptance
- [ ] `page()` alone: window scroll works, content sized full-height, items positioned correctly
- [ ] `page()` + `grid` / `table` / `groups`: correct (renderers see `baseOffset === 0`)
- [ ] No bounded handler instantiated in page mode (assert in test)
- [ ] `page()` + carousel still throws with a clear message (test)
- [ ] Over-cap page list emits the reworded `MAX_VIRTUAL_SIZE` error (test)
- [ ] `skipDefaultScroll` asserted single-user (page only)
- [ ] grep proves external-scroll branching exists only at the seam

### Files
`src/core/create.ts`; `test/plugins/page/`; page docs in `vlist.io`.

---

## 6. Step 2b — Gate SB: virtual scrollbar + accessibility parity

### Goal
A virtual overlay scrollbar — bundled, on by default, `scrollbar: false` to suppress —
that reaches native scrollbar UX + AT parity for **viewport** lists. (`page()` keeps the
document's native scrollbar; see Gate C carve-out.)

### Sub-step SB-0 — audit first (estimate the unknown)
Before building, gap-analyse the current `scrollbar()` plugin against the acceptance bar
and **record the estimate** — SB could be small or the real long pole; we don't yet know.
Check what already exists: ARIA roles/values, keyboard handling, drag→logical mapping
(`plugin.ts:56-58` routes through `ctx.scrollTo` — good), theming hooks.

> **⚠ Hard constraint — SB must not break Gate B.** The viewport main axis **stays
> `overflow: auto`**. Gate B depends on the browser's native touch scroll/momentum driving
> `scrollTop` inside the runway; setting `overflow: hidden` would remove native scrolling and
> turn this into a full synthetic touch-scroller project. The native scrollbar is hidden
> **cosmetically via CSS** (`scrollbar-width: none` + `::-webkit-scrollbar { display:none }`),
> which is exactly what the existing `--custom-scrollbar` class does
> (`scrollbar/plugin.ts:70`, `vlist-table.css:52`). The overlay scrollbar is purely visual,
> painted over a still-natively-scrollable viewport.

### Sub-step SB-1 — decisions to lock
- **Overlay always, native scroll preserved.** Apply the cosmetic scrollbar-hiding class at
  every size and render the overlay on top; the element stays natively scrollable. No
  native↔custom transition at the runway boundary, and Gate B's momentum is untouched.
- **Bundle policy.** "On by default" means base carries a minimal scrollbar. Quantify the
  cost (the `scrollbar` plugin is ~+2.0 KB gz today) and decide: fold a minimal core
  scrollbar into base, or auto-include the plugin. This partially offsets the native-removal
  saving — state the **net** base-size number.
- **3.0 scrollbar API — specify concretely** (today's plugin/config shape does not match
  "bundled, on by default"):
  - built-in minimal scrollbar in core **vs** auto-included `scrollbar()` plugin?
  - how does `scrollbar({ ...customization })` compose with / override the default?
  - the disable switch — `scrollbar: false` in config, and what it does to the overlay + the cosmetic-hide class
  - duplicate-install guard — passing `scrollbar()` explicitly when one is already on by default must not double-render

### Sub-step SB-2 — build to acceptance
- [ ] Keyboard: PageUp/PageDown/Home/End/arrows scroll the region; focus-into-view reveals offscreen focused items
- [ ] Screen readers: `role="scrollbar"` (or AT-announced equivalent) with correct `aria-valuenow`/`valuemin`/`valuemax`/`aria-controls`
- [ ] Pointer: thumb drag, track click/page, wheel-over-thumb → correct logical position
- [ ] Feel & theming: acceptable on macOS/Windows/mobile; honors high-contrast and `prefers-reduced-motion`
- [ ] `scrollbar: false` cleanly yields no visible scrollbar
- [ ] Net base-size impact documented

### Files
`src/plugins/scrollbar/`, possibly `src/core/` (bundle decision), `src/styles/`, tests.

---

## 7. Step 2c — Gate RTL: horizontal scroll policy

### Goal
Close RFC-012 open-question #3: a stated, tested RTL policy for bounded horizontal lists.

### Decision (recommended default)
**Do not support bounded horizontal RTL in 3.0; fail loud.** Ship a dev-time
warning/throw for that configuration. Rationale: cross-engine `scrollLeft` semantics
(negative vs decreasing-from-max) plus runway rebasing is a meaningful surface for a
configuration with little demand; better unsupported-and-explicit than silently
mis-scrolling. Revisit post-3.0 if demand appears.

**If support is chosen instead:** normalize `scrollLeft` read/write in
`runway.ts` (`getScrollTop`/`setScrollTop`, `runway.ts:116-122`) behind an RTL-aware
helper, state the supported-browser matrix, and add an RTL horizontal rebase test.

### Acceptance
- [ ] Policy decided and documented
- [ ] Either: RTL-horizontal normalized + tested across target engines; **or** dev-time warn/throw for the unsupported config, with a test asserting it fires

### Files
`src/core/runway.ts` (or validation), `src/types.ts` docs, tests.

---

## 8. Step 3 — Gate E: flip + delete

Only after **B, C, SB, RTL** are closed.

1. Remove `scroll.mode` from `CreateVListConfig` types + validation
2. Delete the native viewport handler `src/core/scroll.ts`; remove its branch from `create.ts`
3. Remove native-path branches from the `scrollbar` plugin (page keeps the document scrollbar — not a native *viewport* branch)
4. Remove dual-mode tests; keep bounded tests, delete native-only duplicates
5. Docs: bounded is no longer an opt-in concept — it's how vlist scrolls

**Acceptance:** typecheck clean; full suite green; `bun run size` shows the native-removal
delta (≈ −0.7 KB gz base, before SB bundle decision); `internals.ts` API surface reviewed
(`/api-surface`); changelog + migration guide written.

**Semver:** ships as **vlist 3.0** (major). Breaking changes per RFC-013 §Migration.

---

## 9. Step 4 — Gate D: adapter as source of truth (post-3.0)

Make `ScrollAdapter.getLogical()` the canonical state instead of a wrapper over pixel
`state.scrollPosition`. **Non-blocking** — no behavior change, ship after 3.0. Begin
nudging plugin guidance toward `ScrollAdapter` now (already in the RFC's plugin-author
notes) so new code needs no change when D lands.

---

## 10. Verification & CI (every workstream)

- `bun run typecheck` clean
- `bun test` green; **new tests land in the same commit as the code** (project rule)
- `bun run size` recorded for any base-bundle change (Steps 6, 8)
- `/api-surface` reviewed before the 3.0 tag
- Gate B: device sign-off recorded in this doc (no CI substitute exists)

---

## 11. Risks & open decisions

| # | Risk / decision | Owner action |
|---|-----------------|--------------|
| 1 | **Gate B fails on device** | Larger runway → re-measure; if still stalling, reopen the flip. Highest risk. |
| 2 | "Larger runway absorbs any fling" is unmeasured | Step-1 telemetry must measure real max fling travel, not assume it |
| 3 | **SB silently breaks Gate B** if viewport goes `overflow:hidden` | SB keeps `overflow:auto`; hide native bar via CSS only (Gate B momentum preserved) |
| 4 | **Idle rebase without a render flush** → stale `offset - oldBaseOffset`, visible jump | Idle path must force a frame after mutating `baseOffset` |
| 5 | Page island reintroduces the 16.7M cap silently | Retain + reword the `MAX_VIRTUAL_SIZE` error guard for page mode (don't delete in Phase E) |
| 6 | **SB effort is unestimated** | SB-0 audit produces the estimate before committing a 3.0 date |
| 7 | SB bundle policy eats the native-removal saving | Quantify net base size in SB-1; decide consciously |
| 8 | Gate C seam leaks into `if (pageMode)` checks / second user | Named external-scroll contract; assert page is sole user; grep-enforced single seam |
| 9 | 3.0 scrollbar API undefined | SB-1 specifies built-in-vs-plugin, customization, disable, dup-guard |
| 10 | RTL: support vs fail-loud | Decide in 2c; default recommendation is fail-loud for 3.0 |

---

## 12. Definition of done (3.0)

- [ ] Gate B device sign-off (iOS Safari + Android Chrome) recorded here
- [ ] Gate C seam landed; page() island verified; one-seam discipline held
- [ ] Gate SB acceptance met; net base size documented
- [ ] Gate RTL policy decided + enforced
- [ ] Native viewport path + `scroll.mode` deleted; suite green; size delta recorded
- [ ] Migration guide + changelog; `internals.ts` surface reviewed
- [ ] RFC-013 status flipped to **Accepted/Shipped**
