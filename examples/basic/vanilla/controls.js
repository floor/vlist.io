// Basic List — Panel controls
// Wires sliders, scroll-to, and data operation buttons.
// Imports state and functions from script.js — keeps the main script focused on vlist.

import { makeUser, makeUsers, DEFAULT_COUNT } from "../shared.js";
import * as app from "./script.js";

// =============================================================================
// DOM References
// =============================================================================

const countSlider = document.getElementById("count-slider");
const countValue = document.getElementById("count-value");
const overscanSlider = document.getElementById("overscan-slider");
const overscanValue = document.getElementById("overscan-value");
const scrollIndexInput = document.getElementById("scroll-index");
const scrollAlignSelect = document.getElementById("scroll-align");
const scrollGoBtn = document.getElementById("scroll-go");

// =============================================================================
// Item Count Slider
// =============================================================================

countSlider.addEventListener("input", () => {
  const count = parseInt(countSlider.value, 10);
  countValue.textContent = count.toLocaleString();
});

countSlider.addEventListener("change", () => {
  const count = parseInt(countSlider.value, 10);
  app.setUsers(makeUsers(count));
  app.setNextId(count + 1);
  app.createList();
});

// =============================================================================
// Overscan Slider
// =============================================================================

overscanSlider.addEventListener("input", () => {
  overscanValue.textContent = overscanSlider.value;
});

overscanSlider.addEventListener("change", () => {
  app.setCurrentOverscan(parseInt(overscanSlider.value, 10));
  app.createList();
  app.updateContext();
});

// =============================================================================
// Scroll To
// =============================================================================

const doScrollTo = () => {
  if (!app.list) return;
  const index = parseInt(scrollIndexInput.value, 10);
  const align = scrollAlignSelect.value;
  if (isNaN(index) || index < 0) return;
  app.list.scrollToIndex(Math.min(index, app.users.length - 1), {
    align,
    behavior: "smooth",
    duration: 400,
  });
};

scrollGoBtn.addEventListener("click", doScrollTo);
scrollIndexInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doScrollTo();
});

document.getElementById("btn-first").addEventListener("click", () => {
  app.list?.scrollToIndex(0, { behavior: "smooth", duration: 300 });
});

document.getElementById("btn-middle").addEventListener("click", () => {
  app.list?.scrollToIndex(Math.floor(app.users.length / 2), {
    align: "center",
    behavior: "smooth",
    duration: 500,
  });
});

document.getElementById("btn-last").addEventListener("click", () => {
  app.list?.scrollToIndex(app.users.length - 1, {
    align: "end",
    behavior: "smooth",
    duration: 500,
  });
});

// =============================================================================
// Data Operations
// =============================================================================

function syncCountSlider() {
  const clamped = Math.min(app.users.length, parseInt(countSlider.max, 10));
  countSlider.value = clamped;
  countValue.textContent = app.users.length.toLocaleString();
}

document.getElementById("btn-append").addEventListener("click", () => {
  const newUser = makeUser(app.nextId);
  app.setNextId(app.nextId + 1);
  app.setUsers([...app.users, newUser]);
  app.list.appendItems([newUser]);
  syncCountSlider();
  app.stats.update();
});

document.getElementById("btn-prepend").addEventListener("click", () => {
  const newUser = makeUser(app.nextId);
  app.setNextId(app.nextId + 1);
  app.setUsers([newUser, ...app.users]);
  app.list.prependItems([newUser]);
  syncCountSlider();
  app.stats.update();
});

document.getElementById("btn-remove").addEventListener("click", () => {
  if (app.users.length === 0) return;
  app.setUsers(app.users.slice(0, -1));
  app.list.setItems(app.users);
  syncCountSlider();
  app.stats.update();
});

document.getElementById("btn-append-100").addEventListener("click", () => {
  const batch = makeUsers(100, app.nextId);
  app.setNextId(app.nextId + 100);
  app.setUsers([...app.users, ...batch]);
  app.list.appendItems(batch);
  syncCountSlider();
  app.stats.update();
});

document.getElementById("btn-clear").addEventListener("click", () => {
  app.setUsers([]);
  app.list.setItems(app.users);
  syncCountSlider();
  app.stats.update();
});

document.getElementById("btn-reset").addEventListener("click", () => {
  app.setUsers(makeUsers(DEFAULT_COUNT));
  app.setNextId(DEFAULT_COUNT + 1);
  countSlider.value = DEFAULT_COUNT;
  countValue.textContent = DEFAULT_COUNT.toLocaleString();
  app.createList();
});
