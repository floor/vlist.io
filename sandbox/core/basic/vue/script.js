// Core Example - Vue (Lightweight 4.2KB)
// Same result as Basic, but using vlist/core for a smaller bundle
// Demonstrates core entry point with Vue Composition API

import { createApp, ref, onMounted, onUnmounted } from "vue";
import { createVList } from "vlist/core";

// =============================================================================
// Data Generation
// =============================================================================

let nextId = 1;

function generateItems(count) {
  return Array.from({ length: count }, () => {
    const id = nextId++;
    return {
      id,
      name: `User ${id}`,
      email: `user${id}@example.com`,
      initials: String.fromCharCode(65 + ((id - 1) % 26)),
    };
  });
}

// =============================================================================
// Item Template
// =============================================================================

const itemTemplate = (item, index) => `
  <div class="item-content">
    <div class="item-avatar">${item.initials}</div>
    <div class="item-details">
      <div class="item-name">${item.name}</div>
      <div class="item-email">${item.email}</div>
    </div>
    <div class="item-index">#${index + 1}</div>
  </div>
`;

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const items = ref(generateItems(100000));
    const stats = ref({ total: 100000, domNodes: 0, saved: 0 });
    const scrollInfo = ref({ position: 0, direction: "–" });
    const visibleRange = ref("–");
    const selectedItem = ref(null);
    const scrollIndex = ref("0");
    const scrollAlign = ref("start");

    // Refs
    const containerRef = ref(null);
    const instance = ref(null);

    // Update stats
    const updateStats = () => {
      if (!instance.value) return;
      const total = instance.value.total;
      const domNodes = document.querySelectorAll(".vlist-item").length;
      const saved = Math.round((1 - domNodes / total) * 100);
      stats.value = { total, domNodes, saved };
    };

    // Create list instance
    const createListInstance = () => {
      if (!containerRef.value) return;

      // Destroy previous instance
      if (instance.value) {
        instance.value.destroy();
        instance.value = null;
      }

      // Clear container
      containerRef.value.innerHTML = "";

      // Create new instance
      instance.value = createVList({
        container: containerRef.value,
        ariaLabel: "User list",
        item: {
          height: 64,
          template: itemTemplate,
        },
        items: items.value,
      });

      // Bind events
      instance.value.on("scroll", (scrollTop, direction) => {
        scrollInfo.value = {
          position: Math.round(scrollTop),
          direction: direction === "up" ? "↑ up" : "↓ down",
        };
      });

      instance.value.on("range:change", ({ range }) => {
        visibleRange.value = `${range.start} – ${range.end}`;
        updateStats();
      });

      instance.value.on("item:click", ({ item, index }) => {
        selectedItem.value = { ...item, index };
      });

      updateStats();
    };

    // Navigation handlers
    const handleGo = () => {
      if (!instance.value) return;
      const index = parseInt(scrollIndex.value, 10);
      if (Number.isNaN(index)) return;
      const clamped = Math.max(0, Math.min(index, instance.value.total - 1));
      instance.value.scrollToIndex(clamped, scrollAlign.value);
    };

    const handleFirst = () => {
      instance.value?.scrollToIndex(0, "start");
    };

    const handleMiddle = () => {
      if (!instance.value) return;
      instance.value.scrollToIndex(
        Math.floor(instance.value.total / 2),
        "center",
      );
    };

    const handleLast = () => {
      if (!instance.value) return;
      instance.value.scrollToIndex(instance.value.total - 1, "end");
    };

    const handleRandom = () => {
      if (!instance.value) return;
      const index = Math.floor(Math.random() * instance.value.total);
      instance.value.scrollToIndex(index, "center");
      scrollIndex.value = String(index);
    };

    const handleSmoothTop = () => {
      instance.value?.scrollToIndex(0, {
        align: "start",
        behavior: "smooth",
        duration: 600,
      });
    };

    const handleSmoothBottom = () => {
      if (!instance.value) return;
      instance.value.scrollToIndex(instance.value.total - 1, {
        align: "end",
        behavior: "smooth",
        duration: 600,
      });
    };

    // Data method handlers
    const handleAppend = () => {
      const newItems = generateItems(100);
      instance.value?.appendItems(newItems);
      items.value = [...items.value, ...newItems];
      updateStats();
    };

    const handlePrepend = () => {
      const newItems = generateItems(100);
      instance.value?.prependItems(newItems);
      items.value = [...newItems, ...items.value];
      updateStats();
    };

    const handleReset10k = () => {
      nextId = 1;
      items.value = generateItems(10000);
      instance.value?.setItems(items.value);
      updateStats();
    };

    const handleReset100k = () => {
      nextId = 1;
      items.value = generateItems(100000);
      instance.value?.setItems(items.value);
      updateStats();
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
      items,
      stats,
      scrollInfo,
      visibleRange,
      selectedItem,
      scrollIndex,
      scrollAlign,
      containerRef,
      handleGo,
      handleFirst,
      handleMiddle,
      handleLast,
      handleRandom,
      handleSmoothTop,
      handleSmoothBottom,
      handleAppend,
      handlePrepend,
      handleReset10k,
      handleReset100k,
    };
  },

  template: `
    <div class="container">
      <header>
        <h1>Core <span class="badge">4.2 KB</span></h1>
        <p class="description">
          Same virtual list as <a href="/sandbox/basic">Basic</a>, but using the lightweight
          <code>vlist/core</code> entry — <strong>11.4 KB</strong> minified
          (<strong>4.2 KB gzip</strong>). The minimal core provides everything
          most lists need: fixed & variable heights, scrolling, data methods,
          and events.
        </p>
      </header>

      <div class="bundle-info">
        <div class="bundle-item">
          <div class="bundle-label">Bundle size</div>
          <div class="bundle-size">
            11.4 KB <span class="muted">minified</span>
          </div>
        </div>
        <div class="bundle-item">
          <div class="bundle-label">Gzipped</div>
          <div class="bundle-size">
            4.2 KB <span class="muted">over the wire</span>
          </div>
        </div>
      </div>

      <div class="import-diff">
        <div class="import-line removed">
          <span class="diff-marker">−</span>
          <code>import { createVList } from <span class="hl">"vlist"</span>;</code>
        </div>
        <div class="import-line added">
          <span class="diff-marker">+</span>
          <code>import { createVList } from <span class="hl">"vlist/core"</span>;</code>
        </div>
      </div>

      <div class="stats">
        <span><strong>Total:</strong> {{ stats.total.toLocaleString() }}</span>
        <span><strong>DOM nodes:</strong> {{ stats.domNodes }}</span>
        <span><strong>Memory saved:</strong> {{ stats.saved }}%</span>
        <span><strong>Scroll:</strong> {{ scrollInfo.position }}px</span>
        <span><strong>Direction:</strong> {{ scrollInfo.direction }}</span>
        <span><strong>Range:</strong> {{ visibleRange }}</span>
      </div>

      <div class="split-layout">
        <div class="split-main">
          <div ref="containerRef" id="list-container"></div>
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
                  :max="items.length - 1"
                  v-model="scrollIndex"
                  @keydown.enter="handleGo"
                  class="panel-input"
                />
                <select id="scroll-align" v-model="scrollAlign" class="panel-select">
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                </select>
                <button @click="handleGo" class="panel-btn panel-btn--icon" title="Go">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Quick jump</label>
              <div class="panel-btn-group">
                <button @click="handleFirst" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                  </svg>
                  First
                </button>
                <button @click="handleMiddle" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z" />
                  </svg>
                  Middle
                </button>
                <button @click="handleLast" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                  </svg>
                  Last
                </button>
                <button @click="handleRandom" class="panel-btn">
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

          <!-- Data Methods -->
          <section class="panel-section">
            <h3 class="panel-title">Data Methods</h3>

            <div class="panel-row">
              <label class="panel-label">Mutate</label>
              <div class="panel-btn-group">
                <button @click="handleAppend" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Append 100
                </button>
                <button @click="handlePrepend" class="panel-btn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 11h6V5h2v6h6v2h-6v6h-2v-6H5v-2z" />
                  </svg>
                  Prepend 100
                </button>
              </div>
            </div>

            <div class="panel-row">
              <label class="panel-label">Reset</label>
              <div class="panel-btn-group">
                <button @click="handleReset10k" class="panel-btn">10K</button>
                <button @click="handleReset100k" class="panel-btn">100K</button>
              </div>
            </div>
          </section>

          <!-- Item Detail -->
          <section class="panel-section">
            <h3 class="panel-title">Last clicked</h3>
            <div class="panel-detail">
              <template v-if="selectedItem">
                <div class="panel-detail__header">
                  <span class="panel-detail__avatar">{{ selectedItem.initials }}</span>
                  <div>
                    <div class="panel-detail__name">{{ selectedItem.name }}</div>
                    <div class="panel-detail__email">{{ selectedItem.email }}</div>
                  </div>
                </div>
                <div class="panel-detail__meta">
                  <span>id: {{ selectedItem.id }}</span>
                  <span>index: {{ selectedItem.index }}</span>
                </div>
              </template>
              <span v-else class="panel-detail__empty">Click an item to see details</span>
            </div>
          </section>
        </aside>
      </div>

      <footer>
        <p>
          Core supports fixed & variable heights, scrollToIndex, data methods,
          events, and window scrolling — everything most lists need. ✨
        </p>
      </footer>
    </div>
  `,
};

// =============================================================================
// Mount
// =============================================================================

createApp(App).mount("#vue-root");
