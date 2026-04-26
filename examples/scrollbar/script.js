// Scrollbar — showcase all withScrollbar options
// Uses a contact list as the canvas to demonstrate native, custom, and none modes.

import { vlist, withScrollbar } from "vlist";
import { makeContacts } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import "./controls.js";

// =============================================================================
// Constants
// =============================================================================

const TOTAL = 1_000;
const ITEM_HEIGHT = 64;

// =============================================================================
// Data
// =============================================================================

export const contacts = makeContacts(TOTAL).sort((a, b) =>
  a.lastName.localeCompare(b.lastName),
);

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let mode = "native"; // "native" | "custom" | "none"
export let autoHide = true;
export let autoHideDelay = 1000;
export let gutterEnabled = false;
export let showOnHover = true;
export let showOnViewportEnter = true;
export let list = null;

export function setMode(v) { mode = v; }
export function setAutoHide(v) { autoHide = v; }
export function setAutoHideDelay(v) { autoHideDelay = v; }
export function setGutterEnabled(v) { gutterEnabled = v; }
export function setShowOnHover(v) { showOnHover = v; }
export function setShowOnViewportEnter(v) { showOnViewportEnter = v; }

// =============================================================================
// Template
// =============================================================================

const renderContact = (item) => `
  <div class="contact">
    <div class="contact__avatar" style="background:${item.color};color:${item.textColor}">${item.initials}</div>
    <div class="contact__info">
      <div class="contact__name">${item.firstName} ${item.lastName}</div>
      <div class="contact__detail">${item.department} · ${item.email}</div>
    </div>
  </div>
`;

// =============================================================================
// Stats — shared info bar
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => contacts.length,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create / recreate list
// =============================================================================

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const scrollConfig = {};
  if (mode === "none") scrollConfig.scrollbar = "none";

  const builder = vlist({
    container: "#list-container",
    ariaLabel: "Scrollbar demo — contact list",
    scroll: scrollConfig,
    item: { height: ITEM_HEIGHT, template: renderContact },
    items: contacts,
  });

  if (mode === "custom") {
    builder.use(
      withScrollbar({
        autoHide,
        autoHideDelay,
        gutter: gutterEnabled,
        showOnHover,
        showOnViewportEnter,
      }),
    );
  }

  list = builder.build();

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  updateInfo();
  updateContext();
}

// =============================================================================
// Info bar — right side
// =============================================================================

const infoMode = document.getElementById("info-mode");
const infoGutter = document.getElementById("info-gutter");

export function updateContext() {
  if (infoMode) infoMode.textContent = mode;
  if (infoGutter) {
    infoGutter.textContent =
      mode === "custom" ? (gutterEnabled ? "stable" : "overlay") : "—";
  }
}

// =============================================================================
// Init
// =============================================================================

createList();
