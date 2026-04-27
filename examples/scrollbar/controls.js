// Scrollbar example — panel controls
// Wires all scrollbar config toggles and sliders to the list.

import * as app from "./script.js";

// =============================================================================
// Helpers
// =============================================================================

const panel = document.getElementById("scrollbar-panel");

function syncPanelMode() {
  panel.classList.toggle("mode-custom", app.mode === "custom");
  panel.classList.toggle("mode-native", app.mode === "native");
}

function getViewport() {
  return document.querySelector("#list-container .vlist-viewport");
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
  if (mode === "native") applyNativeSettings();
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
// Click behavior — Jump / Page
// =============================================================================

const clickBehaviorButtons = document.getElementById("click-behavior-buttons");

clickBehaviorButtons.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-behavior]");
  if (!btn) return;

  const behavior = btn.dataset.behavior;
  if (behavior === app.clickBehavior) return;
  app.setClickBehavior(behavior);

  clickBehaviorButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.behavior === behavior);
  });

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
  document.documentElement.style.setProperty("--vlist-custom-scrollbar-width", px + "px");
});

// =============================================================================
// Radius slider — sets CSS variable, no rebuild needed
// =============================================================================

const radiusSlider = document.getElementById("radius-slider");
const radiusValue = document.getElementById("radius-value");

radiusSlider.addEventListener("input", (e) => {
  const px = parseInt(e.target.value, 10);
  radiusValue.textContent = px + "px";
  document.documentElement.style.setProperty("--vlist-custom-scrollbar-radius", px + "px");
});

// =============================================================================
// Padding slider
// =============================================================================

const paddingSlider = document.getElementById("padding-slider");
const paddingValue = document.getElementById("padding-value");

paddingSlider.addEventListener("input", (e) => {
  const px = parseInt(e.target.value, 10);
  paddingValue.textContent = px + "px";
  app.setPadding(px);
  app.createList();
});

// =============================================================================
// Min thumb slider
// =============================================================================

const minThumbSlider = document.getElementById("min-thumb-slider");
const minThumbValue = document.getElementById("min-thumb-value");

minThumbSlider.addEventListener("input", (e) => {
  const px = parseInt(e.target.value, 10);
  minThumbValue.textContent = px + "px";
  app.setMinThumbSize(px);
  app.createList();
});

// =============================================================================
// Native appearance — width, colors, gutter
// =============================================================================

let nativeScrollbarWidth = "auto";
let nativeGutter = "auto";

function applyNativeSettings() {
  const vp = getViewport();
  if (!vp) return;
  vp.style.scrollbarWidth = nativeScrollbarWidth;
  vp.style.scrollbarGutter = nativeGutter;
}

// Width — auto / thin
const nativeWidth = document.getElementById("native-width");

nativeWidth.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-width]");
  if (!btn) return;
  const width = btn.dataset.width;
  if (width === nativeScrollbarWidth) return;
  nativeScrollbarWidth = width;
  nativeWidth.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.width === width);
  });
  applyNativeSettings();
});

// Gutter — auto / stable
const nativeGutterEl = document.getElementById("native-gutter");

nativeGutterEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-gutter]");
  if (!btn) return;
  const gutter = btn.dataset.gutter;
  if (gutter === nativeGutter) return;
  nativeGutter = gutter;
  nativeGutterEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "ui-segmented__btn--active",
      b.dataset.gutter === gutter,
    );
  });
  applyNativeSettings();
});

// =============================================================================
// Init — initial panel state is declared via class in content.html
// =============================================================================
