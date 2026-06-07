# RFC-012 — Compression / Scale Removal Refactor

Status: **Phase 3b done — Phase 4 pending** · Branches: `vlist@logical-scroll-model`, `vlist.io@refactor/logical-scroll`

This document tracks the multi-phase removal of the scroll-compression
("scale") subsystem from vlist, now that the **bounded logical scroll model**
(RFC-012) supersedes it. It records what was removed, the bundle-size impact,
and the open decision for the remaining legacy cleanup (Phase 3b).

---

## 1. Background

Before RFC-012, vlist handled very large lists (1M+ items) by **compressing**
the scroll space: the `vlist-content` element was sized to `totalItems ×
itemSize`, and once that exceeded the browser's ~16.7M-pixel element limit, the
**`scale` plugin** mapped the compressed native scrollbar position back to a
"virtual" position via ratio math.

RFC-012 replaces this with a **bounded logical scroll model** (opt-in via
`scroll: { mode: "bounded" }`):

- The content element is sized to a small, viewport-relative runway
  (`viewport × runwayFactor`, capped at the virtual total), never the full
  `totalItems × itemSize`.
- `state.scrollPosition` is an **absolute logical pixel position**
  (`baseOffset + scrollTop`), silently rebased near the runway edges.
- The wheel/trackpad path is fully synthetic in logical space.
- Constants: `BOUNDED_RUNWAY_FACTOR = 2`, `BOUNDED_RUNWAY_MIN = 1.5`.

Because the logical-scroll abstraction lives in core and is designed with the
future RFC-013 (spatial / N-dimensional navigation) trajectory in mind,
**scroll position is deliberately NOT hard-wired to native `scrollTop`.**

Result: compression is no longer needed. The `scale` plugin and every
compression code path can be removed.

---

## 2. Phase map

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Rebase feasibility prototype | ✅ done |
| 1 | Logical scroll model in core | ✅ done |
| 2 | Boundary cases (scrollbar, page mode, leaked plugins) | ✅ done |
| 3 | Remove compression — **live engine path** | ✅ done & committed |
| 3b | Remove compression — **legacy / internals** | ✅ done (Option B — dead domain deleted) |
| 4 | Simplify carousel (no virtual inflation) | ⏳ pending |

---

## 3. Phase 3 — live-path compression removal (DONE)

Committed in `vlist` as `refactor(core): remove scale plugin and compression
path (RFC-012)` (commit `5a90a36`).

### Removed
- **`src/plugins/scale/`** — the entire plugin (`index.ts`, `plugin.ts`) plus
  `test/plugins/scale/` and the 4 scale integration tests
  (`grid-scale`, `table-scale`, `scale-scrollbar`, `scale-selection`).
- **Public export** `scale` / `ScalePluginConfig` from `src/index.ts`.
- **Build entries** for `scale` in `build.ts` (wrapper export + `ALL_PLUGINS`).
- **Core `EngineState`** fields `isCompressed` / `compressionRatio`
  (`src/core/state.ts`).
- **Wheel-handler** compression guard (`src/core/scroll.ts`).
- **Dead compression branches** in the `snapshots`, `scrollbar`, and `groups`
  plugins; `getCompressionRatio` param dropped from `groups/sticky.ts`.

### Why it was safe
Consumer plugins read compression via `ctx.getMethod("_scale:getCompression")`,
which returns `null`/`undefined` when the scale plugin is absent — they already
fell back to the non-compressed path. With the plugin gone, every compression
branch became dead code, so removal is a **zero behavior change**.

### Verification
- `bun run typecheck` clean
- `bun test` → 3759 pass / 0 fail
- `bun run build` succeeds
- bounded-list Chrome harness PASS

### vlist.io examples (committed as `0203321`)
All examples that used `scale()` / the `compression` adapter plugin were
migrated to `scroll: { mode: "bounded" }`:
`books`, `large-list` (vanilla / vue / svelte), `track-list`,
`velocity-loading`. A dedicated `bounded-list` example + debug harness was
added, RFC-012 was rewritten as the *Logical Scroll Model*, and stale `scale`
references were purged from `examples/navigation.json`.

---

## 4. Bundle-size impact

The bounded logical-scroll code lives in **core**, so it ships in every build.

| Audience | Before (8.1 KB base + scale plugin) | After (9.4 KB base, bounded in core) | Delta |
|----------|-------------------------------------|--------------------------------------|-------|
| Large-list users (needed scale) | 8.1 + 4.2 = **12.3 KB** | **9.4 KB** | **−2.9 KB** |
| Native-only users | **8.1 KB** | **9.4 KB** | **+1.1 KB** |

Breakdown of the +1.3 KB base growth (measured, gzipped + minified):
- `src/core/bounded-scroll.ts` → **~1.1 KB** — bounded-only, but statically
  imported by `create.ts` and gated on the runtime flag
  `scroll.mode === "bounded"`, so a bundler **cannot** tree-shake it out.
- `src/core/scroll-model.ts` → **~0.4 KB** — the logical-scroll adapter; runs on
  the **native path too** (RFC-013 trajectory), so it is a legitimate shared
  base cost.

### Decision: keep bounded in core (option B from the size discussion)
The old `scale()` plugin was **+4.2 KB opt-in**. Bounded replaces it at
**+1.1 KB in core**. Net the library shrank for the users who need large lists,
the API got simpler (a config string instead of an extra plugin import), and
native-only users pay a modest +1.1 KB. Making bounded a tree-shakeable opt-in
again (reversing the RFC-012 "in core" decision) was rejected.

### Docs updated to match
- `README.md` and `npm-readme.md`: base `8.1 → 9.4 KB` (tagline, badge, table),
  removed the `scale()` row, refreshed every plugin delta against
  `bun run size`, added the `carousel()` row (full README), and removed stale
  `scale` mentions (changelog blurb, feature list, config snippet).
- `scripts/size.ts`: removed all `scale` references (ALL_PLUGINS, KNOWN_DEPS,
  markers, scenario).

Current sizes (`bun run size`, gzipped):

```
Base (createVList)   9.4 KB
a11y                +1.1   selection +2.7   data      +4.8   scrollbar +2.0
sortable            +2.9   groups    +5.3   page      +0.8   snapshots +1.1
transition          +1.8   autosize  +0.8   grid      +2.4   table     +5.9
masonry             +3.9   tree      +5.0   search    +3.2   carousel  +2.6
```

> Note: `MAX_VIRTUAL_SIZE` (16M px) is **still live** — used by the
> `create.ts` size-warning and `utils/stats.ts` cap. It stays. Only its stale
> "Use the scale() plugin" warning message needs updating.

---

## 5. Phase 3b — legacy / internals compression cleanup (PENDING DECISION)

### Live vs. dead map

`src/rendering/` is a v1 "rendering domain" that the live engine
(`src/core/`) has largely superseded. Importer analysis:

| Module | Used by live engine? | Notes |
|--------|----------------------|-------|
| `rendering/sizes.ts` | ✅ yes | `SizeCache` — core, scroll-model, grid/table/groups |
| `rendering/sort.ts` | ✅ yes | `sortRenderedDOM` — grid & masonry renderers |
| `rendering/measured.ts` | ❌ internals-only | re-exported via `rendering/index` only |
| `rendering/renderer.ts` | ❌ internals-only | v1 monolithic renderer; compression woven through |
| `rendering/viewport.ts` | ❌ internals-only | **defines `CompressionState`** + compression helpers |
| `rendering/scale.ts` | ❌ internals-only | pure compression math |
| `rendering/scroll.ts` | ❌ internals-only | `scrollToFocus` compression branch |
| `rendering/index.ts` | ❌ internals-only | re-exported by `internals.ts` only |
| `scrollbar/controller.ts` | ❌ internals-only | ~750-line scroll controller (compressed/native/window modes) |

The compression-bearing legacy modules are reachable **only** through
`src/internals.ts` (and `scrollbar/index.ts` for the controller) — never by the
runtime engine. **Tree-shaking already excludes them from the main bundle**, so
removing compression here has ~zero size/behavior impact. The value is pure
code hygiene: purging the "compression" / "scale" concept entirely.

### Done in Phase 3b so far (live renderers)
- `src/plugins/table/renderer.ts` (live, used by `table/plugin.ts`) and
  `src/plugins/grid/renderer.ts` (internals-only) were de-compressed:
  - removed the `compressionCtx?: CompressionContext` param from
    `render` / `renderRow` / `renderGroupHeaderRow` / `calculateRowOffset` /
    `buildTransform`,
  - removed the `updatePositions(compressionCtx)` method (it was only ever
    called by the now-deleted scale plugin),
  - offsets now come straight from `sizeCache.getOffset(...)`,
  - dropped imports of `CompressionContext` and `calculateCompressedItemPosition`.

### Remaining files (compression still present)
Source:
- `rendering/scale.ts` — delete (pure compression).
- `rendering/renderer.ts` — `CompressionContext`, `CompressedPositionFn`,
  `CompressionStateFn`, `getCompression`, `calculateOffset` compression branch,
  `updatePositions`, compression in `render`.
- `rendering/viewport.ts` — `CompressionState`, `NO_COMPRESSION`,
  `getSimpleCompressionState`, `calculateActualSize`, `calculateCompressed*`.
- `rendering/scroll.ts` — `scrollToFocus` compression branch + `CompressionState`
  import (`scrollToFocusSimple` is compression-free and stays).
- `rendering/index.ts` — drop the `scale` export block and the compression
  exports from the `renderer` / `viewport` / `scroll` blocks.
- `internals.ts` — drop the scale re-export block (`getScaleState`, `getScale`,
  `needsScaling`, … `ScaleState`) and any removed renderer exports.
- `scrollbar/controller.ts` — remove `CompressionState` import,
  `enableCompression` / `disableCompression` / `isCompressed`, and the
  `compressed` scroll branch (keep native + window scroll).
- `src/types.ts` — remove `isCompressed` / `compressionRatio` from
  `ViewportState` and `ErrorViewportSnapshot`; fix the `'native'` scrollbar
  comment.
- `src/core/types.ts` — fix the "the scale plugin's compression" comment.
- `src/core/create.ts` — update the `MAX_VIRTUAL_SIZE` warning message (drop
  "Use the scale() plugin", point at bounded mode).

Tests:
- Delete: `test/rendering/scale.test.ts`,
  `test/rendering/scroll-compressed.test.ts`,
  `test/plugins/tree/compression.test.ts`.
- Update: `test/rendering/viewport.test.ts`,
  `test/plugins/table/renderer.test.ts`,
  `test/plugins/grid/renderer.test.ts`
  (remove `updatePositions` / `compressionCtx` cases).

### Decision: Option B — delete the dead legacy domain (DONE)

| Option | What | Trade-off |
|--------|------|-----------|
| **A. Hygiene strip** | Surgically remove compression from each legacy module + update tests | Matches the literal task scope, but high churn on dead code |
| **B. Delete the dead legacy domain** ✅ | Drop `rendering/{renderer,viewport,scale,scroll,measured}` and `scrollbar/controller.ts` wholesale, plus their `internals.ts` exports | Cleanest — `src/core/` already supersedes them — but removes internals API surface (`createRenderer`, `createViewportState`, `createScrollController`, …) |
| **C. Stop** | Keep the live-path win, leave dormant legacy as-is | Zero further churn/risk; "scale"/"compression" lingers in dead code |

**Chosen: B.** These modules were genuinely dead (not on the runtime path,
superseded by `src/core/`), so deleting them removed the compression concept
*and* a chunk of unused legacy in one move.

### What was done

- **Deleted** `src/rendering/{renderer,viewport,scale,scroll,measured}.ts` and
  `src/plugins/scrollbar/controller.ts` (all internals-only, tree-shaken out of
  the main bundle).
- **Trimmed** `src/rendering/index.ts` to just `sizes` + `sort` (the live modules).
- **Updated** `src/internals.ts` (dropped the scale re-export block, the viewport
  range helpers, `createMeasuredSizeCache`, and the scroll-controller exports —
  documented in the changelog) and `src/plugins/scrollbar/index.ts` (dropped the
  controller re-exports).
- **Types:** removed `isCompressed` / `compressionRatio` / `actualSize` from
  `ViewportState` and `isCompressed` from `ErrorViewportSnapshot`; fixed the
  `'native'` scrollbar and `core/types.ts` "scale plugin's compression" comments.
- **`create.ts`:** `MAX_VIRTUAL_SIZE` warning now points at bounded mode instead
  of `scale()`.
- **Tests:** deleted `test/rendering/{renderer,viewport,scale,scroll-compressed,
  measured}.test.ts`, `test/plugins/scrollbar/controller.test.ts`,
  `test/plugins/tree/compression.test.ts`; de-compressed the grid/table renderer
  tests; updated the `size-overflow` assertion (`scale()` → `bounded`).

### Verification

- `bun run typecheck` clean · `bun test` → **3326 pass / 0 fail** · `bun run build`
  succeeds (base still **9.4 KB** gzipped).

---

## 6. Follow-up

- Phase 4: simplify the carousel plugin to drop virtual inflation now that
  bounded mode exists.
