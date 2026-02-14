// Horizontal Scrolling — Vanilla JavaScript
// Demonstrates direction: 'horizontal' with item.width

import { createVList } from "vlist";
import {
  items,
  itemTemplate,
  formatStatsHtml,
  ITEM_HEIGHT,
  ITEM_WIDTH,
} from "../shared.js";

// Create horizontal virtual list
const list = createVList({
  container: "#list-container",
  direction: "horizontal",
  scroll: { wheel: true },
  ariaLabel: "Horizontal card carousel",
  item: {
    height: ITEM_HEIGHT,
    width: ITEM_WIDTH,
    template: itemTemplate,
  },
  items: items,
});

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
  console.log(`Clicked: ${item.title} at index ${index}`);
});

// Control buttons
document.getElementById("btn-start")?.addEventListener("click", () => {
  list.scrollToIndex(0);
});

document.getElementById("btn-center")?.addEventListener("click", () => {
  list.scrollToIndex(5000, "center");
});

document.getElementById("btn-end")?.addEventListener("click", () => {
  list.scrollToIndex(items.length - 1, "end");
});

document.getElementById("btn-smooth")?.addEventListener("click", () => {
  const current = list.getScrollPosition();
  const targetIndex = current < 100 ? 500 : 0;
  list.scrollToIndex(targetIndex, {
    align: "start",
    behavior: "smooth",
    duration: 800,
  });
});
