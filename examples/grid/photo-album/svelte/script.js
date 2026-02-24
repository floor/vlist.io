// Grid Photo Album — Svelte
// Uses vlist/builder with withGrid + withScrollbar plugins
// Demonstrates a virtualized 2D photo gallery with Svelte action

import { vlist, onVListEvent } from "vlist-svelte";

// =============================================================================
// Data Generation
// =============================================================================

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
// Item Template
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
// DOM References
// =============================================================================

const container = document.getElementById("grid-container");
const statsEl = document.getElementById("stats");
const visibleRangeEl = document.getElementById("visible-range");
const gridInfoEl = document.getElementById("grid-info");
const detailEl = document.getElementById("photo-detail");
const orientationButtons = document.getElementById("orientation-buttons");
const columnsButtons = document.getElementById("columns-buttons");
const columnsLabel = document.getElementById("columns-label");
const gapButtons = document.getElementById("gap-buttons");

// =============================================================================
// State
// =============================================================================

let currentOrientation = "vertical";
let currentColumns = 4;
let currentGap = 8;
let action = null;
let listInstance = null;
let statsRaf = null;

// =============================================================================
// Create Grid
// =============================================================================

function createGrid(orientation, columns, gap) {
  // Destroy previous action
  if (action && action.destroy) {
    action.destroy();
    action = null;
    listInstance = null;
  }

  // Clear container
  container.innerHTML = "";

  // Calculate item dimensions to maintain 4:3 landscape aspect ratio
  const innerWidth = container.clientWidth - 2; // account for border
  const colWidth = (innerWidth - (columns - 1) * gap) / columns;

  let height, width;
  if (orientation === "horizontal") {
    // After the renderer fix: CSS width = horizontal extent = item.width - gap
    //                         CSS height = vertical extent   = colWidth
    // For 4:3 landscape: (item.width - gap) / colWidth = 4/3
    //   → item.width = colWidth * (4/3) + gap
    width = Math.round(colWidth * (4 / 3) + gap);
    height = Math.round(colWidth); // cross-axis (vertical extent)
  } else {
    // Vertical: CSS width = colWidth, CSS height = item.height - gap
    // For 4:3: item.height ≈ colWidth * 0.75
    width = Math.round(colWidth);
    height = Math.round(colWidth * 0.75);
  }

  // Create vlist action with builder pattern
  action = vlist(container, {
    config: {
      ariaLabel: "Photo gallery",
      orientation,
      layout: "grid",
      grid: {
        columns,
        gap,
      },
      item: {
        height,
        width: orientation === "horizontal" ? width : undefined,
        template: itemTemplate,
      },
      items,
      scroll: {
        scrollbar: {
          autoHide: true,
        },
      },
    },
    onInstance: (inst) => {
      listInstance = inst;
      bindListEvents();
      updateStats();
      updateGridInfo(orientation, columns, gap, width, height);
    },
  });
}

// =============================================================================
// Event Bindings
// =============================================================================

function bindListEvents() {
  if (!listInstance) return;

  onVListEvent(listInstance, "scroll", () => scheduleStatsUpdate());

  onVListEvent(listInstance, "range:change", ({ range }) => {
    visibleRangeEl.textContent = `rows ${range.start} – ${range.end}`;
    scheduleStatsUpdate();
  });

  onVListEvent(listInstance, "item:click", ({ item }) => {
    showDetail(item);
  });
}

// =============================================================================
// Stats
// =============================================================================

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
// Photo Detail
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
// Controls
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

// Navigation buttons
document.getElementById("btn-first").addEventListener("click", () => {
  listInstance?.scrollToIndex(0, "start");
});

document.getElementById("btn-middle").addEventListener("click", () => {
  listInstance?.scrollToIndex(Math.floor(ITEM_COUNT / 2), "center");
});

document.getElementById("btn-last").addEventListener("click", () => {
  listInstance?.scrollToIndex(ITEM_COUNT - 1, "end");
});

// =============================================================================
// Initialize
// =============================================================================

createGrid(currentOrientation, currentColumns, currentGap);
