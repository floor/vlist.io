---
v1_file: test/rendering/snapshots.test.ts
v2_equivalent: null
v1_tests: 11
action: adapt
adapt_target: test/rendering/snapshots.test.ts
tags: [dom-structure, aria, class-names, nesting, snapshot, regression, grid, groups, masonry, table]
---

# DOM Structure Snapshots (v1)

## What v1 Tested

- **Base List Vertical** (1 test): root div.vlist with tabindex=0, viewport div.vlist-viewport with tabindex=-1, content div.vlist-content, items div.vlist-items with role=listbox, live region div.vlist-live with aria-live=polite and aria-atomic=true and role=status, individual items div.vlist-item with role=option, aria-selected=false, data-index, data-id, aria-setsize, aria-posinset
- **Base List Nesting** (1 test): verifies parent-child relationships: root > (liveRegion + viewport > content > items > item*). Each level's parentElement is checked.
- **Base List Horizontal** (1 test): root has class "vlist vlist--horizontal", items container has aria-orientation="horizontal", still has role=listbox
- **Grid Layout** (1 test): viewport, content, items all present. Items rendered with data-index. Items container has role=listbox (not grid role). Root class contains "vlist".
- **Groups Layout** (1 test): root has --grouped modifier, role=listbox, rendered items include group headers + data items, items container exists
- **Masonry Layout** (1 test): root has --masonry modifier, viewport/content/items present, items rendered with data-index, items container role=listbox
- **Table Layout** (1 test): root role promoted to "grid", aria-colcount present, table header exists (class contains "table-header"), rowgroup roles present, gridcell roles with aria-colindex, row roles present
- **ariaLabel** (1 test): ariaLabel config propagated to items container's aria-label attribute
- **Custom classPrefix** (1 test): "mylist" prefix applied to root, viewport (.mylist-viewport), content (.mylist-content), items (.mylist-items), live region (.mylist-live), individual items (.mylist-item)
- **Snapshot Stability** (1 test): two identical builds produce identical serialized DOM snapshots (after normalizing per-instance IDs like vlist-N-item-N)
- **Item ARIA Completeness** (1 test): every rendered item has role=option, aria-selected, aria-setsize, aria-posinset (1-based = index+1), data-index, data-id, aria-setsize equals total items

## Relevance to v2

- **Base List Structure** — STILL RELEVANT. The DOM tree structure (root > liveRegion + viewport > content > items > item*) is fundamental. Any change here breaks CSS, screen readers, and framework adapters. This is a high-value regression test.
- **ARIA Attributes** — STILL RELEVANT. role=listbox, role=option, aria-selected, aria-setsize, aria-posinset, aria-live, aria-atomic are WCAG requirements. Any missing attribute is an accessibility regression.
- **Horizontal Mode** — STILL RELEVANT. The --horizontal modifier and aria-orientation="horizontal" are needed for horizontal list identification.
- **Grid Layout** — STILL RELEVANT. Grid must preserve the base structure while adding grid-specific attributes. Notably, grid uses role=listbox (not role=grid) in v1.
- **Groups Layout** — STILL RELEVANT. The --grouped modifier and header elements must be present.
- **Masonry Layout** — STILL RELEVANT. The --masonry modifier must be present.
- **Table Layout** — STILL RELEVANT. Table promotes root role to "grid" (ARIA grid pattern), adds aria-colcount, table header, rowgroup, row, gridcell with aria-colindex. This is the most complex ARIA structure.
- **ariaLabel / classPrefix** — STILL RELEVANT. Config propagation to DOM attributes must work.
- **Snapshot Stability** — STILL RELEVANT. Deterministic DOM output prevents flaky snapshot tests and ensures consistent behavior.
- **Item ARIA Completeness** — STILL RELEVANT. Every rendered item must have the full set of ARIA attributes.

## Adaptation Notes

- v2 may have different class names or DOM structure. The test should be adapted to match v2's actual structure, then serve as a regression baseline going forward.
- The serializer function `serialiseDOM(el, depth, maxDepth, maxItems)` captures only structural attributes (class, role, tabindex, aria-*, data-index, data-id, data-group, data-column). Inline styles and dynamic IDs are excluded for stability. This utility is reusable in v2.
- The `SNAPSHOT_ATTRS` array defines which attributes to capture. Adapt to include any v2-specific attributes.
- Replace `vlist<T>({...}).use(withGrid/withGroups/withMasonry/withTable).build()` with v2's plugin APIs.
- `setupDOM({ width, height })` and `teardownDOM()` from test helpers — same pattern in v2 with happy-dom.
- `createTestItems(count)` and `createContainer()` from test helpers — adapt to v2 equivalents.
- The snapshot stability test normalizes IDs with `s.replace(/vlist-\d+-item-\d+/g, "vlist-X-item-X")`. v2's ID format may need a different regex.
- The nesting test directly checks `parentElement` relationships. This is the most robust way to verify DOM structure — more reliable than string matching.
- Table layout assertions check for specific roles (grid, rowgroup, row, gridcell) and ARIA properties (aria-colcount, aria-colindex). These follow the ARIA grid pattern spec.
- Consider using bun:test's snapshot feature (`expect(snap).toMatchSnapshot()`) for v2, with manual verification on first run.
