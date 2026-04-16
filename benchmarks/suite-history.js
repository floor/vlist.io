// benchmarks/suite-history.js — Interactive suite benchmark history page
//
// Shows vlist's own suite benchmark results (render, scroll, memory, scrollTo)
// aggregated by VERSION — the primary axis for tracking performance regressions.
//
// Key difference from history.js (comparison page):
//   - X-axis is VERSION (categorical), not date (continuous)
//   - Chart data comes from /stats (aggregated per version) not /history (daily)
//   - No "Days" filter — all versions are always shown
//   - Versions are ordered by firstSeen date (oldest → newest, left → right)

import { buildSuiteHistoryPageHTML } from "./templates.js";
import { formatItemCount } from "./runner.js";
import {
  confidenceLabel,
  formatMetricValue,
  niceScale,
  formatTickValue,
  round,
} from "./history-utils.js";

// =============================================================================
// Constants
// =============================================================================

const API_BASE = "/api/benchmarks";
const CHART_WIDTH = 700;
const CHART_HEIGHT = 280;
const CHART_PAD = { top: 20, right: 20, bottom: 55, left: 60 };

const COLORS = {
  line: "var(--accent, #3b82f6)",
  band: "var(--accent, #3b82f6)",
  bandOpacity: 0.12,
  dot: "var(--accent, #3b82f6)",
  grid: "var(--border, #e5e7eb)",
  text: "var(--text-muted, #6b7280)",
  axis: "var(--text-muted, #6b7280)",
};

// =============================================================================
// Suite Display Names
// =============================================================================

const SUITE_DISPLAY_NAMES = {
  "render-vanilla": "Render (Vanilla)",
  "render-react": "Render (React)",
  "render-vue": "Render (Vue)",
  "render-svelte": "Render (Svelte)",
  "render-solidjs": "Render (SolidJS)",
  "scroll-vanilla": "Scroll (Vanilla)",
  "scroll-react": "Scroll (React)",
  "scroll-vue": "Scroll (Vue)",
  "scroll-svelte": "Scroll (Svelte)",
  "scroll-solidjs": "Scroll (SolidJS)",
  "memory-vanilla": "Memory (Vanilla)",
  "memory-react": "Memory (React)",
  "memory-vue": "Memory (Vue)",
  "memory-svelte": "Memory (Svelte)",
  "memory-solidjs": "Memory (SolidJS)",
  "scrollto-vanilla": "ScrollTo (Vanilla)",
  "scrollto-react": "ScrollTo (React)",
  "scrollto-vue": "ScrollTo (Vue)",
  "scrollto-svelte": "ScrollTo (Svelte)",
  "scrollto-solidjs": "ScrollTo (SolidJS)",
};

// =============================================================================
// State
// =============================================================================

let currentSuiteId = "";
let currentItemCount = 0; // 0 = all item counts
let currentVersion = ""; // used for stats table filtering only
let currentMetric = "";

/** Cached data from API */
let summaryData = null;
let suitesData = null;
let versionsData = null;
let browsersData = null;

// =============================================================================
// Public: Build Page
// =============================================================================

export function buildSuiteHistoryPage(root) {
  root.innerHTML = buildSuiteHistoryPageHTML();

  // Load initial data in parallel — all requests include ?type=suite
  Promise.all([
    fetchJSON(`${API_BASE}/summary?type=suite`),
    fetchJSON(`${API_BASE}/suites?type=suite`),
    fetchJSON(`${API_BASE}/versions?type=suite`),
    fetchJSON(`${API_BASE}/browsers?type=suite`),
  ])
    .then(([summary, suites, versions, browsers]) => {
      summaryData = summary;
      suitesData = suites?.items ?? [];
      versionsData = versions?.items ?? [];
      browsersData = browsers?.items ?? [];

      renderSummary(summary);
      populateSuiteSelect(suitesData);
      populateVersionSelect(versionsData);
      renderBrowsers(browsersData);
      renderVersions(versionsData);
      renderCTALinks();

      // Wire up interactive controls
      wireFilters();

      // Auto-select first vanilla suite, or fall back to first available
      if (suitesData.length > 0) {
        const vanillaSuite = suitesData.find((s) =>
          s.suiteId.endsWith("-vanilla"),
        );
        currentSuiteId = vanillaSuite
          ? vanillaSuite.suiteId
          : suitesData[0].suiteId;
        const suiteSelect = document.getElementById("suite-history-suite");
        if (suiteSelect) suiteSelect.value = currentSuiteId;
        refreshStats();
      }
    })
    .catch((err) => {
      console.error("[suite-history] Failed to load initial data:", err);
      renderError(
        "suite-history-summary",
        "Failed to load benchmark data. Make sure the database is initialized.",
      );
    });
}

// =============================================================================
// API Helpers
// =============================================================================

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[suite-history] ${url} → ${res.status}:`, body);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn(`[suite-history] fetch failed for ${url}:`, err);
    return null;
  }
}

// =============================================================================
// Wire Filters
// =============================================================================

function wireFilters() {
  // Suite select
  const suiteSelect = document.getElementById("suite-history-suite");
  if (suiteSelect) {
    suiteSelect.addEventListener("change", () => {
      currentSuiteId = suiteSelect.value;
      currentMetric = ""; // reset metric when suite changes
      refreshStats();
    });
  }

  // Item count buttons
  const itemCountContainer = document.getElementById(
    "suite-history-item-count",
  );
  if (itemCountContainer) {
    const btns = itemCountContainer.querySelectorAll(".ui-segmented__btn");
    btns.forEach((btn) => {
      btn.addEventListener("click", () => {
        currentItemCount = parseInt(btn.dataset.count, 10);
        btns.forEach((b) =>
          b.classList.toggle(
            "ui-segmented__btn--active",
            b.dataset.count === btn.dataset.count,
          ),
        );
        refreshStats();
      });
    });
  }

  // Version select — only affects the stats table, not the chart
  const versionSelect = document.getElementById("suite-history-version");
  if (versionSelect) {
    versionSelect.addEventListener("change", () => {
      currentVersion = versionSelect.value;
      refreshStats();
    });
  }

  // Metric select — affects the version chart
  const metricSelect = document.getElementById("suite-history-metric");
  if (metricSelect) {
    metricSelect.addEventListener("change", () => {
      currentMetric = metricSelect.value;
      refreshVersionChart();
    });
  }
}

// =============================================================================
// Refresh Data
// =============================================================================

/**
 * Refresh the stats table (filtered by optional version) AND the version chart
 * (always shows all versions).
 */
async function refreshStats() {
  if (!currentSuiteId) return;

  // Stats table: optionally filtered by version
  const params = new URLSearchParams({
    suiteId: currentSuiteId,
    type: "suite",
  });
  if (currentItemCount > 0) params.set("itemCount", String(currentItemCount));
  if (currentVersion) params.set("version", currentVersion);

  const data = await fetchJSON(`${API_BASE}/stats?${params}`);

  if (data?.items?.length > 0) {
    renderStatsTable(data.items);
    populateMetricSelect(data.items[0].metrics);

    // Auto-select first metric if none selected
    if (!currentMetric && data.items[0].metrics.length > 0) {
      currentMetric = data.items[0].metrics[0].label;
      const metricSelect = document.getElementById("suite-history-metric");
      if (metricSelect) metricSelect.value = currentMetric;
    }

    // Always refresh the version chart (it shows ALL versions, ignores version filter)
    refreshVersionChart();
  } else {
    renderEmpty(
      "suite-history-stats-content",
      "No data yet for this suite and item count. Run the benchmark to contribute!",
    );
    renderEmpty("suite-history-chart", "No data available for charting.");
    populateMetricSelect([]);
  }
}

/**
 * Fetch stats for ALL versions (no version filter) and render the version chart.
 * The chart X-axis is version labels, ordered by firstSeen date.
 */
async function refreshVersionChart() {
  if (!currentSuiteId || !currentMetric) {
    renderEmpty(
      "suite-history-chart",
      "Select a suite and metric to view version trends.",
    );
    return;
  }

  // Fetch stats for ALL versions of this suite + item count (high limit)
  const params = new URLSearchParams({
    suiteId: currentSuiteId,
    type: "suite",
    limit: "200",
  });
  if (currentItemCount > 0) params.set("itemCount", String(currentItemCount));

  const data = await fetchJSON(`${API_BASE}/stats?${params}`);

  if (data?.items?.length > 0) {
    renderVersionChart(data.items);
  } else {
    renderEmpty(
      "suite-history-chart",
      "No version data for this selection yet.",
    );
  }
}

// =============================================================================
// Rating Derivation
// =============================================================================

/**
 * Derive a rating for suite metrics based on label/value.
 * Returns "good" | "ok" | "bad" | null.
 */
function deriveSuiteRating(label, better, value) {
  const lbl = label.toLowerCase();

  // Render: Median/Min/p95 in ms — lower is better
  if (lbl === "median" || lbl === "min")
    return value < 30 ? "good" : value < 80 ? "ok" : "bad";
  if (lbl === "p95") return value < 45 ? "good" : value < 120 ? "ok" : "bad";

  // Scroll: Avg FPS — higher is better
  if (lbl.includes("avg fps"))
    return value >= 55 ? "good" : value >= 40 ? "ok" : "bad";

  // Scroll: Frame budget / Budget p95 — lower is better
  if (lbl.includes("frame budget") || lbl.includes("budget"))
    return value < 8 ? "good" : value < 16 ? "ok" : "bad";

  // Scroll: Dropped % — lower is better
  if (lbl.includes("dropped"))
    return value < 5 ? "good" : value < 15 ? "ok" : "bad";

  // Memory: After render MB — lower is better
  if (lbl.includes("after render"))
    return value < 15 ? "good" : value < 40 ? "ok" : "bad";

  // Memory: Scroll delta — lower is better (leak detection)
  if (lbl.includes("scroll delta"))
    return Math.abs(value) < 1 ? "good" : Math.abs(value) < 5 ? "ok" : "bad";

  // ScrollTo: ms values — lower is better
  if (lbl.includes("max"))
    return value < 800 ? "good" : value < 1200 ? "ok" : "bad";

  // Generic: use better direction
  if (better === "lower")
    return value < 30 ? "good" : value < 100 ? "ok" : "bad";
  if (better === "higher")
    return value >= 55 ? "good" : value >= 40 ? "ok" : "bad";

  return null;
}

// =============================================================================
// Renderers
// =============================================================================

function renderSummary(data) {
  const el = document.getElementById("suite-history-summary");
  if (!el || !data) {
    if (el)
      el.innerHTML = `<div class="bench-history__empty">No benchmark data collected yet. Run a suite benchmark to start!</div>`;
    return;
  }

  const formatNumber = (n) => (n ?? 0).toLocaleString();

  el.innerHTML = `
    <h2 class="bench-history__section-title">Overview</h2>
    <div class="bench-history__summary-grid">
      <div class="bench-history__stat">
        <div class="bench-history__stat-value">${formatNumber(data.totalRuns)}</div>
        <div class="bench-history__stat-label">Total Runs</div>
      </div>
      <div class="bench-history__stat">
        <div class="bench-history__stat-value">${formatNumber(data.totalMetrics)}</div>
        <div class="bench-history__stat-label">Metrics Stored</div>
      </div>
      <div class="bench-history__stat">
        <div class="bench-history__stat-value">${formatNumber(data.uniqueVersions)}</div>
        <div class="bench-history__stat-label">Versions</div>
      </div>
      <div class="bench-history__stat">
        <div class="bench-history__stat-value">${formatNumber(data.uniqueSuites)}</div>
        <div class="bench-history__stat-label">Suites</div>
      </div>
      <div class="bench-history__stat">
        <div class="bench-history__stat-value">${formatNumber(data.uniqueBrowsers)}</div>
        <div class="bench-history__stat-label">Browser Profiles</div>
      </div>
    </div>
  `;
}

function renderStatsTable(statsItems) {
  const el = document.getElementById("suite-history-stats-content");
  if (!el) return;

  if (statsItems.length === 0) {
    el.innerHTML = `<div class="bench-history__empty">No data for this selection.</div>`;
    return;
  }

  const sections = [];

  for (const stat of statsItems) {
    const totalSamples =
      stat.metrics.length > 0 ? stat.metrics[0].sampleCount : 0;
    const confidence = confidenceLabel(totalSamples);

    const metricCards = stat.metrics
      .map((m) => {
        const rating = deriveSuiteRating(m.label, m.better, m.median);
        const ratingClass = rating ? ` bench-metric--${rating}` : "";
        const displayValue = formatMetricValue(m.median, m.unit);

        return `
        <div class="bench-metric${ratingClass}">
          <span class="bench-metric__label">${escapeHtml(m.label)}</span>
          <span class="bench-metric__value">
            ${displayValue}
            ${m.unit ? `<span class="bench-metric__unit">${escapeHtml(m.unit)}</span>` : ""}
          </span>
        </div>
      `;
      })
      .join("");

    sections.push(`
      <div class="bench-history__results-section">
        <div class="bench-history__results-header">
          <span class="bench-history__results-version">${escapeHtml(stat.version)}</span>
          <span class="bench-history__confidence bench-history__confidence--${confidence.cls}" title="${totalSamples} run${totalSamples !== 1 ? "s" : ""}">
            ${confidence.text} · ${totalSamples} run${totalSamples !== 1 ? "s" : ""}
          </span>
        </div>
        <div class="bench-metrics">
          ${metricCards}
        </div>
        <button class="bench-history__details-toggle" aria-expanded="false">
          <span class="bench-history__details-toggle-text">Show detailed stats</span>
          <span class="bench-history__details-toggle-icon">▸</span>
        </button>
        <div class="bench-history__details" hidden>
          ${renderDetailsTable(stat)}
        </div>
      </div>
    `);
  }

  el.innerHTML = sections.join("");

  // Wire up detail toggles
  el.querySelectorAll(".bench-history__details-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const details = btn.nextElementSibling;
      const expanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.querySelector(".bench-history__details-toggle-text").textContent =
        expanded ? "Show detailed stats" : "Hide detailed stats";
      btn.querySelector(".bench-history__details-toggle-icon").textContent =
        expanded ? "▸" : "▾";
      details.hidden = expanded;
    });
  });
}

/** Build the collapsible detailed stats table */
function renderDetailsTable(stat) {
  const rows = stat.metrics
    .map(
      (m) => `
    <tr>
      <td>${escapeHtml(m.label)}</td>
      <td class="bench-history__value-cell">${m.median}</td>
      <td>${m.mean}</td>
      <td>${m.p5}</td>
      <td>${m.p95}</td>
      <td>${m.min}</td>
      <td>${m.max}</td>
      <td>${m.stddev}</td>
    </tr>
  `,
    )
    .join("");

  return `
    <div class="bench-history__table-wrapper">
      <table class="bench-history__table bench-history__table--compact">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Median</th>
            <th>Mean</th>
            <th>p5</th>
            <th>p95</th>
            <th>Min</th>
            <th>Max</th>
            <th>StdDev</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// =============================================================================
// Version Chart — X-axis is version labels, ordered by firstSeen date
// =============================================================================

/**
 * Build version order from the cached versionsData.
 * Returns a Map<version, index> ordered by firstSeen date (oldest first).
 */
function getVersionOrder() {
  if (!versionsData || versionsData.length === 0) return new Map();

  // Sort by firstSeen ascending (oldest → newest)
  const sorted = [...versionsData].sort((a, b) => {
    const aDate = a.firstSeen || "9999";
    const bDate = b.firstSeen || "9999";
    return aDate.localeCompare(bDate);
  });

  const order = new Map();
  sorted.forEach((v, i) => order.set(v.version, i));
  return order;
}

/**
 * Render the version trend chart.
 *
 * @param {Array} statsItems - Array of { version, suiteId, itemCount, totalRuns, metrics[] }
 *   from /stats endpoint (all versions for one suite + itemCount).
 */
function renderVersionChart(statsItems) {
  const el = document.getElementById("suite-history-chart");
  if (!el) return;

  // Extract the selected metric from each version's stats
  const versionOrder = getVersionOrder();

  const points = [];
  for (const stat of statsItems) {
    const metric = stat.metrics.find((m) => m.label === currentMetric);
    if (!metric) continue;

    const orderIndex = versionOrder.get(stat.version);
    points.push({
      version: stat.version,
      orderIndex: orderIndex ?? 999,
      median: metric.median,
      mean: metric.mean,
      p5: metric.p5,
      p95: metric.p95,
      min: metric.min,
      max: metric.max,
      sampleCount: metric.sampleCount,
      unit: metric.unit,
    });
  }

  if (points.length === 0) {
    el.innerHTML = `<div class="bench-history__empty">No data for metric "${escapeHtml(currentMetric)}" across versions.</div>`;
    return;
  }

  // Sort by version order (oldest → newest, left → right)
  points.sort((a, b) => a.orderIndex - b.orderIndex);

  // ── Y-axis bounds ──────────────────────────────────────────────────────
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of points) {
    if (p.p5 < yMin) yMin = p.p5;
    if (p.p95 > yMax) yMax = p.p95;
    if (p.median < yMin) yMin = p.median;
    if (p.median > yMax) yMax = p.median;
  }

  const yPad = (yMax - yMin) * 0.1 || 1;
  yMin = Math.max(0, yMin - yPad);
  yMax = yMax + yPad;
  const yRange = yMax - yMin || 1;

  // ── Layout ─────────────────────────────────────────────────────────────
  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

  // Categorical X: evenly space versions across the plot width
  const xStep = points.length > 1 ? plotW / (points.length - 1) : 0;
  const xScale = (i) =>
    points.length === 1
      ? CHART_PAD.left + plotW / 2
      : CHART_PAD.left + i * xStep;
  const yScale = (v) => CHART_PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  // ── Build SVG ──────────────────────────────────────────────────────────
  const parts = [];
  parts.push(
    `<svg viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" class="bench-history__svg">`,
  );

  // Y-axis grid lines + labels
  const yTicks = niceScale(yMin, yMax, 5);
  for (const tick of yTicks) {
    const y = yScale(tick);
    parts.push(
      `<line x1="${CHART_PAD.left}" y1="${y}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${y}" stroke="${COLORS.grid}" stroke-width="1" stroke-dasharray="4,3" />`,
    );
    parts.push(
      `<text x="${CHART_PAD.left - 8}" y="${y + 4}" text-anchor="end" fill="${COLORS.text}" font-size="11">${formatTickValue(tick)}</text>`,
    );
  }

  // X-axis: version labels (rotated for readability)
  // Show all labels if ≤ 12 versions, otherwise subsample
  const maxLabels = 12;
  const labelStep =
    points.length <= maxLabels ? 1 : Math.ceil(points.length / maxLabels);

  for (let i = 0; i < points.length; i++) {
    const x = xScale(i);

    // Vertical grid line for each version
    parts.push(
      `<line x1="${x}" y1="${CHART_PAD.top}" x2="${x}" y2="${CHART_HEIGHT - CHART_PAD.bottom}" stroke="${COLORS.grid}" stroke-width="1" stroke-dasharray="2,4" />`,
    );

    // Label (subsampled to avoid overlap)
    if (i % labelStep === 0 || i === points.length - 1) {
      parts.push(
        `<text x="${x}" y="${CHART_HEIGHT - CHART_PAD.bottom + 14}" text-anchor="end" fill="${COLORS.text}" font-size="10" transform="rotate(-35 ${x} ${CHART_HEIGHT - CHART_PAD.bottom + 14})">${escapeHtml(points[i].version)}</text>`,
      );
    }
  }

  // P5–P95 band (polygon)
  if (points.length > 1) {
    const bandTop = points
      .map((p, i) => `${xScale(i)},${yScale(p.p95)}`)
      .join(" ");
    const bandBot = points
      .slice()
      .reverse()
      .map((p, i) => `${xScale(points.length - 1 - i)},${yScale(p.p5)}`)
      .join(" ");
    parts.push(
      `<polygon points="${bandTop} ${bandBot}" fill="${COLORS.band}" opacity="${COLORS.bandOpacity}" />`,
    );
  }

  // Median line
  if (points.length > 1) {
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(p.median)}`)
      .join(" ");
    parts.push(
      `<path d="${linePath}" fill="none" stroke="${COLORS.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`,
    );
  }

  // Data points + tooltips
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const cx = xScale(i);
    const cy = yScale(p.median);
    const title = [
      `${p.version}`,
      `Median: ${formatMetricValue(p.median, p.unit)} ${p.unit}`,
      `Mean: ${formatMetricValue(p.mean, p.unit)} ${p.unit}`,
      `P5: ${formatMetricValue(p.p5, p.unit)} / P95: ${formatMetricValue(p.p95, p.unit)}`,
      `Range: ${formatMetricValue(p.min, p.unit)} – ${formatMetricValue(p.max, p.unit)}`,
      `Samples: ${p.sampleCount}`,
    ].join("\n");

    // Larger hover target (invisible) + visible dot
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="12" fill="transparent" stroke="none"><title>${escapeHtml(title)}</title></circle>`,
    );
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="4" fill="${COLORS.dot}" stroke="var(--bg, #fff)" stroke-width="2"><title>${escapeHtml(title)}</title></circle>`,
    );
  }

  // Axis lines
  parts.push(
    `<line x1="${CHART_PAD.left}" y1="${CHART_PAD.top}" x2="${CHART_PAD.left}" y2="${CHART_HEIGHT - CHART_PAD.bottom}" stroke="${COLORS.axis}" stroke-width="1" />`,
  );
  parts.push(
    `<line x1="${CHART_PAD.left}" y1="${CHART_HEIGHT - CHART_PAD.bottom}" x2="${CHART_WIDTH - CHART_PAD.right}" y2="${CHART_HEIGHT - CHART_PAD.bottom}" stroke="${COLORS.axis}" stroke-width="1" />`,
  );

  // Legend
  const legendY = CHART_PAD.top - 4;
  parts.push(
    `<rect x="${CHART_PAD.left}" y="${legendY - 8}" width="12" height="3" fill="${COLORS.line}" rx="1" />`,
  );
  parts.push(
    `<text x="${CHART_PAD.left + 16}" y="${legendY}" fill="${COLORS.text}" font-size="11">Median</text>`,
  );
  parts.push(
    `<rect x="${CHART_PAD.left + 70}" y="${legendY - 10}" width="12" height="8" fill="${COLORS.band}" opacity="${COLORS.bandOpacity * 3}" rx="1" />`,
  );
  parts.push(
    `<text x="${CHART_PAD.left + 86}" y="${legendY}" fill="${COLORS.text}" font-size="11">P5\u2013P95 range</text>`,
  );

  parts.push(`</svg>`);

  el.innerHTML = parts.join("\n");
}

// =============================================================================
// Browsers & Versions Tables
// =============================================================================

function renderBrowsers(browsers) {
  const el = document.getElementById("suite-history-browsers-content");
  if (!el) return;

  if (!browsers || browsers.length === 0) {
    el.innerHTML = `<div class="bench-history__empty">No browser data yet.</div>`;
    return;
  }

  const total = browsers.reduce((sum, b) => sum + b.totalRuns, 0);

  const rows = browsers.map((b) => {
    const pct = total > 0 ? ((b.totalRuns / total) * 100).toFixed(1) : "0";
    return `
      <tr>
        <td>${escapeHtml(b.browser)}</td>
        <td class="bench-history__value-cell">${b.totalRuns.toLocaleString()}</td>
        <td>
          <div class="bench-history__bar-cell">
            <div class="bench-history__bar" style="width: ${pct}%"></div>
            <span class="bench-history__bar-label">${pct}%</span>
          </div>
        </td>
      </tr>
    `;
  });

  el.innerHTML = `
    <table class="bench-history__table bench-history__table--compact">
      <thead>
        <tr>
          <th>Browser</th>
          <th>Runs</th>
          <th>Share</th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

function renderVersions(versions) {
  const el = document.getElementById("suite-history-versions-content");
  if (!el) return;

  if (!versions || versions.length === 0) {
    el.innerHTML = `<div class="bench-history__empty">No version data yet.</div>`;
    return;
  }

  const formatDate = (d) => (d ? new Date(d + "Z").toLocaleDateString() : "—");

  const rows = versions.map(
    (v) => `
    <tr>
      <td class="bench-history__version-cell">${escapeHtml(v.version)}</td>
      <td class="bench-history__value-cell">${v.totalRuns.toLocaleString()}</td>
      <td>${formatDate(v.firstSeen)}</td>
      <td>${formatDate(v.lastSeen)}</td>
    </tr>
  `,
  );

  el.innerHTML = `
    <table class="bench-history__table bench-history__table--compact">
      <thead>
        <tr>
          <th>Version</th>
          <th>Runs</th>
          <th>First Seen</th>
          <th>Last Seen</th>
        </tr>
      </thead>
      <tbody>${rows.join("")}</tbody>
    </table>
  `;
}

// =============================================================================
// Populate Selects
// =============================================================================

function populateSuiteSelect(suites) {
  const el = document.getElementById("suite-history-suite");
  if (!el) return;

  if (suites.length === 0) {
    el.innerHTML = `<option value="">No suites yet</option>`;
    return;
  }

  // Group by adapter (framework), vanilla first
  const adapterOrder = ["vanilla", "react", "vue", "solidjs", "svelte"];
  const adapterLabels = {
    vanilla: "Vanilla",
    react: "React",
    vue: "Vue",
    solidjs: "SolidJS",
    svelte: "Svelte",
  };

  const groups = new Map();
  for (const s of suites) {
    const dashIdx = s.suiteId.indexOf("-");
    const adapter = dashIdx > 0 ? s.suiteId.slice(dashIdx + 1) : "other";
    if (!groups.has(adapter)) groups.set(adapter, []);
    groups.get(adapter).push(s);
  }

  let html = "";

  // Ordered adapters first, then any unexpected ones
  const orderedKeys = [
    ...adapterOrder.filter((k) => groups.has(k)),
    ...[...groups.keys()].filter((k) => !adapterOrder.includes(k)),
  ];

  for (const adapter of orderedKeys) {
    const items = groups.get(adapter);
    const label =
      adapterLabels[adapter] ||
      adapter.charAt(0).toUpperCase() + adapter.slice(1);
    html += `<optgroup label="${escapeHtml(label)}">`;
    for (const s of items) {
      const displayName = SUITE_DISPLAY_NAMES[s.suiteId] || s.suiteId;
      const selected = s.suiteId === currentSuiteId ? " selected" : "";
      html += `<option value="${escapeHtml(s.suiteId)}"${selected}>${escapeHtml(displayName)} (${s.totalRuns})</option>`;
    }
    html += `</optgroup>`;
  }

  el.innerHTML = html;
}

function populateVersionSelect(versions) {
  const el = document.getElementById("suite-history-version");
  if (!el) return;

  let html = `<option value="">All versions</option>`;
  for (const v of versions) {
    html += `<option value="${escapeHtml(v.version)}">${escapeHtml(v.version)} (${v.totalRuns} runs)</option>`;
  }
  el.innerHTML = html;
}

function populateMetricSelect(metrics) {
  const el = document.getElementById("suite-history-metric");
  if (!el) return;

  if (!metrics || metrics.length === 0) {
    el.innerHTML = `<option value="">No metrics</option>`;
    return;
  }

  let html = "";
  for (const m of metrics) {
    const selected = m.label === currentMetric ? " selected" : "";
    html += `<option value="${escapeHtml(m.label)}"${selected}>${escapeHtml(m.label)} (${escapeHtml(m.unit)})</option>`;
  }
  el.innerHTML = html;
}

// =============================================================================
// CTA Links
// =============================================================================

function renderCTALinks() {
  const el = document.getElementById("suite-history-cta-links");
  if (!el) return;

  const links = [
    { url: "/benchmarks/render", label: "\u26A1 Render" },
    { url: "/benchmarks/scroll", label: "\uD83D\uDCCA Scroll" },
    { url: "/benchmarks/memory", label: "\uD83E\uDDE0 Memory" },
    { url: "/benchmarks/scrollto", label: "\uD83C\uDFAF ScrollTo" },
  ];

  el.innerHTML = links
    .map(
      (l) =>
        `<a href="${escapeHtml(l.url)}" class="bench-history__cta-link">${l.label}</a>`,
    )
    .join("");
}

// =============================================================================
// Helper Renderers
// =============================================================================

function renderEmpty(elementId, message) {
  const el = document.getElementById(elementId);
  if (el)
    el.innerHTML = `<div class="bench-history__empty">${escapeHtml(message)}</div>`;
}

function renderError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el)
    el.innerHTML = `<div class="bench-history__error">${escapeHtml(message)}</div>`;
}

function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
