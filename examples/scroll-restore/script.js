// Scroll Save/Restore Example
// Demonstrates getScrollSnapshot() and withSnapshots({ restore }) for SPA navigation

import { vlist, withSelection, withSnapshots } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const TOTAL_ITEMS = 5000;
const ITEM_HEIGHT = 64;
const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Marketing",
  "Sales",
  "Support",
  "Finance",
  "Legal",
  "Operations",
];
const COLORS = [
  "#667eea",
  "#f093fb",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
  "#30cfd0",
  "#ff6b6b",
];

const items = Array.from({ length: TOTAL_ITEMS }, (_, i) => ({
  id: i + 1,
  name: `Employee ${i + 1}`,
  department: DEPARTMENTS[i % DEPARTMENTS.length],
  initials: String.fromCharCode(65 + (i % 26)),
  color: COLORS[i % COLORS.length],
}));

// ---------------------------------------------------------------------------
// Storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "vlist-scroll-restore-demo";

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

const listPage = document.getElementById("list-page");
const detailPage = document.getElementById("detail-page");
const listContainer = document.getElementById("list-container");
const snapshotCodeEl = document.getElementById("snapshot-code");
const savedSnapshotCodeEl = document.getElementById("saved-snapshot-code");
const navigateAwayBtn = document.getElementById("navigate-away");
const goBackBtn = document.getElementById("go-back");

// Info bar right-side element
const infoSelectedEl = document.getElementById("info-selected");

// ---------------------------------------------------------------------------
// Shared footer stats (left side — progress, velocity, items)
// ---------------------------------------------------------------------------

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => TOTAL_ITEMS,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// ---------------------------------------------------------------------------
// List management
// ---------------------------------------------------------------------------

let list = null;
let snapshotUpdateId = null;

/**
 * Create (or recreate) the list.
 *
 * @param {import('vlist').ScrollSnapshot} [snapshot]
 *   Optional snapshot to restore automatically after build().
 *   When provided it is passed to `withSnapshots({ restore })` which
 *   schedules `restoreScroll()` via `queueMicrotask` — the user never
 *   sees position 0.
 */
function createList(snapshot) {
  list = vlist({
    container: listContainer,
    ariaLabel: "Employee list",
    item: {
      height: ITEM_HEIGHT,
      template: (item, index, { selected }) => {
        const selectedClass = selected ? " item--selected" : "";
        return `
          <div class="item-content${selectedClass}">
            <div class="item-avatar" style="background:${item.color}">${item.initials}</div>
            <div class="item-details">
              <div class="item-name">${item.name}</div>
              <div class="item-dept">${item.department}</div>
            </div>
            <div class="item-index">#${index + 1}</div>
          </div>
        `;
      },
    },
    items,
  })
    .use(withSelection({ mode: "multiple" }))
    .use(withSnapshots(snapshot ? { restore: snapshot } : undefined))
    .build();

  // Info bar updates
  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
  list.on("selection:change", updateContext);

  updateInfo();
  updateContext();

  // Live snapshot preview (throttled)
  const updateSnapshotPreview = () => {
    if (!list) return;
    const snap = list.getScrollSnapshot();
    snapshotCodeEl.textContent = formatSnapshot(snap);
    snapshotUpdateId = null;
  };

  const scheduleSnapshotUpdate = () => {
    if (snapshotUpdateId) return;
    snapshotUpdateId = requestAnimationFrame(updateSnapshotPreview);
  };

  list.on("scroll", scheduleSnapshotUpdate);
  list.on("selection:change", scheduleSnapshotUpdate);
  list.on("focus:change", scheduleSnapshotUpdate);

  // Initial preview
  updateSnapshotPreview();
}

function destroyList() {
  if (snapshotUpdateId) {
    cancelAnimationFrame(snapshotUpdateId);
    snapshotUpdateId = null;
  }
  if (list) {
    list.destroy();
    list = null;
  }
}

// ---------------------------------------------------------------------------
// Footer right side — context (selected count)
// ---------------------------------------------------------------------------

function updateContext() {
  if (!list || !infoSelectedEl) return;
  infoSelectedEl.textContent = list.getSelected().length;
}

// ---------------------------------------------------------------------------
// Snapshot formatting
// ---------------------------------------------------------------------------

function formatSnapshot(snapshot) {
  const parts = [
    `  "index": ${snapshot.index}`,
    `  "offsetInItem": ${Math.round(snapshot.offsetInItem * 100) / 100}`,
    `  "total": ${snapshot.total}`,
  ];

  if (snapshot.selectedIds && snapshot.selectedIds.length > 0) {
    const ids = snapshot.selectedIds;
    if (ids.length <= 8) {
      parts.push(`  "selectedIds": [${ids.join(", ")}]`);
    } else {
      const preview = ids.slice(0, 6).join(", ");
      parts.push(`  "selectedIds": [${preview}, … +${ids.length - 6} more]`);
    }
  }

  if (snapshot.focusedId !== undefined) {
    parts.push(`  "focusedId": ${snapshot.focusedId}`);
  }

  return "{\n" + parts.join(",\n") + "\n}";
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

function navigateAway() {
  if (!list) return;

  // 1. Save snapshot
  const snapshot = list.getScrollSnapshot();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));

  // 2. Show the saved snapshot on the detail page
  savedSnapshotCodeEl.textContent = formatSnapshot(snapshot);

  // 3. Destroy the list
  destroyList();

  // 4. Switch pages
  listPage.classList.add("hidden");
  detailPage.classList.remove("hidden");
}

function goBack() {
  // 1. Switch pages
  detailPage.classList.add("hidden");
  listPage.classList.remove("hidden");

  // 2. Read saved snapshot
  const raw = sessionStorage.getItem(STORAGE_KEY);
  const snapshot = raw ? JSON.parse(raw) : undefined;

  // 3. Recreate the list — snapshot is passed to withSnapshots({ restore })
  //    so scroll + selection are restored automatically after build().
  createList(snapshot);
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

navigateAwayBtn.addEventListener("click", navigateAway);
goBackBtn.addEventListener("click", goBack);

// ---------------------------------------------------------------------------
// Pre-select a few items so there's something to restore
// ---------------------------------------------------------------------------

function init() {
  // Check for a previously saved snapshot (e.g. hard page refresh)
  const raw = sessionStorage.getItem(STORAGE_KEY);
  let snapshot;

  if (raw) {
    try {
      snapshot = JSON.parse(raw);
    } catch {
      // Ignore corrupted data
    }
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // Create the list — if a snapshot exists it is passed directly to
  // withSnapshots({ restore }) for automatic restoration.
  createList(snapshot);

  // Pre-select a handful of items to make the demo more interesting
  // (only when there's no snapshot to restore — otherwise the snapshot
  // already carries its own selectedIds).
  if (!snapshot) {
    list.select(3, 7, 12, 25, 42);
  }
}

init();
