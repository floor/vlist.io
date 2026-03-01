// Accessibility — WAI-ARIA listbox pattern demonstration
// Shows: role="listbox" / role="option", aria-setsize, aria-posinset,
// aria-activedescendant, aria-selected, keyboard navigation, and selection.
// The ARIA inspector and announcement log update live as you interact.
// Toggle selection off ("None") to test baseline ARIA without the feature.

import { vlist, withSelection } from "vlist";
import { makeUsers } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import "./controls.js";

// =============================================================================
// Constants
// =============================================================================

export const TOTAL = 500;
export const ITEM_HEIGHT = 56;

// =============================================================================
// Data
// =============================================================================

export const users = makeUsers(TOTAL);

// =============================================================================
// State — exported so controls.js can read
// =============================================================================

export let list = null;
export let selectionMode = "single"; // "none" | "single" | "multiple"

// =============================================================================
// Template
// =============================================================================

export const itemTemplate = (user, index) => `
  <div class="item__avatar" style="background:${user.color}">${user.initials}</div>
  <div class="item__text">
    <div class="item__name">${user.name}</div>
    <div class="item__email">${user.email}</div>
  </div>
  <span class="item__index">#${index + 1}</span>
`;

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getList: () => list,
  getTotal: () => TOTAL,
  getItemHeight: () => ITEM_HEIGHT,
  container: "#list-container",
});

// =============================================================================
// ARIA Inspector — reads live attribute values from the vlist root element
// =============================================================================

const attrRole = document.getElementById("attr-role");
const attrLabel = document.getElementById("attr-label");
const attrTabindex = document.getElementById("attr-tabindex");
const attrActiveDesc = document.getElementById("attr-activedescendant");
const attrSelected = document.getElementById("attr-selected");
const attrSetsize = document.getElementById("attr-setsize");
const attrPosinset = document.getElementById("attr-posinset");

function updateInspector() {
  const container = document.getElementById("list-container");
  const root = container && container.querySelector(".vlist");
  if (!root) return;

  attrRole.textContent = root.getAttribute("role") ?? "—";
  attrLabel.textContent = root.getAttribute("aria-label") ?? "—";
  attrTabindex.textContent = root.getAttribute("tabindex") ?? "—";

  const activeId = root.getAttribute("aria-activedescendant");
  attrActiveDesc.textContent = activeId ?? "none";

  const focusedEl = activeId
    ? root.querySelector(`#${CSS.escape(activeId)}`)
    : null;

  if (focusedEl) {
    attrSelected.textContent = focusedEl.getAttribute("aria-selected") ?? "—";
    attrSetsize.textContent = focusedEl.getAttribute("aria-setsize") ?? "—";
    attrPosinset.textContent = focusedEl.getAttribute("aria-posinset") ?? "—";
  } else {
    attrSelected.textContent = "—";
    attrSetsize.textContent = "—";
    attrPosinset.textContent = "—";
  }
}

// =============================================================================
// Announcement Log — mirrors what a screen reader would hear from the live
// region. Captures text changes in the aria-live element created by
// withSelection and displays them in the visible log panel.
// =============================================================================

const logList = document.getElementById("announcement-log-list");
let logCount = 0;
const MAX_LOG_ENTRIES = 50;

function logAnnouncement(text) {
  if (!logList || !text) return;
  logCount++;

  const li = document.createElement("li");
  li.className = "announcement-log__entry";
  li.innerHTML = `<span class="announcement-log__number">${logCount}</span>${escapeHtml(text)}`;

  // Prepend so newest is on top
  logList.prepend(li);

  // Trim old entries
  while (logList.children.length > MAX_LOG_ENTRIES) {
    logList.lastElementChild.remove();
  }
}

function clearLog() {
  if (!logList) return;
  logList.innerHTML = "";
  logCount = 0;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// =============================================================================
// Live region observer — watches the sr-only live region for text changes
// =============================================================================

let liveRegionObserver = null;

function observeLiveRegion(root) {
  if (liveRegionObserver) {
    liveRegionObserver.disconnect();
    liveRegionObserver = null;
  }

  const liveRegion = root.querySelector("[aria-live]");
  if (!liveRegion) return;

  liveRegionObserver = new MutationObserver(() => {
    const text = liveRegion.textContent.trim();
    if (text) logAnnouncement(text);
  });

  liveRegionObserver.observe(liveRegion, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

// =============================================================================
// Selection-dependent UI visibility
// =============================================================================

const selectionUi = document.querySelectorAll("[data-requires-selection]");

function updateSelectionUi() {
  const enabled = selectionMode !== "none";
  for (const el of selectionUi) {
    el.classList.toggle("is-disabled", !enabled);
  }
}

// =============================================================================
// Create list
// =============================================================================

let activeDescObserver = null;

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  if (activeDescObserver) {
    activeDescObserver.disconnect();
    activeDescObserver = null;
  }

  if (liveRegionObserver) {
    liveRegionObserver.disconnect();
    liveRegionObserver = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Employee directory",
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items: users,
  });

  // Only add selection feature when mode is not "none"
  if (selectionMode !== "none") {
    builder.use(withSelection({ mode: selectionMode }));
  }

  list = builder.build();

  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", stats.scheduleUpdate);
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  // Wire selection events only when the feature is active
  if (selectionMode !== "none") {
    list.on("selection:change", ({ selected }) => {
      updateSelectionCount(selected);
      updateInspector();
    });
  }

  // Watch aria-activedescendant on the root → update inspector + footer
  const root = container.querySelector(".vlist");
  if (root) {
    activeDescObserver = new MutationObserver(() => {
      updateInspector();
      updateContext();
    });
    activeDescObserver.observe(root, {
      attributes: true,
      attributeFilter: ["aria-activedescendant"],
    });

    // Observe the live region for announcements (only exists with selection)
    if (selectionMode !== "none") {
      observeLiveRegion(root);
    }
  }

  updateInspector();
  updateSelectionUi();
  stats.update();
  updateContext();
  updateSelectionCount([]);
}

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

const ftFocused = document.getElementById("ft-focused");
const ftPosinset = document.getElementById("ft-posinset");
const ftSelection = document.getElementById("ft-selection");

export function updateContext() {
  const container = document.getElementById("list-container");
  const root = container && container.querySelector(".vlist");
  if (!root) return;

  const activeId = root.getAttribute("aria-activedescendant");
  if (activeId) {
    const el = root.querySelector(`#${CSS.escape(activeId)}`);
    ftFocused.textContent = activeId;
    ftPosinset.textContent = el?.getAttribute("aria-posinset") ?? "—";
  } else {
    ftFocused.textContent = "—";
    ftPosinset.textContent = "—";
  }
}

function updateSelectionCount(selected) {
  if (!ftSelection) return;
  const count = Array.isArray(selected) ? selected.length : 0;
  ftSelection.textContent = String(count);
}

// =============================================================================
// Selection mode switching
// =============================================================================

export function setSelectionMode(mode) {
  selectionMode = mode;
  clearLog();
  createList();
}

// =============================================================================
// Initialise
// =============================================================================

createList();
