// Track List - Pure Vanilla JavaScript with Async Loading
// Demonstrates vlist with lazy-loaded SQLite data, fetching tracks in chunks of 25
// Layout mode toggle: List ↔ Grid ↔ Table

import {
  vlist,
  withSelection,
  withAsync,
  withGrid,
  withTable,
  withScrollbar,
  withScale,
  withSnapshots,
} from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import {
  API_BASE,
  trackTemplate,
  trackGridTemplate,
  trackTableColumns,
  trackTableRowTemplate,
  formatSelectionCount,
  formatDuration,
  escapeHtml,
} from "./shared.js";

// =============================================================================
// Constants
// =============================================================================

const CHUNK_SIZE = 25;
const ITEM_HEIGHT = 56;
const GRID_COLUMNS = 4;
const GRID_GAP = 8;
const TABLE_ROW_HEIGHT = 36;
const TABLE_HEADER_HEIGHT = 36;

// =============================================================================
// State
// =============================================================================

let list = null;
let totalTracks = 0;
let currentSelectionMode = "single";
let currentLayoutMode = "list";
let currentScrollbarEnabled = false;
let currentScaleEnabled = false;
let currentFocusOnClick = false;
let loadRequests = 0;
let loadedCount = 0;

let currentSort = { key: "id", direction: "desc" };
let currentColumnWidths = null; // persists across rebuilds

let currentFilters = {
  search: "",
  country: "",
  decade: "",
};

// =============================================================================
// Adapter - fetches tracks from SQLite API in chunks
// =============================================================================

function buildParams(offset, limit) {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    sort: currentSort.key,
    direction: currentSort.direction,
  });

  if (currentFilters.search) params.set("search", currentFilters.search);
  if (currentFilters.country) params.set("country", currentFilters.country);
  if (currentFilters.decade) params.set("decade", currentFilters.decade);

  return params;
}

const tracksAdapter = {
  read: async ({ offset, limit }) => {
    loadRequests++;

    const params = buildParams(offset, limit);
    const res = await fetch(`${API_BASE}?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    totalTracks = data.total;
    loadedCount += data.items.length;

    return {
      items: data.items,
      total: data.total,
      hasMore: data.hasMore,
    };
  },
};

// =============================================================================
// Stats — info bar (progress, velocity, visible/total)
// =============================================================================

function getEffectiveItemHeight() {
  if (currentLayoutMode === "table") return TABLE_ROW_HEIGHT;
  if (currentLayoutMode === "grid") {
    const container = document.getElementById("list-container");
    if (!container) return 200;
    const innerWidth = container.clientWidth - 2;
    const colWidth =
      (innerWidth - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
    return Math.round(colWidth * 1.3);
  }
  return ITEM_HEIGHT;
}

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => totalTracks,
  getItemSize: () => getEffectiveItemHeight(),
  getColumns: () => (currentLayoutMode === "grid" ? GRID_COLUMNS : 1),
  getContainerSize: () => {
    const el = document.getElementById("list-container");
    return el ? el.clientHeight : 0;
  },
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// DOM References
// =============================================================================

// Layout
const layoutModeEl = document.getElementById("layout-mode");
const scrollbarToggle = document.getElementById("scrollbar-toggle");
const scaleToggle = document.getElementById("scale-toggle");
const focusOnClickToggle = document.getElementById("focus-on-click-toggle");

// Selection
const selectionModeEl = document.getElementById("selection-mode");
const btnSelectAll = document.getElementById("btn-select-all");
const btnClear = document.getElementById("btn-clear");
const selectionCountEl = document.getElementById("selection-count");

// Actions
const btnAddTrack = document.getElementById("btn-add-track");
const btnDeleteSelected = document.getElementById("btn-delete-selected");

// =============================================================================
// Async plugin config (shared across all modes)
// =============================================================================

function getAsyncConfig() {
  return {
    adapter: tracksAdapter,
    autoLoad: true,
    storage: {
      chunkSize: CHUNK_SIZE,
      maxCachedItems: 2000,
    },
    loading: {
      cancelThreshold: 8,
      preloadThreshold: 2,
      preloadAhead: 25,
    },
  };
}

// =============================================================================
// Create List — dispatches to the correct view builder
// =============================================================================

function createList(selectionMode) {
  // Capture snapshot before destroying so we can restore scroll + selection
  let snapshot = null;
  if (list) {
    try {
      snapshot = list.getScrollSnapshot();
    } catch {}
    list.destroy();
  }

  loadRequests = 0;
  loadedCount = 0;

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  if (currentLayoutMode === "grid") {
    createGridView(selectionMode, snapshot);
  } else if (currentLayoutMode === "table") {
    createTableView(selectionMode, snapshot);
  } else {
    createListView(selectionMode, snapshot);
  }

  bindListEvents();
  updateInfo();
  updateContext();
}

// =============================================================================
// Apply scrollbar feature to builder if enabled
// =============================================================================

function applyScrollbar(builder) {
  if (currentScrollbarEnabled) {
    builder.use(
      withScrollbar({
        autoHide: true,
        autoHideDelay: 1000,
        showOnHover: true,
        showOnViewportEnter: true,
      }),
    );
  }
  return builder;
}

// =============================================================================
// Apply scale feature to builder if enabled
// =============================================================================

function applyScale(builder) {
  if (currentScaleEnabled) {
    builder.use(withScale({ force: true }));
  }
  return builder;
}

// =============================================================================
// List View (default — vertical list with 80px rows)
// =============================================================================

function createListView(selectionMode, snapshot) {
  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Track list",
    item: {
      height: ITEM_HEIGHT,
      template: trackTemplate,
    },
  });

  builder.use(withAsync(getAsyncConfig()));
  applyScale(builder);
  applyScrollbar(builder);
  builder.use(
    withSelection({ mode: selectionMode, focusOnClick: currentFocusOnClick }),
  );
  builder.use(withSnapshots(snapshot ? { restore: snapshot } : undefined));

  list = builder.build();
}

// =============================================================================
// Grid View (withGrid — card layout)
// =============================================================================

function createGridView(selectionMode, snapshot) {
  const container = document.getElementById("list-container");
  const innerWidth = container.clientWidth - 2;
  const colWidth = (innerWidth - (GRID_COLUMNS - 1) * GRID_GAP) / GRID_COLUMNS;
  const cardHeight = Math.round(colWidth * 1.3);

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Track list",
    item: {
      height: (_index, ctx) =>
        ctx ? Math.round(ctx.columnWidth * 1.3) : cardHeight,
      template: trackGridTemplate,
    },
  });

  builder.use(withAsync(getAsyncConfig()));
  builder.use(withGrid({ columns: GRID_COLUMNS, gap: GRID_GAP }));
  applyScale(builder);
  applyScrollbar(builder);
  builder.use(
    withSelection({ mode: selectionMode, focusOnClick: currentFocusOnClick }),
  );
  builder.use(withSnapshots(snapshot ? { restore: snapshot } : undefined));

  list = builder.build();
}

function createTableView(selectionMode, snapshot) {
  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Track list",
    item: {
      height: TABLE_ROW_HEIGHT,
      striped: "odd",
      template: trackTableRowTemplate,
    },
  });

  builder.use(withAsync(getAsyncConfig()));
  const columns = currentColumnWidths
    ? trackTableColumns.map((col) => ({
        ...col,
        width: currentColumnWidths[col.key] ?? col.width,
      }))
    : trackTableColumns;

  builder.use(
    withTable({
      columns,
      rowHeight: TABLE_ROW_HEIGHT,
      headerHeight: TABLE_HEADER_HEIGHT,
      resizable: true,
      columnBorders: false,
      rowBorders: false,
      minColumnWidth: 50,
      sort: currentSort.key !== "id"
        ? { key: currentSort.key, direction: currentSort.direction }
        : undefined,
    }),
  );
  applyScale(builder);
  applyScrollbar(builder);
  builder.use(
    withSelection({ mode: selectionMode, focusOnClick: currentFocusOnClick }),
  );
  builder.use(withSnapshots(snapshot ? { restore: snapshot } : undefined));

  list = builder.build();

  list.on("column:resize", ({ key, width }) => {
    if (!currentColumnWidths) currentColumnWidths = {};
    currentColumnWidths[key] = width;
  });

  list.on("column:sort", ({ key, direction }) => {
    if (direction === null) {
      currentSort = { key: "id", direction: "desc" };
    } else {
      currentSort = { key, direction };
    }
    list.reload();
  });
}

// =============================================================================
// Layout Mode — List ↔ Grid ↔ Table
// =============================================================================

function setLayoutMode(mode) {
  if (mode === currentLayoutMode) return;
  currentLayoutMode = mode;

  layoutModeEl.querySelectorAll(".ui-segmented__btn").forEach((btn) => {
    btn.classList.toggle(
      "ui-segmented__btn--active",
      btn.dataset.mode === mode,
    );
  });

  // Toggle container class for mode-specific styling
  const container = document.getElementById("list-container");
  container.classList.remove("mode-list", "mode-grid", "mode-table");
  container.classList.add(`mode-${mode}`);

  // Grid/table need more width — add split-main--full
  const splitMain = container.closest(".split-main");
  if (splitMain) {
    splitMain.classList.toggle("split-main--full", mode !== "list");
  }

  createList(currentSelectionMode);
  updateSelectionCount([]);
}

// =============================================================================
// Info bar — right side (contextual)
// =============================================================================

const infoMode = document.getElementById("info-mode");

function updateContext() {
  if (infoMode) infoMode.textContent = currentLayoutMode;
}

layoutModeEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (btn) setLayoutMode(btn.dataset.mode);
});

// =============================================================================
// Scrollbar Toggle
// =============================================================================

scrollbarToggle.addEventListener("change", (e) => {
  currentScrollbarEnabled = e.target.checked;
  createList(currentSelectionMode);
});

// =============================================================================
// Scale Toggle
// =============================================================================

scaleToggle.addEventListener("change", (e) => {
  currentScaleEnabled = e.target.checked;
  // Scale forces custom scrollbar — lock the toggle on when scale is active
  if (currentScaleEnabled) {
    scrollbarToggle.checked = true;
    scrollbarToggle.disabled = true;
    currentScrollbarEnabled = true;
  } else {
    scrollbarToggle.disabled = false;
  }
  createList(currentSelectionMode);
});

// =============================================================================
// Focus on Click Toggle
// =============================================================================

focusOnClickToggle.addEventListener("change", (e) => {
  currentFocusOnClick = e.target.checked;
  createList(currentSelectionMode);
});

// =============================================================================
// Selection
// =============================================================================

function setSelectionMode(mode) {
  if (mode === currentSelectionMode) return;
  currentSelectionMode = mode;

  selectionModeEl.querySelectorAll(".ui-segmented__btn").forEach((btn) => {
    btn.classList.toggle(
      "ui-segmented__btn--active",
      btn.dataset.value === mode,
    );
  });

  createList(mode);
  updateSelectionCount([]);
}

selectionModeEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".ui-segmented__btn");
  if (btn) setSelectionMode(btn.dataset.value);
});

btnSelectAll.addEventListener("click", () => {
  if (currentSelectionMode !== "multiple") {
    setSelectionMode("multiple");
    // List was recreated — wait for async data to load before selecting
    const unsub = list.on("load:end", () => {
      unsub();
      list.selectAll();
    });
  } else {
    list.selectAll();
  }
});

btnClear.addEventListener("click", () => {
  list.clearSelection();
});

function updateSelectionCount(selected) {
  selectionCountEl.textContent = formatSelectionCount(selected.length);
  btnDeleteSelected.disabled = selected.length === 0;
}

// =============================================================================
// CRUD Operations
// =============================================================================

btnAddTrack.addEventListener("click", async () => {
  const title = prompt("Track title:");
  if (!title) return;

  const artist = prompt("Artist name:");
  if (!artist) return;

  const year = prompt("Year (optional):");
  const country = prompt("Country code (optional, e.g., USA):");

  const trackData = {
    title,
    artist,
    year: year ? parseInt(year, 10) : null,
    country: country || null,
  };

  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trackData),
    });

    if (!response.ok) throw new Error("Failed to create track");

    alert("Track created successfully!");
    loadedCount = 0;
    await list.reload();
  } catch (error) {
    alert("Failed to create track: " + error.message);
  }
});

const MAX_DELETE = 25;

async function deleteSelected() {
  const selected = list.getSelected();
  if (selected.length === 0) return;

  if (selected.length > MAX_DELETE) {
    alert(
      `You can delete up to ${MAX_DELETE} tracks at a time to keep the demo functional.`,
    );
    return;
  }

  const items = list.getSelectedItems();

  // Delete from server
  const promises = items.map((track) =>
    fetch(`${API_BASE}/${track.id}`, { method: "DELETE" }),
  );

  await Promise.all(promises);

  // Remove each item from the list, tracking the lowest index for auto-select.
  // We delete from highest index to lowest so earlier deletions don't shift
  // the indices of later ones.
  let lowestDeletedIndex = Infinity;

  // Build id→index map before any deletion
  const deleteOrder = items
    .map((track) => {
      const container = list.element;
      const el = container?.querySelector(`[data-id="${track.id}"]`);
      const index = el ? parseInt(el.dataset.index, 10) : -1;
      return { track, index };
    })
    .filter((e) => e.index >= 0)
    .sort((a, b) => b.index - a.index); // highest index first

  deleteOrder.forEach(({ track, index }) => {
    const result = list.removeItem(track.id);
    if (result && index < lowestDeletedIndex) {
      lowestDeletedIndex = index;
    }
  });

  totalTracks = list.total;
  list.clearSelection();
  updateInfo();

  // Auto-select the item that is now at the deleted position
  if (
    list.total > 0 &&
    currentSelectionMode !== "none" &&
    lowestDeletedIndex < Infinity
  ) {
    const targetIndex = Math.min(lowestDeletedIndex, list.total - 1);

    requestAnimationFrame(() => {
      const container = list.element;
      const el = container?.querySelector(`[data-index="${targetIndex}"]`);
      const id = el?.dataset.id;

      if (id && !id.startsWith("__placeholder_")) {
        const numId = Number(id);
        const selectId = Number.isFinite(numId) ? numId : id;
        list.select(selectId);
      }
    });
  }
}

btnDeleteSelected.addEventListener("click", deleteSelected);

// Keyboard shortcut: Delete/Backspace to delete selected item
document.addEventListener("keydown", (e) => {
  if (e.key === "Delete" || e.key === "Backspace") {
    // Don't trigger if user is typing in an input
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    e.preventDefault();
    deleteSelected();
  }
});

// =============================================================================
// Event Bindings
// =============================================================================

function bindListEvents() {
  list.on("selection:change", ({ selected }) => {
    updateSelectionCount(selected);
  });

  list.on("load:end", ({ items, total }) => {
    totalTracks = total;
    updateInfo();
  });

  list.on("scroll", updateInfo);

  list.on("range:change", updateInfo);

  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
}

// =============================================================================
// Initialize
// =============================================================================

async function init() {
  createList(currentSelectionMode);
}

init();
