// Controls — Svelte implementation with vlist action
// Interactive control panel demonstrating vlist's navigation, selection, and viewport APIs

import { vlist, onVListEvent } from "vlist-svelte";
import {
  TOTAL,
  items,
  itemTemplate,
  formatSelectionCount,
  calculateMemorySaved,
} from "../shared.js";

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");
const container = document.getElementById("list-container");

// Navigation
const scrollIndexInput = document.getElementById("scroll-index");
const scrollAlignSelect = document.getElementById("scroll-align");
const btnGo = document.getElementById("btn-go");
const btnFirst = document.getElementById("btn-first");
const btnMiddle = document.getElementById("btn-middle");
const btnLast = document.getElementById("btn-last");
const btnRandom = document.getElementById("btn-random");
const btnSmoothTop = document.getElementById("btn-smooth-top");
const btnSmoothBottom = document.getElementById("btn-smooth-bottom");

// Selection
const selectionModeEl = document.getElementById("selection-mode");
const btnSelectAll = document.getElementById("btn-select-all");
const btnClear = document.getElementById("btn-clear");
const selectionCountEl = document.getElementById("selection-count");

// Detail
const itemDetailEl = document.getElementById("item-detail");

// Viewport
const scrollPositionEl = document.getElementById("scroll-position");
const scrollDirectionEl = document.getElementById("scroll-direction");
const visibleRangeEl = document.getElementById("visible-range");

// =============================================================================
// State
// =============================================================================

let currentSelectionMode = "single";
let action = null;
let listInstance = null;

// =============================================================================
// Stats bar
// =============================================================================

const statsTotalEl = statsEl.children[0];
const statsDomEl = statsEl.children[1];
const statsMemEl = statsEl.children[2];

function updateStats() {
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const saved = calculateMemorySaved(domNodes, TOTAL);

  statsTotalEl.innerHTML = `<strong>Total:</strong> ${TOTAL.toLocaleString()}`;
  statsDomEl.innerHTML = `<strong>DOM nodes:</strong> ${domNodes}`;
  statsMemEl.innerHTML = `<strong>Memory saved:</strong> ${saved}%`;
}

// =============================================================================
// Create / Recreate list
// =============================================================================

function createList(mode) {
  // Destroy previous action
  if (action && action.destroy) {
    action.destroy();
    action = null;
    listInstance = null;
  }

  // Clear container
  container.innerHTML = "";

  // Create vlist action
  action = vlist(container, {
    config: {
      ariaLabel: "User list",
      selection: { mode },
      item: {
        height: 64,
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

  onVListEvent(listInstance, "scroll", ({ scrollTop, direction }) => {
    scrollPositionEl.textContent = `${Math.round(scrollTop)}px`;
    scrollDirectionEl.textContent = direction === "up" ? "↑ up" : "↓ down";
    updateStats();
  });

  onVListEvent(listInstance, "range:change", ({ range }) => {
    visibleRangeEl.textContent = `${range.start} – ${range.end}`;
    updateStats();
  });

  onVListEvent(listInstance, "selection:change", ({ selected }) => {
    updateSelectionCount(selected);
  });

  onVListEvent(listInstance, "item:click", ({ item, index }) => {
    showItemDetail(item, index);
    scrollIndexInput.value = index;
  });
}

// =============================================================================
// Navigation controls
// =============================================================================

btnGo.addEventListener("click", () => {
  const index = parseInt(scrollIndexInput.value, 10);
  if (Number.isNaN(index)) return;
  const clamped = Math.max(0, Math.min(index, TOTAL - 1));
  listInstance?.scrollToIndex(clamped, scrollAlignSelect.value);
});

scrollIndexInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnGo.click();
  }
});

btnFirst.addEventListener("click", () => {
  listInstance?.scrollToIndex(0, "start");
});

btnMiddle.addEventListener("click", () => {
  listInstance?.scrollToIndex(Math.floor(TOTAL / 2), "center");
});

btnLast.addEventListener("click", () => {
  listInstance?.scrollToIndex(TOTAL - 1, "end");
});

btnRandom.addEventListener("click", () => {
  const index = Math.floor(Math.random() * TOTAL);
  listInstance?.scrollToIndex(index, "center");
  scrollIndexInput.value = index;
});

btnSmoothTop.addEventListener("click", () => {
  listInstance?.scrollToIndex(0, {
    align: "start",
    behavior: "smooth",
    duration: 600,
  });
});

btnSmoothBottom.addEventListener("click", () => {
  listInstance?.scrollToIndex(TOTAL - 1, {
    align: "end",
    behavior: "smooth",
    duration: 600,
  });
});

// =============================================================================
// Selection controls
// =============================================================================

function setSelectionMode(mode) {
  if (mode === currentSelectionMode) return;
  currentSelectionMode = mode;

  // Update segmented button active state
  selectionModeEl.querySelectorAll(".panel-segmented__btn").forEach((btn) => {
    btn.classList.toggle(
      "panel-segmented__btn--active",
      btn.dataset.value === mode,
    );
  });

  // Destroy old instance and recreate with new selection mode
  createList(mode);
  updateSelectionCount([]);
}

selectionModeEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".panel-segmented__btn");
  if (btn) setSelectionMode(btn.dataset.value);
});

btnSelectAll.addEventListener("click", () => {
  if (currentSelectionMode !== "multiple") {
    setSelectionMode("multiple");
  }
  listInstance?.selectAll();
});

btnClear.addEventListener("click", () => {
  listInstance?.clearSelection();
});

function updateSelectionCount(selected) {
  selectionCountEl.textContent = formatSelectionCount(selected.length);
}

// =============================================================================
// Item detail
// =============================================================================

function showItemDetail(item, index) {
  itemDetailEl.innerHTML = `
    <div class="panel-detail__header">
      <span class="panel-detail__avatar">${item.initials}</span>
      <div>
        <div class="panel-detail__name">${item.name}</div>
        <div class="panel-detail__email">${item.email}</div>
      </div>
    </div>
    <div class="panel-detail__meta">
      <span>id: ${item.id}</span>
      <span>index: ${index}</span>
    </div>
  `;
}

// =============================================================================
// Initialise
// =============================================================================

createList(currentSelectionMode);
