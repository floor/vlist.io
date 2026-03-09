// scripts/seed-cities.ts
// Seed script — reads src/data/cities.js and inserts all cities into SQLite.
//
// Usage:
//   bun run scripts/seed-cities.ts
//
// Output:
//   data/cities.db — SQLite database with a `cities` table + indexes

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// =============================================================================
// Import source data (the heavy JS file — Bun handles it fine at import time)
// =============================================================================

import { CC, CONT, TOTAL, C } from "../src/data/cities.js";

// =============================================================================
// Continent code → full name lookup
// =============================================================================

const CONTINENT_NAMES: Record<string, string> = {
  AF: "Africa",
  AM: "Americas",
  AS: "Asia",
  AT: "Antarctica",
  EU: "Europe",
  IO: "Indian Ocean",
  OC: "Oceania",
  OT: "Other",
};

// =============================================================================
// Database setup
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../data/cities.db");

// Ensure the data/ directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Remove existing DB to start fresh
if (existsSync(DB_PATH)) {
  Bun.file(DB_PATH).delete?.();
  // Fallback for older Bun versions
  try {
    const { unlinkSync } = await import("fs");
    unlinkSync(DB_PATH);
  } catch {
    // Already deleted or doesn't exist
  }
}

console.log(`\n  🗄️  Seeding cities database\n`);
console.log(`  Source:  src/data/cities.js`);
console.log(`  Target:  ${DB_PATH}`);
console.log(`  Cities:  ${C.length} (expected ${TOTAL})\n`);

const db = new Database(DB_PATH);

// Enable WAL mode for better read performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");

// =============================================================================
// Schema
// =============================================================================

db.run(`
  CREATE TABLE IF NOT EXISTS cities (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    country_code  TEXT    NOT NULL,
    population    INTEGER NOT NULL,
    lat           REAL    NOT NULL,
    lng           REAL    NOT NULL,
    continent     TEXT    NOT NULL
  )
`);

// =============================================================================
// Insert
// =============================================================================

const insert = db.prepare(`
  INSERT INTO cities (name, country_code, population, lat, lng, continent)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const BATCH_SIZE = 5000;
let inserted = 0;
const start = performance.now();

// Wrap in a transaction for massive speed improvement
const insertBatch = db.transaction(
  (rows: Array<[string, number, number, number, number, number]>) => {
    for (const row of rows) {
      const [name, ccIdx, population, lat, lng, contIdx] = row;
      const countryCode = CC[ccIdx] ?? "??";
      const continent = CONTINENT_NAMES[CONT[contIdx]] ?? "Other";
      insert.run(name, countryCode, population, lat, lng, continent);
    }
  },
);

// Process in batches
for (let i = 0; i < C.length; i += BATCH_SIZE) {
  const batch = C.slice(i, i + BATCH_SIZE);
  insertBatch(batch);
  inserted += batch.length;

  const pct = ((inserted / C.length) * 100).toFixed(0);
  process.stdout.write(`\r  ⏳ Inserted ${inserted.toLocaleString()} / ${C.length.toLocaleString()} cities (${pct}%)`);
}

const insertTime = performance.now() - start;
console.log(`\n  ✅ Inserted ${inserted.toLocaleString()} cities in ${insertTime.toFixed(0)}ms\n`);

// =============================================================================
// Indexes
// =============================================================================

console.log("  📇 Creating indexes...");
const indexStart = performance.now();

db.run("CREATE INDEX idx_cities_name         ON cities (name COLLATE NOCASE)");
db.run("CREATE INDEX idx_cities_country_code ON cities (country_code)");
db.run("CREATE INDEX idx_cities_continent    ON cities (continent)");
db.run("CREATE INDEX idx_cities_population   ON cities (population DESC)");
db.run("CREATE INDEX idx_cities_lat_lng      ON cities (lat, lng)");

const indexTime = performance.now() - indexStart;
console.log(`  ✅ Indexes created in ${indexTime.toFixed(0)}ms\n`);

// =============================================================================
// Verify
// =============================================================================

const count = db.query("SELECT COUNT(*) as count FROM cities").get() as { count: number };
const topCities = db.query("SELECT name, country_code, population FROM cities ORDER BY population DESC LIMIT 5").all() as Array<{ name: string; country_code: string; population: number }>;
const countries = db.query("SELECT COUNT(DISTINCT country_code) as count FROM cities").get() as { count: number };
const continents = db.query("SELECT continent, COUNT(*) as count FROM cities GROUP BY continent ORDER BY count DESC").all() as Array<{ continent: string; count: number }>;

console.log("  📊 Verification:");
console.log(`     Total cities:   ${count.count.toLocaleString()}`);
console.log(`     Countries:      ${countries.count}`);
console.log(`     Continents:     ${continents.map((c) => `${c.continent} (${c.count.toLocaleString()})`).join(", ")}`);
console.log(`\n     Top 5 cities:`);
for (const city of topCities) {
  console.log(`       ${city.name.padEnd(20)} ${city.country_code}  pop ${city.population.toLocaleString()}`);
}

// =============================================================================
// Done
// =============================================================================

const totalTime = performance.now() - start;
const fileSize = Bun.file(DB_PATH).size;
const sizeMB = (fileSize / 1024 / 1024).toFixed(2);

console.log(`\n  📦 Database size: ${sizeMB} MB`);
console.log(`  ⏱️  Total time:   ${totalTime.toFixed(0)}ms`);
console.log(`\n  Done! 🎉\n`);

db.close();
