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

import { buildHistoryPage } from "./history.js";

// Import data files
import BUNDLE_DATA from "./data/bundle.json";
import PERFORMANCE_DATA from "./data/performance.json";
import FEATURES_DATA from "./data/features.json";
import vlistPackage from "@floor/vlist/package.json";

// =============================================================================
// Persistence — crowdsourced benchmark storage
// =============================================================================

/**
 * POST a benchmark result to /api/benchmarks for long-term storage.
 * Fire-and-forget: failures are logged but never block the UI.
 *
 * @param {import('./runner.js').BenchmarkResult} result
 * @param {object} [extra] - Additional config (stressMs, scrollSpeed)
 */
const persistResult = (result, extra = {}) => {
  if (!result.success) return; // don't store failures

  const payload = {
    version: vlistPackage.version,
    suiteId: result.suiteId,
    itemCount: result.itemCount,
    metrics: result.metrics.map((m) => ({
      label: m.label,
      value: m.value,
      unit: m.unit,
      better: m.better,
      rating: m.rating ?? null,
    })),
    duration: result.duration,
    success: result.success,
    error: result.error ?? undefined,
    stressMs: extra.stressMs ?? 0,
    scrollSpeed: extra.scrollSpeed ?? 0,

    // Environment
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency || null,
    deviceMemory: navigator.deviceMemory || null,
    screenWidth: screen.width,
    screenHeight: screen.height,
  };

  fetch("/api/benchmarks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silent — persistence is best-effort
  });
};

// Import suites (side-effect: each calls defineSuite())
// All benchmark suites - variants imported statically
import "./suites/render/vanilla/suite.js";
import "./suites/render/react/suite.js";
import "./suites/render/solidjs/suite.js";
import "./suites/render/vue/suite.js";
import "./suites/render/svelte/suite.js";

import "./suites/scroll/vanilla/suite.js";
import "./suites/scroll/react/suite.js";
import "./suites/scroll/solidjs/suite.js";
import "./suites/scroll/vue/suite.js";
import "./suites/scroll/svelte/suite.js";

import "./suites/memory/vanilla/suite.js";
import "./suites/memory/react/suite.js";
import "./suites/memory/solidjs/suite.js";
import "./suites/memory/vue/suite.js";
import "./suites/memory/svelte/suite.js";

import "./suites/scrollto/vanilla/suite.js";
import "./suites/scrollto/react/suite.js";
import "./suites/scrollto/solidjs/suite.js";
import "./suites/scrollto/vue/suite.js";
import "./suites/scrollto/svelte/suite.js";

// Comparison suites
import "./comparison/react-window.js";
import "./comparison/react-virtuoso.js";
import "./comparison/tanstack-virtual.js";
import "./comparison/virtua.js";
import "./comparison/vue-virtual-scroller.js";
import "./comparison/solidjs.js";
import "./comparison/legend-list.js";
import "./comparison/clusterize.js";

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

// Import comparison constants for progress tracking
import {
  SCROLL_DURATION_MS as COMP_SCROLL_DURATION_MS,
  COMPARISON_SCROLL_SPEEDS,
} from "./comparison/shared.js";

// =============================================================================
// Constants
// =============================================================================

const INITIAL_ITEM_COUNT = 10_000;

// Convert features data from JSON to array format for backward compatibility
const FEATURE_LIBS = FEATURES_DATA.libraries;
const FEATURE_DATA = FEATURES_DATA.features.map((f) => [f.name, ...f.support]);

// =============================================================================
// Shared State
// =============================================================================

let selectedItemCount = INITIAL_ITEM_COUNT;
let selectedStressMs = 0;
let selectedScrollSpeed = SCROLL_SPEEDS[0].pxPerSec;
let isRunning = false;
let abortController = null;

// results[suiteId][itemCount] = BenchmarkResult
const results = {};

// DOM references (populated by build* functions)
const dom = {
  runBtn: null,
  suitesContainer: null,
  suiteCards: new Map(), // suiteId → { card, statusEl, progressContainer, progressBar, progressText, metricsContainer, viewport, viewportInner }
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
  dom.suitesContainer = root.querySelector("#bench-suites");

  // Wire up size buttons (pre-rendered as ui-segmented in template)
  wireSizeButtons(root.querySelector("#bench-sizes"));

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
            "ui-segmented__btn--active",
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
            "ui-segmented__btn--active",
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

const wireSizeButtons = (container) => {
  const btns = Array.from(container.querySelectorAll(".ui-segmented__btn"));
  dom.sizeBtns = btns;

  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (isRunning) return;
      const count = parseInt(btn.dataset.count);
      if (count === selectedItemCount) return;

      selectedItemCount = count;
      btns.forEach((b) =>
        b.classList.toggle(
          "ui-segmented__btn--active",
          parseInt(b.dataset.count) === count,
        ),
      );
    });
  });
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
    card.className = "ui-card ui-card--strong bench-suite";
    card.id = `suite-${suite.id}`;

    card.innerHTML = `
      <div class="bench-suite__status" id="status-${suite.id}"></div>
      <div class="bench-progress" id="bench-progress-${suite.id}">
        <div class="bench-progress__bar" id="bench-progress-bar-${suite.id}"></div>
        <div class="bench-progress__text" id="bench-progress-text-${suite.id}">0%</div>
      </div>
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
    const progressContainer = card.querySelector(`#bench-progress-${suite.id}`);
    const progressBar = card.querySelector(`#bench-progress-bar-${suite.id}`);
    const progressText = card.querySelector(`#bench-progress-text-${suite.id}`);
    const metricsContainer = card.querySelector(`#metrics-${suite.id}`);
    const viewportInner = viewport.querySelector(`#viewport-inner-${suite.id}`);

    dom.suiteCards.set(suite.id, {
      card,
      statusEl,
      progressContainer,
      progressBar,
      progressText,
      metricsContainer,
      viewport,
      viewportInner,
    });
  }
};

// =============================================================================
// Metrics Rendering
// =============================================================================

const renderMetrics = (suiteId) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  const result = results[suiteId];

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

  // Clear stale metrics while running
  const ref = dom.suiteCards.get(suiteId);
  if (ref) ref.metricsContainer.innerHTML = "";

  let currentStepProgress = 0;

  // Track which comparison library we're on (0 = first, 1 = second)
  let compLibIndex = -1;
  let lastCompLib = "";

  // Timer to animate progress during scroll phases (no status updates during scroll)
  let scrollProgressTimer = null;
  const SCROLL_TICK = 200; // update every 200ms

  const startScrollProgressTimer = (baseProgress, endProgress, durationMs) => {
    stopScrollProgressTimer();
    const start = performance.now();
    scrollProgressTimer = setInterval(() => {
      const elapsed = performance.now() - start;
      const fraction = Math.min(elapsed / durationMs, 1);
      currentStepProgress =
        baseProgress + fraction * (endProgress - baseProgress);
      setProgress(suiteId, currentStepProgress);
      if (fraction >= 1) stopScrollProgressTimer();
    }, SCROLL_TICK);
  };

  const stopScrollProgressTimer = () => {
    if (scrollProgressTimer) {
      clearInterval(scrollProgressTimer);
      scrollProgressTimer = null;
    }
  };

  // Initialize progress bar
  setProgress(suiteId, 0);

  try {
    await runBenchmarks({
      itemCounts: [selectedItemCount],
      suiteIds: [suiteId],
      stressMs: selectedStressMs,
      scrollSpeed: selectedScrollSpeed,
      getContainer: (sid) => getViewportContainer(sid),
      signal: abortController.signal,

      onStatus: (sid, itemCount, message) => {
        updateSuiteStatus(sid, message);

        // ── Comparison benchmarks ──────────────────────────────────
        // Messages follow: "Testing {lib} - {phase}..."
        // Two libraries × (prepare + memory + N scroll speeds) each
        // Progress: lib1 maps to 0→0.48, lib2 maps to 0.50→0.98
        const compMatch = message.match(
          /^Testing (.+?) - (preparing|measuring memory|scrolling)/,
        );
        if (compMatch) {
          const lib = compMatch[1];
          const phase = compMatch[2];

          // Detect library switch
          if (lib !== lastCompLib) {
            compLibIndex++;
            lastCompLib = lib;
          }

          // Stop any running scroll timer when phase changes
          stopScrollProgressTimer();

          // Base offset: first lib 0→0.48, second lib 0.50→0.98
          const libBase = compLibIndex === 0 ? 0 : 0.5;

          const numSpeeds = COMPARISON_SCROLL_SPEEDS.length; // 3

          // Phase offsets within each library's half (0→0.48)
          // Prepare + render: 0.00→0.08  (fast, no per-iteration status)
          // Memory:           0.08→0.20  (X/Y parsed from status message)
          // Scroll speeds:    0.20→0.48  (split evenly across N speeds)
          if (phase === "preparing") {
            currentStepProgress = libBase + 0.02;
          } else if (phase === "measuring memory") {
            // Parse attempt number if available: "measuring memory (X/Y)"
            const memMatch = message.match(/measuring memory \((\d+)\/(\d+)\)/);
            if (memMatch) {
              const current = parseInt(memMatch[1], 10);
              const total = parseInt(memMatch[2], 10);
              // Memory spans from 0.08 to 0.20 within the lib's half
              currentStepProgress = libBase + 0.08 + (current / total) * 0.12;
            } else {
              currentStepProgress = libBase + 0.08;
            }
          } else if (phase === "scrolling") {
            // Detect which scroll speed we're on from the label (e.g. "scrolling 7,200 px/s...")
            const speedMatch = message.match(/scrolling ([\d,.]+ px\/s)/);
            let speedIndex = 0;
            if (speedMatch) {
              const label = speedMatch[1];
              const idx = COMPARISON_SCROLL_SPEEDS.findIndex(
                (s) => s.label === label,
              );
              if (idx >= 0) speedIndex = idx;
            }

            // Each speed gets an equal slice of the scroll range (0.20→0.48)
            const scrollRange = 0.28; // total scroll band within the half
            const sliceSize = scrollRange / numSpeeds;
            const sliceStart = libBase + 0.2 + speedIndex * sliceSize;
            const sliceEnd = sliceStart + sliceSize;

            currentStepProgress = sliceStart;
            startScrollProgressTimer(
              sliceStart,
              sliceEnd,
              COMP_SCROLL_DURATION_MS,
            );
          }

          setProgress(suiteId, currentStepProgress);
          return;
        }

        // ── Solo benchmarks ────────────────────────────────────────
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
        setProgress(suiteId, currentStepProgress);
      },

      onResult: (result) => {
        storeResult(result);
        renderMetrics(result.suiteId);
      },

      onComplete: () => {
        setProgress(suiteId, 1);
        requestAnimationFrame(() => {
          setProgress(suiteId, 0);
          setSuiteState(suiteId, "done");
          updateSuiteStatus(suiteId, "Final results");
          hideViewport(suiteId);
        });
      },
    });
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Benchmark error:", err);
    }
  }

  stopScrollProgressTimer();
  hideViewport(suiteId);
  isRunning = false;
  abortController = null;
  setRunningState(false);
};

// =============================================================================
// State Updates
// =============================================================================

const storeResult = (result) => {
  results[result.suiteId] = result;
  persistResult(result, {
    stressMs: selectedStressMs,
    scrollSpeed: selectedScrollSpeed,
  });
};

const setRunningState = (running) => {
  if (dom.runBtn) {
    dom.runBtn.textContent = running ? "■ Stop" : "▶ Run";
    dom.runBtn.classList.toggle("bench-run-btn--stop", running);
    dom.runBtn.classList.toggle("ui-btn--primary", !running);
  }

  // Disable size buttons while running
  dom.sizeBtns.forEach((btn) => {
    btn.disabled = running;
    btn.classList.toggle("ui-segmented__btn--disabled", running);
  });

  // Switch to single-column layout while running so the active suite + viewport is larger
  dom.suitesContainer?.classList.toggle("bench-suites--running", running);
};

const setProgress = (suiteId, fraction) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref?.progressBar || !ref?.progressContainer) return;
  const pct = Math.round(fraction * 100);
  ref.progressBar.style.width = `${pct}%`;

  if (ref.progressText) {
    ref.progressText.textContent = `${pct}%`;
  }

  if (fraction === 0) {
    ref.progressContainer.classList.remove("bench-progress--active");
    if (ref.progressText) {
      ref.progressText.textContent = "0%";
    }
  } else {
    ref.progressContainer.classList.add("bench-progress--active");
  }
};

const setSuiteState = (suiteId, state) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  ref.card.classList.remove("bench-suite--running", "bench-suite--done");
  if (state === "running") ref.card.classList.add("bench-suite--running");
  if (state === "done") ref.card.classList.add("bench-suite--done");
};

const updateSuiteStatus = (suiteId, message) => {
  const ref = dom.suiteCards.get(suiteId);
  if (!ref) return;

  // Strip redundant "Testing " prefix from comparison status messages
  const cleaned = message.replace(/^Testing /, "");
  ref.statusEl.textContent = cleaned;
  ref.statusEl.classList.toggle(
    "bench-suite__status--running",
    cleaned !== "Final results",
  );
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
  } else if (page === "history") {
    buildHistoryPage(root);
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
