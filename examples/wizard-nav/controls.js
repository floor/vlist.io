// Wizard — Panel controls
// Wires orientation, wheel, wrap, selection toggles, and navigation buttons.
// Imports state and functions from script.js.

import * as app from "./script.js";

// =============================================================================
// Orientation Toggle — Vertical ↔ Horizontal (rebuilds list)
// =============================================================================

const orientationMode = document.getElementById("orientation-mode");

orientationMode.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-orientation]");
  if (!btn) return;

  const orientation = btn.dataset.orientation;
  if (orientation === app.currentOrientation) return;
  app.setCurrentOrientation(orientation);

  orientationMode.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "panel-segmented__btn--active",
      b.dataset.orientation === orientation,
    );
  });

  app.createList();
});

// =============================================================================
// Wrap Toggle — On ↔ Off (rebuilds list)
// =============================================================================

const wrapMode = document.getElementById("wrap-mode");

wrapMode.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-wrap]");
  if (!btn) return;

  const on = btn.dataset.wrap === "true";
  if (on === app.currentWrap) return;
  app.setCurrentWrap(on);

  wrapMode.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "panel-segmented__btn--active",
      b.dataset.wrap === String(on),
    );
  });

  app.createList();
});

// =============================================================================
// Prev / Next arrows (inside wizard UI)
// =============================================================================

document.getElementById("btn-prev").addEventListener("click", () => {
  app.goTo(app.currentIndex - 1);
});

document.getElementById("btn-next").addEventListener("click", () => {
  app.goTo(app.currentIndex + 1);
});

// =============================================================================
// Panel Navigation — first, last, random
// =============================================================================

document.getElementById("btn-first").addEventListener("click", () => {
  app.goTo(0);
});

document.getElementById("btn-last").addEventListener("click", () => {
  app.goTo(app.TOTAL - 1);
});

document.getElementById("btn-random").addEventListener("click", () => {
  let next;
  do {
    next = Math.floor(Math.random() * app.TOTAL);
  } while (next === app.currentIndex && app.TOTAL > 1);
  app.goTo(next);
});
