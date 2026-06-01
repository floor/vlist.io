// Photo Album — Panel controls
// Wires layout mode, orientation, columns, gap, and navigation buttons.
// Shared by all framework variants (vanilla, react, svelte, vue).

import * as app from "./shared.js";

// =============================================================================
// Debounced rebuild
// =============================================================================

let rebuildTimer = 0;
function debouncedRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => app.createView(), 150);
}

// =============================================================================
// DOM References
// =============================================================================

const layoutMode = document.getElementById("layout-mode");
const orientationButtons = document.getElementById("orientation-buttons");
const columnsSlider = document.getElementById("columns-slider");
const columnsValue = document.getElementById("columns-value");
const columnsLabel = document.getElementById("columns-label");
const gapSlider = document.getElementById("gap-slider");
const gapValue = document.getElementById("gap-value");
const radiusSlider = document.getElementById("radius-slider");
const radiusValue = document.getElementById("radius-value");
const ratioButtons = document.getElementById("ratio-buttons");

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
    b.classList.toggle("ui-segmented__btn--active", b.dataset.mode === mode);
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
      "ui-segmented__btn--active",
      b.dataset.orientation === orientation,
    );
  });

  columnsLabel.textContent = orientation === "horizontal" ? "Rows" : "Columns";

  app.createView();
});

// =============================================================================
// Columns
// =============================================================================

columnsSlider.addEventListener("input", () => {
  const cols = parseInt(columnsSlider.value, 10);
  if (cols === app.currentColumns) return;
  app.setCurrentColumns(cols);
  columnsValue.textContent = cols;
  debouncedRebuild();
});

// =============================================================================
// Gap
// =============================================================================

gapSlider.addEventListener("input", () => {
  const gap = parseInt(gapSlider.value, 10);
  if (gap === app.currentGap) return;
  app.setCurrentGap(gap);
  gapValue.textContent = gap + "px";
  debouncedRebuild();
});

// =============================================================================
// Radius
// =============================================================================

radiusSlider.addEventListener("input", () => {
  const radius = parseInt(radiusSlider.value, 10);
  if (radius === app.currentRadius) return;
  app.setCurrentRadius(radius);
  radiusValue.textContent = radius + "px";
  document
    .getElementById("list-container")
    .style.setProperty("--item-radius", radius + "px");
});

// =============================================================================
// Aspect Ratio
// =============================================================================

ratioButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-ratio]");
  if (!btn) return;

  const ratio = parseFloat(btn.dataset.ratio);
  if (ratio === app.ASPECT_RATIO) return;
  app.setAspectRatio(ratio);

  ratioButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "ui-ctrl-btn--active",
      parseFloat(b.dataset.ratio) === ratio,
    );
  });

  app.createView();
});

// =============================================================================
// Groups Toggle
// =============================================================================

const groupsToggle = document.getElementById("groups-toggle");
if (groupsToggle) {
  groupsToggle.addEventListener("change", () => {
    app.setUseGroups(groupsToggle.checked);
    app.createView();
  });
}

// =============================================================================
// Navigation
// =============================================================================

document.getElementById("btn-first").addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 600 });
});

document.getElementById("btn-middle").addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.ITEM_COUNT / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("btn-last").addEventListener("click", () => {
  app.list?.scrollToIndex(app.ITEM_COUNT - 1, {
    align: "end",
    behavior: "smooth",
    duration: 600,
  });
});

document.getElementById("btn-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * app.ITEM_COUNT);
  app.list?.scrollToIndex(idx, { behavior: "smooth", duration: 500 });
});

// =============================================================================
// Follow Focus
// =============================================================================

document.getElementById("follow-focus-toggle").addEventListener("change", (e) => {
  app.setFollowFocus(e.target.checked);
  app.createView();
});
