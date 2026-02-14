// Horizontal Scrolling — Svelte implementation with vlist action
// Demonstrates direction: 'horizontal' with item.width

import { vlist, onVListEvent } from "vlist/svelte";
import {
  items,
  itemTemplate,
  formatStatsHtml,
  ITEM_HEIGHT,
  ITEM_WIDTH,
} from "../shared.js";

// =============================================================================
// DOM references
// =============================================================================

const container = document.getElementById("list-container");
const statsEl = document.getElementById("stats");

// =============================================================================
// Create horizontal list
// =============================================================================

const action = vlist(container, {
  config: {
    direction: "horizontal",
    scroll: { wheel: true },
    ariaLabel: "Horizontal card carousel",
    item: {
      height: ITEM_HEIGHT,
      width: ITEM_WIDTH,
      template: itemTemplate,
    },
    items,
  },
  onInstance: (instance) => {
    // Update stats
    const updateStats = () => {
      const domNodes = document.querySelectorAll(".vlist-item").length;
      statsEl.innerHTML = formatStatsHtml(domNodes, items.length);
    };

    // Bind events
    onVListEvent(instance, "scroll", updateStats);
    onVListEvent(instance, "range:change", updateStats);
    updateStats();

    // Track item clicks
    onVListEvent(instance, "item:click", ({ item, index }) => {
      console.log(`Clicked: ${item.title} at index ${index}`);
    });

    // Control buttons
    document.getElementById("btn-start")?.addEventListener("click", () => {
      instance.scrollToIndex(0);
    });

    document.getElementById("btn-center")?.addEventListener("click", () => {
      instance.scrollToIndex(5000, "center");
    });

    document.getElementById("btn-end")?.addEventListener("click", () => {
      instance.scrollToIndex(items.length - 1, "end");
    });

    document.getElementById("btn-smooth")?.addEventListener("click", () => {
      const current = instance.getScrollPosition();
      const targetIndex = current < 100 ? 500 : 0;
      instance.scrollToIndex(targetIndex, {
        align: "start",
        behavior: "smooth",
        duration: 800,
      });
    });
  },
});
