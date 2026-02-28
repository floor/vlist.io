// Basic List — Vue implementation
// Interactive control panel demonstrating core vlist API: item count, overscan,
// scrollToIndex, and data operations (append, prepend, remove).

import { createApp, ref, computed, watch, onMounted, onUnmounted } from "vue";
import { vlist } from "vlist";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeUser,
  makeUsers,
  itemTemplate,
} from "../shared.js";

// =============================================================================
// App Component
// =============================================================================

const App = {
  setup() {
    // State
    const users = ref(makeUsers(DEFAULT_COUNT));
    const nextId = ref(DEFAULT_COUNT + 1);
    const overscan = ref(3);
    const scrollIndex = ref(0);
    const scrollAlign = ref("start");
    const stats = ref({ dom: 0, total: DEFAULT_COUNT });

    // Refs
    const containerRef = ref(null);
    let instance = null;

    // Create vlist instance
    function createListInstance() {
      if (!containerRef.value) return;

      if (instance) {
        instance.destroy();
        instance = null;
      }

      instance = vlist({
        container: containerRef.value,
        ariaLabel: "User list",
        overscan: overscan.value,
        items: users.value,
        item: {
          height: ITEM_HEIGHT,
          template: itemTemplate,
        },
      }).build();

      instance.on("range:change", ({ range }) => {
        stats.value = {
          dom: range.end - range.start + 1,
          total: users.value.length,
        };
      });

      instance.on("scroll", () => {
        const domNodes =
          containerRef.value?.querySelectorAll(".vlist-item").length ?? 0;
        stats.value = { ...stats.value, dom: domNodes };
      });
    }

    // Watch overscan to recreate
    watch(overscan, () => {
      createListInstance();
    });

    // Watch container ref
    watch(containerRef, (newVal) => {
      if (newVal) createListInstance();
    });

    // Cleanup
    onUnmounted(() => {
      if (instance) {
        instance.destroy();
        instance = null;
      }
    });

    // Computed
    const memorySaved = computed(() => {
      return stats.value.total > 0
        ? Math.round((1 - stats.value.dom / stats.value.total) * 100)
        : 0;
    });

    const visiblePercent = computed(() => {
      return stats.value.total > 0
        ? Math.round((stats.value.dom / stats.value.total) * 100)
        : 0;
    });

    // Navigation
    const handleGoToIndex = () => {
      const clamped = Math.max(
        0,
        Math.min(scrollIndex.value, users.value.length - 1),
      );
      instance?.scrollToIndex(clamped, {
        align: scrollAlign.value,
        behavior: "smooth",
        duration: 400,
      });
    };

    const scrollToFirst = () => {
      instance?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
    };

    const scrollToMiddle = () => {
      instance?.scrollToIndex(Math.floor(users.value.length / 2), {
        align: "center",
        behavior: "smooth",
        duration: 500,
      });
    };

    const scrollToLast = () => {
      instance?.scrollToIndex(users.value.length - 1, {
        align: "end",
        behavior: "smooth",
        duration: 500,
      });
    };

    // Count slider
    const handleCountChange = (e) => {
      const count = parseInt(e.target.value, 10);
      users.value = makeUsers(count);
      nextId.value = count + 1;
      stats.value = { ...stats.value, total: count };
      createListInstance();
    };

    // Overscan slider
    const handleOverscanChange = (e) => {
      overscan.value = parseInt(e.target.value, 10);
    };

    // Data operations
    const handleAppend = () => {
      const newUser = makeUser(nextId.value);
      nextId.value++;
      users.value = [...users.value, newUser];
      instance?.appendItems([newUser]);
      stats.value = { ...stats.value, total: users.value.length };
    };

    const handlePrepend = () => {
      const newUser = makeUser(nextId.value);
      nextId.value++;
      users.value = [newUser, ...users.value];
      instance?.prependItems([newUser]);
      stats.value = { ...stats.value, total: users.value.length };
    };

    const handleAppend100 = () => {
      const batch = makeUsers(100, nextId.value);
      nextId.value += 100;
      users.value = [...users.value, ...batch];
      instance?.appendItems(batch);
      stats.value = { ...stats.value, total: users.value.length };
    };

    const handleRemove = () => {
      if (users.value.length === 0) return;
      users.value = users.value.slice(0, -1);
      instance?.setItems(users.value);
      stats.value = { ...stats.value, total: users.value.length };
    };

    const handleClear = () => {
      users.value = [];
      instance?.setItems([]);
      stats.value = { dom: 0, total: 0 };
    };

    const handleReset = () => {
      users.value = makeUsers(DEFAULT_COUNT);
      nextId.value = DEFAULT_COUNT + 1;
      overscan.value = 3;
      stats.value = { ...stats.value, total: DEFAULT_COUNT };
      createListInstance();
    };

    return {
      containerRef,
      users,
      overscan,
      scrollIndex,
      scrollAlign,
      stats,
      memorySaved,
      visiblePercent,
      ITEM_HEIGHT,
      DEFAULT_COUNT,
      handleGoToIndex,
      scrollToFirst,
      scrollToMiddle,
      scrollToLast,
      handleCountChange,
      handleOverscanChange,
      handleAppend,
      handlePrepend,
      handleAppend100,
      handleRemove,
      handleClear,
      handleReset,
    };
  },

  template: `
    <div class="container">
      <header>
        <h1>Basic List</h1>
        <p class="description">
          Vue implementation — the core of <code>@floor/vlist</code>.
          Use the control panel to explore item count, overscan, scroll-to,
          and data operations in real time.
        </p>
      </header>

      <div class="split-layout">
        <div class="split-main">
          <div ref="containerRef" id="list-container"></div>
        </div>

        <aside class="split-panel">
          <!-- Items -->
          <section class="panel-section">
            <h3 class="panel-title">Items</h3>

            <div class="panel-row">
              <label class="panel-label">Count</label>
              <span class="panel-value">{{ users.length.toLocaleString() }}</span>
            </div>
            <div class="panel-row">
              <input
                type="range"
                class="panel-slider"
                min="100"
                max="100000"
                step="100"
                :value="Math.min(users.length, 100000)"
                @change="handleCountChange"
              />
            </div>

            <div class="panel-row">
              <label class="panel-label">Overscan</label>
              <span class="panel-value">{{ overscan }}</span>
            </div>
            <div class="panel-row">
              <input
                type="range"
                class="panel-slider"
                min="0"
                max="10"
                step="1"
                :value="overscan"
                @change="handleOverscanChange"
              />
            </div>
          </section>

          <!-- Scroll To -->
          <section class="panel-section">
            <h3 class="panel-title">Scroll To</h3>

            <div class="panel-row">
              <div class="panel-input-group">
                <input
                  type="number"
                  class="panel-input"
                  placeholder="Index"
                  min="0"
                  v-model.number="scrollIndex"
                  @keydown.enter.prevent="handleGoToIndex"
                />
                <select class="panel-select" v-model="scrollAlign">
                  <option value="start">start</option>
                  <option value="center">center</option>
                  <option value="end">end</option>
                </select>
                <button class="panel-btn" @click="handleGoToIndex">Go</button>
              </div>
            </div>

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

          <!-- Data Operations -->
          <section class="panel-section">
            <h3 class="panel-title">Data</h3>

            <div class="panel-row">
              <div class="panel-btn-group">
                <button class="panel-btn" title="Prepend 1 item" @click="handlePrepend">
                  <i class="icon icon--add"></i> Prepend
                </button>
                <button class="panel-btn" title="Append 1 item" @click="handleAppend">
                  <i class="icon icon--add"></i> Append
                </button>
                <button class="panel-btn" title="Append 100 items" @click="handleAppend100">
                  <i class="icon icon--add"></i> +100
                </button>
              </div>
            </div>

            <div class="panel-row">
              <div class="panel-btn-group">
                <button class="panel-btn" title="Remove last item" @click="handleRemove">
                  <i class="icon icon--remove"></i> Remove
                </button>
                <button class="panel-btn" title="Clear all items" @click="handleClear">
                  <i class="icon icon--trash"></i> Clear
                </button>
                <button class="panel-btn" title="Reset to 10,000 items" @click="handleReset">
                  <i class="icon icon--shuffle"></i> Reset
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <footer class="example-footer" id="example-footer">
        <div class="example-footer__left">
          <span class="example-footer__stat">
            <strong>{{ visiblePercent }}%</strong>
          </span>
          <span class="example-footer__stat">
            {{ stats.dom }} / <strong>{{ stats.total.toLocaleString() }}</strong>
            <span class="example-footer__unit"> items</span>
          </span>
          <span class="example-footer__stat">
            <strong>{{ memorySaved }}%</strong>
            <span class="example-footer__unit"> saved</span>
          </span>
        </div>
        <div class="example-footer__right">
          <span class="example-footer__stat">
            height <strong>{{ ITEM_HEIGHT }}</strong><span class="example-footer__unit">px</span>
          </span>
          <span class="example-footer__stat">
            overscan <strong>{{ overscan }}</strong>
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
