// Accessibility — Panel controls
// Wires selection mode toggle (None / Single / Multiple).
// Imports state from script.js.

import * as app from "./script.js";

// =============================================================================
// DOM References
// =============================================================================

const modeButtons = {
  none: document.getElementById("btn-mode-none"),
  single: document.getElementById("btn-mode-single"),
  multiple: document.getElementById("btn-mode-multiple"),
};

// =============================================================================
// Selection Mode Toggle (None / Single / Multiple)
// =============================================================================

function activateMode(mode) {
  if (app.selectionMode === mode) return;
  for (const [key, btn] of Object.entries(modeButtons)) {
    const active = key === mode;
    btn.classList.toggle("panel-btn--active", active);
    btn.setAttribute("aria-pressed", String(active));
  }
  app.setSelectionMode(mode);
}

for (const [mode, btn] of Object.entries(modeButtons)) {
  btn.addEventListener("click", () => activateMode(mode));
}
