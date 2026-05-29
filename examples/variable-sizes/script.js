// Variable Sizes — Social feed with Mode A / Mode B size handling
// Demonstrates both approaches to variable-height items:
//   A · Pre-measure all items via hidden DOM element (size function)
//   B · Auto-size via estimatedHeight + ResizeObserver
// Uses split-layout pattern with side panel, mode toggle, and info bar stats.

import { createVList, autosize /* scrollbar */ } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import { initModeToggle } from "./controls.js";
import { getAllPosts } from "../../src/api/posts.js";

// =============================================================================
// Constants
// =============================================================================

const TOTAL_POSTS = 5000;
const ESTIMATED_POST_HEIGHT = 240;
const VLIST_PADDING = 12; // must match padding: passed to vlist()

// =============================================================================
// Data — generated from API module (deterministic, same every time)
// =============================================================================

export const items = getAllPosts(TOTAL_POSTS);
export let list = null;
export let currentMode = "a"; // "a" | "b"

export function setCurrentMode(v) {
  currentMode = v;
}

// =============================================================================
// Templates
// =============================================================================

const renderPostHTML = (item) => `
  <article class="ui-card ui-card--lg post-card">
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
const measureSizes = (itemList, container, vlistPadding = 0) => {
  // Build a temporary DOM structure that mirrors vlist's actual layout so the
  // measurement context (scrollbar width, CSS variables, inherited styles) is
  // identical. The item element uses left/right padding offsets just like the
  // real pipeline, so text wraps at exactly the same width.
  const root = document.createElement("div");
  root.className = "vlist";
  root.style.cssText = `position:absolute;top:0;left:0;width:${container.offsetWidth}px;height:${container.offsetHeight}px;visibility:hidden;pointer-events:none;`;

  const viewport = document.createElement("div");
  viewport.className = "vlist-viewport";

  const content = document.createElement("div");
  content.className = "vlist-content";
  content.style.height = "10000px";

  const item = document.createElement("div");
  item.className = "vlist-item";
  if (vlistPadding > 0) {
    item.style.left = `${vlistPadding}px`;
    item.style.right = `${vlistPadding}px`;
  }

  content.appendChild(item);
  viewport.appendChild(content);
  root.appendChild(viewport);
  container.appendChild(root);

  const cache = new Map();
  let uniqueCount = 0;

  for (const it of itemList) {
    const key = it.body;
    if (cache.has(key)) {
      it.size = cache.get(key);
      continue;
    }

    item.innerHTML = renderPostHTML(it);
    const measured = item.firstElementChild.offsetHeight;
    it.size = measured;
    cache.set(key, measured);
    uniqueCount++;
  }

  root.remove();
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
      uniqueSizes = measureSizes(items, containerEl, VLIST_PADDING);
    }
    initTime = performance.now() - start;

    list = createVList({
      container: containerEl,
      ariaLabel: "Social feed",
      items,
      padding: VLIST_PADDING,

      item: {
        height: (index) => items[index]?.size ?? ESTIMATED_POST_HEIGHT,
        gap: 12,
        template: renderItem,
      },
    });
  } else {
    // Mode B: estimated size, auto-measured by ResizeObserver
    const start = performance.now();

    list = createVList({
      container: containerEl,
      ariaLabel: "Social feed",
      padding: VLIST_PADDING,
      items,
      item: {
        estimatedHeight: ESTIMATED_POST_HEIGHT,
        gap: 12,

        template: renderItem,
      },
    }, [autosize()]);

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

  // Toggle mode description visibility
  const descA = document.getElementById("mode-desc-a");
  const descB = document.getElementById("mode-desc-b");
  if (descA) descA.style.display = currentMode === "a" ? "" : "none";
  if (descB) descB.style.display = currentMode === "b" ? "" : "none";

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
