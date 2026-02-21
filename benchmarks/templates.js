// benchmarks/templates.js — HTML Templates for Benchmark Pages
//
// Separates presentation (HTML) from logic (script.js).
// All static HTML templates and page builders live here.

// =============================================================================
// Helpers
// =============================================================================

const escapeHtml = (str) => {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
};

function getVlistVersion() {
  return "0.4.0"; // TODO: Extract from package.json
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
        <h1 class="bench-header__title">${suite.icon} ${escapeHtml(suite.name)}</h1>
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
        <div class="bench-controls__sizes" id="bench-sizes"></div>
        <div class="bench-controls__sep"></div>
        <button class="bench-run-btn" id="bench-run">▶ Run</button>
        <span class="bench-status" id="bench-status">Ready</span>
      </div>

      <!-- Progress -->
      <div class="bench-progress" id="bench-progress">
        <div class="bench-progress__bar" id="bench-progress-bar"></div>
        <div class="bench-progress__text" id="bench-progress-text">0%</div>
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
          <a href="/">vlist.dev</a>
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
      <div class="bench-bundle">
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
      <div class="bench-features">
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
// Comparisons Overview Page Template
// =============================================================================

export function buildComparisonsOverviewHTML() {
  return `
    <div class="bench-page">
      <div class="bench-bundle">
        <h2 class="bench-bundle__title">⚔️ Library Comparisons</h2>
        <p class="bench-bundle__desc">
          Objective, reproducible performance comparisons between vlist and popular virtualization libraries.
          All benchmarks run live in your browser on real data.
        </p>

        <h3 class="section-title">📊 Available Comparisons</h3>
        <div class="comparison-grid">
          <a href="/benchmarks/performance-comparison" class="comparison-card">
            <strong class="comparison-card__title">⚔️ Performance Comparison</strong>
            <div class="comparison-card__desc">Side-by-side performance metrics across all libraries</div>
          </a>
          <a href="/benchmarks/react-window" class="comparison-card">
            <strong class="comparison-card__title">react-window</strong>
            <div class="comparison-card__desc">React library by Brian Vaughn, minimal and focused</div>
          </a>
          <a href="/benchmarks/tanstack-virtual" class="comparison-card">
            <strong class="comparison-card__title">TanStack Virtual</strong>
            <div class="comparison-card__desc">Headless virtualization for React, Vue, Solid, Svelte</div>
          </a>
          <a href="/benchmarks/virtua" class="comparison-card">
            <strong class="comparison-card__title">Virtua</strong>
            <div class="comparison-card__desc">Zero-config, ~3kB per component for React/Vue/Solid/Svelte</div>
          </a>
          <a href="/benchmarks/vue-virtual-scroller" class="comparison-card">
            <strong class="comparison-card__title">vue-virtual-scroller</strong>
            <div class="comparison-card__desc">Vue 3 component (2.0 beta, stable 1.x from 2022)</div>
          </a>
        </div>

        <h3 class="section-title">🔬 Methodology</h3>
        <div class="info-box">
          <p class="info-box__intro">All benchmarks follow the same rigorous methodology:</p>

          <ol class="info-list">
            <li class="info-list__item">
              <strong class="info-list__label">Isolated Environment:</strong> Each library runs in a clean container with identical setup
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Multiple Iterations:</strong> Render time measured across 5 iterations, median value reported
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Garbage Collection:</strong> Manual GC between tests to ensure clean memory baselines
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Real Scrolling:</strong> 5 seconds of programmatic scrolling at 100px/frame with direction changes
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Native APIs:</strong> Uses Chrome's performance.memory API (requires full metrics mode)
            </li>
          </ol>
        </div>

        <h3 class="section-title">📈 Metrics Explained</h3>
        <table class="bench-bundle__table metrics-table">
          <thead>
            <tr>
              <th class="metrics-table__metric-col">Metric</th>
              <th class="table-header-left">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Render Time</strong></td>
              <td class="metrics-table__desc">
                Time from createVList() to first paint. Lower is better.
                Measures initial setup, DOM creation, and first layout pass.
              </td>
            </tr>
            <tr>
              <td><strong>Memory Usage</strong></td>
              <td class="metrics-table__desc">
                JavaScript heap size after render (delta from baseline). Lower is better.
                Includes framework overhead, virtual item state, and DOM nodes.
              </td>
            </tr>
            <tr>
              <td><strong>Scroll FPS</strong></td>
              <td class="metrics-table__desc">
                Median frames per second during sustained scrolling. Higher is better.
                120 FPS indicates hitting the monitor refresh rate cap (no dropped frames).
              </td>
            </tr>
            <tr>
              <td><strong>P95 Frame Time</strong></td>
              <td class="metrics-table__desc">
                95th percentile frame time during scrolling. Lower is better.
                Measures consistency — lower values mean fewer frame drops and stutters.
              </td>
            </tr>
          </tbody>
        </table>

        <h3 class="section-title">⚠️ Important Notes</h3>
        <div class="info-box">
          <ul class="info-list">
            <li class="info-list__item">
              <strong class="info-list__label">Hardware-dependent:</strong> Results vary by CPU, GPU, and browser version
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Chrome required:</strong> Memory measurements use Chrome-specific APIs
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Enable full metrics:</strong> Chrome must be launched with <code>--enable-precise-memory-info</code>
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Simple items:</strong> Benchmarks use basic text items (no images, complex rendering)
            </li>
            <li class="info-list__item">
              <strong class="info-list__label">Fixed heights:</strong> All comparisons use 48px fixed-height items for consistency
            </li>
          </ul>
        </div>

        <p class="page-footer-note">
          Click any comparison above to run the benchmarks yourself. Source code available in
          <a href="https://github.com/floor/vlist.dev/tree/main/benchmarks/comparison" target="_blank">benchmarks/comparison/</a>
        </p>
      </div>
    </div>
  `;
}

// =============================================================================
// Performance Comparison Page Template
// =============================================================================

export function buildPerformanceComparisonHTML(performanceData) {
  const rows = performanceData
    .map((row) => {
      const libClass = row.self
        ? "bench-bundle__lib bench-bundle__lib--self"
        : "bench-bundle__lib";

      // Highlight vlist's best metrics
      const renderClass = row.self ? "bench-bundle__highlight" : "";
      const memoryClass = row.self ? "bench-bundle__highlight" : "";

      return `
      <tr>
        <td class="${libClass}">${escapeHtml(row.lib)}</td>
        <td class="${renderClass}">${row.renderTime} ms</td>
        <td class="${memoryClass}">${row.memory} MB</td>
        <td>${row.scrollFPS} fps</td>
        <td>${row.p95Frame} ms</td>
        <td class="table-note-cell">${escapeHtml(row.ecosystem)}</td>
      </tr>
    `;
    })
    .join("");

  return `
    <div class="bench-page">
      <div class="bench-bundle">
        <h2 class="bench-bundle__title">⚔️ Performance Comparison</h2>
        <p class="bench-bundle__desc">Head-to-head performance metrics at 10,000 items — all benchmarks run in your browser.</p>
        <table class="bench-bundle__table">
          <thead>
            <tr>
              <th>Library</th>
              <th>Render Time</th>
              <th>Memory Usage</th>
              <th>Scroll FPS</th>
              <th>P95 Frame</th>
              <th class="table-header-left">Ecosystem</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p class="bench-bundle__note">
          <strong>Render Time:</strong> Initial render latency (lower is better).<br>
          <strong>Memory Usage:</strong> JS heap after render (lower is better).<br>
          <strong>Scroll FPS:</strong> Sustained scroll performance (higher is better, 120 is monitor cap).<br>
          <strong>P95 Frame Time:</strong> 95th percentile frame time consistency (lower is better).<br>
          Run individual comparisons for detailed analysis.
        </p>
      </div>
    </div>
  `;
}
