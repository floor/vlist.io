// Tree View — sidebar controls, display toggles, and UI state updates

import { list, createList, stats, fetchDir, rootItems } from "./script.js";

// =============================================================================
// UI updates
// =============================================================================

const visibleEl = document.getElementById("info-visible");
const expandedEl = document.getElementById("info-expanded");
const nodesEl = document.getElementById("info-nodes");

export function updateTreeState() {
  const l = list();
  if (!l) return;
  const layout = l.getTreeLayout();
  if (visibleEl) visibleEl.textContent = layout.totalVisible.toLocaleString();
  if (expandedEl) expandedEl.textContent = l.getExpanded().length;
  if (nodesEl) nodesEl.textContent = layout.flatNodes.length.toLocaleString();
}

// =============================================================================
// Controls
// =============================================================================

async function loadAllDirs(items) {
  const pending = [];
  for (const item of items) {
    if (item.isDir && item.children === undefined) {
      pending.push(
        fetchDir(item.id).then((children) => {
          item.children = children;
          return loadAllDirs(children);
        }),
      );
    } else if (item.children?.length) {
      pending.push(loadAllDirs(item.children));
    }
  }
  await Promise.all(pending);
}

const expandAllBtn = document.getElementById("btn-expand-all");
if (expandAllBtn) {
  expandAllBtn.addEventListener("click", async () => {
    expandAllBtn.disabled = true;
    expandAllBtn.textContent = "Loading…";
    await loadAllDirs(rootItems());
    list()?.setItems(rootItems());
    list()?.expandAll();
    updateTreeState();
    expandAllBtn.textContent = "Expand";
    expandAllBtn.disabled = false;
  });
}

const collapseAllBtn = document.getElementById("btn-collapse-all");
if (collapseAllBtn) {
  collapseAllBtn.addEventListener("click", () => {
    list()?.collapseAll();
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
// Display toggles
// =============================================================================

const container = document.getElementById("list-container");

const chevronToggle = document.getElementById("toggle-chevrons");
if (chevronToggle) {
  container?.classList.add("hide-chevrons");
  chevronToggle.addEventListener("change", () => {
    container?.classList.toggle("hide-chevrons", !chevronToggle.checked);
  });
}

const branchToggle = document.getElementById("toggle-branches");
if (branchToggle) {
  container?.classList.add("hide-branches");
  branchToggle.addEventListener("change", () => {
    container?.classList.toggle("hide-branches", !branchToggle.checked);
  });
}
