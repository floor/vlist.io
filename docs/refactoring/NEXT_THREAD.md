# Continue: @floor/vlist documentation refactoring

## Context

Read `vlist.dev/docs/refactoring/documentation.md` — it's the audit log tracking all work across 7 completed phases. The 11 principles at the bottom govern all decisions. Docs live in `vlist.dev/docs/`, source in `vlist/`, adapter source in `vlist-react/`, `vlist-vue/`, `vlist-svelte/`, `vlist-solidjs/`.

## Status

Phases 1–7 are complete.

### Phase 7 summary (latest)

1. **VListConfig type gap — fixed.** Added `VListConfig<T>` in `vlist/src/builder/types.ts` extending `BuilderConfig` with adapter convenience fields (`adapter`, `loading`, `layout`, `grid`, `groups`, `selection`, `scrollbar`, `scroll.scrollbar`). Exported from core. All 4 adapters compile clean. 2268 tests pass.

2. **Adapter README sync — done.** All 4 adapter READMEs rewritten to concise format: intro, install, quick start, API bullets, link to `frameworks.md#<framework>`. Fixed import order (SolidJS), added missing `@floor/vlist/styles` imports.

3. **Tutorials audit — done.** All 7 referenced tutorials exist. Fixed 3 stale `VListConfig` → `BuilderConfig` references in `chat-interface.md` and `optimization.md`.

4. **Examples cross-links — done.** Fixed 7 broken links in `grid.md` and `masonry.md` (pointed to non-existent examples). Added Live Examples sections to `async.md`, `scale.md`, `sections.md`, `selection.md`, `scrollbar.md`.

## Open items

No critical items remain. Potential future work:

- **New examples** — `grid.md` and `masonry.md` have fewer live examples than other features. Creating more examples (e-commerce grid, Pinterest gallery, etc.) would fill those gaps.
- **Adapter tests** — The 4 adapter packages have no test suites. Adding basic integration tests would catch regressions like the VListConfig type gap earlier.
- **Tutorial expansion** — No tutorial for `grid`, `masonry`, `sections`, or `selection` features yet. These are documented in `features/*.md` but lack step-by-step tutorial-style walkthroughs.