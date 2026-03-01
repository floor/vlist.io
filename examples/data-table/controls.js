// Data Table — Panel controls
// Wires column preset toggle, row height slider, border mode,
// and navigation buttons.
// Imports state and functions from script.js.

import * as app from "./script.js";

// =============================================================================
// Column Preset — Default ↔ Compact ↔ Full (rebuilds list)
// =============================================================================

const presetEl = document.getElementById("column-preset");

if (presetEl) {
  presetEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;

    const preset = btn.dataset.preset;
    if (preset === app.currentPreset) return;
    app.setCurrentPreset(preset);

    presetEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle(
        "panel-segmented__btn--active",
        b.dataset.preset === preset,
      );
    });

    app.createList();
  });
}

// =============================================================================
// Row Height Slider — 28–64px (rebuilds list)
// =============================================================================

const rowHeightSlider = document.getElementById("row-height");
const rowHeightValue = document.getElementById("row-height-value");

if (rowHeightSlider) {
  rowHeightSlider.addEventListener("input", (e) => {
    const value = parseInt(e.target.value, 10);
    app.setCurrentRowHeight(value);
    if (rowHeightValue) rowHeightValue.textContent = `${value}px`;
    app.createList();
  });
}

// =============================================================================
// Border Mode — Rows ↔ Both ↔ None (rebuilds list)
// =============================================================================

const borderModeEl = document.getElementById("border-mode");

if (borderModeEl) {
  borderModeEl.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-mode]");
    if (!btn) return;

    const mode = btn.dataset.mode;
    if (mode === app.currentBorderMode) return;
    app.setCurrentBorderMode(mode);

    borderModeEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle(
        "panel-segmented__btn--active",
        b.dataset.mode === mode,
      );
    });

    app.createList();
  });
}

// =============================================================================
// Navigation
// =============================================================================

const btnFirst = document.getElementById("btn-first");
const btnMiddle = document.getElementById("btn-middle");
const btnLast = document.getElementById("btn-last");
const btnRandom = document.getElementById("btn-random");

if (btnFirst) {
  btnFirst.addEventListener("click", () => {
    app.list?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
  });
}

if (btnMiddle) {
  btnMiddle.addEventListener("click", () => {
    app.list?.scrollToIndex(Math.floor(app.sortedContacts.length / 2), {
      align: "center",
      behavior: "smooth",
      duration: 500,
    });
  });
}

if (btnLast) {
  btnLast.addEventListener("click", () => {
    app.list?.scrollToIndex(app.sortedContacts.length - 1, {
      align: "end",
      behavior: "smooth",
      duration: 500,
    });
  });
}

if (btnRandom) {
  btnRandom.addEventListener("click", () => {
    const idx = Math.floor(Math.random() * app.sortedContacts.length);
    app.list?.scrollToIndex(idx, {
      align: "center",
      behavior: "smooth",
      duration: 400,
    });
  });
}

// =============================================================================
// Export init (called from script.js)
// =============================================================================

export function initControls() {
  // Sync slider display with initial state
  if (rowHeightSlider) {
    rowHeightSlider.value = String(app.currentRowHeight);
    if (rowHeightValue) {
      rowHeightValue.textContent = `${app.currentRowHeight}px`;
    }
  }

  // Sync preset buttons
  if (presetEl) {
    presetEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle(
        "panel-segmented__btn--active",
        b.dataset.preset === app.currentPreset,
      );
    });
  }

  // Sync border buttons
  if (borderModeEl) {
    borderModeEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle(
        "panel-segmented__btn--active",
        b.dataset.mode === app.currentBorderMode,
      );
    });
  }
}
