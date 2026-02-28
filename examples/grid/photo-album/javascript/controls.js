// Photo Album — Panel controls
// Wires layout mode, orientation, columns, gap, and navigation buttons.
// Imports state and functions from script.js.

import * as app from "./script.js";

// =============================================================================
// DOM References
// =============================================================================

const layoutMode = document.getElementById("layout-mode");
const orientationButtons = document.getElementById("orientation-buttons");
const columnsButtons = document.getElementById("columns-buttons");
const columnsLabel = document.getElementById("columns-label");
const gapButtons = document.getElementById("gap-buttons");

// =============================================================================
// Layout Mode — Grid ↔ Masonry
// =============================================================================

layoutMode.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;

  const mode = btn.dataset.mode;
  if (mode === app.currentMode) return;
  app.setCurrentMode(mode);

  layoutMode.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("panel-segmented__btn--active", b.dataset.mode === mode);
  });

  app.createView();
});

// =============================================================================
// Orientation — Vertical ↔ Horizontal
// =============================================================================

orientationButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-orientation]");
  if (!btn) return;

  const orientation = btn.dataset.orientation;
  if (orientation === app.currentOrientation) return;
  app.setCurrentOrientation(orientation);

  orientationButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "panel-segmented__btn--active",
      b.dataset.orientation === orientation,
    );
  });

  columnsLabel.textContent =
    orientation === "horizontal" ? "Rows" : "Columns";

  app.createView();
});

// =============================================================================
// Columns
// =============================================================================

columnsButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-cols]");
  if (!btn) return;

  const cols = parseInt(btn.dataset.cols, 10);
  if (cols === app.currentColumns) return;
  app.setCurrentColumns(cols);

  columnsButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ctrl-btn--active", parseInt(b.dataset.cols) === cols);
  });

  app.createView();
});

// =============================================================================
// Gap
// =============================================================================

gapButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-gap]");
  if (!btn) return;

  const gap = parseInt(btn.dataset.gap, 10);
  if (gap === app.currentGap) return;
  app.setCurrentGap(gap);

  gapButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ctrl-btn--active", parseInt(b.dataset.gap) === gap);
  });

  app.createView();
});

// =============================================================================
// Navigation
// =============================================================================

document.getElementById("btn-first").addEventListener("click", () => {
  app.list?.scrollToIndex(0, "start");
});

document.getElementById("btn-middle").addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.ITEM_COUNT / 2), "center");
});

document.getElementById("btn-last").addEventListener("click", () => {
  app.list?.scrollToIndex(app.ITEM_COUNT - 1, "end");
});
