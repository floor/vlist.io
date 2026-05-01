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
  save();
});

// =============================================================================
// Auto-hide toggle
// =============================================================================

function syncAutoHideDependents() {
  const disabled = !app.autoHide;
  document.getElementById("delay-row").classList.toggle("ui-row--disabled", disabled);
  document.getElementById("hover-row").classList.toggle("ui-row--disabled", disabled);
  document.getElementById("enter-row").classList.toggle("ui-row--disabled", disabled);
}

document.getElementById("toggle-autohide").addEventListener("change", (e) => {
  app.setAutoHide(e.target.checked);
  syncAutoHideDependents();
  app.createList();
  save();
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
  save();
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
  save();
});

// =============================================================================
// Show on hover
// =============================================================================

document.getElementById("toggle-show-hover").addEventListener("change", (e) => {
  app.setShowOnHover(e.target.checked);
  app.createList();
  save();
});

// =============================================================================
// Show on viewport enter
// =============================================================================

document.getElementById("toggle-show-enter").addEventListener("change", (e) => {
  app.setShowOnViewportEnter(e.target.checked);
  app.createList();
  save();
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
  save();
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
  save();
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
  save();
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
  save();
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
  save();
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
// Persist on every change
// =============================================================================

function save() {
  app.saveConfig();
}

// =============================================================================
// Init — restore saved config, then sync UI.
// Called from script.js after all module-level state is initialized.
// =============================================================================

export function restoreFromStorage() {
  const saved = app.restoreConfig();

  if (saved) {
    if (saved.mode) app.setMode(saved.mode);
    if (saved.autoHide !== undefined) app.setAutoHide(saved.autoHide);
    if (saved.autoHideDelay !== undefined) app.setAutoHideDelay(saved.autoHideDelay);
    if (saved.gutterEnabled !== undefined) app.setGutterEnabled(saved.gutterEnabled);
    if (saved.showOnHover !== undefined) app.setShowOnHover(saved.showOnHover);
    if (saved.showOnViewportEnter !== undefined) app.setShowOnViewportEnter(saved.showOnViewportEnter);
    if (saved.padding !== undefined) app.setPadding(saved.padding);
    if (saved.minThumbSize !== undefined) app.setMinThumbSize(saved.minThumbSize);
    if (saved.clickBehavior) app.setClickBehavior(saved.clickBehavior);

    if (saved.width !== undefined) {
      widthSlider.value = saved.width;
      widthValue.textContent = saved.width + "px";
      document.documentElement.style.setProperty("--vlist-custom-scrollbar-width", saved.width + "px");
    }
    if (saved.radius !== undefined) {
      radiusSlider.value = saved.radius;
      radiusValue.textContent = saved.radius + "px";
      document.documentElement.style.setProperty("--vlist-custom-scrollbar-radius", saved.radius + "px");
    }
  }

  // Always sync UI to match current state (saved or defaults)
  modeButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.mode === app.mode);
  });
  syncPanelMode();

  document.getElementById("toggle-autohide").checked = app.autoHide;
  document.getElementById("toggle-show-hover").checked = app.showOnHover;
  document.getElementById("toggle-show-enter").checked = app.showOnViewportEnter;
  syncAutoHideDependents();

  delaySlider.value = app.autoHideDelay;
  delayValue.textContent = app.autoHideDelay + "ms";
  paddingSlider.value = app.padding;
  paddingValue.textContent = app.padding + "px";
  minThumbSlider.value = app.minThumbSize;
  minThumbValue.textContent = app.minThumbSize + "px";

  gutterButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.gutter === String(app.gutterEnabled));
  });
  clickBehaviorButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.behavior === app.clickBehavior);
  });
}
