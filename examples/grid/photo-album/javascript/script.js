// Builder Grid — Composable entry point
// Uses vlist/builder with withGrid + withScrollbar plugins
// Demonstrates a virtualized 2D photo gallery using the builder API

import { vlist, withGrid, withScrollbar } from "vlist";

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

let currentOrientation = "vertical";
let currentColumns = 4;
let currentGap = 8;
let list = null;

// =============================================================================
// Create / Recreate grid
// =============================================================================

function createGrid(orientation, columns, gap) {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }

  // Clear container
  const container = document.getElementById("grid-container");
  container.innerHTML = "";

  // Calculate item dimensions to maintain 4:3 landscape aspect ratio.
  // colWidth = cross-axis cell size:
  //   vertical mode  → derived from container width  (cross-axis = horizontal)
  //   horizontal mode → derived from container height (cross-axis = vertical)
  let colWidth;
  if (orientation === "horizontal") {
    const innerHeight = container.clientHeight - 2; // account for border
    colWidth = (innerHeight - (columns - 1) * gap) / columns;
  } else {
    const innerWidth = container.clientWidth - 2;
    colWidth = (innerWidth - (columns - 1) * gap) / columns;
  }

  let height, width;
  if (orientation === "horizontal") {
    // CSS width = horizontal extent = item.width - gap (main axis)
    // CSS height = vertical extent  = colWidth         (cross axis)
    // For 4:3 landscape: (item.width - gap) / colWidth = 4/3
    //   → item.width = colWidth * (4/3) + gap
    width = Math.round(colWidth * (4 / 3) + gap);
    height = Math.round(colWidth); // cross-axis (vertical extent)
  } else {
    // CSS width = colWidth, CSS height = item.height - gap
    // For 4:3: item.height ≈ colWidth * 0.75
    width = Math.round(colWidth);
    height = Math.round(colWidth * 0.75);
  }

  list = vlist({
    container: "#grid-container",
    ariaLabel: "Photo gallery",
    orientation,
    item: {
      height,
      width: orientation === "horizontal" ? width : undefined,
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
  updateGridInfo(orientation, columns, gap, width, height);
}

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");
const rangeEl = document.getElementById("visible-range");
const gridInfoEl = document.getElementById("grid-info");
const detailEl = document.getElementById("photo-detail");
const orientationButtons = document.getElementById("orientation-buttons");
const columnsButtons = document.getElementById("columns-buttons");
const columnsLabel = document.getElementById("columns-label");
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
  const isH = currentOrientation === "horizontal";
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const totalGroups = Math.ceil(ITEM_COUNT / currentColumns);
  const saved = ((1 - domNodes / ITEM_COUNT) * 100).toFixed(1);
  const groupLabel = isH ? "Columns" : "Rows";

  statsEl.innerHTML =
    `<strong>Photos:</strong> ${ITEM_COUNT}` +
    ` · <strong>${groupLabel}:</strong> ${totalGroups}` +
    ` · <strong>DOM:</strong> ${domNodes}` +
    ` · <strong>Virtualized:</strong> ${saved}%`;
}

function updateGridInfo(orientation, columns, gap, width, height) {
  const isH = orientation === "horizontal";
  const crossLabel = isH ? "Rows" : "Columns";

  // Show visual dimensions (what you actually see on screen)
  const displayW = isH ? width - gap : width;
  const displayH = isH ? height : Math.max(0, height - gap);

  gridInfoEl.innerHTML =
    `<strong>Orientation:</strong> ${orientation}` +
    ` · <strong>${crossLabel}:</strong> ${columns}` +
    ` · <strong>Gap:</strong> ${gap}px` +
    ` · <strong>Item:</strong> ${displayW}×${displayH}px` +
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
// Orientation controls
// =============================================================================

orientationButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-orientation]");
  if (!btn) return;

  const orientation = btn.dataset.orientation;
  if (orientation === currentOrientation) return;
  currentOrientation = orientation;

  orientationButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "ctrl-btn--active",
      b.dataset.orientation === orientation,
    );
  });

  // Update label to reflect cross-axis meaning
  columnsLabel.textContent = orientation === "horizontal" ? "Rows" : "Columns";

  createGrid(currentOrientation, currentColumns, currentGap);
});

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

  createGrid(currentOrientation, currentColumns, currentGap);
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

  createGrid(currentOrientation, currentColumns, currentGap);
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

createGrid(currentOrientation, currentColumns, currentGap);
