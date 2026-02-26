// Builder Masonry — Pinterest-style layout
// Uses vlist/builder with withMasonry + withScrollbar plugins
// Demonstrates virtualized masonry layout with variable-height photos

import { vlist, withMasonry, withScrollbar } from "vlist";

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

// Generate photos with variable heights for masonry effect
const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = categories[i % categories.length];

  // Random heights between 200-400px for organic masonry layout
  const heightVariation = [200, 250, 300, 350, 400];
  const height = heightVariation[i % heightVariation.length];

  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.random() * 500),
    picId,
    height,
  };
});

// =============================================================================
// Item template
// =============================================================================

const itemTemplate = (item) => `
  <div class="card">
    <img
      class="card__img"
      src="https://picsum.photos/id/${item.picId}/300/${item.height}"
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
// Create / Recreate masonry
// =============================================================================

function createMasonry(orientation, columns, gap) {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }

  // Clear container
  const container = document.getElementById("masonry-container");
  container.innerHTML = "";

  // For masonry, item heights come from the data
  // We just need to pass them through
  list = vlist({
    container: "#masonry-container",
    ariaLabel: "Photo gallery",
    orientation,
    item: {
      height: (index) => items[index].height,
      width:
        orientation === "horizontal"
          ? (index) => items[index].height * 1.2
          : undefined,
      template: itemTemplate,
    },
    items,
  })
    .use(withMasonry({ columns, gap }))
    .use(withScrollbar({ autoHide: true }))
    .build();

  // Bind events
  list.on("scroll", () => scheduleStatsUpdate());
  list.on("range:change", ({ range }) => {
    rangeEl.textContent = `items ${range.start} – ${range.end}`;
    scheduleStatsUpdate();
  });

  list.on("item:click", ({ item }) => {
    showDetail(item);
  });

  updateStats();
  updateMasonryInfo(orientation, columns, gap);
}

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");
const rangeEl = document.getElementById("visible-range");
const masonryInfoEl = document.getElementById("masonry-info");
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
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const saved = ((1 - domNodes / ITEM_COUNT) * 100).toFixed(1);

  statsEl.innerHTML =
    `<strong>Photos:</strong> ${ITEM_COUNT}` +
    ` · <strong>Layout:</strong> Masonry` +
    ` · <strong>DOM:</strong> ${domNodes}` +
    ` · <strong>Virtualized:</strong> ${saved}%`;
}

function updateMasonryInfo(orientation, columns, gap) {
  const isH = orientation === "horizontal";
  const crossLabel = isH ? "Rows" : "Columns";

  masonryInfoEl.innerHTML =
    `<strong>Orientation:</strong> ${orientation}` +
    ` · <strong>${crossLabel}:</strong> ${columns}` +
    ` · <strong>Gap:</strong> ${gap}px` +
    ` · <strong>Heights:</strong> 200-400px (variable)`;
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
      <span class="detail__height">Height: ${item.height}px</span>
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

  createMasonry(currentOrientation, currentColumns, currentGap);
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

  createMasonry(currentOrientation, currentColumns, currentGap);
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

  createMasonry(currentOrientation, currentColumns, currentGap);
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

createMasonry(currentOrientation, currentColumns, currentGap);
