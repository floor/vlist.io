// Books — Virtualized table with server-side sorting, filtering, and search
// Demonstrates withTable + withAsync backed by a real SQLite database (40.8M books).
// All sorting and filtering happens server-side via /api/books.
// Data loads lazily in chunks as the user scrolls — not all at once.

import {
  vlist,
  withTable,
  withSelection,
  withAsync,
  withScale,
  withScrollbar,
} from "vlist";
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
// Category Colors
// =============================================================================

const CATEGORY_COLORS = {
  Fiction: "#e53935",
  "Science Fiction": "#8e24aa",
  Science: "#1e88e5",
  History: "#f4511e",
  Philosophy: "#6d4c41",
  Religion: "#78909c",
  Art: "#ec407a",
  Music: "#ab47bc",
  Poetry: "#7e57c2",
  Drama: "#5c6bc0",
  Biography: "#26a69a",
  Children: "#66bb6a",
  Education: "#42a5f5",
  Politics: "#ef5350",
  Law: "#8d6e63",
  Economics: "#ffa726",
  Psychology: "#29b6f6",
  Medicine: "#26c6da",
  Nature: "#9ccc65",
  Travel: "#ffca28",
  Sports: "#ff7043",
  Cooking: "#d4e157",
  Humor: "#ffee58",
  Comics: "#ff8a65",
  Reference: "#bdbdbd",
  Other: "#757575",
};

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let list = null;
export let totalBooks = 0;
export let currentRowHeight = ROW_HEIGHT;
export let currentPreset = "full";
export let sortKey = "id";
export let sortDirection = "asc";
export let searchQuery = "";
export let authorQuery = "";
export let filterCategory = "";
export let loadRequests = 0;
export let loadedCount = 0;

// =============================================================================
// Chunk cursor cache — enables keyset pagination for sequential scrolling.
// Maps chunk offset → {val, id} of the last item in that chunk.
// Cleared whenever sort/filter changes (cursors are only valid for the same
// sort + filter state).
// =============================================================================

const chunkCursorCache = new Map();

function clearChunkCursorCache() {
  chunkCursorCache.clear();
}

/**
 * Returns true when cursors are valid for the current filter state.
 * The server supports keyset cursor pagination for:
 *   1. No filters at all
 *   2. A category filter with no other filters (subject_category = ?)
 * Both cases have composite indexes: (col, id) and (subject_category, col, id).
 */
function cursorEligible() {
  return !searchQuery && !authorQuery;
}


export function setCurrentRowHeight(v) {
  currentRowHeight = v;
}
export function setCurrentPreset(v) {
  currentPreset = v;
}
export function setSearchQuery(v) {
  searchQuery = v;
}
export function setAuthorQuery(v) {
  authorQuery = v;
}
export function setFilterCategory(v) {
  filterCategory = v;
}

// =============================================================================
// Adapter — fetches books from the SQLite-backed API
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
    sort: sortKey || "id",
    direction: sortDirection || "asc",
  });

  if (searchQuery) params.set("search", searchQuery);
  if (authorQuery) params.set("author", authorQuery);
  if (filterCategory) params.set("category", filterCategory);

  // Attach keyset cursor from the previous chunk when eligible.
  // Cursors work for unfiltered queries and category-only filters — the server
  // has composite indexes for both (col, id) and (subject_category, col, id).
  if (cursorEligible()) {
    const prevOffset = offset - CHUNK_SIZE;
    if (prevOffset >= 0) {
      const cursor = chunkCursorCache.get(prevOffset);
      if (cursor != null) {
        params.set("cursorVal", String(cursor.val));
        params.set("cursorId", String(cursor.id));
      }
    }
  }

  return params;
}

const booksAdapter = {
  read: async ({ offset, limit, signal }) => {
    loadRequests++;
    updateContext();

    const params = buildParams(offset, limit);
    const res = await fetch(`${API_BASE}/api/books?${params}`, { signal });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    totalBooks = data.total;
    loadedCount += data.items.length;
    updateContext();

    // Cache cursor for the next sequential chunk: the last item's sort value
    // and id. Only cache non-null values (null sort values can't be used as
    // keyset cursors in SQL). The cache is always cleared on sort/filter change
    // so it's always valid for the current query state.
    if (data.items.length > 0 && cursorEligible()) {
      const lastItem = data.items[data.items.length - 1];
      const val = lastItem[sortKey] ?? null;
      if (val !== null) {
        chunkCursorCache.set(offset, { val, id: lastItem.id });
      }
    }

    return {
      items: data.items,
      total: data.total,
      hasMore: data.hasMore,
    };
  },
};

// =============================================================================
// Helpers — derive extra fields client-side from existing data
// =============================================================================

/** Parse subjects_json once and cache on the item */
function getSubjects(item) {
  if (item._subjects !== undefined) return item._subjects;
  if (!item.subjects_json) {
    item._subjects = [];
    return item._subjects;
  }
  try {
    item._subjects = JSON.parse(item.subjects_json);
  } catch {
    item._subjects = [];
  }
  return item._subjects;
}

/** Century string from year: 1984 → "20th", 850 → "9th" */
function centuryOf(year) {
  if (year == null) return null;
  const c = Math.ceil(year / 100);
  const abs = Math.abs(c);
  const suffix =
    abs % 100 >= 11 && abs % 100 <= 13
      ? "th"
      : abs % 10 === 1
        ? "st"
        : abs % 10 === 2
          ? "nd"
          : abs % 10 === 3
            ? "rd"
            : "th";
  return c > 0 ? `${abs}${suffix}` : `${abs}${suffix} BC`;
}

/** Era bucket from year */
function eraOf(year) {
  if (year == null) return null;
  if (year < 500) return "Ancient";
  if (year < 1400) return "Medieval";
  if (year < 1600) return "Renaissance";
  if (year < 1800) return "Enlightenment";
  if (year < 1900) return "Industrial";
  if (year < 1950) return "Early Modern";
  if (year < 2000) return "Late Modern";
  return "Contemporary";
}

const ERA_COLORS = {
  Ancient: "#8d6e63",
  Medieval: "#6d4c41",
  Renaissance: "#ab47bc",
  Enlightenment: "#5c6bc0",
  Industrial: "#78909c",
  "Early Modern": "#26a69a",
  "Late Modern": "#42a5f5",
  Contemporary: "#66bb6a",
};

/** Extract OL work ID from key, e.g. "/works/OL10002435W" → "OL10002435W" */
function workIdOf(key) {
  if (!key) return "";
  const i = key.lastIndexOf("/");
  return i >= 0 ? key.slice(i + 1) : key;
}

// =============================================================================
// Cell Renderers
// =============================================================================

/** Title cell — category color dot + title text */
const titleCell = (item) => {
  const title = item.title || "";
  const color = CATEGORY_COLORS[item.subject_category] || "#757575";
  return `
    <div class="book-cell-title">
      <span class="book-cell-title__dot" style="background:${color}"></span>
      <span class="book-cell-title__text">${title}</span>
    </div>
  `;
};

/** Author cell */
const authorCell = (item) => {
  const author = item.author || "";
  return `<span class="book-cell-ellipsis">${author}</span>`;
};

/** Year cell — show year or "—" */
const yearCell = (item) => {
  const year = item.first_publish_year;
  if (year == null) return `<span class="book-cell-dim">—</span>`;
  return `<span class="book-cell-year">${year}</span>`;
};

/** Category badge */
const categoryCell = (item) => {
  const name = item.subject_category;
  if (!name) return "";
  const color = CATEGORY_COLORS[name] || "#757575";
  return `<span class="ui-badge ui-badge--pill" style="background:${color};color:#fff">${name}</span>`;
};

/** Century cell — derived from year */
const centuryCell = (item) => {
  const c = centuryOf(item.first_publish_year);
  if (!c) return `<span class="book-cell-dim">—</span>`;
  return `<span class="book-cell-mono">${c}</span>`;
};

/** Era cell — derived from year, with color */
const eraCell = (item) => {
  const era = eraOf(item.first_publish_year);
  if (!era) return `<span class="book-cell-dim">—</span>`;
  const color = ERA_COLORS[era] || "#757575";
  return `<span class="ui-badge ui-badge--pill" style="background:${color};color:#fff">${era}</span>`;
};

/** Work ID cell — extracted from key */
const workIdCell = (item) => {
  const wid = workIdOf(item.key);
  return `<span class="book-cell-mono">${wid}</span>`;
};

/** Subjects cell — first few subjects as inline tags */
const subjectsCell = (item) => {
  const subjects = getSubjects(item);
  if (subjects.length === 0) return `<span class="book-cell-dim">—</span>`;
  return subjects
    .slice(0, 3)
    .map((s) => `<span class="book-subject-tag">${s}</span>`)
    .join("");
};

/** Primary subject cell — just the first subject as plain text */
const primarySubjectCell = (item) => {
  const subjects = getSubjects(item);
  if (subjects.length === 0) return `<span class="book-cell-dim">—</span>`;
  return `<span class="book-cell-ellipsis">${subjects[0]}</span>`;
};

/** Subject count cell — number of subjects */
const subjectCountCell = (item) => {
  const subjects = getSubjects(item);
  if (subjects.length === 0) return `<span class="book-cell-dim">0</span>`;
  return `<span class="book-cell-mono">${subjects.length}</span>`;
};

/** Author initials cell — "J.R.R.T." style */
const authorInitialsCell = (item) => {
  if (!item.author) return `<span class="book-cell-dim">—</span>`;
  const initials = item.author
    .split(/[\s.]+/)
    .filter((w) => w.length > 0)
    .map((w) => w[0].toUpperCase())
    .slice(0, 4)
    .join(".");
  return `<span class="book-cell-mono">${initials}</span>`;
};

// =============================================================================
// Column Presets
// =============================================================================

const COLUMN_PRESETS = {
  default: [
    {
      key: "title",
      label: "Title",
      width: 260,
      minWidth: 160,
      sortable: true,
      cell: titleCell,
    },
    {
      key: "author",
      label: "Author",
      width: 200,
      minWidth: 120,
      sortable: true,
      cell: authorCell,
    },
    {
      key: "first_publish_year",
      label: "Year",
      width: 80,
      minWidth: 60,
      align: "center",
      sortable: true,
      cell: yearCell,
    },
    {
      key: "subject_category",
      label: "Category",
      width: 140,
      minWidth: 100,
      sortable: true,
      cell: categoryCell,
    },
  ],

  compact: [
    {
      key: "title",
      label: "Title",
      width: 240,
      minWidth: 140,
      sortable: true,
      cell: titleCell,
    },
    {
      key: "author",
      label: "Author",
      width: 160,
      minWidth: 100,
      sortable: true,
      cell: authorCell,
    },
    {
      key: "first_publish_year",
      label: "Year",
      width: 70,
      minWidth: 50,
      align: "center",
      sortable: true,
      cell: yearCell,
    },
  ],

  full: [
    {
      key: "id",
      label: "#",
      width: 70,
      minWidth: 50,
      maxWidth: 90,
      resizable: false,
      align: "right",
      sortable: true,
    },
    {
      key: "title",
      label: "Title",
      width: 260,
      minWidth: 180,
      sortable: true,
      cell: titleCell,
    },
    {
      key: "author",
      label: "Author",
      width: 200,
      minWidth: 120,
      sortable: true,
      cell: authorCell,
    },
    {
      key: "_initials",
      label: "Initials",
      width: 70,
      minWidth: 50,
      align: "center",
      cell: authorInitialsCell,
    },
    {
      key: "first_publish_year",
      label: "Year",
      width: 80,
      minWidth: 60,
      align: "center",
      sortable: true,
      cell: yearCell,
    },
    {
      key: "_century",
      label: "Century",
      width: 80,
      minWidth: 60,
      align: "center",
      cell: centuryCell,
    },
    {
      key: "_era",
      label: "Era",
      width: 130,
      minWidth: 100,
      cell: eraCell,
    },
    {
      key: "subject_category",
      label: "Category",
      width: 140,
      minWidth: 100,
      sortable: true,
      cell: categoryCell,
    },
    {
      key: "_primary_subject",
      label: "Primary Subject",
      width: 180,
      minWidth: 120,
      cell: primarySubjectCell,
    },
    {
      key: "subjects_json",
      label: "Subjects",
      width: 300,
      minWidth: 160,
      cell: subjectsCell,
    },
    {
      key: "_subject_count",
      label: "# Subj.",
      width: 70,
      minWidth: 50,
      align: "center",
      cell: subjectCountCell,
    },
    {
      key: "_work_id",
      label: "Work ID",
      width: 140,
      minWidth: 100,
      cell: workIdCell,
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
  clearChunkCursorCache();
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
    clearChunkCursorCache();
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
  getTotal: () => totalBooks,
  getItemSize: () => currentRowHeight,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create / Recreate list
// =============================================================================

let firstVisibleIndex = 0;

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  // Reset load stats on recreate
  clearChunkCursorCache();
  loadRequests = 0;
  loadedCount = 0;

  const columns = getColumns();
  const columnBorders = false;
  const rowBorders = true;

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Open Library books data table",
    item: {
      height: currentRowHeight,
      template: fallbackTemplate,
    },
  });

  // Async adapter — lazy chunk-based loading from /api/books
  builder.use(
    withAsync({
      adapter: booksAdapter,
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

  // Scale + custom scrollbar — required for 40M+ items where total height
  // far exceeds the browser's ~16.7M pixel limit.
  builder.use(withScale());
  builder.use(withScrollbar({ autoHide: true }));

  list = builder.build();

  // Wire events
  list.on("scroll", updateInfo);
  list.on("range:change", ({ range }) => {
    firstVisibleIndex = range.start;
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
      showBookDetail(items[0]);
    } else {
      clearBookDetail();
    }
  });

  // Track loaded items
  list.on("load:end", ({ items, total }) => {
    totalBooks = total;
    updateInfo();
    updateContext();
  });

  // Restore scroll position if recreating (e.g. after column preset change)
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  updateInfo();
  updateContext();
}

// =============================================================================
// Book detail (panel) — shows selected book
// =============================================================================

const detailEl = document.getElementById("row-detail");

function showBookDetail(book) {
  if (!detailEl) return;

  // Guard against placeholder items
  if (!book || !book.title || String(book.id).startsWith("__placeholder")) {
    return;
  }

  const color = CATEGORY_COLORS[book.subject_category] || "#757575";
  const year = book.first_publish_year || "Unknown";
  const era = eraOf(book.first_publish_year);
  const subjects = book.subjects_json
    ? JSON.parse(book.subjects_json).slice(0, 5)
    : [];

  detailEl.innerHTML = `
    <div class="ui-detail__header">
      <div class="book-detail__category" style="background:${color}"></div>
      <div>
        <div class="ui-detail__name">${book.title}</div>
        <div class="book-detail__author">${book.author || "Unknown author"}</div>
      </div>
    </div>
    <div class="book-detail__meta">
      <span class="book-detail__year">${year}</span>
      ${era ? `<span class="book-detail__era">${era}</span>` : ""}
      <span class="ui-badge ui-badge--pill" style="background:${color};color:#fff">${book.subject_category}</span>
    </div>
    ${subjects.length > 0 ? `<div class="book-detail__subjects">${subjects.map((s) => `<span class="book-subject-tag">${s}</span>`).join("")}</div>` : ""}
    <div class="book-detail__id">${workIdOf(book.key)}</div>
  `;
}

function clearBookDetail() {
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
    infoResults.textContent = totalBooks.toLocaleString();
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
