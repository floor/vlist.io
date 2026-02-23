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
  // console.log(`[runner] Registering suite: ${suite.id}`);
  suites.set(suite.id, suite);
  // console.log(`[runner] Suite registered. Total suites: ${suites.size}`);
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

// =============================================================================
// CPU Stress — simulated app workload
// =============================================================================

/**
 * Available stress levels for comparison benchmarks.
 * Each level burns a fixed amount of CPU time per frame during scroll
 * measurement, simulating an application with other work alongside
 * the virtual list.
 *
 * At "heavy" (6 ms per frame) on a 120 Hz display (8.33 ms budget),
 * only ~2.3 ms remains for the library's own rendering — enough to
 * separate a fast library from a slow one.
 */
export const STRESS_LEVELS = [
  { id: "none", label: "None", ms: 0 },
  { id: "light", label: "Light", ms: 3 },
  { id: "medium", label: "Medium", ms: 5 },
  { id: "heavy", label: "Heavy", ms: 7 },
];

/**
 * Burn CPU for approximately `targetMs` milliseconds.
 *
 * Uses a tight busy-wait loop with `performance.now()` as the exit
 * condition. The loop body cannot be dead-code-eliminated because
 * `performance.now()` reads the system clock (observable side-effect).
 *
 * @param {number} targetMs - Milliseconds of CPU time to consume
 */
export const burnCpu = (targetMs) => {
  if (targetMs <= 0) return;
  const end = performance.now() + targetMs;
  while (performance.now() < end) {
    /* busy wait */
  }
};

// =============================================================================
// Performance Timeline — mark/measure timing
// =============================================================================

/** @type {number} Unique counter for non-colliding mark names */
let _measureId = 0;

/**
 * Measure the duration of an async function using the Performance Timeline API
 * (`performance.mark` + `performance.measure`).
 *
 * This gives structured timing data that integrates with the browser DevTools
 * Performance panel, and avoids manual `performance.now()` diffing.
 *
 * Falls back to `performance.now()` if the mark/measure API throws.
 *
 * @template T
 * @param {string} label - Human-readable label (used in DevTools)
 * @param {() => Promise<T>} fn - Async function to time
 * @returns {Promise<{duration: number, result: T}>}
 */
export const measureDuration = async (label, fn) => {
  const id = _measureId++;
  const startMark = `bench-start-${id}`;
  const endMark = `bench-end-${id}`;
  const measureName = `bench-${label}-${id}`;

  try {
    performance.mark(startMark);
    const result = await fn();
    performance.mark(endMark);

    const entry = performance.measure(measureName, startMark, endMark);
    const duration = entry.duration;

    // Clean up to avoid leaking entries
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);

    return { duration, result };
  } catch (err) {
    // Clean up on error, then re-throw
    try {
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(measureName);
    } catch (_) {
      /* ignore cleanup errors */
    }
    throw err;
  }
};

// =============================================================================
// Robust Memory Measurement
// =============================================================================

/**
 * Aggressive heap settling — multiple GC + wait cycles.
 *
 * More thorough than `tryGC()`. Designed for memory measurements where
 * residual garbage from previous operations must be reclaimed before
 * taking a heap snapshot.
 *
 * @param {number} [cycles=3] - Number of GC + settle cycles
 */
export const settleHeap = async (cycles = 3) => {
  for (let i = 0; i < cycles; i++) {
    if (typeof globalThis.gc === "function") {
      globalThis.gc();
    }
    await wait(150);
    await waitFrames(5);
  }
};

/**
 * Take a validated heap delta measurement.
 *
 * Measures the memory cost of a create/settle cycle by snapshotting the heap
 * before and after. Rejects negative deltas (GC artifacts) and returns `null`
 * when the measurement is unreliable or the API is unavailable.
 *
 * Uses `settleHeap()` before the baseline for maximum isolation from previous
 * benchmark phases.
 *
 * @param {() => Promise<void>} create - Mount the component (must leave it alive)
 * @param {number} [settleFrames=5] - Frames to wait after creation before measuring
 * @returns {Promise<number|null>} Memory delta in bytes, or null if unreliable
 */
export const measureMemoryDelta = async (create, settleFrames = 5) => {
  // Aggressive settle to flush garbage from prior phases
  await settleHeap();

  const before = getHeapUsed();
  if (before === null) return null;

  // Create the component under test
  await create();
  await waitFrames(settleFrames);

  // Gentle GC to reclaim transient allocations (createElement temporaries, etc.)
  // but not so aggressive that we reclaim the component itself
  await tryGC();

  const after = getHeapUsed();
  if (after === null) return null;

  const delta = after - before;

  // Negative delta means GC reclaimed more old garbage than the component
  // allocated — this is a measurement artifact, not real data
  if (delta < 0) return null;

  return delta;
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
export const benchmarkTemplate = (item, index) => String(index);

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
 * @property {number} [stressMs=0] - CPU burn per frame during scroll (comparison suites only)
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
    stressMs = 0,
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
          stressMs,
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
