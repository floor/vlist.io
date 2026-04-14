// Accessibility — WAI-ARIA listbox pattern demonstration
// Shows: role="listbox" / role="option", aria-setsize, aria-posinset,
// aria-activedescendant, aria-selected, keyboard navigation.
// The ARIA inspector updates live as you interact.
// Toggle "interactive" off to disable all built-in keyboard navigation.

import { vlist } from "vlist";
import { makeUsers } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
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
export let interactiveEnabled = true;

// =============================================================================
// Template
// =============================================================================

export const itemTemplate = (user, index) => `
  <div class="item__avatar" style="background:${user.color};color:${user.textColor}">${user.initials}</div>
  <div class="item__text">
    <div class="item__name">${user.name}</div>
    <div class="item__email">${user.email}</div>
  </div>
  <span class="item__index">#${index + 1}</span>
`;

// =============================================================================
// Stats — shared info bar (progress, velocity, visible/total)
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
// Accessible-dependent UI visibility
// =============================================================================

const interactiveUi = document.querySelectorAll("[data-requires-interactive]");

function updateInteractiveUi() {
  for (const el of interactiveUi) {
    el.classList.toggle("is-disabled", !interactiveEnabled);
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

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  list = vlist({
    container: "#list-container",
    ariaLabel: "Employee directory",
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items: users,
    accessible: interactiveEnabled,
  }).build();

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

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
  }

  updateInspector();
  updateInteractiveUi();
  updateInfo();
  updateContext();
}

// =============================================================================
// Info bar — right side (contextual)
// =============================================================================

const infoFocused = document.getElementById("info-focused");
const infoPosinset = document.getElementById("info-posinset");

export function updateContext() {
  const container = document.getElementById("list-container");
  const root = container && container.querySelector(".vlist");
  if (!root) return;

  const activeId = root.getAttribute("aria-activedescendant");
  if (activeId) {
    const el = root.querySelector(`#${CSS.escape(activeId)}`);
    infoFocused.textContent = activeId;
    infoPosinset.textContent = el?.getAttribute("aria-posinset") ?? "—";
  } else {
    infoFocused.textContent = "—";
    infoPosinset.textContent = "—";
  }
}

// =============================================================================
// Interactive toggle
// =============================================================================

export function setInteractive(enabled) {
  interactiveEnabled = enabled;
  createList();
}

// =============================================================================
// Initialise
// =============================================================================

createList();
