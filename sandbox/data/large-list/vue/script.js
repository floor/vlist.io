// Large List — Vue implementation with useVList composable
// Uses builder pattern with compression + scrollbar plugins
// Demonstrates handling 100K–5M items with automatic scroll compression

import { createApp, ref, computed, watch } from "vue";
import { useVList, useVListEvent } from "vlist/vue";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 48;
const SIZES = {
  "100k": 100_000,
  "500k": 500_000,
  "1m": 1_000_000,
  "2m": 2_000_000,
  "5m": 5_000_000,
};

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];

// =============================================================================
// Utilities
// =============================================================================

// Simple hash for consistent per-item values
const hash = (n) => {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 16;
  return Math.abs(h);
};

// Generate items on the fly
const generateItems = (count) =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: hash(i) % 100,
    hash: hash(i).toString(16).slice(0, 8).toUpperCase(),
    color: COLORS[i % COLORS.length],
  }));

// Item template
const itemTemplate = (item, index) => `
  <div class="item-row">
    <div class="item-color" style="background:${item.color}"></div>
    <div class="item-info">
      <span class="item-label">#${(index + 1).toLocaleString()}</span>
      <span class="item-hash">${item.hash}</span>
    </div>
    <div class="item-bar-wrap">
      <div class="item-bar" style="width:${item.value}%;background:${item.color}"></div>
    </div>
    <span class="item-value">${item.value}%</span>
  </div>
`;

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const currentSize = ref("1m");
    const items = generateItems(SIZES["1m"]);
    const stats = ref({
      total: SIZES["1m"],
      dom: 0,
      genTime: 0,
      buildTime: 0,
    });
    const viewport = ref({
      scrollPos: 0,
      direction: "–",
      range: "–",
    });
    const scrollIndex = ref(0);
    const scrollAlign = ref("start");

    // Initialize vlist with builder pattern
    const { containerRef, instance } = useVList({
      ariaLabel: computed(
        () => `${SIZES[currentSize.value].toLocaleString()} items list`,
      ),
      item: {
        height: ITEM_HEIGHT,
        template: itemTemplate,
      },
      items,
      plugins: [
        {
          name: "compression",
          config: {},
        },
        {
          name: "scrollbar",
          config: { autoHide: true },
        },
      ],
    });

    // Track scroll events
    useVListEvent(instance, "scroll", ({ scrollTop, direction }) => {
      viewport.value = {
        ...viewport.value,
        scrollPos: Math.round(scrollTop),
        direction: direction === "up" ? "↑ up" : "↓ down",
      };
    });

    // Track range changes
    useVListEvent(instance, "range:change", ({ range }) => {
      const domNodes = range.end - range.start + 1;
      stats.value = { ...stats.value, dom: domNodes };
      viewport.value = {
        ...viewport.value,
        range: `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`,
      };
    });

    // Compression info
    const compression = computed(() => {
      const count = SIZES[currentSize.value];
      const totalHeight = count * ITEM_HEIGHT;
      const maxHeight = 16_777_216; // browser limit ~16.7M px
      const isCompressed = totalHeight > maxHeight;
      const ratio = isCompressed ? (totalHeight / maxHeight).toFixed(1) : "1.0";

      return {
        isCompressed,
        virtualHeight: totalHeight,
        ratio,
      };
    });

    // Virtualization percentage
    const virtualized = computed(() => {
      if (stats.value.total > 0 && stats.value.dom > 0) {
        return ((1 - stats.value.dom / stats.value.total) * 100).toFixed(4);
      }
      return "0.0000";
    });

    // Handle size change
    const handleSizeChange = (size) => {
      const count = SIZES[size];
      const startTime = performance.now();
      const newItems = generateItems(count);
      const genTime = performance.now() - startTime;

      currentSize.value = size;

      // Update vlist with new items
      if (instance.value) {
        instance.value.update({ items: newItems });
      }

      stats.value = {
        total: count,
        dom: 0,
        genTime,
        buildTime: performance.now() - startTime,
      };
    };

    // Navigation handlers
    const scrollToFirst = () => {
      instance.value?.scrollToIndex(0, "start");
    };

    const scrollToMiddle = () => {
      instance.value?.scrollToIndex(
        Math.floor(SIZES[currentSize.value] / 2),
        "center",
      );
    };

    const scrollToLast = () => {
      instance.value?.scrollToIndex(SIZES[currentSize.value] - 1, "end");
    };

    const scrollToRandom = () => {
      const idx = Math.floor(Math.random() * SIZES[currentSize.value]);
      instance.value?.scrollToIndex(idx, "center");
      scrollIndex.value = idx;
    };

    const handleGoToIndex = () => {
      instance.value?.scrollToIndex(
        Math.max(0, Math.min(scrollIndex.value, SIZES[currentSize.value] - 1)),
        scrollAlign.value,
      );
    };

    const handleSmoothTop = () => {
      instance.value?.scrollToIndex(0, {
        align: "start",
        behavior: "smooth",
        duration: 800,
      });
    };

    const handleSmoothBottom = () => {
      instance.value?.scrollToIndex(SIZES[currentSize.value] - 1, {
        align: "end",
        behavior: "smooth",
        duration: 800,
      });
    };

    return {
      containerRef,
      currentSize,
      stats,
      viewport,
      compression,
      virtualized,
      scrollIndex,
      scrollAlign,
      SIZES,
      handleSizeChange,
      scrollToFirst,
      scrollToMiddle,
      scrollToLast,
      scrollToRandom,
      handleGoToIndex,
      handleSmoothTop,
      handleSmoothBottom,
    };
  },

  template: `
    <div class="container container--wide">
      <header>
        <h1>Large List</h1>
        <p class="description">
          Vue implementation with <code>useVList</code> composable +
          <code>withScale</code> + <code>withScrollbar</code> plugins.
          Handles 100K–5M items with automatic scroll scaling when total height
          exceeds the browser's 16.7M pixel limit.
        </p>
      </header>

      <div class="stats">
        <strong>Total:</strong> {{ stats.total.toLocaleString() }}
        ·
        <strong>DOM:</strong> {{ stats.dom }}
        ·
        <strong>Virtualized:</strong> {{ virtualized }}%
        <template v-if="stats.genTime > 0">
          ·
          <strong>Gen:</strong> {{ stats.genTime.toFixed(0) }}ms
        </template>
        <template v-if="stats.buildTime > 0">
          ·
          <strong>Build:</strong> {{ stats.buildTime.toFixed(0) }}ms
        </template>
      </div>

      <div class="compression-bar">
        <span :class="['compression-badge', compression.isCompressed ? 'compression-badge--active' : 'compression-badge--off']">
          {{ compression.isCompressed ? 'COMPRESSED' : 'NATIVE' }}
        </span>
        <span class="compression-detail">
          Virtual height: <strong>{{ (compression.virtualHeight / 1_000_000).toFixed(1) }}M px</strong>
          ·
          Ratio: <strong>{{ compression.ratio }}×</strong>
          ·
          Limit: <strong>16.7M px</strong>
        </span>
      </div>

      <div class="split-layout">
        <div class="split-main">
          <div ref="containerRef" id="list-container" />
        </div>

        <aside class="split-panel">
          <!-- Size -->
          <section class="panel-section">
            <h3 class="panel-title">Size</h3>
            <div class="panel-row">
              <div class="panel-segmented">
                <button
                  v-for="(count, size) in SIZES"
                  :key="size"
                  :class="['panel-segmented__btn', { 'panel-segmented__btn--active': currentSize === size }]"
                  @click="handleSizeChange(size)"
                >
                  {{ size.toUpperCase() }}
                </button>
              </div>
            </div>
          </section>

          <!-- Navigation -->
          <section class="panel-section">
            <h3 class="panel-title">Navigation</h3>

            <div class="panel-row">
              <label class="panel-label" for="scroll-index">Scroll to index</label>
              <div class="panel-input-group">
                <input
                  type="number"
                  id="scroll-index"
                  min="0"
                  v-model.number="scrollIndex"
                  @keydown.enter.prevent="handleGoToIndex"
                  class="panel-input"
                />
                <select id="scroll-align" v-model="scrollAlign" class="panel-select">
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                </select>
                <button
                  @click="handleGoToIndex"
                  class="panel-btn panel-btn--icon"
                  title="Go"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Quick jump</label>
              <div class="panel-btn-group">
                <button @click="scrollToFirst" class="panel-btn">First</button>
                <button @click="scrollToMiddle" class="panel-btn">Middle</button>
                <button @click="scrollToLast" class="panel-btn">Last</button>
                <button @click="scrollToRandom" class="panel-btn">Random</button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Smooth scroll</label>
              <div class="panel-btn-group">
                <button @click="handleSmoothTop" class="panel-btn">↑ Top</button>
                <button @click="handleSmoothBottom" class="panel-btn">↓ Bottom</button>
              </div>
            </div>
          </section>

          <!-- Viewport -->
          <section class="panel-section">
            <h3 class="panel-title">Viewport</h3>
            <div class="panel-row">
              <span class="panel-label">Scroll</span>
              <span class="panel-value">{{ viewport.scrollPos.toLocaleString() }}px</span>
            </div>
            <div class="panel-row">
              <span class="panel-label">Direction</span>
              <span class="panel-value">{{ viewport.direction }}</span>
            </div>
            <div class="panel-row">
              <span class="panel-label">Range</span>
              <span class="panel-value">{{ viewport.range }}</span>
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          Compression activates automatically when the virtual height exceeds ~16.7
          million pixels. The Vue composable integrates seamlessly with the builder's
          plugin system — compression logic is only loaded when you configure the
          <code>compression</code> plugin. 💚
        </p>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
