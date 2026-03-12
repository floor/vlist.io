// scripts/seed-benchmarks.ts
// Creates the SQLite database for storing crowdsourced benchmark results.
//
// Two separate table pairs:
//   - benchmark_runs + benchmark_metrics     → vlist suite results (render, scroll, memory, scrollto)
//   - comparison_runs + comparison_metrics   → library comparison results (react-window, virtua, etc.)
//
// Usage:
//   bun run scripts/seed-benchmarks.ts
//   bun run scripts/seed-benchmarks.ts --force   # drop and recreate
//
// Output:
//   data/benchmarks.db

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, unlinkSync } from "fs";
import { resolve, dirname } from "path";

// =============================================================================
// Config
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../data/benchmarks.db");
const FORCE = process.argv.includes("--force");

// =============================================================================
// Setup
// =============================================================================

const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

if (existsSync(DB_PATH)) {
  if (!FORCE) {
    console.log(`\n  ℹ️  benchmarks.db already exists at ${DB_PATH}`);
    console.log(`  Use --force to drop and recreate.\n`);
    process.exit(0);
  }
  console.log(`  🗑️  Removing existing database...`);
  unlinkSync(DB_PATH);
}

console.log(`\n  🗄️  Creating benchmarks database\n`);
console.log(`  Target:  ${DB_PATH}\n`);

const db = new Database(DB_PATH);

db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");

// =============================================================================
// Shared column definitions (used by both table pairs)
// =============================================================================
//
// The two table pairs are intentionally identical in structure.
// They are separate so that:
//   - Queries on comparison data never scan suite rows (and vice versa)
//   - Each can evolve independently if needed
//   - The history page only touches comparison_* tables
//   - A future "vlist performance" page only touches benchmark_* tables

const RUNS_COLUMNS = `
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),

    -- Identity
    version       TEXT    NOT NULL,
    suite_id      TEXT    NOT NULL,
    item_count    INTEGER NOT NULL,

    -- Environment
    user_agent    TEXT,
    hardware_concurrency INTEGER,
    device_memory REAL,
    screen_width  INTEGER,
    screen_height INTEGER,

    -- Run metadata
    duration_ms   INTEGER,
    success       INTEGER NOT NULL DEFAULT 1,
    error         TEXT,

    -- Config
    stress_ms     INTEGER DEFAULT 0,
    scroll_speed  INTEGER DEFAULT 0
`;

const METRICS_COLUMNS = (fk_table: string) => `
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER NOT NULL REFERENCES ${fk_table}(id) ON DELETE CASCADE,
    label         TEXT    NOT NULL,
    value         REAL    NOT NULL,
    unit          TEXT    NOT NULL,
    better        TEXT    NOT NULL,
    rating        TEXT
`;

// =============================================================================
// Schema — Suite tables (render, scroll, memory, scrollto)
// =============================================================================

db.run(`CREATE TABLE IF NOT EXISTS benchmark_runs (${RUNS_COLUMNS})`);
db.run(
  `CREATE TABLE IF NOT EXISTS benchmark_metrics (${METRICS_COLUMNS("benchmark_runs")})`,
);

// Indexes — suite tables
db.run(`CREATE INDEX idx_bench_runs_version       ON benchmark_runs(version)`);
db.run(
  `CREATE INDEX idx_bench_runs_suite         ON benchmark_runs(suite_id, item_count)`,
);
db.run(
  `CREATE INDEX idx_bench_runs_version_suite ON benchmark_runs(version, suite_id, item_count)`,
);
db.run(
  `CREATE INDEX idx_bench_runs_created       ON benchmark_runs(created_at)`,
);
db.run(`CREATE INDEX idx_bench_runs_success       ON benchmark_runs(success)`);
db.run(
  `CREATE INDEX idx_bench_metrics_run        ON benchmark_metrics(run_id)`,
);
db.run(
  `CREATE INDEX idx_bench_metrics_label      ON benchmark_metrics(run_id, label)`,
);

// =============================================================================
// Schema — Comparison tables (react-window, virtua, tanstack, etc.)
// =============================================================================

db.run(`CREATE TABLE IF NOT EXISTS comparison_runs (${RUNS_COLUMNS})`);
db.run(
  `CREATE TABLE IF NOT EXISTS comparison_metrics (${METRICS_COLUMNS("comparison_runs")})`,
);

// Indexes — comparison tables
db.run(`CREATE INDEX idx_comp_runs_version       ON comparison_runs(version)`);
db.run(
  `CREATE INDEX idx_comp_runs_suite         ON comparison_runs(suite_id, item_count)`,
);
db.run(
  `CREATE INDEX idx_comp_runs_version_suite ON comparison_runs(version, suite_id, item_count)`,
);
db.run(
  `CREATE INDEX idx_comp_runs_created       ON comparison_runs(created_at)`,
);
db.run(`CREATE INDEX idx_comp_runs_success       ON comparison_runs(success)`);
db.run(
  `CREATE INDEX idx_comp_metrics_run        ON comparison_metrics(run_id)`,
);
db.run(
  `CREATE INDEX idx_comp_metrics_label      ON comparison_metrics(run_id, label)`,
);

// =============================================================================
// Verify
// =============================================================================

const tables = [
  { name: "benchmark_runs", label: "Suite runs" },
  { name: "benchmark_metrics", label: "Suite metrics" },
  { name: "comparison_runs", label: "Comparison runs" },
  { name: "comparison_metrics", label: "Comparison metrics" },
];

console.log(`  ✅ Tables created:\n`);

for (const table of tables) {
  const count = db
    .query(`SELECT COUNT(*) as count FROM ${table.name}`)
    .get() as { count: number };
  const columns = db.query(`PRAGMA table_info(${table.name})`).all() as {
    name: string;
    type: string;
    notnull: number;
  }[];

  console.log(`  📋 ${table.name} (${table.label}) — ${count.count} rows`);
  for (const col of columns) {
    const nullable = col.notnull ? "NOT NULL" : "nullable";
    console.log(
      `     ${col.name.padEnd(24)} ${col.type.padEnd(10)} ${nullable}`,
    );
  }
  console.log();
}

// File size
const fileSize = Bun.file(DB_PATH).size;
const sizeKB = (fileSize / 1024).toFixed(1);
console.log(`  📦 Database size: ${sizeKB} KB`);

db.close();

console.log(`\n  Done! 🎉\n`);
