---
created: 2026-05-28
updated: 2026-05-29
status: draft
---

# RFC-007: Tree Plugin

**Status:** Draft  
**Author:** floor  
**Type:** Plugin / Feature  
**Created:** 2026-05-28  
**Related:** RFC-002 Core Architecture

---

## Summary

Add a `tree()` plugin that renders hierarchical data as a virtualized, collapsible tree view with WAI-ARIA treeview keyboard navigation. The plugin owns the tree→flat conversion internally, so users work with their original tree structure while the core pipeline sees a flat list.

The feature set is split into three phases to keep each deliverable focused and shippable:

| Phase | Scope | Priority |
|-------|-------|----------|
| **Phase 1** | Expand/collapse, nested + flat data, async children, keyboard, ARIA | Core — ship first |
| **Phase 2** | Checkbox tri-state, search/filter, compressed paths, connector lines | Power features |
| **Phase 3** | Rename-in-place, tree-aware drag-and-drop | Interactive editing |

---

## Motivation

Tree views are one of the most requested missing layouts. File browsers, org charts, category pickers, settings panels, and permission editors all need hierarchical data. Today, users either flatten the tree themselves and fake indentation, or reach for a separate tree library that can't share vlist's virtualization, selection, keyboard nav, or a11y infrastructure.

The competitive landscape confirms demand:

- **react-arborist** — the most feature-rich React tree (rename, DnD, flat data, filter), but React-only and not virtualized at scale
- **react-complex-tree** — controllable state, inter-tree DnD, but no built-in virtualization
- **Ant Design Tree** — enterprise checkbox trees with tri-state, virtual scroll in v5+, but Ant-only
- **MUI TreeView** — strong a11y, limited to small-medium trees
- **VS Code** — compressed single-child paths, renderer-agnostic architecture, 100K+ nodes

None of these are framework-agnostic, composable with an existing plugin ecosystem, or designed for 1M+ node trees with scroll compression. vlist can offer all three.

---

## Architecture

### Data flow

```
User items (tree)  →  tree plugin flattens  →  core pipeline sees flat list
                      based on expand state     (sizes, pooling, render)
```

The tree plugin implements `setRenderFn` like grid/table — it owns the render loop and translates between tree indices and flat visible indices. The core never knows about tree structure.

### Flat array management

The plugin maintains a `flatNodes` array — the ordered list of currently visible nodes after expand/collapse. Each entry carries:

```ts
interface FlatNode<T> {
  item: T;
  id: string | number;
  depth: number;
  parentIndex: number;    // index in flatNodes, -1 for roots
  hasChildren: boolean;
  expanded: boolean;
  childCount: number;     // direct children count
}
```

On expand/collapse, the plugin **splices** the flat array — inserting or removing the subtree at the correct position — rather than rebuilding from scratch. This keeps expand/collapse O(subtree) instead of O(total).

### Two data modes

**Nested children** (default) — items have a `children` key or accessor:

```ts
tree({ children: "children" })
tree({ children: (item) => item.subItems })
```

**Flat with parentId** — items have a `parentId` key or accessor. The plugin builds the tree on setup:

```ts
tree({ parentId: "parentId" })
tree({ parentId: (item) => item.parent_id })
```

Both modes produce the same internal `FlatNode[]`. The nested mode is simpler; the flat mode is common for database-backed data.

### Why not use the groups plugin?

Groups and trees look similar (both add structure to a flat list) but differ fundamentally:

| | Groups | Tree |
|---|---|---|
| Depth | 1 level (flat groups) | N levels (recursive) |
| Collapse | Not supported | Core feature |
| Headers | Plugin-rendered sticky elements | Regular items with indent |
| Data model | User pre-sorts, plugin detects boundaries | Plugin owns the hierarchy |
| Layout | Inserts extra elements (headers) between items | All elements are items with metadata |

A tree built on groups would need to fake N-level nesting, manage recursive collapse as group hide/show, and fight the sticky header system. Building tree as its own plugin is cleaner.

---

## Phase 1: Core Tree

### Config

```ts
interface TreePluginConfig<T> {
  children?: string | ((item: T) => T[]);
  parentId?: string | ((item: T) => string | number | null);
  label?: string | ((item: T) => string);             // default: item.name ?? item.label ?? item.title ?? String(item.id)
  indent?: number;                                    // default: 24
  expanded?: boolean | (string | number)[] | ((item: T) => boolean);  // default: false
  expandOnClick?: boolean;                            // default: false
}
```

One of `children` or `parentId` is required. If neither is set, defaults to `children: "children"`.

`label` is optional but recommended. It's used by type-ahead keyboard navigation, ARIA node naming, and (in Phase 3) rename-in-place. Defaults to a heuristic: `item.name ?? item.label ?? item.title ?? String(item.id)`.

### Identity contract

Every node **must** have a unique `id` property (string or number). The plugin uses `item.id` for:
- Expand state tracking (`expandedIds: Set<ID>`)
- Element recycling (pool keyed by id)
- `expand(id)`, `collapse(id)`, `getParent(id)`, etc.
- ARIA `aria-activedescendant` references

**Rules:**
- IDs must be unique across the entire tree (not just among siblings). Duplicate IDs cause undefined behavior — the plugin should throw on detection during `setItems` and `addChild`.
- IDs must be stable across re-renders. Changing a node's `id` between `setItems` calls breaks expand state, selection state, and snapshots.
- `parentId` mode: the `parentId` value must reference an existing node's `id`, or be `null`/`undefined` for root nodes. Orphaned nodes (non-null `parentId` that doesn't match any node) are silently dropped with a console warning.
- `moveNode(id, newParentId)`: the plugin must reject cycles — moving a node to one of its own descendants throws. Validation is O(depth) by walking ancestors of the target.

### Template state

The tree plugin extends `ItemState` with tree-specific context:

```ts
interface TreeState {
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  isLeaf: boolean;
  loading: boolean;     // true during async child load
}
```

Accessible as `state.tree` in the template function. The plugin populates this before each template call using the `FlatNode` metadata — zero allocation, same singleton pattern as grid/table.

### Expand / collapse

```ts
list.expand(id)            // insert children into flatNodes
list.collapse(id)          // remove subtree from flatNodes (recursive)
list.toggle(id)
list.expandAll()
list.collapseAll()
list.expandTo(id)          // expand all ancestors, then scroll to node
list.getExpanded()         // returns ID[]
list.isExpanded(id)
```

**Collapse is recursive** — collapsing a node removes its entire subtree (children, grandchildren, etc.) from the flat array, regardless of their individual expand state. Expand state is preserved — re-expanding the parent restores previously-expanded descendants.

**`expandAll()` performance** — with 100K+ nodes, expanding everything at once rebuilds the entire `flatNodes` array. Implementation options:
1. Batch: expand in chunks via rAF, rendering incrementally
2. Warning: emit an `error` event if total visible nodes exceeds a threshold
3. Accept it: the flat array rebuild is O(n) which is fast; the concern is only DOM render, which is already virtualized

Option 3 is the starting point — the flat array rebuild is cheap, and the render pipeline only touches visible nodes. However, if benchmarks show frame drops from the array splice itself at very large node counts (500K+), fall back to option 1 (time-sliced expansion via rAF). Measure before adding complexity.

### Async children

```ts
tree({
  children: "children",
  loadChildren: async (item: T) => {
    const res = await fetch(`/api/nodes/${item.id}/children`);
    return res.json();
  },
})
```

Flow:
1. User expands a node with no children loaded
2. Plugin sets `loading: true` on the FlatNode, triggers re-render (spinner via template)
3. Calls `loadChildren(item)`
4. On resolve: attaches children to item, splices into flatNodes, re-renders
5. On reject: emits `tree:load:error`, sets `loading: false`
6. Loaded children are cached on the item — subsequent expand/collapse is instant

### Keyboard

WAI-ARIA TreeView pattern:

| Key | Action |
|-----|--------|
| ArrowRight | If collapsed: expand. If expanded: move to first child. If leaf: no-op |
| ArrowLeft | If expanded: collapse. If collapsed/leaf: move to parent |
| ArrowDown | Next visible node |
| ArrowUp | Previous visible node |
| Home | First node |
| End | Last visible node |
| Enter | Activate (emits `item:click`) |
| `*` | Expand all siblings at current depth level |
| Type-ahead | Character keys jump to next node matching typed prefix (500ms timeout) |

The tree plugin overrides the a11y plugin's keyboard handler via `ctx.registerKeydownHandler`. ArrowDown/ArrowUp/Home/End behave identically to a flat list (the flat array is already correctly ordered). ArrowRight/ArrowLeft are tree-specific.

**Type-ahead** — the base a11y plugin doesn't have type-ahead today. The tree plugin implements it internally: on printable character keydown, buffer the character, search forward in `flatNodes` for a label match. The `label` accessor defaults to `item.name ?? item.label ?? item.title ?? String(item.id)`.

### ARIA (acceptance criteria)

ARIA correctness is a **Phase 1 requirement**, not polish. The tree is only trustworthy if focus, roving tabindex, `aria-level`, `aria-posinset`, and `aria-setsize` remain correct under virtualization, collapse, async loading, and filtering. Every Phase 1 sub-task must validate ARIA attributes in its tests.

```html
<div role="tree" aria-label="File browser">
  <div role="treeitem" aria-level="1" aria-setsize="3" aria-posinset="1" aria-expanded="true">
    src
  </div>
  <div role="treeitem" aria-level="2" aria-setsize="2" aria-posinset="1" aria-expanded="false">
    core
  </div>
  ...
</div>
```

- `role="tree"` on the root (overrides `role="listbox"` from a11y plugin)
- `role="treeitem"` on every node (overrides `role="option"`)
- `aria-level` = depth + 1 (1-based per spec)
- `aria-setsize` = number of siblings at this level under the same parent
- `aria-posinset` = position among those siblings (1-based)
- `aria-expanded` = `"true"` | `"false"` on nodes with children; absent on leaves

`aria-setsize` and `aria-posinset` must remain correct when:
- Siblings are added/removed via `addChild` / `removeItem`
- Nodes are loaded asynchronously (sibling count updates after load)
- Nodes are hidden by filter (Phase 2 — scoped to visible siblings only)

### Events

| Event | Payload |
|-------|---------|
| `tree:expand` | `{ id, item, depth }` |
| `tree:collapse` | `{ id, item, depth }` |
| `tree:load` | `{ id, item, children }` |
| `tree:load:error` | `{ id, item, error }` |

### CSS Classes

- `.vlist--tree` on root
- `.vlist-tree-node` on items
- `.vlist-tree-node--expanded` on expanded nodes
- `.vlist-tree-node--leaf` on leaf nodes
- `.vlist-tree-node--loading` on async-loading nodes

### Data mutations

| Method | Tree behavior |
|--------|---------------|
| `setItems(items)` | Full tree rebuild — re-flattens from scratch |
| `appendItems(items)` | Appends root-level nodes |
| `removeItem(id)` | Removes node and its entire subtree |
| `updateItem(id, partial)` | Updates node data; re-renders if visible |
| `insertItem(item, index)` | Inserts as root node at position. For inserting as a child, use `addChild(parentId, item)` |

Additional tree-specific mutation:

```ts
list.addChild(parentId, item, index?)    // insert child under parent
list.moveNode(id, newParentId, index?)   // reparent a node
```

**All mutations must surgically splice `flatNodes`** rather than triggering a full tree rebuild. `addChild` inserts at the correct position within the parent's visible subtree. `moveNode` removes from the old position and inserts at the new one. `removeItem` removes the node and its entire expanded subtree. Only `setItems` triggers a full rebuild.

### Plugin interactions

| Plugin | Interaction |
|--------|-------------|
| **selection** | Works — selection operates on flat visible indices. `getSelectedItems()` returns tree items. |
| **scrollbar** | Works — no special handling needed |
| **scale** | Works — tree sets `setVirtualTotalFn` to return flat node count. Same cross-plugin compression pattern as grid/table. |
| **autosize** | Works — measures flat visible nodes as usual |
| **snapshots** | Works — saves expand state + scroll position. Restore expands nodes first, then scrolls. |
| **data** | **Replaced** — async children are handled by tree's own `loadChildren`, not the data plugin's page-based adapter. Conflict. |
| **sortable** | Phase 3 — needs tree-aware drop targets |
| **grid, masonry, table** | Conflict — tree is a list layout |
| **groups** | Conflict — tree manages its own hierarchy |

### Bundle size target

The grid plugin (compression-aware, row-space layout, 2D keyboard, scrollToIndex override) is +2.7 KB. The tree plugin has comparable complexity in Phase 1 — flat array management replaces grid's row-space math. Target: **+3.0–3.5 KB**.

---

## Phase 2: Power Features

### Checkbox tri-state

```ts
tree({ children: "children", checkbox: true })
```

Adds `state.tree.checked: true | false | "mixed"` to template context.

**Cascade rules:**
- Check a leaf → leaf is checked
- Check a parent → all descendants checked
- Uncheck a parent → all descendants unchecked
- Mixed → auto-computed when some (not all) children are checked

**ARIA:** `aria-checked="true" | "false" | "mixed"` on treeitem elements.

**Methods:**
- `checkNode(id)` / `uncheckNode(id)` / `toggleCheck(id)`
- `getChecked()` → returns ID array (only fully-checked, not mixed)

**Events:**
- `tree:check` → `{ checked: ID[], unchecked: ID[], mixed: ID[] }`

**Performance concern:** Cascade propagation is O(ancestors + descendants) per toggle. For a 100K-node tree, checking the root cascades to all nodes. Mitigation: propagation is a Set operation on IDs, not DOM work — should be sub-millisecond.

**Async children + checkbox:** When a user checks a parent whose children haven't been loaded yet, the plugin marks the parent as checked and stores a "check pending" flag. When `loadChildren` resolves, the loaded children inherit the parent's checked state automatically. The `tree:check` event fires twice — once immediately (parent only) and once after load (parent + children). This avoids blocking the UI on a network request just to resolve checkbox state.

**Open question:** How does checkbox interact with the `selection()` plugin? Options:
1. Checkbox replaces selection — `getChecked()` is the "selected" set
2. Checkbox and selection coexist — checkbox is for data state, selection is for UI focus
3. Checkbox mode automatically includes selection plugin behavior

Recommendation: option 2. Checkbox is domain logic (permission trees, category pickers); selection is UI navigation (focus ring, arrow keys). They serve different purposes.

### Search / filter

```ts
list.filterTree(predicate: (item: T) => boolean)
list.filterTree(null)  // clear
```

**Ancestor preservation:** When filtering, matching nodes and their entire ancestor chain remain visible. Non-matching subtrees collapse. Ancestors that are visible only for context get `state.tree.isContext: true` and the `.vlist-tree-node--context` CSS class (for dimmed styling).

**Implementation:** Rebuild `flatNodes` by walking the tree and including a node if:
1. The node matches the predicate, OR
2. Any descendant matches the predicate (ancestor preservation)

This is O(total nodes) per filter change — acceptable since filter is user-triggered, not per-frame.

**Auto-expand:** Filter automatically expands nodes to show matches. Clearing the filter restores the previous expand state.

**Event:** `tree:filter` → `{ matches: number, total: number }`

### Compressed paths (VS Code style)

```ts
tree({ children: "children", compress: true })
```

When a node has exactly one child and that child is a directory (has children), compress the chain into a single row:

```
Without compress:         With compress:
▼ src                     ▼ src/plugins/tree
  ▼ plugins                 plugin.ts
    ▼ tree                  index.ts
      plugin.ts
      index.ts
```

**Template context:** `state.tree.compressedPath: string | null` contains the joined path (e.g., `"src/plugins/tree"`) when the node is a compressed chain head. `null` otherwise.

**Implementation:** During flatNode construction, detect single-child chains and merge them into one FlatNode with adjusted metadata. The merged node's `children` are the terminal node's children.

**Interaction with expand/collapse:** Expanding/collapsing a compressed node expands/collapses the terminal node of the chain.

### Connector lines

```ts
tree({ children: "children", connectorLines: true })
```

CSS-based tree lines connecting parent → child using `::before` pseudo-elements on tree nodes. Requires depth and "is last child" metadata to draw correct L-shaped and I-shaped connectors.

Adds `state.tree.isLastChild: boolean` to template context (needed for connector line rendering).

**CSS approach:** The plugin provides a built-in stylesheet (`vlist-tree.css`) similar to `vlist-table.css` and `vlist-grid.css`. Lines are drawn with CSS borders on pseudo-elements, positioned via CSS custom properties (`--tree-depth`, `--tree-indent`).

---

## Phase 3: Interactive Editing

### Rename-in-place

```ts
tree({ children: "children", label: "name" })
```

```ts
list.renameNode(id)  // enters edit mode programmatically

list.on("tree:rename", ({ id, item, value, previousValue }) => {
  item.name = value;
  await saveToServer(id, value);
});
```

**Flow:**
1. Double-click node label or press F2 → enter edit mode
2. Plugin replaces the node's rendered content with an `<input>` pre-filled with current label
3. Enter confirms, Escape cancels
4. On confirm: emits `tree:rename`, user persists the change
5. On cancel: emits `tree:rename:cancel`, restores original label

**CSS:** `.vlist-tree-node--editing` on the node during edit mode.

**Open question:** Should the plugin mutate `item[label]` automatically, or leave it entirely to the user via the event? Recommendation: leave it to the user — matches the pattern of `column:sort` in table (plugin emits, user acts). Avoids assumptions about data immutability.

### Tree-aware drag-and-drop

Extends the `sortable` plugin with tree-specific drop targets:

```ts
const list = createVList({
  container: "#app",
  item: { height: 32, template: renderNode },
  items: files,
}, [
  tree({ children: "children" }),
  sortable({ treeMode: true }),
]);
```

**Drop zones:** Each node has three drop zones:
1. **Top edge** — insert before this node (same parent)
2. **Center** — drop as child of this node
3. **Bottom edge** — insert after this node (same parent)

Visual indicators show which zone is active during drag.

**Sort event:** `sort:end` payload includes tree context:

```ts
{ fromId, toParentId, toIndex }
```

**Per-node constraints:**
- `disableDrag: true` on item → node cannot be dragged
- `disableDrop: true` on item → node cannot receive children

**Preventing cycles:** Cannot drop a node onto its own descendant. The plugin detects this and cancels the drop.

**Open question:** Should this be `sortable({ treeMode: true })` or a separate config on the tree plugin? Recommendation: keep it on sortable — tree provides the layout metadata, sortable provides the drag infrastructure. Tree exposes `getParent()`, `getChildren()`, `getDepth()` as registered methods that sortable reads.

---

## Open Questions

1. **Conflict with `data()` plugin** — async trees load children per-node, while `data()` loads pages by scroll position. These are incompatible models. Should `loadChildren` be a tree config option (current proposal), or should `data()` grow a tree adapter mode?

   Recommendation: `loadChildren` on tree config. The data plugin's page-based model doesn't map to tree expansion. Separate concerns.

2. **`list.total` semantics** — should `list.total` return visible (flattened) count or total nodes in tree? Current proposal: visible count (matches grid's behavior where `list.total` returns row count, not item count). Add `list.getTreeLayout().totalNodes` for the full count.

3. **Scale plugin at 1M+ nodes** — a tree with 1M+ visible nodes (fully expanded) would need scroll compression. The tree plugin should support the same cross-plugin compression pattern as grid/table. Should this be Phase 1 or Phase 2?

   Recommendation: Phase 1. It's a proven pattern now (grid and table both have it), and the implementation is mechanical — add `resolveCompression()`, use compressed range/position functions when active.

4. **Snapshots restore** — saving expand state for 100K+ nodes could produce a large snapshot. Should snapshots save all expanded IDs, or just a delta from the initial `expanded` config?

   Recommendation: Delta from initial. Save only IDs whose expand state differs from the config default. For `expanded: false` (default), save only the expanded IDs. For `expanded: true`, save only the collapsed IDs.

5. **Type-ahead label resolution** — type-ahead needs a text label for each node. The current proposal uses a heuristic (`item.name ?? item.label ?? item.title ?? String(item.id)`). Should this be a required config option instead?

   Recommendation: Optional `label` config that defaults to the heuristic. Most trees have a `name` or `label` field. The `label` config is also reused by rename (Phase 3), so it's worth having.

---

## Implementation Order

```
Phase 1a: FlatNode model, nested children, expand/collapse, basic render
Phase 1b: Flat parentId mode
Phase 1c: Keyboard (ArrowRight/Left tree nav, type-ahead)
Phase 1d: ARIA (role="tree", aria-level, aria-expanded, aria-setsize/posinset)
Phase 1e: Async children (loadChildren)
Phase 1f: Scale plugin compression support
Phase 1g: Data mutations (setItems, removeItem, addChild, moveNode)
Phase 1h: Tests + docs

Phase 2a: Checkbox tri-state
Phase 2b: Search / filter with ancestor preservation
Phase 2c: Compressed paths
Phase 2d: Connector lines + vlist-tree.css

Phase 3a: Rename-in-place
Phase 3b: Tree-aware sortable drop zones
```

Each sub-phase is independently shippable and testable.

---

## Estimated Sizes

| Phase | Estimated gzip delta |
|-------|---------------------|
| Phase 1 | +3.0–3.5 KB |
| Phase 2 (checkbox + filter + compress + lines) | +1.5–2.0 KB |
| Phase 3 (rename + tree DnD) | +1.0–1.5 KB |
| **Full tree plugin** | **+5.5–7.0 KB** |

For comparison: table is +6.1 KB with columns, resize, sort, and scale compression.

---

## Review Log

### 2026-05-29 — Discussion #94 feedback

Reviewers: Codex (GPT-5), Antigravity (Gemini 3.1 Pro)

| Feedback | Resolution |
|----------|------------|
| `label` should be explicit Phase 1 config (Codex) | Added to Phase 1 config with default heuristic |
| Define identity/mutation behavior precisely (Codex) | Added "Identity contract" section — unique IDs, stability, orphan handling, cycle prevention |
| Keyboard + ARIA as acceptance criteria (Codex) | ARIA section renamed to "ARIA (acceptance criteria)", every sub-phase must validate ARIA in tests |
| Scale compression in Phase 1 (Codex) | Already in Phase 1 — confirmed |
| `loadChildren` on tree, not data plugin (Codex) | Already recommended — confirmed |
| Checkbox + async edge case (Antigravity) | Added "check pending" flag behavior to Phase 2 checkbox section |
| `expandAll()` time-slicing (Antigravity) | Updated: start with option 3, fall back to rAF time-slicing if benchmarks show frame drops |
| Surgical splice for mutations (Antigravity) | Added explicit requirement to Data mutations section |
