// benchmarks/ci-results.js — Contributor-facing CI benchmark result view.

import { buildCiResultsPageHTML } from "./templates.js";
import { formatItemCount } from "./runner.js";
import { formatMetricValue } from "./history-utils.js";

const API_BASE = "/api/benchmarks/ci";

let summaryData = null;
let currentBranch = "";
let currentSuiteId = "";
let currentItemCount = "";
let currentStatus = "";

export function buildCiResultsPage(root) {
  root.innerHTML = buildCiResultsPageHTML();

  Promise.all([fetchJSON(`${API_BASE}/summary`), fetchRuns()])
    .then(([summary, runs]) => {
      summaryData = summary;
      renderSummary(summary);
      populateFilters(summary);
      renderRuns(runs?.items ?? []);
      wireFilters();
    })
    .catch((err) => {
      console.error("[ci-results] Failed to load CI benchmark data:", err);
      renderError(
        "ci-results-summary",
        "Failed to load CI benchmark data. Make sure the database is initialized.",
      );
    });
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text();
      console.warn(`[ci-results] ${url} -> ${res.status}:`, body);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn(`[ci-results] fetch failed for ${url}:`, err);
    return null;
  }
}

function fetchRuns() {
  const params = new URLSearchParams({ limit: "80" });
  if (currentBranch) params.set("branch", currentBranch);
  if (currentSuiteId) params.set("suiteId", currentSuiteId);
  if (currentItemCount) params.set("itemCount", currentItemCount);
  if (currentStatus) params.set("status", currentStatus);
  return fetchJSON(`${API_BASE}/runs?${params}`);
}

function wireFilters() {
  for (const [id, setter] of [
    ["ci-results-branch", (value) => (currentBranch = value)],
    ["ci-results-suite", (value) => (currentSuiteId = value)],
    ["ci-results-item-count", (value) => (currentItemCount = value)],
    ["ci-results-status", (value) => (currentStatus = value)],
  ]) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("change", async () => {
      setter(el.value);
      const data = await fetchRuns();
      renderRuns(data?.items ?? []);
    });
  }
}

function renderSummary(data) {
  const el = document.getElementById("ci-results-summary");
  if (!el) return;

  if (!data || data.totalRuns === 0) {
    el.innerHTML = `
      <h2 class="bench-history__section-title">Overview</h2>
      <div class="bench-history__empty">No CI benchmark results stored yet.</div>
    `;
    return;
  }

  el.innerHTML = `
    <h2 class="bench-history__section-title">Overview</h2>
    <div class="bench-history__summary-grid">
      ${summaryStat(data.totalRuns, "Runs")}
      ${summaryStat(data.successfulRuns, "Passed")}
      ${summaryStat(data.failedRuns, "Failed")}
      ${summaryStat(data.uniqueBranches, "Branches")}
      ${summaryStat(data.uniqueSuites, "Suites")}
      ${summaryStat(formatDate(data.newestRun), "Latest")}
    </div>
  `;
}

function summaryStat(value, label) {
  return `
    <div class="bench-history__stat">
      <div class="bench-history__stat-value">${escapeHtml(String(value ?? "0"))}</div>
      <div class="bench-history__stat-label">${escapeHtml(label)}</div>
    </div>
  `;
}

function populateFilters(data) {
  if (!data) return;

  const branchSelect = document.getElementById("ci-results-branch");
  if (branchSelect) {
    branchSelect.innerHTML = `
      <option value="">All branches</option>
      ${(data.branches ?? [])
        .map(
          (branch) =>
            `<option value="${escapeHtml(branch.branch)}">${escapeHtml(branch.branch)} (${branch.runs})</option>`,
        )
        .join("")}
    `;
  }

  const suiteSelect = document.getElementById("ci-results-suite");
  if (suiteSelect) {
    suiteSelect.innerHTML = `
      <option value="">All suites</option>
      ${(data.suites ?? [])
        .map(
          (suite) =>
            `<option value="${escapeHtml(suite.suiteId)}">${escapeHtml(suite.suiteId)} (${suite.runs})</option>`,
        )
        .join("")}
    `;
  }

  const countSelect = document.getElementById("ci-results-item-count");
  if (countSelect) {
    countSelect.innerHTML = `
      <option value="">All counts</option>
      ${(data.itemCounts ?? [])
        .map(
          (count) =>
            `<option value="${count}">${escapeHtml(formatItemCount(count))}</option>`,
        )
        .join("")}
    `;
  }
}

function renderRuns(runs) {
  const el = document.getElementById("ci-results-runs-content");
  if (!el) return;

  if (!runs.length) {
    el.innerHTML = `<div class="bench-history__empty">No CI runs match the selected filters.</div>`;
    return;
  }

  el.innerHTML = `
    <div class="bench-history__table-wrapper">
      <table class="bench-history__table bench-ci-results__table">
        <thead>
          <tr>
            <th>Run</th>
            <th>Suite</th>
            <th>Branch</th>
            <th>Commit</th>
            <th>Status</th>
            <th>Metrics</th>
          </tr>
        </thead>
        <tbody>
          ${runs.map(renderRunRow).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRunRow(run) {
  const workflow = run.workflowRunId
    ? `<span class="bench-ci-results__meta">workflow ${escapeHtml(run.workflowRunId)}</span>`
    : "";
  const branch = run.branch ?? "unknown";
  const sha = run.gitSha ? run.gitSha.slice(0, 7) : "";
  const statusClass = run.success
    ? "bench-ci-results__status--success"
    : "bench-ci-results__status--failed";
  const statusText = run.success ? "passed" : "failed";

  return `
    <tr>
      <td>
        <div class="bench-ci-results__primary">${escapeHtml(formatDateTime(run.createdAt))}</div>
        ${workflow}
      </td>
      <td>
        <div class="bench-ci-results__primary">${escapeHtml(run.suiteId)}</div>
        <span class="bench-ci-results__meta">${escapeHtml(formatItemCount(run.itemCount))}</span>
      </td>
      <td>${escapeHtml(branch)}</td>
      <td>
        ${
          sha
            ? `<span class="bench-history__version-cell">${escapeHtml(sha)}</span>`
            : `<span class="bench-ci-results__meta">unknown</span>`
        }
      </td>
      <td>
        <span class="bench-ci-results__status ${statusClass}">${statusText}</span>
        ${run.error ? `<div class="bench-ci-results__error">${escapeHtml(run.error)}</div>` : ""}
      </td>
      <td>${renderMetricChips(run.metrics ?? [])}</td>
    </tr>
  `;
}

function renderMetricChips(metrics) {
  if (!metrics.length) {
    return `<span class="bench-ci-results__meta">No metrics</span>`;
  }

  return `
    <div class="bench-ci-results__metrics">
      ${metrics
        .map((metric) => {
          const value = formatMetricValue(metric.value, metric.unit);
          const rating = metric.rating ? ` bench-ci-results__metric--${metric.rating}` : "";
          return `
            <span class="bench-ci-results__metric${rating}">
              <span>${escapeHtml(metric.label)}</span>
              <strong>${escapeHtml(value)}</strong>
            </span>
          `;
        })
        .join("")}
    </div>
  `;
}

function formatDate(value) {
  if (!value) return "none";
  return new Date(`${value}Z`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "unknown";
  return new Date(`${value}Z`).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderError(id, message) {
  const el = document.getElementById(id);
  if (el) {
    el.innerHTML = `<div class="bench-history__error">${escapeHtml(message)}</div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
