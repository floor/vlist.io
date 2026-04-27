// Carousel — Vanilla JavaScript
// Horizontal scrolling with toggle between fixed and variable item widths.
// Uses split-layout + panel + shared info bar stats (same pattern as basic).

import { vlist } from "vlist";
import { items, buildConfig, getDetailHtml, ASPECT_RATIO } from "../shared.js";
import { createStats } from "../../stats.js";
import { createInfoUpdater } from "../../info.js";

// Scale factor: maps height 200–500 → 0–1
const MIN_HEIGHT = 200;
const MAX_HEIGHT = 500;
function getScale(h) {
  return Math.max(0, Math.min(1, (h - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT)));
}

// =============================================================================
// State
// =============================================================================

let variableWidth = false;
let showScrollbar = false;
let currentHeight = 240;
let currentGap = 8;
let currentRadius = 12;
let list = null;

// =============================================================================
// DOM references — panel
// =============================================================================

const toggleEl = document.getElementById("toggle-variable");
const toggleScrollbarEl = document.getElementById("toggle-scrollbar");
const sizeSlider = document.getElementById("size-slider");
const sizeValue = document.getElementById("size-value");
const gapButtons = document.getElementById("gap-buttons");
const radiusButtons = document.getElementById("radius-buttons");

const detailEl = document.getElementById("card-detail");
const listContainerEl = document.getElementById("list-container");

// =============================================================================
// DOM references — info bar right side
// =============================================================================

const infoWidth = document.getElementById("info-width");
const infoMode = document.getElementById("info-mode");

// =============================================================================
// Stats — shared info bar (progress, velocity, visible/total)
// =============================================================================

function getCurrentWidth() {
  return Math.round(currentHeight * ASPECT_RATIO);
}

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => items.length,
  getItemSize: () => getCurrentWidth() + currentGap,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientWidth ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Info bar — right side (contextual)
// =============================================================================

function updateContext() {
  const w = getCurrentWidth();
  if (infoWidth) infoWidth.textContent = variableWidth ? "var" : w;
  if (infoMode) infoMode.textContent = variableWidth ? "variable" : "fixed";
}

// =============================================================================
// Create / Recreate list
// =============================================================================

function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  listContainerEl.innerHTML = "";
  // When the scrollbar is visible, vlist sizes its own root to item.height +
  // scrollbar-width. Clear the inline height so the container auto-expands.
  // When the scrollbar is hidden, pin to currentHeight explicitly.
  listContainerEl.style.height = showScrollbar ? "" : currentHeight + "px";
  listContainerEl.style.setProperty("--card-scale", getScale(currentHeight));
  listContainerEl.style.setProperty("--item-gap", currentGap + "px");
  listContainerEl.style.setProperty("--item-radius", currentRadius + "px");

  list = vlist({
    container: "#list-container",
    ...buildConfig(variableWidth, currentHeight, currentGap, showScrollbar),
  }).build();

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  list.on("item:click", ({ item, index }) => {
    showDetail(item, index);
  });

  updateInfo();
  updateContext();
}

// =============================================================================
// Card detail (panel)
// =============================================================================

function showDetail(item, index) {
  if (detailEl) {
    detailEl.innerHTML = getDetailHtml(item, index, variableWidth);
  }
}

// =============================================================================
// Size slider
// =============================================================================

sizeSlider?.addEventListener("input", (e) => {
  currentHeight = parseInt(e.target.value, 10);
  if (sizeValue) sizeValue.textContent = currentHeight + "px";
  createList();
});

// =============================================================================
// Gap chips
// =============================================================================

gapButtons?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-gap]");
  if (!btn) return;

  const gap = parseInt(btn.dataset.gap, 10);
  if (gap === currentGap) return;
  currentGap = gap;

  gapButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-ctrl-btn--active", parseInt(b.dataset.gap) === gap);
  });

  createList();
});

// =============================================================================
// Radius chips
// =============================================================================

radiusButtons?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-radius]");
  if (!btn) return;

  const radius = parseInt(btn.dataset.radius, 10);
  if (radius === currentRadius) return;
  currentRadius = radius;

  radiusButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "ui-ctrl-btn--active",
      parseInt(b.dataset.radius) === radius,
    );
  });

  createList();
});

// =============================================================================
// Toggle — variable width
// =============================================================================

toggleEl?.addEventListener("change", (e) => {
  variableWidth = e.target.checked;
  createList();
});

toggleScrollbarEl?.addEventListener("change", (e) => {
  showScrollbar = e.target.checked;
  createList();
});

// =============================================================================
// Scroll To — smooth navigation buttons
// =============================================================================

document.getElementById("btn-start")?.addEventListener("click", () => {
  list?.scrollToIndex(0, { align: "start", behavior: "smooth", duration: 600 });
});

document.getElementById("btn-center")?.addEventListener("click", () => {
  list?.scrollToIndex(Math.floor(items.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 800,
  });
});

document.getElementById("btn-end")?.addEventListener("click", () => {
  list?.scrollToIndex(items.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 600,
  });
});

// =============================================================================
// Init
// =============================================================================

createList();
