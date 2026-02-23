// benchmarks/comparison/vue-virtual-scroller.js — vue-virtual-scroller Comparison Benchmark
//
// Compares vlist against vue-virtual-scroller side-by-side:
//   - Initial render time
//   - Memory usage
//   - Scroll performance (FPS)
//   - P95 frame time (consistency)
//
// Execution order is randomized per run to eliminate GC bleed and JIT
// warmth biases. See docs/benchmarks/comparison-audit.md Priority 3.
//
// This benchmark helps users make informed decisions by showing
// real performance differences between libraries.

import { defineSuite, rateLower, rateHigher } from "../runner.js";
import { ITEM_HEIGHT, benchmarkLibrary, runComparison } from "./shared.js";

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
const benchmarkVueVirtualScroller = async (
  container,
  itemCount,
  onStatus,
  stressMs = 0,
) => {
  // Ensure libraries are loaded
  const loaded = await loadVueLibraries();
  if (!loaded) {
    throw new Error("vue-virtual-scroller is not available");
  }

  // Vue component using vue-virtual-scroller
  const VirtualList = {
    components: { RecycleScroller },
    template: `
      <div class="vue-scroller-wrapper" :style="{ height: height + 'px', width: '100%' }">
        <RecycleScroller
          :items="itemsArray"
          :item-size="48"
          :style="{ height: '100%' }"
          key-field="id"
        >
          <template v-slot="{ item }">
            <div class="bench-item" style="height: 48px; box-sizing: border-box;">{{ item.id }}</div>
          </template>
        </RecycleScroller>
      </div>
    `,
    props: {
      itemCount: Number,
      height: Number,
      itemHeight: Number,
    },
    computed: {
      itemsArray() {
        // Generate minimal items array with id field (required by vue-virtual-scroller)
        return Array.from({ length: this.itemCount }, (_, i) => ({ id: i }));
      },
    },
  };

  return benchmarkLibrary({
    libraryName: "vue-virtual-scroller",
    container,
    itemCount,
    onStatus,
    stressMs,
    createComponent: async (container, itemCount) => {
      const app = Vue.createApp({
        components: { VirtualList },
        template: `
          <VirtualList
            :item-count="itemCount"
            :height="height"
            :item-height="itemHeight"
          />
        `,
        data() {
          return {
            itemCount: itemCount,
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
  comparison: true,

  run: async ({ itemCount, container, onStatus, stressMs = 0 }) => {
    return runComparison({
      container,
      itemCount,
      onStatus,
      stressMs,
      libraryName: "vue-virtual-scroller",
      benchmarkCompetitor: benchmarkVueVirtualScroller,
      rateLower,
      rateHigher,
    });
  },
});
