// Builder Million Items — Composable entry point
// Uses vlist/builder with withScale + withScrollbar plugins
// Demonstrates handling 1M+ items with automatic scroll scaling

import { vlist, withScale, withScrollbar } from "vlist";
import { createStats } from "../../stats.js";
import { createFooterUpdater } from "../../footer.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const SIZES = {
  "100k": 100_000,
  "500k": 500_000,
  "1m": 1_000_000,
  "2m": 2_000_000,
  "5m": 5_000_000,
};

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];

// Simple hash for consistent per-item values
const hash = (n) => {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 16;
  return Math.abs(h);
};

// =============================================================================
// Generate lightweight items (only id — display data computed in template)
// =============================================================================

const generateItems = (count) =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1 }));

// =============================================================================
// Item template
// =============================================================================

const itemTemplate = (_item, index) => {
  const h = hash(index);
  const value = h % 100;
  const hex = h.toString(16).slice(0, 8).toUpperCase();
  const color = COLORS[index % COLORS.length];

  return `
  <div class="item-row">
    <div class="item-color" style="background:${color}"></div>
    <div class="item-info">
      <span class="item-label">#${(index + 1).toLocaleString()}</span>
      <span class="item-hash">${hex}</span>
    </div>
    <div class="item-bar-wrap">
      <div class="item-bar" style="width:${value}%;background:${color}"></div>
    </div>
    <span class="item-value">${value}%</span>
  </div>
`;
};

// =============================================================================
// DOM references
// =============================================================================

const scrollPosEl = document.getElementById("scroll-position");
const scrollDirEl = document.getElementById("scroll-direction");
const rangeEl = document.getElementById("visible-range");
const sizeButtons = document.getElementById("size-buttons");

// Footer right-side elements
const ftVirtualizedEl = document.getElementById("ft-virtualized");
const ftScaleEl = document.getElementById("ft-scale");
const ftModeEl = document.getElementById("ft-mode");
const ftModeStatEl = document.getElementById("ft-mode-stat");

// =============================================================================
// Shared footer stats (left side — progress, velocity, items)
// =============================================================================

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => SIZES[currentSize],
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateFooter = createFooterUpdater(stats);

// =============================================================================
// State
// =============================================================================

let currentSize = "1m";
let list = null;

// =============================================================================
// Create / Recreate list
// =============================================================================

function createList(sizeKey) {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }

  // Clear container
  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const count = SIZES[sizeKey];
  const items = generateItems(count);

  const builder = vlist({
    container: "#list-container",
    ariaLabel: `${count.toLocaleString()} items list`,
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items,
  });

  if (count > 100_000) {
    builder.use(withScale()).use(withScrollbar({ autoHide: true }));
  }

  list = builder.build();

  // Bind events
  list.on("scroll", ({ scrollTop, direction }) => {
    scrollPosEl.textContent = `${Math.round(scrollTop).toLocaleString()}px`;
    scrollDirEl.textContent = direction === "up" ? "↑ up" : "↓ down";
    updateFooter();
  });

  list.on("range:change", ({ range }) => {
    rangeEl.textContent = `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`;
    updateFooter();
  });

  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateFooter();
  });

  // Update footer
  updateFooter();
  updateContext(count);
}

// =============================================================================
// Footer right side — context (virtualized %, scale mode)
// =============================================================================

function updateContext(count) {
  const totalHeight = count * ITEM_HEIGHT;
  const maxHeight = 16_777_216; // browser limit ~16.7M px
  const isScaled = totalHeight > maxHeight;
  const ratio = isScaled ? (totalHeight / maxHeight).toFixed(1) : "1.0";
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const virtualized = ((1 - domNodes / count) * 100).toFixed(2);

  ftVirtualizedEl.textContent = `${virtualized}%`;
  ftScaleEl.textContent = `${ratio}×`;
  ftModeEl.textContent = isScaled ? "SCALED" : "NATIVE";
  ftModeStatEl.className = `example-footer__stat ${isScaled ? "example-footer__stat--warn" : "example-footer__stat--ok"}`;
}

// =============================================================================
// Size selector buttons
// =============================================================================

sizeButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-size]");
  if (!btn) return;

  const size = btn.dataset.size;
  if (size === currentSize) return;

  currentSize = size;

  // Update active state
  sizeButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.size === size);
  });

  createList(size);
});

// =============================================================================
// Navigation controls
// =============================================================================

const smoothToggle = document.getElementById("smooth-toggle");

/** Build scrollToIndex options respecting the smooth toggle */
const scrollOpts = (align) =>
  smoothToggle.checked ? { align, behavior: "smooth", duration: 800 } : align;

document.getElementById("btn-first").addEventListener("click", () => {
  list.scrollToIndex(0, scrollOpts("start"));
});

document.getElementById("btn-middle").addEventListener("click", () => {
  list.scrollToIndex(Math.floor(SIZES[currentSize] / 2), scrollOpts("center"));
});

document.getElementById("btn-last").addEventListener("click", () => {
  list.scrollToIndex(SIZES[currentSize] - 1, scrollOpts("end"));
});

document.getElementById("btn-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * SIZES[currentSize]);
  list.scrollToIndex(idx, scrollOpts("center"));
  document.getElementById("scroll-index").value = idx;
});

document.getElementById("btn-go").addEventListener("click", () => {
  const idx = parseInt(document.getElementById("scroll-index").value, 10);
  if (Number.isNaN(idx)) return;
  const align = document.getElementById("scroll-align").value;
  list.scrollToIndex(
    Math.max(0, Math.min(idx, SIZES[currentSize] - 1)),
    scrollOpts(align),
  );
});

document.getElementById("scroll-index").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-go").click();
  }
});

// =============================================================================
// Initialise with 1M items
// =============================================================================

createList(currentSize);
