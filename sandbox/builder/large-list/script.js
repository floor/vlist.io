// Builder Million Items — Composable entry point
// Uses vlist/builder with withCompression + withScrollbar plugins
// Demonstrates handling 1M+ items with automatic scroll compression

import { vlist } from "vlist/builder";
import { withCompression } from "vlist/compression";
import { withScrollbar } from "vlist/scroll";

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
// Generate items on the fly
// =============================================================================

const generateItems = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: hash(i) % 100,
    hash: hash(i).toString(16).slice(0, 8).toUpperCase(),
    color: COLORS[i % COLORS.length],
  }));

// =============================================================================
// Item template
// =============================================================================

const itemTemplate = (item, index) => `
  <div class="item-row">
    <div class="item-color" style="background:${item.color}"></div>
    <div class="item-info">
      <span class="item-label">#${(index + 1).toLocaleString()}</span>
      <span class="item-hash">${item.hash}</span>
    </div>
    <div class="item-bar-wrap">
      <div class="item-bar" style="width:${item.value}%;background:${item.color}"></div>
    </div>
    <span class="item-value">${item.value}%</span>
  </div>
`;

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");
const compressionEl = document.getElementById("compression-info");
const scrollPosEl = document.getElementById("scroll-position");
const scrollDirEl = document.getElementById("scroll-direction");
const rangeEl = document.getElementById("visible-range");
const sizeButtons = document.getElementById("size-buttons");

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
  const startTime = performance.now();
  const items = generateItems(count);
  const genTime = performance.now() - startTime;

  list = vlist({
    container: "#list-container",
    ariaLabel: `${count.toLocaleString()} items list`,
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items,
  })
    .use(withCompression())
    .use(withScrollbar({ autoHide: true }))
    .build();

  const buildTime = performance.now() - startTime;

  // Bind events
  list.on("scroll", ({ scrollTop, direction }) => {
    scrollPosEl.textContent = `${Math.round(scrollTop).toLocaleString()}px`;
    scrollDirEl.textContent = direction === "up" ? "↑ up" : "↓ down";
    scheduleStatsUpdate();
  });

  list.on("range:change", ({ range }) => {
    rangeEl.textContent = `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`;
    scheduleStatsUpdate();
  });

  // Show initial stats
  updateStats(count, genTime, buildTime);
  updateCompressionInfo(count);
}

// =============================================================================
// Stats
// =============================================================================

let statsRaf = null;

function scheduleStatsUpdate() {
  if (statsRaf) return;
  statsRaf = requestAnimationFrame(() => {
    statsRaf = null;
    updateStats(SIZES[currentSize]);
    updateCompressionInfo(SIZES[currentSize]);
  });
}

function updateStats(count, genTime, buildTime) {
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const virtualized = ((1 - domNodes / count) * 100).toFixed(4);

  let html = `<strong>Total:</strong> ${count.toLocaleString()}`;
  html += ` · <strong>DOM:</strong> ${domNodes}`;
  html += ` · <strong>Virtualized:</strong> ${virtualized}%`;
  if (genTime !== undefined) {
    html += ` · <strong>Gen:</strong> ${genTime.toFixed(0)}ms`;
  }
  if (buildTime !== undefined) {
    html += ` · <strong>Build:</strong> ${buildTime.toFixed(0)}ms`;
  }
  statsEl.innerHTML = html;
}

function updateCompressionInfo(count) {
  const totalHeight = count * ITEM_HEIGHT;
  const maxHeight = 16_777_216; // browser limit ~16.7M px
  const isCompressed = totalHeight > maxHeight;
  const ratio = isCompressed ? (totalHeight / maxHeight).toFixed(1) : "1.0";

  let html = `<span class="compression-badge ${isCompressed ? "compression-badge--active" : "compression-badge--off"}">`;
  html += isCompressed ? "COMPRESSED" : "NATIVE";
  html += "</span>";
  html += ` <span class="compression-detail">`;
  html += `Virtual height: <strong>${(totalHeight / 1_000_000).toFixed(1)}M px</strong>`;
  html += ` · Ratio: <strong>${ratio}×</strong>`;
  html += ` · Limit: <strong>16.7M px</strong>`;
  html += `</span>`;
  compressionEl.innerHTML = html;
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
    b.classList.toggle("size-btn--active", b.dataset.size === size);
  });

  createList(size);
});

// =============================================================================
// Navigation controls
// =============================================================================

document.getElementById("btn-first").addEventListener("click", () => {
  list.scrollToIndex(0, "start");
});

document.getElementById("btn-middle").addEventListener("click", () => {
  list.scrollToIndex(Math.floor(SIZES[currentSize] / 2), "center");
});

document.getElementById("btn-last").addEventListener("click", () => {
  list.scrollToIndex(SIZES[currentSize] - 1, "end");
});

document.getElementById("btn-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * SIZES[currentSize]);
  list.scrollToIndex(idx, "center");
  document.getElementById("scroll-index").value = idx;
});

document.getElementById("btn-go").addEventListener("click", () => {
  const idx = parseInt(document.getElementById("scroll-index").value, 10);
  if (Number.isNaN(idx)) return;
  const align = document.getElementById("scroll-align").value;
  list.scrollToIndex(Math.max(0, Math.min(idx, SIZES[currentSize] - 1)), align);
});

document.getElementById("scroll-index").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-go").click();
  }
});

document.getElementById("btn-smooth-top").addEventListener("click", () => {
  list.scrollToIndex(0, { align: "start", behavior: "smooth", duration: 800 });
});

document.getElementById("btn-smooth-bottom").addEventListener("click", () => {
  list.scrollToIndex(SIZES[currentSize] - 1, {
    align: "end",
    behavior: "smooth",
    duration: 800,
  });
});

// =============================================================================
// Initialise with 1M items
// =============================================================================

createList(currentSize);
