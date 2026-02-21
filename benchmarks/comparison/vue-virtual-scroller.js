// benchmarks/comparison/vue-virtual-scroller.js — vue-virtual-scroller Comparison Benchmark
//
// Compares vlist against vue-virtual-scroller side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import {
  defineSuite,
  generateItems,
  rateLower,
  rateHigher,
} from "../runner.js";
import {
  ITEM_HEIGHT,
  benchmarkVList,
  benchmarkLibrary,
  calculateComparisonMetrics,
} from "./shared.js";

// Dynamic imports for Vue libraries (loaded on demand)
let Vue;
let RecycleScroller;

/**
 * Lazy load Vue and vue-virtual-scroller.
 * Returns false if loading fails (libraries not available).
 */
const loadVueLibraries = async () => {
  try {
    if (!Vue) {
      Vue = await import("vue");

      // Import vue-virtual-scroller from local node_modules (via import map)
      const vueVirtualScroller = await import("vue-virtual-scroller");
      RecycleScroller = vueVirtualScroller.RecycleScroller;
    }
    return true;
  } catch (err) {
    console.error("[vue-virtual-scroller] Failed to load Vue libraries:", err);
    return false;
  }
};

// =============================================================================
// Benchmark: vue-virtual-scroller
// =============================================================================

/**
 * Benchmark vue-virtual-scroller performance.
 */
const benchmarkVueVirtualScroller = async (container, items, onStatus) => {
  // Ensure libraries are loaded
  const loaded = await loadVueLibraries();
  if (!loaded) {
    throw new Error("vue-virtual-scroller is not available");
  }

  // Vue component using vue-virtual-scroller
  const VirtualList = {
    components: { RecycleScroller },
    template: `
      <RecycleScroller
        :items="items"
        :item-size="itemHeight"
        :style="{ height: height + 'px' }"
        key-field="id"
      >
        <template v-slot="{ item }">
          <div class="bench-item">{{ item.id }}</div>
        </template>
      </RecycleScroller>
    `,
    props: {
      items: Array,
      height: Number,
      itemHeight: Number,
    },
  };

  // Prepare items with id field (required by vue-virtual-scroller)
  const itemsWithId = items.map((item, index) => ({ id: index, ...item }));

  return benchmarkLibrary({
    libraryName: "vue-virtual-scroller",
    container,
    items,
    onStatus,
    createComponent: async (container, items) => {
      const app = Vue.createApp({
        components: { VirtualList },
        template: `
          <VirtualList
            :items="items"
            :height="height"
            :item-height="itemHeight"
          />
        `,
        data() {
          return {
            items: itemsWithId,
            height: container.clientHeight || 600,
            itemHeight: ITEM_HEIGHT,
          };
        },
      });

      app.mount(container);
      return app;
    },
    destroyComponent: async (app) => {
      app.unmount();
    },
  });
};

// =============================================================================
// Suite Definition
// =============================================================================

defineSuite({
  id: "vue-virtual-scroller",
  name: "vue-virtual-scroller Comparison",
  description: "Compare vlist vs vue-virtual-scroller performance side-by-side",
  icon: "⚔️",

  run: async ({ itemCount, container, onStatus }) => {
    onStatus("Preparing items...");

    const items = generateItems(itemCount);

    // Benchmark vlist
    const vlistResults = await benchmarkVList(container, items, onStatus);

    // Benchmark vue-virtual-scroller
    let vueResults;
    try {
      vueResults = await benchmarkVueVirtualScroller(
        container,
        items,
        onStatus,
      );
    } catch (err) {
      console.warn(
        "[vue-virtual-scroller] vue-virtual-scroller test failed:",
        err,
      );
      vueResults = {
        library: "vue-virtual-scroller",
        renderTime: null,
        memoryUsed: null,
        scrollFPS: null,
        p95FrameTime: null,
        error: err.message,
      };
    }

    // Calculate comparison metrics
    return calculateComparisonMetrics(
      vlistResults,
      vueResults,
      "vue-virtual-scroller",
      rateLower,
      rateHigher,
    );
  },
});
