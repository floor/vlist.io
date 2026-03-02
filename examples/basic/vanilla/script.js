// Basic List — Minimal vanilla example
// Demonstrates core vlist with 100,000 items.

import { vlist } from "vlist";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeItems,
  itemTemplate,
} from "../shared.js";

// =============================================================================
// Create list
// =============================================================================

const items = makeItems(DEFAULT_COUNT);

const list = vlist({
  container: "#list-container",
  ariaLabel: "Orders",
  items,
  item: {
    height: ITEM_HEIGHT,
    striped: true,
    template: itemTemplate,
  },
}).build();
