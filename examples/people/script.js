// People — search over a curated list of notable people.
// Demonstrates the search() plugin: filter vs navigate modes, field scoping,
// match highlighting, and the match counter — composed with selection for a
// click-to-detail panel.

import { createVList, search, selection } from "vlist";
import { PEOPLE } from "../../src/data/people.js";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";

// =============================================================================
// Constants
// =============================================================================

export const ITEM_HEIGHT = 56;

// =============================================================================
// State — exported so the control panel can read/write
// =============================================================================

export let searchEnabled = true;
export let currentMode = "filter"; // "filter" | "navigate"
export let currentField = "all"; // "all" | "name" | "category" | "country"
export let list = null;

export function setSearchEnabled(v) {
  searchEnabled = v;
}
export function setCurrentMode(v) {
  currentMode = v;
}
export function setCurrentField(v) {
  currentField = v;
}

// =============================================================================
// Template
// =============================================================================

const CATEGORIES = ["Scientist", "Actor", "Musician", "Athlete", "Leader", "Writer", "Artist"];

const initials = (name) =>
  name
    .replace(/[^\p{L} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

const renderPerson = (item) => `
  <div class="person">
    <div class="person__avatar person__avatar--${item.category.toLowerCase()}">${initials(item.name)}</div>
    <div class="person__info">
      <div class="person__name">${item.name}</div>
      <div class="person__meta">
        <span class="person__badge">${item.category}</span>
        ${item.country} · ${item.year < 0 ? `${-item.year} BC` : item.year}
      </div>
    </div>
  </div>
`;

// =============================================================================
// Stats — shared info bar (progress, velocity, visible/total)
// =============================================================================

export const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => list?.total ?? PEOPLE.length,
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

  const plugins = [];
  if (searchEnabled) {
    plugins.push(
      search({
        mode: currentMode,
        placeholder: currentMode === "filter" ? "Filter people…" : "Find a person…",
        field: currentField === "all" ? undefined : currentField,
      }),
    );
  }
  plugins.push(selection({ mode: "single" }));

  list = createVList(
    {
      container: "#list-container",
      ariaLabel: "Notable people",
      item: { height: ITEM_HEIGHT, template: renderPerson },
      items: PEOPLE,
    },
    plugins,
  );

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
  if (searchEnabled) {
    list.on("search:change", ({ matches, total }) => {
      updateMatchInfo(matches, total);
      updateInfo();
    });
    list.on("search:match", ({ matchIndex, matches }) => {
      updateMatchInfo(matches, list?.total ?? PEOPLE.length, matchIndex);
    });
  }
  list.on("selection:change", ({ items }) => {
    if (items.length > 0) showDetail(items[0]);
    else clearDetail();
  });

  reflectSearchEnabled();
  updateInfo();
  updateMatchInfo(0, PEOPLE.length);
}

// Dim the mode/field controls and reset the match counter when search is off.
function reflectSearchEnabled() {
  for (const id of ["mode-section", "field-section"]) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle("ui-section--disabled", !searchEnabled);
  }
}

// =============================================================================
// Selected person detail (panel)
// =============================================================================

const detailEl = () => document.getElementById("person-detail");

function showDetail(p) {
  const el = detailEl();
  if (!el) return;
  el.innerHTML = `
    <div class="ui-detail__header">
      <div class="person__avatar person__avatar--${p.category.toLowerCase()}">${initials(p.name)}</div>
      <div>
        <div class="ui-detail__name">${p.name}</div>
        <div class="person-detail__cat">${p.category}</div>
      </div>
    </div>
    <div class="ui-detail__meta">
      <span>${p.country}</span>
      <span>Born ${p.year < 0 ? `${-p.year} BC` : p.year}</span>
    </div>
  `;
}

function clearDetail() {
  const el = detailEl();
  if (el) el.innerHTML = `<span class="ui-detail__empty">Click a person to see details</span>`;
}

// =============================================================================
// Match info (right side of the info bar)
// =============================================================================

function updateMatchInfo(matches, total, currentIndex) {
  const el = document.getElementById("info-matches");
  if (!el) return;
  if (!searchEnabled) {
    el.textContent = "off";
    return;
  }
  if (currentMode === "navigate" && matches > 0 && currentIndex != null) {
    el.textContent = `${currentIndex + 1} / ${matches}`;
  } else {
    el.textContent = `${matches} / ${total}`;
  }
}

// =============================================================================
// Boot
// =============================================================================

createList();

// Wire the control panel (segmented toggles). Each change rebuilds the list
// with a fresh search() config.
function wireSegment(id, setter) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-value]");
    if (!btn) return;
    setter(btn.dataset.value);
    el.querySelectorAll("button").forEach((b) =>
      b.classList.toggle("ui-segmented__btn--active", b === btn),
    );
    createList();
  });
}

wireSegment("mode-toggle", setCurrentMode);
wireSegment("field-toggle", setCurrentField);

const searchToggle = document.getElementById("search-toggle");
if (searchToggle) {
  searchToggle.addEventListener("change", (e) => {
    setSearchEnabled(e.target.checked);
    createList();
  });
}

export const categories = CATEGORIES;
