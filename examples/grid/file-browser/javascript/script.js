// Builder Grid — File Browser
// Uses vlist/builder with withGrid plugin for grid view and standard list for list view
// Demonstrates a virtualized file browser similar to macOS Finder

import { vlist, withGrid, withScrollbar, withSections } from "vlist";

// =============================================================================
// File Type Icons
// =============================================================================

const FILE_ICONS = {
  folder: "📁",
  js: "📄",
  ts: "📘",
  json: "📋",
  html: "🌐",
  css: "🎨",
  scss: "🎨",
  md: "📝",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
  gif: "🖼️",
  svg: "🖼️",
  txt: "📄",
  pdf: "📕",
  zip: "📦",
  default: "📄",
};

function getFileIcon(item) {
  if (item.type === "directory") return FILE_ICONS.folder;
  const ext = item.extension;
  return FILE_ICONS[ext] || FILE_ICONS.default;
}

function getFileKind(item) {
  if (item.type === "directory") return "Folder";
  const ext = item.extension;

  const kindMap = {
    js: "JavaScript",
    ts: "TypeScript",
    json: "JSON",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    md: "Markdown",
    txt: "Text",
    png: "PNG Image",
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    gif: "GIF Image",
    svg: "SVG Image",
    pdf: "PDF",
    zip: "Archive",
    gz: "Archive",
    tar: "Archive",
  };

  return kindMap[ext] || (ext ? ext.toUpperCase() : "Document");
}

// =============================================================================
// State
// =============================================================================

let currentPath = "";
let items = [];
let currentView = "list";
let currentColumns = 6;
let currentGap = 8;
let list = null;
let navigationHistory = [""];
let historyIndex = 0;
let selectedIndex = -1;
let currentArrangeBy = "name";

// =============================================================================
// Templates
// =============================================================================

const gridItemTemplate = (item) => {
  const icon = getFileIcon(item);

  return `
    <div class="file-card">
      <div class="file-card__icon">
        ${icon}
      </div>
      <div class="file-card__name" title="${item.name}">
        ${item.name}
      </div>
    </div>
  `;
};

const listItemTemplate = (item) => {
  const icon = getFileIcon(item);
  const sizeText =
    item.type === "file" && item.size != null ? formatFileSize(item.size) : "—";
  const kind = getFileKind(item);

  // Format date
  const now = new Date();
  const modified = new Date(item.modified);
  const isToday =
    now.getFullYear() === modified.getFullYear() &&
    now.getMonth() === modified.getMonth() &&
    now.getDate() === modified.getDate();

  let dateText = "";
  if (isToday) {
    const timeStr = modified.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    dateText = `Today at ${timeStr}`;
  } else {
    const month = modified.toLocaleDateString("en-US", { month: "short" });
    const day = modified.getDate();
    const year = modified.getFullYear();
    dateText = `${month} ${day}, ${year}`;
  }

  return `
    <div class="file-row">
      <div class="file-row__icon">
        ${icon}
      </div>
      <div class="file-row__name">${item.name}</div>
      <div class="file-row__size">${sizeText}</div>
      <div class="file-row__date">${dateText}</div>
      <div class="file-row__kind">${kind}</div>
    </div>
  `;
};

// =============================================================================
// Date Grouping
// =============================================================================

function getDateGroup(item) {
  const now = new Date();
  const modified = new Date(item.modified);

  // Check if today
  if (
    now.getFullYear() === modified.getFullYear() &&
    now.getMonth() === modified.getMonth() &&
    now.getDate() === modified.getDate()
  ) {
    return "Today";
  }

  const diffTime = Math.abs(now - modified);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 7) return "Previous 7 Days";
  if (diffDays <= 30) return "Previous 30 Days";
  return "Older";
}

// Get arrangement configuration
function getArrangementConfig(arrangeBy) {
  switch (arrangeBy) {
    case "name":
      return {
        groupBy: "none",
        sortFn: (a, b) => {
          // Folders first
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          // Then alphabetically
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        },
      };
    case "kind":
      return {
        groupBy: "kind",
        sortFn: (a, b) => {
          const kindA = getFileKind(a);
          const kindB = getFileKind(b);
          if (kindA !== kindB) {
            return kindA.localeCompare(kindB);
          }
          // Within same kind, sort by name
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        },
      };
    case "date-modified":
      return {
        groupBy: "date",
        sortFn: (a, b) => {
          const groupA = getDateGroup(a);
          const groupB = getDateGroup(b);
          const groupOrder = [
            "Today",
            "Previous 7 Days",
            "Previous 30 Days",
            "Older",
          ];
          const orderA = groupOrder.indexOf(groupA);
          const orderB = groupOrder.indexOf(groupB);
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          // Within same group, sort by date (newest first)
          const dateA = new Date(a.modified).getTime();
          const dateB = new Date(b.modified).getTime();
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateB - dateA;
        },
      };
    case "size":
      return {
        groupBy: "none",
        sortFn: (a, b) => {
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return (b.size || 0) - (a.size || 0); // Largest first
        },
      };
    default:
      return {
        groupBy: "none",
        sortFn: (a, b) => a.name.localeCompare(b.name),
      };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function formatPath(path) {
  return path || "/";
}

// =============================================================================
// API
// =============================================================================

async function fetchDirectory(path) {
  try {
    const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch directory:", error);
    return { path, items: [] };
  }
}

// =============================================================================
// View Creation
// =============================================================================

async function createBrowser(view = "grid") {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }

  // Clear container
  const container = document.getElementById("browser-container");
  container.innerHTML = "";

  currentView = view;

  if (view === "grid") {
    createGridView();
  } else {
    createListView();
  }

  updateNavigationState();
}

function createGridView() {
  const container = document.getElementById("browser-container");
  const innerWidth = container.clientWidth - 2;
  const colWidth =
    (innerWidth - (currentColumns - 1) * currentGap) / currentColumns;
  const height = colWidth * 0.8; // Icon + text

  // Get arrangement config (grouping + sorting)
  const config = getArrangementConfig(currentArrangeBy);
  const sorted = [...items].sort(config.sortFn);

  // Create group map if grouping is enabled
  let groupMap = null;
  if (config.groupBy !== "none") {
    groupMap = new Map();
    const groupCounts = {};
    sorted.forEach((item, index) => {
      const groupKey =
        config.groupBy === "date" ? getDateGroup(item) : getFileKind(item);
      groupMap.set(index, groupKey);
      groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
    });
  }

  // Hide list header in grid view
  const listHeader = document.getElementById("list-header");
  if (listHeader) listHeader.style.display = "none";

  // Create list with builder pattern
  let builder = vlist({
    container: "#browser-container",
    ariaLabel: "File browser",
    item: {
      height,
      template: gridItemTemplate,
    },
    items: sorted,
  })
    .use(withGrid({ columns: currentColumns, gap: currentGap }))
    .use(withScrollbar({ autoHide: true }));

  // Add groups plugin if grouping is enabled
  if (config.groupBy !== "none" && groupMap) {
    builder = builder.use(
      withSections({
        getGroupForIndex: (index) => groupMap.get(index) || "",
        headerHeight: 40,
        headerTemplate: (groupKey) => {
          // Count items in this group
          let count = 0;
          groupMap.forEach((key) => {
            if (key === groupKey) count++;
          });
          return `
          <div class="group-header">
            <span class="group-header__label">${groupKey}</span>
            <span class="group-header__count">${count} items</span>
          </div>
        `;
        },
        sticky: true,
      }),
    );
  }

  list = builder.build();

  // Bind events

  list.on("item:click", ({ item, index }) => {
    handleItemClick(item, index);
  });

  list.on("item:dblclick", ({ item, index }) => {
    if (!item.__groupHeader) {
      handleItemDoubleClick(item);
    }
  });
}

function createListView() {
  const height = 28; // Fixed row height for list view

  // Get arrangement config (grouping + sorting)
  const config = getArrangementConfig(currentArrangeBy);
  const sorted = [...items].sort(config.sortFn);

  // Show list header
  const listHeader = document.getElementById("list-header");
  if (listHeader) listHeader.style.display = "grid";

  // Create group map if grouping is enabled
  let groupMap = null;
  if (config.groupBy !== "none") {
    groupMap = new Map();
    const groupCounts = {};
    sorted.forEach((item, index) => {
      const groupKey =
        config.groupBy === "date" ? getDateGroup(item) : getFileKind(item);
      groupMap.set(index, groupKey);
      groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
    });
    console.log("🔍 List View Grouping Debug:", {
      arrangeBy: currentArrangeBy,
      groupBy: config.groupBy,
      totalItems: sorted.length,
      groupCounts,
      firstTenGroups: Array.from(
        { length: Math.min(10, sorted.length) },
        (_, i) => ({
          index: i,
          name: sorted[i].name,
          type: sorted[i].type,
          kind: getFileKind(sorted[i]),
          dateGroup: getDateGroup(sorted[i]),
          assignedGroup: groupMap.get(i),
        }),
      ),
    });
  }

  // Create list with builder pattern
  let builder = vlist({
    container: "#browser-container",
    ariaLabel: "File browser",
    item: {
      height,
      template: listItemTemplate,
    },
    items: sorted,
  }).use(withScrollbar({ autoHide: true }));

  // Add groups plugin if grouping is enabled
  if (config.groupBy !== "none" && groupMap) {
    builder = builder.use(
      withSections({
        getGroupForIndex: (index) => groupMap.get(index) || "",
        headerHeight: 40,
        headerTemplate: (groupKey) => {
          // Count items in this group
          let count = 0;
          groupMap.forEach((key) => {
            if (key === groupKey) count++;
          });
          return `
          <div class="group-header">
            <span class="group-header__label">${groupKey}</span>
            <span class="group-header__count">${count} items</span>
          </div>
        `;
        },
        sticky: true,
      }),
    );
  }

  list = builder.build();

  // Bind events

  list.on("item:click", ({ item, index }) => {
    handleItemClick(item, index);
  });

  list.on("item:dblclick", ({ item, index }) => {
    console.log("🖱️🖱️ List dblclick event fired:", {
      item,
      index,
      type: item.type,
      name: item.name,
    });
    if (!item.__groupHeader) {
      console.log("📁 Calling handleItemDoubleClick for:", item.name);
      handleItemDoubleClick(item);
    } else {
      console.log("⚠️ Skipping group header");
    }
  });
}

// =============================================================================
// Navigation
// =============================================================================

async function navigateTo(path, addToHistory = true) {
  const data = await fetchDirectory(path);
  currentPath = data.path;
  items = data.items;

  // Clear selection when navigating
  selectedIndex = -1;

  // Update history
  if (addToHistory) {
    // Remove any forward history
    navigationHistory = navigationHistory.slice(0, historyIndex + 1);
    navigationHistory.push(path);
    historyIndex = navigationHistory.length - 1;
  }

  await createBrowser(currentView);
  updateBreadcrumb();
  updateNavigationState();
}

function handleItemClick(item, index) {
  // Update selection state
  if (selectedIndex >= 0) {
    // Deselect previous
    const prevEl = document.querySelector(`[data-index="${selectedIndex}"]`);
    if (prevEl) prevEl.setAttribute("aria-selected", "false");
  }

  selectedIndex = index;

  // Select current
  const currentEl = document.querySelector(`[data-index="${index}"]`);
  if (currentEl) currentEl.setAttribute("aria-selected", "true");
}

function handleItemDoubleClick(item) {
  if (item.type === "directory") {
    const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    selectedIndex = -1; // Clear selection when navigating
    navigateTo(newPath);
  }
}

async function navigateBack() {
  if (historyIndex > 0) {
    historyIndex--;
    await navigateTo(navigationHistory[historyIndex], false);
  }
}

async function navigateForward() {
  if (historyIndex < navigationHistory.length - 1) {
    historyIndex++;
    await navigateTo(navigationHistory[historyIndex], false);
  }
}

// =============================================================================
// UI Updates
// =============================================================================

const breadcrumbEl = document.getElementById("breadcrumb");

function updateBreadcrumb() {
  const parts = currentPath ? currentPath.split("/") : [];
  let html = `<button class="breadcrumb__item" data-path="">home</button>`;
  let pathSoFar = "";

  parts.forEach((part, index) => {
    pathSoFar += (index > 0 ? "/" : "") + part;
    html += `<span class="breadcrumb__sep">›</span>`;
    html += `<button class="breadcrumb__item" data-path="${pathSoFar}">${part}</button>`;
  });

  breadcrumbEl.innerHTML = html;
}

function updateNavigationState() {
  const backBtn = document.getElementById("btn-back");
  const forwardBtn = document.getElementById("btn-forward");
  backBtn.disabled = historyIndex <= 0;
  forwardBtn.disabled = historyIndex >= navigationHistory.length - 1;
}

// =============================================================================
// Initialization
// =============================================================================

(async () => {
  // Set up view switcher
  document.getElementById("btn-view-grid").addEventListener("click", () => {
    if (currentView === "grid") return;
    document.getElementById("btn-view-grid").classList.add("view-btn--active");
    document
      .getElementById("btn-view-list")
      .classList.remove("view-btn--active");
    createBrowser("grid");
  });

  document.getElementById("btn-view-list").addEventListener("click", () => {
    if (currentView === "list") return;
    document.getElementById("btn-view-list").classList.add("view-btn--active");
    document
      .getElementById("btn-view-grid")
      .classList.remove("view-btn--active");
    createBrowser("list");
  });

  // Set up arrange by
  document
    .getElementById("arrange-by-select")
    .addEventListener("change", (e) => {
      currentArrangeBy = e.target.value;
      createBrowser(currentView);
    });

  // Set up navigation
  document.getElementById("btn-back").addEventListener("click", () => {
    navigateBack();
  });

  document.getElementById("btn-forward").addEventListener("click", () => {
    navigateForward();
  });

  // Breadcrumb click handler
  breadcrumbEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-path]");
    if (!btn) return;
    navigateTo(btn.dataset.path);
  });

  // Initial load - start in vlist folder with list view
  await navigateTo("vlist");
})();
