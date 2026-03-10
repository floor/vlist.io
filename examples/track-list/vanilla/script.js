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
} from "../shared.js";

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

// Detail
const trackDetailEl = document.getElementById("track-detail");

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

btnDeleteSelected.addEventListener("click", async () => {
  const selected = list.getSelection();
  if (selected.length === 0) {
    alert("No tracks selected");
    return;
  }

  if (
    !confirm(`Are you sure you want to delete ${selected.length} track(s)?`)
  ) {
    return;
  }

  const items = list.getItems(selected);
  const promises = items.map((track) =>
    fetch(`${API_BASE}/${track.id}`, { method: "DELETE" }),
  );

  const results = await Promise.all(promises);
  const successCount = results.filter((r) => r.ok).length;

  alert(`Deleted ${successCount} of ${selected.length} track(s)`);

  loadedCount = 0;
  await list.reload();
  list.clearSelection();
});

btnRefresh.addEventListener("click", async () => {
  loadedCount = 0;
  await list.reload();
});

// =============================================================================
// Track Detail
// =============================================================================

function showTrackDetail(track, index) {
  // Guard against placeholder items
  if (!track || !track.title || String(track.id).startsWith("__placeholder")) {
    return;
  }

  const duration = track.duration ? formatDuration(track.duration) : "Unknown";
  const year = track.year || "Unknown";
  const country = track.country || "Unknown";
  const decade = track.decade ? `${track.decade}s` : "Unknown";
  const category = track.category || "Unknown";
  const approved = track.approved ? "Yes" : "No";

  trackDetailEl.innerHTML = `
    <div class="ui-detail__header">
      <div>
        <div class="ui-detail__title">${escapeHtml(track.title)}</div>
        <div class="ui-detail__artist">${escapeHtml(track.artist)}</div>
      </div>
    </div>
    <div class="ui-detail__meta">
      <div><strong>ID:</strong> ${track.id}</div>
      <div><strong>Index:</strong> ${index}</div>
      <div><strong>Year:</strong> ${year}</div>
      <div><strong>Country:</strong> ${country}</div>
      <div><strong>Decade:</strong> ${decade}</div>
      <div><strong>Duration:</strong> ${duration}</div>
      <div><strong>Category:</strong> ${category}</div>
      <div><strong>Approved:</strong> ${approved}</div>
    </div>
    <div class="ui-detail__actions">
      <button class="ui-btn ui-btn--sm" data-action="edit" data-id="${track.id}">
        Edit
      </button>
      <button class="ui-btn ui-btn--sm ui-btn--danger" data-action="delete" data-id="${track.id}">
        Delete
      </button>
    </div>
  `;

  trackDetailEl
    .querySelector('[data-action="edit"]')
    .addEventListener("click", () => handleEditTrack(track));

  trackDetailEl
    .querySelector('[data-action="delete"]')
    .addEventListener("click", () => handleDeleteTrack(track));
}

async function handleEditTrack(track) {
  const title = prompt("Track title:", track.title);
  if (title === null) return;

  const artist = prompt("Artist name:", track.artist);
  if (artist === null) return;

  const year = prompt("Year:", track.year || "");
  const country = prompt("Country code:", track.country || "");

  const updates = {
    title: title || track.title,
    artist: artist || track.artist,
    year: year ? parseInt(year, 10) : null,
    country: country || null,
  };

  try {
    const response = await fetch(`${API_BASE}/${track.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error("Failed to update track");

    alert("Track updated!");
    loadedCount = 0;
    await list.reload();
  } catch (error) {
    alert("Failed to update track: " + error.message);
  }
}

async function handleDeleteTrack(track) {
  if (!confirm(`Delete "${track.title}"?`)) return;

  try {
    const response = await fetch(`${API_BASE}/${track.id}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error("Failed to delete track");

    alert("Track deleted!");
    loadedCount = 0;
    await list.reload();
    trackDetailEl.innerHTML =
      '<span class="ui-detail__empty">Click a track to see details</span>';
  } catch (error) {
    alert("Failed to delete track: " + error.message);
  }
}

// =============================================================================
// Event Bindings
// =============================================================================

function bindListEvents() {
  list.on("selection:change", ({ selected, items }) => {
    updateSelectionCount(selected);
    if (items.length > 0) {
      const index = selected[0];
      showTrackDetail(items[0], index);
    }
  });

  list.on("item:click", ({ item, index }) => {
    showTrackDetail(item, index);
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
