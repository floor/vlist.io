import { createApp, ref, computed } from "vue";
import { useVList, useVListEvent } from "vlist/vue";

// ── Data ────────────────────────────────────────────────────────

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#feca57",
  "#a8edea",
];

const ROLES = ["Admin", "Editor", "Viewer", "Guest"];

const users = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  initial: String.fromCharCode(65 + (i % 26)),
  role: ROLES[i % ROLES.length],
  color: COLORS[i % COLORS.length],
}));

// ── Template ────────────────────────────────────────────────────
// HTML string — not a Vue component. vlist renders items directly
// to the DOM, bypassing Vue's reactivity so scrolling stays fast.

const template = (user, i) => `
  <div class="item-content">
    <div class="item-avatar" style="background:${user.color}">${user.initial}</div>
    <div class="item-details">
      <div class="item-name">${user.name}</div>
      <div class="item-email">${user.email}</div>
    </div>
    <span class="item-role item-role--${user.role.toLowerCase()}">${user.role}</span>
    <span class="item-index">#${i + 1}</span>
  </div>
`;

// ── Navigation Panel ────────────────────────────────────────────

const NavigationPanel = {
  props: ["total"],
  emits: ["scrollTo"],

  setup(props, { emit }) {
    const index = ref(0);
    const align = ref("start");

    const go = () => emit("scrollTo", index.value, align.value);

    const jumpRandom = () => {
      index.value = Math.floor(Math.random() * props.total);
      emit("scrollTo", index.value, "center");
    };

    return { index, align, go, jumpRandom };
  },

  template: `
    <section class="panel-section">
      <h3 class="panel-title">Navigation</h3>

      <div class="panel-row">
        <label class="panel-label">Scroll to index</label>
        <div class="panel-input-group">
          <input
            type="number"
            :min="0"
            :max="total - 1"
            v-model.number="index"
            @keydown.enter="go"
            class="panel-input"
          />
          <select v-model="align" class="panel-select">
            <option value="start">start</option>
            <option value="center">center</option>
            <option value="end">end</option>
          </select>
          <button @click="go" class="panel-btn panel-btn--icon" title="Go">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="panel-row">
        <label class="panel-label">Quick jump</label>
        <div class="panel-btn-group">
          <button class="panel-btn" @click="$emit('scrollTo', 0, 'start')">First</button>
          <button class="panel-btn" @click="$emit('scrollTo', Math.floor(total / 2), 'center')">Middle</button>
          <button class="panel-btn" @click="$emit('scrollTo', total - 1, 'end')">Last</button>
          <button class="panel-btn" @click="jumpRandom">Random</button>
        </div>
      </div>

      <div class="panel-row">
        <label class="panel-label">Smooth scroll</label>
        <div class="panel-btn-group">
          <button class="panel-btn" @click="$emit('scrollTo', 0, { align: 'start', behavior: 'smooth', duration: 600 })">↑ Top</button>
          <button class="panel-btn" @click="$emit('scrollTo', total - 1, { align: 'end', behavior: 'smooth', duration: 600 })">↓ Bottom</button>
        </div>
      </div>
    </section>
  `,
};

// ── Selection Panel ─────────────────────────────────────────────

const SelectionPanel = {
  props: ["count"],
  emits: ["selectAll", "clear"],

  setup(props) {
    const label = computed(() =>
      props.count === 0
        ? "0 items"
        : props.count === 1
          ? "1 item"
          : `${props.count.toLocaleString()} items`,
    );
    return { label };
  },

  template: `
    <section class="panel-section">
      <h3 class="panel-title">Selection</h3>
      <div class="panel-row">
        <label class="panel-label">Actions</label>
        <div class="panel-btn-group">
          <button class="panel-btn" @click="$emit('selectAll')">Select all</button>
          <button class="panel-btn" @click="$emit('clear')">Clear</button>
        </div>
      </div>
      <div class="panel-row">
        <span class="panel-label">Selected</span>
        <span class="panel-value">{{ label }}</span>
      </div>
    </section>
  `,
};

// ── Item Detail Panel ───────────────────────────────────────────

const ItemDetail = {
  props: ["item"],

  template: `
    <section class="panel-section">
      <h3 class="panel-title">Last clicked</h3>
      <div class="panel-detail">
        <span v-if="!item" class="panel-detail__empty">Click an item to see details</span>
        <template v-else>
          <div class="panel-detail__header">
            <span class="panel-detail__avatar" :style="{ background: item.color }">{{ item.initial }}</span>
            <div>
              <div class="panel-detail__name">{{ item.name }}</div>
              <div class="panel-detail__email">{{ item.email }}</div>
            </div>
          </div>
          <div class="panel-detail__meta">
            <span>id: {{ item.id }}</span>
            <span>role: {{ item.role }}</span>
          </div>
        </template>
      </div>
    </section>
  `,
};

// ── App ─────────────────────────────────────────────────────────

const App = {
  components: { NavigationPanel, SelectionPanel, ItemDetail },

  setup() {
    const selectedCount = ref(0);
    const clickedItem = ref(null);
    const scrollTop = ref(0);
    const direction = ref(null);
    const range = ref(null);

    const { containerRef, instance } = useVList({
      items: users,
      item: { height: 64, template },
      selection: { mode: "multiple" },
      ariaLabel: "User list",
    });

    // Derive visible count from the render range — no DOM query.
    useVListEvent(instance, "range:change", ({ range: r }) => {
      range.value = r;
    });

    useVListEvent(instance, "scroll", (e) => {
      scrollTop.value = e.scrollTop;
      direction.value = e.direction;
    });

    useVListEvent(instance, "selection:change", ({ selected }) => {
      selectedCount.value = selected.length;
    });

    useVListEvent(instance, "item:click", ({ item }) => {
      clickedItem.value = item;
    });

    const visibleCount = computed(() =>
      range.value ? range.value.end - range.value.start + 1 : 0,
    );

    const handleScrollTo = (index, alignOrOpts) => {
      instance.value?.scrollToIndex(index, alignOrOpts);
    };

    return {
      containerRef,
      instance,
      selectedCount,
      clickedItem,
      scrollTop,
      direction,
      range,
      visibleCount,
      total: users.length,
      handleScrollTo,
    };
  },

  template: `
    <div class="container container--wide">
      <header>
        <h1>Vue · Controls</h1>
        <p class="description">
          <code>useVList</code> with selection, navigation, and scroll tracking.
          Every panel is driven by Vue reactivity via <code>useVListEvent</code> —
          vlist emits events, Vue refs update the UI around it.
        </p>
      </header>

      <div class="stats">
        <strong>{{ total.toLocaleString() }}</strong> items
        ·
        <strong>{{ visibleCount }}</strong> in DOM
        ·
        <strong>{{ Math.round(scrollTop) }}px</strong> scroll
        ·
        {{ direction === 'up' ? '↑' : direction === 'down' ? '↓' : '–' }}
        <template v-if="range">
          · rows {{ range.start }}–{{ range.end }}
        </template>
      </div>

      <div class="split-layout">
        <div class="split-main">
          <div ref="containerRef" id="list-container" />
        </div>

        <aside class="split-panel">
          <NavigationPanel :total="total" @scroll-to="handleScrollTo" />
          <SelectionPanel
            :count="selectedCount"
            @select-all="instance?.selectAll()"
            @clear="instance?.clearSelection()"
          />
          <ItemDetail :item="clickedItem" />
        </aside>
      </div>

      <footer>
        <p>
          vlist fires events, Vue owns the state. The two never fight over the
          DOM — that's what makes it fast. 💚
        </p>
      </footer>
    </div>
  `,
};

// ── Mount ───────────────────────────────────────────────────────

createApp(App).mount("#vue-root");
