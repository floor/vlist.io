// Track List - Pure Vanilla JavaScript with Async Loading
// Demonstrates vlist with lazy-loaded SQLite data, fetching tracks in chunks of 25

import { vlist, withSelection, withAsync } from "vlist";
import {
  API_BASE,
  trackTemplate,
  formatSelectionCount,
  calculateMemorySaved,
  formatDuration,
  escapeHtml,
} from "./shared.js";

// =============================================================================
// Constants
// =============================================================================

const CHUNK_SIZE = 25;
const ITEM_HEIGHT = 80;

// =============================================================================
// State
// =============================================================================

let list = null;
let totalTracks = 0;
let currentSelectionMode = "single";
let loadRequests = 0;
let loadedCount = 0;

let currentFilters = {
  search: "",
  country: "",
  decade: "",
  approved: "",
};

// =============================================================================
// Adapter - fetches tracks from SQLite API in chunks
// =============================================================================

function buildParams(offset, limit) {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    sort: "id",
    direction: "desc",
  });

  if (currentFilters.search) params.set("search", currentFilters.search);
  if (currentFilters.country) params.set("country", currentFilters.country);
  if (currentFilters.decade) params.set("decade", currentFilters.decade);
  if (currentFilters.approved) params.set("approved", currentFilters.approved);

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
// DOM References
// =============================================================================

// Selection
const selectionModeEl = document.getElementById("selection-mode");
const btnSelectAll = document.getElementById("btn-select-all");
const btnClear = document.getElementById("btn-clear");
const selectionCountEl = document.getElementById("selection-count");

// Actions
const btnAddTrack = document.getElementById("btn-add-track");
const btnDeleteSelected = document.getElementById("btn-delete-selected");
const btnRefresh = document.getElementById("btn-refresh");

// =============================================================================
// Create List
// =============================================================================

function createList(mode) {
  if (list) {
    list.destroy();
  }

  loadRequests = 0;
  loadedCount = 0;

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Track list",
    item: {
      height: ITEM_HEIGHT,
      template: trackTemplate,
    },
  });

  builder.use(
    withAsync({
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
    }),
  );

  builder.use(withSelection({ mode }));

  list = builder.build();
  bindListEvents();
}

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
  }
  list.selectAll();
});

btnClear.addEventListener("click", () => {
  list.clearSelection();
});

function updateSelectionCount(selected) {
  selectionCountEl.textContent = formatSelectionCount(selected.length);
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
    approved: false,
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

async function deleteSelected() {
  const selected = list.getSelected();
  if (selected.length === 0) return;

  const items = list.getSelectedItems();

  // DEBUG
  console.log(`[delete] selected IDs:`, selected);
  console.log(
    `[delete] selected items:`,
    items.map((t) => ({ id: t.id, title: t.title })),
  );

  // Capture the resolved index of the first selected item BEFORE deletion.
  // After removal, whatever item shifts into this index is the "next" one.
  const selectedIds = items.map((t) => t.id);
  console.log(`[delete] selected item ids for index lookup:`, selectedIds);

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
      // Peek at the element in the DOM to find its data-index
      const container = list.element;
      const el = container?.querySelector(`[data-id="${track.id}"]`);
      const index = el ? parseInt(el.dataset.index, 10) : -1;
      console.log(`[delete] id=${track.id} → DOM index=${index}`);
      return { track, index };
    })
    .filter((e) => e.index >= 0)
    .sort((a, b) => b.index - a.index); // highest index first

  deleteOrder.forEach(({ track, index }) => {
    console.log(
      `[delete] calling removeItem(${track.id}) — title="${track.title}", index=${index}`,
    );
    const result = list.removeItem(track.id);
    console.log(`[delete] removeItem(${track.id}) returned ${result}`);
    if (result && index < lowestDeletedIndex) {
      lowestDeletedIndex = index;
    }
  });

  list.clearSelection();

  // Auto-select the item that is now at the deleted position
  if (
    list.total > 0 &&
    currentSelectionMode !== "none" &&
    lowestDeletedIndex < Infinity
  ) {
    // After deletion, the item that was below shifted into this index.
    // Clamp to total-1 in case we deleted the last item.
    const targetIndex = Math.min(lowestDeletedIndex, list.total - 1);
    console.log(
      `[auto-select] lowestDeletedIndex=${lowestDeletedIndex}, targetIndex=${targetIndex}, total=${list.total}`,
    );

    requestAnimationFrame(() => {
      // Find the item now rendered at targetIndex by querying the DOM
      const container = list.element;
      const el = container?.querySelector(`[data-index="${targetIndex}"]`);
      const id = el?.dataset.id;
      console.log(
        `[auto-select] DOM element at index ${targetIndex}: id=${id}`,
      );

      if (id && !id.startsWith("__placeholder_")) {
        const numId = Number(id);
        const selectId = Number.isFinite(numId) ? numId : id;
        list.select(selectId);
        console.log(
          `[auto-select] selected id=${selectId}, getSelected():`,
          list.getSelected(),
        );
      } else {
        console.log(`[auto-select] no valid item at index ${targetIndex}`);
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

btnRefresh.addEventListener("click", async () => {
  loadedCount = 0;
  await list.reload();
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
  });
}

// =============================================================================
// Initialize
// =============================================================================

async function init() {
  createList(currentSelectionMode);
}

init();
