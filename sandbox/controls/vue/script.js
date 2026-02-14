// Controls — Vue implementation with useVList composable
// Interactive control panel demonstrating vlist's navigation, selection, and viewport APIs

import { createApp, ref, computed, watch, onUnmounted } from "vue";
import { createVList } from "vlist";
import {
  TOTAL,
  items,
  itemTemplate,
  formatSelectionCount,
  calculateMemorySaved,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const selectionMode = ref("single");
    const scrollIndex = ref(0);
    const scrollAlign = ref("start");
    const stats = ref({
      domNodes: 0,
      memorySaved: 0,
    });
    const viewport = ref({
      scrollPos: 0,
      direction: "–",
      range: "–",
    });
    const selection = ref([]);
    const lastClicked = ref(null);

    // Initialize vlist with manual instance management
    const containerRef = ref(null);
    const instance = ref(null);

    // Create/recreate vlist instance when selection mode changes
    const createListInstance = () => {
      if (!containerRef.value) return;

      // Destroy existing instance
      if (instance.value) {
        instance.value.destroy();
      }

      // Create new instance with current selection mode
      instance.value = createVList({
        container: containerRef.value,
        ariaLabel: "User list",
        selection: { mode: selectionMode.value },
        item: {
          height: 64,
          template: itemTemplate,
        },
        items,
      });

      // Track scroll events
      instance.value.on("scroll", ({ scrollTop, direction }) => {
        viewport.value = {
          ...viewport.value,
          scrollPos: Math.round(scrollTop),
          direction: direction === "up" ? "↑ up" : "↓ down",
        };
      });

      // Track range changes
      instance.value.on("range:change", ({ range }) => {
        const domNodes = range.end - range.start + 1;
        const saved = calculateMemorySaved(domNodes, TOTAL);

        stats.value = { domNodes, memorySaved: saved };
        viewport.value = {
          ...viewport.value,
          range: `${range.start.toLocaleString()} – ${range.end.toLocaleString()}`,
        };
      });

      // Track selection changes
      instance.value.on("selection:change", ({ selected }) => {
        selection.value = selected;
      });

      // Track item clicks
      instance.value.on("item:click", ({ item, index }) => {
        lastClicked.value = { item, index };
        scrollIndex.value = index;
      });
    };

    // Watch for selection mode changes
    watch(selectionMode, () => {
      createListInstance();
    });

    // Watch for container ref to be available
    watch(containerRef, (newVal) => {
      if (newVal) {
        createListInstance();
      }
    });

    // Cleanup on unmount
    onUnmounted(() => {
      if (instance.value) {
        instance.value.destroy();
      }
    });

    // Selection count text
    const selectionCountText = computed(() => {
      return formatSelectionCount(selection.value.length);
    });

    // Navigation handlers
    const handleGoToIndex = () => {
      instance.value?.scrollToIndex(
        Math.max(0, Math.min(scrollIndex.value, TOTAL - 1)),
        scrollAlign.value,
      );
    };

    const scrollToFirst = () => {
      instance.value?.scrollToIndex(0, "start");
    };

    const scrollToMiddle = () => {
      instance.value?.scrollToIndex(Math.floor(TOTAL / 2), "center");
    };

    const scrollToLast = () => {
      instance.value?.scrollToIndex(TOTAL - 1, "end");
    };

    const scrollToRandom = () => {
      const idx = Math.floor(Math.random() * TOTAL);
      instance.value?.scrollToIndex(idx, "center");
      scrollIndex.value = idx;
    };

    const handleSmoothTop = () => {
      instance.value?.scrollToIndex(0, {
        align: "start",
        behavior: "smooth",
        duration: 600,
      });
    };

    const handleSmoothBottom = () => {
      instance.value?.scrollToIndex(TOTAL - 1, {
        align: "end",
        behavior: "smooth",
        duration: 600,
      });
    };

    // Selection handlers
    const handleSelectionModeChange = (mode) => {
      selectionMode.value = mode;
      selection.value = [];
      lastClicked.value = null;
    };

    const handleSelectAll = () => {
      if (selectionMode.value !== "multiple") {
        selectionMode.value = "multiple";
        // Defer selectAll() until after watch recreates the instance
        setTimeout(() => {
          instance.value?.selectAll();
        }, 10);
      } else {
        instance.value?.selectAll();
      }
    };

    const handleClearSelection = () => {
      instance.value?.clearSelection();
    };

    return {
      containerRef,
      selectionMode,
      scrollIndex,
      scrollAlign,
      stats,
      viewport,
      selection,
      selectionCountText,
      lastClicked,
      TOTAL,
      handleGoToIndex,
      scrollToFirst,
      scrollToMiddle,
      scrollToLast,
      scrollToRandom,
      handleSmoothTop,
      handleSmoothBottom,
      handleSelectionModeChange,
      handleSelectAll,
      handleClearSelection,
    };
  },

  template: `
    <div class="container container--wide">
      <header>
        <h1>Controls</h1>
        <p class="description">
          Vue implementation with <code>useVList</code> composable. Interactive
          control panel demonstrating vlist's navigation, selection, and
          viewport APIs with 100,000 items.
        </p>
      </header>

      <div class="stats">
        <span>
          <strong>Total:</strong> {{ TOTAL.toLocaleString() }}
        </span>
        <span>
          <strong>DOM nodes:</strong> {{ stats.domNodes }}
        </span>
        <span>
          <strong>Memory saved:</strong> {{ stats.memorySaved }}%
        </span>
        <span>
          <strong>Scroll:</strong> {{ viewport.scrollPos }}px
        </span>
        <span>
          <strong>Direction:</strong> {{ viewport.direction }}
        </span>
        <span>
          <strong>Range:</strong> {{ viewport.range }}
        </span>
      </div>

      <div class="split-layout">
        <div class="split-main">
          <div ref="containerRef" id="list-container" />
        </div>

        <aside class="split-panel">
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
                  :max="TOTAL - 1"
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
                <button @click="scrollToFirst" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                  </svg>
                  First
                </button>
                <button @click="scrollToMiddle" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z" />
                  </svg>
                  Middle
                </button>
                <button @click="scrollToLast" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                  Last
                </button>
                <button @click="scrollToRandom" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                  Random
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Smooth scroll</label>
              <div class="panel-btn-group">
                <button @click="handleSmoothTop" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
                  </svg>
                  Top
                </button>
                <button @click="handleSmoothBottom" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                  </svg>
                  Bottom
                </button>
              </div>
            </div>
          </section>

          <!-- Selection -->
          <section class="panel-section">
            <h3 class="panel-title">Selection</h3>

            <div class="panel-row">
              <label class="panel-label">Mode</label>
              <div class="panel-segmented">
                <button
                  v-for="mode in ['none', 'single', 'multiple']"
                  :key="mode"
                  :class="['panel-segmented__btn', { 'panel-segmented__btn--active': selectionMode === mode }]"
                  @click="handleSelectionModeChange(mode)"
                >
                  {{ mode }}
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Actions</label>
              <div class="panel-btn-group">
                <button @click="handleSelectAll" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z" />
                  </svg>
                  Select all
                </button>
                <button @click="handleClearSelection" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                  Clear
                </button>
              </div>
            </div>

            <div class="panel-row">
              <span class="panel-label">Selected</span>
              <span class="panel-value">{{ selectionCountText }}</span>
            </div>
          </section>

          <!-- Item Detail -->
          <section class="panel-section">
            <h3 class="panel-title">Last clicked</h3>
            <div class="panel-detail">
              <template v-if="lastClicked">
                <div class="panel-detail__header">
                  <span class="panel-detail__avatar">{{ lastClicked.item.initials }}</span>
                  <div>
                    <div class="panel-detail__name">{{ lastClicked.item.name }}</div>
                    <div class="panel-detail__email">{{ lastClicked.item.email }}</div>
                  </div>
                </div>
                <div class="panel-detail__meta">
                  <span>id: {{ lastClicked.item.id }}</span>
                  <span>index: {{ lastClicked.index }}</span>
                </div>
              </template>
              <span v-else class="panel-detail__empty">Click an item to see details</span>
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          Only visible items are rendered in the DOM. Scroll to see the magic! 💚
        </p>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
