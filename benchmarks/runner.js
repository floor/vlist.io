// benchmarks/runner.js — Benchmark engine
//
// Manages test lifecycle: warmup → iterations → collect → report.
// Each suite registers via `defineSuite()` and the runner orchestrates execution.

// =============================================================================
// Types (via JSDoc)
// =============================================================================

/**
 * @typedef {Object} BenchmarkConfig
 * @property {number} itemCount - Number of items to test with
 * @property {HTMLElement} container - Offscreen container for vlist instances
 * @property {(message: string) => void} onStatus - Status update callback
 */

/**
 * @typedef {Object} BenchmarkMetric
 * @property {string} label - Human-readable metric name
 * @property {number} value - Measured value
 * @property {string} unit - Unit of measurement (ms, fps, MB, KB, etc.)
 * @property {'lower'|'higher'} better - Which direction is better
 * @property {'good'|'ok'|'bad'} [rating] - Optional quality rating
 */

/**
 * @typedef {Object} BenchmarkResult
 * @property {string} suiteId - Suite identifier
 * @property {number} itemCount - Item count used
 * @property {BenchmarkMetric[]} metrics - Measured metrics
 * @property {number} duration - Total suite run time in ms
 * @property {boolean} success - Whether the suite completed without error
 * @property {string} [error] - Error message if failed
 */

/**
 * @typedef {Object} SuiteDefinition
 * @property {string} id - Unique suite identifier
 * @property {string} name - Display name
 * @property {string} description - What this suite measures
 * @property {string} icon - Emoji icon
 * @property {(config: BenchmarkConfig) => Promise<BenchmarkMetric[]>} run - Execute the benchmark
 */

// =============================================================================
// Suite Registry
// =============================================================================

/** @type {Map<string, SuiteDefinition>} */
const suites = new Map();

/**
 * Register a benchmark suite.
 * @param {SuiteDefinition} suite
 */
export const defineSuite = (suite) => {
  if (suites.has(suite.id)) {
    throw new Error(`Suite "${suite.id}" is already registered`);
  }
  suites.set(suite.id, suite);
};

/**
 * Get all registered suites.
 * @returns {SuiteDefinition[]}
 */
export const getSuites = () => [...suites.values()];

/**
 * Get a single suite by ID.
 * @param {string} id
 * @returns {SuiteDefinition|undefined}
 */
export const getSuite = (id) => suites.get(id);

// =============================================================================
// Utilities
// =============================================================================

/**
 * Wait for the next animation frame.
 * @returns {Promise<number>} timestamp
 */
export const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(resolve));

/**
 * Wait for N animation frames.
 * @param {number} n
 */
export const waitFrames = async (n) => {
  for (let i = 0; i < n; i++) {
    await nextFrame();
  }
};

/**
 * Wait for a specified duration in ms.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Try to trigger garbage collection and let the engine settle.
 * Falls back to a short pause if gc() is unavailable.
 */
export const tryGC = async () => {
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
  // Give the engine time to settle regardless
  await wait(100);
  await waitFrames(3);
};

/**
 * Get current JS heap usage in bytes (Chrome only).
 * Returns null if the API is unavailable.
 * @returns {number|null}
 */
export const getHeapUsed = () => {
  const mem = /** @type {any} */ (performance).memory;
  if (mem && typeof mem.usedJSHeapSize === "number") {
    return mem.usedJSHeapSize;
  }
  return null;
};

/**
 * Format bytes as human-readable MB.
 * @param {number} bytes
 * @returns {number} megabytes (2 decimal places)
 */
export const bytesToMB = (bytes) =>
  Math.round((bytes / (1024 * 1024)) * 100) / 100;

/**
 * Compute the median of an array of numbers.
 * @param {number[]} values
 * @returns {number}
 */
export const median = (values) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * Compute percentile from a sorted-ascending array.
 * @param {number[]} sorted
 * @param {number} p - Percentile (0–100)
 * @returns {number}
 */
export const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

/**
 * Round a number to N decimal places.
 * @param {number} value
 * @param {number} [decimals=1]
 * @returns {number}
 */
export const round = (value, decimals = 1) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

/**
 * Generate a flat array of items for benchmarking.
 * Uses a simple hash for consistent, deterministic data.
 * @param {number} count
 * @returns {Array<{id: number}>}
 */
export const generateItems = (count) => {
  const items = new Array(count);
  for (let i = 0; i < count; i++) {
    items[i] = { id: i };
  }
  return items;
};

/**
 * Simple item template for benchmarks.
 * Intentionally minimal — we're measuring vlist overhead, not template cost.
 * @param {Object} item
 * @param {number} index
 * @returns {string}
 */
export const benchmarkTemplate = (item, index) =>
  `<div class="bench-item">${index}</div>`;

// =============================================================================
// Rating Helpers
// =============================================================================

/**
 * Rate a "lower is better" metric.
 * @param {number} value
 * @param {number} goodThreshold - At or below this is "good"
 * @param {number} okThreshold - At or below this is "ok", above is "bad"
 * @returns {'good'|'ok'|'bad'}
 */
export const rateLower = (value, goodThreshold, okThreshold) => {
  if (value <= goodThreshold) return "good";
  if (value <= okThreshold) return "ok";
  return "bad";
};

/**
 * Rate a "higher is better" metric.
 * @param {number} value
 * @param {number} goodThreshold - At or above this is "good"
 * @param {number} okThreshold - At or above this is "ok", below is "bad"
 * @returns {'good'|'ok'|'bad'}
 */
export const rateHigher = (value, goodThreshold, okThreshold) => {
  if (value >= goodThreshold) return "good";
  if (value >= okThreshold) return "ok";
  return "bad";
};

// =============================================================================
// Runner
// =============================================================================

/**
 * @typedef {Object} RunOptions
 * @property {number[]} [itemCounts] - Item counts to test (default: [10_000, 100_000, 1_000_000])
 * @property {string[]} [suiteIds] - Which suites to run (default: all)
 * @property {HTMLElement} container - Offscreen container element
 * @property {(result: BenchmarkResult) => void} [onResult] - Called after each suite+itemCount
 * @property {(suiteId: string, itemCount: number, message: string) => void} [onStatus] - Progress updates
 * @property {() => void} [onComplete] - Called when all benchmarks finish
 * @property {AbortSignal} [signal] - Abort signal to cancel the run
 */

/**
 * Run benchmark suites.
 *
 * Executes each requested suite at each item count, sequentially.
 * Suites run in isolation: the container is cleaned between each run.
 *
 * @param {RunOptions} options
 * @returns {Promise<BenchmarkResult[]>}
 */
export const runBenchmarks = async (options) => {
  const {
    itemCounts = [10_000, 100_000, 1_000_000],
    suiteIds,
    container,
    getContainer,
    onResult,
    onStatus,
    onComplete,
    signal,
  } = options;

  const suitesToRun = suiteIds
    ? suiteIds.map((id) => suites.get(id)).filter(Boolean)
    : [...suites.values()];

  /** @type {BenchmarkResult[]} */
  const results = [];

  for (const suite of suitesToRun) {
    for (const itemCount of itemCounts) {
      // Check for abort
      if (signal?.aborted) {
        return results;
      }

      const status = (message) => {
        onStatus?.(suite.id, itemCount, message);
      };

      status("Preparing...");

      // Get the visible container for this suite (on-screen for accurate FPS)
      // Falls back to the legacy offscreen container if getContainer is not provided
      const parentContainer = getContainer ? getContainer(suite.id) : container;

      // Clean the container
      parentContainer.innerHTML = "";

      // Create a fresh container element for this run
      const runContainer = document.createElement("div");
      runContainer.style.cssText =
        "width:100%;height:100%;position:relative;overflow:hidden;";
      parentContainer.appendChild(runContainer);

      // Let the DOM settle
      await tryGC();

      const runStart = performance.now();

      /** @type {BenchmarkResult} */
      let result;

      try {
        status("Running...");

        const metrics = await suite.run({
          itemCount,
          container: runContainer,
          onStatus: status,
        });

        result = {
          suiteId: suite.id,
          itemCount,
          metrics,
          duration: round(performance.now() - runStart, 0),
          success: true,
        };
      } catch (err) {
        result = {
          suiteId: suite.id,
          itemCount,
          metrics: [],
          duration: round(performance.now() - runStart, 0),
          success: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }

      // Clean up
      parentContainer.innerHTML = "";
      await tryGC();

      results.push(result);
      onResult?.(result);
    }
  }

  onComplete?.();
  return results;
};

// =============================================================================
// Item Count Formatting
// =============================================================================

/**
 * Format an item count for display.
 * @param {number} count
 * @returns {string}
 */
export const formatItemCount = (count) => {
  if (count >= 1_000_000) return `${count / 1_000_000}M`;
  if (count >= 1_000) return `${count / 1_000}K`;
  return String(count);
};
