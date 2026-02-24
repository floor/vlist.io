# Horizontal Grid Aspect Ratio

> **Status:** Open  
> **Affects:** `examples/grid/photo-album` (all variants), `src/features/grid/renderer.ts`  
> **Scope:** vlist source fix required — example scripts follow after

---

## Observed Behaviour

In `withGrid()` horizontal mode, photos render as **portrait** (taller than wide) instead of landscape 4:3. This occurs regardless of the `item.width` value passed in the config.

Screenshots from investigation:

| Mode | Columns | Info bar | Visual |
|------|---------|----------|--------|
| Vertical | 4 | `192×144px` | ✅ Landscape 4:3 |
| Horizontal | 4 | `152×192px` | ❌ Portrait (3:4) |
| Horizontal | 6 | `102×125px` | ❌ Portrait (3:4) |

---

## Root Cause

### The axis-swap problem

In `src/features/grid/renderer.ts`, the `applySizeStyles` function always sets:

```typescript
element.style.width  = `${colWidth}px`;   // cross-axis cell size
element.style.height = `${itemHeight}px`; // main-axis size (= item.width - gap)
```

The positioning axis-swap for horizontal mode lives **only in the transform**:

```typescript
// Vertical
element.style.transform = `translate(${x}px, ${y}px)`;

// Horizontal — axes are swapped here
element.style.transform = `translate(${y}px, ${x}px)`;
```

The transform correctly repositions items, but **the CSS `width` and `height` properties are not swapped**. In CSS, `width` always means horizontal extent and `height` always means vertical extent. So in horizontal mode:

| Property | CSS meaning | Actual role |
|----------|-------------|-------------|
| `element.style.width = colWidth` | horizontal extent | **vertical** (cross-axis) |
| `element.style.height = item.width - gap` | vertical extent | **horizontal** (scroll direction) |

The CSS dimensions are **visually inverted** relative to their names.

### What this means for the aspect ratio formula

For a 4:3 landscape photo the goal is:

```
horizontal_extent / vertical_extent = 4/3
```

In **vertical** mode this maps correctly to CSS:

```
element.style.width  = colWidth              ← horizontal extent ✓
element.style.height = item.height - gap     ← vertical extent   ✓

For 4:3:  colWidth / (item.height - gap) = 4/3
          item.height ≈ colWidth × 0.75        (current formula — correct)
```

In **horizontal** mode CSS is inverted:

```
element.style.width  = colWidth              ← vertical extent   ✗
element.style.height = item.width - gap      ← horizontal extent ✗

For 4:3:  (item.width - gap) / colWidth = 4/3
          item.width = colWidth × (4/3) + gap  ← required (not colWidth × 0.75 + gap)
```

### Why the attempted fix made things worse

The first attempted fix used `container.clientHeight` to compute `itemHeight`, then derived `item.width = itemHeight × (4/3)`. This was wrong on two counts:

1. `container.clientHeight` is unreliable at the time of measurement — the `vlist--horizontal` CSS class (which sets `height: 300px`) has not yet been applied, so it reads the vertical-mode height (600px) on first switch and the correct 300px on subsequent recreations.

2. Even with a correct height, the formula was trying to match cross-axis size to a container-height-derived value rather than the `colWidth` that `getColumnWidth(containerWidth)` actually produces.

The second attempted fix used `item.width = colWidth × 0.75 + gap`, which gives:

```
element.style.height = item.width - gap = colWidth × 0.75   ← horizontal extent
element.style.width  = colWidth                              ← vertical extent

Ratio: colWidth × 0.75 / colWidth = 0.75 = 3:4  ← still portrait!
```

The ratio is 3:4 (portrait) not 4:3 (landscape) because the formula is correct in the wrong direction.

---

## The Fix

### Step 1 — Fix vlist source (`src/features/grid/renderer.ts`)

In `applySizeStyles`, swap `style.width` and `style.height` when `isHorizontal`:

```typescript
const applySizeStyles = (element: HTMLElement, itemIndex: number): void => {
  const isHeader = element.dataset.id?.startsWith("__group_header");

  const colWidth = isHeader
    ? containerWidth
    : gridLayout.getColumnWidth(containerWidth);

  let itemHeight: number;
  if (groupsActive || isHeader) {
    itemHeight = sizeCache.getSize(itemIndex) - gridLayout.gap;
  } else {
    const row = gridLayout.getRow(itemIndex);
    itemHeight = sizeCache.getSize(row) - gridLayout.gap;
  }

  if (isHorizontal) {
    // In horizontal mode, swap CSS dimensions so they match their visual role:
    //   style.width  → horizontal extent (scroll direction = main axis)
    //   style.height → vertical extent   (cross axis)
    element.style.width  = `${itemHeight}px`;   // main-axis (was height)
    element.style.height = `${colWidth}px`;     // cross-axis (was width)
  } else {
    element.style.width  = `${colWidth}px`;
    element.style.height = `${itemHeight}px`;
  }
};
```

After this change, CSS dimensions match their visual meaning in both orientations.

### Step 2 — Update the example formula (`examples/grid/photo-album`)

With the source fix in place, the formula in all four variants becomes:

```javascript
const innerWidth = container.clientWidth - 2;
const colWidth = (innerWidth - (columns - 1) * gap) / columns;

let height, width;
if (orientation === 'horizontal') {
  // After the src fix: CSS width = horizontal extent = item.width - gap
  //                   CSS height = vertical extent   = colWidth
  // For 4:3 landscape: (item.width - gap) / colWidth = 4/3
  //   → item.width = colWidth * (4/3) + gap
  width  = Math.round(colWidth * (4 / 3) + gap);
  height = Math.round(colWidth);  // cross-axis (vertical extent)
} else {
  // Vertical (unchanged): CSS width = colWidth, CSS height = item.height - gap
  // For 4:3: item.height ≈ colWidth * 0.75
  width  = Math.round(colWidth);
  height = Math.round(colWidth * 0.75);
}
```

And the info display for the item dimensions should show visual W×H:

```javascript
// Horizontal: visual W = item.width - gap, visual H = colWidth
// Vertical:   visual W = colWidth,         visual H = item.height - gap (≈ colWidth*0.75-gap)
const displayW = orientation === 'horizontal' ? width - gap : width;
const displayH = orientation === 'horizontal' ? height : Math.max(0, height - gap);
```

### Step 3 — Add a test

In `test/features/grid/renderer.test.ts`, add a case asserting that in horizontal mode `element.style.width < element.style.height` for a landscape 4:3 config (i.e., horizontal extent < vertical extent is never the case for landscape — the test should confirm `width > height` after the fix).

---

## Verification

With `columns: 4`, `gap: 8`, container `~794px` wide:

```
colWidth = (794 - 2 - 24) / 4 = 192px

Vertical:
  item.height = 192 × 0.75 = 144px
  CSS width  = 192px  (horizontal) ✓
  CSS height = 136px  (vertical)   ✓
  Ratio 192/136 ≈ 1.41 ≈ 4:3 ✓

Horizontal (after fix):
  item.width = 192 × (4/3) + 8 = 264px
  CSS width  = 256px  (horizontal = item.width - gap) ✓
  CSS height = 192px  (vertical   = colWidth)         ✓
  Ratio 256/192 = 1.333... = 4:3 ✓
```

---

## Affected Files

| File | Change |
|------|--------|
| `src/features/grid/renderer.ts` | Swap `style.width`/`style.height` in `applySizeStyles` when `isHorizontal` |
| `test/features/grid/renderer.test.ts` | Add horizontal landscape ratio assertion |
| `examples/grid/photo-album/javascript/script.js` | Update formula + info display |
| `examples/grid/photo-album/react/script.tsx` | Update formula + info display |
| `examples/grid/photo-album/vue/script.js` | Update formula + info display |
| `examples/grid/photo-album/svelte/script.js` | Update formula + info display |

---

## Notes

- The `isHorizontal` flag is already threaded through to `applySizeStyles` as a parameter — no interface changes needed.
- Changing `style.width`/`style.height` also fixes the CSS `object-fit: cover` behaviour on the `<img>` inside each card: the image will now correctly fill a landscape rectangle rather than a portrait one.
- This is the only place in the renderer that sets element dimensions — no other code path needs updating for basic grid items. Group headers may need review (`isHeader` path uses full `containerWidth` which in horizontal mode would also be wrong).

---

*Opened after investigation in photo-album example — orientation toggle added in 0.9.6 cycle.*