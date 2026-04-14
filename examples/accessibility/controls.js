// Accessibility — Panel controls
// Wires the interactive (keyboard navigation) toggle switch.
// Imports state from script.js.

import * as app from "./script.js";

// =============================================================================
// DOM References
// =============================================================================

const interactiveToggle = document.getElementById("toggle-interactive");
const interactiveHint = document.getElementById("interactive-hint");

// =============================================================================
// Interactive Toggle (keyboard navigation on/off)
// =============================================================================

interactiveToggle.addEventListener("change", () => {
  const next = interactiveToggle.checked;
  interactiveHint.textContent = next
    ? "Arrow keys move focus between items"
    : "No item-level keyboard navigation";
  app.setInteractive(next);
});
