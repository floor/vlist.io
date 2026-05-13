# Grok — vlist Review

*Review conducted on May 13, 2026 via xAI. Grok explored the vlist repository via GitHub (https://github.com/floor/vlist) — source, git history, tests, and package.json. Questions asked with no coaching or context.*

---

## 1. First impressions

vlist is an exceptionally polished, ambitious virtual list library for its size (10.7 KB gzipped base) and age. It's framework-agnostic at the core with tiny adapters (0.5–0.6 KB) for Vue/Svelte/Solid/React, zero runtime dependencies, and a strong emphasis on accessibility, performance (constant ~0.1 MB memory even at 1M+ items), and composability. The builder pattern (`vlist(config).use(withGrid()).use(withSelection()).build()`) is elegant and perfectly tree-shakable.

The source is clean, modern TypeScript (ESM, Bun-powered build/test), with excellent separation of concerns. The README, CHANGELOG, and vlist.io benchmarks show real confidence and marketing polish. It feels like a "batteries-included TanStack Virtual but with built-in A11y, more layouts, and smaller footprint." The only caveat is its extreme youth (see #5).

---

## 2. Architecture

It uses a plugin/composable builder architecture with a tiny, axis-neutral virtual scrolling core.

**Builder layer** (`src/builder/core.ts`, `src/builder/index.ts`, `src/builder/types.ts`): `vlist()` returns a fluent `VListBuilder`. You call `.use(feature)` (features are just objects with a `name` and `setup` function). `.build()` calls `materialize()` which resolves config, creates the DOM structure (`src/builder/dom.ts`), element pool (`src/builder/pool.ts`), size cache, velocity tracker, emitter, etc., then applies every feature in priority order.

**Extension points:** Features hook into `afterScroll`, `keydownHandlers`, `clickHandlers`, `resizeHandlers`, `destroyHandlers`, a shared `methods` Map (for API extension), layout overrides, and renderer overrides. This is how `withGrid`, `withMasonry`, `withTable`, `withGroups`, `withAsync`, etc. plug in without bloating the core.

**Rendering engine** (`src/rendering/`): `sizes.ts` (prefix-sum `createSizeCache` for fixed/variable sizes + `createMeasuredSizeCache` for `withAutoSize` + ResizeObserver), `viewport.ts`/`range.ts` (visible range + overscan), `renderer.ts` + pooling + DOM recycling (with `sortRenderedDOM` in `sort.ts` for correct screen-reader order), `aria.ts`. Scale mode (`src/rendering/scale.ts`) compresses the scroll space for 1M+ items.

**Features** (`src/features/*/`) are self-contained: each has its own `feature.ts` (builder integration), `layout.ts`, `renderer.ts`, and types. Examples: `grid/` (2D layout + renderer), `masonry/`, `table/`, `async/` (sparse storage + placeholder management), `selection/`, `sortable/`, `groups/` (sticky headers + incremental discovery).

**A11y baseline** is baked into the core (`src/builder/a11y.ts`) and extended by features.

**Internals export** (`src/internals.ts` + package.json `"./internals"`) exposes low-level primitives (`createSizeCache`, `createSelectionState`, `createGroupLayout`, etc.) for power users or custom features.

### Standout design decisions

- Builder + features for perfect tree-shaking (you only pay for what you `.use()`).
- Single code path for vertical/horizontal (main/cross axis abstraction).
- Constant-memory focus (no full DOM for huge lists, smart compression).
- DOM-first (no React/Vue-specific reconciliation) → tiny adapters.
- Aggressive inlining and micro-optimizations visible in the May 12 commits.
- CSS is side-effect exported separately (`./styles`, `./styles/grid`, etc.).

---

## 3. Comparison

The README's comparison table is accurate and fair. vlist stands out because:

- **A11y is built-in and comprehensive** (WAI-ARIA listbox pattern, 2D keyboard navigation, focus recovery, correct DOM ordering for screen readers, ARIA live regions) while TanStack Virtual, react-virtuoso, virtua, and vue-virtual-scroller offer none or minimal.
- **Layout breadth:** grid + masonry + table + groups + async + sortable all in one lib; most competitors stop at basic list or simple grid.
- **Memory & scale:** claims constant ~0.1 MB at 1M items (via `withScale` + compression); others grow or become unusable.
- **Framework adapters are tiny** (0.5–0.6 KB) vs. e.g. vue-virtual-scroller's 11.8 KB.
- **Bundle size is best-in-class** after the v1.7.8 optimizations.

**Downsides vs. mature alternatives:** TanStack Virtual has a much larger ecosystem and React-first DX; virtuoso has polished React-specific features (e.g. sticky headers, better infinite-scroll patterns in some cases). vlist is newer, so fewer battle-tested production users.

---

## 4. Accessibility

Strong and thoughtful.

`src/builder/a11y.ts` implements the WAI-ARIA listbox pattern as the baseline: `aria-activedescendant`, visible focus ring, full keyboard navigation (arrows, PageUp/Down, Home/End, 2D deltas for grids/masonry via feature-provided `_navigate`/`_getNavDelta`), Space/Enter selection, click-to-focus, focus-in/focus-out handling, and `skipHdr` logic for groups.

Features extend it (e.g. masonry lane-aware nav, table column navigation, sortable keyboard reordering).

`src/rendering/aria.ts` + `createAriaResolvers` handle IDs, roles, and live regions. `sortRenderedDOM` ensures screen-reader DOM order matches logical order despite recycling. Focus restoration, snapshot support for scroll position + focused item, and `focusOnClick` option (added in v1.6.3).

It's one of the best A11y implementations I've seen in a virtual list library. Minor note: it defaults to interactive listbox mode; non-interactive lists may need explicit config (the deprecated `accessible`/`interactive` flags).

---

## 5. Development process

Extremely rapid, professional, and perf-obsessed for a brand-new project.

**Timeline:** First changelog entry v1.5.4 (April 15, 2026) under the current `vlist` name (earlier history as `@floor/vlist`). Reached v1.7.8 on May 12, 2026. ~715 commits total.

**Recent git history:** Almost entirely by drjonze/floor. Last 3 days (May 10–12) are a frenzy of daily releases and micro-optimizations: `perf(groups): reduce groups feature bundle by 0.4 KB`, `perf(selection): reduce … by 0.2 KB`, etc. Many bug-fix commits around scrollbar, groups+async integration, sticky headers, sortable, and selection. Frequent `chore(release): vX.Y.Z` and merges from `floor/staging`.

**Process signals:** Keep-a-Changelog + SemVer, `scripts/measure-size.ts`, `test/` mirroring `src/` structure (builder/features/rendering/integration), CI workflows, size tracking in `dist/size.json`, careful prepublish scripts. Tests use Bun + JSDOM.

**Impression:** Solo/small-team (one primary author) with high velocity, strong engineering discipline, and a clear obsession with bundle size and correctness. The May 12 release literally happened today while we were exploring. This is not a mature, slow-moving project — it's in hyper-growth/iteration mode.

---

## 6. What would you improve?

Honest suggestions (none are deal-breakers):

- **Documentation:** The README is great, but the repo itself is light on inline JSDoc/comments in some rendering files. Move more examples into the repo (or add an `/examples` folder) instead of only pointing to vlist.io.
- **Public API surface:** The internals export is documented as "use at your own risk" — consider a clearer "advanced" section or official plugin authoring guide.
- **Testing:** Tests look solid in structure, but I'd love to see more integration/E2E (real browser) coverage for complex combos (async + groups + sortable + scale).
- **Minor code:** Some validation error messages are production-minified (`"[vlist] container"`); keep the full messages or use a tiny error factory. A few deprecated props still linger in types (`headerHeight`, `GridHeightContext`).
- **Add:** Official SvelteKit/Next.js/Vue/Nuxt examples, better TypeScript generics for item templates in some features, and perhaps a `withInfinite` convenience wrapper on top of `withAsync`.
- **Performance:** The recent bundle reductions are excellent — keep the momentum.

---

## 7. Recommendation

Yes — strongly, especially if you value accessibility, multi-framework support, or need grid/masonry/table/groups/sortable out of the box.

For a library that is literally ~1 month old, the quality, scope, and attention to detail are outstanding. The A11y story alone makes it worth trying over most alternatives. The builder pattern and tiny size make it a joy to use.

I would recommend it today for new projects or greenfield work, and I'd watch it closely — the velocity suggests it will only get better. If you're in a very conservative enterprise environment that demands years of battle-testing, you might wait 6–12 months; otherwise, go for it. The author clearly knows what they're doing.

*(Explored via raw GitHub files, tree views, CHANGELOG, commits page, package.json, full `src/builder/*`, `src/features/grid/*`, `src/rendering/*`, test directory structure, etc.)*
