// Velocity-Based Loading - Pure Vanilla JavaScript
// Demonstrates smart loading that adapts to scroll velocity

import {
  vlist,
  withSelection,
  withAsync,
  withScale,
  withScrollbar,
  withSnapshots,
} from "vlist";
import {
  CANCEL_LOAD_VELOCITY_THRESHOLD,
  TOTAL_ITEMS,
  ITEM_HEIGHT,
  fetchItems,
  itemTemplate,
  setApiDelay,
  setUseRealApi,
  getUseRealApi,
  formatApiSource,
  formatVelocity,
  formatLoadedCount,
} from "../shared.js";

// Storage key for snapshots
const STORAGE_KEY = "vlist-velocity-loading-snapshot";

// Get initial total from snapshot if available
const savedSnapshot = sessionStorage.getItem(STORAGE_KEY);
let total = undefined;
if (savedSnapshot) {
  try {
    const snapshot = JSON.parse(savedSnapshot);
    // Use a known total (1M items in this example)
    total = TOTAL_ITEMS;
  } catch (e) {
    // Ignore
  }
}

// Stats tracking
let loadRequests = 0;
let loadedCount = 0;
let currentVelocity = 0;
let currentScrollTop = 0;
let isLoading = false;
let saveSnapshotTimeoutId = null;
let isRestoringSnapshot = false;

// DOM references (will be set after DOM loads)
let statRequestsEl, statLoadedEl, statVelocityEl, statScrollTopEl;
let loadRequestsEl, loadedCountEl;
let velocityValueEl, velocityFillEl, velocityStatusEl;

let prevState = {
  loadRequests: -1,
  loadedCount: -1,
  isLoading: null,
  isAboveThreshold: null,
  velocityPercent: -1,
};

// Update functions
function updateStatsBar() {
  if (statRequestsEl) statRequestsEl.textContent = loadRequests;
  if (statLoadedEl) statLoadedEl.textContent = formatLoadedCount(loadedCount);
  if (statVelocityEl)
    statVelocityEl.textContent = formatVelocity(currentVelocity);
  if (statScrollTopEl)
    statScrollTopEl.textContent = Math.round(currentScrollTop).toLocaleString();
}

function updateControls() {
  if (!velocityValueEl) return; // DOM not ready

  const velocityPercent = Math.min(100, (currentVelocity / 30) * 100);
  const isAboveThreshold = currentVelocity > CANCEL_LOAD_VELOCITY_THRESHOLD;

  if (prevState.loadRequests !== loadRequests) {
    loadRequestsEl.textContent = loadRequests;
    prevState.loadRequests = loadRequests;
  }

  if (prevState.loadedCount !== loadedCount) {
    loadedCountEl.textContent = formatLoadedCount(loadedCount);
    prevState.loadedCount = loadedCount;
  }

  if (prevState.isAboveThreshold !== isAboveThreshold) {
    if (isAboveThreshold) {
      velocityValueEl.parentElement.classList.add("velocity-display--fast");
      velocityFillEl.classList.add("velocity-bar__fill--fast");
      velocityFillEl.classList.remove("velocity-bar__fill--slow");
      velocityStatusEl.classList.add("velocity-status--skipped");
      velocityStatusEl.classList.remove("velocity-status--allowed");
      velocityStatusEl.textContent = "🚫 Loading skipped";
    } else {
      velocityValueEl.parentElement.classList.remove("velocity-display--fast");
      velocityFillEl.classList.remove("velocity-bar__fill--fast");
      velocityFillEl.classList.add("velocity-bar__fill--slow");
      velocityStatusEl.classList.remove("velocity-status--skipped");
      velocityStatusEl.classList.add("velocity-status--allowed");
      velocityStatusEl.textContent = "✅ Loading allowed";
    }
    prevState.isAboveThreshold = isAboveThreshold;
  }

  velocityValueEl.textContent = formatVelocity(currentVelocity);

  const roundedPercent = Math.round(velocityPercent);
  if (prevState.velocityPercent !== roundedPercent) {
    velocityFillEl.style.width = `${roundedPercent}%`;
    prevState.velocityPercent = roundedPercent;
  }
}

// Create list with adapter
const list = vlist({
  container: "#list-container",
  ariaLabel: "Virtual user list with velocity-based loading",
  item: {
    height: ITEM_HEIGHT,
    template: itemTemplate,
  },
})
  .use(withSelection({ mode: "single" }))
  .use(
    withAsync({
      adapter: {
        read: async ({ offset, limit }) => {
          loadRequests++;
          isLoading = true;
          updateControls();
          updateStatsBar();
          const result = await fetchItems(offset, limit);
          isLoading = false;
          updateControls();
          updateStatsBar();
          return result;
        },
      },
      autoLoad: false,
      total: total,
      storage: {
        chunkSize: 25,
      },
      loading: {
        cancelThreshold: CANCEL_LOAD_VELOCITY_THRESHOLD,
      },
    }),
  )
  .use(withScale())
  .use(withScrollbar({ autoHide: true }))
  .use(withSnapshots())
  .build();

// Get DOM references
statRequestsEl = document.getElementById("stat-requests");
statLoadedEl = document.getElementById("stat-loaded");
statVelocityEl = document.getElementById("stat-velocity");
statScrollTopEl = document.getElementById("stat-scrolltop");
loadRequestsEl = document.getElementById("load-requests");
loadedCountEl = document.getElementById("loaded-count");
velocityValueEl = document.getElementById("velocity-value");
velocityFillEl = document.getElementById("velocity-fill");
velocityStatusEl = document.getElementById("velocity-status");

const btnToggleApi = document.getElementById("btn-toggle-api");
const sliderDelay = document.getElementById("slider-delay");
const delayValueEl = document.getElementById("delay-value");
const sliderScroll = document.getElementById("slider-scroll");
const scrollIndexValueEl = document.getElementById("scroll-index-value");
const btnStart = document.getElementById("btn-start");
const btnMiddle = document.getElementById("btn-middle");
const btnEnd = document.getElementById("btn-end");
const btnReload = document.getElementById("btn-reload");
const btnResetStats = document.getElementById("btn-reset-stats");

// Auto-save snapshot when scroll becomes idle
function scheduleSaveSnapshot() {
  // Don't save while restoring
  if (isRestoringSnapshot) {
    return;
  }

  if (saveSnapshotTimeoutId) {
    clearTimeout(saveSnapshotTimeoutId);
  }
  saveSnapshotTimeoutId = setTimeout(() => {
    const snapshot = list.getScrollSnapshot();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    saveSnapshotTimeoutId = null;
  }, 500); // Save 500ms after scroll stops
}

// Event bindings
// Track scroll position
list.on("scroll", ({ scrollTop }) => {
  currentScrollTop = scrollTop;
  updateStatsBar();
  scheduleSaveSnapshot();
});

// Use velocity from plugin (smoothed with circular buffer)
list.on("velocity:change", ({ velocity }) => {
  currentVelocity = velocity;
  updateControls();
  updateStatsBar();
});

list.on("load:start", () => {
  isLoading = true;
  updateControls();
  updateStatsBar();
});

list.on("load:end", ({ items }) => {
  isLoading = false;
  loadedCount += items.length;
  updateControls();
  updateStatsBar();
});

list.on("selection:change", () => {
  scheduleSaveSnapshot();
});

// Controls
btnToggleApi.addEventListener("click", async () => {
  setUseRealApi(!getUseRealApi());
  btnToggleApi.textContent = formatApiSource(getUseRealApi());
  loadedCount = 0;
  prevState.loadedCount = -1;
  updateControls();
  updateStatsBar();
  await list.reload();
});

sliderDelay.addEventListener("input", () => {
  const delay = parseInt(sliderDelay.value, 10);
  setApiDelay(delay);
  delayValueEl.textContent = `${delay}ms`;
});

sliderScroll.addEventListener("input", () => {
  const value = parseInt(sliderScroll.value, 10);
  scrollIndexValueEl.textContent = value.toLocaleString();
  list.scrollToIndex(value, "center");
});

btnStart.addEventListener("click", () => {
  list.scrollToIndex(0, "start");
  sliderScroll.value = "0";
  scrollIndexValueEl.textContent = "0";
});

btnMiddle.addEventListener("click", () => {
  const middle = Math.floor(TOTAL_ITEMS / 2);
  list.scrollToIndex(middle, "center");
  sliderScroll.value = String(middle);
  scrollIndexValueEl.textContent = middle.toLocaleString();
});

btnEnd.addEventListener("click", () => {
  list.scrollToIndex(TOTAL_ITEMS - 1, "end");
  sliderScroll.value = String(TOTAL_ITEMS - 1);
  scrollIndexValueEl.textContent = (TOTAL_ITEMS - 1).toLocaleString();
});

btnReload.addEventListener("click", async () => {
  loadedCount = 0;
  prevState.loadedCount = -1;
  updateControls();
  updateStatsBar();
  await list.reload();
});

btnResetStats.addEventListener("click", () => {
  loadRequests = 0;
  loadedCount = 0;
  prevState.loadRequests = -1;
  prevState.loadedCount = -1;
  updateControls();
  updateStatsBar();
});

// Initial update
btnToggleApi.textContent = formatApiSource(getUseRealApi());
updateControls();
updateStatsBar();

// Try to restore snapshot or load initial data
if (savedSnapshot) {
  // Restore from snapshot
  try {
    const snapshot = JSON.parse(savedSnapshot);
    isRestoringSnapshot = true;

    // restoreScroll handles: sizeCache rebuild, compression, content size,
    // scroll position, and loading the visible range at the restored position
    list.restoreScroll(snapshot);

    // Re-enable saving after 2 seconds to ensure stability
    setTimeout(() => {
      isRestoringSnapshot = false;
    }, 2000);
  } catch (e) {
    console.error("[Example] Restoration failed:", e);
    // If restoration fails, just load from start
    isRestoringSnapshot = false;
    list.reload();
  }
} else {
  // No snapshot - load from start
  list.reload();
}
