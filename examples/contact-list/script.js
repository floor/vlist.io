// Contact List — A–Z grouped contacts with sticky section headers
// Demonstrates withGroups plugin with sticky/inline toggle

import { vlist, withGroups } from "vlist";
import { makeContacts } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { initLetterGrid } from "./controls.js";

// =============================================================================
// Constants
// =============================================================================

export const TOTAL_CONTACTS = 2000;
export const ITEM_HEIGHT = 64;
export const HEADER_HEIGHT = 36;

// =============================================================================
// Data — sorted by last name
// =============================================================================

export const contacts = makeContacts(TOTAL_CONTACTS).sort((a, b) =>
  a.lastName.localeCompare(b.lastName),
);

// Build group index: letter → first contact index
export const groupIndex = new Map();
for (let i = 0; i < contacts.length; i++) {
  const letter = contacts[i].lastName[0].toUpperCase();
  if (!groupIndex.has(letter)) {
    groupIndex.set(letter, i);
  }
}

export const sortedGroups = [...groupIndex.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
);

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let currentHeaderMode = "sticky"; // "sticky" | "inline" | "off"
export let list = null;

export function setCurrentHeaderMode(v) {
  currentHeaderMode = v;
}

// =============================================================================
// Templates
// =============================================================================

const renderContact = (item) => `
  <div class="contact">
    <div class="contact__avatar" style="background:${item.color}">${item.initials}</div>
    <div class="contact__info">
      <div class="contact__name">${item.firstName} ${item.lastName}</div>
      <div class="contact__detail">${item.department} · ${item.email}</div>
    </div>
    <div class="contact__phone">${item.phone}</div>
  </div>
`;

const renderGroupHeader = (group) => `
  <div class="group-header">
    <span class="group-header__letter">${group}</span>
    <span class="group-header__line"></span>
  </div>
`;

// =============================================================================
// Stats — shared footer (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getList: () => list,
  getTotal: () => contacts.length,
  getItemHeight: () => ITEM_HEIGHT,
  container: "#list-container",
});

// =============================================================================
// Create / Recreate list
// =============================================================================

let firstVisibleIndex = 0;

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Contact list",
    item: {
      height: ITEM_HEIGHT,
      template: renderContact,
    },
    items: contacts,
  });

  if (currentHeaderMode !== "off") {
    builder.use(
      withGroups({
        getGroupForIndex: (index) => contacts[index].lastName[0].toUpperCase(),
        headerHeight: HEADER_HEIGHT,
        headerTemplate: (group) => renderGroupHeader(group),
        sticky: currentHeaderMode === "sticky",
      }),
    );
  }

  list = builder.build();

  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", ({ range }) => {
    firstVisibleIndex = range.start;
    stats.scheduleUpdate();
  });
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  // Restore scroll position
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  stats.update();
  updateContext();
}

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

const ftGroups = document.getElementById("ft-groups");
const ftHeaders = document.getElementById("ft-headers");

export function updateContext() {
  ftGroups.textContent = sortedGroups.length;
  ftHeaders.textContent = currentHeaderMode;
}

// =============================================================================
// Distribution chart (rendered once in panel)
// =============================================================================

const groupDistEl = document.getElementById("group-distribution");

const groupCounts = new Map();
for (const contact of contacts) {
  const letter = contact.lastName[0].toUpperCase();
  groupCounts.set(letter, (groupCounts.get(letter) || 0) + 1);
}

const maxGroupSize = Math.max(...[...groupCounts.values()]);

groupDistEl.innerHTML = `<div class="dist-grid">${sortedGroups
  .map(([letter]) => {
    const count = groupCounts.get(letter) || 0;
    const barHeight = Math.round((count / maxGroupSize) * 100);
    return `
      <div class="dist-col" title="${letter}: ${count} contacts">
        <div class="dist-bar-wrap">
          <div class="dist-bar" style="height:${barHeight}%"></div>
        </div>
        <span class="dist-letter">${letter}</span>
      </div>
    `;
  })
  .join("")}</div>`;

// =============================================================================
// Initialise
// =============================================================================

initLetterGrid();
createList();
