// Data Table — Virtualized table with server-side sorting, filtering, and search
// Demonstrates withTable + withAsync backed by a real SQLite database (33K cities).
// All sorting and filtering happens server-side via /api/cities.
// Data loads lazily in chunks as the user scrolls — not all at once.

import { vlist, withTable, withSelection, withAsync, withSnapshots } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import { initControls } from "./controls.js";

// =============================================================================
// Constants
// =============================================================================

export const ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 36;
export const CHUNK_SIZE = 100;
const API_BASE =
  typeof location !== "undefined" ? location.origin : "http://localhost:3338";

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let list = null;
export let totalCities = 0;
export let currentRowHeight = ROW_HEIGHT;
export let currentPreset = "full";
export let currentBorderMode = "both";
export let sortKey = "population";
export let sortDirection = "desc";
export let searchQuery = "";
export let filterContinent = "";
export let loadRequests = 0;
export let loadedCount = 0;

export function setCurrentRowHeight(v) {
  currentRowHeight = v;
}
export function setCurrentPreset(v) {
  currentPreset = v;
}
export function setCurrentBorderMode(v) {
  currentBorderMode = v;
}
export function setSearchQuery(v) {
  searchQuery = v;
}
export function setFilterContinent(v) {
  filterContinent = v;
}

// =============================================================================
// Adapter — fetches cities from the SQLite-backed API
// =============================================================================

/**
 * Build query params from the current filter/sort state.
 * Called by the adapter on every read so sorting/filtering
 * is always handled server-side.
 */
function buildParams(offset, limit) {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    sort: sortKey || "population",
    direction: sortDirection || "desc",
  });

  if (searchQuery) params.set("search", searchQuery);
  if (filterContinent) params.set("continent", filterContinent);

  return params;
}

const citiesAdapter = {
  read: async ({ offset, limit }) => {
    loadRequests++;
    updateContext();

    const params = buildParams(offset, limit);
    const res = await fetch(`${API_BASE}/api/cities?${params}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    totalCities = data.total;
    loadedCount += data.items.length;
    updateContext();

    return {
      items: data.items,
      total: data.total,
      hasMore: data.hasMore,
    };
  },
};

// =============================================================================
// Column Presets
// =============================================================================

/** Population cell — formatted with locale separators */
const populationCell = (item) => {
  const pop = item.population;
  if (pop == null) return "";
  if (pop >= 1_000_000) {
    return `<span class="table-pop table-pop--mega">${(pop / 1_000_000).toFixed(1)}M</span>`;
  }
  if (pop >= 100_000) {
    return `<span class="table-pop table-pop--large">${(pop / 1_000).toFixed(0)}K</span>`;
  }
  return `<span class="table-pop">${pop.toLocaleString()}</span>`;
};

/** Continent badge */
const CONTINENT_COLORS = {
  Africa: "#f4511e",
  Americas: "#7cb342",
  Asia: "#e53935",
  Europe: "#1e88e5",
  Oceania: "#00acc1",
  "Indian Ocean": "#8e24aa",
  Antarctica: "#546e7a",
};

const continentCell = (item) => {
  const name = item.continent;
  if (!name) return "";
  const color = CONTINENT_COLORS[name] || "#757575";
  return `<span class="ui-badge ui-badge--pill" style="background:${color};color:#fff">${name}</span>`;
};

/** City name cell with country code badge */
const nameCell = (item) => {
  const cc = item.country_code || "";
  const name = item.name || "";
  return `
    <div class="table-name">
      <span class="table-cc">${cc}</span>
      <span class="table-name__text">${name}</span>
    </div>
  `;
};

const COLUMN_PRESETS = {
  default: [
    {
      key: "name",
      label: "City",
      width: 220,
      minWidth: 140,
      sortable: true,
      cell: nameCell,
    },
    {
      key: "country_code",
      label: "Country",
      width: 100,
      minWidth: 70,
      align: "center",
      sortable: true,
    },
    {
      key: "population",
      label: "Population",
      width: 140,
      minWidth: 100,
      align: "right",
      sortable: true,
      cell: populationCell,
    },
    {
      key: "continent",
      label: "Continent",
      width: 130,
      minWidth: 100,
      sortable: true,
      cell: continentCell,
    },
  ],

  compact: [
    {
      key: "name",
      label: "City",
      width: 200,
      minWidth: 120,
      sortable: true,
      cell: nameCell,
    },
    {
      key: "population",
      label: "Pop.",
      width: 100,
      minWidth: 80,
      align: "right",
      sortable: true,
      cell: populationCell,
    },
    {
      key: "continent",
      label: "Continent",
      width: 120,
      minWidth: 80,
      sortable: true,
    },
  ],

  full: [
    {
      key: "id",
      label: "#",
      width: 60,
      minWidth: 50,
      maxWidth: 80,
      resizable: false,
      align: "right",
      sortable: true,
    },
    {
      key: "name",
      label: "City",
      width: 200,
      minWidth: 140,
      sortable: true,
      cell: nameCell,
    },
    {
      key: "country_code",
      label: "Country",
      width: 100,
      minWidth: 70,
      align: "center",
      sortable: true,
    },
    {
      key: "population",
      label: "Population",
      width: 136,
      minWidth: 100,
      align: "right",
      sortable: true,
      cell: populationCell,
    },
    {
      key: "continent",
      label: "Continent",
      width: 130,
      minWidth: 100,
      sortable: true,
      cell: continentCell,
    },
    {
      key: "lat",
      label: "Lat",
      width: 70,
      minWidth: 70,
      align: "right",
      sortable: true,
    },
    {
      key: "lng",
      label: "Lng",
      width: 70,
      minWidth: 70,
      align: "right",
      sortable: true,
    },
  ],
};

export function getColumns() {
  return COLUMN_PRESETS[currentPreset] || COLUMN_PRESETS.default;
}

// =============================================================================
// Sorting — server-side via reload
// =============================================================================

export async function applySort(key, direction) {
  sortKey = key;
  sortDirection = direction || "asc";

  if (key === null) {
    sortKey = "id";
    sortDirection = "asc";
  }

  loadedCount = 0;
  if (list) {
    await list.reload();
  }

  updateContext();
  updateSortDetail();
}

// =============================================================================
// Apply filters — triggers reload with new server-side params
// =============================================================================

let filterDebounce = null;

export async function applyFilters() {
  clearTimeout(filterDebounce);
  filterDebounce = setTimeout(async () => {
    loadedCount = 0;
    if (list) {
      await list.reload();
    }
    updateContext();
    updateSortDetail();
  }, 150);
}

// =============================================================================
// Templates (fallback — cell templates are defined per column above)
// =============================================================================

const fallbackTemplate = () => "";

// =============================================================================
// Stats — shared info bar (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => totalCities,
  getItemSize: () => currentRowHeight,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create / Recreate list
// =============================================================================

export function createList() {
  let snapshot = null;
  if (list) {
    try {
      snapshot = list.getScrollSnapshot();
    } catch {}
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  // Reset load stats on recreate
  loadRequests = 0;
  loadedCount = 0;

  const columns = getColumns();
  const isStriped = currentBorderMode === "striped";
  const columnBorders = currentBorderMode === "both";
  const rowBorders = !isStriped && currentBorderMode !== "none";

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "World cities data table",
    item: {
      height: currentRowHeight,
      template: fallbackTemplate,
      striped: isStriped,
    },
  });

  // Async adapter — lazy chunk-based loading from /api/cities
  builder.use(
    withAsync({
      adapter: citiesAdapter,
      autoLoad: true,
      storage: {
        chunkSize: CHUNK_SIZE,
        maxCachedItems: 10000,
      },
      loading: {
        cancelThreshold: 8,
        preloadThreshold: 2,
        preloadAhead: 50,
      },
    }),
  );

  builder.use(
    withTable({
      columns,
      rowHeight: currentRowHeight,
      headerHeight: HEADER_HEIGHT,
      resizable: true,
      columnBorders,
      rowBorders,
      minColumnWidth: 50,
      sort: sortKey ? { key: sortKey, direction: sortDirection } : undefined,
    }),
  );

  builder.use(withSelection({ mode: "single" }));

  builder.use(withSnapshots(snapshot ? { restore: snapshot } : undefined));

  list = builder.build();

  // Wire events
  list.on("scroll", updateInfo);
  list.on("range:change", () => {
    updateInfo();
  });
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  // Sort event — server-side sorting via reload
  list.on("column:sort", async ({ key, direction }) => {
    await applySort(direction === null ? null : key, direction);

    // Update the visual indicator on the header
    if (list && list.setSort) {
      list.setSort(sortKey, sortDirection);
    }
  });

  // Selection event — show detail panel
  list.on("selection:change", ({ selected, items }) => {
    if (items.length > 0) {
      showCityDetail(items[0]);
    } else {
      clearCityDetail();
    }
  });

  // Track loaded items
  list.on("load:end", ({ items, total }) => {
    totalCities = total;
    updateInfo();
    updateContext();
  });

  updateInfo();
  updateContext();
}

// =============================================================================
// City detail (panel) — shows selected city
// =============================================================================

const detailEl = document.getElementById("row-detail");

function showCityDetail(city) {
  if (!detailEl) return;

  // Guard against placeholder items
  if (!city || !city.name || String(city.id).startsWith("__placeholder")) {
    return;
  }

  const popStr = city.population.toLocaleString();
  const lat = city.lat >= 0 ? `${city.lat}°N` : `${Math.abs(city.lat)}°S`;
  const lng = city.lng >= 0 ? `${city.lng}°E` : `${Math.abs(city.lng)}°W`;
  const color = CONTINENT_COLORS[city.continent] || "#757575";

  detailEl.innerHTML = `
    <div class="ui-detail__header">
      <div class="table-detail__cc">${city.country_code}</div>
      <div>
        <div class="ui-detail__name">${city.name}</div>
        <div class="table-detail__role">${city.continent}</div>
      </div>
    </div>
  `;
}

function clearCityDetail() {
  if (!detailEl) return;
  detailEl.innerHTML = `
    <span class="ui-detail__empty">Click a row to see details</span>
  `;
}

// =============================================================================
// Sort detail (panel) — shows current sort state
// =============================================================================

const sortDetailEl = document.getElementById("sort-detail");

function updateSortDetail() {
  if (!sortDetailEl) return;

  if (sortKey === null) {
    sortDetailEl.innerHTML = `
      <span class="ui-detail__empty">Click a column header to sort</span>
    `;
  } else {
    const arrow = sortDirection === "asc" ? "▲" : "▼";
    const label = sortDirection === "asc" ? "Ascending" : "Descending";
    sortDetailEl.innerHTML = `
      <div class="sort-info">
        <span class="sort-info__key">${sortKey}</span>
        <span class="sort-info__dir">${arrow} ${label}</span>
      </div>
    `;
  }
}

// =============================================================================
// Info bar — right side (contextual)
// =============================================================================

const infoColumns = document.getElementById("info-columns");
const infoSort = document.getElementById("info-sort");

export function updateContext() {
  if (infoColumns) infoColumns.textContent = getColumns().length;
  if (infoSort) {
    infoSort.textContent =
      sortKey !== null ? `${sortKey} ${sortDirection}` : "none";
  }

  // Update result count
  const infoResults = document.getElementById("info-results");
  if (infoResults) {
    infoResults.textContent = totalCities.toLocaleString();
  }

  // Update loaded count
  const infoLoaded = document.getElementById("info-loaded");
  if (infoLoaded) {
    infoLoaded.textContent = loadedCount.toLocaleString();
  }

  // Update request count
  const infoRequests = document.getElementById("info-requests");
  if (infoRequests) {
    infoRequests.textContent = loadRequests;
  }
}

// =============================================================================
// Initialise
// =============================================================================

initControls();
createList();
