// Carousel — Vanilla JavaScript
// Horizontal scrolling with toggle between fixed and variable item widths.
// Uses split-layout + panel + shared footer stats (same pattern as basic).

import { vlist } from "vlist";
import { items, buildConfig, getDetailHtml, ASPECT_RATIO } from "../shared.js";
import { createStats } from "../../stats.js";

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
let currentHeight = 240;
let currentGap = 8;
let currentRadius = 12;
let list = null;

// =============================================================================
// DOM references — panel
// =============================================================================

const toggleEl = document.getElementById("toggle-variable");
const sizeSlider = document.getElementById("size-slider");
const sizeValue = document.getElementById("size-value");
const gapButtons = document.getElementById("gap-buttons");
const radiusButtons = document.getElementById("radius-buttons");

const detailEl = document.getElementById("card-detail");
const listContainerEl = document.getElementById("list-container");

// =============================================================================
// DOM references — footer right side
// =============================================================================

const ftWidth = document.getElementById("ft-width");
const ftMode = document.getElementById("ft-mode");

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

function getCurrentWidth() {
  return Math.round(currentHeight * ASPECT_RATIO);
}

const stats = createStats({
  getList: () => list,
  getTotal: () => items.length,
  getItemHeight: () => getCurrentWidth() + currentGap,
  container: "#list-container",
});

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

function updateContext() {
  const w = getCurrentWidth();
  if (ftWidth) ftWidth.textContent = variableWidth ? "var" : w;
  if (ftMode) ftMode.textContent = variableWidth ? "variable" : "fixed";
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
  listContainerEl.style.height = currentHeight + "px";
  listContainerEl.style.setProperty("--card-scale", getScale(currentHeight));
  listContainerEl.style.setProperty("--item-gap", currentGap + "px");
  listContainerEl.style.setProperty("--item-radius", currentRadius + "px");

  list = vlist({
    container: "#list-container",
    ...buildConfig(variableWidth, currentHeight, currentGap),
  }).build();

  list.on("range:change", stats.scheduleUpdate);
  list.on("scroll", stats.scheduleUpdate);
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  list.on("item:click", ({ item, index }) => {
    showDetail(item, index);
  });

  stats.update();
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
    b.classList.toggle("ctrl-btn--active", parseInt(b.dataset.gap) === gap);
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
      "ctrl-btn--active",
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
