// Grid Layout — Vue implementation with useVList composable
// Virtualized 2D photo gallery with 1,000 real photos from Lorem Picsum

import { createApp, ref, computed, watch, onMounted, onUnmounted } from "vue";
import { createVList } from "vlist";
import {
  items,
  itemTemplate,
  calculateRowHeight,
  calculateGridStats,
  DEFAULT_COLUMNS,
  DEFAULT_GAP,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const columns = ref(DEFAULT_COLUMNS);
    const gap = ref(DEFAULT_GAP);
    const stats = ref({
      domNodes: 0,
      rows: 0,
      saved: 0,
    });
    const containerWidth = ref(800);

    // Initialize vlist with manual instance management
    const containerRef = ref(null);
    const instance = ref(null);

    // Update stats
    const updateStats = () => {
      const domNodes = document.querySelectorAll(
        ".vlist-item, .vlist-grid-item",
      ).length;
      const { rows, saved } = calculateGridStats(
        domNodes,
        items.length,
        columns.value,
      );
      stats.value = { domNodes, rows, saved };
    };

    // Create vlist instance (once)
    const createListInstance = () => {
      if (!containerRef.value) return;

      // Create new instance with current values
      instance.value = createVList({
        container: containerRef.value,
        ariaLabel: "Photo gallery",
        layout: "grid",
        grid: {
          columns: columns.value,
          gap: gap.value,
        },
        item: {
          // Height function receives grid context for dynamic aspect ratio
          height: (index, context) => {
            if (context) {
              return context.columnWidth * 0.75; // 4:3 aspect ratio
            }
            return 200; // fallback
          },
          template: itemTemplate,
        },
        items,
      });

      // Track scroll and range changes
      instance.value.on("scroll", updateStats);
      instance.value.on("range:change", updateStats);

      // Track item clicks
      instance.value.on("item:click", ({ item, index }) => {
        console.log(
          `Clicked: ${item.title} (${item.category}) at index ${index}`,
        );
      });

      updateStats();
    };

    // Update grid configuration
    const updateGridConfig = () => {
      if (!instance.value) return;

      // Use the new update() method - height automatically recalculates
      instance.value.update({
        grid: {
          columns: columns.value,
          gap: gap.value,
        },
      });

      updateStats();
    };

    // Watch for container ref to be available
    watch(containerRef, (newVal) => {
      if (newVal) {
        containerWidth.value = newVal.clientWidth;
        createListInstance();
      }
    });

    // Update grid config when columns or gap change
    watch([columns, gap], () => {
      if (containerRef.value) {
        containerWidth.value = containerRef.value.clientWidth;
      }
      if (instance.value) {
        updateGridConfig();
      }
    });

    // Cleanup on unmount
    onUnmounted(() => {
      if (instance.value) {
        instance.value.destroy();
      }
    });

    return {
      containerRef,
      columns,
      gap,
      stats,
      items,
    };
  },

  template: `
    <div class="container">
      <header>
        <h1>Grid Layout</h1>
        <p class="description">
          Vue implementation with <code>useVList</code> composable. Virtualized 2D
          grid with 1,000 real photos from
          <a href="https://picsum.photos" target="_blank">Lorem Picsum</a>.
          Only visible rows are rendered — images load on demand as you scroll.
        </p>
      </header>

      <div class="controls">
        <label>
          Columns:
          <select v-model.number="columns">
            <option :value="2">2</option>
            <option :value="3">3</option>
            <option :value="4">4</option>
            <option :value="5">5</option>
            <option :value="6">6</option>
          </select>
        </label>
        <label>
          Gap:
          <select v-model.number="gap">
            <option :value="0">0px</option>
            <option :value="4">4px</option>
            <option :value="8">8px</option>
            <option :value="12">12px</option>
            <option :value="16">16px</option>
          </select>
        </label>
      </div>

      <div class="stats">
        <span>
          <strong>Total:</strong> {{ items.length.toLocaleString() }} photos
        </span>
        <span>
          <strong>Rows:</strong> {{ stats.rows.toLocaleString() }}
        </span>
        <span>
          <strong>DOM nodes:</strong> {{ stats.domNodes }}
        </span>
        <span>
          <strong>Memory saved:</strong> {{ stats.saved }}%
        </span>
      </div>

      <div ref="containerRef" id="grid-container" />

      <footer>
        <p>
          Only visible rows are rendered. Each item is positioned with
          <code>translate(x, y)</code>. Photos courtesy of
          <a href="https://picsum.photos" target="_blank">Picsum</a>
          💚
        </p>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
