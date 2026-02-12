// Builder Example — Composable entry point
// Uses vlist/builder with withSelection + withScrollbar plugins

import { vlist } from "vlist/builder";
import { withSelection } from "vlist/selection";
import { withScrollbar } from "vlist/scroll";

// Generate test data
const items = Array.from({ length: 100000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  initials: String.fromCharCode(65 + (i % 26)),
}));

const TOTAL = items.length;

// Item template
const itemTemplate = (item, index) => `
  <div class="item-content">
    <div class="item-avatar">${item.initials}</div>
    <div class="item-details">
      <div class="item-name">${item.name}</div>
      <div class="item-email">${item.email}</div>
    </div>
    <div class="item-index">#${index + 1}</div>
  </div>
`;

// =============================================================================
// Create list instance via builder
// =============================================================================

let currentSelectionMode = "single";

function createList(mode) {
  return vlist({
    container: "#list-container",
    ariaLabel: "User list (builder)",
    item: {
      height: 64,
      template: itemTemplate,
    },
    items,
  })
    .use(withSelection({ mode }))
    .use(withScrollbar({ autoHide: true }))
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

const statsTotalEl = statsEl.children[0];
const statsDomEl = statsEl.children[1];
const statsMemEl = statsEl.children[2];

function updateStats() {
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const saved = Math.round((1 - domNodes / TOTAL) * 100);

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
  const count = selected.length;
  selectionCountEl.textContent =
    count === 0
      ? "0 items"
      : count === 1
        ? "1 item"
        : `${count.toLocaleString()} items`;
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
