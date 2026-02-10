// benchmarks/script.js — Benchmark Dashboard
//
// Main entry point: builds the UI, wires up controls, and orchestrates
// benchmark execution via the runner engine.

// Import suites (side-effect: each calls defineSuite())
import "./suites/render.js";
import "./suites/scroll.js";
import "./suites/memory.js";
import "./suites/scrollto.js";

// Import runner
import { getSuites, runBenchmarks, formatItemCount } from "./runner.js";

// =============================================================================
// Constants
// =============================================================================

const ITEM_COUNTS = [10_000, 100_000, 1_000_000];
const DEFAULT_ITEM_COUNT_INDEX = 0; // Start with 10K selected

// Bundle size data (verified, static — anyone can reproduce with bundlephobia or local build)
const BUNDLE_DATA = [
  {
    lib: "vlist/core",
    gzip: "3.0",
    min: "7.3",
    deps: "0",
    self: true,
    note: "Lightweight entry — no selection, groups, compression",
  },
  {
    lib: "vlist (full)",
    gzip: "13.9",
    min: "42.3",
    deps: "0",
    self: true,
    note: "All features: selection, groups, grid, compression, adapter",
  },
  {
    lib: "@tanstack/virtual",
    gzip: "5.5",
    min: "14.0",
    deps: "0",
    self: false,
    note: "Core only — needs framework adapter",
  },
  {
    lib: "react-window",
    gzip: "6.2",
    min: "20.3",
    deps: "2",
    self: false,
    note: "React-only, unmaintained since 2019",
  },
  {
    lib: "react-virtuoso",
    gzip: "16.2",
    min: "54.0",
    deps: "0",
    self: false,
    note: "React-only, feature-rich",
  },
  {
    lib: "clusterize.js",
    gzip: "2.8",
    min: "7.2",
    deps: "0",
    self: false,
    note: "Vanilla, basic — no virtual recycling",
  },
];

// Feature comparison data
const FEATURE_DATA = [
  // [feature, vlist, vlist/core, tanstack, react-window, react-virtuoso]
  ["Zero dependencies", "✅", "✅", "✅", "❌", "✅"],
  ["Framework-agnostic", "✅", "✅", "✅", "❌", "❌"],
  ["Variable item heights", "✅", "✅", "✅", "⚠️", "✅"],
  ["Grid layout", "✅", "❌", "✅", "✅", "❌"],
  ["Sticky headers / groups", "✅", "❌", "❌", "❌", "✅"],
  ["Reverse mode (chat)", "✅", "❌", "❌", "❌", "✅"],
  ["Built-in selection", "✅", "❌", "❌", "❌", "❌"],
  ["Keyboard navigation", "✅", "❌", "❌", "❌", "❌"],
  ["Infinite scroll adapter", "✅", "❌", "❌", "❌", "✅"],
  ["1M+ item compression", "✅", "❌", "❌", "❌", "❌"],
  ["Window scrolling", "✅", "✅", "✅", "❌", "✅"],
  ["Smooth scrollToIndex", "✅", "✅", "✅", "✅", "✅"],
  ["Auto-height measurement", "❌", "❌", "✅", "❌", "✅"],
  ["Horizontal scrolling", "❌", "❌", "✅", "✅", "❌"],
  ["Scroll save/restore", "✅", "✅", "❌", "❌", "❌"],
  ["React adapter", "✅", "—", "✅", "✅", "✅"],
  ["Vue adapter", "✅", "—", "✅", "❌", "❌"],
  ["Svelte adapter", "✅", "—", "✅", "❌", "❌"],
];

const FEATURE_LIBS = [
  "vlist",
  "vlist/core",
  "@tanstack/virtual",
  "react-window",
  "react-virtuoso",
];

// =============================================================================
// State
// =============================================================================

let selectedItemCounts = [ITEM_COUNTS[DEFAULT_ITEM_COUNT_INDEX]];
let isRunning = false;
let abortController = null;

// results[suiteId][itemCount] = BenchmarkResult
const results = {};

// DOM references (populated by buildUI)
const dom = {
  runBtn: null,
  statusEl: null,
  progressBar: null,
  progressContainer: null,
  suitesContainer: null,
  suiteCards: new Map(), // suiteId → { card, statusEl, metricsContainer, tabs, runBtn, viewport, viewportInner }
  sizeBtns: [],
};

// =============================================================================
// UI Building
// =============================================================================

const buildUI = (root) => {
  const suites = getSuites();

  root.innerHTML = `
    <div class="bench-page">
      <!-- Header -->
      <header class="bench-header">
        <h1 class="bench-header__title">Benchmarks</h1>
        <p class="bench-header__desc">
          Live performance measurements running in your browser.
          Each benchmark creates a real vlist instance, scrolls it programmatically,
          and measures actual frame times, render latency, and memory usage.
        </p>
        <div class="bench-header__meta">
          <span class="bench-tag bench-tag--accent">vlist ${getVlistVersion()}</span>
          <span class="bench-tag">${navigator.userAgent.includes("Chrome") ? "Chrome — full metrics" : "⚠️ Use Chrome for memory metrics"}</span>
          <span class="bench-tag">${navigator.hardwareConcurrency || "?"}-core CPU</span>
        </div>
      </header>

      <!-- Controls -->
      <div class="bench-controls" id="bench-controls">
        <span class="bench-controls__label">Items</span>
        <div class="bench-controls__sizes" id="bench-sizes"></div>
        <div class="bench-controls__sep"></div>
        <button class="bench-run-btn" id="bench-run">▶ Run All</button>
        <span class="bench-status" id="bench-status">Ready</span>
      </div>

      <!-- Progress -->
      <div class="bench-progress" id="bench-progress">
        <div class="bench-progress__bar" id="bench-progress-bar"></div>
      </div>

      <!-- Suite Cards -->
      <div class="bench-suites" id="bench-suites"></div>

      <!-- Bundle Size Comparison -->
      <div class="bench-bundle" id="bench-bundle"></div>

      <!-- Feature Comparison -->
      <div class="bench-features" id="bench-features"></div>

      <!-- Footer -->
      <footer class="bench-footer">
        <p>
          Benchmarks run locally in your browser — results depend on your hardware.
          <br>
          <a href="https://github.com/floor/vlist" target="_blank">github.com/floor/vlist</a>
          ·
          <a href="/sandbox/">Sandbox</a>
          ·
          <a href="/">vlist.dev</a>
        </p>
      </footer>
    </div>


  `;

  // Cache DOM refs
  dom.runBtn = root.querySelector("#bench-run");
  dom.statusEl = root.querySelector("#bench-status");
  dom.progressBar = root.querySelector("#bench-progress-bar");
  dom.progressContainer = root.querySelector("#bench-progress");
  dom.suitesContainer = root.querySelector("#bench-suites");

  // Build size buttons
  buildSizeButtons(root.querySelector("#bench-sizes"));

  // Build suite cards
  buildSuiteCards(root.querySelector("#bench-suites"), suites);

  // Build bundle comparison
  buildBundleTable(root.querySelector("#bench-bundle"));

  // Build feature comparison
  buildFeatureTable(root.querySelector("#bench-features"));

  // Wire up run button
  dom.runBtn.addEventListener("click", handleRunClick);
};

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
        <button class="bench-suite__run-btn" data-suite="${suite.id}">Run</button>
      </div>
      <p class="bench-suite__desc">${suite.description}</p>
      <div class="bench-suite__status" id="status-${suite.id}"></div>
      <div class="bench-suite__tabs" id="tabs-${suite.id}">${tabsHtml}</div>
      <div class="bench-metrics" id="metrics-${suite.id}">
        <div class="bench-metric bench-metric--empty">
          <span class="bench-metric__value">Click "Run All" or "Run" to benchmark</span>
        </div>
      </div>
      <div class="bench-viewport" id="viewport-${suite.id}">
        <span class="bench-viewport__label">live</span>
        <div class="bench-viewport__inner" id="viewport-inner-${suite.id}"></div>
      </div>
    `;

    container.appendChild(card);

    // Cache refs
    const runBtn = card.querySelector(".bench-suite__run-btn");
    const statusEl = card.querySelector(`#status-${suite.id}`);
    const metricsContainer = card.querySelector(`#metrics-${suite.id}`);
    const tabsContainer = card.querySelector(`#tabs-${suite.id}`);
    const tabs = Array.from(tabsContainer.querySelectorAll(".bench-tab"));
    const viewport = card.querySelector(`#viewport-${suite.id}`);
    const viewportInner = card.querySelector(`#viewport-inner-${suite.id}`);

    dom.suiteCards.set(suite.id, {
      card,
      statusEl,
      metricsContainer,
      tabs,
      tabsContainer,
      runBtn,
      viewport,
      viewportInner,
      activeTab: null,
    });

    // Wire up individual run button
    runBtn.addEventListener("click", () => handleSuiteRunClick(suite.id));

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
      return `
        <div class="bench-metric${ratingClass}">
          <span class="bench-metric__label">${escapeHtml(metric.label)}</span>
          <span class="bench-metric__value">
            ${metric.value.toLocaleString()}
            ${metric.unit ? `<span class="bench-metric__unit">${escapeHtml(metric.unit)}</span>` : ""}
          </span>
        </div>
      `;
    })
    .join("");
};

// =============================================================================
// Bundle Size Table
// =============================================================================

const buildBundleTable = (container) => {
  const rows = BUNDLE_DATA.map((row) => {
    const libClass = row.self
      ? "bench-bundle__lib bench-bundle__lib--self"
      : "bench-bundle__lib";
    const gzipClass = row.self ? "bench-bundle__highlight" : "";

    return `
      <tr>
        <td class="${libClass}">${escapeHtml(row.lib)}</td>
        <td>${row.min} KB</td>
        <td class="${gzipClass}">${row.gzip} KB</td>
        <td>${row.deps}</td>
        <td style="font-size:12px;color:var(--mtrl-sys-color-on-surface-variant,#666);font-family:inherit;">${escapeHtml(row.note)}</td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <h2 class="bench-bundle__title">📦 Bundle Size</h2>
    <p class="bench-bundle__desc">Minified and gzipped sizes — smaller is better for load time.</p>
    <table class="bench-bundle__table">
      <thead>
        <tr>
          <th>Library</th>
          <th>Minified</th>
          <th>Gzipped</th>
          <th>Deps</th>
          <th style="text-align:left;">Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="bench-bundle__note">
      Sizes measured via local build (Bun) and verified with bundlephobia.com where available.
      vlist/core is the lightweight entry point for simple lists. The full bundle includes all features.
    </p>
  `;
};

// =============================================================================
// Feature Comparison Table
// =============================================================================

const buildFeatureTable = (container) => {
  const headerCells = FEATURE_LIBS.map(
    (lib) => `<th>${escapeHtml(lib)}</th>`,
  ).join("");

  const rows = FEATURE_DATA.map(([feature, ...values]) => {
    const cells = values.map((v) => `<td>${v}</td>`).join("");
    return `<tr><td>${escapeHtml(feature)}</td>${cells}</tr>`;
  }).join("");

  container.innerHTML = `
    <h2 class="bench-features__title">⚖️ Feature Comparison</h2>
    <p class="bench-features__desc">Feature coverage across popular virtual list libraries.</p>
    <table class="bench-features__table">
      <thead>
        <tr>
          <th>Feature</th>
          ${headerCells}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
};

// =============================================================================
// Run Logic
// =============================================================================

const handleRunClick = () => {
  if (isRunning) {
    // Stop
    abortController?.abort();
    return;
  }

  runAllSuites();
};

const handleSuiteRunClick = async (suiteId) => {
  if (isRunning) return;

  isRunning = true;
  abortController = new AbortController();

  setRunningState(true);
  setSuiteState(suiteId, "running");
  showViewport(suiteId);

  const totalSteps = selectedItemCounts.length;
  let completedSteps = 0;

  try {
    await runBenchmarks({
      itemCounts: selectedItemCounts,
      suiteIds: [suiteId],
      getContainer: (sid) => getViewportContainer(sid),
      signal: abortController.signal,

      onStatus: (sid, itemCount, message) => {
        updateSuiteStatus(sid, itemCount, message);
        setGlobalStatus(
          `${getSuites().find((s) => s.id === sid)?.icon || ""} ${formatItemCount(itemCount)} — ${message}`,
        );
      },

      onResult: (result) => {
        storeResult(result);
        completedSteps++;
        setProgress(completedSteps / totalSteps);

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
  setGlobalStatus("Done");
  setProgress(0);
};

const runAllSuites = async () => {
  if (isRunning) return;

  isRunning = true;
  abortController = new AbortController();

  const suites = getSuites();
  const totalSteps = suites.length * selectedItemCounts.length;
  let completedSteps = 0;

  setRunningState(true);

  // Mark all suites as pending
  for (const suite of suites) {
    setSuiteState(suite.id, "pending");
  }

  let currentSuiteId = null;

  try {
    await runBenchmarks({
      itemCounts: selectedItemCounts,
      getContainer: (suiteId) => getViewportContainer(suiteId),
      signal: abortController.signal,

      onStatus: (suiteId, itemCount, message) => {
        // Track which suite is currently running
        if (suiteId !== currentSuiteId) {
          if (currentSuiteId) {
            setSuiteState(currentSuiteId, "done");
            hideViewport(currentSuiteId);
          }
          currentSuiteId = suiteId;
          setSuiteState(suiteId, "running");
          showViewport(suiteId);

          // Switch to this suite's first selected tab
          const ref = dom.suiteCards.get(suiteId);
          if (ref && !selectedItemCounts.includes(ref.activeTab)) {
            setActiveTab(suiteId, selectedItemCounts[0]);
          }
        }

        updateSuiteStatus(suiteId, itemCount, message);
        setGlobalStatus(
          `${getSuites().find((s) => s.id === suiteId)?.icon || ""} ${formatItemCount(itemCount)} — ${message}`,
        );
      },

      onResult: (result) => {
        storeResult(result);
        completedSteps++;
        setProgress(completedSteps / totalSteps);

        // Mark tab as done
        markTabDone(result.suiteId, result.itemCount);

        // Switch to the tab that just completed and render
        setActiveTab(result.suiteId, result.itemCount);
      },

      onComplete: () => {
        if (currentSuiteId) {
          setSuiteState(currentSuiteId, "done");
          hideViewport(currentSuiteId);
        }
      },
    });
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Benchmark error:", err);
    }
  }

  // Hide all viewports
  for (const suiteId of dom.suiteCards.keys()) {
    hideViewport(suiteId);
  }

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
  dom.runBtn.textContent = running ? "■ Stop" : "▶ Run All";
  dom.runBtn.classList.toggle("bench-run-btn--stop", running);

  // Disable size buttons and individual run buttons while running
  dom.sizeBtns.forEach((btn) => (btn.disabled = running));
  dom.suiteCards.forEach((ref) => (ref.runBtn.disabled = running));

  dom.progressContainer.classList.toggle("bench-progress--active", running);

  // Switch to single-column layout while running so the active suite + viewport is larger
  dom.suitesContainer?.classList.toggle("bench-suites--running", running);
};

const setGlobalStatus = (message) => {
  dom.statusEl.textContent = message;
  dom.statusEl.classList.toggle("bench-status--running", isRunning);
};

const setProgress = (fraction) => {
  const pct = Math.round(fraction * 100);
  dom.progressBar.style.width = `${pct}%`;

  if (fraction === 0) {
    dom.progressContainer.classList.remove("bench-progress--active");
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
  // Try to read from the package; fallback to generic
  try {
    return "0.4.0";
  } catch {
    return "";
  }
};

// =============================================================================
// Boot
// =============================================================================

const root = document.getElementById("content");
if (root) {
  buildUI(root);
}
