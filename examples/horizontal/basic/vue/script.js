// Horizontal Scrolling — Vue implementation with useVList composable
// Demonstrates orientation: 'horizontal' with item.width

import { createApp, ref } from "vue";
import { useVList, useVListEvent } from "vlist-vue";
import {
  items,
  itemTemplate,
  calculateStats,
  ITEM_HEIGHT,
  ITEM_WIDTH,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const stats = ref({
      domNodes: 0,
      saved: 0,
    });

    // Initialize vlist
    const { containerRef, instance } = useVList({
      orientation: "horizontal",
      scroll: { wheel: true },
      ariaLabel: "Horizontal card carousel",
      item: {
        height: ITEM_HEIGHT,
        width: ITEM_WIDTH,
        template: itemTemplate,
      },
      items,
    });

    // Update stats
    const updateStats = () => {
      const domNodes = document.querySelectorAll(".vlist-item").length;
      const { saved } = calculateStats(domNodes, items.length);
      stats.value = { domNodes, saved };
    };

    // Track scroll and range changes
    useVListEvent(instance, "scroll", updateStats);
    useVListEvent(instance, "range:change", updateStats);

    // Track item clicks
    useVListEvent(instance, "item:click", ({ item, index }) => {
      console.log(`Clicked: ${item.title} at index ${index}`);
    });

    // Navigation handlers
    const scrollToStart = () => {
      instance.value?.scrollToIndex(0);
    };

    const scrollToCenter = () => {
      instance.value?.scrollToIndex(5000, "center");
    };

    const scrollToEnd = () => {
      instance.value?.scrollToIndex(items.length - 1, "end");
    };

    const smoothScroll = () => {
      const current = instance.value?.getScrollPosition() || 0;
      const targetIndex = current < 100 ? 500 : 0;
      instance.value?.scrollToIndex(targetIndex, {
        align: "start",
        behavior: "smooth",
        duration: 800,
      });
    };

    return {
      containerRef,
      stats,
      items,
      scrollToStart,
      scrollToCenter,
      scrollToEnd,
      smoothScroll,
    };
  },

  template: `
    <div class="container">
      <header>
        <h1>Horizontal Scrolling</h1>
        <p class="description">
          Vue implementation with <code>useVList</code> composable. A horizontal
          virtual list rendering 10,000 cards with
          <code>orientation: 'horizontal'</code> and
          <code>scroll.wheel: true</code>. Scroll with mouse wheel, trackpad
          swipe, or the buttons below. Only visible items are in the DOM.
        </p>
      </header>

      <div class="stats">
        <span>
          <strong>Total:</strong> {{ items.length.toLocaleString() }}
        </span>
        <span>
          <strong>DOM nodes:</strong> {{ stats.domNodes }}
        </span>
        <span>
          <strong>Memory saved:</strong> {{ stats.saved }}%
        </span>
      </div>

      <div ref="containerRef" id="list-container" />

      <div class="controls">
        <button @click="scrollToStart">⏮ Start</button>
        <button @click="scrollToCenter">⏺ Center (5000)</button>
        <button @click="scrollToEnd">⏭ End</button>
        <button @click="smoothScroll">🎞 Smooth Scroll</button>
      </div>

      <footer>
        <p>
          Uses <code>orientation: 'horizontal'</code> with
          <code>item.width</code> for the main axis and
          <code>item.height</code> for the cross axis.
          <code>scroll.wheel: true</code> maps vertical mouse wheel to
          horizontal scroll. Custom scrollbar renders at the bottom
          automatically. 💚
        </p>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
