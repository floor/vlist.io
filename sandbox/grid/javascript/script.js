// Grid Layout — Vanilla JavaScript
// Virtualized 2D photo gallery with 1,000 real photos from Lorem Picsum

import { vlist } from "vlist/builder";
import { withGrid } from "vlist/grid";
import {
  items,
  itemTemplate,
  calculateRowHeight,
  formatStatsHtml,
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
} from "../shared.js";

// =============================================================================
// State
// =============================================================================

let currentColumns = DEFAULT_COLUMNS;
let currentGap = DEFAULT_GAP;
let listInstance = null;

// =============================================================================
// Create Grid
// =============================================================================

const createGrid = (columns, gap) => {
  listInstance = vlist({
    container: "#grid-container",
    ariaLabel: "Photo gallery",
    item: {
      // Height function receives grid context for dynamic aspect ratio
      height: (index, context) => {
        if (context) {
          return context.columnWidth * 0.75; // 4:3 aspect ratio
        }
        return 200; // fallback
      },
      template: itemTemplate,
    },
    items,
  })
    .use(withGrid({ columns, gap }))
    .build();

  // Update stats on scroll
  listInstance.on("scroll", updateStats);
  listInstance.on("range:change", updateStats);
  updateStats();

  // Log clicks
  listInstance.on("item:click", ({ item, index }) => {
    console.log(`Clicked: ${item.title} (${item.category}) at index ${index}`);
  });
};

const updateGrid = (columns, gap) => {
  // Use the updateGrid() method from the withGrid plugin
  listInstance.updateGrid({
    columns,
    gap,
  });
  updateStats();
};

// =============================================================================
// Stats
// =============================================================================

const statsEl = document.getElementById("stats");

const updateStats = () => {
  const domNodes = document.querySelectorAll(
    ".vlist-item, .vlist-grid-item",
  ).length;
  statsEl.innerHTML = formatStatsHtml(domNodes, items.length, currentColumns);
};

// =============================================================================
// Controls
// =============================================================================

const columnsSelect = document.getElementById("columns-select");
const gapSelect = document.getElementById("gap-select");

columnsSelect.addEventListener("change", (e) => {
  currentColumns = parseInt(e.target.value, 10);
  updateGrid(currentColumns, currentGap);
});

gapSelect.addEventListener("change", (e) => {
  currentGap = parseInt(e.target.value, 10);
  updateGrid(currentColumns, currentGap);
});

// =============================================================================
// Initialize
// =============================================================================

createGrid(currentColumns, currentGap);
