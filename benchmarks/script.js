// benchmarks/script.js — Benchmark Dashboard
//
// Page-aware entry point: reads `data-page` from the #content element
// and builds the appropriate UI. The shell (header, sidebar) is
// server-rendered; this script handles the interactive content area.

// Import HTML templates
import {
  buildSuitePageHTML,
  buildBundlePageHTML,
  buildFeaturesPageHTML,
  buildComparisonsOverviewHTML,
  buildPerformanceComparisonHTML,
} from "./templates.js";

// Import data files
import BUNDLE_DATA from "./data/bundle.json";
import PERFORMANCE_DATA from "./data/performance.json";
import FEATURES_DATA from "./data/features.json";
import vlistPackage from "@floor/vlist/package.json";

// Import suites (side-effect: each calls defineSuite())
// All benchmark suites - variants imported statically
import "./suites/render/javascript/suite.js";
import "./suites/render/react/suite.js";
import "./suites/render/solidjs/suite.js";
import "./suites/render/vue/suite.js";
import "./suites/render/svelte/suite.js";

import "./suites/scroll/javascript/suite.js";
import "./suites/scroll/react/suite.js";
import "./suites/scroll/solidjs/suite.js";
import "./suites/scroll/vue/suite.js";
import "./suites/scroll/svelte/suite.js";

import "./suites/memory/javascript/suite.js";
import "./suites/memory/react/suite.js";
import "./suites/memory/solidjs/suite.js";
import "./suites/memory/vue/suite.js";
import "./suites/memory/svelte/suite.js";

import "./suites/scrollto/javascript/suite.js";
import "./suites/scrollto/react/suite.js";
import "./suites/scrollto/solidjs/suite.js";
import "./suites/scrollto/vue/suite.js";
import "./suites/scrollto/svelte/suite.js";

// Comparison suites
import "./comparison/react-window.js";
import "./comparison/tanstack-virtual.js";
import "./comparison/virtua.js";
import "./comparison/vue-virtual-scroller.js";
import "./comparison/solidjs.js";

import { SCROLL_SPEEDS } from "./suites/scroll/constants.js";

// =============================================================================
// Variant Support
// =============================================================================

/** Benchmarks that have variant-based structure */
const VARIANT_BENCHMARKS = {
  render: ["vanilla", "react", "solidjs", "vue", "svelte"],
  scroll: ["vanilla", "react", "solidjs", "vue", "svelte"],
  memory: ["vanilla", "react", "solidjs", "vue", "svelte"],
  scrollto: ["vanilla", "react", "solidjs", "vue", "svelte"],
};

/**
 * Parse variant from URL query string (e.g., ?variant=react)
 */
function parseVariant(url) {
  const params = new URLSearchParams(url || window.location.search);
  const variant = params.get("variant");
  // Support legacy "javascript" query param
  if (variant === "javascript") return "vanilla";
  return variant || "vanilla"; // default
}

/**
 * Check which variants exist for a benchmark.
 */
function detectVariants(benchmark) {
  return VARIANT_BENCHMARKS[benchmark] || [];
}

/**
 * Build variant switcher HTML (client-side version)
 */
function buildVariantSwitcher(benchmark, activeVariant) {
  const variants = detectVariants(benchmark);
  if (variants.length === 0) return "";

  const VARIANT_LABELS = {
    vanilla: "Vanilla",
    react: "React",
    solidjs: "SolidJS",
    vue: "Vue",
    svelte: "Svelte",
  };

  // Always show all 5 variants, mark missing ones as disabled
  const allVariants = ["vanilla", "react", "solidjs", "vue", "svelte"];

  let html = '<div class="variant-switcher">';
  for (const variant of allVariants) {
    const exists = variants.includes(variant);
    const isActive = variant === activeVariant;

    let classes = "variant-switcher__option";
    if (isActive) classes += " variant-switcher__option--active";
    if (!exists) classes += " variant-switcher__option--disabled";

    if (exists) {
      const params = new URLSearchParams(window.location.search);
      params.set("variant", variant);
      const url = `/benchmarks/${benchmark}?${params.toString()}`;
      html += `<a href="${url}" class="${classes}">${VARIANT_LABELS[variant]}</a>`;
    } else {
      // Disabled variant (not a link)
      html += `<span class="${classes}">${VARIANT_LABELS[variant]}</span>`;
    }
  }
  html += "</div>";
  return html;
}

// Import runner
import {
  getSuites,
  getSuite,
  runBenchmarks,
  formatItemCount,
} from "./runner.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_COUNTS = [10_000, 100_000, 1_000_000];
const DEFAULT_ITEM_COUNT_INDEX = 0; // Start with 10K selected

// Convert features data from JSON to array format for backward compatibility
const FEATURE_LIBS = FEATURES_DATA.libraries;
const FEATURE_DATA = FEATURES_DATA.features.map((f) => [f.name, ...f.support]);

// =============================================================================
// Shared State
// =============================================================================

let selectedItemCounts = [ITEM_COUNTS[DEFAULT_ITEM_COUNT_INDEX]];
let selectedStressMs = 0;
let selectedScrollSpeed = SCROLL_SPEEDS[0].pxPerSec;
let isRunning = false;
let abortController = null;

// results[suiteId][itemCount] = BenchmarkResult
const results = {};

// DOM references (populated by build* functions)
const dom = {
  runBtn: null,
  statusEl: null,
  progressBar: null,
  progressText: null,
  progressContainer: null,
  suitesContainer: null,
  suiteCards: new Map(), // suiteId → { card, statusEl, metricsContainer, tabs, runBtn, viewport, viewportInner }
  sizeBtns: [],
};

// =============================================================================
// Suite Page
// =============================================================================

function buildSuitePage(root, suite) {
  // Preserve server-rendered variant switcher if it exists
  const existingVariantSwitcher = root.querySelector(".variant-switcher");
  const variantSwitcherHTML = existingVariantSwitcher
    ? existingVariantSwitcher.outerHTML
    : "";

  root.innerHTML = buildSuitePageHTML(suite, variantSwitcherHTML);

  // Cache DOM refs
  dom.runBtn = root.querySelector("#bench-run");
  dom.statusEl = root.querySelector("#bench-status");
  dom.progressBar = root.querySelector("#bench-progress-bar");
  dom.progressText = root.querySelector("#bench-progress-text");
  dom.progressContainer = root.querySelector("#bench-progress");
  dom.suitesContainer = root.querySelector("#bench-suites");

  // Build size buttons
  buildSizeButtons(root.querySelector("#bench-sizes"));

  // Wire up stress buttons (comparison suites only)
  const stressContainer = root.querySelector("#bench-stress");
  if (stressContainer) {
    const stressBtns = stressContainer.querySelectorAll(".bench-stress-btn");
    stressBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isRunning) return;
        selectedStressMs = parseInt(btn.dataset.stress, 10);
        stressBtns.forEach((b) =>
          b.classList.toggle(
            "bench-size-btn--active",
            b.dataset.stress === btn.dataset.stress,
          ),
        );
      });
    });
  }

  // Wire up scroll speed buttons (scroll suites only)
  const speedContainer = root.querySelector("#bench-scroll-speed");
  if (speedContainer) {
    const speedBtns = speedContainer.querySelectorAll(".bench-speed-btn");
    speedBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (isRunning) return;
        selectedScrollSpeed = parseInt(btn.dataset.speed, 10);
        speedBtns.forEach((b) =>
          b.classList.toggle(
            "bench-size-btn--active",
            b.dataset.speed === btn.dataset.speed,
          ),
        );
      });
    });
  }

  // Build suite card (single)
  buildSuiteCards(root.querySelector("#bench-suites"), [suite]);

  // Wire up run button
  dom.runBtn.addEventListener("click", () => handleSuiteRunClick(suite.id));
}

// =============================================================================
// Bundle Page
// =============================================================================

function buildBundlePage(root) {
  root.innerHTML = buildBundlePageHTML(BUNDLE_DATA);
}

// =============================================================================
// Comparisons Overview Page
// =============================================================================

function buildComparisonsOverviewPage(root) {
  root.innerHTML = buildComparisonsOverviewHTML();
}

// =============================================================================
// Performance Comparison Page
// =============================================================================

function buildPerformanceComparisonPage(root) {
  root.innerHTML = buildPerformanceComparisonHTML(PERFORMANCE_DATA);
}

// =============================================================================
// Features Page
// =============================================================================

function buildFeaturesPage(root) {
  root.innerHTML = buildFeaturesPageHTML(FEATURE_LIBS, FEATURE_DATA);
}

// =============================================================================
// Size Buttons
// =============================================================================

const buildSizeButtons = (container) => {
  dom.sizeBtns = [];

  ITEM_COUNTS.forEach((count, i) => {
    const btn = document.createElement("button");
    btn.className = "bench-size-btn";
    btn.textContent = formatItemCount(count);
    btn.dataset.count = String(count);

    if (i === DEFAULT_ITEM_COUNT_INDEX) {
      btn.classList.add("bench-size-btn--active");
    }

    btn.addEventListener("click", () => handleSizeClick(count));
    container.appendChild(btn);
    dom.sizeBtns.push(btn);
  });
};

const handleSizeClick = (count) => {
  if (isRunning) return;

  const wasSelected = selectedItemCounts.includes(count);

  if (wasSelected && selectedItemCounts.length > 1) {
    // Deselect (but keep at least one selected)
    selectedItemCounts = selectedItemCounts.filter((c) => c !== count);
  } else if (wasSelected && selectedItemCounts.length === 1) {
    // Can't deselect the last one — do nothing
    return;
  } else {
    // Select this one (toggle: add to selection)
    selectedItemCounts.push(count);
    selectedItemCounts.sort((a, b) => a - b);
  }

  // Update button states
  dom.sizeBtns.forEach((btn) => {
    const btnCount = parseInt(btn.dataset.count);
    btn.classList.toggle(
      "bench-size-btn--active",
      selectedItemCounts.includes(btnCount),
    );
  });

  // Update tab visibility for all suite cards
  updateAllTabs();
};

// =============================================================================
// Suite Cards
// =============================================================================

const buildSuiteCards = (container, suites) => {
  for (const suite of suites) {
    // Create a wrapper to hold both viewport and suite card as a unit
    const wrapper = document.createElement("div");
    wrapper.className = "bench-suite-wrapper";
    wrapper.id = `wrapper-${suite.id}`;

    // Create viewport element
    const viewport = document.createElement("div");
    viewport.className = "bench-viewport";
    viewport.id = `viewport-${suite.id}`;
    viewport.innerHTML = `
      <span class="bench-viewport__label">live</span>
      <div class="bench-viewport__inner" id="viewport-inner-${suite.id}"></div>
    `;

    // Create suite card
    const card = document.createElement("div");
    card.className = "bench-suite";
    card.id = `suite-${suite.id}`;

    // Build tabs for item counts
    const tabsHtml = ITEM_COUNTS.map(
      (count) =>
        `<button class="bench-tab" data-suite="${suite.id}" data-count="${count}">${formatItemCount(count)}</button>`,
    ).join("");

    card.innerHTML = `
      <div class="bench-suite__header">
        <span class="bench-suite__icon">${suite.icon}</span>
        <h3 class="bench-suite__name">${suite.name}</h3>
      </div>
      <p class="bench-suite__desc">${suite.description}</p>
      <div class="bench-suite__status" id="status-${suite.id}"></div>
      <div class="bench-suite__tabs" id="tabs-${suite.id}">${tabsHtml}</div>
      <div class="bench-metrics" id="metrics-${suite.id}">
        <div class="bench-metric bench-metric--empty">
          <span class="bench-metric__value">Click "Run" to benchmark</span>
        </div>
      </div>
    `;

    // Append viewport and card to wrapper, then append wrapper to container
    wrapper.appendChild(viewport);
    wrapper.appendChild(card);
    container.appendChild(wrapper);

    // Cache refs
    const statusEl = card.querySelector(`#status-${suite.id}`);
    const metricsContainer = card.querySelector(`#metrics-${suite.id}`);
    const tabsContainer = card.querySelector(`#tabs-${suite.id}`);
    const tabs = Array.from(tabsContainer.querySelectorAll(".bench-tab"));
    const viewportInner = viewport.querySelector(`#viewport-inner-${suite.id}`);

    dom.suiteCards.set(suite.id, {
      card,
      statusEl,
      metricsContainer,
      tabs,
      tabsContainer,
      viewport,
      viewportInner,
      activeTab: null,
    });

    // Wire up tabs
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const count = parseInt(tab.dataset.count);
        setActiveTab(suite.id, count);
      });
    });

    // Initialize tabs
    updateTabs(suite.id);
  }
};

// =============================================================================
// Tab Management
// =============================================================================

const updateAllTabs = () => {
  for (const suiteId of dom.suiteCards.keys()) {
    updateTabs(suiteId);
  }
};

const updateTabs = (suiteId) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  // Show/hide tabs based on selectedItemCounts
  ref.tabs.forEach((tab) => {
    const count = parseInt(tab.dataset.count);
    tab.style.display = selectedItemCounts.includes(count) ? "" : "none";
  });

  // If current active tab is not in selected counts, switch to first selected
  const currentActive = ref.activeTab;
  if (!currentActive || !selectedItemCounts.includes(currentActive)) {
    setActiveTab(suiteId, selectedItemCounts[0]);
  }
};

const setActiveTab = (suiteId, itemCount) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  ref.activeTab = itemCount;

  // Update tab button states
  ref.tabs.forEach((tab) => {
    const count = parseInt(tab.dataset.count);
    const isActive = count === itemCount;
    tab.classList.toggle("bench-tab--active", isActive);
  });

  // Render the metrics for this tab
  renderMetrics(suiteId, itemCount);
};

// =============================================================================
// Metrics Rendering
// =============================================================================

const renderMetrics = (suiteId, itemCount) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  const result = results[suiteId]?.[itemCount];

  if (!result) {
    ref.metricsContainer.innerHTML = `
      <div class="bench-metric bench-metric--empty">
        <span class="bench-metric__value">—</span>
      </div>
    `;
    return;
  }

  if (!result.success) {
    ref.metricsContainer.innerHTML = `
      <div class="bench-suite__error">${escapeHtml(result.error || "Unknown error")}</div>
    `;
    return;
  }

  ref.metricsContainer.innerHTML = result.metrics
    .map((metric) => {
      const ratingClass = metric.rating
        ? ` bench-metric--${metric.rating}`
        : "";
      const valueText =
        metric.displayValue != null
          ? escapeHtml(metric.displayValue)
          : metric.value.toLocaleString();
      const metaHtml = metric.meta
        ? `<span class="bench-metric__meta">${escapeHtml(metric.meta)}</span>`
        : "";
      return `
        <div class="bench-metric${ratingClass}">
          <span class="bench-metric__label">${escapeHtml(metric.label)}${metaHtml}</span>
          <span class="bench-metric__value">
            ${valueText}
            ${metric.unit ? `<span class="bench-metric__unit">${escapeHtml(metric.unit)}</span>` : ""}
          </span>
        </div>
      `;
    })
    .join("");
};

// =============================================================================
// Run Logic
// =============================================================================

const handleSuiteRunClick = async (suiteId) => {
  if (isRunning) {
    // Stop
    abortController?.abort();
    return;
  }

  isRunning = true;
  abortController = new AbortController();

  setRunningState(true);
  setSuiteState(suiteId, "running");
  showViewport(suiteId);

  const totalSteps = selectedItemCounts.length;
  let completedSteps = 0;
  let currentStepProgress = 0;

  // Helper to update progress with sub-step granularity
  const updateProgress = () => {
    const baseProgress = completedSteps / totalSteps;
    const currentStepWeight = 1 / totalSteps;
    const totalProgress =
      baseProgress + currentStepProgress * currentStepWeight;
    setProgress(totalProgress);
  };

  // Initialize progress bar
  setProgress(0);

  try {
    await runBenchmarks({
      itemCounts: selectedItemCounts,
      suiteIds: [suiteId],
      stressMs: selectedStressMs,
      scrollSpeed: selectedScrollSpeed,
      getContainer: (sid) => getViewportContainer(sid),
      signal: abortController.signal,

      onStatus: (sid, itemCount, message) => {
        updateSuiteStatus(sid, itemCount, message);
        setGlobalStatus(`${formatItemCount(itemCount)} — ${message}`);

        // Estimate progress based on status message
        // Phase-based progress (scroll benchmark)
        if (message.includes("Waking up display")) {
          currentStepProgress = 0.1;
        } else if (message.includes("Checking rAF rate")) {
          currentStepProgress = 0.2;
        } else if (message.includes("Preparing")) {
          currentStepProgress = 0.05;
        } else if (message.includes("Warming up")) {
          currentStepProgress = 0.3;
        } else if (
          message.includes("Measuring") ||
          message.includes("Running")
        ) {
          currentStepProgress = 0.4;
        } else if (
          message.includes("Scrolling") &&
          !message.includes("remaining")
        ) {
          // Initial "Scrolling for Xs..." message
          currentStepProgress = 0.4;
        } else if (message.match(/Scrolling\.\.\. (\d+)s remaining/)) {
          // Memory benchmark: "Scrolling... Xs remaining"
          const match = message.match(/Scrolling\.\.\. (\d+)s remaining/);
          const remaining = parseInt(match[1], 10);
          // SCROLL_DURATION_MS is 10s, so calculate elapsed
          const totalSeconds = 10;
          const elapsed = totalSeconds - remaining;
          const progress = elapsed / totalSeconds;
          // Map from 0.4 to 0.95 of the current step
          currentStepProgress = 0.4 + progress * 0.55;
        } else if (message.includes("Creating list")) {
          currentStepProgress = 0.5;
        } else if (message.includes("Measuring baseline")) {
          currentStepProgress = 0.15;
        } else if (message.match(/Iteration (\d+)\/(\d+)/)) {
          // Render benchmark: "Iteration X/Y"
          const match = message.match(/Iteration (\d+)\/(\d+)/);
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          // Map iterations from 0.4 to 0.95 of the current step
          currentStepProgress = 0.4 + (current / total) * 0.55;
        } else if (message.match(/Jump (\d+)\/(\d+)/)) {
          // ScrollTo benchmark: "Jump X/Y → index N"
          const match = message.match(/Jump (\d+)\/(\d+)/);
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          // Map jumps from 0.4 to 0.95 of the current step
          currentStepProgress = 0.4 + (current / total) * 0.55;
        }
        updateProgress();
      },

      onResult: (result) => {
        storeResult(result);
        completedSteps++;
        currentStepProgress = 0;
        updateProgress();

        // Mark tab as done
        markTabDone(result.suiteId, result.itemCount);

        // If this is the active tab, re-render
        const ref = dom.suiteCards.get(result.suiteId);
        if (ref?.activeTab === result.itemCount) {
          renderMetrics(result.suiteId, result.itemCount);
        }
      },

      onComplete: () => {
        setSuiteState(suiteId, "done");
        hideViewport(suiteId);
      },
    });
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Benchmark error:", err);
    }
  }

  hideViewport(suiteId);
  isRunning = false;
  abortController = null;
  setRunningState(false);
  setGlobalStatus("Done ✓");

  // Fade out progress bar after a moment
  setTimeout(() => setProgress(0), 1500);
};

// =============================================================================
// State Updates
// =============================================================================

const storeResult = (result) => {
  if (!results[result.suiteId]) {
    results[result.suiteId] = {};
  }
  results[result.suiteId][result.itemCount] = result;
};

const setRunningState = (running) => {
  if (dom.runBtn) {
    dom.runBtn.textContent = running ? "■ Stop" : "▶ Run";
    dom.runBtn.classList.toggle("bench-run-btn--stop", running);
  }

  // Disable size buttons while running
  dom.sizeBtns.forEach((btn) => (btn.disabled = running));

  if (dom.progressContainer) {
    dom.progressContainer.classList.toggle("bench-progress--active", running);
  }

  // Switch to single-column layout while running so the active suite + viewport is larger
  dom.suitesContainer?.classList.toggle("bench-suites--running", running);
};

const setGlobalStatus = (message) => {
  if (!dom.statusEl) return;
  dom.statusEl.textContent = message;
  dom.statusEl.classList.toggle("bench-status--running", isRunning);
};

const setProgress = (fraction) => {
  if (!dom.progressBar || !dom.progressContainer) return;
  const pct = Math.round(fraction * 100);
  dom.progressBar.style.width = `${pct}%`;

  if (dom.progressText) {
    dom.progressText.textContent = `${pct}%`;
  }

  if (fraction === 0) {
    dom.progressContainer.classList.remove("bench-progress--active");
    if (dom.progressText) {
      dom.progressText.textContent = "0%";
    }
  } else {
    dom.progressContainer.classList.add("bench-progress--active");
  }
};

const setSuiteState = (suiteId, state) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  ref.card.classList.remove("bench-suite--running", "bench-suite--done");
  if (state === "running") ref.card.classList.add("bench-suite--running");
  if (state === "done") ref.card.classList.add("bench-suite--done");
};

const updateSuiteStatus = (suiteId, itemCount, message) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  ref.statusEl.textContent = `${formatItemCount(itemCount)}: ${message}`;
  ref.statusEl.classList.toggle("bench-suite__status--running", true);

  // Also mark the tab for this itemCount as running
  ref.tabs.forEach((tab) => {
    const count = parseInt(tab.dataset.count);
    if (count === itemCount) {
      tab.classList.add("bench-tab--running");
    }
  });
};

const markTabDone = (suiteId, itemCount) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  ref.tabs.forEach((tab) => {
    const count = parseInt(tab.dataset.count);
    if (count === itemCount) {
      tab.classList.remove("bench-tab--running");
      tab.classList.add("bench-tab--done");
    }
  });

  // Clear status if all selected counts are done for this suite
  const allDone = selectedItemCounts.every(
    (count) => results[suiteId]?.[count],
  );
  if (allDone) {
    ref.statusEl.textContent = "";
    ref.statusEl.classList.remove("bench-suite__status--running");
  }
};

// =============================================================================
// Viewport Management (visible on-screen for accurate 60fps rendering)
// =============================================================================

/**
 * Get the inner container element for a suite's benchmark viewport.
 * This is an on-screen, visible div so the browser renders at full frame rate.
 * @param {string} suiteId
 * @returns {HTMLElement}
 */
const getViewportContainer = (suiteId) => {
  const ref = dom.suiteCards.get(suiteId);
  return ref?.viewportInner || document.createElement("div");
};

/**
 * Show the live viewport for a suite (makes it visible so browser renders at 60fps).
 * Scrolls the card into the browser's visual viewport — Chrome throttles rAF
 * for elements that are off-screen, which would artificially cap FPS at ~30.
 * @param {string} suiteId
 */
const showViewport = (suiteId) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;
  ref.viewport.classList.add("bench-viewport--active");
  ref.viewportInner.innerHTML = "";

  // Scroll the card into the browser's visible viewport so Chrome
  // delivers full-rate rAF (60fps+). Without this, off-screen elements
  // get throttled to ~30fps.
  ref.card.scrollIntoView({ behavior: "instant", block: "nearest" });
};

/**
 * Hide the live viewport for a suite.
 * @param {string} suiteId
 */
const hideViewport = (suiteId) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;
  ref.viewport.classList.remove("bench-viewport--active");
  ref.viewportInner.innerHTML = "";
};

// =============================================================================
// Helpers
// =============================================================================

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

const getVlistVersion = () => {
  return vlistPackage.version;
};

// =============================================================================
// Boot
// =============================================================================

const root = document.getElementById("content");
if (root) {
  const page = root.dataset.page || "overview";

  if (page === "bundle") {
    buildBundlePage(root);
  } else if (page === "features") {
    buildFeaturesPage(root);
  } else if (page === "comparisons") {
    buildComparisonsOverviewPage(root);
  } else if (page === "performance-comparison") {
    buildPerformanceComparisonPage(root);
  } else {
    // Suite page (render, scroll, memory, scrollto)
    const variants = detectVariants(page);

    if (variants.length > 0) {
      // New variant-based structure - suites are statically imported
      const variant = parseVariant();
      const variantSwitcher = buildVariantSwitcher(page, variant);
      const suiteId = `${page}-${variant}`;
      const suite = getSuite(suiteId);

      if (suite) {
        buildSuitePage(root, suite);
      } else {
        root.innerHTML = `<div class="bench-page"><p>Variant "${variant}" not found for "${page}"</p></div>`;
      }
    } else {
      // Legacy structure (scroll, memory, scrollto)
      const suite = getSuite(page);
      if (suite) {
        buildSuitePage(root, suite);
      }
    }
  }
}
