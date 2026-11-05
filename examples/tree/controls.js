// Tree View — sidebar controls, display toggles, and UI state updates

import { list, createList, stats, fetchDir, rootItems } from "./script.js";

// =============================================================================
// UI updates
// =============================================================================

const itemsEl = document.getElementById("info-visible");
const renderedEl = document.getElementById("info-rendered");
const expandedEl = document.getElementById("info-expanded");

export function updateTreeState() {
  const l = list();
  if (!l) return;
  const layout = l.getTreeLayout();
  if (itemsEl) itemsEl.textContent = layout.totalVisible.toLocaleString();
  if (renderedEl) renderedEl.textContent = l.element.querySelector(".vlist-content")?.children.length ?? 0;
  if (expandedEl) expandedEl.textContent = l.getExpanded().length;
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
// Display options
// =============================================================================

const container = document.getElementById("list-container");

function setExpanderMode(mode) {
  if (!container) return;
  container.classList.toggle("hide-chevrons", mode === "none");
  container.classList.toggle("expander-plus-minus", mode === "plus-minus");
}

function setLinesMode(mode) {
  if (!container) return;
  container.classList.toggle("hide-lines", mode === "none");
  container.classList.toggle("hide-branches", mode === "simple");
}

const expanderControl = document.getElementById("expander-control");
if (expanderControl) {
  setExpanderMode("none");
  expanderControl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-expander]");
    if (!btn) return;
    expanderControl.querySelectorAll("[data-expander]").forEach((b) => {
      b.classList.toggle("ui-segmented__btn--active", b === btn);
    });
    setExpanderMode(btn.dataset.expander);
  });
}

const linesControl = document.getElementById("lines-control");
if (linesControl) {
  setLinesMode("simple");
  linesControl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lines]");
    if (!btn) return;
    linesControl.querySelectorAll("[data-lines]").forEach((b) => {
      b.classList.toggle("ui-segmented__btn--active", b === btn);
    });
    setLinesMode(btn.dataset.lines);
  });
}
