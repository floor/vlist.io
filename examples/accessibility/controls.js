// Accessibility — Panel controls
// Wires the a11y (keyboard navigation) toggle switch.
// Imports state from script.js.

import * as app from "./script.js";

// =============================================================================
// DOM References
// =============================================================================

const a11yToggle = document.getElementById("toggle-a11y");
const a11yHint = document.getElementById("a11y-hint");

// =============================================================================
// A11y Toggle (keyboard navigation on/off)
// =============================================================================

a11yToggle.addEventListener("change", () => {
  const next = a11yToggle.checked;
  a11yHint.textContent = next
    ? "Arrow keys move focus between items"
    : "No item-level keyboard navigation";
  app.setA11y(next);
});
