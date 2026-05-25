// Basic List — Minimal vanilla example
// Demonstrates core vlist with 100,000 items.

import { createVList, a11y } from "vlist";
import { COUNT, ITEM_HEIGHT, makeItems, itemTemplate } from "../shared.js";

// =============================================================================
// Create list
// =============================================================================

const items = makeItems(COUNT);

const list = createVList({
  container: "#list-container",
  ariaLabel: "Orders",
  items,
  padding: 8,
  item: {
    height: ITEM_HEIGHT,
    striped: true,
    template: itemTemplate,
  },
}, [a11y()]);
