// Tree View — Collapsible file tree with async loading
// Demonstrates tree plugin with real filesystem data from /api/files

import { createVList, tree, selection } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import { getIcon, getChevron } from "./icons.js";
import { updateTreeState } from "./controls.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 30;
const API_BASE = "/api/files";

// =============================================================================
// Data — Filesystem
// =============================================================================

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export async function fetchDir(path) {
  const res = await fetch(`${API_BASE}?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  const data = await res.json();
  return data.items.map((item) => ({
    id: path ? `${path}/${item.name}` : item.name,
    name: item.name,
    isDir: item.type === "directory",
    size: item.size,
    children: item.type === "directory" ? undefined : [],
  }));
}

// =============================================================================
// State
// =============================================================================

let _list = null;
let _rootItems = [];

export function list() { return _list; }
export function rootItems() { return _rootItems; }

// =============================================================================
// Template
// =============================================================================

const itemTemplate = (item, _index, state) => {
  const t = state.tree;
  const isFolder = item.isDir;
  const icon = getIcon(item.name, isFolder, t.expanded);
  const chevron = t.loading
    ? '<span class="tree-node__chevron tree-node__chevron--loading">◎</span>'
    : getChevron(isFolder || t.hasChildren, t.expanded);

  const meta = isFolder
    ? item.children?.length != null
      ? `${item.children.length} items`
      : ""
    : formatSize(item.size);

  return `
    <div class="tree-node">
      ${chevron}
      <span class="tree-node__icon">${icon}</span>
      <span class="tree-node__label">${item.name}</span>
      <span class="tree-node__meta">${meta}</span>
    </div>
  `;
};

// =============================================================================
// Stats
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => _list?.getScrollPosition() ?? 0,
  getTotal: () => _list?.total ?? 0,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create list
// =============================================================================

export async function createList() {
  if (_list) {
    _list.destroy();
    _list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  _rootItems = await fetchDir("vlist");

  const srcNode = _rootItems.find((n) => n.name === "src");
  if (srcNode) srcNode.children = await fetchDir(srcNode.id);

  _list = createVList(
    {
      container: "#list-container",
      ariaLabel: "File tree",
      item: {
        height: ITEM_HEIGHT,
        template: itemTemplate,
      },
      items: _rootItems,
    },
    [
      tree({
        children: (item) => item.children ?? [],
        label: "name",
        indent: 20,
        expanded: ["vlist/src"],
        expandOnClick: true,
        connectorLines: true,
        loadChildren: async (item) => {
          return fetchDir(item.id);
        },
      }),
      selection({ mode: "single", followFocus: true, focusOnClick: true }),
    ],
  );

  _list.on("scroll", updateInfo);
  _list.on("range:change", updateInfo);
  _list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  _list.on("tree:expand", updateTreeState);
  _list.on("tree:collapse", updateTreeState);
  _list.on("tree:load", updateTreeState);

  updateInfo();
  updateTreeState();
}

// =============================================================================
// Initialise
// =============================================================================

createList();
