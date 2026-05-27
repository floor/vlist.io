// Accessibility — WAI-ARIA listbox pattern demonstration
// Shows: role="listbox" / role="option", aria-setsize, aria-posinset,
// aria-activedescendant, aria-selected, keyboard navigation.
// The ARIA inspector updates live as you interact.
// Toggle "a11y" off to disable all built-in keyboard navigation.

import { createVList, groups, selection } from "vlist";
import { makeContacts } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import "./controls.js";

// =============================================================================
// Constants
// =============================================================================

export const TOTAL = 500;
export const ITEM_HEIGHT = 56;
export const HEADER_HEIGHT = 36;

// =============================================================================
// Data — sorted by last name for A–Z grouping
// =============================================================================

export const users = makeContacts(TOTAL).sort((a, b) =>
  a.lastName.localeCompare(b.lastName),
);

// =============================================================================
// State — exported so controls.js can read
// =============================================================================

export let list = null;
export let a11yEnabled = true;

// =============================================================================
// Template
// =============================================================================

export const itemTemplate = (user) => `
  <div class="item__avatar" style="background:${user.color};color:${user.textColor}">${user.initials}</div>
  <div class="item__text">
    <div class="item__name">${user.firstName} ${user.lastName}</div>
    <div class="item__email">${user.email}</div>
  </div>
`;

const renderGroupHeader = (group) => `
  <div class="group-header">
    <span class="group-header__letter">${group}</span>
    <span class="group-header__line"></span>
  </div>
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
// ARIA Inspector — reads live attribute values from the vlist content element
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
  const content = container && container.querySelector(".vlist-content");
  if (!content) return;

  attrRole.textContent = content.getAttribute("role") ?? "—";
  attrLabel.textContent = content.getAttribute("aria-label") ?? "—";
  attrTabindex.textContent = content.getAttribute("tabindex") ?? "—";

  const activeId = content.getAttribute("aria-activedescendant");
  attrActiveDesc.textContent = activeId ?? "none";

  const targetEl = activeId
    ? content.querySelector(`#${CSS.escape(activeId)}`)
    : content.querySelector('[aria-selected="true"]');

  if (targetEl) {
    attrSelected.textContent = targetEl.getAttribute("aria-selected") ?? "—";
    attrSetsize.textContent = targetEl.getAttribute("aria-setsize") ?? "—";
    attrPosinset.textContent = targetEl.getAttribute("aria-posinset") ?? "—";
  } else {
    attrSelected.textContent = "—";
    attrSetsize.textContent = "—";
    attrPosinset.textContent = "—";
  }
}

// =============================================================================
// Accessible-dependent UI visibility
// =============================================================================

const a11yUi = document.querySelectorAll("[data-requires-a11y]");

function updateA11yUi() {
  for (const el of a11yUi) {
    el.classList.toggle("is-disabled", !a11yEnabled);
  }
}

// =============================================================================
// Create list
// =============================================================================

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const plugins = [
    groups({
      getGroupForIndex: (index) => users[index].lastName[0].toUpperCase(),
      header: {
        height: HEADER_HEIGHT,
        template: (group) => renderGroupHeader(group),
      },
      sticky: true,
    }),
  ];

  if (a11yEnabled) {
    plugins.push(selection({ mode: "single" }));
  }

  list = createVList({
    container: "#list-container",
    ariaLabel: "Employee directory",
    item: {
      height: ITEM_HEIGHT,
      template: itemTemplate,
    },
    items: users,
    interactive: a11yEnabled,
  }, plugins);

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
  list.on("selection:change", () => { updateInspector(); updateContext(); });
  list.on("focus:change", () => { updateInspector(); updateContext(); });

  updateInspector();
  updateA11yUi();
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
  const content = container && container.querySelector(".vlist-content");
  if (!content) return;

  const activeId = content.getAttribute("aria-activedescendant");
  if (activeId) {
    const el = content.querySelector(`#${CSS.escape(activeId)}`);
    infoFocused.textContent = activeId;
    infoPosinset.textContent = el?.getAttribute("aria-posinset") ?? "—";
  } else {
    infoFocused.textContent = "—";
    infoPosinset.textContent = "—";
  }
}

// =============================================================================
// A11y toggle
// =============================================================================

export function setA11y(enabled) {
  a11yEnabled = enabled;
  createList();
}

// =============================================================================
// Initialise
// =============================================================================

createList();
