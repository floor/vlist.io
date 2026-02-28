// Horizontal Variable Width — Vanilla JavaScript
// Demonstrates orientation: 'horizontal' with dynamic item.width function

import { vlist } from "vlist";
import {
  items,
  itemTemplate,
  formatStatsHtml,
  ITEM_HEIGHT,
} from "../shared.js";

// Create horizontal virtual list with variable widths
const list = vlist({
  container: "#list-container",
  orientation: "horizontal",
  scroll: { wheel: true },
  ariaLabel: "Horizontal variable width carousel",
  item: {
    height: ITEM_HEIGHT,
    // Dynamic width function - each item has different width
    width: (index) => items[index].width,
    template: itemTemplate,
  },
  items,
}).build();

// Update stats display
const statsEl = document.getElementById("stats");

const updateStats = () => {
  const domNodes = document.querySelectorAll(".vlist-item").length;
  statsEl.innerHTML = formatStatsHtml(domNodes, items.length);
};

list.on("scroll", updateStats);
list.on("range:change", updateStats);
updateStats();

// Log clicks
list.on("item:click", ({ item, index }) => {
  console.log(`Clicked: ${item.title} (${item.width}px) at index ${index}`);
});

// Control buttons
document.getElementById("btn-start")?.addEventListener("click", () => {
  list.scrollToIndex(0);
});

// Find first featured item
document.getElementById("btn-featured")?.addEventListener("click", () => {
  const featuredIndex = items.findIndex((item) => item.isFeatured);
  if (featuredIndex >= 0) {
    list.scrollToIndex(featuredIndex, "center");
  }
});

document.getElementById("btn-center")?.addEventListener("click", () => {
  list.scrollToIndex(500, "center");
});

document.getElementById("btn-end")?.addEventListener("click", () => {
  list.scrollToIndex(items.length - 1, "end");
});

document.getElementById("btn-smooth")?.addEventListener("click", () => {
  const current = list.getScrollPosition();
  const targetIndex = current < 100 ? 300 : 0;
  list.scrollToIndex(targetIndex, {
    align: "start",
    behavior: "smooth",
    duration: 1000,
  });
});
