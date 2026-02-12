import { createApp, ref } from "vue";
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

const users = Array.from({ length: 10_000 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  initial: String.fromCharCode(65 + (i % 26)),
  color: COLORS[i % COLORS.length],
}));

// ── App ─────────────────────────────────────────────────────────

const App = {
  setup() {
    const visibleCount = ref(0);

    // One composable, one ref. vlist owns the DOM inside the
    // container — it renders, recycles, and positions items
    // directly for speed.
    const { containerRef, instance } = useVList({
      items: users,
      item: {
        height: 56,
        // HTML string template (not a Vue component) — vlist
        // bypasses Vue's reactivity so scrolling stays fast.
        template: (user, i) => `
          <div class="item">
            <div class="item__avatar" style="background:${user.color}">${user.initial}</div>
            <div class="item__text">
              <div class="item__name">${user.name}</div>
              <div class="item__email">${user.email}</div>
            </div>
            <span class="item__index">#${i + 1}</span>
          </div>
        `,
      },
    });

    // Derive visible count from the render range — no DOM query.
    useVListEvent(instance, "range:change", ({ range }) => {
      visibleCount.value = range.end - range.start + 1;
    });

    return { containerRef, visibleCount, total: users.length };
  },

  template: `
    <div class="container">
      <header>
        <h1>Vue · Basic</h1>
        <p class="description">
          Minimal <code>useVList</code> example — 10 000 items, one composable,
          zero boilerplate. Items render as HTML strings so vlist can bypass
          Vue's reactivity entirely.
        </p>
      </header>

      <p class="stats">
        <strong>{{ total.toLocaleString() }}</strong> items
        ·
        <strong>{{ visibleCount }}</strong> in DOM
      </p>

      <!-- Attach the ref — vlist takes over from here -->
      <div ref="containerRef" id="list-container" />

      <footer>
        <p>
          <code>useVList</code> returns a <code>containerRef</code> and a
          reactive <code>instance</code> ref. Bind the ref in your template,
          pass your config — done. 💚
        </p>
      </footer>
    </div>
  `,
};

// ── Mount ───────────────────────────────────────────────────────

createApp(App).mount("#vue-root");
