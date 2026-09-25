---
created: 2026-05-29
updated: 2026-05-29
status: published
rfc: RFC-007
---

# Tree

Virtualized tree view with expand/collapse, async children, and WAI-ARIA treeview keyboard navigation.

```ts
import { createVList, tree, selection } from "vlist";

const list = createVList({
  container: "#app",
  item: { height: 32, template: renderNode },
  items: files,
}, [
  tree({ children: "children", indent: 24, expandOnClick: true }),
  selection({ mode: "single" }),
]);
```

## Data Model

Two data formats are supported. In both modes, every node must have a unique `id`.

### Nested children

Items have a `children` array (or custom accessor):

```ts
const files = [
  { id: "src", name: "src", children: [
    { id: "core", name: "core", children: [
      { id: "create", name: "create.ts", children: [] },
      { id: "pipeline", name: "pipeline.ts", children: [] },
    ]},
  ]},
  { id: "pkg", name: "package.json", children: [] },
  { id: "readme", name: "README.md", children: [] },
];
```

### Flat with parentId

Flat arrays with a `parentId` field — common for database-backed data:

```ts
const nodes = [
  { id: "src", name: "src", parentId: null },
  { id: "core", name: "core", parentId: "src" },
  { id: "create", name: "create.ts", parentId: "core" },
  { id: "pkg", name: "package.json", parentId: null },
];

const list = createVList({
  container: "#app",
  item: { height: 32, template: renderNode },
  items: nodes,
}, [tree({ parentId: "parentId" })]);
```

Orphaned nodes (non-null `parentId` referencing a missing node) are silently dropped with a console warning.

The plugin flattens the tree internally based on expand state — you work with your original data structure, not layout indices.

## Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `children` | `string \| (item) => T[]` | `"children"` | Key or accessor for child nodes (nested mode) |
| `parentId` | `string \| (item) => string \| number \| null` | — | Key or accessor for parent ID (flat mode) |
| `indent` | `number` | `24` | Indentation per depth level in pixels |
| `expanded` | `boolean \| ID[] \| (item) => boolean` | `false` | Initial expand state |
| `expandOnClick` | `boolean` | `false` | Toggle expand/collapse on row click |
| `loadChildren` | `(item) => Promise<T[]>` | — | Async child loader (see below) |
| `label` | `string \| (item) => string` | auto | Label accessor for type-ahead search |

One of `children` or `parentId` is required. If neither is set, defaults to `children: "children"`.

The `label` accessor defaults to `item.name ?? item.label ?? item.title ?? String(item.id)`.

## Template

The template receives tree context via `state.tree`:

```ts
const renderNode = (item, index, state) => {
  const { depth, expanded, hasChildren, isLeaf, loading } = state.tree;
  const icon = loading ? "⏳" : isLeaf ? "📄" : expanded ? "📂" : "📁";
  const chevron = hasChildren
    ? `<span class="chevron${expanded ? " open" : ""}">▶</span>`
    : `<span class="chevron-spacer"></span>`;

  return `
    <div class="tree-node">
      ${chevron}
      <span class="icon">${icon}</span>
      <span class="label">${item.name}</span>
    </div>
  `;
};
```

| Property | Type | Description |
|----------|------|-------------|
| `state.tree.depth` | `number` | Nesting depth (0 = root) |
| `state.tree.expanded` | `boolean` | Whether this node is currently expanded |
| `state.tree.hasChildren` | `boolean` | Whether this node has child nodes |
| `state.tree.isLeaf` | `boolean` | `true` if no children |
| `state.tree.loading` | `boolean` | `true` while async children are loading |

The plugin also applies `paddingLeft` automatically based on `depth * indent`, and sets a `--vlist-tree-depth` CSS custom property on each element for advanced styling.

## Async Children

Load children on demand when a node is first expanded:

```ts
tree({
  children: "children",
  loadChildren: async (item) => {
    const res = await fetch(`/api/files/${item.id}/children`);
    return res.json();
  },
})
```

When `loadChildren` is configured, nodes without loaded children can still be expanded via click or ArrowRight — the plugin triggers the load automatically. While loading, `state.tree.loading` is `true` and the node gets the `.vlist-tree-node--loading` CSS class.

Loaded children are cached on the item's `children` property — subsequent expand/collapse is instant.

## Methods

| Method | Description |
|--------|-------------|
| `expand(id)` | Expand a node |
| `collapse(id)` | Collapse a node |
| `toggle(id)` | Toggle expand/collapse |
| `expandAll()` | Expand every node in the tree |
| `collapseAll()` | Collapse everything to root level |
| `expandTo(id)` | Expand all ancestors to reveal a node, then scroll to it |
| `getExpanded()` | Returns array of currently expanded node IDs |
| `isExpanded(id)` | Check if a node is expanded |
| `addChild(parentId, item, index?)` | Insert a child under a parent |
| `moveNode(id, newParentId, index?)` | Reparent a node (cycle detection built in) |
| `getTreeLayout()` | Returns `{ totalVisible, flatNodes }` |

`addChild` and `moveNode` validate constraints: duplicate IDs throw, cycles throw, missing parents throw.

## Events

| Event | Payload |
|-------|---------|
| `tree:expand` | `{ id, item, depth }` |
| `tree:collapse` | `{ id, item, depth }` |
| `tree:load` | `{ id, item, children }` — async children loaded |
| `tree:load:error` | `{ id, item, error }` — async load failed |

## Keyboard

Follows the [WAI-ARIA TreeView pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/):

| Key | Action |
|-----|--------|
| ArrowRight | Expand (if collapsed), move to first child (if expanded), or trigger async load |
| ArrowLeft | Collapse (if expanded), or move to parent |
| ArrowDown | Next visible node |
| ArrowUp | Previous visible node |
| Home | First node |
| End | Last visible node |
| Enter | Activate node (emits `item:click`) |
| `*` | Expand all siblings at current level |
| Type-ahead | Character keys jump to next matching label (500ms timeout) |

ArrowDown/Up/Home/End are handled by the `selection` or `a11y` plugin when present. The tree plugin provides its own fallback if neither is active.

## CSS Classes

| Class | Applied to |
|-------|-----------|
| `.vlist--tree` | Root element |
| `.vlist-tree-node` | Every tree item |
| `.vlist-tree-node--expanded` | Expanded nodes |
| `.vlist-tree-node--leaf` | Leaf nodes (no children) |
| `.vlist-tree-node--loading` | Nodes loading async children |

## ARIA

- `role="tree"` on root, `role="treeitem"` on every node
- `aria-expanded="true"` / `"false"` on nodes with children (absent on leaves)
- `aria-level` — nesting depth (1-based per spec)
- `aria-setsize` / `aria-posinset` — sibling count and position, scoped per parent

## Plugin Interactions

| Plugin | Interaction |
|--------|-------------|
| **selection** | Works — selection operates on the flat visible list |
| **scrollbar** | Works |
| **scale** | Works — compression-aware render pipeline |
| **autosize** | Works |
| **snapshots** | Works |
| **grid, masonry, table** | Conflict — tree is a list layout |
| **groups** | Conflict — tree manages its own hierarchy |
| **data** | Conflict — use `loadChildren` for async tree data |

## Notes

- `list.total` returns visible (flattened) node count, not total nodes in tree
- Collapsing a node removes its entire subtree from view but preserves expand state — re-expanding restores it
- Removing a node removes its entire subtree
- Duplicate IDs are detected across the full tree (including collapsed subtrees) and throw
- `moveNode` validates cycles — moving a node onto its own descendant throws
- `scrollToIndex` uses flat visible indices — call `expandTo(id)` first to ensure a deep node is visible

## Examples

- [Tree View](/examples/tree) — collapsible file tree with keyboard navigation
