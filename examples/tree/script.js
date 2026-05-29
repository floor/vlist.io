// Tree View — Collapsible file tree with async loading
// Demonstrates tree plugin with real filesystem data from /api/files

import { createVList, tree, selection } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 32;
const API_BASE = "/api/files";

// =============================================================================
// Data — Filesystem
// =============================================================================

const FILE_ICONS = {
  folder: "📁",
  ts: "🟦",
  tsx: "🟦",
  js: "🟨",
  jsx: "🟨",
  css: "🟣",
  html: "🟠",
  json: "⚙️",
  md: "📝",
  cjs: "🟨",
  mjs: "🟨",
  yaml: "⚙️",
  yml: "⚙️",
  toml: "⚙️",
  sh: "🔧",
  default: "📄",
};

function getIcon(name, isFolder) {
  if (isFolder) return FILE_ICONS.folder;
  const ext = name.split(".").pop()?.toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

async function fetchDir(path) {
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

export let list = null;
let rootItems = [];

// =============================================================================
// Template
// =============================================================================

const itemTemplate = (item, _index, state) => {
  const t = state.tree;
  const isFolder = item.isDir;
  const icon = getIcon(item.name, isFolder);

  let chevronClass = "tree-node__chevron";
  let chevronContent = "▶";
  if (t.loading) {
    chevronContent = "◎";
  } else if (!isFolder) {
    chevronClass += " tree-node__chevron--leaf";
  } else if (t.expanded) {
    chevronClass += " tree-node__chevron--expanded";
  }

  const meta = isFolder
    ? item.children?.length != null
      ? `${item.children.length} items`
      : ""
    : formatSize(item.size);

  return `
    <div class="tree-node">
      <span class="${chevronClass}">${chevronContent}</span>
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
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => list?.total ?? 0,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create list
// =============================================================================

export async function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  rootItems = await fetchDir("vlist");

  const srcNode = rootItems.find((n) => n.name === "src");
  if (srcNode) srcNode.children = await fetchDir(srcNode.id);

  list = createVList(
    {
      container: "#list-container",
      ariaLabel: "File tree",
      item: {
        height: ITEM_HEIGHT,
        template: itemTemplate,
      },
      items: rootItems,
    },
    [
      tree({
        children: (item) => item.children ?? [],
        label: "name",
        indent: 20,
        expanded: ["vlist/src"],
        expandOnClick: true,
        loadChildren: async (item) => {
          return fetchDir(item.id);
        },
      }),
      selection({ mode: "single" }),
    ],
  );

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  list.on("tree:expand", updateTreeState);
  list.on("tree:collapse", updateTreeState);
  list.on("tree:load", updateTreeState);

  updateInfo();
  updateTreeState();
}

// =============================================================================
// UI updates
// =============================================================================

const visibleEl = document.getElementById("info-visible");
const expandedEl = document.getElementById("info-expanded");
const nodesEl = document.getElementById("info-nodes");

function updateTreeState() {
  if (!list) return;
  const layout = list.getTreeLayout();
  if (visibleEl) visibleEl.textContent = layout.totalVisible.toLocaleString();
  if (expandedEl) expandedEl.textContent = list.getExpanded().length;
  if (nodesEl) nodesEl.textContent = layout.flatNodes.length.toLocaleString();
}

// =============================================================================
// Controls
// =============================================================================

const expandAllBtn = document.getElementById("btn-expand-all");
if (expandAllBtn) {
  expandAllBtn.addEventListener("click", () => {
    list?.expandAll();
    updateTreeState();
  });
}

const collapseAllBtn = document.getElementById("btn-collapse-all");
if (collapseAllBtn) {
  collapseAllBtn.addEventListener("click", () => {
    list?.collapseAll();
    updateTreeState();
  });
}

const resetBtn = document.getElementById("btn-reset");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    createList();
  });
}

// =============================================================================
// Initialise
// =============================================================================

createList();
