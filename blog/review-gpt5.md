# GPT 5.5 — vlist Review

*Review conducted on May 12, 2026 via Codex. GPT 5.5 had full local access to the vlist repository. Questions asked with no coaching or context beyond "explore the codebase and answer these questions."*

---

## 1. First impressions

I like it. It reads like a serious virtualizer, not a toy package: small base, opt-in features, strong tree-shaking discipline, good a11y posture, and a test suite that actually covers feature combinations instead of only happy-path units.

I verified:

- `bun test`: 3,370 passing, 0 failing
- `bun run typecheck`: clean
- `bun run size`: base 10.7 KB gzip, all 13 tree-shaking scenarios clean

My main takeaways:

The best parts are the architecture and performance focus. The builder/feature model is well thought out, and the hot path has real care in it: reusable range objects, element pooling, cached lookups, capped content size, deferred DOM sorting for screen readers, sparse async storage, and compression for very large lists. The package also has unusually broad feature coverage for its size: grid, masonry, table, async, groups, selection, snapshots, scale, autosize, sortable.

The biggest thing I'd clean up is API consistency around item identity vs index. The README says `updateItem(index)` and `removeItem(index)` at `README.md` (line 219), the implementation updates by index at `src/builder/api.ts` (line 133), but the public type names the first parameter `id` at `src/builder/types.ts` (line 644). `removeItem` is even more ambiguous: the API says `id`, docs say `index`, and the simple data manager treats a numeric argument as an index but a string as an id at `src/builder/data.ts` (line 185). That can surprise users with numeric item IDs.

The main maintainability risk is that `BuilderContext` has become a very powerful internal plugin bus. That's probably justified for the bundle-size goals, but it means feature interactions depend on conventions like priorities, internal method names, and replacement hooks. The tests are doing a lot of good work holding that together. I'd keep investing in those cross-feature integration tests.

Overall: impressive package. I'd trust the engineering direction. Before a bigger public push, I'd tighten the public data API semantics, document the "index vs id" decision clearly, and maybe add a short maintainer-facing note explaining feature ordering/internal extension points so future changes don't accidentally break the carefully balanced parts.

---

## 2. Architecture

I'd describe vlist as a small virtual scrolling kernel with a feature-composition layer around it.

The core owns the non-negotiables: DOM scaffold, scroll state, size cache, visible/render range calculation, item pooling, baseline ARIA/focus behavior, data mutation wrappers, and the public API. Everything else is modeled as a `VListFeature` that gets a `BuilderContext` and can register handlers, methods, lifecycle hooks, or replace specific pieces of the pipeline.

The standout design decision is that the package is **bundle-budget driven**. The architecture is clearly shaped around "base stays tiny, advanced behavior is opt-in and tree-shakeable." You see that in direct imports instead of barrels, feature factories, injected compression behavior, a simple static data manager in core, and the larger async/sparse manager living behind `withAsync()`.

Another strong choice is the **layout abstraction via feature replacement**. Grid, masonry, and table do not pretend to be minor variations of list rendering. They change virtual totals, index mapping, renderer behavior, ARIA, and navigation hints. That is more complex, but honest: these layouts have different semantics.

The hot path is also deliberately engineered. The code avoids per-scroll allocations, reuses range/event objects, caches feature method lookups, pools DOM nodes, skips template reapplication when item identity is stable, and defers expensive/accessibility-only work like DOM reordering until idle. It feels written by someone who has profiled virtual scrolling before.

The most interesting tension is the `BuilderContext`. It is powerful and practical, but also a soft internal protocol: lots of `_internalMethod` names, priority ordering, replace hooks, and shared mutable refs. That buys small bundles and feature flexibility, but it raises the cost of future maintenance. The large cross-feature test suite is doing important architectural work here.

**A senior-dev summary:**

vlist is a performance-first virtualizer kernel with a plugin system. It favors explicit low-level control, feature-specific renderers, and tree-shakeable composition over a more abstract or declarative architecture. The tradeoff is a very capable, small runtime with some internal coupling that must be guarded by tests and careful conventions.

**Design decisions that stand out:**

- Builder-only public construction: `vlist(config).use(feature).build()`
- Opt-in features rather than a monolithic all-capabilities object
- Size-cache abstraction for fixed, variable, measured, and compressed layouts
- Sparse async storage with placeholders rather than requiring full data materialization
- Renderer replacement for layout modes instead of overgeneralizing one renderer
- Strong a11y defaults, including keyboard nav and screen-reader DOM ordering
- Explicit conflict detection between incompatible layout/behavior features
- Performance-aware public API assembly and minification-conscious internals

My main critique remains API clarity around index vs id for update/remove. Architecturally, though, the package has a coherent point of view: tiny core, composable power, serious scroll performance.

---

## 3. Comparison

vlist sits in an interesting middle ground: more batteries-included than TanStack Virtual or react-window, more framework-neutral than React Virtuoso, and much smaller/more modern than react-virtualized-style component suites.

I'd frame it like this:

| Library | Personality | Best Fit |
|---|---|---|
| **vlist** | Tiny framework-agnostic virtualizer with opt-in features | Product UIs needing lists, grids, tables, groups, async, a11y, selection, huge counts |
| **TanStack Virtual** | Headless primitive/engine | Teams that want full markup/control and already compose their own UI |
| **React Virtuoso** | High-level React components | React apps that want polished list/grid/table/chat behavior with low setup |
| **react-window** | Minimal React virtualization | Simple React lists/grids where you want a small, proven primitive |
| **react-virtualized** | Older broad React component suite | Legacy React apps, or cases already built around its List/Grid/Table APIs |
| **vue-virtual-scroller** | Vue-specific scroller | Vue apps needing established virtual list behavior |

**Where vlist stands out:**

It is framework-agnostic but not merely headless. TanStack Virtual is also framework-agnostic and explicitly headless, giving you a virtualizer engine and expecting you to wire markup/styles around it. vlist makes a different bet: it owns DOM rendering, ARIA, pooling, layout modes, keyboard behavior, async placeholders, and feature composition. That gives up some control, but gives you more "system" out of the box.

Compared with TanStack Virtual, vlist is more opinionated and feature-complete. TanStack is probably better if you want to deeply integrate with your rendering framework and own every element. vlist looks stronger if you want one small vanilla core with grid/table/masonry/groups/selection/a11y as first-class concepts.

Compared with React Virtuoso, vlist is less React-native and probably less plug-and-play for React teams, but broader in portability. Virtuoso has excellent high-level React components and explicitly covers lists, grids, tables, masonry, and chat/message-list use cases. vlist competes more on size, zero dependencies, framework adapters, and its composable feature model.

Compared with react-window, vlist is much more ambitious. react-window is a lean React component library for rendering large lists efficiently; it's great when the problem is simply "don't render 50k rows." vlist is trying to solve the larger UI-control problem: selection, keyboard nav, screen-reader ordering, async loading, groups, tables, custom scrollbars, snapshots, scale compression.

Compared with react-virtualized, vlist feels more modern and smaller. react-virtualized is a broad older React suite for lists/tables/grids, but it carries more historical API and React-specific weight. vlist has the newer architecture I'd prefer for a fresh library.

Compared with vue-virtual-scroller, vlist is not tied to Vue and appears more actively designed around a multi-framework package family. vue-virtual-scroller is still a known Vue option, but vlist is aiming for "one core, tiny adapters."

**My honest take:** vlist's strongest differentiator is feature density per KB. The weak spot is ecosystem maturity. TanStack Virtual and Virtuoso have more established mindshare. vlist needs excellent docs, demos, adapter polish, and real-world battle reports to make people trust the more ambitious feature surface.

---

## 4. Accessibility

### Findings

**P1: `aria-activedescendant` is applied to the wrong element in list/grid/masonry modes.**

`src/builder/dom.ts` (line 56) makes `.vlist` focusable, while `src/builder/dom.ts` (line 75) puts `role="listbox"` on `.vlist-items`. Then `src/builder/a11y.ts` (line 51) sets `aria-activedescendant` on the focusable root, which has no composite widget role. Screen readers may not treat the active option correctly. Fix by either moving `role="listbox"`/label/orientation to the focusable root, or making the listbox element itself the focused element.

**P1: Table + selection points `aria-activedescendant` at IDs that do not exist.**

Selection always emits IDs shaped like `${ariaIdPrefix}-item-${index}` at `src/features/selection/feature.ts` (line 535, 597, 891). But table rows are rendered as `${ariaIdPrefix}-${index}` at `src/features/table/renderer.ts` (line 467). In table mode, active descendant references are broken. Align the table row ID format or expose an active-descendant ID resolver through the context.

**P2: `interactive: false` still exposes an interactive listbox/option model.**

Even when the root is not focusable, the DOM still gets `role="listbox"` at `src/builder/dom.ts` (line 75), and rendered items still get `role="option"`/`aria-selected` at `src/builder/core.ts` (line 553). That makes display-only feeds/logs look like an inaccessible selectable widget. For `interactive: false`, prefer neutral semantics: `role="list"`/`role="listitem"` or no explicit roles.

**P2: Table header sorting and resizing are pointer-only.**

Sortable column headers get `role="columnheader"` and `aria-sort`, which is good, but sorting is only wired through click handling at `src/features/table/header.ts` (line 373). Resize handles are plain divs at `src/features/table/header.ts` (line 180) and only support pointer drag. Sortable headers should be keyboard operable, and resizers should probably expose `role="separator"`, `aria-orientation`, `aria-valuenow`/`min`/`max`, `tabindex`, and arrow-key resizing.

**P3: Range announcements may be noisy.**

The live region announces visible range changes after every debounced `range:change` at `src/builder/core.ts` (line 1136). That can become chatty during keyboard/page navigation or repeated scroll pauses. I'd consider making this opt-in, limiting it to programmatic jumps/loading, or using less frequent announcements.

### What's Strong

The implementation has real accessibility ambition: group headers are presentational, `aria-posinset`/`aria-setsize` account for grouped data, table mode uses grid/row/columnheader/gridcell semantics, focus recovery exists, DOM order is sorted on idle for screen-reader traversal, and there are many keyboard navigation tests.

The main problem is not effort; it's a few semantic mismatches between the focus target, the ARIA role owner, and renderer-specific IDs. Fix those and the a11y story gets much sturdier.

---

## 5. Development process

I'd describe the development process as very high-velocity, solo-led, test-heavy, and release-driven, with some signs of "move fast, then harden" rather than long design freezes.

The timeline is compressed:

- **Initial commit:** February 2, 2026
- **Current release tag inspected:** v1.7.8 on May 12, 2026
- **Total commits across all refs:** 843
- **Commits on current branch history:** 702
- **Active commit days:** 65
- **Average on active days:** about 13 commits/day
- **Peak day:** 49 commits on February 16
- **Tags:** 55 release tags from v0.3.1 to v1.7.8

That is a lot of motion for roughly three months.

### What The History Suggests

The project evolved in phases:

**Early February: core engine and architecture exploration.** Initial commits immediately include 1M+ item compression, custom scrollbar, velocity-based loading, rendering performance, and then a "domain-driven architecture" refactor. That tells me the author started with an ambitious performance target, then repeatedly reshaped the internals as constraints became clearer.

**Mid/late February: API and architecture stabilization.** There are major refactors around builder-only API, plugin/feature architecture, type alignment, size cache, and module organization. This is the "finding the spine" period.

**March: feature completion and polish.** More list/table/grid/group behavior, tests, ARIA fixes, padding/config refinements, and release churn. The process still looks exploratory, but less chaotic.

**April: production-hardening phase.** Lots of fixes around accessibility, async, selection, table mode, snapshots, scroll behavior, CI, package rename, and publish automation. This is where it starts looking like a serious package rather than an experiment.

**Late April/May: advanced features and optimization.** `withSortable`, async groups, snapshot restore across group structure, compressed group scrolling, custom scrollbar fixes, and then a final bundle-size optimization campaign. This phase is heavily test/perf oriented.

### What I Like

The commit style is disciplined: mostly conventional prefixes like `fix`, `feat`, `test`, `perf`, `refactor`, `chore`. That makes the history readable.

There is a clear staging/main release flow. Recent releases merge staging into main via PRs, with tags on release merge commits. That is good.

The process is unusually test-conscious. I see many `fix` commits immediately paired with `test` commits, coverage-focused commits, and CI/typecheck fixes. Given the current 3,370-test suite, the history supports the impression that regressions were being captured and locked down.

The maintainer also seems performance-literate. There are repeated commits about hot-path allocation, O(n) bottlenecks, size cache behavior, compressed scroll, bundle size, and tree-shaking. That is not superficial polish.

### What Worries Me

The release cadence is extremely fast. There are stretches with multiple releases in a day: for example v1.7.2 and v1.7.3 both on May 1, and a long series from v1.7.0 to v1.7.8 between April 29 and May 12. That suggests responsiveness, but also that releases may be used as stabilization checkpoints rather than being held until behavior has soaked.

The fix-to-feature ratio is high. Across the history I counted roughly:

- `fix`: 268
- `feat`: 140
- `chore`: 124
- `refactor`: 66
- `docs`: 62
- `test`: 59
- `perf`: 47

A high fix count is not automatically bad in a young library, but it does show the feature surface was being discovered through implementation pressure.

The project is effectively single-maintainer. `git shortlog` is overwhelmingly one author: DrJones has 824 commits, with a small number from admin/noreply identities. That can be productive, but it means review diversity and bus factor are limited.

There are signs of AI-assisted workflow or at least AI tooling integration: commits mention Claude config, agents, skills, hooks, and `.claude`. That is not a problem by itself. In fact, the small commits plus tests suggest a controlled workflow. But for a library this intricate, I'd want strong human review on API/a11y semantics.

### My Read

This looks like a fast, intense incubation cycle by a very active maintainer. The process is not slow enterprise governance; it is closer to "build, profile, test, fix, release, repeat." For a new performance library, that can be a good way to find the real edge cases.

I'd trust the engineering energy and test discipline. I'd be more cautious about API stability and real-world soak time. Before calling it mature, I'd want fewer rapid patch releases, more external users/issues, and some independent review of accessibility and public API semantics.

---

## 6. What would you improve?

If I joined as a contributor, I'd start with a small "trust and semantics" pass before touching bigger feature work.

**First, I'd fix the accessibility contract.** The highest-impact change is making the focused element and ARIA composite role line up: right now focus is on the root, while `role="listbox"` lives on the inner items container. I'd move the listbox semantics onto the focused root or make the listbox itself focusable. In the same pass, I'd centralize active-descendant ID generation so list/grid/masonry/table all produce IDs the focus manager can reference reliably.

**Second, I'd clean up `interactive: false`.** If a list is display-only, it should not expose `listbox`, `option`, or `aria-selected`. I'd make that mode render neutral list/content semantics, which would make logs, feeds, and content lists feel much better to assistive tech.

**Third, I'd resolve the public API ambiguity around `updateItem` and `removeItem`.** I'd pick explicit names: `updateItem(index, patch)`, `removeItemAt(index)`, `removeItemById(id)`, maybe keeping the current method as a compatibility shim with a dev warning. Numeric IDs currently make this too easy to misuse.

**Fourth, I'd improve table keyboard accessibility.** Sortable headers need Enter/Space support, and resizable columns need keyboard resizing with proper separator semantics. The table implementation is strong enough that this missing piece feels worth closing.

**Fifth, I'd add a small accessibility regression suite** around behavior, not just attributes: active descendant points to an existing element, composite role is on the focus target, table + selection works, non-interactive mode is neutral, header sort works by keyboard.

After those, I'd probably work on **docs**. The package is impressive, but ambitious libraries need "trust docs": accessibility model, feature compatibility matrix, id/index semantics, async behavior, and recipes for common layouts. That would make the engineering feel easier to adopt.

---

## 7. Recommendation

Yes, with a caveat.

I'd recommend vlist for teams that need a small, framework-agnostic, feature-rich virtualizer and are comfortable adopting a newer library. The architecture is thoughtful, the test suite is unusually strong, and the size/performance story is compelling.

I would especially consider it for:

- Vanilla or multi-framework design systems
- Large lists with selection, grouping, async loading, snapshots, or custom scrollbars
- Apps where bundle size matters
- Product UIs that need grid/table/masonry behavior without pulling in a much larger component suite

I'd be more cautious if:

- You need maximum ecosystem maturity
- You are React-only and want the most battle-tested high-level component path
- Your app has strict accessibility certification requirements today
- You need complex enterprise data-grid behavior beyond virtualization

My recommendation would be: use it for controlled/product-facing work, pilot it before betting an enterprise-critical grid on it, and fix the accessibility/API clarity issues before positioning it as best-in-class.

It has the bones of a very good library. I'd want a little more real-world mileage before calling it the default choice over TanStack Virtual or React Virtuoso.
