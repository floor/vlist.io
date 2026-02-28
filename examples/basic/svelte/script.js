// Basic List — Svelte implementation with vlist action
// Interactive control panel demonstrating core vlist API: item count, overscan,
// scrollToIndex, and data operations (append, prepend, remove).

import { vlist } from "vlist-svelte";
import {
  DEFAULT_COUNT,
  ITEM_HEIGHT,
  makeUser,
  makeUsers,
  itemTemplate,
} from "../shared.js";

// =============================================================================
// DOM References
// =============================================================================

const container = document.getElementById("list-container");

// Sliders
const countSlider = document.getElementById("count-slider");
const countValue = document.getElementById("count-value");
const overscanSlider = document.getElementById("overscan-slider");
const overscanValue = document.getElementById("overscan-value");

// Scroll To
const scrollIndexInput = document.getElementById("scroll-index");
const scrollAlignSelect = document.getElementById("scroll-align");
const scrollGoBtn = document.getElementById("scroll-go");
const btnFirst = document.getElementById("btn-first");
const btnMiddle = document.getElementById("btn-middle");
const btnLast = document.getElementById("btn-last");

// Data Operations
const btnPrepend = document.getElementById("btn-prepend");
const btnAppend = document.getElementById("btn-append");
const btnAppend100 = document.getElementById("btn-append-100");
const btnRemove = document.getElementById("btn-remove");
const btnClear = document.getElementById("btn-clear");
const btnReset = document.getElementById("btn-reset");

// Footer
const ftProgress = document.getElementById("ft-progress");
const ftDom = document.getElementById("ft-dom");
const ftTotal = document.getElementById("ft-total");
const ftHeight = document.getElementById("ft-height");
const ftOverscan = document.getElementById("ft-overscan");

// =============================================================================
// State
// =============================================================================

let users = makeUsers(DEFAULT_COUNT);
let nextId = DEFAULT_COUNT + 1;
let currentOverscan = 3;
let action = null;
let listInstance = null;
let selectedIndex = -1;

// =============================================================================
// Create / Recreate list
// =============================================================================

function createList() {
  // Destroy previous action
  if (action && action.destroy) {
    action.destroy();
    action = null;
    listInstance = null;
  }

  // Clear container
  container.innerHTML = "";

  // Create vlist action
  action = vlist(container, {
    config: {
      ariaLabel: "User list",
      overscan: currentOverscan,
      items: users,
      item: {
        height: ITEM_HEIGHT,
        template: itemTemplate,
      },
      selection: { mode: 'single' },
    },
    onInstance: (inst) => {
      listInstance = inst;
      selectedIndex = -1;
      bindListEvents();
      updateFooter();
    },
  });
}

// =============================================================================
// Event bindings
// =============================================================================

function bindListEvents() {
  if (!listInstance) return;

  listInstance.on('selection:change', ({ selected }) => {
    selectedIndex = selected.length > 0 ? selected[0] : -1;
  });

  listInstance.on("range:change", () => {
    updateFooter();
  });

  listInstance.on("scroll", () => {
    updateFooter();
  });
}

// =============================================================================
// Footer
// =============================================================================

function updateFooter() {
  const domNodes = container.querySelectorAll(".vlist-item").length;
  const total = users.length;
  const progress = total > 0 ? Math.round((domNodes / total) * 100) : 0;

  ftProgress.textContent = `${progress}%`;
  ftDom.textContent = domNodes;
  ftTotal.textContent = total.toLocaleString();
  ftHeight.textContent = ITEM_HEIGHT;
  ftOverscan.textContent = currentOverscan;
}

// =============================================================================
// Item Count Slider
// =============================================================================

countSlider.addEventListener("input", () => {
  const count = parseInt(countSlider.value, 10);
  countValue.textContent = count.toLocaleString();
});

countSlider.addEventListener("change", () => {
  const count = parseInt(countSlider.value, 10);
  users = makeUsers(count);
  nextId = count + 1;
  createList();
});

// =============================================================================
// Overscan Slider
// =============================================================================

overscanSlider.addEventListener("input", () => {
  overscanValue.textContent = overscanSlider.value;
});

overscanSlider.addEventListener("change", () => {
  currentOverscan = parseInt(overscanSlider.value, 10);
  createList();
});

// =============================================================================
// Scroll To
// =============================================================================

const doScrollTo = () => {
  if (!listInstance) return;
  const index = parseInt(scrollIndexInput.value, 10);
  const align = scrollAlignSelect.value;
  if (isNaN(index) || index < 0) return;
  listInstance.scrollToIndex(Math.min(index, users.length - 1), {
    align,
    behavior: "smooth",
    duration: 400,
  });
};

scrollGoBtn.addEventListener("click", doScrollTo);
scrollIndexInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doScrollTo();
});

btnFirst.addEventListener("click", () => {
  listInstance?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
});

btnMiddle.addEventListener("click", () => {
  listInstance?.scrollToIndex(Math.floor(users.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

btnLast.addEventListener("click", () => {
  listInstance?.scrollToIndex(users.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 500,
  });
});

// =============================================================================
// Data Operations
// =============================================================================

function syncCountSlider() {
  const clamped = Math.min(users.length, parseInt(countSlider.max, 10));
  countSlider.value = clamped;
  countValue.textContent = users.length.toLocaleString();
}

btnAppend.addEventListener("click", () => {
  const newUser = makeUser(nextId);
  nextId++;
  users = [...users, newUser];
  listInstance?.appendItems([newUser]);
  syncCountSlider();
  updateFooter();
});

btnPrepend.addEventListener("click", () => {
  const newUser = makeUser(nextId);
  nextId++;
  users = [newUser, ...users];
  listInstance?.prependItems([newUser]);
  syncCountSlider();
  updateFooter();
});

btnAppend100.addEventListener("click", () => {
  const batch = makeUsers(100, nextId);
  nextId += 100;
  users = [...users, ...batch];
  listInstance?.appendItems(batch);
  syncCountSlider();
  updateFooter();
});

btnRemove.addEventListener("click", () => {
  if (users.length === 0) return;
  const idx = selectedIndex >= 0 && selectedIndex < users.length
    ? selectedIndex
    : users.length - 1;
  users = users.filter((_, i) => i !== idx);
  listInstance?.clearSelection();
  selectedIndex = -1;
  listInstance?.setItems(users);
  syncCountSlider();
  updateFooter();
});

btnClear.addEventListener("click", () => {
  users = [];
  listInstance?.setItems(users);
  syncCountSlider();
  updateFooter();
});

btnReset.addEventListener("click", () => {
  users = makeUsers(DEFAULT_COUNT);
  nextId = DEFAULT_COUNT + 1;
  currentOverscan = 3;
  countSlider.value = DEFAULT_COUNT;
  countValue.textContent = DEFAULT_COUNT.toLocaleString();
  overscanSlider.value = 3;
  overscanValue.textContent = "3";
  createList();
});

// =============================================================================
// Initialise
// =============================================================================

createList();
