// Svelte Basic — Minimal vlist action example
//
// The vlist Svelte adapter is a plain action function:
//
//   <div use:vlist={options} style="height: 500px" />
//
// Under the hood, Svelte calls vlist(node, options) on mount
// and action.destroy() on unmount. This example calls the
// action directly — no Svelte runtime needed.

import { vlist, onVListEvent } from "vlist/svelte";

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

// ── DOM ─────────────────────────────────────────────────────────

const statsEl = document.getElementById("visible-count");

// ── Action ──────────────────────────────────────────────────────
// In a .svelte file this would be:
//
//   <div use:vlist={options} style="height: 500px" />
//
// Here we call the action function directly — same result.

const container = document.getElementById("list-container");

const action = vlist(container, {
  config: {
    items: users,
    item: {
      height: 56,
      // HTML string template — vlist renders items directly
      // to the DOM, bypassing Svelte's compiler output.
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
  },
  onInstance: (instance) => {
    // Derive visible count from the render range — no DOM query.
    onVListEvent(instance, "range:change", ({ range }) => {
      statsEl.textContent = String(range.end - range.start + 1);
    });
  },
});
