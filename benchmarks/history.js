// benchmarks/history.js — Interactive benchmark history page
//
// Focused on comparison suite results (react-window, virtua, etc.)
// Fetches crowdsourced data from /api/benchmarks/* endpoints and renders
// stats tables, SVG trend charts, browser/version breakdowns.

import { buildHistoryPageHTML } from "./templates.js";
import { formatItemCount } from "./runner.js";

// =============================================================================
// Constants
// =============================================================================

const API_BASE = "/api/benchmarks";
const CHART_WIDTH = 700;
const CHART_HEIGHT = 260;
const CHART_PAD = { top: 20, right: 20, bottom: 40, left: 60 };

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
// State
// =============================================================================

let currentSuiteId = "";
let currentItemCount = 10_000;
let currentVersion = "";
let currentDays = 30;
let currentMetric = "";

/** Cached data from API */
let summaryData = null;
let suitesData = null;
let versionsData = null;
let browsersData = null;

// =============================================================================
// Public: Build Page
// =============================================================================

export function buildHistoryPage(root) {
  root.innerHTML = buildHistoryPageHTML();

  // Load initial data in parallel
  Promise.all([
    fetchJSON(`${API_BASE}/summary`),
    fetchJSON(`${API_BASE}/suites`),
    fetchJSON(`${API_BASE}/versions`),
    fetchJSON(`${API_BASE}/browsers`),
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

      // Wire up interactive controls
      wireFilters();

      // Auto-select first suite if available
      if (suitesData.length > 0) {
        currentSuiteId = suitesData[0].suiteId;
        const suiteSelect = document.getElementById("history-suite");
        if (suiteSelect) suiteSelect.value = currentSuiteId;
        refreshStats();
      }
    })
    .catch((err) => {
      console.error("[history] Failed to load initial data:", err);
      renderError(
        "history-summary",
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
      console.warn(`[history] ${url} → ${res.status}:`, body);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn(`[history] fetch failed for ${url}:`, err);
    return null;
  }
}

// =============================================================================
// Wire Filters
// =============================================================================

function wireFilters() {
  // Suite select
  const suiteSelect = document.getElementById("history-suite");
  if (suiteSelect) {
    suiteSelect.addEventListener("change", () => {
      currentSuiteId = suiteSelect.value;
      currentMetric = ""; // reset metric when suite changes
      refreshStats();
    });
  }

  // Item count buttons
  const itemCountContainer = document.getElementById("history-item-count");
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

  // Version select
  const versionSelect = document.getElementById("history-version");
  if (versionSelect) {
    versionSelect.addEventListener("change", () => {
      currentVersion = versionSelect.value;
      refreshStats();
    });
  }

  // Days select
  const daysSelect = document.getElementById("history-days");
  if (daysSelect) {
    daysSelect.addEventListener("change", () => {
      currentDays = parseInt(daysSelect.value, 10);
      refreshChart();
    });
  }

  // Metric select
  const metricSelect = document.getElementById("history-metric");
  if (metricSelect) {
    metricSelect.addEventListener("change", () => {
      currentMetric = metricSelect.value;
      refreshChart();
    });
  }
}

// =============================================================================
// Refresh Data
// =============================================================================

async function refreshStats() {
  if (!currentSuiteId) return;

  const params = new URLSearchParams({
    suiteId: currentSuiteId,
    itemCount: String(currentItemCount),
  });
  if (currentVersion) params.set("version", currentVersion);

  const data = await fetchJSON(`${API_BASE}/stats?${params}`);

  if (data?.items?.length > 0) {
    renderStatsTable(data.items);
    populateMetricSelect(data.items[0].metrics);

    // Auto-select first metric if none selected
    if (!currentMetric && data.items[0].metrics.length > 0) {
      currentMetric = data.items[0].metrics[0].label;
      const metricSelect = document.getElementById("history-metric");
      if (metricSelect) metricSelect.value = currentMetric;
    }

    refreshChart();
  } else {
    renderEmpty(
      "history-stats-content",
      "No data yet for this suite and item count. Run the benchmark to contribute!",
    );
    renderEmpty("history-chart", "No data available for charting.");
    populateMetricSelect([]);
  }
}

async function refreshChart() {
  if (!currentSuiteId || !currentMetric) {
    renderEmpty("history-chart", "Select a suite and metric to view trends.");
    return;
  }

  const params = new URLSearchParams({
    suiteId: currentSuiteId,
    itemCount: String(currentItemCount),
    metric: currentMetric,
    days: String(currentDays),
  });
  if (currentVersion) params.set("version", currentVersion);

  const data = await fetchJSON(`${API_BASE}/history?${params}`);

  if (data?.items?.length > 0) {
    renderChart(data.items);
  } else {
    renderEmpty("history-chart", "No historical data for this selection yet.");
  }
}

// =============================================================================
// Renderers
// =============================================================================

function renderSummary(data) {
  const el = document.getElementById("history-summary");
  if (!el || !data) {
    if (el)
      el.innerHTML = `<div class="bench-history__empty">No benchmark data collected yet. Run a benchmark to start!</div>`;
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
        <div class="bench-history__stat-label">Libraries</div>
      </div>
      <div class="bench-history__stat">
        <div class="bench-history__stat-value">${formatNumber(data.uniqueBrowsers)}</div>
        <div class="bench-history__stat-label">Browser Profiles</div>
      </div>
    </div>
  `;
}

function renderStatsTable(statsItems) {
  const el = document.getElementById("history-stats-content");
  if (!el) return;

  if (statsItems.length === 0) {
    el.innerHTML = `<div class="bench-history__empty">No data for this selection.</div>`;
    return;
  }

  // Build rows — group by version, show all metrics
  const rows = [];
  for (const stat of statsItems) {
    for (const m of stat.metrics) {
      rows.push(`
        <tr>
          <td class="bench-history__version-cell">${escapeHtml(stat.version)}</td>
          <td>${escapeHtml(m.label)}</td>
          <td class="bench-history__value-cell">${m.median} ${escapeHtml(m.unit)}</td>
          <td>${m.mean} ${escapeHtml(m.unit)}</td>
          <td>${m.p5}</td>
          <td>${m.p95}</td>
          <td>${m.min}</td>
          <td>${m.max}</td>
          <td>${m.stddev}</td>
          <td class="bench-history__count-cell">${m.sampleCount}</td>
        </tr>
      `);
    }
  }

  el.innerHTML = `
    <div class="bench-history__table-wrapper">
      <table class="bench-history__table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Metric</th>
            <th>Median</th>
            <th>Mean</th>
            <th>p5</th>
            <th>p95</th>
            <th>Min</th>
            <th>Max</th>
            <th>StdDev</th>
            <th>Samples</th>
          </tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
    </div>
  `;
}

function renderChart(points) {
  const el = document.getElementById("history-chart");
  if (!el || points.length === 0) return;

  // Parse dates and compute bounds
  const parsed = points.map((p) => ({
    ...p,
    dateObj: new Date(p.date + "T00:00:00Z"),
    dateMs: new Date(p.date + "T00:00:00Z").getTime(),
  }));

  // Sort by date
  parsed.sort((a, b) => a.dateMs - b.dateMs);

  const xMin = parsed[0].dateMs;
  const xMax = parsed[parsed.length - 1].dateMs;
  const xRange = xMax - xMin || 1;

  // Find y bounds from p5/p95 range
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const p of parsed) {
    if (p.p5 < yMin) yMin = p.p5;
    if (p.p95 > yMax) yMax = p.p95;
    if (p.median < yMin) yMin = p.median;
    if (p.median > yMax) yMax = p.median;
  }

  // Add 10% padding
  const yPad = (yMax - yMin) * 0.1 || 1;
  yMin = Math.max(0, yMin - yPad);
  yMax = yMax + yPad;
  const yRange = yMax - yMin || 1;

  const plotW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const plotH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;

  const xScale = (ms) => CHART_PAD.left + ((ms - xMin) / xRange) * plotW;
  const yScale = (v) => CHART_PAD.top + plotH - ((v - yMin) / yRange) * plotH;

  // Build SVG
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

  // X-axis date labels
  const xTicks = niceDateTicks(xMin, xMax, 6);
  for (const tick of xTicks) {
    const x = xScale(tick);
    const label = formatDateShort(new Date(tick));
    parts.push(
      `<text x="${x}" y="${CHART_HEIGHT - 8}" text-anchor="middle" fill="${COLORS.text}" font-size="11">${label}</text>`,
    );
    parts.push(
      `<line x1="${x}" y1="${CHART_PAD.top}" x2="${x}" y2="${CHART_HEIGHT - CHART_PAD.bottom}" stroke="${COLORS.grid}" stroke-width="1" stroke-dasharray="2,4" />`,
    );
  }

  // P5–P95 band (polygon)
  if (parsed.length > 1) {
    const bandTop = parsed
      .map((p) => `${xScale(p.dateMs)},${yScale(p.p95)}`)
      .join(" ");
    const bandBot = parsed
      .slice()
      .reverse()
      .map((p) => `${xScale(p.dateMs)},${yScale(p.p5)}`)
      .join(" ");
    parts.push(
      `<polygon points="${bandTop} ${bandBot}" fill="${COLORS.band}" opacity="${COLORS.bandOpacity}" />`,
    );
  }

  // Median line
  if (parsed.length > 1) {
    const linePath = parsed
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"}${xScale(p.dateMs)},${yScale(p.median)}`,
      )
      .join(" ");
    parts.push(
      `<path d="${linePath}" fill="none" stroke="${COLORS.line}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />`,
    );
  }

  // Data points + tooltips
  for (const p of parsed) {
    const cx = xScale(p.dateMs);
    const cy = yScale(p.median);
    const title = `${p.date}${p.version ? ` (${p.version})` : ""}\nMedian: ${p.median}\nMean: ${p.mean}\nP5: ${p.p5} / P95: ${p.p95}\nSamples: ${p.sampleCount}`;
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
    `<text x="${CHART_PAD.left + 86}" y="${legendY}" fill="${COLORS.text}" font-size="11">P5–P95 range</text>`,
  );

  parts.push(`</svg>`);

  el.innerHTML = parts.join("\n");
}

function renderBrowsers(browsers) {
  const el = document.getElementById("history-browsers-content");
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
  const el = document.getElementById("history-versions-content");
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
  const el = document.getElementById("history-suite");
  if (!el) return;

  if (suites.length === 0) {
    el.innerHTML = `<option value="">No suites yet</option>`;
    return;
  }

  // Group suites by prefix (render-*, scroll-*, memory-*, comparison-*, etc.)
  const groups = new Map();
  for (const s of suites) {
    const dashIdx = s.suiteId.indexOf("-");
    const prefix = dashIdx > 0 ? s.suiteId.slice(0, dashIdx) : "other";
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push(s);
  }

  let html = "";
  for (const [prefix, items] of groups) {
    const label = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    html += `<optgroup label="${escapeHtml(label)}">`;
    for (const s of items) {
      const selected = s.suiteId === currentSuiteId ? " selected" : "";
      html += `<option value="${escapeHtml(s.suiteId)}"${selected}>${escapeHtml(s.suiteId)} (${s.totalRuns})</option>`;
    }
    html += `</optgroup>`;
  }

  el.innerHTML = html;
}

function populateVersionSelect(versions) {
  const el = document.getElementById("history-version");
  if (!el) return;

  let html = `<option value="">All versions</option>`;
  for (const v of versions) {
    html += `<option value="${escapeHtml(v.version)}">${escapeHtml(v.version)} (${v.totalRuns} runs)</option>`;
  }
  el.innerHTML = html;
}

function populateMetricSelect(metrics) {
  const el = document.getElementById("history-metric");
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

// =============================================================================
// Chart Helpers
// =============================================================================

/** Generate nice tick values for a numeric axis */
function niceScale(min, max, targetTicks) {
  const range = max - min;
  if (range <= 0) return [min];

  const roughStep = range / targetTicks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;

  let niceStep;
  if (residual <= 1.5) niceStep = magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;

  const niceMin = Math.floor(min / niceStep) * niceStep;
  const niceMax = Math.ceil(max / niceStep) * niceStep;

  const ticks = [];
  for (let v = niceMin; v <= niceMax + niceStep * 0.01; v += niceStep) {
    ticks.push(round(v, 4));
  }
  return ticks;
}

/** Generate evenly-spaced date ticks between two timestamps */
function niceDateTicks(minMs, maxMs, count) {
  const range = maxMs - minMs;
  if (range <= 0) return [minMs];

  const step = range / (count - 1);
  const ticks = [];
  for (let i = 0; i < count; i++) {
    ticks.push(Math.round(minMs + step * i));
  }
  return ticks;
}

/** Format a tick value — remove trailing zeros */
function formatTickValue(v) {
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + "k";
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2).replace(/\.?0+$/, "");
}

/** Format a date as "Jan 5" or "Jan 5 '24" */
function formatDateShort(d) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const now = new Date();
  const sameYear = d.getUTCFullYear() === now.getFullYear();
  const label = `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
  return sameYear ? label : `${label} '${String(d.getUTCFullYear()).slice(2)}`;
}

function round(v, decimals) {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function escapeHtml(str) {
  if (typeof str !== "string") return String(str ?? "");
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
