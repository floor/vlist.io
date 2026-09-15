# RFC-014 implementation plan

Updated: **2026-09-14** · Status: **2.7.0 opt-in released; 3.0 default decision open**.
Canonical: [RFC-014: Scroll Input Model](../rfcs/RFC-014-Scroll-Input-Model.md). Supersedes the rejected RFC-013.
The old [native-runway plan](rfc-013-native-runway-plan-historical.md) is historical.

## 1. Reconcile and specify

- [x] One canonical RFC; preserve older drafts with superseded notices.
- [x] Distinguish architecture, specification and release approval.
- [x] Specify synthetic gesture ownership, signed sampling, cancellation and bounds.
- [x] Remove claims of cheap automatic touch chaining or reusable unsigned velocity.
- [x] Keep the input/default choice open; decouple overscan and adapter cleanup.
- [x] Separate the 2.7 opt-in milestone from the conditional 3.0 default decision.

## 2. Independent input experiments

A exists at `/gate-b/` (native runway with idle rebase). B's source lives at
`/gate-b/synthetic/`; the deployed review target is `vlist.io/experiments/synthetic/`
(standalone pointer-driven logical renderer). Neither changes
vlist production code. B's native range input is a test control, not Gate SB.

- [x] Implement synthetic state machine, elapsed-time inertia and bounded rendering.
- [x] Include vertical/horizontal modes with native cross-axis overflow.
- [x] Provide jump, smooth navigation, slider, resize and interruption controls.
- [x] Instrument bounds, native main-axis movement, render coverage, frame gaps,
      cancellation and cross-axis events; export a timestamped result.
- [x] Deterministic motion tests and real-Chrome smoke checks pass (2026-09-10; see README).
- [ ] Fix the five review defects recorded in RFC-014 (focus-driven stage scroll, drag on
      links, catch-tap click, keyboard with descendant focus, abandoned smooth navigation)
      and cover each in the browser harness, including a drag after multitouch on the
      same page.
- [x] User-reported physical-device test of B on iOS and Android received
      2026-09-11: “works beautifully.” Recorded in the prototype README.
- [ ] Detailed scenario/device record and A/B comparison supplied; no per-scenario
      results or native-runway comparison are inferred from the overall feedback.

B is an honest experiment: same-axis touch does not chain to the parent at any
list boundary, including gestures starting at an edge. The page makes this visible.
No reviewer may interpret ignoring a second pointer or stopping `preventDefault`
as proof of native zoom or chaining behavior.

## 3. Choose input using recorded results

On physical iPhone/Safari and Android/Chrome compare:

1. Fast/repeated flings, slow drag, reversal, catch, frame gaps, resize/background.
2. Cross-axis table-like pan, diagonal intent and pinch zoom (before and during drag).
3. Nested page scrolling, including gestures starting at and arriving at a list edge.
4. Smooth navigation and slider/keyboard interruption; tap vs drag behavior.
5. Low-end Android responsiveness and reduced-motion behavior.

The decision must name devices/OS/browser versions and link exported telemetry plus
human observations. Counters do not establish perceived feel or accessibility.
For B, explicitly accept or reject the prototype boundary policy for the intended
product; improving parent chaining requires a new specified experiment. For A,
measure runway exhaustion and rebase safety; a larger factor is not proof.

- [x] **Boundary policy, 2.7 opt-in mode: accepted 2026-09-13** (Codex
      recommendation, #127). Hard same-axis stop at both edges, no parent handoff,
      including gestures starting inside an edge-pinned list. Document it as a
      known limitation of the opt-in mode; native mode remains for pages that need
      parent scrolling. Not a default decision.
- [x] **Input decision recorded 2026-09-14: candidate B.** Candidate A (native
      runway 16x, idle-only rebase) fails its own gate on both physical devices:
      iOS 955 hard-edge hits, max fling 215% of runway; Android 751 hits, 226%.
      Writes during momentum stayed 0 on both. Details in the RFC decision record.
- [x] Devices recorded: iPhone SE (2nd gen, 2020) on iOS 26.6.1 Safari; Pixel 8a on
      Android 17 Chrome.
- [x] Synthetic telemetry recorded for the vertical axis on the iPhone SE in Chrome for
      iOS (all counters zero, 13 nodes, peak 2.9 px/ms); candidate A also fails in that
      browser (361 hard-edge hits, 145% of runway). Horizontal-axis export optional.

**No-go:** retain current native default/bounded opt-in until a candidate meets the
contract. Do not announce removal of `scroll.mode` before this decision.

## 4. Integrate the chosen driver as opt-in (2.7, after input decision)

Additive release: `scroll.mode: "synthetic"` beside native and bounded, defaults
unchanged, shipped as its own entry so the base bundle is unaffected for consumers
who do not opt in.

- [x] Connect driver to core logical position, render, idle and cancellation hooks
      through the existing `BoundedScrollHandler` seam (floor/vlist#130, 2026-09-14).
- [x] Define a non-cancelling `shiftBy(delta)`: measurement corrections (autosize,
      transition) shift position and any animation target while preserving gesture
      state and velocity; `scrollTo` keeps its cancelling semantics (#131).
- [x] Route the transition plugin's raw `scrollTop`/`scrollHeight` reads through
      logical position and size cache (#131; also fixes bounded-mode FLIP endpoints,
      transition row +1.8 → +2.0 KB accepted).
- [x] Specify the clipping layer (stage `overflow: clip`, viewport cross-axis native)
      and the clock contract (`event.timeStamp` for input, frame timestamps for
      animation, suspension measured between frames only) with tests (#130).
- [x] Verify real table header sync/cross-axis keyboard and touch behavior (Chrome
      touch emulation in #130/#131; physical-device sheet still pending).
- [x] Verify groups, autosize anchor, snapshots and changing totals (#130/#131).
      Carousel wrap is unsupported with synthetic mode in this release and throws (#132).
- [x] Selection and interactive-child behavior verified (#130). Sortable is unsupported
      with synthetic mode in this release and throws (#132); arbitration is future work.
- [x] Audit main-axis native reads/writes and external scroll events; legitimate
      native cross-axis operations remain supported (driver makes none; transition
      reads routed in #131).
- [x] RTL policy for the synthetic driver, decided 2026-09-14: explicit guard. RTL
      horizontal lists throw in synthetic mode; vertical lists on RTL pages allowed;
      native and bounded untouched; support planned as a non-breaking addition
      (floor/vlist#134).
- [x] RTL gate, reduced scope (vertical lists and tables on RTL pages), closed
      2026-09-14 on `next` (floor/vlist#145): table header follows the body in RTL
      (`:dir(rtl)` flex order) and keyboard cross-axis navigation normalises the
      negative `scrollLeft` origin. Verified in Chrome, Firefox and Safari 26.4
      (safaridriver): header/body left delta [550,100,-450] → [0,0,0] px; diagonal
      wheel keeps the cross-axis component. Horizontal RTL lists stay guarded in
      synthetic mode. Base unchanged, table +63 bytes.
- [x] `page()` remains the external native-document provider in native mode and
      throws with synthetic mode (#132).
- [x] Document supported plugin combinations and known limitations of the opt-in
      mode in README, npm-readme and the `[Unreleased]` changelog (#132); release
      notes at the minor.
- [x] **Size budget for the synthetic entry: 2.5 KB gzipped, accepted 2026-09-14**
      (floor/vlist#130). The bounded handler's 1.1 KB covers wheel and rebase only;
      the entry replaces native touch (sampling, multitouch, capture, click
      suppression), native keyboard scrolling and the clip lifecycle, and component
      ablation showed no single removable feature after diagnostics, reason strings,
      per-commit timers and the two-phase keyboard path were removed. Base bundle
      unchanged at 9.8 KB (+17 bytes for the factory hook). PRs (b) and (c) fit
      inside the budget; any growth needs a new decision.
- [x] **Performance parity measured 2026-09-14** on the same build, 1M rows, Chrome
      touch fling: every frame 16.7 ms at 1x and 6x CPU throttling, no long tasks;
      main-thread cost per pixel travelled 0.090 ms (synthetic) vs 0.094 ms (bounded);
      style recalculation higher for synthetic (8.2 vs 2.5 ms per fling) because rows
      move from JavaScript. Follow-up candidate, separately gated: translate the stage
      once per frame with an anchored baseOffset to cut per-frame style writes.

## 5. Production scrollbar and migration

Can be designed independently; must finish before native viewport removal.

- [ ] Decide core-vs-plugin bundling, default/disable/customization API, dup guard.
      Decided 2026-09-14: the scrollbar stays a plugin, required by documentation.
- [x] Native look by default: per-platform defaults for width, overlay vs gutter,
      radius and auto-hide timing (macOS, Windows, Android), from AzzaAzza69's
      requirement in floor/vlist#108 (#143).
- [x] Honour the standard `scrollbar-width` and `scrollbar-color` properties read from
      the container's computed style, so existing stylesheets keep working (#143).
- [x] Documented one-to-one mapping from each `::-webkit-scrollbar*` pseudo-element to a
      plugin class or `--vlist-scrollbar-*` variable; the pseudo-elements themselves are
      not mirrored (non-standard, Chromium-only, not readable from script) (#144).
- [x] Implement keyboard, focus, pointer and semantics (floor/vlist#142 on `next`,
      2026-09-14: role=scrollbar, ARIA range and "Row N of M", focus-visible, one
      pointer-capture path). Screen-reader pass: VoiceOver macOS passed 2026-09-15 on a
      local build of `next` (bar reachable by Tab, role and row value announced, keys
      and adjust gesture move it, list navigation intact). VoiceOver iOS and TalkBack
      pending.
- [x] Forced colors, horizontal orientation and huge totals (20M rows) tested (#144);
      reduced motion is handled by the driver, not the bar.
- [x] Scrollbar plugin +2.0 → +2.8 KB gzipped across #142-#144 (402 + 394 + 0 bytes),
      inside its budget; base unchanged.
- [x] Specify migration for `scroll.mode` and `scrollbar: "native"` and public internals:
      series 5 merged into staging 2026-09-15 for the 2.8 minor (floor/vlist#151):
      `@deprecated` JSDoc on `scroll.mode`, `scroll.runway`, the `"native"` and
      `"none"` values of `scroll.scrollbar` (core reads only `"none"`; the options
      object stays as the `vlist/config` convenience) and the old plugin hooks; the
      `scale()` guidance rerouted to the synthetic entry; deprecations table in the
      READMEs and changelog; no runtime warning for bounded mode. Found and fixed on
      the way: `vlist/config`, which every framework adapter uses, installed the
      deprecated `scale()` stub unconditionally and warned every adapter user once per
      page; the stub is now silent and only explicit `scale()` warns. Base
      byte-identical. staging forwarded into next (ffdea873). Migration guide:
      vlist.io `docs/migration-v3.md`.

## 6. Release gates

**2.7 opt-in release**

- [x] Five prototype review defects fixed and covered by the harness (vlist.io#56,
      deployed 2026-09-13).
- [x] Boundary policy for the opt-in mode recorded (2026-09-13).
- [x] Section 4 checklist complete for the supported plugin set; unsupported
      combinations throw. Integration branch `feat/synthetic-input` at c7db431e
      (PRs #130, #131, #132), verified 2026-09-14 from a clean export: 3530 tests,
      typecheck, build with declarations, base 9.8 KB, synthetic +2.5 KB.
      Official benchmark scenarios landed 2026-09-14 (vlist.io#59, vlist#133):
      matched logical native/bounded/synthetic scenarios plus an in-page pointer-fling
      scenario for the synthetic driver; 60 FPS, zero frames over 32 ms at 10K to
      1M rows on c7db431e. RTL guard merged (#134). Nothing remains open before the
      minor except the merge of `feat/synthetic-input` into staging and the release
      prep (jvial); the synthetic telemetry export stays optional.
- [x] Required typecheck, tests, browser checks and size measurements pass; base
      bundle unchanged for non-opt-in consumers (clean export of 20aaa281:
      3536 tests, typecheck, build with declarations, base 9.8 KB, synthetic +2.6 KB).

**2.7.0 released 2026-09-14** (floor/vlist v2.7.0, npm latest). Follow-ups: framework
adapters cannot reach the `vlist/synthetic` entry yet (done 2026-09-15 for 2.8:
`VListConfig.factory` in `vlist/config`, floor/vlist#152, with a guard when synthetic
mode is requested without a factory; adapter PRs vlist-react#3, vlist-vue#3,
vlist-svelte#3, vlist-solidjs#3 approved, merge and publish after 2.8; browser
harness two-sample race fixed in #153); vlist.io docs page for the mode (done
2026-09-15: `docs/scroll-modes.md`, plus `scroll.mode`/`scroll.runway` rows in the API
reference and the v2 to v3 migration guide); staging benchmark build resolving vlist
from the staging clone (done 2026-09-15: `VLIST_BENCH_ROOT` set in the staging deploy
workflow); the unresolved `scale` size placeholders on the bundle-size and plugin
overview pages removed (the stub has no size row).

**2.8.0 released 2026-09-15** (floor/vlist v2.8.0, npm latest): deprecation ladder,
`VListConfig.factory` for adapters, the silent scale stub, autosize `remeasure(index?)`;
adapters 2.8.0 merged on their `main` branches, npm publish pending (manual, OTP);
vlist.io docs (scroll modes, v2 to v3 migration) deployed to production. CI was red on
the release PR on the per-file coverage gate (scale plugin 58.8% after #151, all tests
passing); fixed by a test-only follow-up, and the coverage script is now part of every
clean-export verification.

**3.0 flip started 2026-09-15** on Dr Jones's decision to implement locally and test
before any release. Series 7 PR a merged into `next` (floor/vlist#157): core
`createVList` uses the synthetic driver; `vlist/native` is the opt-in native entry
(native and bounded until the removals); `vlist/synthetic` is a deprecated alias;
`scroll.mode: "native" | "bounded"` in core throws with the import to add, as do
carousel, sortable and horizontal RTL; `vlist/config` defaults to the core factory.
Verified from a clean export: 3,624 tests, coverage gate green, wheel probe 40/40 on
five layouts in both entries. Sizes before removals: base 12,820 bytes with the
driver, native 10,358. First local test round on this build (2026-09-15): the driver
passed on every example ("amazing"); findings were migrations and two pre-existing
defects. Examples that relied on the browser scrollbar now install `scrollbar()`;
carousel, sortable and plugin-wizard import `vlist/native`. Scrollbar plugin
regression from #143 fixed on next (floor/vlist#158): numeric `width`/`radius` config
was ignored and the author's `--vlist-custom-scrollbar-width/-radius` variables were
overridden by inline platform defaults; precedence is now config, author variable,
platform default, and vlist.css no longer declares those two defaults. Scrollbar row
+99 bytes (+2.9 KB shown) against its +2.8 KB gate budget, accepted to restore the 2.8
promise. Carousel slots not following container resizes (pre-existing in 2.8.0) is
dispatched as a 2.8.x fix on staging. PR b (removals, 9.9 KB gate) resumes after.

**3.0 removals merged 2026-09-15** (floor/vlist#160, series 7 PR b): `scroll.mode`,
`scroll.runway`, `scale()`, `setScrollFns` and `disableDefaultScroll` removed; the
default factory rejects the `"native"` and `"none"` scrollbar strings, which remain on
`vlist/native`; the native entry injects its own scroll handler, the private carousel
wrap runway and the size warning. Verified from a clean export (3,639 tests, coverage
gate, 19 size scenarios, build) and the checked-in browser suite (32 PASS, 0 FAIL,
DOM-position wheel probe in both entries). vlist.io examples migrated with a 2.x
fallback (vlist.io c845284), verified locally on the 3.0 build and on staging with 2.8.
Dr Jones's second local test round on this build (2026-09-15) passed: every example
tested, all smooth.

**3.0.0-next.1 published 2026-09-15** (npm `next` dist-tag; `latest` stays 2.8.0; GitHub
prerelease). The publish workflow now sends hyphenated versions to `next`, marks the
GitHub release as a prerelease and checks that the tag matches `package.json`
(RELEASING.md documents the procedure). The first publish attempt failed in the Linux
test step before anything reached npm: an a11y integration test derived the scroll
limit from a viewport height that a geometry mock leaked by `resilience.test.ts` set to
500 px. The test now pins its height; the tag was moved to the fixed commit and the
unused version republished. The desk (radiooooo monorepo) was migrated to 3.0 on its
local link to `next` as a real-world test. Follow-up: eleven integration test files
leave geometry mocks on the element prototype without restoring them.

Size is deferred to a later step by Dr Jones. Baseline after the removals: base 11,670
gzip bytes, native entry 10,395, plugin rows about -1.2 KB each. A read-only analysis by
Claude and Codex (2026-09-15) found that removing the modes returned about 1.2 KB while
the synthetic driver costs about 2.7 KB, and that the core factory, untouched by the mode
work, is the largest part of the base. Candidate ownership moves (page scroll source to
page, native-only policy to the native entry, the live region to a11y, compact
validation, a plain navigation object) are recorded for that step; experiments that
changed telemetry or dropped critical inline styles, and removals of published plugin
API, need explicit decisions. A native-default shape with bounded removed measured about
9.0 KB in a scratch experiment and remains an open option. PR c (size cuts) is on hold.

**3.0 shape (decided 2026-09-14)**

**Revised 2026-09-15 by Dr Jones: native default.** The shape below was implemented,
tested and published as 3.0.0-next.1, then revised: `vlist` stays native, `vlist/synthetic`
is the opt-in synthetic entry, bounded mode stays removed, and the carousel owns its wrap
runway (RFC-014 decision record, 2026-09-15). Series 8 on `next`: PR a moves the carousel
runway into the plugin, PR b makes native the default; then the vlist.io examples, the
desk, the migration guide and scroll-modes page, and a 3.0.0-next.2 prerelease. The size
gate becomes the 2.8 base, 9.9 KB, for the native default. The bullets below describe the
superseded 2026-09-14 shape.

**2.8.1 released 2026-09-15** (npm `latest`): corrected the 2.8 deprecation notices for
the native-default shape (native stays the default, synthetic input opt-in, the scrollbar
strings not deprecated), the carousel resize fix and the prerelease-aware publish workflow;
two README size rows refreshed. vlist.io deployed with the rewritten migration guide.
Series 8 PR a merged into `next` (floor/vlist#162): the carousel supplies its own wrap
runway; native entry 9,537 gzip bytes (-856), carousel row +893. PR b (native default) and
the test geometry-mock cleanup are in progress.

- Core: synthetic input is the default and the only model in core. Bounded mode,
  `scroll.mode`, the runway, rebase and `baseOffset` are removed. `scale()` is removed.
- Native scrolling moves to an opt-in `vlist/native` entry, kept unless the gate review
  shows no consumer needs parent handoff, find-in-page or native scrollbar semantics.
- The custom scrollbar remains a plugin, required by documentation, not bundled.
- Size gate: 3.0 base at or below 9.9 KB gzipped with the driver included; plugin rows
  unchanged or smaller, except the scrollbar plugin, whose accessibility and native-look
  work has its own budget of +2.8 KB (from +2.0). Simplification pays for the driver: one
  wheel handler, no runway or `baseOffset` split, no mode branching, simpler pipeline.
- Integration branch `next` opened 2026-09-14 at vlist staging 2.7.2; series 1
  (scrollbar gate, #142-#144) and series 2 (RTL, #145) merged; series 3 (adapter
  adoption: `getRenderOrigin()` on the adapter, renderers then motion plugins then
  readers, enforced by a source-boundary test) dispatched 2026-09-14. PR a merged
  2026-09-14 (floor/vlist#146): `ScrollAdapter.getRenderOrigin()`; grid, table, tree
  and masonry read position and origin once per commit and keep their own last
  committed origin; an AST boundary test counts every remaining direct read per
  plugin. Review found that the adapter's page-mode getter forced layout on each read
  (`getBoundingClientRect`), which the scroll and idle event payloads had been paying
  per frame since RFC-012 phase 1; scroll sources now commit their position to engine
  state and reads stay cached. Base 10,105 bytes (-1); wheel probe 40/40 in every
  layout and mode. PR b merged 2026-09-14 (floor/vlist#147): transition, groups,
  carousel and sortable read through the adapter; native mode gains a single scroll
  writer that reads back the clamped DOM value, commits position and direction, renders
  and schedules idle in the call, so all three modes are readable synchronously after a
  write and the later DOM event dedupes. Transition's hand-written engine commits are
  gone. Base 10,129 bytes (+23 for the series, inside the +40 allowance); probe 40/40
  including groups. PR c merged 2026-09-14 (floor/vlist#148): a11y, autosize,
  selection and snapshots read through the adapter; a11y focus navigation writes
  through it. Review found the adapter's maximum omitted the main-axis padding that
  the content element and the logical sources include, which clamped last-item focus
  short; fixed with tests. Series 3 closed: the boundary test's allowlist holds only
  the page plugin's three scroll-source accesses. Base 10,140 bytes (+34 for the
  series). Next gate: page mode under the external-scroll seam.
- Series 4 (page mode) PR a merged 2026-09-14 (floor/vlist#149): one commit path in the
  native handler shared by DOM events, wheel, programmatic writes and smooth-scroll
  ticks; `PluginContext.setScrollSource()` and `commitScroll()` replace the ad-hoc
  page hooks (`setScrollFns`, `disableDefaultScroll` deprecated, removal in 3.0); the
  page plugin commits through core, dedupes window events and honours
  `scroll.idleTimeout`; the plugin boundary allowlist is empty. Base 10,169 (+29 for
  the series), page -34. PR b merged 2026-09-14 (floor/vlist#150): with an external
  source installed core takes the document-provider path in every mode (no driver, no
  runway, document-sized content, origin 0); the page-plus-logical-mode throws are
  gone and the carousel conflict stays explicit; the source contract gains an optional
  `onContentSize` hook, invoked from the single content-sizing function, and the page
  plugin owns the 16,777,216 px guard (throw at creation when the size is known, warn
  once on later growth or on a deferred renderer's first commit). Page gate closed.
  Size: base 10,187 bytes (9.9 KB), +47 for series 4 against a +30 allowance; the
  overrun is the creation-time validation for custom and deferred renderers, kept
  because it turns a silent broken layout into an error at creation. Synthetic row
  2,643 (smaller than before series 3); page +146 for the guard and its messages.
- Gate order before the flip: scrollbar accessibility, RTL support in the driver,
  adapter adoption in all plugins (the vehicle for removing `baseOffset` reads), page
  mode under the external-scroll seam, deprecation ladder. Work proceeds on a `next`
  integration branch while 2.7 gathers consumer feedback.

**3.0 default decision (conditional)**

- [ ] Consumer feedback from the opt-in mode recorded alongside the A/B comparison.
- [x] Scrollbar, page, RTL and migration gates closed (scrollbar, RTL and page on
      `next` 2026-09-14; migration on staging 2026-09-15, forwarded to `next`).
- [ ] Only then flip the default or delete the native viewport path, if still selected.

Adapter canonicalization and distance-based overscan remain separately scoped work.
