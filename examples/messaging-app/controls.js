// Messaging — Panel controls
// Wires header mode toggle, auto messages toggle, and navigation buttons.
// Imports state and functions from script.js.

import * as app from "./script.js";

// =============================================================================
// Header Mode — Sticky ↔ Inline ↔ Off (rebuilds list)
// =============================================================================

const headerMode = document.getElementById("header-mode");

headerMode.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;

  const mode = btn.dataset.mode;
  if (mode === app.currentHeaderMode) return;
  app.setCurrentHeaderMode(mode);

  headerMode.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("panel-segmented__btn--active", b.dataset.mode === mode);
  });

  app.createList();
});

// =============================================================================
// Auto Messages — On ↔ Off
// =============================================================================

const autoMode = document.getElementById("auto-mode");

autoMode.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-auto]");
  if (!btn) return;

  const on = btn.dataset.auto === "true";
  if (on === app.autoMessages) return;
  app.setAutoMessages(on);

  autoMode.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "panel-segmented__btn--active",
      b.dataset.auto === String(on),
    );
  });
});

// =============================================================================
// Navigation
// =============================================================================

document.getElementById("btn-top").addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 500 });
});

document.getElementById("btn-bottom").addEventListener("click", () => {
  if (!app.list) return;
  app.list.scrollToIndex(app.list.total - 1, {
    align: "start",
    behavior: "smooth",
    duration: 500,
  });
});
