// Builder Grid — Composable entry point
// Uses vlist/builder with withGrid + withScrollbar plugins
// Demonstrates a virtualized 2D photo gallery using the builder API

import { vlist } from "vlist/builder";
import { withGrid } from "vlist/grid";
import { withScrollbar } from "vlist/scroll";

// =============================================================================
// Data Generation
// =============================================================================

// Picsum has photos with IDs 0–1084 (some gaps). We use 600 items.
const PHOTO_COUNT = 1084;
const ITEM_COUNT = 600;

const categories = [
  "Nature",
  "Urban",
  "Portrait",
  "Abstract",
  "Travel",
  "Food",
  "Animals",
  "Architecture",
  "Art",
  "Space",
];

const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = categories[i % categories.length];
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.random() * 500),
    picId,
  };
});

// =============================================================================
// Item template
// =============================================================================

const itemTemplate = (item) => `
  <div class="card">
    <img
      class="card__img"
      src="https://picsum.photos/id/${item.picId}/300/225"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
    />
    <div class="card__overlay">
      <span class="card__title">${item.title}</span>
      <span class="card__category">${item.category}</span>
    </div>
    <div class="card__likes">♥ ${item.likes}</div>
  </div>
`;

// =============================================================================
// State
// =============================================================================

let currentColumns = 4;
let currentGap = 8;
let list = null;

// =============================================================================
// Create / Recreate grid
// =============================================================================

function createGrid(columns, gap) {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }

  // Clear container
  const container = document.getElementById("grid-container");
  container.innerHTML = "";

  // Calculate row height from column width to maintain 4:3 aspect ratio
  const innerWidth = container.clientWidth - 2; // account for border
  const colWidth = (innerWidth - (columns - 1) * gap) / columns;
  const height = Math.round(colWidth * 0.75);

  list = vlist({
    container: "#grid-container",
    ariaLabel: "Photo gallery",
    item: {
      height,
      template: itemTemplate,
    },
    items,
  })
    .use(withGrid({ columns, gap }))
    .use(withScrollbar({ autoHide: true }))
    .build();

  // Bind events
  list.on("scroll", () => scheduleStatsUpdate());
  list.on("range:change", ({ range }) => {
    rangeEl.textContent = `rows ${range.start} – ${range.end}`;
    scheduleStatsUpdate();
  });

  list.on("item:click", ({ item }) => {
    showDetail(item);
  });

  updateStats();
  updateGridInfo(columns, gap, height);
}

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");
const rangeEl = document.getElementById("visible-range");
const gridInfoEl = document.getElementById("grid-info");
const detailEl = document.getElementById("photo-detail");
const columnsButtons = document.getElementById("columns-buttons");
const gapButtons = document.getElementById("gap-buttons");

// =============================================================================
// Stats
// =============================================================================

let statsRaf = null;

function scheduleStatsUpdate() {
  if (statsRaf) return;
  statsRaf = requestAnimationFrame(() => {
    statsRaf = null;
    updateStats();
  });
}

function updateStats() {
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const totalRows = Math.ceil(ITEM_COUNT / currentColumns);
  const saved = ((1 - domNodes / ITEM_COUNT) * 100).toFixed(1);

  statsEl.innerHTML =
    `<strong>Photos:</strong> ${ITEM_COUNT}` +
    ` · <strong>Rows:</strong> ${totalRows}` +
    ` · <strong>DOM:</strong> ${domNodes}` +
    ` · <strong>Virtualized:</strong> ${saved}%`;
}

function updateGridInfo(columns, gap, rowHeight) {
  gridInfoEl.innerHTML =
    `<strong>Columns:</strong> ${columns}` +
    ` · <strong>Gap:</strong> ${gap}px` +
    ` · <strong>Row height:</strong> ${rowHeight}px` +
    ` · <strong>Aspect:</strong> 4:3`;
}

// =============================================================================
// Photo detail
// =============================================================================

function showDetail(item) {
  detailEl.innerHTML = `
    <img
      class="detail__img"
      src="https://picsum.photos/id/${item.picId}/400/300"
      alt="${item.title}"
    />
    <div class="detail__meta">
      <strong>${item.title}</strong>
      <span>${item.category} · ♥ ${item.likes}</span>
    </div>
  `;
}

// =============================================================================
// Column controls
// =============================================================================

columnsButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cols]");
  if (!btn) return;

  const cols = parseInt(btn.dataset.cols, 10);
  if (cols === currentColumns) return;
  currentColumns = cols;

  columnsButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ctrl-btn--active", parseInt(b.dataset.cols) === cols);
  });

  createGrid(currentColumns, currentGap);
});

// =============================================================================
// Gap controls
// =============================================================================

gapButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-gap]");
  if (!btn) return;

  const gap = parseInt(btn.dataset.gap, 10);
  if (gap === currentGap) return;
  currentGap = gap;

  gapButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ctrl-btn--active", parseInt(b.dataset.gap) === gap);
  });

  createGrid(currentColumns, currentGap);
});

// =============================================================================
// Navigation controls
// =============================================================================

document.getElementById("btn-first").addEventListener("click", () => {
  list.scrollToIndex(0, "start");
});

document.getElementById("btn-middle").addEventListener("click", () => {
  list.scrollToIndex(Math.floor(ITEM_COUNT / 2), "center");
});

document.getElementById("btn-last").addEventListener("click", () => {
  list.scrollToIndex(ITEM_COUNT - 1, "end");
});

// =============================================================================
// Initialise
// =============================================================================

createGrid(currentColumns, currentGap);
