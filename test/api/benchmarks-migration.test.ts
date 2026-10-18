// test/api/benchmarks-migration.test.ts
//
// Tests the one-time migration that clears device_memory / screen_width /
// screen_height from existing rows. Uses its own isolated database so the
// marker state is fully controlled.

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import {
  routeBenchmarks,
  setDbPath,
  resetDb,
  nullEnvironmentFields,
} from "../../src/api/benchmarks";

const DB_PATH = resolve(
  import.meta.dir,
  "../../data/benchmarks.migration.test.db",
);
const MARKER = "null-device-memory-screen-size";

/** Create a GET request for the given path */
const get = (path: string): { req: Request; url: URL } => {
  const url = new URL(`https://vlist.io${path}`);
  const req = new Request(url.toString(), { method: "GET" });
  return { req, url };
};

/** Hit an endpoint that opens the database (and therefore migrates it) */
async function openThroughApi(): Promise<number> {
  const { req, url } = get("/api/benchmarks/versions");
  const res = await routeBenchmarks(req, url);
  return res!.status;
}

function removeDbFiles(): void {
  for (const suffix of ["", "-wal", "-shm"]) {
    const path = DB_PATH + suffix;
    if (existsSync(path)) unlinkSync(path);
  }
}

/** Legacy database: schema plus rows that still carry the old values. */
function createLegacyDb(): void {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH);
  db.run("PRAGMA journal_mode = WAL");

  const runsColumns = `
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
    scroll_speed  INTEGER DEFAULT 0,
    mode          TEXT NOT NULL DEFAULT 'native'
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

  db.run(`CREATE TABLE benchmark_runs (${runsColumns})`);
  db.run(
    `CREATE TABLE benchmark_metrics (${metricsColumns("benchmark_runs")})`,
  );
  db.run(`CREATE TABLE comparison_runs (${runsColumns})`);
  db.run(
    `CREATE TABLE comparison_metrics (${metricsColumns("comparison_runs")})`,
  );

  const insert = (table: string, suiteId: string) =>
    db.run(
      `INSERT INTO ${table}
         (version, suite_id, item_count, user_agent, hardware_concurrency,
          device_memory, screen_width, screen_height, duration_ms, success)
       VALUES ('1.0.0', ?, 10000, 'Mozilla/5.0 Chrome/120', 8, 16, 1920, 1080, 1000, 1)`,
      [suiteId],
    );

  insert("comparison_runs", "react-window");
  insert("benchmark_runs", "render-vanilla");

  db.close();
}

beforeAll(() => {
  removeDbFiles();
  createLegacyDb();
  setDbPath(DB_PATH);
});

afterAll(() => {
  resetDb();
  removeDbFiles();
});

describe("benchmarks environment-fields migration", () => {
  test("first open nulls existing values and records the marker", async () => {
    expect(await openThroughApi()).toBe(200);

    const db = new Database(DB_PATH);
    const comparison = db
      .prepare(
        `SELECT device_memory, screen_width, screen_height FROM comparison_runs`,
      )
      .get() as {
      device_memory: number | null;
      screen_width: number | null;
      screen_height: number | null;
    };
    const suite = db
      .prepare(
        `SELECT device_memory, screen_width, screen_height FROM benchmark_runs`,
      )
      .get() as {
      device_memory: number | null;
      screen_width: number | null;
      screen_height: number | null;
    };
    const markers = db
      .prepare(`SELECT id FROM migrations`)
      .all() as { id: string }[];
    db.close();

    for (const row of [comparison, suite]) {
      expect(row.device_memory).toBeNull();
      expect(row.screen_width).toBeNull();
      expect(row.screen_height).toBeNull();
    }
    expect(markers.map((m) => m.id)).toContain(MARKER);
  });

  test("second open is a no-op (the marker stops it running again)", async () => {
    // Put a value back by hand, as if it had never been migrated, then let
    // the API open the database a second time. The marker must stop the
    // migration from running, so the value survives.
    const db = new Database(DB_PATH);
    db.run(
      `UPDATE comparison_runs
       SET device_memory = 16, screen_width = 1920, screen_height = 1080`,
    );
    const markersBefore = db
      .prepare(`SELECT COUNT(*) as count FROM migrations`)
      .get() as { count: number };
    db.close();

    setDbPath(DB_PATH); // close, so the next call reopens and re-runs startup

    expect(await openThroughApi()).toBe(200);

    const check = new Database(DB_PATH);
    const row = check
      .prepare(
        `SELECT device_memory, screen_width, screen_height FROM comparison_runs`,
      )
      .get() as {
      device_memory: number | null;
      screen_width: number | null;
      screen_height: number | null;
    };
    const markerCount = check
      .prepare(`SELECT COUNT(*) as count FROM migrations`)
      .get() as { count: number };
    check.close();

    expect(row.device_memory).toBe(16);
    expect(row.screen_width).toBe(1920);
    expect(row.screen_height).toBe(1080);
    expect(markerCount.count).toBe(markersBefore.count);
  });

  test("a second connection with the marker recorded does not throw", () => {
    // Two handles on the same file: the first records the marker, the second
    // runs the migration. It must see the marker inside its own transaction —
    // no SQLITE_BUSY, no primary-key error, no second migration.
    const first = new Database(DB_PATH);
    first.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id         TEXT PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    first.run(`INSERT OR IGNORE INTO migrations (id) VALUES (?)`, [MARKER]);
    const before = first
      .prepare(`SELECT device_memory FROM comparison_runs LIMIT 1`)
      .get() as { device_memory: number | null };
    first.close();

    const second = new Database(DB_PATH);
    expect(() => nullEnvironmentFields(second)).not.toThrow();
    const after = second
      .prepare(`SELECT device_memory FROM comparison_runs LIMIT 1`)
      .get() as { device_memory: number | null };
    const markerCount = second
      .prepare(`SELECT COUNT(*) as count FROM migrations`)
      .get() as { count: number };
    second.close();

    expect(markerCount.count).toBe(1);
    expect(after.device_memory).toBe(before.device_memory);
  });
});
