// src/api/benchmarks.ts
// Benchmarks API — crowdsourced benchmark result storage and aggregation.
// Backed by SQLite (data/benchmarks.db), created by scripts/seed-benchmarks.ts.
//
// Two separate table pairs:
//   - benchmark_runs + benchmark_metrics    → vlist suite results (render, scroll, memory, scrollto)
//   - comparison_runs + comparison_metrics  → library comparison results (react-window, virtua, etc.)
//
// The POST endpoint auto-routes to the correct tables based on suite ID.
// GET endpoints accept a `type=comparison|suite` param (defaults to "comparison" for history page).
//
// Endpoints:
//   POST /api/benchmarks                — store a result (auto-routed by suite ID)
//   GET  /api/benchmarks/stats          — aggregated stats
//   GET  /api/benchmarks/history        — time-series data for charts
//   GET  /api/benchmarks/versions       — list all known versions
//   GET  /api/benchmarks/suites         — list all known suite IDs
//   GET  /api/benchmarks/browsers       — browser breakdown
//   GET  /api/benchmarks/summary        — high-level overview

import { Database } from "bun:sqlite";
import { resolve } from "path";
import { existsSync } from "fs";

// =============================================================================
// Database Connection (singleton)
// =============================================================================

let dbPath = resolve(import.meta.dir, "../../data/benchmarks.db");

let db: Database | null = null;

/**
 * Override the database path (for test isolation).
 * Must be called before any API function that touches the DB.
 */
export function setDbPath(path: string): void {
  dbPath = path;
  // Close existing connection so getDb() reopens at the new path
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Close the current DB connection and reset the singleton.
 * Useful for test cleanup (afterAll).
 */
export function resetDb(): void {
  if (db) {
    db.close();
    db = null;
  }
  dbPath = resolve(import.meta.dir, "../../data/benchmarks.db");
}

function getDb(): Database {
  if (!db) {
    if (!existsSync(dbPath)) {
      throw new Error(
        "benchmarks.db not found. Run: bun run scripts/seed-benchmarks.ts",
      );
    }
    db = new Database(dbPath);
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA cache_size = -4000"); // 4 MB cache
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}

// =============================================================================
// Table Routing — comparison vs suite
// =============================================================================

/** Comparison suite IDs — these go to comparison_* tables */
const COMPARISON_SUITE_IDS = new Set([
  "react-window",
  "react-virtuoso",
  "tanstack-virtual",
  "virtua",
  "vue-virtual-scroller",
  "solidjs",
  "legend-list",
  "clusterize",
]);

type TableType = "comparison" | "suite";

interface TableNames {
  runs: string;
  metrics: string;
}

function isComparison(suiteId: string): boolean {
  return COMPARISON_SUITE_IDS.has(suiteId);
}

function tableType(suiteId: string): TableType {
  return isComparison(suiteId) ? "comparison" : "suite";
}

function tables(type: TableType): TableNames {
  if (type === "comparison") {
    return { runs: "comparison_runs", metrics: "comparison_metrics" };
  }
  return { runs: "benchmark_runs", metrics: "benchmark_metrics" };
}

// =============================================================================
// Types
// =============================================================================

interface MetricInput {
  label: string;
  value: number;
  unit: string;
  better: "lower" | "higher" | "none";
  rating?: "good" | "ok" | "bad" | "info" | null;
}

interface BenchmarkResultInput {
  version: string;
  suiteId: string;
  itemCount: number;
  metrics: MetricInput[];
  duration: number;
  success: boolean;
  error?: string;
  stressMs?: number;
  scrollSpeed?: number;
  // Environment (sent by client)
  userAgent?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  screenWidth?: number;
  screenHeight?: number;
}

interface AggregatedMetric {
  label: string;
  unit: string;
  better: string;
  median: number;
  mean: number;
  min: number;
  max: number;
  p5: number;
  p95: number;
  stddev: number;
  sampleCount: number;
}

interface StatsResult {
  version: string;
  suiteId: string;
  itemCount: number;
  totalRuns: number;
  metrics: AggregatedMetric[];
}

interface HistoryPoint {
  date: string; // YYYY-MM-DD
  version: string;
  median: number;
  mean: number;
  p5: number;
  p95: number;
  sampleCount: number;
}

interface VersionInfo {
  version: string;
  firstSeen: string;
  lastSeen: string;
  totalRuns: number;
}

interface BrowserInfo {
  browser: string;
  totalRuns: number;
  lastSeen: string;
}

// =============================================================================
// Validation
// =============================================================================

const MAX_VERSION_LENGTH = 32;
const MAX_SUITE_ID_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;
const MAX_LABEL_LENGTH = 64;
const MAX_UNIT_LENGTH = 16;
const MAX_ERROR_LENGTH = 512;
const MAX_METRICS_PER_RESULT = 50;
const VALID_ITEM_COUNTS = [1_000, 10_000, 100_000, 1_000_000];
const VALID_BETTER = ["lower", "higher", "none"];

/** Rate limiting: max submissions per IP per minute */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60_000);

function validateResult(data: unknown): {
  valid: boolean;
  error?: string;
  result?: BenchmarkResultInput;
} {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const d = data as Record<string, unknown>;

  // Required fields
  if (
    typeof d.version !== "string" ||
    d.version.length === 0 ||
    d.version.length > MAX_VERSION_LENGTH
  ) {
    return {
      valid: false,
      error: `version must be a string (1-${MAX_VERSION_LENGTH} chars)`,
    };
  }
  if (
    typeof d.suiteId !== "string" ||
    d.suiteId.length === 0 ||
    d.suiteId.length > MAX_SUITE_ID_LENGTH
  ) {
    return {
      valid: false,
      error: `suiteId must be a string (1-${MAX_SUITE_ID_LENGTH} chars)`,
    };
  }
  if (
    typeof d.itemCount !== "number" ||
    !VALID_ITEM_COUNTS.includes(d.itemCount)
  ) {
    return {
      valid: false,
      error: `itemCount must be one of: ${VALID_ITEM_COUNTS.join(", ")}`,
    };
  }
  if (
    typeof d.duration !== "number" ||
    d.duration < 0 ||
    d.duration > 600_000
  ) {
    return {
      valid: false,
      error: "duration must be a number between 0 and 600000",
    };
  }
  if (typeof d.success !== "boolean") {
    return { valid: false, error: "success must be a boolean" };
  }

  // Metrics array
  if (!Array.isArray(d.metrics) || d.metrics.length > MAX_METRICS_PER_RESULT) {
    return {
      valid: false,
      error: `metrics must be an array (max ${MAX_METRICS_PER_RESULT} items)`,
    };
  }

  for (let i = 0; i < d.metrics.length; i++) {
    const m = d.metrics[i];
    if (!m || typeof m !== "object") {
      return { valid: false, error: `metrics[${i}] must be an object` };
    }
    if (typeof m.label !== "string" || m.label.length > MAX_LABEL_LENGTH) {
      return { valid: false, error: `metrics[${i}].label invalid` };
    }
    if (typeof m.value !== "number" || !isFinite(m.value)) {
      return {
        valid: false,
        error: `metrics[${i}].value must be a finite number`,
      };
    }
    if (typeof m.unit !== "string" || m.unit.length > MAX_UNIT_LENGTH) {
      return { valid: false, error: `metrics[${i}].unit invalid` };
    }
    if (!VALID_BETTER.includes(m.better)) {
      return {
        valid: false,
        error: `metrics[${i}].better must be "lower", "higher", or "none"`,
      };
    }
    if (
      m.rating !== undefined &&
      m.rating !== null &&
      !["good", "ok", "bad", "info"].includes(m.rating)
    ) {
      return {
        valid: false,
        error: `metrics[${i}].rating must be "good", "ok", "bad", "info", or null`,
      };
    }
  }

  // Optional fields
  if (
    d.error !== undefined &&
    (typeof d.error !== "string" || d.error.length > MAX_ERROR_LENGTH)
  ) {
    return { valid: false, error: "error must be a string (max 512 chars)" };
  }
  if (
    d.stressMs !== undefined &&
    (typeof d.stressMs !== "number" || d.stressMs < 0 || d.stressMs > 100)
  ) {
    return { valid: false, error: "stressMs must be 0-100" };
  }
  if (
    d.scrollSpeed !== undefined &&
    (typeof d.scrollSpeed !== "number" || d.scrollSpeed < 0)
  ) {
    return { valid: false, error: "scrollSpeed must be >= 0" };
  }
  if (
    d.userAgent !== undefined &&
    (typeof d.userAgent !== "string" ||
      d.userAgent.length > MAX_USER_AGENT_LENGTH)
  ) {
    return { valid: false, error: "userAgent too long" };
  }

  return {
    valid: true,
    result: {
      version: d.version as string,
      suiteId: d.suiteId as string,
      itemCount: d.itemCount as number,
      metrics: d.metrics as MetricInput[],
      duration: Math.round(d.duration as number),
      success: d.success as boolean,
      error: d.error as string | undefined,
      stressMs: (d.stressMs as number) ?? 0,
      scrollSpeed: (d.scrollSpeed as number) ?? 0,
      userAgent: d.userAgent as string | undefined,
      hardwareConcurrency:
        typeof d.hardwareConcurrency === "number"
          ? d.hardwareConcurrency
          : undefined,
      deviceMemory:
        typeof d.deviceMemory === "number" ? d.deviceMemory : undefined,
      screenWidth:
        typeof d.screenWidth === "number"
          ? Math.round(d.screenWidth as number)
          : undefined,
      screenHeight:
        typeof d.screenHeight === "number"
          ? Math.round(d.screenHeight as number)
          : undefined,
    },
  };
}

// =============================================================================
// Storage
// =============================================================================

function storeResult(result: BenchmarkResultInput): {
  runId: number;
  type: TableType;
} {
  const database = getDb();
  const type = tableType(result.suiteId);
  const t = tables(type);

  const insertRun = database.prepare(`
    INSERT INTO ${t.runs} (
      version, suite_id, item_count,
      user_agent, hardware_concurrency, device_memory, screen_width, screen_height,
      duration_ms, success, error,
      stress_ms, scroll_speed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMetric = database.prepare(`
    INSERT INTO ${t.metrics} (run_id, label, value, unit, better, rating)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const runInsert = database.transaction(() => {
    const info = insertRun.run(
      result.version,
      result.suiteId,
      result.itemCount,
      result.userAgent ?? null,
      result.hardwareConcurrency ?? null,
      result.deviceMemory ?? null,
      result.screenWidth ?? null,
      result.screenHeight ?? null,
      result.duration,
      result.success ? 1 : 0,
      result.error ?? null,
      result.stressMs ?? 0,
      result.scrollSpeed ?? 0,
    );

    const runId = Number(info.lastInsertRowid);

    for (const metric of result.metrics) {
      insertMetric.run(
        runId,
        metric.label,
        metric.value,
        metric.unit,
        metric.better,
        metric.rating ?? null,
      );
    }

    return runId;
  });

  return { runId: runInsert(), type };
}

// =============================================================================
// Queries
// =============================================================================

/** Resolve table type from query param, defaulting to "comparison" */
function resolveType(url: URL): TableType {
  const raw = url.searchParams.get("type");
  if (raw === "suite") return "suite";
  return "comparison"; // default — history page uses comparison
}

/** Compute aggregated stats for a specific version + suite + itemCount combination */
function getStats(
  type: TableType,
  options: {
    version?: string;
    suiteId?: string;
    itemCount?: number;
    stressMs?: number;
    scrollSpeed?: number;
    limit?: number;
  },
): StatsResult[] {
  const database = getDb();
  const t = tables(type);

  // Build WHERE clause dynamically
  const conditions: string[] = ["r.success = 1"];
  const params: (string | number)[] = [];

  if (options.version) {
    conditions.push("r.version = ?");
    params.push(options.version);
  }
  if (options.suiteId) {
    conditions.push("r.suite_id = ?");
    params.push(options.suiteId);
  }
  if (options.itemCount) {
    conditions.push("r.item_count = ?");
    params.push(options.itemCount);
  }
  if (options.stressMs !== undefined) {
    conditions.push("r.stress_ms = ?");
    params.push(options.stressMs);
  }
  if (options.scrollSpeed !== undefined) {
    conditions.push("r.scroll_speed = ?");
    params.push(options.scrollSpeed);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(options.limit ?? 100, 500);

  // Get distinct version/suite/itemCount groups
  const groups = database
    .prepare(
      `
    SELECT DISTINCT r.version, r.suite_id, r.item_count, COUNT(*) as total_runs
    FROM ${t.runs} r
    ${where}
    GROUP BY r.version, r.suite_id, r.item_count
    ORDER BY r.version DESC, r.suite_id ASC, r.item_count ASC
    LIMIT ?
  `,
    )
    .all(...params, limit) as {
    version: string;
    suite_id: string;
    item_count: number;
    total_runs: number;
  }[];

  const results: StatsResult[] = [];

  // For each group, compute aggregated metrics
  const metricQuery = database.prepare(`
    SELECT
      m.label,
      m.unit,
      m.better,
      m.value
    FROM ${t.metrics} m
    JOIN ${t.runs} r ON r.id = m.run_id
    WHERE r.version = ? AND r.suite_id = ? AND r.item_count = ? AND r.success = 1
      ${options.stressMs !== undefined ? "AND r.stress_ms = ?" : ""}
      ${options.scrollSpeed !== undefined ? "AND r.scroll_speed = ?" : ""}
    ORDER BY m.label, m.value ASC
  `);

  for (const group of groups) {
    const metricParams: (string | number)[] = [
      group.version,
      group.suite_id,
      group.item_count,
    ];
    if (options.stressMs !== undefined) metricParams.push(options.stressMs);
    if (options.scrollSpeed !== undefined)
      metricParams.push(options.scrollSpeed);

    const rows = metricQuery.all(...metricParams) as {
      label: string;
      unit: string;
      better: string;
      value: number;
    }[];

    // Group by label and aggregate
    const byLabel = new Map<
      string,
      { unit: string; better: string; values: number[] }
    >();
    for (const row of rows) {
      let entry = byLabel.get(row.label);
      if (!entry) {
        entry = { unit: row.unit, better: row.better, values: [] };
        byLabel.set(row.label, entry);
      }
      entry.values.push(row.value);
    }

    const metrics: AggregatedMetric[] = [];
    for (const [label, entry] of byLabel) {
      const values = entry.values; // already sorted ASC from SQL
      const n = values.length;
      if (n === 0) continue;

      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / n;

      metrics.push({
        label,
        unit: entry.unit,
        better: entry.better,
        median: percentile(values, 50),
        mean: round(mean, 2),
        min: values[0],
        max: values[n - 1],
        p5: percentile(values, 5),
        p95: percentile(values, 95),
        stddev: round(Math.sqrt(variance), 2),
        sampleCount: n,
      });
    }

    results.push({
      version: group.version,
      suiteId: group.suite_id,
      itemCount: group.item_count,
      totalRuns: group.total_runs,
      metrics,
    });
  }

  return results;
}

/** Time-series data: daily aggregated values for a specific metric */
function getHistory(
  type: TableType,
  options: {
    suiteId: string;
    itemCount: number;
    metricLabel: string;
    version?: string;
    days?: number;
    stressMs?: number;
    scrollSpeed?: number;
  },
): HistoryPoint[] {
  const database = getDb();
  const t = tables(type);
  const days = Math.min(options.days ?? 90, 365);

  const conditions: string[] = [
    "r.success = 1",
    "r.suite_id = ?",
    "r.item_count = ?",
    "m.label = ?",
    `r.created_at >= datetime('now', ?)`,
  ];
  const params: (string | number)[] = [
    options.suiteId,
    options.itemCount,
    options.metricLabel,
    `-${days} days`,
  ];

  if (options.version) {
    conditions.push("r.version = ?");
    params.push(options.version);
  }
  if (options.stressMs !== undefined) {
    conditions.push("r.stress_ms = ?");
    params.push(options.stressMs);
  }
  if (options.scrollSpeed !== undefined) {
    conditions.push("r.scroll_speed = ?");
    params.push(options.scrollSpeed);
  }

  const where = conditions.join(" AND ");

  // Fetch raw values per day to compute proper percentiles in JS
  const rows = database
    .prepare(
      `
    SELECT
      date(r.created_at) as date,
      r.version,
      m.value
    FROM ${t.metrics} m
    JOIN ${t.runs} r ON r.id = m.run_id
    WHERE ${where}
    ORDER BY date ASC, r.version ASC
  `,
    )
    .all(...params) as { date: string; version: string; value: number }[];

  // Group by date + version
  const groups = new Map<string, { version: string; values: number[] }>();
  for (const row of rows) {
    const key = `${row.date}::${row.version}`;
    let entry = groups.get(key);
    if (!entry) {
      entry = { version: row.version, values: [] };
      groups.set(key, entry);
    }
    entry.values.push(row.value);
  }

  const points: HistoryPoint[] = [];
  for (const [key, entry] of groups) {
    const date = key.split("::")[0];
    const sorted = entry.values.sort((a, b) => a - b);
    const n = sorted.length;
    const sum = sorted.reduce((a, b) => a + b, 0);

    points.push({
      date,
      version: entry.version,
      median: percentile(sorted, 50),
      mean: round(sum / n, 2),
      p5: percentile(sorted, 5),
      p95: percentile(sorted, 95),
      sampleCount: n,
    });
  }

  return points;
}

/** List all known versions with run counts */
function getVersions(type: TableType): VersionInfo[] {
  const database = getDb();
  const t = tables(type);
  return database
    .prepare(
      `
    SELECT
      version,
      MIN(created_at) as firstSeen,
      MAX(created_at) as lastSeen,
      COUNT(*) as totalRuns
    FROM ${t.runs}
    WHERE success = 1
    GROUP BY version
    ORDER BY MAX(created_at) DESC
  `,
    )
    .all() as VersionInfo[];
}

/** List all known suite IDs */
function getSuites(type: TableType): { suiteId: string; totalRuns: number }[] {
  const database = getDb();
  const t = tables(type);
  return database
    .prepare(
      `
    SELECT suite_id as suiteId, COUNT(*) as totalRuns
    FROM ${t.runs}
    WHERE success = 1
    GROUP BY suite_id
    ORDER BY suite_id ASC
  `,
    )
    .all() as { suiteId: string; totalRuns: number }[];
}

/** Browser breakdown parsed from user agents */
function getBrowsers(type: TableType): BrowserInfo[] {
  const database = getDb();
  const t = tables(type);

  const rows = database
    .prepare(
      `
    SELECT user_agent, COUNT(*) as count, MAX(created_at) as lastSeen
    FROM ${t.runs}
    WHERE success = 1 AND user_agent IS NOT NULL
    GROUP BY user_agent
    ORDER BY count DESC
  `,
    )
    .all() as { user_agent: string; count: number; lastSeen: string }[];

  const browsers = new Map<string, { totalRuns: number; lastSeen: string }>();

  for (const row of rows) {
    const browser = parseBrowserName(row.user_agent);
    const existing = browsers.get(browser);
    if (existing) {
      existing.totalRuns += row.count;
      if (row.lastSeen > existing.lastSeen) existing.lastSeen = row.lastSeen;
    } else {
      browsers.set(browser, { totalRuns: row.count, lastSeen: row.lastSeen });
    }
  }

  return Array.from(browsers.entries())
    .map(([browser, info]) => ({ browser, ...info }))
    .sort((a, b) => b.totalRuns - a.totalRuns);
}

/** High-level summary */
function getSummary(type: TableType): {
  totalRuns: number;
  totalMetrics: number;
  uniqueVersions: number;
  uniqueSuites: number;
  uniqueBrowsers: number;
  oldestRun: string | null;
  newestRun: string | null;
  topVersions: { version: string; runs: number }[];
  topSuites: { suiteId: string; runs: number }[];
} {
  const database = getDb();
  const t = tables(type);

  const counts = database
    .prepare(
      `
    SELECT
      COUNT(*) as totalRuns,
      COUNT(DISTINCT version) as uniqueVersions,
      COUNT(DISTINCT suite_id) as uniqueSuites,
      COUNT(DISTINCT user_agent) as uniqueBrowsers,
      MIN(created_at) as oldestRun,
      MAX(created_at) as newestRun
    FROM ${t.runs}
    WHERE success = 1
  `,
    )
    .get() as {
    totalRuns: number;
    uniqueVersions: number;
    uniqueSuites: number;
    uniqueBrowsers: number;
    oldestRun: string | null;
    newestRun: string | null;
  };

  const metricCount = database
    .prepare(`SELECT COUNT(*) as count FROM ${t.metrics}`)
    .get() as { count: number };

  const topVersions = database
    .prepare(
      `
    SELECT version, COUNT(*) as runs
    FROM ${t.runs} WHERE success = 1
    GROUP BY version
    ORDER BY runs DESC
    LIMIT 10
  `,
    )
    .all() as { version: string; runs: number }[];

  const topSuites = database
    .prepare(
      `
    SELECT suite_id as suiteId, COUNT(*) as runs
    FROM ${t.runs} WHERE success = 1
    GROUP BY suite_id
    ORDER BY runs DESC
    LIMIT 20
  `,
    )
    .all() as { suiteId: string; runs: number }[];

  return {
    ...counts,
    totalMetrics: metricCount.count,
    topVersions,
    topSuites,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return round(sorted[lower], 2);
  return round(
    sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower),
    2,
  );
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseBrowserName(ua: string): string {
  if (!ua) return "Unknown";

  // Order matters — check more specific patterns first
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Vivaldi/")) return "Vivaldi";
  if (ua.includes("Brave")) return "Brave";
  if (ua.includes("SamsungBrowser/")) return "Samsung Internet";
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("CriOS/")) return "Chrome (iOS)";
  if (ua.includes("FxiOS/")) return "Firefox (iOS)";
  if (ua.includes("Chrome/") && ua.includes("Safari/")) return "Chrome";
  if (ua.includes("Safari/") && ua.includes("Version/")) return "Safari";
  if (ua.includes("Safari/")) return "Safari";

  return "Other";
}

// =============================================================================
// Route Handler
// =============================================================================

export async function routeBenchmarks(
  req: Request,
  url: URL,
): Promise<Response | null> {
  const path = url.pathname;

  // Only handle /api/benchmarks*
  if (!path.startsWith("/api/benchmarks")) return null;

  // Subpath after /api/benchmarks
  const sub = path.slice("/api/benchmarks".length);

  try {
    // POST /api/benchmarks — store a result (auto-routed to correct tables)
    if (req.method === "POST" && (sub === "" || sub === "/")) {
      // Rate limit by IP
      const ip =
        req.headers.get("CF-Connecting-IP") ??
        req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
        "unknown";

      if (isRateLimited(ip)) {
        return jsonResponse(
          { error: "Rate limited. Max 30 submissions per minute." },
          429,
        );
      }

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const validation = validateResult(body);
      if (!validation.valid) {
        return jsonResponse({ error: validation.error }, 400);
      }

      const { runId, type } = storeResult(validation.result!);
      return jsonResponse({ success: true, runId, table: type }, 201);
    }

    // GET endpoints
    if (req.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    // Resolve table type from ?type=comparison|suite (defaults to "comparison")
    const type = resolveType(url);

    // GET /api/benchmarks/stats
    if (sub === "/stats") {
      const stats = getStats(type, {
        version: url.searchParams.get("version") ?? undefined,
        suiteId: url.searchParams.get("suiteId") ?? undefined,
        itemCount: intParam(url, "itemCount"),
        stressMs: intParam(url, "stressMs"),
        scrollSpeed: intParam(url, "scrollSpeed"),
        limit: intParam(url, "limit") ?? 100,
      });
      return jsonResponse({ items: stats, total: stats.length });
    }

    // GET /api/benchmarks/history
    if (sub === "/history") {
      const suiteId = url.searchParams.get("suiteId");
      const metricLabel = url.searchParams.get("metric");

      if (!suiteId || !metricLabel) {
        return jsonResponse(
          { error: "suiteId and metric query params are required" },
          400,
        );
      }

      const history = getHistory(type, {
        suiteId,
        itemCount: intParam(url, "itemCount") ?? 10_000,
        metricLabel,
        version: url.searchParams.get("version") ?? undefined,
        days: intParam(url, "days") ?? 90,
        stressMs: intParam(url, "stressMs"),
        scrollSpeed: intParam(url, "scrollSpeed"),
      });
      return jsonResponse({ items: history, total: history.length });
    }

    // GET /api/benchmarks/versions
    if (sub === "/versions") {
      const versions = getVersions(type);
      return jsonResponse({ items: versions, total: versions.length });
    }

    // GET /api/benchmarks/suites
    if (sub === "/suites") {
      const suites = getSuites(type);
      return jsonResponse({ items: suites, total: suites.length });
    }

    // GET /api/benchmarks/browsers
    if (sub === "/browsers") {
      const browsers = getBrowsers(type);
      return jsonResponse({ items: browsers, total: browsers.length });
    }

    // GET /api/benchmarks/summary
    if (sub === "/summary") {
      const summary = getSummary(type);
      return jsonResponse(summary);
    }

    return null; // Not a recognized benchmarks endpoint
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[benchmarks API]", message);

    // Database not found — return helpful error
    if (message.includes("benchmarks.db not found")) {
      return jsonResponse(
        {
          error:
            "Benchmark storage not initialized. Run: bun run scripts/seed-benchmarks.ts",
        },
        503,
      );
    }

    return jsonResponse({ error: "Internal server error" }, 500);
  }
}

// =============================================================================
// Response Helpers
// =============================================================================

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control":
        status >= 400 ? "no-cache" : "public, s-maxage=60, max-age=0",
      ...CORS_HEADERS,
    },
  });
}

/** Parse an integer query param, return undefined if missing/invalid */
function intParam(url: URL, name: string): number | undefined {
  const raw = url.searchParams.get(name);
  if (raw === null) return undefined;
  const n = parseInt(raw, 10);
  if (isNaN(n)) return undefined;
  return n;
}
