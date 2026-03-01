// Photo Album — Vue variant
// Uses useVList composable from vlist-vue with declarative layout config
// Layout mode toggle: Grid ↔ Masonry

import { createApp, ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useVList, useVListEvent } from "vlist-vue";
import { ITEM_COUNT, ASPECT_RATIO, items, itemTemplate } from "../shared.js";
import { createStats } from "../../stats.js";

// =============================================================================
// Item config helpers
// =============================================================================

function getItemConfig(mode, orientation) {
  if (mode === "masonry") {
    return {
      height: (_index, ctx) =>
        ctx ? Math.round(ctx.columnWidth * items[_index].aspectRatio) : 200,
      width:
        orientation === "horizontal"
          ? (_index, ctx) =>
              ctx
                ? Math.round(ctx.columnWidth * items[_index].aspectRatio)
                : 200
          : undefined,
      template: itemTemplate,
    };
  }

  // Grid — horizontal needs fixed cross-axis height
  if (orientation === "horizontal") {
    return {
      height: 200,
      width: (_index, ctx) =>
        ctx ? Math.round(ctx.columnWidth * (4 / 3)) : 200,
      template: itemTemplate,
    };
  }

  return {
    height: (_index, ctx) =>
      ctx ? Math.round(ctx.columnWidth * ASPECT_RATIO) : 200,
    template: itemTemplate,
  };
}

// =============================================================================
// Stats (module-level)
// =============================================================================

let statsInstance = null;

// =============================================================================
// App
// =============================================================================

const App = {
  setup() {
    const mode = ref("grid");
    const orientation = ref("vertical");
    const columns = ref(4);
    const gap = ref(8);
    const selectedPhoto = ref(null);

    // Computed layout config for useVList
    const vlistConfig = computed(() => {
      const m = mode.value;
      const o = orientation.value;
      const c = columns.value;
      const g = gap.value;

      const layoutConfig =
        m === "masonry"
          ? { layout: "masonry", masonry: { columns: c, gap: g } }
          : { layout: "grid", grid: { columns: c, gap: g } };

      return {
        ariaLabel: "Photo gallery",
        orientation: o,
        ...layoutConfig,
        item: getItemConfig(m, o),
        items,
        scroll: {
          scrollbar: { autoHide: true },
        },
      };
    });

    const containerRef = ref(null);
    const instance = ref(null);

    // Manual lifecycle — useVList doesn't support config changes (needs remount)
    let cleanup = null;

    function mount() {
      if (!containerRef.value) return;

      const config = vlistConfig.value;
      const { useVList: _, ...rest } = config; // just use config directly

      // Import and build manually since useVList is designed for single mount
      import("vlist").then(
        ({ vlist, withGrid, withMasonry, withScrollbar }) => {
          let builder = vlist({
            ...config,
            container: containerRef.value,
          });

          if (config.layout === "grid" && config.grid) {
            builder = builder.use(withGrid(config.grid));
          }
          if (config.layout === "masonry" && config.masonry) {
            builder = builder.use(withMasonry(config.masonry));
          }
          builder = builder.use(withScrollbar({ autoHide: true }));

          const inst = builder.build();
          instance.value = inst;

          // Stats
          if (!statsInstance) {
            statsInstance = createStats({
              getList: () => instance.value,
              getTotal: () => ITEM_COUNT,
              getItemHeight: () => {
                const el = containerRef.value;
                if (!el) return 200;
                const innerWidth = el.clientWidth - 2;
                const colW =
                  (innerWidth - (columns.value - 1) * gap.value) /
                  columns.value;
                return mode.value === "masonry"
                  ? Math.round(colW * 1.05)
                  : Math.round(colW * ASPECT_RATIO);
              },
              container: "#grid-container",
            });
          }

          // Events
          inst.on("scroll", () => statsInstance?.scheduleUpdate());
          inst.on("range:change", () => statsInstance?.scheduleUpdate());
          inst.on("velocity:change", ({ velocity }) =>
            statsInstance?.onVelocity(velocity),
          );
          inst.on("item:click", ({ item }) => {
            selectedPhoto.value = item;
          });

          statsInstance.update();
          updateFooterContext();
        },
      );
    }

    function unmount() {
      if (instance.value) {
        instance.value.destroy();
        instance.value = null;
      }
      if (containerRef.value) {
        containerRef.value.innerHTML = "";
      }
    }

    function updateFooterContext() {
      const ftMode = document.getElementById("ft-mode");
      const ftOrientation = document.getElementById("ft-orientation");
      if (ftMode) ftMode.textContent = mode.value;
      if (ftOrientation) ftOrientation.textContent = orientation.value;
    }

    // Recreate on config change
    watch([mode, orientation, columns, gap], () => {
      unmount();
      mount();
    });

    onMounted(() => mount());
    onUnmounted(() => unmount());

    // Navigation
    const scrollToFirst = () => instance.value?.scrollToIndex(0, "start");
    const scrollToMiddle = () =>
      instance.value?.scrollToIndex(Math.floor(ITEM_COUNT / 2), "center");
    const scrollToLast = () =>
      instance.value?.scrollToIndex(ITEM_COUNT - 1, "end");

    return {
      mode,
      orientation,
      columns,
      gap,
      selectedPhoto,
      containerRef,
      scrollToFirst,
      scrollToMiddle,
      scrollToLast,
      ITEM_COUNT,
    };
  },

  template: `
    <div class="container">
      <header>
        <h1>Photo Album</h1>
        <p class="description">
          Virtualized 2D photo gallery with real images from Lorem Picsum.
          Toggle between grid and masonry layouts, adjust columns and gap —
          only visible rows are rendered.
        </p>
      </header>

      <div class="split-layout">
        <div class="split-main split-main--full">
          <div ref="containerRef" id="grid-container"></div>
        </div>

        <aside class="split-panel">
          <!-- Layout -->
          <section class="panel-section">
            <h3 class="panel-title">Layout</h3>

            <div class="panel-row">
              <label class="panel-label">Mode</label>
              <div class="panel-segmented">
                <button
                  v-for="m in ['grid', 'masonry']"
                  :key="m"
                  :class="['panel-segmented__btn', { 'panel-segmented__btn--active': m === mode }]"
                  @click="mode = m"
                >
                  {{ m === 'grid' ? 'Grid' : 'Masonry' }}
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Orientation</label>
              <div class="panel-segmented">
                <button
                  v-for="o in ['vertical', 'horizontal']"
                  :key="o"
                  :class="['panel-segmented__btn', { 'panel-segmented__btn--active': o === orientation }]"
                  @click="orientation = o"
                >
                  {{ o === 'vertical' ? 'Vertical' : 'Horizontal' }}
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">{{ orientation === 'horizontal' ? 'Rows' : 'Columns' }}</label>
              <div class="panel-btn-group">
                <button
                  v-for="c in [3, 4, 5, 6, 10]"
                  :key="c"
                  :class="['ctrl-btn', { 'ctrl-btn--active': c === columns }]"
                  @click="columns = c"
                >
                  {{ c }}
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Gap</label>
              <div class="panel-btn-group">
                <button
                  v-for="g in [0, 4, 8, 12, 16]"
                  :key="g"
                  :class="['ctrl-btn', { 'ctrl-btn--active': g === gap }]"
                  @click="gap = g"
                >
                  {{ g }}
                </button>
              </div>
            </div>
          </section>

          <!-- Navigation -->
          <section class="panel-section">
            <h3 class="panel-title">Navigation</h3>
            <div class="panel-row">
              <div class="panel-btn-group">
                <button class="panel-btn panel-btn--icon" title="First" @click="scrollToFirst">
                  <i class="icon icon--up"></i>
                </button>
                <button class="panel-btn panel-btn--icon" title="Middle" @click="scrollToMiddle">
                  <i class="icon icon--center"></i>
                </button>
                <button class="panel-btn panel-btn--icon" title="Last" @click="scrollToLast">
                  <i class="icon icon--down"></i>
                </button>
              </div>
            </div>
          </section>

          <!-- Photo Detail -->
          <section class="panel-section">
            <h3 class="panel-title">Last clicked</h3>
            <div class="panel-detail">
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

      <footer class="example-footer" id="example-footer">
        <div class="example-footer__left">
          <span class="example-footer__stat">
            <strong id="ft-progress">0%</strong>
          </span>
          <span class="example-footer__stat">
            <span id="ft-velocity">0.00</span> /
            <strong id="ft-velocity-avg">0.00</strong>
            <span class="example-footer__unit">px/ms</span>
          </span>
          <span class="example-footer__stat">
            <span id="ft-dom">0</span> /
            <strong id="ft-total">0</strong>
            <span class="example-footer__unit">items</span>
          </span>
        </div>
        <div class="example-footer__right">
          <span class="example-footer__stat">
            <strong id="ft-mode">grid</strong>
          </span>
          <span class="example-footer__stat">
            <strong id="ft-orientation">vertical</strong>
          </span>
        </div>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
