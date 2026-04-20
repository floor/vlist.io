// Books — Panel controls
// Wires column preset toggle, row height slider,
// navigation buttons, search inputs, and category filter.
// All filters trigger server-side re-fetch via /api/books.

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
        "ui-segmented__btn--active",
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
// Search (title) — debounced text input, triggers server-side search
// =============================================================================

const searchInput = document.getElementById("search-input");
let searchTimeout = null;

if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      app.setSearchQuery(e.target.value.trim());
      app.applyFilters();
    }, 250);
  });

  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      searchInput.value = "";
      app.setSearchQuery("");
      app.applyFilters();
    }
  });
}

// =============================================================================
// Search (author) — debounced text input, triggers server-side search
// =============================================================================

const authorInput = document.getElementById("author-input");
let authorTimeout = null;

if (authorInput) {
  authorInput.addEventListener("input", (e) => {
    clearTimeout(authorTimeout);
    authorTimeout = setTimeout(() => {
      app.setAuthorQuery(e.target.value.trim());
      app.applyFilters();
    }, 250);
  });

  authorInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      authorInput.value = "";
      app.setAuthorQuery("");
      app.applyFilters();
    }
  });
}

// =============================================================================
// Category Filter — dropdown, triggers server-side filter
// =============================================================================

const categorySelect = document.getElementById("filter-category");

if (categorySelect) {
  fetch("/api/books/categories")
    .then((r) => r.json())
    .then((categories) => {
      categorySelect.innerHTML = '<option value="">All categories</option>';
      for (const c of categories) {
        const opt = document.createElement("option");
        opt.value = c.category;
        opt.textContent = `${c.category} (${c.count.toLocaleString()})`;
        categorySelect.appendChild(opt);
      }
    })
    .catch(() => {
      const fallback = [
        "Fiction",
        "Science Fiction",
        "Science",
        "History",
        "Philosophy",
        "Religion",
        "Art",
        "Music",
        "Poetry",
        "Drama",
        "Biography",
        "Children",
        "Education",
        "Politics",
        "Law",
        "Economics",
        "Psychology",
        "Medicine",
        "Nature",
        "Travel",
        "Sports",
        "Cooking",
        "Humor",
        "Comics",
        "Reference",
        "Other",
      ];
      categorySelect.innerHTML = '<option value="">All categories</option>';
      for (const name of fallback) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        categorySelect.appendChild(opt);
      }
    });

  categorySelect.addEventListener("change", () => {
    app.setFilterCategory(categorySelect.value);
    app.applyFilters();
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
    app.list?.scrollToIndex(Math.floor(app.totalBooks / 2), {
      align: "center",
      behavior: "smooth",
      duration: 500,
    });
  });
}

if (btnLast) {
  btnLast.addEventListener("click", () => {
    app.list?.scrollToIndex(Math.max(0, app.totalBooks - 1), {
      align: "end",
      behavior: "smooth",
      duration: 500,
    });
  });
}

if (btnRandom) {
  btnRandom.addEventListener("click", () => {
    const idx = Math.floor(Math.random() * app.totalBooks);
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
  if (rowHeightSlider) {
    rowHeightSlider.value = String(app.currentRowHeight);
    if (rowHeightValue) {
      rowHeightValue.textContent = `${app.currentRowHeight}px`;
    }
  }

  if (presetEl) {
    presetEl.querySelectorAll("button").forEach((b) => {
      b.classList.toggle(
        "ui-segmented__btn--active",
        b.dataset.preset === app.currentPreset,
      );
    });
  }
}
