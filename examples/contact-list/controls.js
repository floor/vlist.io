// Contact List — Panel controls
// Wires header mode toggle, letter grid jump, and navigation buttons.
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
// Letter Grid — jump to first contact of each letter
// =============================================================================

const letterGrid = document.getElementById("letter-grid");

// Build letter buttons — called from script.js after data is ready
export function initLetterGrid() {
  letterGrid.innerHTML = app.sortedGroups
    .map(
      ([letter]) =>
        `<button class="letter-btn" data-letter="${letter}">${letter}</button>`,
    )
    .join("");
}

letterGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-letter]");
  if (!btn || !app.list) return;

  const letter = btn.dataset.letter;
  const idx = app.groupIndex.get(letter);
  if (idx !== undefined) {
    app.list.scrollToIndex(idx, { behavior: "smooth", duration: 400 });
  }
});

// =============================================================================
// Navigation
// =============================================================================

document.getElementById("btn-first").addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
});

document.getElementById("btn-middle").addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.contacts.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("btn-last").addEventListener("click", () => {
  app.list?.scrollToIndex(app.contacts.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("btn-random").addEventListener("click", () => {
  const groups = app.sortedGroups;
  const [letter] = groups[Math.floor(Math.random() * groups.length)];
  const idx = app.groupIndex.get(letter);
  if (idx !== undefined && app.list) {
    app.list.scrollToIndex(idx, { behavior: "smooth", duration: 400 });
  }
});
