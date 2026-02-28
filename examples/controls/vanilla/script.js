// Controls - Pure Vanilla JavaScript
// Interactive control panel demonstrating vlist's navigation, selection, and viewport APIs

import { vlist, withSelection } from "vlist";
import {
  TOTAL,
  items,
  itemTemplate,
  formatSelectionCount,
  calculateMemorySaved,
} from "../shared.js";

// =============================================================================
// Create list instance
// =============================================================================

let currentSelectionMode = "single";

function createList(mode) {
  return vlist({
    container: "#list-container",
    ariaLabel: "User list",
    item: {
      height: 64,
      template: itemTemplate,
    },
    items,
  })
    .use(withSelection({ mode }))
    .build();
}

let list = createList(currentSelectionMode);

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");

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
// Stats bar
// =============================================================================

// Stats bar spans are defined in HTML alongside viewport spans,
// so we update them individually instead of replacing innerHTML.
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
// Navigation controls
// =============================================================================

btnGo.addEventListener("click", () => {
  const index = parseInt(scrollIndexInput.value, 10);
  if (Number.isNaN(index)) return;
  const clamped = Math.max(0, Math.min(index, TOTAL - 1));
  list.scrollToIndex(clamped, scrollAlignSelect.value);
});

scrollIndexInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    btnGo.click();
  }
});

btnFirst.addEventListener("click", () => list.scrollToIndex(0, "start"));

btnMiddle.addEventListener("click", () =>
  list.scrollToIndex(Math.floor(TOTAL / 2), "center"),
);

btnLast.addEventListener("click", () => list.scrollToIndex(TOTAL - 1, "end"));

btnRandom.addEventListener("click", () => {
  const index = Math.floor(Math.random() * TOTAL);
  list.scrollToIndex(index, "center");
  scrollIndexInput.value = index;
});

btnSmoothTop.addEventListener("click", () => {
  list.scrollToIndex(0, {
    align: "start",
    behavior: "smooth",
    duration: 600,
  });
});

btnSmoothBottom.addEventListener("click", () => {
  list.scrollToIndex(TOTAL - 1, {
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
  list.destroy();
  list = createList(mode);
  bindListEvents();

  updateSelectionCount([]);
  updateStats();
}

selectionModeEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".panel-segmented__btn");
  if (btn) setSelectionMode(btn.dataset.value);
});

btnSelectAll.addEventListener("click", () => {
  if (currentSelectionMode !== "multiple") {
    setSelectionMode("multiple");
  }
  list.selectAll();
});

btnClear.addEventListener("click", () => {
  list.clearSelection();
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
// Viewport tracking
// =============================================================================

function updateScrollInfo(scrollTop, direction) {
  scrollPositionEl.textContent = `${Math.round(scrollTop)}px`;
  scrollDirectionEl.textContent = direction === "up" ? "↑ up" : "↓ down";
}

function updateVisibleRange(range) {
  if (range) {
    visibleRangeEl.textContent = `${range.start} – ${range.end}`;
  }
}

// =============================================================================
// Event bindings (extracted so we can re-bind after recreation)
// =============================================================================

function bindListEvents() {
  list.on("scroll", ({ scrollTop, direction }) => {
    updateScrollInfo(scrollTop, direction);
    updateStats();
  });

  list.on("range:change", ({ range }) => {
    updateVisibleRange(range);
    updateStats();
  });

  list.on("selection:change", ({ selected }) => {
    updateSelectionCount(selected);
  });

  list.on("item:click", ({ item, index }) => {
    showItemDetail(item, index);
    scrollIndexInput.value = index;
  });
}

// =============================================================================
// Initialise
// =============================================================================

bindListEvents();
updateStats();
