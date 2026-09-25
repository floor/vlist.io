// Basic List — Svelte implementation with vlist action
// Demonstrates core vlist with 100,000 items.

import { vlist } from "vlist-svelte";
import { COUNT, ITEM_HEIGHT, makeItems, itemTemplate } from "../shared.js";

// =============================================================================
// Create list
// =============================================================================

const items = makeItems(COUNT);

vlist(document.getElementById("list-container"), {
  config: {
    ariaLabel: "Orders",
    items,
    padding: 8,
    // Custom overlay scrollbar: vlist/config leaves the native one unless asked.
    scrollbar: true,
    item: {
      height: ITEM_HEIGHT,
      striped: true,
      template: itemTemplate,
    },
  },
});
