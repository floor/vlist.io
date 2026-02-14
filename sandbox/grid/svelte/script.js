// Grid Layout — Svelte implementation with vlist action
// Virtualized 2D photo gallery with 1,000 real photos from Lorem Picsum

import { vlist, onVListEvent } from "vlist/svelte";
import {
  items,
  itemTemplate,
  calculateRowHeight,
  formatStatsHtml,
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
} from "../shared.js";

// =============================================================================
// DOM references
// =============================================================================

const container = document.getElementById("grid-container");
const statsEl = document.getElementById("stats");
const columnsSelect = document.getElementById("columns-select");
const gapSelect = document.getElementById("gap-select");

// =============================================================================
// State
// =============================================================================

let currentColumns = DEFAULT_COLUMNS;
let currentGap = DEFAULT_GAP;
let action = null;
let listInstance = null;

// =============================================================================
// Create Grid
// =============================================================================

function createGrid(columns, gap) {
  // Destroy previous action
  if (action && action.destroy) {
    action.destroy();
    action = null;
    listInstance = null;
  }

  // Clear container
  container.innerHTML = "";

  // Calculate row height from column width to maintain 4:3 aspect ratio
  const height = calculateRowHeight(container.clientWidth, columns, gap);

  // Create vlist action
  action = vlist(container, {
    config: {
      ariaLabel: "Photo gallery",
      layout: "grid",
      grid: {
        columns,
        gap,
      },
      item: {
        height,
        template: itemTemplate,
      },
      items,
    },
    onInstance: (inst) => {
      listInstance = inst;
      bindListEvents();
      updateStats();
    },
  });
}

// =============================================================================
// Event bindings
// =============================================================================

function bindListEvents() {
  if (!listInstance) return;

  onVListEvent(listInstance, "scroll", updateStats);
  onVListEvent(listInstance, "range:change", updateStats);

  onVListEvent(listInstance, "item:click", ({ item, index }) => {
    console.log(`Clicked: ${item.title} (${item.category}) at index ${index}`);
  });
}

// =============================================================================
// Stats
// =============================================================================

function updateStats() {
  const domNodes = document.querySelectorAll(
    ".vlist-item, .vlist-grid-item",
  ).length;
  statsEl.innerHTML = formatStatsHtml(domNodes, items.length, currentColumns);
}

// =============================================================================
// Controls
// =============================================================================

columnsSelect.addEventListener("change", (e) => {
  currentColumns = parseInt(e.target.value, 10);
  createGrid(currentColumns, currentGap);
});

gapSelect.addEventListener("change", (e) => {
  currentGap = parseInt(e.target.value, 10);
  createGrid(currentColumns, currentGap);
});

// =============================================================================
// Initialize
// =============================================================================

createGrid(currentColumns, currentGap);
