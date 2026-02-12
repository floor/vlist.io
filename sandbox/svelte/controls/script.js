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
// HTML string — not a Svelte component. vlist renders items
// directly to the DOM, bypassing Svelte's compiler output.

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

// ── DOM refs ────────────────────────────────────────────────────

const visibleCountEl = document.getElementById("visible-count");
const scrollIndexInput = document.getElementById("scroll-index");
const scrollAlignSelect = document.getElementById("scroll-align");
const selectionCountEl = document.getElementById("selection-count");
const detailEl = document.getElementById("item-detail");

// ── Action ──────────────────────────────────────────────────────
// In a .svelte file:
//
//   <div use:vlist={options} style="height: 600px" />
//
// Here we call the action function directly — same result.

let instance = null;

const container = document.getElementById("list-container");

const action = vlist(container, {
  config: {
    items: users,
    item: { height: 64, template },
    selection: { mode: "multiple" },
    ariaLabel: "User list",
  },
  onInstance: (inst) => {
    instance = inst;
    bindEvents(inst);
  },
});

// ── Events ──────────────────────────────────────────────────────
// In a .svelte file you'd wire these in onInstance and clean up
// with onDestroy. onVListEvent returns an unsubscribe function.

function bindEvents(inst) {
  onVListEvent(inst, "range:change", ({ range }) => {
    updateStats(range.end - range.start + 1);
    updateRange(range);
  });

  onVListEvent(inst, "scroll", ({ scrollTop, direction }) => {
    updateScroll(scrollTop, direction);
  });

  onVListEvent(inst, "selection:change", ({ selected }) => {
    selectionCountEl.textContent =
      selected.length === 0
        ? "0 items"
        : selected.length === 1
          ? "1 item"
          : `${selected.length.toLocaleString()} items`;
  });

  onVListEvent(inst, "item:click", ({ item }) => {
    showDetail(item);
  });
}

// ── Stats ───────────────────────────────────────────────────────

const scrollPosEl = document.getElementById("scroll-position");
const scrollDirEl = document.getElementById("scroll-direction");
const rangeEl = document.getElementById("visible-range");

function updateScroll(scrollTop, direction) {
  scrollPosEl.textContent = Math.round(scrollTop);
  scrollDirEl.textContent = direction === "up" ? "↑" : "↓";
}

function updateRange(range) {
  visibleCountEl.textContent = range.end - range.start + 1;
  rangeEl.textContent = `${range.start}–${range.end}`;
}

// ── Detail panel ────────────────────────────────────────────────

function showDetail(item) {
  detailEl.innerHTML = `
    <div class="panel-detail__header">
      <span class="panel-detail__avatar" style="background:${item.color}">${item.initial}</span>
      <div>
        <div class="panel-detail__name">${item.name}</div>
        <div class="panel-detail__email">${item.email}</div>
      </div>
    </div>
    <div class="panel-detail__meta">
      <span>id: ${item.id}</span>
      <span>role: ${item.role}</span>
    </div>
  `;
}

// ── Navigation controls ─────────────────────────────────────────

document.getElementById("btn-go").addEventListener("click", () => {
  const idx = parseInt(scrollIndexInput.value, 10);
  if (Number.isNaN(idx)) return;
  const align = scrollAlignSelect.value;
  instance?.scrollToIndex(Math.max(0, Math.min(idx, users.length - 1)), align);
});

scrollIndexInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    document.getElementById("btn-go").click();
  }
});

document.getElementById("btn-first").addEventListener("click", () => {
  instance?.scrollToIndex(0, "start");
});

document.getElementById("btn-middle").addEventListener("click", () => {
  instance?.scrollToIndex(Math.floor(users.length / 2), "center");
});

document.getElementById("btn-last").addEventListener("click", () => {
  instance?.scrollToIndex(users.length - 1, "end");
});

document.getElementById("btn-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * users.length);
  scrollIndexInput.value = idx;
  instance?.scrollToIndex(idx, "center");
});

document.getElementById("btn-smooth-top").addEventListener("click", () => {
  instance?.scrollToIndex(0, {
    align: "start",
    behavior: "smooth",
    duration: 600,
  });
});

document.getElementById("btn-smooth-bottom").addEventListener("click", () => {
  instance?.scrollToIndex(users.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 600,
  });
});

// ── Selection controls ──────────────────────────────────────────

document.getElementById("btn-select-all").addEventListener("click", () => {
  instance?.selectAll();
});

document.getElementById("btn-clear").addEventListener("click", () => {
  instance?.clearSelection();
});
