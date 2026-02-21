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

import { vlist } from "vlist";
import {
  defineSuite,
  generateItems,
  benchmarkTemplate,
  nextFrame,
  waitFrames,
  tryGC,
  getHeapUsed,
  bytesToMB,
  round,
  median,
  percentile,
  rateLower,
  rateHigher,
} from "../runner.js";

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
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const MEASURE_ITERATIONS = 5;
const SCROLL_DURATION_MS = 5000;
const SCROLL_SPEED_PX_PER_FRAME = 100;

// =============================================================================
// Helper: Find scrollable viewport
// =============================================================================

const findViewport = (container) => {
  const vp = container.querySelector(".vlist-viewport");
  if (vp) return vp;

  for (const child of container.children) {
    const style = getComputedStyle(child);
    if (
      style.overflow === "auto" ||
      style.overflow === "scroll" ||
      style.overflowY === "auto" ||
      style.overflowY === "scroll"
    ) {
      return child;
    }
  }

  return container.firstElementChild;
};

// =============================================================================
// Helper: Scroll measurement
// =============================================================================

/**
 * Scroll and measure frame times.
 * Returns median FPS and frame time percentiles.
 */
const measureScrollPerformance = async (viewport, durationMs) => {
  const frameTimes = [];
  let lastTime = performance.now();
  let scrollPos = 0;
  let direction = 1;
  const maxScroll = viewport.scrollHeight - viewport.clientHeight;

  return new Promise((resolve) => {
    const startTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const elapsed = now - startTime;

      if (elapsed >= durationMs) {
        // Calculate FPS from frame times
        const medianFrameTime = median(frameTimes);
        const p95FrameTime = percentile(
          [...frameTimes].sort((a, b) => a - b),
          95,
        );
        const medianFPS = round(1000 / medianFrameTime, 1);

        resolve({
          medianFPS,
          medianFrameTime: round(medianFrameTime, 2),
          p95FrameTime: round(p95FrameTime, 2),
          totalFrames: frameTimes.length,
        });
        return;
      }

      // Record frame time
      const frameTime = now - lastTime;
      frameTimes.push(frameTime);
      lastTime = now;

      // Update scroll position
      scrollPos += SCROLL_SPEED_PX_PER_FRAME * direction;

      if (scrollPos >= maxScroll) {
        scrollPos = maxScroll;
        direction = -1;
      } else if (scrollPos <= 0) {
        scrollPos = 0;
        direction = 1;
      }

      viewport.scrollTop = scrollPos;

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
};

// =============================================================================
// Benchmark: vlist
// =============================================================================

/**
 * Benchmark vlist performance.
 */
const benchmarkVList = async (container, items, onStatus) => {
  onStatus("Testing vlist - preparing...");

  // Measure memory before
  await tryGC();
  const memBefore = getHeapUsed();

  // Measure render time
  const renderTimes = [];

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const start = performance.now();

    const list = vlist({
      container,
      item: {
        height: ITEM_HEIGHT,
        template: benchmarkTemplate,
      },
    }).build();

    list.setItems(items);

    await nextFrame();
    const renderTime = performance.now() - start;
    renderTimes.push(renderTime);

    list.destroy();
  }

  // Create final instance for memory and scroll testing
  container.innerHTML = "";
  await tryGC();

  onStatus("Testing vlist - rendering...");

  const list = vlist({
    container,
    item: {
      height: ITEM_HEIGHT,
      template: benchmarkTemplate,
    },
  }).build();

  list.setItems(items);

  await waitFrames(3);

  // Measure memory after render
  await tryGC();
  const memAfter = getHeapUsed();

  // Find viewport and measure scroll performance
  onStatus("Testing vlist - scrolling...");
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
  );

  // Cleanup
  list.destroy();
  container.innerHTML = "";

  return {
    library: "vlist",
    renderTime: round(median(renderTimes), 2),
    memoryUsed: memAfter && memBefore ? bytesToMB(memAfter - memBefore) : null,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
};

// =============================================================================
// Benchmark: vue-virtual-scroller
// =============================================================================

/**
 * Benchmark vue-virtual-scroller performance.
 */
const benchmarkVueVirtualScroller = async (container, items, onStatus) => {
  onStatus("Testing vue-virtual-scroller - preparing...");

  // Ensure libraries are loaded
  const loaded = await loadVueLibraries();
  if (!loaded) {
    throw new Error("vue-virtual-scroller is not available");
  }

  // Measure memory before
  await tryGC();
  const memBefore = getHeapUsed();

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

  // Measure render time
  const renderTimes = [];

  for (let i = 0; i < MEASURE_ITERATIONS; i++) {
    container.innerHTML = "";
    await nextFrame();

    const start = performance.now();

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

    await nextFrame();
    const renderTime = performance.now() - start;
    renderTimes.push(renderTime);

    app.unmount();
  }

  // Create final instance for memory and scroll testing
  container.innerHTML = "";
  await tryGC();

  onStatus("Testing vue-virtual-scroller - rendering...");

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

  await waitFrames(3);

  // Measure memory after render
  await tryGC();
  const memAfter = getHeapUsed();

  // Find viewport and measure scroll performance
  onStatus("Testing vue-virtual-scroller - scrolling...");
  const viewport = findViewport(container);
  const scrollMetrics = await measureScrollPerformance(
    viewport,
    SCROLL_DURATION_MS,
  );

  // Cleanup
  app.unmount();
  container.innerHTML = "";

  return {
    library: "vue-virtual-scroller",
    renderTime: round(median(renderTimes), 2),
    memoryUsed: memAfter && memBefore ? bytesToMB(memAfter - memBefore) : null,
    scrollFPS: scrollMetrics.medianFPS,
    p95FrameTime: scrollMetrics.p95FrameTime,
  };
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
    await tryGC();
    await waitFrames(5);

    // Benchmark vue-virtual-scroller
    let vueResults;
    try {
      vueResults = await benchmarkVueVirtualScroller(
        container,
        items,
        onStatus,
      );
    } catch (err) {
      console.warn("[vue-virtual-scroller] vue-virtual-scroller test failed:", err);
      vueResults = {
        library: "vue-virtual-scroller",
        renderTime: null,
        memoryUsed: null,
        scrollFPS: null,
        p95FrameTime: null,
        error: err.message,
      };
    }

    // Calculate comparison percentages
    const metrics = [];

    // Render Time Comparison
    if (vlistResults.renderTime && vueResults.renderTime) {
      const diff = vlistResults.renderTime - vueResults.renderTime;
      const pct = round((diff / vueResults.renderTime) * 100, 1);

      metrics.push({
        label: "vlist Render Time",
        value: vlistResults.renderTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(vlistResults.renderTime, 30, 50),
      });

      metrics.push({
        label: "vue-virtual-scroller Render Time",
        value: vueResults.renderTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(vueResults.renderTime, 30, 50),
      });

      metrics.push({
        label: "Render Time Difference",
        value: pct,
        unit: "%",
        better: "lower",
        rating: pct < 0 ? "good" : pct < 20 ? "ok" : "bad",
        meta: pct < 0 ? "vlist is faster" : "vue-virtual-scroller is faster",
      });
    }

    // Memory Comparison
    if (vlistResults.memoryUsed && vueResults.memoryUsed) {
      const diff = vlistResults.memoryUsed - vueResults.memoryUsed;
      const pct = round((diff / vueResults.memoryUsed) * 100, 1);

      metrics.push({
        label: "vlist Memory Usage",
        value: vlistResults.memoryUsed,
        unit: "MB",
        better: "lower",
        rating: rateLower(vlistResults.memoryUsed, 30, 50),
      });

      metrics.push({
        label: "vue-virtual-scroller Memory Usage",
        value: vueResults.memoryUsed,
        unit: "MB",
        better: "lower",
        rating: rateLower(vueResults.memoryUsed, 30, 50),
      });

      metrics.push({
        label: "Memory Difference",
        value: pct,
        unit: "%",
        better: "lower",
        rating: pct < 0 ? "good" : pct < 20 ? "ok" : "bad",
        meta: pct < 0 ? "vlist uses less" : "vue-virtual-scroller uses less",
      });
    }

    // Scroll FPS Comparison
    if (vlistResults.scrollFPS && vueResults.scrollFPS) {
      const diff = vlistResults.scrollFPS - vueResults.scrollFPS;
      const pct = round((diff / vueResults.scrollFPS) * 100, 1);

      metrics.push({
        label: "vlist Scroll FPS",
        value: vlistResults.scrollFPS,
        unit: "fps",
        better: "higher",
        rating: rateHigher(vlistResults.scrollFPS, 55, 50),
      });

      metrics.push({
        label: "vue-virtual-scroller Scroll FPS",
        value: vueResults.scrollFPS,
        unit: "fps",
        better: "higher",
        rating: rateHigher(vueResults.scrollFPS, 55, 50),
      });

      metrics.push({
        label: "FPS Difference",
        value: pct,
        unit: "%",
        better: "higher",
        rating: pct > 0 ? "good" : pct > -5 ? "ok" : "bad",
        meta: pct > 0 ? "vlist is smoother" : "vue-virtual-scroller is smoother",
      });
    }

    // P95 Frame Time Comparison
    if (vlistResults.p95FrameTime && vueResults.p95FrameTime) {
      metrics.push({
        label: "vlist P95 Frame Time",
        value: vlistResults.p95FrameTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(vlistResults.p95FrameTime, 20, 30),
      });

      metrics.push({
        label: "vue-virtual-scroller P95 Frame Time",
        value: vueResults.p95FrameTime,
        unit: "ms",
        better: "lower",
        rating: rateLower(vueResults.p95FrameTime, 20, 30),
      });
    }

    // Add error metric if vue-virtual-scroller failed
    if (vueResults.error) {
      metrics.push({
        label: "vue-virtual-scroller Error",
        value: 0,
        unit: "",
        better: "lower",
        rating: "bad",
        meta: vueResults.error,
      });
    }

    return metrics;
  },
});
