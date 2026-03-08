// Variable Sizes — Social feed with Mode A / Mode B size handling
// Demonstrates both approaches to variable-height items:
//   A · Pre-measure all items via hidden DOM element (size function)
//   B · Auto-size via estimatedHeight + ResizeObserver
// Uses split-layout pattern with side panel, mode toggle, and info bar stats.

import { vlist } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import { initModeToggle } from "./controls.js";
import { getAllPosts } from "../../src/api/posts.js";

// =============================================================================
// Constants
// =============================================================================

const TOTAL_POSTS = 5000;
const ESTIMATED_POST_HEIGHT = 200;

// =============================================================================
// Data — generated from API module (deterministic, same every time)
// =============================================================================

export const items = getAllPosts(TOTAL_POSTS);
export let list = null;
export let currentMode = "b"; // "a" | "b"

export function setCurrentMode(v) {
  currentMode = v;
}

// =============================================================================
// Templates
// =============================================================================

const renderPostHTML = (item) => `
  <article class="post-card">
    <div class="post-card__header">
      <img class="post-card__avatar" src="${item.avatarUrl}" alt="${item.user}" loading="lazy" />
      <div class="post-card__meta">
        <span class="post-card__user">${item.user}</span>
        <span class="post-card__time">${item.time}</span>
      </div>
    </div>
    <div class="post-card__title">${item.title}</div>
    <div class="post-card__body">${item.body}</div>
    <div class="post-card__actions">
      <span class="post-card__action"><span class="post-card__action-icon">❤️</span> ${item.likes}</span>
      <span class="post-card__action"><span class="post-card__action-icon">💬</span> ${item.comments}</span>
      <span class="post-card__action"><span class="post-card__action-icon">🔄</span> ${item.shares}</span>
    </div>
  </article>
`;

const renderItem = (item) => renderPostHTML(item);

// =============================================================================
// Mode A — Pre-measure all items via hidden DOM element
// =============================================================================

/**
 * Measure the actual rendered height of every item by inserting its HTML
 * into a hidden element that matches the list's inner width.
 *
 * We cache by body text so items with identical content share a single
 * measurement. For 5 000 items with ~12 unique body texts this means
 * ~12 actual DOM measurements instead of 5 000.
 */
const measureSizes = (itemList, container) => {
  const measurer = document.createElement("div");
  measurer.style.cssText =
    "position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;" +
    `width:${container.offsetWidth}px;` +
    "padding:0 20px;box-sizing:border-box;";
  document.body.appendChild(measurer);

  const cache = new Map();
  let uniqueCount = 0;

  for (const item of itemList) {
    const key = item.body;
    if (cache.has(key)) {
      item.size = cache.get(key);
      continue;
    }

    measurer.innerHTML = renderPostHTML(item);
    const measured = measurer.firstElementChild.offsetHeight;
    item.size = measured;
    cache.set(key, measured);
    uniqueCount++;
  }

  measurer.remove();
  return uniqueCount;
};

// =============================================================================
// DOM references
// =============================================================================

const containerEl = document.getElementById("list-container");

// Measurement info
const infoStrategyEl = document.getElementById("info-strategy");
const infoInitEl = document.getElementById("info-init");
const infoUniqueEl = document.getElementById("info-unique");

// Info bar right side
const infoModeEl = document.getElementById("info-mode");
const infoEstimateEl = document.getElementById("info-estimate");

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => items.length,
  getItemSize: () => ESTIMATED_POST_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create / Recreate list — called when mode changes
// =============================================================================

let firstVisibleIndex = 0;

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }
  containerEl.innerHTML = "";

  let initTime = 0;
  let uniqueSizes = 0;

  if (currentMode === "a") {
    // Mode A: pre-measure all items, then use size function
    const start = performance.now();
    if (items.length > 0) {
      uniqueSizes = measureSizes(items, containerEl);
    }
    initTime = performance.now() - start;

    list = vlist({
      container: containerEl,
      ariaLabel: "Social feed",
      items,
      item: {
        height: (index) => items[index]?.size ?? ESTIMATED_POST_HEIGHT,
        gap: 12,
        template: renderItem,
      },
    }).build();
  } else {
    // Mode B: estimated size, auto-measured by ResizeObserver
    const start = performance.now();

    list = vlist({
      container: containerEl,
      ariaLabel: "Social feed",
      items,
      item: {
        estimatedHeight: ESTIMATED_POST_HEIGHT,
        gap: 12,
        template: renderItem,
      },
    }).build();

    initTime = performance.now() - start;
  }

  // Wire stats events
  list.on("scroll", updateInfo);
  list.on("range:change", ({ range }) => {
    firstVisibleIndex = range.start;
    updateInfo();
  });
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  // Restore scroll position
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  updateInfo();
  updatePanelInfo(initTime, uniqueSizes);
}

// =============================================================================
// Panel info — measurement section + footer right
// =============================================================================

function updatePanelInfo(initTime, uniqueSizes) {
  const modeLabel = currentMode === "a" ? "Mode A" : "Mode B";

  if (infoModeEl) infoModeEl.textContent = modeLabel;
  if (infoEstimateEl) {
    infoEstimateEl.textContent =
      currentMode === "a" ? "pre-measured" : `${ESTIMATED_POST_HEIGHT}px`;
  }

  if (infoStrategyEl) {
    infoStrategyEl.textContent =
      currentMode === "a" ? "height: (i) => px" : "estimatedHeight";
  }
  if (infoInitEl) {
    infoInitEl.textContent = `${initTime.toFixed(0)}ms`;
  }
  if (infoUniqueEl) {
    infoUniqueEl.textContent = currentMode === "a" ? String(uniqueSizes) : "–";
  }
}

// =============================================================================
// Initialise
// =============================================================================

initModeToggle();
createList();
