---
created: 2026-05-09
status: in-progress
branch: fix/drift-after-reload
---

# Issue: Snapshot scroll drift on reload with async groups

> After saving a snapshot on a grouped async list and reloading, the scroll
> position drifts — the selected item is no longer visible. Affects both
> small lists (26 items, ~64px drift) and large compressed lists (1.1M items,
> ~7px drift in compressed space).

**Status:** In progress (branch `fix/drift-after-reload`)
**Priority:** High
**Affects:** `vlist/src/features/snapshots/feature.ts`, `vlist/src/features/groups/feature.ts`
**Features involved:** `withAsync` + `withGroups` + `withSnapshots` + (optionally) `withScale`

---

## The Problem

When scrolled to the middle of a grouped async list, saving a snapshot and
reloading causes the viewport to drift. The item that was visible before
reload is shifted out of view.

### Small list example (26 data items, 18 group headers = 44 layout items)

```
SAVE:    scrollTop=2102  dataIndex=16  total=44  contentSize=3144
RESTORE: scrollTop=1668  dataIndex=16  total=26  contentSize=2600  (clamped to 1558)
GROUPS:  scrollTop=2038  dataIndex=15  total=44  contentSize=3144
RESULT:  64px drift (2102 → 2038), wrong data item (16 → 15)
```

### Large compressed list (1.1M data items + 3 group headers)

```
SAVE:    scrollTop=8403010  dataIndex=580162  total=1104678  virtualSize=16000000
RESTORE: scrollTop=8403003  dataIndex=580162  total=1104677  virtualSize=16000000
RESULT:  ~7px drift in compressed space
```

---

## Workflow: What happens on save → reload → restore

### 1. Snapshot Save (before reload)

The snapshot feature captures the current scroll state:

```
snapshot = {
  scrollTop:   2102,       // raw scrollTop value
  index:       32,         // layout index (includes group headers)
  dataIndex:   16,         // data-space index (excludes headers)
  total:       44,         // layout total (data + headers)
  dataTotal:   26,         // data total
  offsetRatio: 0.6875,     // fraction within the item (0-1)
}
```

Stored to `sessionStorage` via auto-save.

### 2. Page Reload

The app rebuilds the vlist. The `withAsync` config receives the snapshot
total so it can bootstrap without waiting for the first API response:

```ts
withAsync({
  adapter,
  autoLoad: !snapshot,
  total: snapshot?.total,     // seeds the data manager
})
```

### 3. Snapshot Restore (microtask after build)

Restore runs via `queueMicrotask` — before the browser paints, before any
data has loaded. At this point:

```
bridge.totalEntries = 0        // no items loaded into the bridge yet
bridge.groupCount   = 0        // no groups discovered
virtualTotalFn()    = 26       // falls back to asyncDataManager.getTotal()
sizeCache total     = 26       // rebuilt with data total
contentSize         = 2600     // 26 items × 100px
maxScroll           = 1558     // 2600 - 1042 (container)
```

**The scroll space is data-only (26 items, 2600px).** The saved position
(2102px in a 3144px space) can't be represented — it maps to data index 16
at offset 1668.75, which exceeds maxScroll (1558). The browser clamps it.

```
resolvedIndex  = dataToLayout(16) = 16    // identity — no groups in bridge
safeIndex      = min(16, 25) = 16         // OK
scrollPosition = offset(16) + 0.6875×100 = 1668.75
                → clamped to maxScroll    = 1558
```

**Key:** the restore is working in a scroll space that doesn't include
group headers. The content is too short to hold the correct position.

### 4. Async onStateChange

The async data manager fires `onStateChange` when the API returns the total.
This rebuilds the sizeCache and updates content size. If the total hasn't
changed (still 26), this is a no-op. But it may trigger a SNAP SAVE on the
scroll event — capturing the clamped position.

### 5. Async onItemsLoaded → Groups callback

When the first page of data loads at the viewport position, `onItemsLoaded`
fires. The groups callback in order:

1. **Captures current position** — reads `scrollTop=1558`, computes
   `dataIndex=15` (not 16, because clamped scroll put us at item 15)
2. **Processes items** — `bridge.onItemsLoaded()` discovers 18 group
   boundaries → 18 headers
3. **Rebuilds sizeCache** — now 44 entries (26 data + 18 headers)
4. **Updates content size** — now 3144px (data×100 + headers×headerHeight)
5. **Adjusts scroll** — maps dataIndex=15 to layout index 31, computes
   new scroll = 2038

Result: `2038` instead of `2102` — the drift is 64px, roughly one item.

### 6. SNAP SAVE (auto-save on scroll event)

The scroll adjustment from step 5 triggers a scroll event → auto-save
captures `scrollTop=2038` → overwrites the original snapshot. On the next
reload, the drift compounds.

---

## Root Cause

**The restore scroll space doesn't match the save scroll space.**

At save time, the layout has N data items + M group headers = N+M total,
with a content size that accounts for both data items and (shorter) headers.

At restore time, no groups are discovered yet. The layout has only N data
items, with a smaller content size. Positions near the bottom of the list
exceed `maxScroll` and get clamped by the browser.

When groups are later discovered, the groups callback adjusts scroll based
on the *clamped* position — which corresponds to a different data item than
the original. The adjustment is precise for the wrong starting point.

```
Save space:     [0 ──────────── 2102 ────────── 3144]  (44 items)
Restore space:  [0 ─────── 1558]                        (26 items, maxScroll)
                              ↑ clamped
Groups adjust:  [0 ──────────── 2038 ────────── 3144]  (44 items)
                              ↑ based on clamped position, not original
```

For large compressed lists (ratio < 1), the problem is milder because
`virtualSize` is capped at 16M regardless of header count. The scrollTop
shortcut (using saved `scrollTop` directly when `dataTotal` matches) solves
this case. But for non-compressed lists (ratio = 1), the scroll space size
changes with total count and the shortcut doesn't apply.

---

## Partial Fixes Applied (commit 7e36b0c)

These fixes are on `fix/drift-after-reload` and solve the catastrophic
cases but not the residual drift:

1. **groups: `totalEntriesBefore` fallback** — was `bridge.totalEntries`
   (0 before first load), now `bridge.totalEntries || total`. Prevented
   compressed-space math from computing `scrollRatio × 0 = 0`.

2. **groups: compressed-space scroll adjustment** — added `ratio !== 1`
   path using `(layoutIndex / totalEntries) × virtualSize` instead of
   pixel-space `sizeCache.getOffset()`.

3. **snapshots: dataIndex on headers** — when scroll is on a group header
   (`layoutToData(index) = -1`), scans forward to find the first data item.
   Previously saved `dataIndex: undefined`.

4. **snapshots: dataTotal match for scrollTop shortcut** — uses `dataTotal`
   (stable, excludes headers) instead of `total` (includes headers) for the
   compressed scrollTop shortcut. Fixes large list case.

5. **grid: __group_header_ ID check** — leftover `dataset.id.startsWith`
   replaced with `classList.contains(groupHeaderClass)`.

---

## What Still Needs Fixing

The residual drift on non-compressed lists (ratio = 1): at restore time,
the content is too short to represent the saved scroll position. The clamp
causes the groups callback to anchor on the wrong data item.

### Possible approaches

**A. Bootstrap with snapshot.total instead of dataTotal**

At restore time, use `snapshot.total` (44) as the sizeCache count. The
content would be 44×100=4400px — large enough to avoid clamping. When
groups discover 18 headers (shorter than data items), the content shrinks
to 3144 and the groups callback adjusts from the correct starting point.

Trade-off: content is temporarily over-sized (4400 vs 3144) because all
items are treated as data-item-height. The groups adjustment must handle
the content size change.

**B. Proportional restore**

Compute the scroll ratio from the save space (`2102/3144 = 0.6686`) and
apply it to the restore space (`0.6686 × 2600 = 1738`). Still clamped
to 1558 for positions near the bottom.

**C. Defer restore until after groups discovery**

Don't set scrollTop during the microtask. Wait until the first
`onItemsLoaded` provides groups, then restore with the correct layout.

Trade-off: visible flash at position 0 before jumping to saved position.

**D. Save scroll ratio instead of scrollTop for grouped lists**

Store `scrollTop / contentSize` as a ratio. At restore time, apply ratio
to whatever content size exists. Groups callback still adjusts.

Trade-off: needs ratio-aware restore path; doesn't solve the data-index
precision problem.
