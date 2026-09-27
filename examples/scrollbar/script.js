// Scrollbar — showcase all scrollbar plugin options
// Uses a contact list as the canvas to demonstrate native, custom, and none modes.

import { createVList, scrollbar, selection, rebuild } from "vlist";
import { makeContacts } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";
import { restoreFromStorage } from "./controls.js";

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = "scrollbar-list";
const CONFIG_KEY = "scrollbar-config";
const TOTAL = 100_000;
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
export let autoHide = false;
export let autoHideDelay = 1000;
export let gutterEnabled = false;
export let showOnHover = true;
export let showOnViewportEnter = true;
export let paddingX = 2;
export let paddingY = 2;
export let minThumbSize = 15;
export let clickBehavior = "scroll"; // "jump" | "scroll"
export let width = 8;
export let radius = 4;
export let list = null;

export function setMode(v) {
  mode = v;
}
export function setAutoHide(v) {
  autoHide = v;
}
export function setAutoHideDelay(v) {
  autoHideDelay = v;
}
export function setGutterEnabled(v) {
  gutterEnabled = v;
}
export function setShowOnHover(v) {
  showOnHover = v;
}
export function setShowOnViewportEnter(v) {
  showOnViewportEnter = v;
}
export function setPaddingX(v) {
  paddingX = v;
}
export function setPaddingY(v) {
  paddingY = v;
}
export function setMinThumbSize(v) {
  minThumbSize = v;
}
export function setClickBehavior(v) {
  clickBehavior = v;
}
export function setWidth(v) {
  width = v;
}
export function setRadius(v) {
  radius = v;
}

// =============================================================================
// Persist / restore config
// =============================================================================

export function saveConfig() {
  const config = {
    mode,
    autoHide,
    autoHideDelay,
    gutterEnabled,
    showOnHover,
    showOnViewportEnter,
    paddingX,
    paddingY,
    minThumbSize,
    clickBehavior,
    width,
    radius,
  };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {}
}

export function restoreConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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

let listVersion = 0;

export function shellIsSynthetic() {
  const fromUrl = new URLSearchParams(location.search).get("mode");
  if (fromUrl === "synthetic") return true;
  if (fromUrl === "native") return false;
  return /(?:^|; )vlist-scroll-mode=synthetic(?:;|$)/.test(document.cookie);
}

function scrollbarPlugin() {
  return scrollbar({
    autoHide,
    autoHideDelay,
    gutter: gutterEnabled,
    showOnHover,
    showOnViewportEnter,
    padding: { top: paddingY, right: paddingX, bottom: paddingY, left: paddingX },
    clickBehavior,
    minThumbSize,
    width,
    radius,
  });
}

export async function createList() {
  const version = ++listVersion;

  // "native" is the browser bar, which the shell disables while Synthetic is
  // selected; "none" is synthetic input with its drawn bar skipped. Both pin
  // scroll.mode. "custom" follows the page's scroll switch.
  const scroll = mode === "none"
    ? { mode: "synthetic", scrollbar: "none" }
    : mode === "native" ? { mode: "native" } : undefined;

  const newList = await rebuild(list, (snap) => {
    const plugins = [];
    if (mode === "custom") plugins.push(scrollbarPlugin());

    plugins.push(selection());
    plugins.push(snap);

    return createVList(
      {
        container: "#list-container",
        ariaLabel: "Scrollbar demo — contact list",
        item: { height: ITEM_HEIGHT, template: renderContact },
        items: contacts,
        ...(scroll ? { scroll } : {}),
      },
      plugins,
    );
  }, { key: STORAGE_KEY, transition: 50 });

  if (version !== listVersion) {
    newList.destroy();
    return;
  }

  list = newList;

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
// Init — restore saved config (if any), then create the list
// =============================================================================

restoreFromStorage();
createList();
