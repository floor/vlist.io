// Data Table — Virtualized table with resizable columns, sorting, and selection
// Demonstrates withTable plugin with column presets, sort toggle,
// and withSelection for click-to-select with detail panel

import { vlist, withTable, withSelection } from "vlist";
import { makeContacts } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { initControls } from "./controls.js";

// =============================================================================
// Constants
// =============================================================================

export const TOTAL_ROWS = 10_000;
export const DEFAULT_ROW_HEIGHT = 36;
export const HEADER_HEIGHT = 36;

// =============================================================================
// Data
// =============================================================================

export const contacts = makeContacts(TOTAL_ROWS);

// Keep a mutable reference for sorting
export let sortedContacts = [...contacts];

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let list = null;
export let currentRowHeight = DEFAULT_ROW_HEIGHT;
export let currentPreset = "default";
export let currentBorderMode = "both";
export let sortKey = null;
export let sortDirection = "asc";

export function setCurrentRowHeight(v) {
  currentRowHeight = v;
}

export function setCurrentPreset(v) {
  currentPreset = v;
}

export function setCurrentBorderMode(v) {
  currentBorderMode = v;
}

// =============================================================================
// Column Presets
// =============================================================================

/** Status badge cell renderer */
const statusCell = (item) => {
  const active = item.id % 3 !== 0;
  const label = active ? "Active" : "Inactive";
  const cls = active ? "status-badge--active" : "status-badge--inactive";
  return `<span class="status-badge ${cls}">${label}</span>`;
};

/** Avatar + name cell renderer */
const nameCell = (item) => `
  <div class="table-name">
    <div class="table-avatar" style="background:${item.color}">${item.initials}</div>
    <span class="table-name__text">${item.firstName} ${item.lastName}</span>
  </div>
`;

const COLUMN_PRESETS = {
  default: [
    {
      key: "name",
      label: "Name",
      width: 220,
      minWidth: 140,
      sortable: true,
      cell: nameCell,
    },
    {
      key: "email",
      label: "Email",
      width: 260,
      minWidth: 140,
      sortable: true,
    },
    {
      key: "department",
      label: "Department",
      width: 140,
      minWidth: 90,
      sortable: true,
    },
    {
      key: "role",
      label: "Role",
      width: 180,
      minWidth: 100,
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      width: 100,
      minWidth: 80,
      align: "center",
      sortable: true,
      cell: statusCell,
    },
  ],

  compact: [
    {
      key: "name",
      label: "Name",
      width: 200,
      minWidth: 120,
      sortable: true,
      cell: nameCell,
    },
    {
      key: "email",
      label: "Email",
      minWidth: 140,
      sortable: true,
    },
    {
      key: "department",
      label: "Dept",
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
      label: "Name",
      width: 200,
      minWidth: 140,
      sortable: true,
      cell: nameCell,
    },
    {
      key: "email",
      label: "Email",
      width: 240,
      minWidth: 140,
      sortable: true,
    },
    {
      key: "company",
      label: "Company",
      width: 160,
      minWidth: 100,
      sortable: true,
    },
    {
      key: "department",
      label: "Department",
      width: 130,
      minWidth: 90,
      sortable: true,
    },
    {
      key: "role",
      label: "Role",
      width: 170,
      minWidth: 100,
      sortable: true,
    },
    {
      key: "city",
      label: "City",
      width: 120,
      minWidth: 80,
      sortable: true,
    },
    {
      key: "country",
      label: "Country",
      width: 130,
      minWidth: 80,
      sortable: true,
    },
    {
      key: "phone",
      label: "Phone",
      width: 140,
      minWidth: 110,
    },
    {
      key: "status",
      label: "Status",
      width: 100,
      minWidth: 80,
      align: "center",
      sortable: true,
      cell: statusCell,
    },
  ],
};

export function getColumns() {
  return COLUMN_PRESETS[currentPreset] || COLUMN_PRESETS.default;
}

// =============================================================================
// Sorting
// =============================================================================

/**
 * Sort contacts by a given key and direction.
 * Returns a new sorted array (does not mutate the original).
 */
function sortContacts(key, direction) {
  const dir = direction === "desc" ? -1 : 1;

  return [...contacts].sort((a, b) => {
    let aVal, bVal;

    if (key === "name") {
      aVal = a.lastName + a.firstName;
      bVal = b.lastName + b.firstName;
    } else if (key === "status") {
      aVal = a.id % 3 !== 0 ? "Active" : "Inactive";
      bVal = b.id % 3 !== 0 ? "Active" : "Inactive";
    } else {
      aVal = a[key];
      bVal = b[key];
    }

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (typeof aVal === "number" && typeof bVal === "number") {
      return (aVal - bVal) * dir;
    }

    return String(aVal).localeCompare(String(bVal)) * dir;
  });
}

export function applySort(key, direction) {
  sortKey = key;
  sortDirection = direction || "asc";

  if (key === null) {
    sortedContacts = [...contacts];
  } else {
    sortedContacts = sortContacts(key, direction);
  }

  if (list) {
    list.setItems(sortedContacts);
  }

  updateContext();
  updateSortDetail();
}

// =============================================================================
// Templates (fallback — cell templates are defined per column above)
// =============================================================================

const fallbackTemplate = () => "";

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getList: () => list,
  getTotal: () => sortedContacts.length,
  getItemHeight: () => currentRowHeight,
  container: "#list-container",
});

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

  const columns = getColumns();
  const columnBorders = currentBorderMode === "both";
  const rowBorders = currentBorderMode !== "none";

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Employee data table",
    item: {
      height: currentRowHeight,
      template: fallbackTemplate,
    },
    items: sortedContacts,
  });

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

  list = builder.build();

  // Wire events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", ({ range }) => {
    firstVisibleIndex = range.start;
    stats.scheduleUpdate();
  });
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  // Sort event — consumer handles actual sorting
  list.on("column:sort", ({ key, direction }) => {
    applySort(direction === null ? null : key, direction);

    // Update the visual indicator on the header
    if (list.setSort) {
      list.setSort(sortKey, sortDirection);
    }
  });

  // Selection event — show detail panel
  list.on("selection:change", ({ selected, items }) => {
    if (items.length > 0) {
      showRowDetail(items[0]);
    } else {
      clearRowDetail();
    }
  });

  // Restore scroll position
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  stats.update();
  updateContext();
}

// =============================================================================
// Row detail (panel) — shows selected row
// =============================================================================

const detailEl = document.getElementById("row-detail");

function showRowDetail(contact) {
  if (!detailEl) return;
  detailEl.innerHTML = `
    <div class="panel-detail__header">
      <div class="table-detail__avatar" style="background:${contact.color}">${contact.initials}</div>
      <div>
        <div class="panel-detail__name">${contact.firstName} ${contact.lastName}</div>
        <div class="table-detail__role">${contact.role}</div>
      </div>
    </div>
    <div class="panel-detail__meta">
      <span>${contact.department} · ${contact.company}</span>
      <span>${contact.email}</span>
      <span>${contact.phone}</span>
      <span>${contact.city}, ${contact.country}</span>
    </div>
  `;
}

function clearRowDetail() {
  if (!detailEl) return;
  detailEl.innerHTML = `
    <span class="panel-detail__empty">Click a row to see details</span>
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
      <span class="panel-detail__empty">Click a column header to sort</span>
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
// Footer — right side (contextual)
// =============================================================================

const ftColumns = document.getElementById("ft-columns");
const ftSort = document.getElementById("ft-sort");

export function updateContext() {
  if (ftColumns) ftColumns.textContent = getColumns().length;
  if (ftSort) {
    ftSort.textContent =
      sortKey !== null ? `${sortKey} ${sortDirection}` : "none";
  }
}

// =============================================================================
// Initialise
// =============================================================================

initControls();
createList();
