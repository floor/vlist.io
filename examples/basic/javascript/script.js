// Basic List — Interactive control panel
// Demonstrates core vlist API: item count, overscan, scrollToIndex,
// and data operations (append, prepend, remove).

import { vlist } from "vlist";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeUsers,
  itemTemplate,
} from "../shared.js";
import { createStats } from "../../stats.js";
import "./controls.js";

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let users = makeUsers(DEFAULT_COUNT);
export let nextId = DEFAULT_COUNT + 1;
export let currentOverscan = 3;
export let list = null;

export function setUsers(u) {
  users = u;
}
export function setNextId(n) {
  nextId = n;
}
export function setCurrentOverscan(n) {
  currentOverscan = n;
}

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getList: () => list,
  getTotal: () => users.length,
  getItemHeight: () => ITEM_HEIGHT,
  container: "#list-container",
});

// =============================================================================
// Create / Recreate list
// =============================================================================

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  list = vlist({
    container: "#list-container",
    ariaLabel: "User list",
    overscan: currentOverscan,
    items: users,
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
  }).build();

  list.on("range:change", stats.scheduleUpdate);
  list.on("scroll", stats.scheduleUpdate);
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  stats.update();
}

// =============================================================================
// Footer — right side (contextual, specific to this example)
// =============================================================================

const ftHeight = document.getElementById("ft-height");
const ftOverscan = document.getElementById("ft-overscan");

export function updateContext() {
  ftHeight.textContent = ITEM_HEIGHT;
  ftOverscan.textContent = currentOverscan;
}

// =============================================================================
// Re-export constants for controls.js
// =============================================================================

export { DEFAULT_COUNT };

// =============================================================================
// Initialise
// =============================================================================

createList();
updateContext();
