// Photo Album — Virtualized 2D photo gallery
// Demonstrates withGrid + withMasonry + withScrollbar plugins
// Layout mode toggle: Grid ↔ Masonry

import { vlist, withGrid, withMasonry, withScrollbar } from "vlist";
import { createStats } from "../../../stats.js";
import "./controls.js";

// =============================================================================
// Constants
// =============================================================================

const PHOTO_COUNT = 1084;
export const ITEM_COUNT = 600;

const CATEGORIES = [
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

// =============================================================================
// Data
// =============================================================================

const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = CATEGORIES[i % CATEGORIES.length];
  // Variable heights for masonry mode (200–400px)
  const heightVariation = [200, 250, 300, 350, 400];
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.abs(Math.sin(i * 2.1)) * 500),
    picId,
    masonryHeight: heightVariation[i % heightVariation.length],
  };
});

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let currentMode = "grid"; // "grid" | "masonry"
export let currentOrientation = "vertical";
export let currentColumns = 4;
export let currentGap = 8;
export let list = null;

export function setCurrentMode(v) {
  currentMode = v;
}
export function setCurrentOrientation(v) {
  currentOrientation = v;
}
export function setCurrentColumns(v) {
  currentColumns = v;
}
export function setCurrentGap(v) {
  currentGap = v;
}

// =============================================================================
// Template
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
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

// For grid, the "item height" for progress calculation is the row height.
// We approximate by computing it from the container and columns.
function getEffectiveItemHeight() {
  const container = document.getElementById("grid-container");
  if (!container || !list) return 200;
  if (currentMode === "masonry") return 280; // rough average for masonry
  const innerWidth = container.clientWidth - 2;
  const colWidth =
    (innerWidth - (currentColumns - 1) * currentGap) / currentColumns;
  return Math.round(colWidth * 0.75); // 4:3 aspect
}

// For grid, total is rows not items
function getEffectiveTotal() {
  if (currentMode === "masonry") return ITEM_COUNT;
  return Math.ceil(ITEM_COUNT / currentColumns);
}

export const stats = createStats({
  getList: () => list,
  getTotal: () => ITEM_COUNT,
  getItemHeight: () => getEffectiveItemHeight(),
  container: "#grid-container",
});

// =============================================================================
// Create / Recreate
// =============================================================================

let firstVisibleIndex = 0;

export function createView() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("grid-container");
  container.innerHTML = "";

  const orientation = currentOrientation;
  const columns = currentColumns;
  const gap = currentGap;

  if (currentMode === "grid") {
    createGridView(container, orientation, columns, gap);
  } else {
    createMasonryView(container, orientation, columns, gap);
  }

  // Wire events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", ({ range }) => {
    // Grid emits range in row space — convert to item index
    firstVisibleIndex =
      currentMode === "grid" ? range.start * currentColumns : range.start;
    stats.scheduleUpdate();
  });
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  list.on("item:click", ({ item }) => {
    showDetail(item);
  });

  // Restore scroll position to first visible item
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  stats.update();
  updateContext();
}

function createGridView(container, orientation, columns, gap) {
  // Calculate item dimensions for 4:3 aspect ratio
  let colWidth;
  if (orientation === "horizontal") {
    const innerHeight = container.clientHeight - 2;
    colWidth = (innerHeight - (columns - 1) * gap) / columns;
  } else {
    const innerWidth = container.clientWidth - 2;
    colWidth = (innerWidth - (columns - 1) * gap) / columns;
  }

  let height, width;
  if (orientation === "horizontal") {
    width = Math.round(colWidth * (4 / 3) + gap);
    height = Math.round(colWidth);
  } else {
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
}

function createMasonryView(container, orientation, columns, gap) {
  list = vlist({
    container: "#grid-container",
    ariaLabel: "Photo gallery",
    orientation,
    item: {
      height: (index) => items[index].masonryHeight,
      width:
        orientation === "horizontal"
          ? (index) => items[index].masonryHeight * 1.2
          : undefined,
      template: itemTemplate,
    },
    items,
  })
    .use(withMasonry({ columns, gap }))
    .use(withScrollbar({ autoHide: true }))
    .build();
}

// =============================================================================
// Photo detail (panel)
// =============================================================================

const detailEl = document.getElementById("photo-detail");

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
// Footer — right side (contextual)
// =============================================================================

const ftMode = document.getElementById("ft-mode");
const ftOrientation = document.getElementById("ft-orientation");

export function updateContext() {
  ftMode.textContent = currentMode;
  ftOrientation.textContent = currentOrientation;
}

// =============================================================================
// Initialise
// =============================================================================

createView();
