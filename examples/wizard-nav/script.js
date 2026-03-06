// Wizard — Step-by-step recipe viewer
// Demonstrates scroll.wheel: false, wrap, button-only navigation

import { vlist } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import "./controls.js";

// =============================================================================
// Data — fetched from /api/recipes
// =============================================================================

export let recipes = [];
export let TOTAL = 0;
export const ITEM_HEIGHT = 320;

async function fetchRecipes() {
  try {
    const response = await fetch("/api/recipes");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    recipes = await response.json();
    TOTAL = recipes.length;
  } catch (err) {
    console.error("Failed to fetch recipes:", err);
    recipes = [];
    TOTAL = 0;
  }
}

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let currentOrientation = "vertical"; // "vertical" | "horizontal"
export let currentWrap = true;
export let currentIndex = 0;
export let list = null;

export function setCurrentOrientation(v) {
  currentOrientation = v;
}
export function setCurrentWrap(v) {
  currentWrap = v;
}

// =============================================================================
// Template
// =============================================================================

const itemTemplate = (item) => `
  <div class="recipe-card">
    <div class="recipe-header">
      <span class="recipe-emoji">${item.emoji}</span>
      <div class="recipe-meta">
        <span class="ui-badge ui-badge--pill meta-time">⏱ ${item.time}</span>
        <span class="ui-badge ui-badge--pill meta-difficulty">${item.difficulty}</span>
      </div>
    </div>
    <h2 class="recipe-title">${item.title}</h2>
    <p class="recipe-origin">${item.origin}</p>
    <div class="recipe-section">
      <h3>Ingredients</h3>
      <p>${item.ingredients}</p>
    </div>
    <div class="recipe-tip">
      <span class="tip-icon">💡</span>
      <p>${item.tip}</p>
    </div>
  </div>
`;

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => TOTAL,
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

  // Toggle horizontal class on wizard wrapper
  const wizardEl = document.querySelector(".wizard");
  const isH = currentOrientation === "horizontal";
  wizardEl.classList.toggle("wizard--horizontal", isH);

  // In horizontal mode, item width = container width so one card fills the view
  const containerWidth = isH ? container.clientWidth : undefined;

  const builder = vlist({
    container: "#list-container",
    orientation: currentOrientation,
    scroll: { wheel: false, scrollbar: "none", wrap: currentWrap },
    ariaLabel: "Recipe wizard",
    item: {
      height: ITEM_HEIGHT,
      width: isH ? containerWidth : undefined,
      template: itemTemplate,
    },
    items: recipes,
  });

  list = builder.build();

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  list.on("item:click", ({ index }) => {
    goTo(index);
  });

  updateInfo();
  updateContext();

  // Restore current index (instant — no animation after rebuild)
  goTo(currentIndex, true);
}

// =============================================================================
// Navigation — go to a specific recipe
// =============================================================================

export function goTo(index, instant = false) {
  if (currentWrap) {
    currentIndex = ((index % TOTAL) + TOTAL) % TOTAL;
  } else {
    currentIndex = Math.max(0, Math.min(index, TOTAL - 1));
  }

  list.scrollToIndex(currentIndex, {
    align: "start",
    behavior: instant ? "auto" : "smooth",
    duration: instant ? 0 : 350,
  });

  updateCurrentInfo();
  updateDots();
  updateInfo();
}

// =============================================================================
// Step indicator dots
// =============================================================================

const indicatorEl = document.getElementById("step-indicator");

function updateDots() {
  indicatorEl.innerHTML = recipes
    .map(
      (_, i) =>
        `<span class="dot ${i === currentIndex ? "dot-active" : ""}" data-index="${i}"></span>`,
    )
    .join("");
}

indicatorEl.addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (dot) goTo(Number(dot.dataset.index));
});

// =============================================================================
// Current recipe info (panel)
// =============================================================================

const currentNameEl = document.getElementById("current-name");
const currentDifficultyEl = document.getElementById("current-difficulty");
const currentTimeEl = document.getElementById("current-time");

function updateCurrentInfo() {
  const r = recipes[currentIndex];
  currentNameEl.textContent = `${r.emoji} ${r.title}`;
  currentDifficultyEl.textContent = r.difficulty;
  currentTimeEl.textContent = r.time;
}

// =============================================================================
// Keyboard navigation
// =============================================================================

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    goTo(currentIndex - 1);
  } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    goTo(currentIndex + 1);
  } else if (e.key === "Home") {
    e.preventDefault();
    goTo(0);
  } else if (e.key === "End") {
    e.preventDefault();
    goTo(TOTAL - 1);
  }
});

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

const infoOrientation = document.getElementById("info-orientation");
const infoWrap = document.getElementById("info-wrap");

export function updateContext() {
  infoOrientation.textContent = currentOrientation;
  infoWrap.textContent = currentWrap ? "on" : "off";
}

// =============================================================================
// Initialise
// =============================================================================

(async () => {
  await fetchRecipes();
  createList();
})();
