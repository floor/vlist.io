// scripts/seed-tracks.ts
// Seed script — reads 1000 tracks from MongoDB and inserts into SQLite.
//
// Usage:
//   bun run scripts/seed-tracks.ts
//
// Output:
//   data/tracks.db — SQLite database with a `tracks` table + indexes

import { Database } from "bun:sqlite";
import { MongoClient } from "mongodb";
import { existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";

// =============================================================================
// MongoDB Configuration
// =============================================================================

const MONGODB_URI = "mongodb://127.0.0.1/radiooooo?authSource=admin";
const MONGODB_USER = "radiooooo";
const MONGODB_PASS = "XHADKbJMPqn67zK5Sw3EzYUXhFLUQAQW";
const TRACKS_LIMIT = 1000;

// =============================================================================
// Database setup
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../data/tracks.db");

// Ensure the data/ directory exists
const dbDir = dirname(DB_PATH);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

// Remove existing DB to start fresh
if (existsSync(DB_PATH)) {
  try {
    const { unlinkSync } = await import("fs");
    unlinkSync(DB_PATH);
  } catch {
    // Already deleted or doesn't exist
  }
}

console.log(`\n  🎵 Seeding tracks database\n`);
console.log(`  Source:  MongoDB (${MONGODB_URI})`);
console.log(`  Target:  ${DB_PATH}`);
console.log(`  Limit:   ${TRACKS_LIMIT} tracks\n`);

// =============================================================================
// Fetch tracks from MongoDB
// =============================================================================

console.log("  🔌 Connecting to MongoDB...");

const mongoUri = MONGODB_URI.replace(
  "mongodb://",
  `mongodb://${MONGODB_USER}:${MONGODB_PASS}@`,
);

const client = new MongoClient(mongoUri);

let tracks: any[] = [];

try {
  await client.connect();
  console.log("  ✅ Connected to MongoDB\n");

  const db = client.db("radiooooo");
  const tracksCollection = db.collection("track");

  console.log("  📥 Fetching tracks...");
  const start = performance.now();

  // Fetch last 1000 tracks with status "onair" (most recent by _id)
  tracks = await tracksCollection
    .aggregate([
      { $match: { status: "onair" } },
      { $sort: { _id: -1 } },
      { $limit: TRACKS_LIMIT },
      {
        $project: {
          _id: 1,
          title: 1,
          artist: 1,
          country: 1,
          year: 1,
          decade: 1,
          category: 1,
          duration: 1,
          approved: 1,
        },
      },
    ])
    .toArray();

  const fetchTime = performance.now() - start;
  console.log(
    `  ✅ Fetched ${tracks.length} tracks in ${fetchTime.toFixed(0)}ms\n`,
  );
} catch (error) {
  console.error("  ❌ MongoDB error:", error);
  process.exit(1);
} finally {
  await client.close();
}

// =============================================================================
// SQLite setup
// =============================================================================

const db = new Database(DB_PATH);

// Enable WAL mode for better read performance
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA synchronous = NORMAL");

// =============================================================================
// Schema
// =============================================================================

db.run(`
  CREATE TABLE IF NOT EXISTS tracks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    mongo_id      TEXT    UNIQUE NOT NULL,
    title         TEXT    NOT NULL,
    artist        TEXT    NOT NULL,
    country       TEXT,
    year          INTEGER,
    decade        INTEGER,
    category      TEXT,
    duration      INTEGER,
    approved      INTEGER DEFAULT 0,
    created_at    TEXT    DEFAULT CURRENT_TIMESTAMP
  )
`);

// =============================================================================
// Insert
// =============================================================================

console.log("  💾 Inserting tracks into SQLite...");

const insert = db.prepare(`
  INSERT INTO tracks (mongo_id, title, artist, country, year, decade, category, duration, approved)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertStart = performance.now();
let inserted = 0;

// Wrap in a transaction for speed
const insertBatch = db.transaction((tracks: any[]) => {
  for (const track of tracks) {
    insert.run(
      track._id.toString(),
      track.title || "Untitled",
      track.artist || "Unknown Artist",
      track.country || null,
      track.year || null,
      track.decade || null,
      track.category || null,
      track.duration || null,
      track.approved ? 1 : 0,
    );
    inserted++;

    if (inserted % 100 === 0) {
      const pct = ((inserted / tracks.length) * 100).toFixed(0);
      process.stdout.write(
        `\r  ⏳ Inserted ${inserted} / ${tracks.length} tracks (${pct}%)`,
      );
    }
  }
});

insertBatch(tracks);

const insertTime = performance.now() - insertStart;
console.log(
  `\n  ✅ Inserted ${inserted.toLocaleString()} tracks in ${insertTime.toFixed(0)}ms\n`,
);

// =============================================================================
// Indexes
// =============================================================================

console.log("  📇 Creating indexes...");
const indexStart = performance.now();

db.run("CREATE INDEX idx_tracks_title    ON tracks (title COLLATE NOCASE)");
db.run("CREATE INDEX idx_tracks_artist   ON tracks (artist COLLATE NOCASE)");
db.run("CREATE INDEX idx_tracks_country  ON tracks (country)");
db.run("CREATE INDEX idx_tracks_year     ON tracks (year DESC)");
db.run("CREATE INDEX idx_tracks_decade   ON tracks (decade)");
db.run("CREATE INDEX idx_tracks_category ON tracks (category)");
db.run("CREATE INDEX idx_tracks_approved ON tracks (approved)");

const indexTime = performance.now() - indexStart;
console.log(`  ✅ Indexes created in ${indexTime.toFixed(0)}ms\n`);

// =============================================================================
// Verify
// =============================================================================

const count = db.query("SELECT COUNT(*) as count FROM tracks").get() as {
  count: number;
};
const topTracks = db
  .query(
    "SELECT title, artist, country, year FROM tracks ORDER BY year DESC LIMIT 5",
  )
  .all() as Array<{
  title: string;
  artist: string;
  country: string;
  year: number;
}>;
const countries = db
  .query(
    "SELECT COUNT(DISTINCT country) as count FROM tracks WHERE country IS NOT NULL",
  )
  .get() as { count: number };
const decades = db
  .query(
    `SELECT decade, COUNT(*) as count FROM tracks
     WHERE decade IS NOT NULL
     GROUP BY decade
     ORDER BY decade DESC
     LIMIT 5`,
  )
  .all() as Array<{ decade: number; count: number }>;

console.log("  📊 Verification:");
console.log(`     Total tracks:   ${count.count.toLocaleString()}`);
console.log(`     Countries:      ${countries.count}`);
console.log(
  `     Decades:        ${decades.map((d) => `${d.decade}s (${d.count})`).join(", ")}`,
);
console.log(`\n     Sample tracks:`);
for (const track of topTracks) {
  const countryStr = track.country ? `[${track.country}]` : "[--]";
  const yearStr = track.year || "????";
  console.log(
    `       ${yearStr} ${countryStr.padEnd(6)} ${track.title.substring(0, 30).padEnd(32)} — ${track.artist.substring(0, 20)}`,
  );
}

// =============================================================================
// Done
// =============================================================================

const totalTime = performance.now() - insertStart;
const fileSize = Bun.file(DB_PATH).size;
const sizeMB = (fileSize / 1024 / 1024).toFixed(2);

console.log(`\n  📦 Database size: ${sizeMB} MB`);
console.log(`  ⏱️  Total time:   ${totalTime.toFixed(0)}ms`);
console.log(`\n  Done! 🎉\n`);

db.close();
