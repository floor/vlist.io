---
created: 2026-05-28
updated: 2026-05-28
status: draft
rfc: RFC-007
---

# Tree

Virtualized tree view with expand/collapse, async children, and WAI-ARIA treeview keyboard navigation.

```ts
import { createVList, tree } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 32, template: renderNode },
  items: files,
}, [tree({
  children: "children",
  indent: 24,
})]);
```

## Data Model

Two data formats are supported.

### Nested children

Items are root nodes with nested `children` arrays:

```ts
const files = [
  { id: "src", name: "src", children: [
    { id: "core", name: "core", children: [
      { id: "create", name: "create.ts" },
      { id: "pipeline", name: "pipeline.ts" },
    ]},
    { id: "plugins", name: "plugins", children: [
      { id: "tree", name: "tree", children: [
        { id: "plugin", name: "plugin.ts" },
        { id: "index", name: "index.ts" },
      ]},
    ]},
    { id: "index", name: "index.ts" },
  ]},
  { id: "pkg", name: "package.json" },
  { id: "readme", name: "README.md" },
];
```

### Flat with parentId

Flat arrays with a `parentId` field — common when data comes from a database or API:

```ts
const nodes = [
  { id: "src", name: "src", parentId: null },
  { id: "core", name: "core", parentId: "src" },
  { id: "create", name: "create.ts", parentId: "core" },
  { id: "pipeline", name: "pipeline.ts", parentId: "core" },
  { id: "pkg", name: "package.json", parentId: null },
];

const list = createVList({
  container: "#app",
  item: { height: 32, template: renderNode },
  items: nodes,
}, [tree({ parentId: "parentId" })]);
```

The plugin builds and flattens the tree internally based on expand/collapse state — you work with your original data, not layout indices.

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `children` | `string \| (item) => T[]` | `"children"` | Key or accessor for child nodes (nested mode) |
| `parentId` | `string \| (item) => string \| number \| null` | — | Key or accessor for parent ID (flat mode) |
| `indent` | `number` | `24` | Indentation per depth level (px) |
| `expanded` | `boolean \| (string \| number)[] \| (item) => boolean` | `false` | Initial expanded state — `true` for all, array of IDs, or predicate |
| `expandOnClick` | `boolean` | `false` | Toggle expand/collapse on row click |
| `loadChildren` | `(item) => Promise<T[]>` | — | Async child loader (see [Async Children](#async-children)) |
| `label` | `string \| (item) => string` | auto | Label accessor for type-ahead and rename |
| `checkbox` | `boolean` | `false` | Enable tri-state checkbox selection *(Phase 2)* |
| `connectorLines` | `boolean` | `false` | Show tree connector lines *(Phase 2)* |
| `compress` | `boolean` | `false` | Compress single-child chains *(Phase 2)* |

## Template

The template receives tree context via `state`:

```ts
const renderNode = (item, index, state) => {
  const { depth, expanded, hasChildren, isLeaf } = state.tree;
  const indent = depth * 24;
  const icon = isLeaf ? "file" : expanded ? "folder-open" : "folder";
  const toggle = hasChildren
    ? `<span class="toggle">${expanded ? "▼" : "▶"}</span>`
    : `<span class="toggle-spacer"></span>`;

  return `
    <div class="tree-node" style="padding-left: ${indent}px">
      ${toggle}
      <span class="icon icon-${icon}"></span>
      <span class="label">${item.name}</span>
    </div>
  `;
};
```

| Property | Type | Description |
|----------|------|-------------|
| `state.tree.depth` | `number` | Nesting depth (0 = root) |
| `state.tree.expanded` | `boolean` | Whether this node is expanded |
| `state.tree.hasChildren` | `boolean` | Whether this node has children |
| `state.tree.isLeaf` | `boolean` | `true` if no children |
| `state.tree.loading` | `boolean` | `true` while async children load |
| `state.tree.checked` | `true \| false \| "mixed"` | Checkbox state *(Phase 2)* |
| `state.tree.compressedPath` | `string \| null` | Compressed path *(Phase 2)* |

## Async Children

Load children on demand when a node is first expanded:

```ts
const list = createVList({
  container: "#app",
  item: { height: 32, template: renderNode },
  items: rootNodes,
}, [tree({
  children: "children",
  loadChildren: async (item) => {
    const res = await fetch(`/api/files/${item.id}/children`);
    return res.json();
  },
})]);
```

While loading, `state.tree.loading` is `true` — use it to show a spinner. Loaded children are cached on the item.

## Methods

| Method | Description |
|--------|-------------|
| `expand(id)` | Expand a node |
| `collapse(id)` | Collapse a node |
| `toggle(id)` | Toggle expand/collapse |
| `expandAll()` | Expand all nodes |
| `collapseAll()` | Collapse all nodes |
| `expandTo(id)` | Expand all ancestors of a node (reveal it) |
| `getExpanded()` | Get array of expanded node IDs |
| `isExpanded(id)` | Check if a node is expanded |
| `getDepth(id)` | Get nesting depth of a node |
| `getParent(id)` | Get parent node |
| `getChildren(id)` | Get direct children of a node |
| `addChild(parentId, item, index?)` | Insert a child under a parent |
| `moveNode(id, newParentId, index?)` | Reparent a node |
| `getTreeLayout()` | Get tree layout instance |
| `checkNode(id)` | Check a node *(Phase 2)* |
| `uncheckNode(id)` | Uncheck a node *(Phase 2)* |
| `getChecked()` | Get checked node IDs *(Phase 2)* |
| `filterTree(predicate)` | Filter visible nodes, `null` to clear *(Phase 2)* |
| `renameNode(id)` | Enter rename mode on a node *(Phase 3)* |

## Events

| Event | Payload |
|-------|---------|
| `tree:expand` | `{ id, item, depth }` |
| `tree:collapse` | `{ id, item, depth }` |
| `tree:load` | `{ id, item, children }` — async children loaded |
| `tree:load:error` | `{ id, item, error }` — async load failed |
| `tree:check` | `{ checked, unchecked, mixed }` *(Phase 2)* |
| `tree:filter` | `{ matches, total }` *(Phase 2)* |
| `tree:rename` | `{ id, item, value, previousValue }` *(Phase 3)* |
| `tree:rename:cancel` | `{ id, item }` *(Phase 3)* |

## Keyboard

Follows the [WAI-ARIA TreeView pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/):

| Key | Action |
|-----|--------|
| ArrowRight | Expand node (if collapsed), or move to first child (if expanded) |
| ArrowLeft | Collapse node (if expanded), or move to parent (if collapsed/leaf) |
| ArrowDown | Next visible node |
| ArrowUp | Previous visible node |
| Home | First node |
| End | Last visible node |
| Enter | Activate node (emits `item:click`) |
| `*` (asterisk) | Expand all siblings at current level |
| Type-ahead | Character keys jump to next matching node (500ms timeout) |
| Space | Toggle checkbox *(Phase 2)* |
| F2 | Enter rename mode *(Phase 3)* |

## CSS Classes

- `.vlist--tree` on root
- `.vlist-tree-node` on items
- `.vlist-tree-node--expanded` on expanded nodes
- `.vlist-tree-node--leaf` on leaf nodes
- `.vlist-tree-node--loading` on async-loading nodes
- `.vlist-tree-node--context` on ancestor-only nodes during filter *(Phase 2)*
- `.vlist-tree-node--compressed` on compressed-path nodes *(Phase 2)*
- `.vlist-tree-node--editing` on nodes in rename mode *(Phase 3)*
- `.vlist-tree-connector` on connector line elements *(Phase 2)*

## ARIA

- `role="tree"` on root, `role="treeitem"` on nodes
- `aria-expanded` on nodes with children
- `aria-level` for depth (1-based)
- `aria-setsize` and `aria-posinset` scoped to siblings at each level
- `aria-checked` with tri-state support *(Phase 2)*

## Notes

- Works with: selection, scrollbar, scale, autosize, snapshots
- Conflicts with: grid, masonry, table, groups, data
- `scrollToIndex` uses flat visible indices — use `expandTo(id)` first to ensure a deep node is visible
- `list.total` returns the count of currently visible (flattened) nodes, not total nodes in the tree
- Removing a node also removes its entire subtree

## Examples

- [File Browser](/examples/file-browser) — Finder-like tree with icons and async directory loading
- [Category Picker](/examples/category-picker) — checkbox tree with tri-state selection *(Phase 2)*
