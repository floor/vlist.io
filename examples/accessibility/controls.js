// Accessibility — Panel controls
// Wires scroll-to buttons and selection mode toggle (None / Single / Multiple).
// Imports state from script.js.

import * as app from "./script.js";

// =============================================================================
// DOM References
// =============================================================================

const btnFirst = document.getElementById("btn-first");
const btnMiddle = document.getElementById("btn-middle");
const btnLast = document.getElementById("btn-last");

const modeButtons = {
  none: document.getElementById("btn-mode-none"),
  single: document.getElementById("btn-mode-single"),
  multiple: document.getElementById("btn-mode-multiple"),
};

// =============================================================================
// Scroll To
// =============================================================================

btnFirst.addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
});

btnMiddle.addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.users.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

btnLast.addEventListener("click", () => {
  app.list?.scrollToIndex(app.users.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 300,
  });
});

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
