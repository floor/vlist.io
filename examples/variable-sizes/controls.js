// Variable Sizes — Panel controls
// Wires mode toggle and navigation buttons.
// Imports state and functions from script.js.

import * as app from "./script.js";

// =============================================================================
// Mode Toggle — A (Pre-measure) ↔ B (Auto-size), rebuilds list
// =============================================================================

const modeToggleEl = document.getElementById("mode-toggle");

export function initModeToggle() {
  if (!modeToggleEl) return;

  // Set initial active state
  modeToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "ui-segmented__btn--active",
      b.dataset.mode === app.currentMode,
    );
  });
}

modeToggleEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;

  const mode = btn.dataset.mode;
  if (mode === app.currentMode) return;

  app.setCurrentMode(mode);

  modeToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.mode === mode);
  });

  // Clear cached sizes when switching modes
  for (const item of app.items) {
    item.size = 0;
  }

  app.createList();
});

// =============================================================================
// Navigation
// =============================================================================

document.getElementById("jump-top").addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
});

document.getElementById("jump-middle").addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.items.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("jump-bottom").addEventListener("click", () => {
  app.list?.scrollToIndex(app.items.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("jump-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * app.items.length);
  app.list?.scrollToIndex(idx, { behavior: "smooth", duration: 400 });
});
