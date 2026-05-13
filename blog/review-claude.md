# Claude Opus — vlist Review

*Review conducted on May 12, 2026. Claude had full local access to the vlist repository. Questions asked with no coaching or context beyond "explore the codebase and answer these questions."*

---

## 1. First impressions

This is one of the most carefully engineered frontend libraries I've read. The codebase is dense but deliberate — 1,401 lines in `core.ts` and not one that feels accidental.

The first thing that stands out is the builder pattern. `vlist(config).use(withGrid()).use(withSelection()).build()` looks simple, but underneath it enables something rare: genuine zero-cost abstraction. Features you don't import don't exist in your bundle. Features you do import plug into the core through well-defined extension points — replaceable render functions, scroll interceptors, shared mutable state — without the core needing to know they exist.

The second thing is the attention to allocation. The scroll hot path reuses event payloads, mutates range objects in place, and batches DOM operations into DocumentFragments. The element pool recycles DOM nodes instead of creating and destroying them. This isn't premature optimization — it's the kind of discipline that shows up as flat memory graphs at 1M items while competitors climb linearly.

The third is that accessibility isn't an afterthought bolted on later. It's woven into the DOM structure from `createDOMStructure()` forward: `role="listbox"`, `aria-activedescendant`, `aria-setsize`, `aria-posinset`, a live region for viewport announcements, and DOM reordering on scroll idle so screen readers traverse items in logical order despite absolute positioning.

## 2. Architecture

The architecture is a plugin-based virtualizer built on function replacement.

The core (`src/builder/core.ts`) handles one job: given a scroll position, determine which items are visible, position them with `transform: translateY()`, and recycle DOM nodes via an element pool. Everything else — grid layout, selection, async loading, scroll compression — is a feature that plugs in through `BuilderContext`.

What makes this work is the replacement pattern. Features don't just add behavior — they can replace core functions:

- `withScale` replaces `getScrollPosition()`, `setScrollPosition()`, `getVisibleRange()`, and `positionElement()` to take over the entire scroll pipeline when compression activates
- `withGrid` replaces the render functions to lay out items in a 2D grid
- `withAsync` replaces the data manager to intercept item access and trigger lazy loading

Features are sorted by priority (page=5, grid/masonry/table=10, scrollbar=15, async/scale=20, selection/snapshots=50) so higher-level features can wrap lower-level ones. Inter-feature communication happens through a shared `methods` Map — `withGroups` registers `_isGroupHeader`, `withSelection` reads `_getNavDelta` from `withGrid`. This is flexible but convention-based; there's no compile-time guarantee that the method exists when you call it.

The shared mutable state object (`$` in `materialize.ts`) uses short 2-3 character keys (`$.hc` for SizeCache, `$.fi` for focused index, `$.ls` for last scroll position) designed to survive minification. It's ugly on purpose — every byte matters at 10.7 KB.

The DOM structure is minimal and fixed: root → live region + viewport → content → items container. Items are absolutely positioned with transforms, which means repositioning an item is a single style mutation with zero layout reflow.

For a senior developer: think of it as a microkernel. The core is the kernel — scheduling renders, managing the element pool, handling scroll events. Features are drivers that can replace kernel subsystems. The result is that the "full" library with all features is ~46 KB minified, but a consumer using just the base pays 28 KB minified / 10.8 KB gzipped.

## 3. Comparison

The virtual list space has several established libraries. Here's how vlist differs architecturally:

**TanStack Virtual** is headless — it gives you measurements and you handle the DOM yourself. This is flexible but shifts complexity to the consumer. vlist is opinionated: it owns the DOM, the element pool, the scroll handler, and the ARIA attributes. You get a working accessible list out of `vlist(config).build()` with no additional code. TanStack requires you to implement element recycling, keyboard navigation, and ARIA yourself.

**react-virtuoso** is React-only and relatively heavy. It handles variable sizes well through its auto-measurement approach, but it creates and destroys DOM nodes on scroll rather than recycling them. vlist's element pool means the DOM node count stays constant regardless of scroll position or velocity.

**virtua** is lightweight and supports multiple frameworks, which is the closest philosophical match. But it doesn't provide built-in accessibility, selection, or complex layouts (masonry, table, groups). vlist's feature system means you can match virtua's minimal footprint when you only need basic virtualization, then add capabilities without switching libraries.

**vue-virtual-scroller** is Vue-specific at 11.8 KB. vlist's Vue adapter is 0.6 KB on top of a 10.7 KB framework-agnostic core — comparable total size but usable across frameworks.

Where vlist is genuinely unique: no other library I've seen combines scroll compression (1M+ items), masonry layout with lane-aware keyboard navigation, data tables with column resize/sort, drag-and-drop reordering, async group discovery with sticky headers, and full WAI-ARIA compliance in a single tree-shakeable package. These features typically require assembling 3-4 different libraries.

Where it falls short relative to the ecosystem: it's new (first commit February 2026) with limited community adoption so far. TanStack Virtual and react-virtuoso have years of production battle-testing across thousands of applications. vlist's test suite is thorough (3,370 tests, 61 test files) but JSDOM-based — there are no real browser rendering tests, which means layout edge cases in Safari or Firefox could surface in production.

## 4. Accessibility

The accessibility implementation is comprehensive and, unusually, built into the core rather than added as a feature.

The baseline (`src/builder/a11y.ts`) implements the WAI-ARIA listbox pattern: arrow keys move focus with `aria-activedescendant`, Home/End jump to boundaries, PageUp/PageDown navigate by viewport height, Space/Enter toggle selection. Focus is tracked with `:focus-visible` detection — mouse clicks don't show the focus ring unless `focusOnClick: true` is set.

Group headers are skipped during keyboard navigation via `skipHdr()`, which scans forward or backward past headers. They receive `role="presentation"` instead of `role="option"`, preventing screen readers from announcing them as selectable items. `aria-setsize` and `aria-posinset` report data-space values excluding headers — a grouped list of 229 contacts with 26 letter headers correctly announces "item 5 of 229" rather than "item 5 of 255."

The DOM reordering mechanism (`src/rendering/sort.ts`) is the most technically interesting part. Since items are absolutely positioned with transforms, their visual order is independent of DOM order. But screen readers traverse DOM order. On scroll idle, `sortRenderedDOM()` reorders the DOM children to match visual order using a minimal-move algorithm that only calls `insertBefore` on out-of-position elements, preserving hover state and CSS transitions on elements that are already correctly placed.

The sticky header container is marked `aria-hidden="true"` since it's a visual duplicate of the real header in the items container.

`withSelection` adds multi-select keyboard patterns: Shift+Arrow for range selection (configurable origin vs. destination model following the ARIA APG spec), Ctrl+A, Ctrl+Shift+Home/End for range-to-boundary, and a separate `aria-live` region for selection count announcements.

In grid and masonry layouts, 2D keyboard navigation works out of the box — Up/Down move by row, Left/Right move by cell. Masonry navigation is lane-aware, staying in the same visual column.

Most virtual list libraries either ignore accessibility entirely or provide partial support that requires significant consumer effort. vlist's approach — accessible by default with zero configuration — is the right design choice. The only gap I see is that JSDOM testing can't fully validate screen reader behavior; real-browser accessibility testing (e.g., with axe-core in Playwright) would strengthen confidence.

## 5. Development process

702 commits in 102 days (February 2 to May 12, 2026). That's roughly 7 commits per day sustained over 3.5 months.

The git history reveals a disciplined trajectory:

The project started with scroll compression — not basic list rendering. The first feature commits after the initial scaffold were `feat(compression): add support for 1M+ items` and `feat(scrollbar): add custom scrollbar for compressed mode`. This is unusual. Most virtual list libraries start with the simple case and bolt on scale handling later (or never). Starting with the hardest mathematical problem first suggests the library was conceived specifically to solve extreme-scale rendering.

Very early (commits 4-5), the architecture was restructured: `refactor: restructure to domain-driven architecture` and `refactor: extract context, handlers, and methods`. The builder pattern and feature system were established before most features existed. This upfront investment paid off — every subsequent feature followed the same integration pattern, and no architectural rewrites appear in the history.

Features were added in a logical progression: core virtualization → variable heights → smooth scrolling → grid → groups → reverse mode → framework adapters. The adapters came after the core was stable, ensuring all frameworks inherited the same battle-tested implementation.

The commit type distribution tells a story: 32% fixes (227 commits), 16% features (112 commits), 6% performance (45 commits). The high fix ratio isn't a quality problem — it reflects a development style of shipping features fast, then immediately stress-testing and fixing edge cases. The recent history (post April 15) is dominated by fix and perf commits, indicating the library has entered a maturation phase.

The most recent optimization campaign (v1.7.8) systematically reduced every feature bundle: base from 11.2 to 10.7 KB, async -0.5 KB, groups -0.4 KB, selection -0.2 KB, and 0.1 KB reductions across scale, grid, masonry, table, scrollbar, sortable, and page.

## 6. What would you improve?

**Type safety across feature boundaries.** The `ctx.methods` Map uses `string` keys and `Function` values. When `withSelection` calls `ctx.methods.get("_getNavDelta")`, there's no compile-time check that `withGrid` registered it, or that the signature matches. A typed registry (generic on feature name → function signature) would catch integration bugs at build time.

**Real browser tests.** The entire test suite runs in JSDOM. Layout-dependent behavior (scroll position, `ResizeObserver`, `clientHeight`) is mocked. A small Playwright or WebDriver suite covering the critical paths — scroll rendering, keyboard navigation, touch gestures — would catch browser-specific issues that JSDOM can't surface.

**Individual feature entry points.** Currently all features are exported from a single `dist/index.js`. Tree-shaking works, but some bundlers handle it imperfectly. Adding `exports` entries like `vlist/grid`, `vlist/selection` in `package.json` would guarantee per-feature code splitting regardless of bundler quality.

**Documentation.** The code is well-structured but sparsely commented. The inter-feature communication conventions (which method names to register, what signatures to expect) exist only as implementation knowledge. A brief architecture guide would lower the contribution barrier.

## 7. Recommendation

Yes. For any project rendering more than a few hundred items in a scrollable container — especially if it needs grid layout, grouping, selection, or accessibility compliance — vlist is the strongest option available today.

The specific cases where it excels:

- **Enterprise applications** requiring WCAG compliance. The built-in ARIA support, keyboard navigation, and screen reader DOM ordering eliminate an entire category of accessibility work.
- **Large datasets** (100K to 1M+ items). The scroll compression, constant memory footprint, and zero-allocation scroll path handle scale that crashes most competitors.
- **Complex layouts** — data tables with sortable/resizable columns, masonry galleries, grouped lists with sticky headers. These typically require 3-4 separate libraries; vlist provides all of them with consistent behavior and a single API.
- **Multi-framework teams.** The vanilla core with thin adapters means the same virtual list works in React, Vue, Svelte, Solid, and plain JS without behavior differences.

The main caveat is maturity. At 3.5 months old with limited production adoption, there will be edge cases that only surface under real-world usage patterns. The test suite is strong (3,370 tests) but JSDOM-only. I'd recommend it with the understanding that you may encounter and need to report browser-specific issues — and that the development velocity suggests they'll be fixed quickly.
