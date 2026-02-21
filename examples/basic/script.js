import { vlist } from "vlist";

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

// ── List ────────────────────────────────────────────────────────

const list = vlist({
  container: "#list-container",
  ariaLabel: "User list",
  items: users,
  item: {
    height: 56,
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
}).build();

// ── Stats ───────────────────────────────────────────────────────

const countEl = document.getElementById("visible-count");

list.on("range:change", ({ range }) => {
  countEl.textContent = range.end - range.start + 1;
});
