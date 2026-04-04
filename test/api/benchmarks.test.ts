// test/api/benchmarks.test.ts
//
// Integration tests for the benchmarks API (src/api/benchmarks.ts).
// Uses an ISOLATED test database (benchmarks.test.db) so test data never
// pollutes the real crowdsourced benchmarks.db used in production.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { routeBenchmarks, setDbPath, resetDb } from "../../src/api/benchmarks";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { Database } from "bun:sqlite";

// =============================================================================
// Helpers
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../../data/benchmarks.test.db");

/** Create a GET request for the given path */
const get = (path: string): { req: Request; url: URL } => {
  const url = new URL(`https://vlist.io${path}`);
  const req = new Request(url.toString(), { method: "GET" });
  return { req, url };
};

/** Auto-incrementing IP to avoid rate limiting across tests */
let ipCounter = 0;
const nextIp = (): string => `10.0.0.${++ipCounter}`;

/** Create a POST request with a JSON body */
const post = (
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): { req: Request; url: URL } => {
  const url = new URL(`https://vlist.io${path}`);
  const req = new Request(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": nextIp(),
      ...headers,
    },
    body: JSON.stringify(body),
  });
  return { req, url };
};

/** Parse a JSON response */
const json = async <T = unknown>(res: Response): Promise<T> =>
  res.json() as Promise<T>;

/** A valid comparison benchmark result payload */
const validComparisonPayload = (overrides: Record<string, unknown> = {}) => ({
  version: "1.3.7",
  suiteId: "react-window",
  itemCount: 10_000,
  duration: 12345,
  success: true,
  metrics: [
    {
      label: "vlist Render Time",
      value: 8.5,
      unit: "ms",
      better: "lower",
      rating: "good",
    },
    {
      label: "react-window Render Time",
      value: 9.1,
      unit: "ms",
      better: "lower",
      rating: "good",
    },
    {
      label: "Render Time Difference",
      value: -6.6,
      unit: "%",
      better: "lower",
      rating: "good",
    },
    {
      label: "vlist Memory Usage",
      value: 0.24,
      unit: "MB",
      better: "lower",
      rating: "good",
    },
    {
      label: "react-window Memory Usage",
      value: 2.26,
      unit: "MB",
      better: "lower",
      rating: "good",
    },
    {
      label: "Memory Difference",
      value: -89.4,
      unit: "%",
      better: "lower",
      rating: "good",
    },
    {
      label: "vlist Scroll FPS",
      value: 120.5,
      unit: "fps",
      better: "higher",
      rating: "good",
    },
    {
      label: "react-window Scroll FPS",
      value: 120.5,
      unit: "fps",
      better: "higher",
      rating: "good",
    },
    {
      label: "FPS Difference",
      value: 0,
      unit: "%",
      better: "higher",
      rating: "ok",
    },
    {
      label: "vlist P95 Frame Time",
      value: 9.1,
      unit: "ms",
      better: "lower",
      rating: "good",
    },
    {
      label: "react-window P95 Frame Time",
      value: 9.1,
      unit: "ms",
      better: "lower",
      rating: "good",
    },
    {
      label: "Execution Order",
      value: 0,
      unit: "",
      better: "none",
      rating: "info",
    },
  ],
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  hardwareConcurrency: 10,
  deviceMemory: 16,
  screenWidth: 1920,
  screenHeight: 1080,
  stressMs: 0,
  scrollSpeed: 0,
  ...overrides,
});

/** A valid vlist suite benchmark result payload */
const validSuitePayload = (overrides: Record<string, unknown> = {}) => ({
  version: "1.3.7",
  suiteId: "render-vanilla",
  itemCount: 10_000,
  duration: 5000,
  success: true,
  metrics: [
    {
      label: "Render Time",
      value: 6.2,
      unit: "ms",
      better: "lower",
      rating: "good",
    },
  ],
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  hardwareConcurrency: 10,
  ...overrides,
});

// =============================================================================
// Database Setup
// =============================================================================

/**
 * Ensure a fresh database exists before tests run.
 * We create the schema directly rather than calling the seed script,
 * keeping the test self-contained.
 */
function ensureTestDatabase(): void {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // If the DB already exists, keep it — tests append data.
  // If you need a fresh DB, delete it before running tests.
  if (existsSync(DB_PATH)) return;

  const db = new Database(DB_PATH);
  db.run("PRAGMA journal_mode = WAL");

  const RUNS_COLUMNS = `
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    version       TEXT    NOT NULL,
    suite_id      TEXT    NOT NULL,
    item_count    INTEGER NOT NULL,
    user_agent    TEXT,
    hardware_concurrency INTEGER,
    device_memory REAL,
    screen_width  INTEGER,
    screen_height INTEGER,
    duration_ms   INTEGER,
    success       INTEGER NOT NULL DEFAULT 1,
    error         TEXT,
    stress_ms     INTEGER DEFAULT 0,
    scroll_speed  INTEGER DEFAULT 0
  `;

  const metricsColumns = (fk: string) => `
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER NOT NULL REFERENCES ${fk}(id) ON DELETE CASCADE,
    label         TEXT    NOT NULL,
    value         REAL    NOT NULL,
    unit          TEXT    NOT NULL,
    better        TEXT    NOT NULL,
    rating        TEXT
  `;

  db.run(`CREATE TABLE IF NOT EXISTS benchmark_runs (${RUNS_COLUMNS})`);
  db.run(
    `CREATE TABLE IF NOT EXISTS benchmark_metrics (${metricsColumns("benchmark_runs")})`,
  );
  db.run(`CREATE TABLE IF NOT EXISTS comparison_runs (${RUNS_COLUMNS})`);
  db.run(
    `CREATE TABLE IF NOT EXISTS comparison_metrics (${metricsColumns("comparison_runs")})`,
  );

  // Minimal indexes needed for queries
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_runs_suite ON comparison_runs(suite_id, item_count)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_runs_version ON comparison_runs(version)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_runs_version_suite ON comparison_runs(version, suite_id, item_count)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_runs_created ON comparison_runs(created_at)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_runs_success ON comparison_runs(success)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_metrics_run ON comparison_metrics(run_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_comp_metrics_label ON comparison_metrics(run_id, label)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_runs_suite ON benchmark_runs(suite_id, item_count)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_runs_version ON benchmark_runs(version)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_runs_version_suite ON benchmark_runs(version, suite_id, item_count)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_runs_created ON benchmark_runs(created_at)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_runs_success ON benchmark_runs(success)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_metrics_run ON benchmark_metrics(run_id)`,
  );
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_bench_metrics_label ON benchmark_metrics(run_id, label)`,
  );

  db.close();
}

// =============================================================================
// Tests
// =============================================================================

beforeAll(() => {
  // Delete any leftover test DB so we start fresh every run
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);

  ensureTestDatabase();

  // Point the API module at the isolated test database
  setDbPath(DB_PATH);
});

afterAll(() => {
  // Reset the API module back to the default production DB path
  resetDb();

  // Clean up the test database file
  if (existsSync(DB_PATH)) unlinkSync(DB_PATH);
});

describe("benchmarks API", () => {
  // ---------------------------------------------------------------------------
  // Routing
  // ---------------------------------------------------------------------------

  describe("routing", () => {
    test("returns null for non-benchmarks paths", async () => {
      const { req, url } = get("/api/users");
      const result = await routeBenchmarks(req, url);
      expect(result).toBeNull();
    });

    test("returns null for unrecognized sub-paths", async () => {
      const { req, url } = get("/api/benchmarks/unknown-endpoint");
      const result = await routeBenchmarks(req, url);
      expect(result).toBeNull();
    });

    test("rejects non-GET/POST methods with 405", async () => {
      const url = new URL("https://vlist.io/api/benchmarks/stats");
      const req = new Request(url.toString(), { method: "DELETE" });
      const result = await routeBenchmarks(req, url);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(405);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/benchmarks — Store Results
  // ---------------------------------------------------------------------------

  describe("POST /api/benchmarks", () => {
    test("stores a valid comparison result", async () => {
      const { req, url } = post("/api/benchmarks", validComparisonPayload());
      const result = await routeBenchmarks(req, url);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(201);

      const body = await json<{
        success: boolean;
        runId: number;
        table: string;
      }>(result!);
      expect(body.success).toBe(true);
      expect(body.runId).toBeGreaterThan(0);
      expect(body.table).toBe("comparison");
    });

    test("stores a valid vlist suite result", async () => {
      const { req, url } = post("/api/benchmarks", validSuitePayload());
      const result = await routeBenchmarks(req, url);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(201);

      const body = await json<{
        success: boolean;
        runId: number;
        table: string;
      }>(result!);
      expect(body.success).toBe(true);
      expect(body.table).toBe("suite");
    });

    test("auto-routes comparison suites to comparison tables", async () => {
      const suites = [
        "react-window",
        "react-virtuoso",
        "tanstack-virtual",
        "virtua",
      ];
      for (const suiteId of suites) {
        const { req, url } = post(
          "/api/benchmarks",
          validComparisonPayload({ suiteId }),
        );
        const result = await routeBenchmarks(req, url);
        const body = await json<{ table: string }>(result!);
        expect(body.table).toBe("comparison");
      }
    });

    test("auto-routes vlist suites to benchmark tables", async () => {
      const suites = ["render-vanilla", "scroll-react", "memory-vue"];
      for (const suiteId of suites) {
        const { req, url } = post(
          "/api/benchmarks",
          validSuitePayload({ suiteId }),
        );
        const result = await routeBenchmarks(req, url);
        const body = await json<{ table: string }>(result!);
        expect(body.table).toBe("suite");
      }
    });

    test("stores result with trailing slash", async () => {
      const { req, url } = post("/api/benchmarks/", validComparisonPayload());
      const result = await routeBenchmarks(req, url);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(201);
    });

    test("stores all metrics from the payload", async () => {
      const payload = validComparisonPayload({ suiteId: "virtua" });
      const { req, url } = post("/api/benchmarks", payload);
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(201);

      const body = await json<{ runId: number }>(result!);
      // Verify metrics were stored by querying stats
      const statsReq = get(
        `/api/benchmarks/stats?suiteId=virtua&itemCount=10000`,
      );
      const statsResult = await routeBenchmarks(statsReq.req, statsReq.url);
      const statsBody = await json<{ items: Array<{ metrics: unknown[] }> }>(
        statsResult!,
      );

      expect(statsBody.items.length).toBeGreaterThan(0);
      // Should have at least the metrics from our payload
      expect(statsBody.items[0].metrics.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /api/benchmarks — Validation
  // ---------------------------------------------------------------------------

  describe("POST /api/benchmarks — validation", () => {
    test("rejects invalid JSON body", async () => {
      const url = new URL("https://vlist.io/api/benchmarks");
      const req = new Request(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json{{{",
      });
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
      const body = await json<{ error: string }>(result!);
      expect(body.error).toContain("Invalid JSON");
    });

    test("rejects missing version", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ version: "" }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("rejects missing suiteId", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ suiteId: "" }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("rejects invalid itemCount", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ itemCount: 5000 }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
      const body = await json<{ error: string }>(result!);
      expect(body.error).toContain("itemCount");
    });

    test("accepts all valid item counts", async () => {
      const validCounts = [1_000, 10_000, 100_000, 1_000_000];
      for (const itemCount of validCounts) {
        const { req, url } = post(
          "/api/benchmarks",
          validComparisonPayload({ itemCount }),
        );
        const result = await routeBenchmarks(req, url);
        expect(result!.status).toBe(201);
      }
    });

    test("rejects non-boolean success", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ success: "yes" }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("rejects invalid metric better value", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({
          metrics: [{ label: "Test", value: 1, unit: "ms", better: "invalid" }],
        }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
      const body = await json<{ error: string }>(result!);
      expect(body.error).toContain("better");
    });

    test("rejects non-finite metric value", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({
          metrics: [
            { label: "Test", value: Infinity, unit: "ms", better: "lower" },
          ],
        }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("rejects too many metrics", async () => {
      const tooMany = Array.from({ length: 51 }, (_, i) => ({
        label: `metric-${i}`,
        value: i,
        unit: "ms",
        better: "lower",
      }));
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ metrics: tooMany }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("accepts empty metrics array", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ metrics: [] }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(201);
    });

    test("rejects excessively long version string", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({
          version: "x".repeat(100),
        }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("rejects negative duration", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ duration: -1 }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("rejects stressMs out of range", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({ stressMs: 200 }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("accepts valid rating values", async () => {
      const validRatings = ["good", "ok", "bad", "info", null];
      for (const rating of validRatings) {
        const { req, url } = post(
          "/api/benchmarks",
          validComparisonPayload({
            metrics: [
              { label: "Test", value: 1, unit: "ms", better: "lower", rating },
            ],
          }),
        );
        const result = await routeBenchmarks(req, url);
        expect(result!.status).toBe(201);
      }
    });

    test("rejects invalid rating value", async () => {
      const { req, url } = post(
        "/api/benchmarks",
        validComparisonPayload({
          metrics: [
            {
              label: "Test",
              value: 1,
              unit: "ms",
              better: "lower",
              rating: "excellent",
            },
          ],
        }),
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmarks/summary
  // ---------------------------------------------------------------------------

  describe("GET /api/benchmarks/summary", () => {
    test("returns summary object", async () => {
      const { req, url } = get("/api/benchmarks/summary");
      const result = await routeBenchmarks(req, url);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(200);

      const body = await json<{
        totalRuns: number;
        totalMetrics: number;
        uniqueVersions: number;
        uniqueSuites: number;
        uniqueBrowsers: number;
      }>(result!);

      expect(typeof body.totalRuns).toBe("number");
      expect(typeof body.totalMetrics).toBe("number");
      expect(typeof body.uniqueVersions).toBe("number");
      expect(typeof body.uniqueSuites).toBe("number");
      expect(typeof body.uniqueBrowsers).toBe("number");
    });

    test("defaults to comparison tables", async () => {
      const { req, url } = get("/api/benchmarks/summary");
      const result = await routeBenchmarks(req, url);
      const body = await json<{ totalRuns: number }>(result!);

      // We stored comparison results above, so should have > 0
      expect(body.totalRuns).toBeGreaterThan(0);
    });

    test("supports type=suite query param", async () => {
      const { req, url } = get("/api/benchmarks/summary?type=suite");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{ totalRuns: number }>(result!);
      expect(typeof body.totalRuns).toBe("number");
    });

    test("includes topVersions and topSuites", async () => {
      const { req, url } = get("/api/benchmarks/summary");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        topVersions: Array<{ version: string; runs: number }>;
        topSuites: Array<{ suiteId: string; runs: number }>;
      }>(result!);

      expect(Array.isArray(body.topVersions)).toBe(true);
      expect(Array.isArray(body.topSuites)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmarks/suites
  // ---------------------------------------------------------------------------

  describe("GET /api/benchmarks/suites", () => {
    test("returns list of suites with run counts", async () => {
      const { req, url } = get("/api/benchmarks/suites");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{
        items: Array<{ suiteId: string; totalRuns: number }>;
        total: number;
      }>(result!);

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBe(body.items.length);
    });

    test("includes suites from stored comparison results", async () => {
      const { req, url } = get("/api/benchmarks/suites");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ suiteId: string; totalRuns: number }>;
      }>(result!);

      const suiteIds = body.items.map((s) => s.suiteId);
      expect(suiteIds).toContain("react-window");
    });

    test("each suite has a positive run count", async () => {
      const { req, url } = get("/api/benchmarks/suites");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ suiteId: string; totalRuns: number }>;
      }>(result!);

      for (const suite of body.items) {
        expect(suite.totalRuns).toBeGreaterThan(0);
        expect(typeof suite.suiteId).toBe("string");
        expect(suite.suiteId.length).toBeGreaterThan(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmarks/versions
  // ---------------------------------------------------------------------------

  describe("GET /api/benchmarks/versions", () => {
    test("returns list of versions", async () => {
      const { req, url } = get("/api/benchmarks/versions");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{
        items: Array<{
          version: string;
          totalRuns: number;
          firstSeen: string;
          lastSeen: string;
        }>;
        total: number;
      }>(result!);

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBe(body.items.length);
    });

    test("includes versions from stored results", async () => {
      const { req, url } = get("/api/benchmarks/versions");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ version: string }>;
      }>(result!);

      const versions = body.items.map((v) => v.version);
      expect(versions).toContain("1.3.7");
    });

    test("each version has valid dates", async () => {
      const { req, url } = get("/api/benchmarks/versions");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ firstSeen: string; lastSeen: string }>;
      }>(result!);

      for (const v of body.items) {
        expect(v.firstSeen).toBeTruthy();
        expect(v.lastSeen).toBeTruthy();
        // firstSeen should be <= lastSeen
        expect(v.firstSeen <= v.lastSeen).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmarks/browsers
  // ---------------------------------------------------------------------------

  describe("GET /api/benchmarks/browsers", () => {
    test("returns browser breakdown", async () => {
      const { req, url } = get("/api/benchmarks/browsers");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{
        items: Array<{ browser: string; totalRuns: number; lastSeen: string }>;
        total: number;
      }>(result!);

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBe(body.items.length);
    });

    test("parses Chrome from user agent", async () => {
      const { req, url } = get("/api/benchmarks/browsers");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ browser: string }>;
      }>(result!);

      const browsers = body.items.map((b) => b.browser);
      expect(browsers).toContain("Chrome");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmarks/stats
  // ---------------------------------------------------------------------------

  describe("GET /api/benchmarks/stats", () => {
    test("returns aggregated stats for a suite", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{
        items: Array<{
          version: string;
          suiteId: string;
          itemCount: number;
          totalRuns: number;
          metrics: Array<{
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
          }>;
        }>;
        total: number;
      }>(result!);

      expect(body.items.length).toBeGreaterThan(0);

      const stat = body.items[0];
      expect(stat.version).toBe("1.3.7");
      expect(stat.suiteId).toBe("react-window");
      expect(stat.itemCount).toBe(10000);
      expect(stat.totalRuns).toBeGreaterThan(0);
      expect(stat.metrics.length).toBeGreaterThan(0);
    });

    test("stats metrics include proper aggregation fields", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{
          metrics: Array<{
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
          }>;
        }>;
      }>(result!);

      const metric = body.items[0].metrics[0];
      expect(typeof metric.label).toBe("string");
      expect(typeof metric.unit).toBe("string");
      expect(typeof metric.better).toBe("string");
      expect(typeof metric.median).toBe("number");
      expect(typeof metric.mean).toBe("number");
      expect(typeof metric.min).toBe("number");
      expect(typeof metric.max).toBe("number");
      expect(typeof metric.p5).toBe("number");
      expect(typeof metric.p95).toBe("number");
      expect(typeof metric.stddev).toBe("number");
      expect(typeof metric.sampleCount).toBe("number");
      expect(metric.sampleCount).toBeGreaterThan(0);
    });

    test("returns empty for non-existent suite", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=nonexistent&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{ items: unknown[]; total: number }>(result!);
      expect(body.items).toHaveLength(0);
      expect(body.total).toBe(0);
    });

    test("filters by version", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000&version=1.3.7",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ version: string }>;
      }>(result!);

      for (const stat of body.items) {
        expect(stat.version).toBe("1.3.7");
      }
    });

    test("returns empty for non-existent version", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000&version=99.99.99",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{ items: unknown[] }>(result!);

      expect(body.items).toHaveLength(0);
    });

    test("works without suiteId (returns all)", async () => {
      const { req, url } = get("/api/benchmarks/stats");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{ items: unknown[] }>(result!);
      expect(body.items.length).toBeGreaterThan(0);
    });

    test("median is between min and max", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{
          metrics: Array<{ median: number; min: number; max: number }>;
        }>;
      }>(result!);

      for (const stat of body.items) {
        for (const m of stat.metrics) {
          expect(m.median).toBeGreaterThanOrEqual(m.min);
          expect(m.median).toBeLessThanOrEqual(m.max);
        }
      }
    });

    test("p5 <= median <= p95", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{
          metrics: Array<{ p5: number; median: number; p95: number }>;
        }>;
      }>(result!);

      for (const stat of body.items) {
        for (const m of stat.metrics) {
          expect(m.p5).toBeLessThanOrEqual(m.median);
          expect(m.median).toBeLessThanOrEqual(m.p95);
        }
      }
    });

    test("stddev is non-negative", async () => {
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=react-window&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{
          metrics: Array<{ stddev: number }>;
        }>;
      }>(result!);

      for (const stat of body.items) {
        for (const m of stat.metrics) {
          expect(m.stddev).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/benchmarks/history
  // ---------------------------------------------------------------------------

  describe("GET /api/benchmarks/history", () => {
    test("requires suiteId and metric params", async () => {
      const { req, url } = get("/api/benchmarks/history");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
      const body = await json<{ error: string }>(result!);
      expect(body.error).toContain("suiteId");
      expect(body.error).toContain("metric");
    });

    test("requires metric param", async () => {
      const { req, url } = get("/api/benchmarks/history?suiteId=react-window");
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(400);
    });

    test("returns time-series data for valid params", async () => {
      const { req, url } = get(
        "/api/benchmarks/history?suiteId=react-window&metric=vlist+Render+Time&itemCount=10000&days=90",
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);

      const body = await json<{
        items: Array<{
          date: string;
          version: string;
          median: number;
          mean: number;
          p5: number;
          p95: number;
          sampleCount: number;
        }>;
        total: number;
      }>(result!);

      expect(Array.isArray(body.items)).toBe(true);
      expect(body.total).toBe(body.items.length);

      if (body.items.length > 0) {
        const point = body.items[0];
        expect(typeof point.date).toBe("string");
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof point.version).toBe("string");
        expect(typeof point.median).toBe("number");
        expect(typeof point.mean).toBe("number");
        expect(typeof point.p5).toBe("number");
        expect(typeof point.p95).toBe("number");
        expect(typeof point.sampleCount).toBe("number");
      }
    });

    test("returns empty for non-existent metric", async () => {
      const { req, url } = get(
        "/api/benchmarks/history?suiteId=react-window&metric=Nonexistent+Metric",
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);
      const body = await json<{ items: unknown[] }>(result!);
      expect(body.items).toHaveLength(0);
    });

    test("defaults to 90 days and 10K items", async () => {
      const { req, url } = get(
        "/api/benchmarks/history?suiteId=react-window&metric=vlist+Render+Time",
      );
      const result = await routeBenchmarks(req, url);

      expect(result!.status).toBe(200);
    });

    test("history points have p5 <= median <= p95", async () => {
      const { req, url } = get(
        "/api/benchmarks/history?suiteId=react-window&metric=vlist+Render+Time&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ p5: number; median: number; p95: number }>;
      }>(result!);

      for (const point of body.items) {
        expect(point.p5).toBeLessThanOrEqual(point.median);
        expect(point.median).toBeLessThanOrEqual(point.p95);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // CORS Headers
  // ---------------------------------------------------------------------------

  describe("CORS headers", () => {
    test("GET responses include CORS headers", async () => {
      const { req, url } = get("/api/benchmarks/summary");
      const result = await routeBenchmarks(req, url);

      expect(result!.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(result!.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET",
      );
      expect(result!.headers.get("Access-Control-Allow-Methods")).toContain(
        "POST",
      );
    });

    test("POST responses include CORS headers", async () => {
      const { req, url } = post("/api/benchmarks", validComparisonPayload());
      const result = await routeBenchmarks(req, url);

      expect(result!.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    test("error responses include CORS headers", async () => {
      const { req, url } = post("/api/benchmarks", { invalid: true });
      const result = await routeBenchmarks(req, url);

      expect(result!.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  // ---------------------------------------------------------------------------
  // Cache-Control
  // ---------------------------------------------------------------------------

  describe("cache control", () => {
    test("successful GET responses have public cache header", async () => {
      const { req, url } = get("/api/benchmarks/summary");
      const result = await routeBenchmarks(req, url);

      const cc = result!.headers.get("Cache-Control");
      expect(cc).toContain("public");
      expect(cc).toContain("s-maxage=60");
    });

    test("error responses have no-cache header", async () => {
      const { req, url } = post("/api/benchmarks", { invalid: true });
      const result = await routeBenchmarks(req, url);

      const cc = result!.headers.get("Cache-Control");
      expect(cc).toContain("no-cache");
    });
  });

  // ---------------------------------------------------------------------------
  // Content-Type
  // ---------------------------------------------------------------------------

  describe("content type", () => {
    test("all responses are application/json", async () => {
      const endpoints = [
        "/api/benchmarks/summary",
        "/api/benchmarks/suites",
        "/api/benchmarks/versions",
        "/api/benchmarks/browsers",
        "/api/benchmarks/stats",
      ];

      for (const endpoint of endpoints) {
        const { req, url } = get(endpoint);
        const result = await routeBenchmarks(req, url);
        expect(result!.headers.get("Content-Type")).toContain(
          "application/json",
        );
      }
    });
  });

  // ---------------------------------------------------------------------------
  // type=suite vs type=comparison query param
  // ---------------------------------------------------------------------------

  describe("type query param", () => {
    test("defaults to comparison tables", async () => {
      const { req, url } = get("/api/benchmarks/suites");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ suiteId: string }>;
      }>(result!);

      // Comparison suites should be present (we stored react-window, virtua, etc.)
      const ids = body.items.map((s) => s.suiteId);
      const hasComparison = ids.some((id) =>
        [
          "react-window",
          "react-virtuoso",
          "tanstack-virtual",
          "virtua",
        ].includes(id),
      );
      expect(hasComparison).toBe(true);
    });

    test("type=suite returns vlist suite data", async () => {
      const { req, url } = get("/api/benchmarks/suites?type=suite");
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{ suiteId: string }>;
      }>(result!);

      // Suite IDs should include render-vanilla etc. (we stored above)
      if (body.items.length > 0) {
        const ids = body.items.map((s) => s.suiteId);
        // Should not contain comparison suite IDs
        expect(ids).not.toContain("react-window");
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Multiple submissions build up statistics
  // ---------------------------------------------------------------------------

  describe("aggregation over multiple runs", () => {
    test("storing multiple results increases run count", async () => {
      // Store 3 results for clusterize with different values
      const values = [90, 95, 85];
      for (const renderTime of values) {
        const { req, url } = post(
          "/api/benchmarks",
          validComparisonPayload({
            suiteId: "clusterize",
            metrics: [
              {
                label: "vlist Render Time",
                value: 8.5,
                unit: "ms",
                better: "lower",
              },
              {
                label: "Clusterize.js Render Time",
                value: renderTime,
                unit: "ms",
                better: "lower",
              },
            ],
          }),
        );
        await routeBenchmarks(req, url);
      }

      // Check stats reflect all submissions
      const { req, url } = get(
        "/api/benchmarks/stats?suiteId=clusterize&itemCount=10000",
      );
      const result = await routeBenchmarks(req, url);
      const body = await json<{
        items: Array<{
          totalRuns: number;
          metrics: Array<{
            label: string;
            sampleCount: number;
            median: number;
            min: number;
            max: number;
          }>;
        }>;
      }>(result!);

      expect(body.items.length).toBeGreaterThan(0);
      expect(body.items[0].totalRuns).toBeGreaterThanOrEqual(3);

      // Find the Clusterize.js Render Time metric
      const clusterMetric = body.items[0].metrics.find(
        (m) => m.label === "Clusterize.js Render Time",
      );
      expect(clusterMetric).toBeDefined();
      expect(clusterMetric!.sampleCount).toBeGreaterThanOrEqual(3);
      expect(clusterMetric!.min).toBeLessThanOrEqual(clusterMetric!.max);
    });
  });
});
