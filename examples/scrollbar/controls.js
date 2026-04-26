// Scrollbar example — panel controls
// Wires all scrollbar config toggles and sliders to the list.

import * as app from "./script.js";

// =============================================================================
// Helpers
// =============================================================================

const panel = document.getElementById("scrollbar-panel");

function syncPanelMode() {
  panel.classList.toggle("mode-custom", app.mode === "custom");
}

// =============================================================================
// Mode — Native / Custom / None
// =============================================================================

const modeButtons = document.getElementById("mode-buttons");

modeButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;

  const mode = btn.dataset.mode;
  if (mode === app.mode) return;
  app.setMode(mode);

  modeButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.mode === mode);
  });

  syncPanelMode();
  app.createList();
});

// =============================================================================
// Auto-hide toggle
// =============================================================================

document.getElementById("toggle-autohide").addEventListener("change", (e) => {
  app.setAutoHide(e.target.checked);
  document.getElementById("delay-row").classList.toggle("ui-row--disabled", !e.target.checked);
  app.createList();
});

// =============================================================================
// Auto-hide delay slider
// =============================================================================

const delaySlider = document.getElementById("delay-slider");
const delayValue = document.getElementById("delay-value");

delaySlider.addEventListener("input", (e) => {
  const ms = parseInt(e.target.value, 10);
  delayValue.textContent = ms + "ms";
  app.setAutoHideDelay(ms);
  app.createList();
});

// =============================================================================
// Gutter — Overlay / Stable
// =============================================================================

const gutterButtons = document.getElementById("gutter-buttons");

gutterButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-gutter]");
  if (!btn) return;

  const gutter = btn.dataset.gutter === "true";
  if (gutter === app.gutterEnabled) return;
  app.setGutterEnabled(gutter);

  gutterButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "ui-segmented__btn--active",
      b.dataset.gutter === String(gutter),
    );
  });

  app.createList();
});

// =============================================================================
// Show on hover
// =============================================================================

document.getElementById("toggle-show-hover").addEventListener("change", (e) => {
  app.setShowOnHover(e.target.checked);
  app.createList();
});

// =============================================================================
// Show on viewport enter
// =============================================================================

document.getElementById("toggle-show-enter").addEventListener("change", (e) => {
  app.setShowOnViewportEnter(e.target.checked);
  app.createList();
});

// =============================================================================
// Width slider — sets CSS variable, no rebuild needed
// =============================================================================

const widthSlider = document.getElementById("width-slider");
const widthValue = document.getElementById("width-value");

widthSlider.addEventListener("input", (e) => {
  const px = parseInt(e.target.value, 10);
  widthValue.textContent = px + "px";
  // Update the appropriate CSS variable based on current mode
  const prop =
    app.mode === "native"
      ? "--vlist-scrollbar-width"
      : "--vlist-custom-scrollbar-width";
  document.documentElement.style.setProperty(prop, px + "px");
});

// =============================================================================
// Navigate
// =============================================================================

document.getElementById("btn-top").addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
});

document.getElementById("btn-middle").addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.contacts.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("btn-bottom").addEventListener("click", () => {
  app.list?.scrollToIndex(app.contacts.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 300,
  });
});

// =============================================================================
// Init
// =============================================================================

syncPanelMode();
