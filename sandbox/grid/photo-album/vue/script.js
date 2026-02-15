// Grid Photo Album — Vue
// Uses vlist/builder with withGrid + withScrollbar plugins
// Demonstrates a virtualized 2D photo gallery with Vue composition API

import { createApp, ref, onMounted, onUnmounted } from "vue";
import { createVList } from "vlist";

// =============================================================================
// Data Generation
// =============================================================================

const PHOTO_COUNT = 1084;
const ITEM_COUNT = 600;

const categories = [
  "Nature",
  "Urban",
  "Portrait",
  "Abstract",
  "Travel",
  "Food",
  "Animals",
  "Architecture",
  "Art",
  "Space",
];

const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = categories[i % categories.length];
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.random() * 500),
    picId,
  };
});

// =============================================================================
// Item Template
// =============================================================================

const itemTemplate = (item) => `
  <div class="card">
    <img
      class="card__img"
      src="https://picsum.photos/id/${item.picId}/300/225"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
    />
    <div class="card__overlay">
      <span class="card__title">${item.title}</span>
      <span class="card__category">${item.category}</span>
    </div>
    <div class="card__likes">♥ ${item.likes}</div>
  </div>
`;

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const columns = ref(4);
    const gap = ref(8);
    const stats = ref({
      domNodes: 0,
      rows: 0,
      saved: "0.0",
    });
    const visibleRange = ref("–");
    const selectedPhoto = ref(null);
    const gridInfo = ref({
      columns: 4,
      gap: 8,
      rowHeight: 0,
    });

    // Refs
    const containerRef = ref(null);
    const instance = ref(null);
    let statsRaf = null;

    // Update stats
    const scheduleStatsUpdate = () => {
      if (statsRaf) return;
      statsRaf = requestAnimationFrame(() => {
        statsRaf = null;
        updateStats();
      });
    };

    const updateStats = () => {
      const domNodes = document.querySelectorAll(".vlist-item").length;
      const totalRows = Math.ceil(ITEM_COUNT / columns.value);
      const saved = ((1 - domNodes / ITEM_COUNT) * 100).toFixed(1);
      stats.value = { domNodes, rows: totalRows, saved };
    };

    // Create vlist instance
    const createListInstance = () => {
      if (!containerRef.value) return;

      // Destroy previous instance if exists
      if (instance.value) {
        instance.value.destroy();
        instance.value = null;
      }

      // Clear container
      containerRef.value.innerHTML = "";

      // Calculate row height from column width to maintain 4:3 aspect ratio
      const innerWidth = containerRef.value.clientWidth - 2; // account for border
      const colWidth =
        (innerWidth - (columns.value - 1) * gap.value) / columns.value;
      const height = Math.round(colWidth * 0.75);

      // Update grid info
      gridInfo.value = {
        columns: columns.value,
        gap: gap.value,
        rowHeight: height,
      };

      // Create new instance with builder pattern
      instance.value = createVList({
        container: containerRef.value,
        ariaLabel: "Photo gallery",
        layout: "grid",
        grid: {
          columns: columns.value,
          gap: gap.value,
        },
        item: {
          height,
          template: itemTemplate,
        },
        items,
        scroll: {
          scrollbar: {
            autoHide: true,
          },
        },
      });

      // Track scroll and range changes
      instance.value.on("scroll", scheduleStatsUpdate);
      instance.value.on("range:change", ({ range }) => {
        visibleRange.value = `rows ${range.start} – ${range.end}`;
        scheduleStatsUpdate();
      });

      // Track item clicks
      instance.value.on("item:click", ({ item }) => {
        selectedPhoto.value = item;
      });

      updateStats();
    };

    // Handle column change
    const setColumns = (cols) => {
      columns.value = cols;
      createListInstance();
    };

    // Handle gap change
    const setGap = (gapValue) => {
      gap.value = gapValue;
      createListInstance();
    };

    // Navigation helpers
    const scrollToFirst = () => {
      instance.value?.scrollToIndex(0, "start");
    };

    const scrollToMiddle = () => {
      instance.value?.scrollToIndex(Math.floor(ITEM_COUNT / 2), "center");
    };

    const scrollToLast = () => {
      instance.value?.scrollToIndex(ITEM_COUNT - 1, "end");
    };

    // Lifecycle
    onMounted(() => {
      createListInstance();
    });

    onUnmounted(() => {
      if (instance.value) {
        instance.value.destroy();
      }
    });

    return {
      columns,
      gap,
      stats,
      visibleRange,
      selectedPhoto,
      gridInfo,
      containerRef,
      setColumns,
      setGap,
      scrollToFirst,
      scrollToMiddle,
      scrollToLast,
      ITEM_COUNT,
    };
  },

  template: `
    <div class="container">
      <header>
        <h1>Builder · Grid</h1>
        <p class="description">
          Composable entry point – <code>vlist/builder</code> with
          <code>withGrid</code> + <code>withScrollbar</code> plugins.
          Virtualized 2D photo gallery with real images from Lorem Picsum.
          Configurable columns and gap — only visible rows are rendered.
        </p>
      </header>

      <div class="stats">
        <strong>Photos:</strong> {{ ITEM_COUNT }} ·
        <strong>Rows:</strong> {{ stats.rows }} ·
        <strong>DOM:</strong> {{ stats.domNodes }} ·
        <strong>Virtualized:</strong> {{ stats.saved }}%
      </div>

      <div class="grid-info">
        <strong>Columns:</strong> {{ gridInfo.columns }} ·
        <strong>Gap:</strong> {{ gridInfo.gap }}px ·
        <strong>Row height:</strong> {{ gridInfo.rowHeight }}px ·
        <strong>Aspect:</strong> 4:3
      </div>

      <div class="split-layout">
        <div class="split-main">
          <div ref="containerRef" id="grid-container"></div>
        </div>

        <aside class="split-panel">
          <!-- Grid Controls -->
          <section class="panel-section">
            <h3 class="panel-title">Grid</h3>

            <div class="panel-row">
              <label class="panel-label">Columns</label>
              <div class="panel-btn-group" id="columns-buttons">
                <button
                  v-for="cols in [2, 3, 4, 5, 6]"
                  :key="cols"
                  :data-cols="cols"
                  :class="['ctrl-btn', { 'ctrl-btn--active': cols === columns }]"
                  @click="setColumns(cols)"
                >
                  {{ cols }}
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Gap</label>
              <div class="panel-btn-group" id="gap-buttons">
                <button
                  v-for="gapValue in [0, 4, 8, 12, 16]"
                  :key="gapValue"
                  :data-gap="gapValue"
                  :class="['ctrl-btn', { 'ctrl-btn--active': gapValue === gap }]"
                  @click="setGap(gapValue)"
                >
                  {{ gapValue }}
                </button>
              </div>
            </div>
          </section>

          <!-- Navigation -->
          <section class="panel-section">
            <h3 class="panel-title">Navigation</h3>
            <div class="panel-row">
              <label class="panel-label">Quick jump</label>
              <div class="panel-btn-group">
                <button class="panel-btn" @click="scrollToFirst">First</button>
                <button class="panel-btn" @click="scrollToMiddle">Middle</button>
                <button class="panel-btn" @click="scrollToLast">Last</button>
              </div>
            </div>
            <div class="panel-row">
              <span class="panel-label">Range</span>
              <span class="panel-value">{{ visibleRange }}</span>
            </div>
          </section>

          <!-- Photo Detail -->
          <section class="panel-section">
            <h3 class="panel-title">Last clicked</h3>
            <div class="panel-detail" id="photo-detail">
              <template v-if="selectedPhoto">
                <img
                  class="detail__img"
                  :src="'https://picsum.photos/id/' + selectedPhoto.picId + '/400/300'"
                  :alt="selectedPhoto.title"
                />
                <div class="detail__meta">
                  <strong>{{ selectedPhoto.title }}</strong>
                  <span>{{ selectedPhoto.category }} · ♥ {{ selectedPhoto.likes }}</span>
                </div>
              </template>
              <span v-else class="panel-detail__empty">Click a photo to see details</span>
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          The builder's <code>withGrid</code> plugin replaces the list
          renderer with a grid renderer. The virtualizer works in row-space —
          it only materializes DOM for visible rows. Column width auto-adjusts
          on resize. 📸
        </p>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
