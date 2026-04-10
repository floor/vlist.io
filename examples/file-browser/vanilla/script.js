// File Browser — Finder-like file browser with grid/list views
// Grid view uses withGrid, list view uses withTable for resizable/sortable columns
// Demonstrates switching between two layout modes with shared navigation

import { vlist, withGrid, withGroups, withTable, withSelection } from "vlist";

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
let sortedItems = [];
let currentView = "list";
let currentColumns = 6;
let currentGap = 8;
let list = null;
let navigationHistory = [""];
let historyIndex = 0;
let selectedIndex = -1;
let currentArrangeBy = "none";

// Table sort state
let sortKey = null;
let sortDirection = "asc";

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

function formatDate(dateStr) {
  const now = new Date();
  const modified = new Date(dateStr);
  const isToday =
    now.getFullYear() === modified.getFullYear() &&
    now.getMonth() === modified.getMonth() &&
    now.getDate() === modified.getDate();

  if (isToday) {
    const timeStr = modified.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `Today at ${timeStr}`;
  }

  const month = modified.toLocaleDateString("en-US", { month: "short" });
  const day = modified.getDate();
  const year = modified.getFullYear();
  return `${month} ${day}, ${year}`;
}

function formatPath(path) {
  return path || "/";
}

// =============================================================================
// Date Grouping
// =============================================================================

function getDateGroup(item) {
  const now = new Date();
  const modified = new Date(item.modified);

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

function getNameGroup(item) {
  const first = item.name.charAt(0).toUpperCase();
  if (/[A-Z]/.test(first)) return first;
  if (/[0-9]/.test(first)) return "#";
  return "•";
}

function getSizeGroup(item) {
  if (item.type === "directory") return "—";
  const size = item.size || 0;
  if (size === 0) return "Zero Bytes";
  if (size < 1024) return "Up to 1 KB";
  if (size < 100 * 1024) return "1 KB to 100 KB";
  if (size < 1024 * 1024) return "100 KB to 1 MB";
  if (size < 100 * 1024 * 1024) return "1 MB to 100 MB";
  return "100 MB or Greater";
}

// =============================================================================
// Arrangement / Sorting
// =============================================================================

function getArrangementConfig(arrangeBy) {
  switch (arrangeBy) {
    case "none":
      return {
        groupBy: "none",
        getGroupKey: null,
        sortFn: (a, b) => {
          if (a.type === "directory" && b.type !== "directory") return -1;
          if (a.type !== "directory" && b.type === "directory") return 1;
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        },
      };
    case "name":
      return {
        groupBy: "none",
        getGroupKey: null,
        sortFn: (a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true }),
      };
    case "kind":
      return {
        groupBy: "kind",
        getGroupKey: getFileKind,
        sortFn: (a, b) => {
          const kindA = getFileKind(a);
          const kindB = getFileKind(b);
          if (kindA !== kindB) return kindA.localeCompare(kindB);
          return a.name.localeCompare(b.name, undefined, { numeric: true });
        },
      };
    case "date-modified":
      return {
        groupBy: "date",
        getGroupKey: getDateGroup,
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
          if (orderA !== orderB) return orderA - orderB;
          const dateA = new Date(a.modified).getTime();
          const dateB = new Date(b.modified).getTime();
          if (isNaN(dateA)) return 1;
          if (isNaN(dateB)) return -1;
          return dateB - dateA;
        },
      };
    case "size": {
      const sizeGroupOrder = [
        "—",
        "Zero Bytes",
        "Up to 1 KB",
        "1 KB to 100 KB",
        "100 KB to 1 MB",
        "1 MB to 100 MB",
        "100 MB or Greater",
      ];
      return {
        groupBy: "size",
        getGroupKey: getSizeGroup,
        sortFn: (a, b) => {
          const groupA = getSizeGroup(a);
          const groupB = getSizeGroup(b);
          const orderA = sizeGroupOrder.indexOf(groupA);
          const orderB = sizeGroupOrder.indexOf(groupB);
          if (orderA !== orderB) return orderA - orderB;
          return (b.size || 0) - (a.size || 0);
        },
      };
    }
    default:
      return {
        groupBy: "none",
        getGroupKey: null,
        sortFn: (a, b) => a.name.localeCompare(b.name),
      };
  }
}

// =============================================================================
// Table Column Sorting (for list view)
// =============================================================================

/**
 * Sort items by a column key and direction.
 * Files and folders are interleaved (like macOS Finder column sort).
 */
function sortByColumn(data, key, direction) {
  const dir = direction === "desc" ? -1 : 1;

  return [...data].sort((a, b) => {
    let aVal, bVal;

    switch (key) {
      case "name":
        return a.name.localeCompare(b.name, undefined, { numeric: true }) * dir;

      case "size":
        aVal = a.size || 0;
        bVal = b.size || 0;
        return (aVal - bVal) * dir;

      case "modified":
        aVal = new Date(a.modified).getTime();
        bVal = new Date(b.modified).getTime();
        if (isNaN(aVal)) return 1;
        if (isNaN(bVal)) return -1;
        return (aVal - bVal) * dir;

      case "kind":
        aVal = getFileKind(a);
        bVal = getFileKind(b);
        return aVal.localeCompare(bVal) * dir;

      default:
        return 0;
    }
  });
}

function applyColumnSort(key, direction) {
  sortKey = key;
  sortDirection = direction || "asc";

  if (key === null) {
    // Reset to default name sort
    sortedItems = [...items].sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  } else {
    sortedItems = sortByColumn(items, key, direction);
  }

  if (list && currentView === "list") {
    list.setItems(sortedItems);
  }

  updateSortDetail();
}

// =============================================================================
// Templates
// =============================================================================

// Grid view template — icon + name card
const gridItemTemplate = (item) => {
  const icon = getFileIcon(item);
  return `
    <div class="file-card" data-type="${item.type}">
      <div class="file-card__icon">${icon}</div>
      <div class="file-card__name" title="${item.name}">${item.name}</div>
    </div>
  `;
};

// Fallback template for table (withTable uses cell renderers instead)
const tableRowTemplate = () => "";

// =============================================================================
// Table Column Definitions
// =============================================================================

/** Icon + name cell renderer */
const nameCell = (item) => {
  const icon = getFileIcon(item);
  return `
    <div class="file-name">
      <span class="file-name__icon">${icon}</span>
      <span class="file-name__text">${item.name}</span>
    </div>
  `;
};

/** File size cell renderer */
const sizeCell = (item) => {
  if (item.type === "directory") return "—";
  return item.size != null ? formatFileSize(item.size) : "—";
};

/** Date modified cell renderer */
const dateCell = (item) => {
  return formatDate(item.modified);
};

/** File kind cell renderer */
const kindCell = (item) => {
  return getFileKind(item);
};

const FILE_COLUMNS = [
  {
    key: "name",
    label: "Name",
    width: 350,
    minWidth: 140,
    sortable: true,
    cell: nameCell,
  },
  {
    key: "size",
    label: "Size",
    width: 100,
    minWidth: 70,
    sortable: true,
    align: "right",
    cell: sizeCell,
  },
  {
    key: "modified",
    label: "Date Modified",
    width: 200,
    minWidth: 120,
    sortable: true,
    cell: dateCell,
  },
  {
    key: "kind",
    label: "Kind",
    width: 140,
    minWidth: 80,
    sortable: true,
    cell: kindCell,
  },
];

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

async function createBrowser(view = "list") {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("browser-container");
  container.innerHTML = "";

  currentView = view;

  if (view === "grid") {
    createGridView();
  } else {
    createTableList();
  }

  updateNavigationState();
}

// =============================================================================
// Grid View (withGrid + withGroups)
// =============================================================================

function createGridView() {
  const container = document.getElementById("browser-container");
  const innerWidth = container.clientWidth - 2;
  const colWidth =
    (innerWidth - (currentColumns - 1) * currentGap) / currentColumns;
  const height = colWidth * 0.8;

  const config = getArrangementConfig(currentArrangeBy);
  const sorted = [...items].sort(config.sortFn);

  // Create group map if grouping is enabled
  let groupMap = null;
  if (config.groupBy !== "none" && config.getGroupKey) {
    groupMap = new Map();
    const groupCounts = {};
    sorted.forEach((item, index) => {
      const groupKey = config.getGroupKey(item);
      groupMap.set(index, groupKey);
      groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
    });
  }

  let builder = vlist({
    container: "#browser-container",
    ariaLabel: "File browser",
    item: {
      height,
      template: gridItemTemplate,
    },
    items: sorted,
  }).use(withGrid({ columns: currentColumns, gap: currentGap }));

  if (groupMap) {
    builder = builder.use(
      withGroups({
        getGroupForIndex: (index) => groupMap.get(index) || "",
        header: {
          height: 40,
          template: (groupKey) => {
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
        },
        sticky: true,
      }),
    );
  }

  list = builder.build();

  list.on("item:click", ({ item, index }) => {
    handleItemClick(item, index);
  });

  list.on("item:dblclick", ({ item }) => {
    if (!item.__groupHeader) {
      handleItemDoubleClick(item);
    }
  });
}

// =============================================================================
// List View (withTable + withSelection)
// =============================================================================

function createTableList() {
  const rowHeight = 28;
  const headerHeight = 28;

  // Check if current arrangement has grouping
  const config = getArrangementConfig(currentArrangeBy);
  const hasGroups = config.groupBy !== "none";

  // When grouping is active, use the arrangement sort (groups must be contiguous).
  // Otherwise use column sort or default name sort.
  if (hasGroups) {
    sortedItems = [...items].sort(config.sortFn);
  } else if (sortKey) {
    sortedItems = sortByColumn(items, sortKey, sortDirection);
  } else {
    sortedItems = [...items].sort((a, b) => {
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
  }

  // Build group map if grouping is enabled
  let groupMap = null;
  if (hasGroups && config.getGroupKey) {
    groupMap = new Map();
    const groupCounts = {};
    sortedItems.forEach((item, index) => {
      const groupKey = config.getGroupKey(item);
      groupMap.set(index, groupKey);
      groupCounts[groupKey] = (groupCounts[groupKey] || 0) + 1;
    });
  }

  let builder = vlist({
    container: "#browser-container",
    ariaLabel: "File browser",
    padding: [2, 6],
    item: {
      height: rowHeight,
      striped: "odd",
      template: tableRowTemplate,
    },
    items: sortedItems,
  });

  builder = builder.use(
    withTable({
      columns: FILE_COLUMNS,
      rowHeight,
      headerHeight,
      resizable: true,
      columnBorders: false,
      rowBorders: false,
      minColumnWidth: 50,
      sort: sortKey ? { key: sortKey, direction: sortDirection } : undefined,
    }),
  );

  if (groupMap) {
    builder = builder.use(
      withGroups({
        getGroupForIndex: (index) => groupMap.get(index) || "",
        header: {
          height: 32,
          template: (groupKey) => {
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
        },
        sticky: false,
      }),
    );
  }

  builder = builder.use(withSelection({ mode: "single" }));

  list = builder.build();

  // Column sort — user clicks a sortable header
  list.on("column:sort", ({ key, direction }) => {
    applyColumnSort(direction === null ? null : key, direction);

    if (list.setSort) {
      list.setSort(sortKey, sortDirection);
    }
  });

  // Selection — show detail in panel
  list.on("selection:change", ({ items: selectedItems }) => {
    if (selectedItems.length > 0) {
      showFileDetail(selectedItems[0]);
    } else {
      clearFileDetail();
    }
  });

  // Double-click row to navigate into folder
  list.on("item:dblclick", ({ item }) => {
    if (item && !item.__groupHeader && item.type === "directory") {
      handleItemDoubleClick(item);
    }
  });

  updateSortDetail();
}

// =============================================================================
// Navigation
// =============================================================================

async function navigateTo(path, addToHistory = true) {
  const data = await fetchDirectory(path);
  currentPath = data.path;
  items = data.items.map((item) => ({ ...item, id: item.name }));

  selectedIndex = -1;

  if (addToHistory) {
    navigationHistory = navigationHistory.slice(0, historyIndex + 1);
    navigationHistory.push(path);
    historyIndex = navigationHistory.length - 1;
  }

  await createBrowser(currentView);
  updateBreadcrumb();
  updateNavigationState();
  updateInfo();
}

function handleItemClick(item, index) {
  if (selectedIndex >= 0) {
    const prevEl = document.querySelector(`[data-index="${selectedIndex}"]`);
    if (prevEl) prevEl.setAttribute("aria-selected", "false");
  }

  selectedIndex = index;

  const currentEl = document.querySelector(`[data-index="${index}"]`);
  if (currentEl) currentEl.setAttribute("aria-selected", "true");
}

function handleItemDoubleClick(item) {
  if (item.type === "directory") {
    const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
    selectedIndex = -1;
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
  let html = `<button class="breadcrumb__item" data-path="">root</button>`;
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
// Info Bar Stats
// =============================================================================

const infoItems = document.getElementById("info-items");
const infoPath = document.getElementById("info-path");

function updateInfo() {
  if (infoItems) infoItems.textContent = String(items.length);
  if (infoPath) infoPath.textContent = currentPath ? `/${currentPath}` : "/";
}

// =============================================================================
// Detail Panel — selected file info
// =============================================================================

const detailEl = document.getElementById("file-detail");

function showFileDetail(item) {
  if (!detailEl) return;
  const icon = getFileIcon(item);
  const kind = getFileKind(item);
  const sizeText =
    item.type === "file" && item.size != null ? formatFileSize(item.size) : "—";
  const dateText = formatDate(item.modified);

  detailEl.innerHTML = `
    <div class="file-detail__header">
      <span class="file-detail__icon">${icon}</span>
      <div>
        <div class="file-detail__name">${item.name}</div>
        <div class="file-detail__kind">${kind}</div>
      </div>
    </div>
    <div class="file-detail__meta">
      <span>${sizeText}</span>
      <span>${dateText}</span>
    </div>
  `;
}

function clearFileDetail() {
  if (!detailEl) return;
  detailEl.innerHTML = `
    <span class="ui-detail__empty">Click a row to see details</span>
  `;
}

// =============================================================================
// Sort Detail Panel
// =============================================================================

const sortDetailEl = document.getElementById("sort-detail");

function updateSortDetail() {
  if (!sortDetailEl) return;

  let html = "";

  // Show arrangement info if active
  if (currentArrangeBy !== "none") {
    const arrangeLabels = {
      name: "Name",
      kind: "Kind",
      "date-modified": "Date Modified",
      size: "Size",
    };
    const arrangeLabel = arrangeLabels[currentArrangeBy] || currentArrangeBy;
    html += `
      <div class="sort-info">
        <span class="sort-info__label">Arranged by</span>
        <span class="sort-info__key">${arrangeLabel}</span>
      </div>
    `;
  }

  // Show column sort info if active
  if (sortKey !== null) {
    const arrow = sortDirection === "asc" ? "▲" : "▼";
    const label = sortDirection === "asc" ? "Ascending" : "Descending";
    html += `
      <div class="sort-info">
        <span class="sort-info__label">Sorted by</span>
        <span class="sort-info__key">${sortKey}</span>
        <span class="sort-info__dir">${arrow} ${label}</span>
      </div>
    `;
  }

  if (!html) {
    html = `<span class="ui-detail__empty">Click a column header to sort</span>`;
  }

  sortDetailEl.innerHTML = html;
}

// =============================================================================
// Initialization
// =============================================================================

(async () => {
  // View switcher
  document.getElementById("btn-view-grid").addEventListener("click", () => {
    if (currentView === "grid") return;
    document
      .getElementById("btn-view-grid")
      .classList.add("ui-segmented__btn--active");
    document
      .getElementById("btn-view-list")
      .classList.remove("ui-segmented__btn--active");
    createBrowser("grid");
  });

  document.getElementById("btn-view-list").addEventListener("click", () => {
    if (currentView === "list") return;
    document
      .getElementById("btn-view-list")
      .classList.add("ui-segmented__btn--active");
    document
      .getElementById("btn-view-grid")
      .classList.remove("ui-segmented__btn--active");
    createBrowser("list");
  });

  // Arrange by (still useful for grid view grouping)
  document
    .getElementById("arrange-by-select")
    .addEventListener("change", (e) => {
      currentArrangeBy = e.target.value;
      // Arrange-by controls grouping, not column sort.
      // Reset column sort when changing arrangement, then rebuild.
      sortKey = null;
      sortDirection = "asc";
      createBrowser(currentView);
    });

  // Toolbar navigation
  document.getElementById("btn-back").addEventListener("click", () => {
    navigateBack();
  });

  document.getElementById("btn-forward").addEventListener("click", () => {
    navigateForward();
  });

  // Side panel navigation buttons
  const btnNavBack = document.getElementById("btn-nav-back");
  const btnNavForward = document.getElementById("btn-nav-forward");

  if (btnNavBack) {
    btnNavBack.addEventListener("click", () => {
      navigateBack();
    });
  }

  if (btnNavForward) {
    btnNavForward.addEventListener("click", () => {
      navigateForward();
    });
  }

  // Breadcrumb click handler
  breadcrumbEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-path]");
    if (!btn) return;
    navigateTo(btn.dataset.path);
  });

  // Initial load — start in vlist folder with list view
  await navigateTo("vlist");
})();
