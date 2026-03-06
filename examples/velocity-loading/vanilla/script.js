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
  LOAD_VELOCITY_THRESHOLD,
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
import { createStats } from "../../stats.js";
import { createFooterUpdater } from "../../footer.js";

// Storage key for snapshots
const STORAGE_KEY = "vlist-velocity-loading-snapshot";

// Parse saved snapshot (if any) to configure autoLoad + restore
const savedRaw = sessionStorage.getItem(STORAGE_KEY);
let snapshot = undefined;
if (savedRaw) {
  try {
    snapshot = JSON.parse(savedRaw);
  } catch (e) {
    // Corrupt data — ignore
  }
}

// Stats tracking
let loadRequests = 0;
let loadedCount = 0;
let currentVelocity = 0;
let isLoading = false;
let saveSnapshotTimeoutId = null;
let isRestoringSnapshot = !!snapshot;

// DOM references (will be set after DOM loads)
let loadRequestsEl, loadedCountEl;
let velocityValueEl, velocityFillEl, velocityStatusEl;

// Footer right-side elements
let ftRequestsEl, ftLoadedEl;

let prevState = {
  loadRequests: -1,
  loadedCount: -1,
  isLoading: null,
  isAboveThreshold: null,
  velocityPercent: -1,
};

// Update panel controls (velocity display, sidebar stats)
function updateControls() {
  if (!velocityValueEl) return; // DOM not ready

  const velocityPercent = Math.min(100, (currentVelocity / 30) * 100);
  const isAboveThreshold = currentVelocity > LOAD_VELOCITY_THRESHOLD;

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

// Update footer right side (requests + loaded)
function updateContext() {
  if (ftRequestsEl) ftRequestsEl.textContent = loadRequests;
  if (ftLoadedEl) ftLoadedEl.textContent = formatLoadedCount(loadedCount);
}

// Build list — snapshot restoration happens automatically via withSnapshots({ restore })
// before the browser's first paint, so the user never sees position 0.
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
          updateContext();
          const result = await fetchItems(offset, limit);
          isLoading = false;
          updateControls();
          updateContext();
          return result;
        },
      },
      autoLoad: !snapshot,
      total: snapshot?.total,
      storage: {
        chunkSize: 25,
      },
      loading: {
        cancelThreshold: LOAD_VELOCITY_THRESHOLD,
      },
    }),
  )
  .use(withScale())
  .use(withScrollbar({ autoHide: true }))
  .use(withSnapshots({ restore: snapshot }))
  .build();

// =============================================================================
// Shared footer stats (left side — progress, velocity, items)
// =============================================================================

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => TOTAL_ITEMS,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateFooter = createFooterUpdater(stats);

// Get DOM references
loadRequestsEl = document.getElementById("load-requests");
loadedCountEl = document.getElementById("loaded-count");
velocityValueEl = document.getElementById("velocity-value");
velocityFillEl = document.getElementById("velocity-fill");
velocityStatusEl = document.getElementById("velocity-status");

// Footer right-side refs
ftRequestsEl = document.getElementById("ft-requests");
ftLoadedEl = document.getElementById("ft-loaded");

const btnSimulated = document.getElementById("btn-simulated");
const btnLiveApi = document.getElementById("btn-live-api");
const sliderDelay = document.getElementById("slider-delay");
const delayValueEl = document.getElementById("delay-value");
const btnStart = document.getElementById("btn-start");
const btnMiddle = document.getElementById("btn-middle");
const btnEnd = document.getElementById("btn-end");
const btnRandom = document.getElementById("btn-random");
const btnReload = document.getElementById("btn-reload");
const btnResetStats = document.getElementById("btn-reset-stats");

// Auto-save snapshot when scroll becomes idle
function scheduleSaveSnapshot() {
  if (isRestoringSnapshot) return;

  if (saveSnapshotTimeoutId) {
    clearTimeout(saveSnapshotTimeoutId);
  }
  saveSnapshotTimeoutId = setTimeout(() => {
    const snap = list.getScrollSnapshot();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    saveSnapshotTimeoutId = null;
  }, 500);
}

// Event bindings
list.on("scroll", () => {
  updateFooter();
  scheduleSaveSnapshot();
});

list.on("range:change", () => {
  updateFooter();
});

list.on("velocity:change", ({ velocity }) => {
  currentVelocity = velocity;
  stats.onVelocity(velocity);
  updateFooter();
  updateControls();
});

list.on("load:start", () => {
  isLoading = true;
  updateControls();
  updateContext();
});

list.on("load:end", ({ items }) => {
  isLoading = false;
  loadedCount += items.length;
  updateControls();
  updateContext();
});

list.on("selection:change", () => {
  scheduleSaveSnapshot();
});

// Re-enable saving after restore settles
if (isRestoringSnapshot) {
  setTimeout(() => {
    isRestoringSnapshot = false;
  }, 2000);
}

// Update button states
function updateDataSourceButtons() {
  const useRealApi = getUseRealApi();
  if (useRealApi) {
    btnSimulated.classList.remove("ui-segmented__btn--active");
    btnLiveApi.classList.add("ui-segmented__btn--active");
  } else {
    btnSimulated.classList.add("ui-segmented__btn--active");
    btnLiveApi.classList.remove("ui-segmented__btn--active");
  }
}

// Controls
btnSimulated.addEventListener("click", async () => {
  if (!getUseRealApi()) return; // Already simulated
  setUseRealApi(false);
  updateDataSourceButtons();
  loadedCount = 0;
  prevState.loadedCount = -1;
  updateControls();
  updateContext();
  await list.reload();
});

btnLiveApi.addEventListener("click", async () => {
  if (getUseRealApi()) return; // Already live
  setUseRealApi(true);
  updateDataSourceButtons();
  loadedCount = 0;
  prevState.loadedCount = -1;
  updateControls();
  updateContext();
  await list.reload();
});

sliderDelay.addEventListener("input", () => {
  const delay = parseInt(sliderDelay.value, 10);
  setApiDelay(delay);
  delayValueEl.textContent = `${delay}ms`;
});

btnStart.addEventListener("click", () => {
  list.scrollToIndex(0, {
    align: "start",
    behavior: "smooth",
  });
});

btnMiddle.addEventListener("click", () => {
  const middle = Math.floor(TOTAL_ITEMS / 2);
  list.scrollToIndex(middle, {
    align: "center",
    behavior: "smooth",
  });
});

btnEnd.addEventListener("click", () => {
  list.scrollToIndex(TOTAL_ITEMS - 1, {
    align: "end",
    behavior: "smooth",
  });
});

btnRandom.addEventListener("click", () => {
  const index = Math.floor(Math.random() * TOTAL_ITEMS);
  list.scrollToIndex(index, {
    align: "center",
    behavior: "smooth",
  });
});

btnReload.addEventListener("click", async () => {
  loadedCount = 0;
  prevState.loadedCount = -1;
  updateControls();
  updateContext();
  await list.reload();
});

btnResetStats.addEventListener("click", () => {
  loadRequests = 0;
  loadedCount = 0;
  prevState.loadRequests = -1;
  prevState.loadedCount = -1;
  updateControls();
  updateContext();
});

// Initial update
updateDataSourceButtons();
updateControls();
updateContext();
updateFooter();
