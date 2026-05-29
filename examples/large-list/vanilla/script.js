// Builder Million Items — Composable entry point
// Uses scale + scrollbar plugins
// Demonstrates handling 1M+ items with automatic scroll scaling
// Supports List and Table layout modes

import { createVList, scale, scrollbar, table, grid } from "vlist";
import { createStats } from "../../stats.js";
import { createInfoUpdater } from "../../info.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const TABLE_ROW_HEIGHT = 36;
const GRID_ITEM_HEIGHT = 120;
const GRID_COLUMNS = 4;
const GRID_GAP = 8;
const SIZES = {
  "100k": 100_000,
  "500k": 500_000,
  "1m": 1_000_000,
  "2m": 2_000_000,
  "5m": 5_000_000,
};

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];

// Simple hash for consistent per-item values
const hash = (n) => {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 16;
  return Math.abs(h);
};

// =============================================================================
// Generate lightweight items (only id — display data computed in template)
// =============================================================================

const generateItems = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1 }));

// =============================================================================
// Item template (list mode)
// =============================================================================

const itemTemplate = (_item, index) => {
  const h = hash(index);
  const value = h % 100;
  const hex = h.toString(16).slice(0, 8).toUpperCase();
  const color = COLORS[index % COLORS.length];

  return `
  <div class="item-row">
    <div class="item-color" style="background:${color}"></div>
    <div class="item-info">
      <span class="item-label">#${(index + 1).toLocaleString()}</span>
      <span class="item-hash">${hex}</span>
    </div>
    <div class="item-bar-wrap">
      <div class="item-bar" style="width:${value}%;background:${color}"></div>
    </div>
    <span class="item-value">${value}%</span>
  </div>
`;
};

const gridTemplate = (_item, index) => {
  const h = hash(index);
  const value = h % 100;
  const hex = h.toString(16).slice(0, 8).toUpperCase();
  const color = COLORS[index % COLORS.length];

  return `
  <div class="grid-card">
    <div class="grid-card__accent" style="background:${color}"></div>
    <span class="grid-card__index">#${(index + 1).toLocaleString()}</span>
    <code class="grid-card__hash">${hex}</code>
    <div class="grid-card__bar-wrap">
      <div class="grid-card__bar" style="width:${value}%;background:${color}"></div>
    </div>
    <span class="grid-card__value">${value}%</span>
  </div>
`;
};

// =============================================================================
// Table columns + cell formatters
// =============================================================================

const colorDot = (_val, _item, index) => {
  const color = COLORS[index % COLORS.length];
  return `<span class="ll-dot" style="background:${color}"></span>`;
};

const indexCell = (_val, _item, index) =>
  `<span class="ll-index">#${(index + 1).toLocaleString()}</span>`;

const hashCell = (_val, _item, index) => {
  const hex = hash(index).toString(16).slice(0, 8).toUpperCase();
  return `<code class="ll-hash">${hex}</code>`;
};

const valueCell = (_val, _item, index) => {
  const value = hash(index) % 100;
  return `<span class="ll-value">${value}%</span>`;
};

const barCell = (_val, _item, index) => {
  const value = hash(index) % 100;
  const color = COLORS[index % COLORS.length];
  return `<div class="ll-bar-wrap"><div class="ll-bar" style="width:${value}%;background:${color}"></div></div>`;
};

const TABLE_COLUMNS = [
  { key: "id", label: "#", width: 80, minWidth: 60, align: "right", cell: indexCell },
  { key: "color", label: "", width: 44, minWidth: 44, maxWidth: 44, align: "center", cell: colorDot, resizable: false },
  { key: "hash", label: "Hash", width: 130, minWidth: 80, cell: hashCell },
  { key: "value", label: "Value", width: 90, minWidth: 60, align: "right", cell: valueCell },
  { key: "bar", label: "Progress", width: 200, minWidth: 100, flex: 1, cell: barCell },
];

const fallbackTemplate = () => "";

// =============================================================================
// DOM references
// =============================================================================

const scrollPosEl = document.getElementById("scroll-position");
const scrollDirEl = document.getElementById("scroll-direction");
const rangeEl = document.getElementById("visible-range");
const sizeButtons = document.getElementById("size-buttons");
const layoutButtons = document.getElementById("layout-buttons");

// Info bar right-side elements
const infoVirtualizedEl = document.getElementById("info-virtualized");
const infoScaleEl = document.getElementById("info-scale");
const infoModeEl = document.getElementById("info-mode");
const infoModeStatEl = document.getElementById("info-mode-stat");

// =============================================================================
// Shared info bar stats (left side — progress, velocity, items)
// =============================================================================

const getItemSize = () => {
  if (currentLayout === "table") return TABLE_ROW_HEIGHT;
  if (currentLayout === "grid") return GRID_ITEM_HEIGHT;
  return ITEM_HEIGHT;
};

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => SIZES[currentSize],
  getItemSize: getItemSize,
  getColumns: () => currentLayout === "grid" ? GRID_COLUMNS : 1,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// State
// =============================================================================

let currentSize = "1m";
let currentLayout = "list";
let list = null;

// =============================================================================
// Create / Recreate list
// =============================================================================

function createList(sizeKey) {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }

  // Clear container
  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const count = SIZES[sizeKey];
  const items = generateItems(count);

  const plugins = [];
  if (count > 100_000) plugins.push(scale(), scrollbar({ autoHide: true }));

  const isTable = currentLayout === "table";
  const isGrid = currentLayout === "grid";
  let rowHeight = ITEM_HEIGHT;
  let template = itemTemplate;

  if (isTable) {
    rowHeight = TABLE_ROW_HEIGHT;
    template = fallbackTemplate;
    plugins.push(
      table({
        columns: TABLE_COLUMNS,
        rowHeight: TABLE_ROW_HEIGHT,
        headerHeight: TABLE_ROW_HEIGHT,
        rowBorders: true,
        columnBorders: true,
      }),
    );
  } else if (isGrid) {
    rowHeight = GRID_ITEM_HEIGHT;
    template = gridTemplate;
    plugins.push(grid({ columns: GRID_COLUMNS, gap: GRID_GAP }));
  }

  list = createVList(
    {
      container: "#list-container",
      ariaLabel: `${count.toLocaleString()} items ${currentLayout}`,
      item: {
        height: rowHeight,
        template,
      },
      items,
    },
    plugins,
  );

  // Bind events
  list.on("scroll", ({ scrollPosition, direction }) => {
    scrollPosEl.textContent = `${Math.round(scrollPosition).toLocaleString()}px`;
    scrollDirEl.textContent = direction === "up" ? "↑ up" : "↓ down";
    updateInfo();
  });

  list.on("range:change", ({ range }) => {
    rangeEl.textContent = `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`;
    updateInfo();
  });

  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  // Update info bar
  updateInfo();
  updateContext(count);
}

// =============================================================================
// Info bar right side — context (virtualized %, scale mode)
// =============================================================================

function updateContext(count) {
  const itemHeight = getItemSize();
  const effectiveRows = currentLayout === "grid" ? Math.ceil(count / GRID_COLUMNS) : count;
  const totalHeight = effectiveRows * (itemHeight + (currentLayout === "grid" ? GRID_GAP : 0));
  const maxHeight = 16_777_216; // browser limit ~16.7M px
  const isScaled = totalHeight > maxHeight;
  const ratio = isScaled ? (totalHeight / maxHeight).toFixed(1) : "1.0";
  const selector = currentLayout === "table" ? ".vlist-table-row"
    : currentLayout === "grid" ? ".vlist-grid-item" : ".vlist-item";
  const domNodes = document.querySelectorAll(selector).length;
  const virtualized = ((1 - domNodes / count) * 100).toFixed(2);

  infoVirtualizedEl.textContent = `${virtualized}%`;
  infoScaleEl.textContent = `${ratio}×`;
  infoModeEl.textContent = isScaled ? "SCALED" : "NATIVE";
  infoModeStatEl.className = `example-info__stat ${isScaled ? "example-info__stat--warn" : "example-info__stat--ok"}`;
}

// =============================================================================
// Layout selector buttons
// =============================================================================

layoutButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-layout]");
  if (!btn) return;

  const layout = btn.dataset.layout;
  if (layout === currentLayout) return;

  currentLayout = layout;

  layoutButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.layout === layout);
  });

  createList(currentSize);
});

// =============================================================================
// Size selector buttons
// =============================================================================

sizeButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-size]");
  if (!btn) return;

  const size = btn.dataset.size;
  if (size === currentSize) return;

  currentSize = size;

  // Update active state
  sizeButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.size === size);
  });

  createList(size);
});

// =============================================================================
// Navigation controls
// =============================================================================

const smoothToggle = document.getElementById("smooth-toggle");

/** Build scrollToIndex options respecting the smooth toggle */
const scrollOpts = (align) =>
  smoothToggle.checked ? { align, behavior: "smooth", duration: 500 } : align;

document.getElementById("btn-first").addEventListener("click", () => {
  list.scrollToIndex(0, scrollOpts("start"));
});

document.getElementById("btn-middle").addEventListener("click", () => {
  list.scrollToIndex(Math.floor(SIZES[currentSize] / 2), scrollOpts("center"));
});

document.getElementById("btn-last").addEventListener("click", () => {
  list.scrollToIndex(SIZES[currentSize] - 1, scrollOpts("end"));
});

document.getElementById("btn-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * SIZES[currentSize]);
  list.scrollToIndex(idx, scrollOpts("center"));
  document.getElementById("scroll-index").value = idx;
});

document.getElementById("btn-go").addEventListener("click", () => {
  const idx = parseInt(document.getElementById("scroll-index").value, 10);
  if (Number.isNaN(idx)) return;
  const align = document.getElementById("scroll-align").value;
  list.scrollToIndex(
    Math.max(0, Math.min(idx, SIZES[currentSize] - 1)),
    scrollOpts(align),
  );
});

document.getElementById("scroll-index").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-go").click();
  }
});

// =============================================================================
// Initialise with 1M items
// =============================================================================

createList(currentSize);
