// Sortable — Drag-and-drop reordering
// Demonstrates withSortable plugin with configurable drag handles

import { vlist, withSortable, withSelection } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_HEIGHT = 56;

// =============================================================================
// Data — Task list
// =============================================================================

const PRIORITIES = ["low", "medium", "high", "urgent"];
const PRIORITY_COLORS = {
  low: "#94a3b8",
  medium: "#f59e0b",
  high: "#f97316",
  urgent: "#ef4444",
};
const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const TASK_NAMES = [
  "Review pull request #42",
  "Update API documentation",
  "Fix login page redirect",
  "Design new onboarding flow",
  "Refactor auth middleware",
  "Add unit tests for parser",
  "Deploy staging environment",
  "Update dependency versions",
  "Create migration script",
  "Set up monitoring alerts",
  "Implement rate limiting",
  "Fix mobile layout issues",
  "Add search functionality",
  "Optimize database queries",
  "Write integration tests",
  "Update error handling",
  "Configure CI pipeline",
  "Review security audit",
  "Implement caching layer",
  "Add analytics tracking",
  "Fix timezone handling",
  "Create admin dashboard",
  "Update email templates",
  "Add export to CSV",
  "Implement webhooks",
  "Fix pagination bug",
  "Add dark mode support",
  "Optimize image loading",
  "Create backup strategy",
  "Set up load balancer",
];

const ASSIGNEES = [
  "Alice Chen",
  "Bob Park",
  "Carol Liu",
  "Dan Kim",
  "Eva Jones",
  "Frank Lee",
];

function makeTasks(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: TASK_NAMES[i % TASK_NAMES.length],
    priority: PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)],
    assignee: ASSIGNEES[Math.floor(Math.random() * ASSIGNEES.length)],
    done: Math.random() < 0.15,
  }));
}

let tasks = makeTasks(90);

// =============================================================================
// State — exported for controls
// =============================================================================

export let list = null;
export let useHandle = false;
export let moveCount = 0;

export function setUseHandle(v) {
  useHandle = v;
}

// =============================================================================
// Template
// =============================================================================

const itemTemplate = (item) => {
  const pc = PRIORITY_COLORS[item.priority];
  const pl = PRIORITY_LABELS[item.priority];
  const doneClass = item.done ? " task--done" : "";
  const initials = item.assignee
    .split(" ")
    .map((w) => w[0])
    .join("");

  return `
    <div class="task${doneClass}">
      <span class="task__handle" aria-label="Drag to reorder">⠿</span>
      <span class="task__check">${item.done ? "✓" : ""}</span>
      <div class="task__info">
        <span class="task__name">${item.name}</span>
        <span class="task__meta">
          <span class="task__priority" style="color:${pc}" title="${pl}">${pl}</span>
          <span class="task__sep">·</span>
          <span class="task__assignee">${initials}</span>
        </span>
      </div>
      <span class="task__id">#${item.id}</span>
    </div>
  `;
};

// =============================================================================
// Stats
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => tasks.length,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create / Recreate list
// =============================================================================

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Task list",
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items: tasks,
  });

  const sortableConfig = {};
  if (useHandle) sortableConfig.handle = ".task__handle";
  builder.use(withSortable(sortableConfig));

  builder.use(withSelection({ mode: "single" }));

  list = builder.build();

  // Wire events
  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  // Track sort method and original grab position
  let sortMethod = "drag";
  let grabIndex = -1;

  list.on("sort:start", ({ index }) => {
    // Pointer drags create a ghost; keyboard grabs don't.
    // If no ghost exists on next microtask, it's keyboard.
    sortMethod = "drag";
    grabIndex = index;
    queueMicrotask(() => {
      if (!document.querySelector(".vlist-sort-ghost")) sortMethod = "keyboard";
      setSortState(sortMethod === "drag" ? "Dragging…" : "Grabbed", true);
    });

    setControlsDisabled(true);

    // In free mode, hide the handle in the ghost
    if (!useHandle) {
      const ghost = document.querySelector(".vlist-sort-ghost");
      if (ghost) ghost.classList.add("vlist-sort-ghost--free");
    }
  });

  list.on("sort:end", ({ fromIndex, toIndex }) => {
    // Reorder the data array
    const reordered = [...tasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    tasks = reordered;
    list.setItems(tasks);

    moveCount++;
    updateMoveCount();
    // For keyboard, show cumulative journey from original grab position
    const displayFrom = sortMethod === "keyboard" ? grabIndex : fromIndex;
    showLastMove({
      name: moved.name,
      from: displayFrom,
      to: toIndex,
      total: tasks.length,
      method: sortMethod,
    });

    // Re-enable controls after sort completes.
    // Check on next microtask — cleanup runs right after the event.
    queueMicrotask(() => {
      if (!list.isSorting()) {
        setSortState("Idle", false);
        setControlsDisabled(false);
      }
    });
  });

  list.on("sort:cancel", ({ originalItems }) => {
    tasks = originalItems;
    list.setItems(tasks);
    setSortState("Idle", false);
    setControlsDisabled(false);
  });

  // Keyboard drop doesn't emit a dedicated event. The sortable feature
  // blocks keydown via stopImmediatePropagation, so we listen on keyup
  // instead — it fires after the drop has been processed.
  container.addEventListener("keyup", (e) => {
    if (e.key === " " || e.key === "Enter" || e.key === "Escape") {
      queueMicrotask(() => {
        if (!list.isSorting()) {
          setSortState("Idle", false);
          setControlsDisabled(false);
        }
      });
    }
  });

  updateInfo();
  updateContext();
}

// =============================================================================
// UI updates
// =============================================================================

const stateEl = document.getElementById("sort-state");
const moveEl = document.getElementById("sort-move");
const moveCountEl = document.getElementById("info-moves");

function setSortState(label, active) {
  if (!stateEl) return;
  stateEl.innerHTML =
    `<span class="sort-status__dot sort-status__dot--${active ? "active" : "idle"}"></span>${label}`;
}

function showLastMove({ name, from, to, total, method }) {
  if (!moveEl) return;
  const delta = to - from;
  const absDelta = Math.abs(delta);
  const arrow = delta < 0 ? "↑" : "↓";
  const deltaClass = delta < 0 ? "up" : "down";
  const plural = absDelta === 1 ? "position" : "positions";

  moveEl.className = "sort-status__move sort-status__move--visible";
  moveEl.innerHTML =
    `<span class="sort-status__name">${name}</span>` +
    `<span class="sort-status__detail">` +
      `<span class="sort-status__positions">#${from + 1} → #${to + 1} <span class="sort-status__method">of ${total}</span></span>` +
      `<span class="sort-status__delta sort-status__delta--${deltaClass}">${arrow} ${absDelta} ${plural}</span>` +
      `<span class="sort-status__method">${method}</span>` +
    `</span>`;
}

function updateMoveCount() {
  if (moveCountEl) moveCountEl.textContent = moveCount;
}

// Disable/enable controls during sort
function setControlsDisabled(disabled) {
  const btns = document.querySelectorAll(
    ".split-panel .ui-btn, .split-panel .ui-segmented__btn",
  );
  for (const btn of btns) {
    if (disabled) btn.setAttribute("disabled", "");
    else btn.removeAttribute("disabled");
  }
}

// Footer context
const infoHandle = document.getElementById("info-handle");

export function updateContext() {
  if (infoHandle) infoHandle.textContent = useHandle ? "handle" : "free";
  const container = document.getElementById("list-container");
  if (container) {
    container.setAttribute("data-grip", useHandle ? "handle" : "free");
  }
}

// =============================================================================
// Controls
// =============================================================================

// Handle mode toggle
const handleMode = document.getElementById("handle-mode");
if (handleMode) {
  handleMode.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-handle]");
    if (!btn) return;
    const mode = btn.dataset.handle === "true";
    if (mode === useHandle) return;
    useHandle = mode;
    handleMode.querySelectorAll("button").forEach((b) => {
      b.classList.toggle(
        "ui-segmented__btn--active",
        (b.dataset.handle === "true") === mode,
      );
    });
    createList();
  });
}

// Add task
const addBtn = document.getElementById("btn-add");
if (addBtn) {
  addBtn.addEventListener("click", () => {
    const newTask = makeTasks(1)[0];
    newTask.id = tasks.length + 1;
    newTask.name = TASK_NAMES[tasks.length % TASK_NAMES.length];
    tasks = [newTask, ...tasks];
    list.setItems(tasks);
    updateInfo();
  });
}

// Shuffle
const shuffleBtn = document.getElementById("btn-shuffle");
if (shuffleBtn) {
  shuffleBtn.addEventListener("click", () => {
    tasks = [...tasks].sort(() => Math.random() - 0.5);
    list.setItems(tasks);
  });
}

// Reset
const resetBtn = document.getElementById("btn-reset");
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    tasks = makeTasks(60);
    moveCount = 0;
    updateMoveCount();
    setSortState("Idle", false);
    if (moveEl) {
      moveEl.className = "sort-status__move";
      moveEl.innerHTML = "";
    }
    list.setItems(tasks);
    updateInfo();
  });
}

// =============================================================================
// Initialise
// =============================================================================

createList();
