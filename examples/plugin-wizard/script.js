// Plugin Explorer — Discover vlist's composable plugins
// Demonstrates scroll.wheel: false, wrap, button-only navigation

import { createVList, carousel } from "vlist";
import { createStats } from "../stats.js";
import { createInfoUpdater } from "../info.js";

import { PLUGINS } from "../../src/data/plugins.js";

const TOTAL = PLUGINS.length;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// =============================================================================
// Syntax highlighting (reused from code-explorer)
// =============================================================================

const KW = new Set([
  "export", "function", "const", "let", "var", "interface", "type", "class",
  "enum", "extends", "implements", "readonly", "async", "abstract", "static",
  "declare", "import", "from", "new", "return", "default", "of", "in", "await",
]);
const TYPES = new Set([
  "string", "number", "boolean", "void", "null", "undefined", "any",
  "unknown", "never", "true", "false", "Promise", "Array", "Record",
  "Set", "Map", "Partial", "Required", "Omit", "Pick",
]);
const TOKEN_RE = /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b[A-Za-z_$][\w$]*\b)|(\d+(?:\.\d+)?)|([<>()[\]{};:,=|&?.]|=>|\.\.\.)/g;

function syntaxHighlight(raw) {
  let out = "";
  let last = 0;
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(raw)) !== null) {
    if (m.index > last) out += esc(raw.slice(last, m.index));
    const [tok, str, ident, num, punct] = m;
    const e = esc(tok);
    if (str) out += `<span class="syn-str">${e}</span>`;
    else if (num) out += `<span class="syn-num">${e}</span>`;
    else if (punct) out += `<span class="syn-punct">${e}</span>`;
    else if (ident && KW.has(ident)) out += `<span class="syn-kw">${e}</span>`;
    else if (ident && TYPES.has(ident)) out += `<span class="syn-type">${e}</span>`;
    else out += e;
    last = m.index + tok.length;
  }
  if (last < raw.length) out += esc(raw.slice(last));
  return out;
}

// =============================================================================
// State
// =============================================================================

let currentIndex = 0;
let currentOrientation = "vertical";
let list = null;

// =============================================================================
// Template
// =============================================================================

const CATEGORY_COLORS = {
  Core: "#667eea",
  Layout: "#38bdf8",
  Interaction: "#a78bfa",
  Organization: "#34d399",
  Data: "#fb923c",
  Performance: "#f87171",
  UI: "#f472b6",
  State: "#facc15",
};

const itemTemplate = (item) => {
  const color = CATEGORY_COLORS[item.category] || "#94a3b8";
  const features = item.features.map((f) => `<li>${esc(f)}</li>`).join("");
  return `
    <div class="plugin-card">
      <div class="plugin-card__header">
        <div class="plugin-card__title-row">
          <h2 class="plugin-card__name">${esc(item.name)}</h2>
          <span class="plugin-card__size">${esc(item.size)}</span>
        </div>
        <span class="plugin-card__category" style="color:${color};border-color:${color}33;background:${color}14">${esc(item.category)}</span>
      </div>
      <p class="plugin-card__tagline">${esc(item.tagline)}</p>
      <p class="plugin-card__desc">${esc(item.description)}</p>
      <ul class="plugin-card__features">${features}</ul>
      <div class="plugin-card__code-wrap">
        <button class="plugin-card__copy" title="Copy code" data-code="${esc(item.code)}">Copy</button>
        <pre class="plugin-card__code"><code>${syntaxHighlight(item.code)}</code></pre>
      </div>
    </div>
  `;
};

// =============================================================================
// Stats
// =============================================================================

const ITEM_HEIGHT = 480;

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => TOTAL,
  getItemSize: () => ITEM_HEIGHT,
  getContainerSize: () =>
    document.querySelector("#list-container")?.clientHeight ?? 0,
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Create list
// =============================================================================

function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  const container = document.getElementById("list-container");
  container.innerHTML = "";

  const isH = currentOrientation === "horizontal";
  const wizardEl = document.querySelector(".wizard");
  wizardEl.classList.toggle("wizard--horizontal", isH);

  const containerWidth = isH ? container.clientWidth : undefined;

  list = createVList({
    container: "#list-container",
    orientation: currentOrientation,
    scroll: { scrollbar: "none" },
    ariaLabel: "Plugin explorer",
    item: {
      height: ITEM_HEIGHT,
      width: isH ? containerWidth : undefined,
      template: itemTemplate,
    },
    items: PLUGINS,
  }, [
    carousel({ variant: "static", snap: true, snapDuration: 400, initialIndex: currentIndex }),
  ]);

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  list.on("item:click", ({ index }) => goTo(index % TOTAL));

  // Update dots and panel when scrolling changes the active card
  list.on("carousel:change", ({ index }) => {
    currentIndex = index;
    updateCurrentInfo();
    updateDots();
    updateStep();
  });

  updateInfo();
}

// =============================================================================
// Navigation
// =============================================================================

function goTo(index, instant = false) {
  currentIndex = ((index % TOTAL) + TOTAL) % TOTAL;

  if (list) {
    list.goTo(currentIndex, {
      behavior: instant ? "auto" : "smooth",
      duration: instant ? 0 : 400,
    });
  }

  updateCurrentInfo();
  updateDots();
  updateInfo();
  updateStep();
}

// =============================================================================
// Step indicator dots
// =============================================================================

const indicatorEl = document.getElementById("step-indicator");

function updateDots() {
  indicatorEl.innerHTML = PLUGINS
    .map((_, i) =>
      `<span class="dot ${i === currentIndex ? "dot-active" : ""}" data-index="${i}"></span>`,
    )
    .join("");
}

indicatorEl.addEventListener("click", (e) => {
  const dot = e.target.closest(".dot");
  if (dot) goTo(Number(dot.dataset.index));
});

// =============================================================================
// Current plugin info (panel)
// =============================================================================

const currentNameEl = document.getElementById("current-name");
const currentSizeEl = document.getElementById("current-size");
const currentCategoryEl = document.getElementById("current-category");
const infoStepEl = document.getElementById("info-step");

function updateCurrentInfo() {
  const p = PLUGINS[currentIndex];
  currentNameEl.textContent = p.name;
  currentSizeEl.textContent = p.size;
  currentCategoryEl.textContent = p.category;
}

function updateStep() {
  infoStepEl.textContent = `${currentIndex + 1} / ${TOTAL}`;
}

// =============================================================================
// Controls — prev/next/first/last/random
// =============================================================================

document.getElementById("btn-prev").addEventListener("click", () => goTo(currentIndex - 1));
document.getElementById("btn-next").addEventListener("click", () => goTo(currentIndex + 1));
document.getElementById("btn-first").addEventListener("click", () => goTo(0));
document.getElementById("btn-last").addEventListener("click", () => goTo(TOTAL - 1));
document.getElementById("btn-random").addEventListener("click", () =>
  goTo(Math.floor(Math.random() * TOTAL)),
);

// =============================================================================
// Copy button
// =============================================================================

document.getElementById("list-container").addEventListener("click", (e) => {
  const btn = e.target.closest(".plugin-card__copy");
  if (!btn) return;
  const code = btn.getAttribute("data-code");
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = "Copied!";
    setTimeout(() => { btn.textContent = "Copy"; }, 1500);
  });
});

// =============================================================================
// Orientation toggle
// =============================================================================

document.getElementById("orientation-mode").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-orientation]");
  if (!btn) return;
  const orientation = btn.dataset.orientation;
  if (orientation === currentOrientation) return;

  currentOrientation = orientation;
  document.querySelectorAll("#orientation-mode .ui-segmented__btn").forEach((b) => {
    b.classList.toggle("ui-segmented__btn--active", b.dataset.orientation === orientation);
  });

  createList();
});

// =============================================================================
// Initialise
// =============================================================================

createList();
