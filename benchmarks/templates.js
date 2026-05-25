// benchmarks/templates.js — HTML Templates for Benchmark Pages
//
// Separates presentation (HTML) from logic (script.js).
// All static HTML templates and page builders live here.

import vlistPackage from "vlist/package.json";
import { STRESS_LEVELS, formatItemCount } from "./runner.js";
import { SCROLL_SPEEDS } from "./suites/scroll/constants.js";

const HISTORY_ITEM_COUNTS = [10_000, 100_000, 1_000_000];

const ITEM_COUNTS = [10_000, 100_000, 1_000_000];
const INITIAL_ITEM_COUNT = ITEM_COUNTS[0];

// =============================================================================
// Helpers
// =============================================================================

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

function getVlistVersion() {
  return vlistPackage.version;
}

// =============================================================================
// Suite Page Template
// =============================================================================

export function buildSuitePageHTML(suite, variantSwitcherHTML = "") {
  return `
    ${variantSwitcherHTML}
    <div class="bench-page">
      <!-- Header -->
      <header class="bench-header">
        <h1 class="bench-header__title">${escapeHtml(suite.name)}</h1>
        <p class="bench-header__desc">${escapeHtml(suite.description)}</p>
        <div class="bench-header__meta">
          <span class="bench-tag bench-tag--accent">vlist ${getVlistVersion()}</span>
          <span class="bench-tag">${navigator.userAgent.includes("Chrome") ? "Chrome — full metrics" : "⚠️ Use Chrome for memory metrics"}</span>
          <span class="bench-tag">${navigator.hardwareConcurrency || "?"}-core CPU</span>
        </div>
      </header>

      <!-- Controls -->
      <div class="bench-controls" id="bench-controls">
        <span class="bench-controls__label">Items</span>
        <div class="ui-segmented" id="bench-sizes">
          ${ITEM_COUNTS.map(
            (count) =>
              `<button class="ui-segmented__btn${count === INITIAL_ITEM_COUNT ? " ui-segmented__btn--active" : ""}" data-count="${count}">${formatItemCount(count)}</button>`,
          ).join("")}
        </div>
        ${
          suite.comparison
            ? `
        <div class="bench-controls__sep"></div>
        <span class="bench-controls__label">Stress ms</span>
        <div class="ui-segmented" id="bench-stress">
          ${STRESS_LEVELS.map(
            (level, i) =>
              `<button class="ui-segmented__btn bench-stress-btn${i === 0 ? " ui-segmented__btn--active" : ""}" data-stress="${level.ms}" title="${level.ms === 0 ? "No extra CPU load" : `Burn ${level.ms}ms of CPU per frame during scroll`}">${level.label}</button>`,
          ).join("")}
        </div>
        `
            : ""
        }
        ${
          suite.hasScrollSpeed
            ? `
        <div class="bench-controls__sep"></div>
        <span class="bench-controls__label">Speed</span>
        <div class="ui-segmented" id="bench-scroll-speed">
          ${SCROLL_SPEEDS.map(
            (speed, i) =>
              `<button class="ui-segmented__btn bench-speed-btn${i === 0 ? " ui-segmented__btn--active" : ""}" data-speed="${speed.pxPerSec}" title="${speed.pxPerSec.toLocaleString()} px/s — ${speed.id} scroll speed">${speed.label}</button>`,
          ).join("")}
        </div>
        `
            : ""
        }
        <div class="bench-controls__sep"></div>
        <button class="ui-btn ui-btn--primary" id="bench-run">▶ Run</button>
      </div>

      <!-- Suite Card -->
      <div class="bench-suites" id="bench-suites"></div>

      <!-- Footer -->
      <footer class="bench-footer">
        <p>
          Benchmarks run locally in your browser — results depend on your hardware.
          <br>
          <a href="https://github.com/floor/vlist" target="_blank">github.com/floor/vlist</a>
          ·
          <a href="/examples/">Examples</a>
          ·
          <a href="/">vlist.io</a>
        </p>
      </footer>
    </div>
  `;
}

// =============================================================================
// Bundle Size Page Template
// =============================================================================

export function buildBundlePageHTML(bundleData) {
  const rows = bundleData
    .map((row) => {
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
        <td class="table-note-cell">${escapeHtml(row.note)}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="bench-page">
      <div class="ui-card ui-card--xl bench-bundle">
        <h2 class="bench-bundle__title">📦 Bundle Size</h2>
        <p class="bench-bundle__desc">Minified and gzipped sizes — smaller is better for load time.</p>
        <table class="bench-bundle__table">
          <thead>
            <tr>
              <th>Library</th>
              <th>Minified</th>
              <th>Gzipped</th>
              <th>Deps</th>
              <th class="table-header-left">Notes</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="bench-bundle__note">
          Sizes measured via local build (Bun) and verified with bundlephobia.com where available.
          vlist/core is the lightweight entry point for simple lists. The full bundle includes all features.
        </p>
      </div>
    </div>
  `;
}

// =============================================================================
// Features Page Template
// =============================================================================

export function buildFeaturesPageHTML(featureLibs, featureData) {
  const headerCells = featureLibs
    .map((lib) => `<th>${escapeHtml(lib)}</th>`)
    .join("");

  const rows = featureData
    .map(([feature, ...values]) => {
      const cells = values.map((v) => `<td>${v}</td>`).join("");
      return `<tr><td>${escapeHtml(feature)}</td>${cells}</tr>`;
    })
    .join("");

  return `
    <div class="bench-page">
      <div class="ui-card ui-card--xl bench-features">
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
        <p class="bench-features__note">
          ✅ = Supported · ⚠️ = Partial support · ❌ = Not supported · — = Not applicable
        </p>
      </div>
    </div>
  `;
}

// =============================================================================
// Suite History Page Template
// =============================================================================

export function buildSuiteHistoryPageHTML() {
  const version = vlistPackage.version;

  return `
    <div class="bench-page bench-history">
      <header class="bench-header">
        <h1 class="bench-header__title">📊 Suite History</h1>
        <p class="bench-header__desc">
          Crowdsourced vlist benchmark results collected from all visitors.
          Every time someone runs a suite benchmark (render, scroll, memory, scrollTo)
          on this site, the result is stored and aggregated here — giving
          statistically meaningful data across hardware, browsers, and vlist versions.
        </p>
      </header>

      <!-- Summary Card -->
      <div class="ui-card ui-card--xl bench-history__summary" id="suite-history-summary">
        <div class="bench-history__loading">Loading summary…</div>
      </div>

      <!-- Filters -->
      <div class="bench-history__filters" id="suite-history-filters">
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Suite</label>
          <select class="bench-history__select" id="suite-history-suite">
            <option value="">Loading…</option>
          </select>
        </div>
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Item Count</label>
          <div class="ui-segmented" id="suite-history-item-count">
            <button class="ui-segmented__btn ui-segmented__btn--active" data-count="0">All</button>
            ${HISTORY_ITEM_COUNTS.map(
              (count) =>
                `<button class="ui-segmented__btn" data-count="${count}">${formatItemCount(count)}</button>`,
            ).join("")}
          </div>
        </div>
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Version</label>
          <select class="bench-history__select" id="suite-history-version">
            <option value="">All versions</option>
          </select>
        </div>

      </div>

      <!-- Results Card -->
      <div class="ui-card ui-card--xl bench-history__stats-card" id="suite-history-stats">
        <h2 class="bench-history__section-title">Results</h2>
        <p class="bench-history__section-desc">Crowdsourced median values across all submissions for the selected filters.</p>
        <div id="suite-history-stats-content">
          <div class="bench-history__loading">Select a suite to view results…</div>
        </div>
      </div>

      <!-- Chart Area -->
      <div class="ui-card ui-card--xl bench-history__chart-card" id="suite-history-chart-card">
        <h2 class="bench-history__section-title">Version Trend</h2>
        <p class="bench-history__section-desc">Median value per version with p5–p95 range band. Versions ordered oldest → newest.</p>
        <div class="bench-history__metric-select-row">
          <label class="bench-history__filter-label">Metric</label>
          <select class="bench-history__select" id="suite-history-metric">
            <option value="">Select suite first</option>
          </select>
        </div>
        <div class="bench-history__chart-container" id="suite-history-chart">
          <div class="bench-history__loading">Select a suite and metric…</div>
        </div>
      </div>

      <!-- Browsers Card -->
      <div class="ui-card ui-card--xl bench-history__browsers-card" id="suite-history-browsers">
        <h2 class="bench-history__section-title">Browser Breakdown</h2>
        <p class="bench-history__section-desc">Distribution of submissions by browser.</p>
        <div id="suite-history-browsers-content">
          <div class="bench-history__loading">Loading…</div>
        </div>
      </div>

      <!-- Versions Card -->
      <div class="ui-card ui-card--xl bench-history__versions-card" id="suite-history-versions">
        <h2 class="bench-history__section-title">Version History</h2>
        <p class="bench-history__section-desc">All vlist versions with benchmark data.</p>
        <div id="suite-history-versions-content">
          <div class="bench-history__loading">Loading…</div>
        </div>
      </div>

      <!-- Contribute CTA -->
      <div class="bench-history__cta" id="suite-history-cta">
        <h2 class="bench-history__cta-title">Help improve these results</h2>
        <p class="bench-history__cta-desc">
          Every benchmark run is automatically stored and aggregated here.
          More data = more confidence. Run a suite benchmark to contribute!
        </p>
        <div class="bench-history__cta-links" id="suite-history-cta-links"></div>
      </div>

      <footer class="bench-footer">
        <p>
          Data is crowdsourced from all visitors — results represent real-world hardware diversity.
          <br>Current version: <strong>vlist ${escapeHtml(version)}</strong>
        </p>
      </footer>
    </div>
  `;
}

// =============================================================================
// CI Results Page Template
// =============================================================================

export function buildCiResultsPageHTML() {
  const version = vlistPackage.version;

  return `
    <div class="bench-page bench-history bench-ci-results">
      <header class="bench-header">
        <h1 class="bench-header__title">CI Results</h1>
        <p class="bench-header__desc">
          Automated benchmark runs from the CI workflow. This view is intended
          for contributors tracking performance changes by branch, commit, suite,
          and item count before results become public benchmark claims.
        </p>
      </header>

      <div class="ui-card ui-card--xl bench-history__summary" id="ci-results-summary">
        <div class="bench-history__loading">Loading CI summary…</div>
      </div>

      <div class="bench-history__filters" id="ci-results-filters">
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Branch</label>
          <select class="bench-history__select" id="ci-results-branch">
            <option value="">All branches</option>
          </select>
        </div>
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Suite</label>
          <select class="bench-history__select" id="ci-results-suite">
            <option value="">All suites</option>
          </select>
        </div>
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Item Count</label>
          <select class="bench-history__select" id="ci-results-item-count">
            <option value="">All counts</option>
          </select>
        </div>
        <div class="bench-history__filter-group">
          <label class="bench-history__filter-label">Status</label>
          <select class="bench-history__select" id="ci-results-status">
            <option value="">All statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div class="ui-card ui-card--xl bench-history__stats-card" id="ci-results-runs">
        <h2 class="bench-history__section-title">Latest Runs</h2>
        <p class="bench-history__section-desc">Most recent automated benchmark results stored by the CI workflow.</p>
        <div id="ci-results-runs-content">
          <div class="bench-history__loading">Loading runs…</div>
        </div>
      </div>

      <footer class="bench-footer">
        <p>
          CI data is stored separately from crowdsourced benchmark history.
          <br>Current version: <strong>vlist ${escapeHtml(version)}</strong>
        </p>
      </footer>
    </div>
  `;
}

