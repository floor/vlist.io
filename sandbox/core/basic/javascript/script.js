// Core Light Example - Ultra-Lightweight Virtual List (Fixed Heights Only)
// Same result as Basic, but using vlist/core-light for maximum performance
// Uses fixed heights only (no variable height overhead) for ~30% additional size reduction
// Includes single item selection support

import { createVList } from "vlist/core-light";

// =============================================================================
// Generate test data
// =============================================================================

let nextId = 1;

function generateItems(count) {
  return Array.from({ length: count }, () => {
    const id = nextId++;
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      initials: String.fromCharCode(65 + ((id - 1) % 26)),
    };
  });
}

let items = generateItems(100000);

const itemTemplate = (item, index, state) => `
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
// Create list instance
// =============================================================================

const list = createVList({
  container: "#list-container",
  ariaLabel: "User list",
  item: {
    height: 64,
    template: itemTemplate,
  },
  items,
});

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

// Data methods
const btnAppend = document.getElementById("btn-append");
const btnPrepend = document.getElementById("btn-prepend");
const btnReset10k = document.getElementById("btn-reset-10k");
const btnReset100k = document.getElementById("btn-reset-100k");

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
  const total = list.total;
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const saved = Math.round((1 - domNodes / total) * 100);

  statsTotalEl.innerHTML = `<strong>Total:</strong> ${total.toLocaleString()}`;
  statsDomEl.innerHTML = `<strong>DOM nodes:</strong> ${domNodes}`;
  statsMemEl.innerHTML = `<strong>Memory saved:</strong> ${saved}%`;
}

// =============================================================================
// Navigation controls
// =============================================================================

btnGo.addEventListener("click", () => {
  const index = parseInt(scrollIndexInput.value, 10);
  if (Number.isNaN(index)) return;
  const clamped = Math.max(0, Math.min(index, list.total - 1));
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
  list.scrollToIndex(Math.floor(list.total / 2), "center"),
);

btnLast.addEventListener("click", () =>
  list.scrollToIndex(list.total - 1, "end"),
);

btnRandom.addEventListener("click", () => {
  const index = Math.floor(Math.random() * list.total);
  list.scrollToIndex(index, "center");
  scrollIndexInput.value = index;
});

// =============================================================================
// Data method controls
// =============================================================================

btnAppend.addEventListener("click", () => {
  const newItems = generateItems(100);
  list.appendItems(newItems);
  items = [...items, ...newItems];
  updateStats();
});

btnPrepend.addEventListener("click", () => {
  const newItems = generateItems(100);
  list.prependItems(newItems);
  items = [...newItems, ...items];
  updateStats();
});

btnReset10k.addEventListener("click", () => {
  nextId = 1;
  items = generateItems(10000);
  list.setItems(items);
  scrollIndexInput.max = items.length - 1;
  updateStats();
});

btnReset100k.addEventListener("click", () => {
  nextId = 1;
  items = generateItems(100000);
  list.setItems(items);
  scrollIndexInput.max = items.length - 1;
  updateStats();
});

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
// Event bindings
// =============================================================================

list.on("scroll", ({ scrollTop, direction }) => {
  updateScrollInfo(scrollTop, direction);
  updateStats();
});

list.on("range:change", ({ range }) => {
  updateVisibleRange(range);
  updateStats();
});

list.on("selection:change", ({ selectedId }) => {
  if (selectedId !== null) {
    const index = items.findIndex((item) => item.id === selectedId);
    if (index >= 0) {
      showItemDetail(items[index], index);
      scrollIndexInput.value = index;
    }
  }
});

// Handle clicks manually to trigger selection
list.element.addEventListener("click", (e) => {
  const itemEl = e.target.closest(".vlist-item");
  if (itemEl) {
    const itemId = itemEl.dataset.id;
    if (itemId) {
      list.selectItem(Number(itemId));
    }
  }
});

// =============================================================================
// Initialise
// =============================================================================

updateStats();
