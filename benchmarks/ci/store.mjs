#!/usr/bin/env bun

import { Database } from "bun:sqlite";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import config from "./config.json" with { type: "json" };

const root = resolve(import.meta.dirname, "../..");

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
  if (match) args.set(match[1], match[2] ?? "true");
}

const inputPath = resolve(root, args.get("input") ?? "benchmarks/results/latest.json");
const dbPath = resolve(root, args.get("db") ?? process.env.BENCH_DB_PATH ?? config.databasePath);

const METRICS_COLUMNS = `
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id        INTEGER NOT NULL REFERENCES ci_benchmark_runs(id) ON DELETE CASCADE,
    label         TEXT    NOT NULL,
    value         REAL    NOT NULL,
    unit          TEXT    NOT NULL,
    better        TEXT    NOT NULL,
    rating        TEXT
`;

const ensureSchema = (db) => {
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = NORMAL");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS ci_benchmark_runs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      generated_at  TEXT,

      version       TEXT    NOT NULL,
      suite_id      TEXT    NOT NULL,
      item_count    INTEGER NOT NULL,

      git_sha       TEXT,
      branch        TEXT,
      pr_number     INTEGER,
      workflow_run_id TEXT,
      workflow_name TEXT,
      runner_os     TEXT,
      baseline_sha  TEXT,

      user_agent    TEXT,
      hardware_concurrency INTEGER,
      device_memory REAL,

      duration_ms   INTEGER,
      success       INTEGER NOT NULL DEFAULT 1,
      error         TEXT,

      stress_ms     INTEGER DEFAULT 0,
      scroll_speed  INTEGER DEFAULT 0
    )
  `);

  db.run(`CREATE TABLE IF NOT EXISTS ci_benchmark_metrics (${METRICS_COLUMNS})`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_runs_sha     ON ci_benchmark_runs(git_sha)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_runs_branch  ON ci_benchmark_runs(branch)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_runs_suite   ON ci_benchmark_runs(suite_id, item_count)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_runs_created ON ci_benchmark_runs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_runs_success ON ci_benchmark_runs(success)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_metrics_run  ON ci_benchmark_metrics(run_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_ci_metrics_label ON ci_benchmark_metrics(run_id, label)`);
};

const payload = JSON.parse(await readFile(inputPath, "utf-8"));
await mkdir(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
ensureSchema(db);

const insertRun = db.prepare(`
  INSERT INTO ci_benchmark_runs (
    generated_at, version, suite_id, item_count,
    git_sha, branch, pr_number, workflow_run_id, workflow_name, runner_os, baseline_sha,
    user_agent, hardware_concurrency, device_memory,
    duration_ms, success, error,
    stress_ms, scroll_speed
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMetric = db.prepare(`
  INSERT INTO ci_benchmark_metrics (run_id, label, value, unit, better, rating)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const metadata = payload.metadata ?? {};
const environment = payload.environment ?? {};
const runConfig = payload.config ?? {};
let inserted = 0;

const write = db.transaction(() => {
  for (const result of payload.results ?? []) {
    const info = insertRun.run(
      payload.generatedAt ?? null,
      environment.vlistVersion ?? payload.version ?? "0.0.0",
      result.suiteId,
      result.itemCount,
      metadata.gitSha ?? null,
      metadata.branch ?? null,
      Number.isFinite(metadata.prNumber) ? metadata.prNumber : null,
      metadata.workflowRunId ?? null,
      metadata.workflowName ?? null,
      metadata.runnerOs ?? null,
      metadata.baselineSha ?? null,
      environment.userAgent ?? null,
      environment.hardwareConcurrency ?? null,
      environment.deviceMemory ?? null,
      result.duration ?? null,
      result.success ? 1 : 0,
      result.error ?? null,
      runConfig.stressMs ?? 0,
      runConfig.scrollSpeed ?? 0,
    );

    const runId = Number(info.lastInsertRowid);
    for (const metric of result.metrics ?? []) {
      insertMetric.run(
        runId,
        metric.label,
        metric.value,
        metric.unit ?? "",
        metric.better ?? "none",
        metric.rating ?? null,
      );
    }
    inserted++;
  }
});

write();
db.close();

console.log(`Stored ${inserted} CI benchmark run(s) in ${dbPath}`);
