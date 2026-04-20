// scripts/seed-books.ts
// Seed script — downloads Open Library bulk dumps (authors + works) and
// populates a local SQLite database with books data.
//
// Usage:
//   bun run scripts/seed-books.ts
//
// Output:
//   data/books.db — SQLite database with a `books` table + indexes
//
// The script downloads two gzipped TSV dumps from Open Library:
//   1. Authors dump  (~0.5 GB gz) → builds an in-memory key→name map
//   2. Works dump    (~2.9 GB gz) → streams works, joins with authors, inserts into SQLite
//
// Each TSV line has columns:  type, key, revision, last_modified, JSON

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, unlinkSync, createWriteStream } from "fs";
import { resolve, dirname } from "path";
import { createInterface } from "readline";
import { createGunzip } from "zlib";
import { Readable } from "stream";

// =============================================================================
// Constants
// =============================================================================

const AUTHORS_URL =
  "https://openlibrary.org/data/ol_dump_authors_latest.txt.gz";
const WORKS_URL = "https://openlibrary.org/data/ol_dump_works_latest.txt.gz";

const DB_PATH = resolve(import.meta.dir, "../data/books.db");
const CACHE_DIR = resolve(import.meta.dir, "../data/.cache");

const AUTHORS_CACHE = resolve(CACHE_DIR, "ol_dump_authors_latest.txt.gz");
const WORKS_CACHE = resolve(CACHE_DIR, "ol_dump_works_latest.txt.gz");

const BATCH_SIZE = 5_000;

// Top-level subject categories for color grouping.
// We map granular subjects to these buckets.
const SUBJECT_CATEGORIES: Record<string, string[]> = {
  Fiction: [
    "fiction",
    "novel",
    "short stories",
    "fantasy",
    "romance",
    "mystery",
    "thriller",
    "horror",
    "adventure",
    "detective",
    "suspense",
    "literary fiction",
    "fairy tales",
    "fables",
    "myths",
    "legends",
  ],
  "Science Fiction": [
    "science fiction",
    "sci-fi",
    "dystopia",
    "cyberpunk",
    "space opera",
    "alternate history",
    "time travel",
    "utopia",
  ],
  Science: [
    "science",
    "physics",
    "chemistry",
    "biology",
    "mathematics",
    "astronomy",
    "geology",
    "ecology",
    "genetics",
    "evolution",
    "neuroscience",
    "botany",
    "zoology",
    "paleontology",
    "meteorology",
    "oceanography",
    "computer science",
    "engineering",
    "technology",
  ],
  History: [
    "history",
    "ancient",
    "medieval",
    "civil war",
    "world war",
    "revolution",
    "colonial",
    "archaeology",
    "antiquities",
    "civilization",
    "military history",
  ],
  Philosophy: [
    "philosophy",
    "ethics",
    "logic",
    "metaphysics",
    "epistemology",
    "existentialism",
    "aesthetics",
    "political philosophy",
    "moral philosophy",
  ],
  Religion: [
    "religion",
    "theology",
    "bible",
    "christianity",
    "islam",
    "buddhism",
    "hinduism",
    "judaism",
    "spirituality",
    "prayer",
    "faith",
    "church",
    "scripture",
    "qur'an",
    "quran",
    "talmud",
  ],
  Art: [
    "art",
    "painting",
    "sculpture",
    "photography",
    "architecture",
    "design",
    "drawing",
    "illustration",
    "graphic arts",
    "ceramics",
    "printmaking",
    "museums",
    "galleries",
  ],
  Music: [
    "music",
    "musical",
    "jazz",
    "rock",
    "classical music",
    "opera",
    "songs",
    "composers",
    "musicians",
    "instruments",
    "hip hop",
    "blues",
    "folk music",
  ],
  Poetry: ["poetry", "poems", "verse", "sonnets", "haiku", "ballads", "odes"],
  Drama: [
    "drama",
    "plays",
    "theater",
    "theatre",
    "tragedy",
    "comedy",
    "screenplays",
    "performing arts",
    "acting",
    "stagecraft",
  ],
  Biography: [
    "biography",
    "autobiography",
    "memoir",
    "memoirs",
    "diaries",
    "letters",
    "correspondence",
    "personal narratives",
  ],
  Children: [
    "children",
    "juvenile",
    "picture books",
    "young adult",
    "kids",
    "nursery rhymes",
    "bedtime",
    "teen",
  ],
  Education: [
    "education",
    "teaching",
    "learning",
    "textbook",
    "curriculum",
    "pedagogy",
    "literacy",
    "study",
    "examination",
    "school",
    "university",
    "college",
  ],
  Politics: [
    "politics",
    "political",
    "government",
    "democracy",
    "communism",
    "socialism",
    "capitalism",
    "diplomacy",
    "international relations",
    "public policy",
    "elections",
    "congress",
    "parliament",
  ],
  Law: [
    "law",
    "legal",
    "legislation",
    "jurisprudence",
    "constitutional",
    "criminal law",
    "justice",
    "courts",
    "human rights",
    "civil rights",
  ],
  Economics: [
    "economics",
    "economy",
    "finance",
    "banking",
    "trade",
    "commerce",
    "markets",
    "monetary",
    "fiscal",
    "investment",
    "stock",
    "accounting",
    "business",
  ],
  Psychology: [
    "psychology",
    "psychiatry",
    "mental health",
    "psychotherapy",
    "behavioral",
    "cognitive",
    "psychoanalysis",
    "consciousness",
    "personality",
  ],
  Medicine: [
    "medicine",
    "medical",
    "health",
    "disease",
    "surgery",
    "anatomy",
    "physiology",
    "nursing",
    "pharmacy",
    "diagnosis",
    "treatment",
    "clinical",
    "pathology",
    "epidemiology",
  ],
  Nature: [
    "nature",
    "environment",
    "wildlife",
    "animals",
    "plants",
    "birds",
    "insects",
    "forests",
    "ocean",
    "rivers",
    "mountains",
    "conservation",
    "endangered",
    "gardening",
  ],
  Travel: [
    "travel",
    "geography",
    "maps",
    "exploration",
    "voyages",
    "tourism",
    "guidebook",
    "atlas",
    "countries",
    "cities",
  ],
  Sports: [
    "sports",
    "athletics",
    "football",
    "baseball",
    "basketball",
    "soccer",
    "tennis",
    "golf",
    "swimming",
    "olympics",
    "cricket",
    "rugby",
    "boxing",
    "martial arts",
    "cycling",
    "running",
  ],
  Cooking: [
    "cooking",
    "cookbook",
    "recipes",
    "food",
    "cuisine",
    "baking",
    "nutrition",
    "diet",
    "culinary",
    "gastronomy",
    "wine",
    "beverages",
  ],
  Humor: ["humor", "comedy", "jokes", "satire", "parody", "wit", "cartoons", "comic strips"],
  Comics: [
    "comics",
    "comic books",
    "graphic novels",
    "manga",
    "superheroes",
    "anime",
    "cartoons",
  ],
  Reference: [
    "reference",
    "encyclopedia",
    "dictionary",
    "almanac",
    "handbook",
    "manual",
    "guide",
    "yearbook",
    "directory",
    "catalog",
    "bibliography",
    "index",
  ],
};

// Pre-compute a flat lookup: lowercase keyword → category name
const KEYWORD_TO_CATEGORY = new Map<string, string>();
for (const [category, keywords] of Object.entries(SUBJECT_CATEGORIES)) {
  for (const kw of keywords) {
    KEYWORD_TO_CATEGORY.set(kw.toLowerCase(), category);
  }
}

// =============================================================================
// Helpers
// =============================================================================

/** Classify an array of subject strings into a single top-level category. */
function classifySubjects(subjects: string[]): string {
  // Tally hits per category
  const hits = new Map<string, number>();

  for (const raw of subjects) {
    const lower = raw.toLowerCase().trim();

    // Direct match
    const direct = KEYWORD_TO_CATEGORY.get(lower);
    if (direct) {
      hits.set(direct, (hits.get(direct) ?? 0) + 1);
      continue;
    }

    // Substring match — check if any keyword appears in the subject
    for (const [kw, cat] of KEYWORD_TO_CATEGORY) {
      if (lower.includes(kw)) {
        hits.set(cat, (hits.get(cat) ?? 0) + 1);
        break; // one match per subject string is enough
      }
    }
  }

  if (hits.size === 0) return "Other";

  // Return the category with the most hits
  let best = "Other";
  let bestCount = 0;
  for (const [cat, count] of hits) {
    if (count > bestCount) {
      bestCount = count;
      best = cat;
    }
  }
  return best;
}

/** Parse a year from Open Library's messy first_publish_date field. */
function parseYear(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();

  // Try a 4-digit year anywhere in the string
  const m = s.match(/\b(\d{4})\b/);
  if (m) {
    const y = parseInt(m[1], 10);
    // Sanity: between 1000 and current year + 2
    if (y >= 1000 && y <= new Date().getFullYear() + 2) return y;
  }
  return null;
}

/** Format bytes into a human-readable string. */
function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format duration in ms to a readable string. */
function fmtDuration(ms: number): string {
  if (ms < 1_000) return `${ms.toFixed(0)}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60_000);
  const secs = ((ms % 60_000) / 1_000).toFixed(0);
  return `${mins}m ${secs}s`;
}

// =============================================================================
// Download with progress + caching
// =============================================================================

async function downloadFile(url: string, dest: string): Promise<void> {
  // If cached file already exists, skip download
  if (existsSync(dest)) {
    const size = Bun.file(dest).size;
    console.log(
      `  📦 Using cached file: ${dest.split("/").pop()} (${fmtBytes(size)})`,
    );
    return;
  }

  console.log(`  ⬇️  Downloading: ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  }
  if (!res.body) {
    throw new Error("No response body");
  }

  const contentLength = parseInt(
    res.headers.get("content-length") ?? "0",
    10,
  );
  const total = contentLength || null;

  const ws = createWriteStream(dest);
  let downloaded = 0;
  let lastLog = 0;

  const reader = res.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    ws.write(value);
    downloaded += value.byteLength;

    // Log progress every ~2 seconds
    const now = Date.now();
    if (now - lastLog > 2_000) {
      lastLog = now;
      if (total) {
        const pct = ((downloaded / total) * 100).toFixed(1);
        process.stdout.write(
          `\r  ⏳ ${fmtBytes(downloaded)} / ${fmtBytes(total)} (${pct}%)     `,
        );
      } else {
        process.stdout.write(`\r  ⏳ ${fmtBytes(downloaded)} downloaded     `);
      }
    }
  }

  await new Promise<void>((resolve, reject) => {
    ws.end(() => resolve());
    ws.on("error", reject);
  });

  console.log(`\r  ✅ Downloaded ${fmtBytes(downloaded)}                      `);
}

// =============================================================================
// Stream-parse a gzipped TSV dump, calling `handler` for each JSON record.
// =============================================================================

async function streamDump(
  gzPath: string,
  handler: (json: any) => void,
  label: string,
): Promise<number> {
  const fileStream = Bun.file(gzPath).stream();
  const nodeStream = Readable.fromWeb(fileStream as any);
  const gunzip = createGunzip();
  const decompressed = nodeStream.pipe(gunzip);

  const rl = createInterface({
    input: decompressed,
    crlfDelay: Infinity,
  });

  let count = 0;
  let errors = 0;
  let lastLog = Date.now();

  for await (const line of rl) {
    // TSV: type \t key \t revision \t last_modified \t JSON
    const tabIdx = line.indexOf("\t", line.indexOf("\t", line.indexOf("\t", line.indexOf("\t") + 1) + 1) + 1);
    if (tabIdx === -1) continue;

    const jsonStr = line.slice(tabIdx + 1);
    try {
      const record = JSON.parse(jsonStr);
      handler(record);
      count++;
    } catch {
      errors++;
    }

    // Progress every 2s
    const now = Date.now();
    if (now - lastLog > 2_000) {
      lastLog = now;
      process.stdout.write(
        `\r  ⏳ Processed ${count.toLocaleString()} ${label}...     `,
      );
    }
  }

  console.log(
    `\r  ✅ Processed ${count.toLocaleString()} ${label} (${errors.toLocaleString()} parse errors)     `,
  );
  return count;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log("\n  📚 Seeding books database from Open Library dumps\n");

  // Ensure directories exist
  for (const dir of [dirname(DB_PATH), CACHE_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // -------------------------------------------------------------------------
  // Step 1: Download dumps
  // -------------------------------------------------------------------------

  console.log("  ── Step 1: Download dumps ──\n");

  await downloadFile(AUTHORS_URL, AUTHORS_CACHE);
  await downloadFile(WORKS_URL, WORKS_CACHE);
  console.log();

  // -------------------------------------------------------------------------
  // Step 2: Build author key → name map
  // -------------------------------------------------------------------------

  console.log("  ── Step 2: Parse authors ──\n");

  const authorStart = performance.now();
  const authors = new Map<string, string>();

  await streamDump(
    AUTHORS_CACHE,
    (record) => {
      const key = record.key; // e.g. "/authors/OL123A"
      const name = record.name;
      if (key && name && typeof name === "string" && name.trim()) {
        authors.set(key, name.trim());
      }
    },
    "authors",
  );

  console.log(
    `  📇 Author map: ${authors.size.toLocaleString()} entries (${fmtDuration(performance.now() - authorStart)})\n`,
  );

  // -------------------------------------------------------------------------
  // Step 3: Create SQLite database
  // -------------------------------------------------------------------------

  console.log("  ── Step 3: Create database ──\n");

  // Remove existing DB
  if (existsSync(DB_PATH)) {
    try {
      unlinkSync(DB_PATH);
    } catch {
      /* already gone */
    }
  }

  const db = new Database(DB_PATH);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA synchronous = OFF"); // faster for bulk inserts
  db.run("PRAGMA cache_size = -64000"); // 64 MB cache
  db.run("PRAGMA temp_store = MEMORY");

  db.run(`
    CREATE TABLE books (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      key               TEXT    NOT NULL UNIQUE,
      title             TEXT    NOT NULL,
      author            TEXT,
      first_publish_year INTEGER,
      subject_category  TEXT    NOT NULL DEFAULT 'Other',
      subjects_json     TEXT
    )
  `);

  console.log(`  🗄️  Database created: ${DB_PATH}\n`);

  // -------------------------------------------------------------------------
  // Step 4: Stream works dump → insert into SQLite
  // -------------------------------------------------------------------------

  console.log("  ── Step 4: Parse works & insert ──\n");

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO books (key, title, author, first_publish_year, subject_category, subjects_json)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertBatch = db.transaction(
    (
      rows: Array<{
        key: string;
        title: string;
        author: string | null;
        year: number | null;
        category: string;
        subjects: string | null;
      }>,
    ) => {
      for (const row of rows) {
        insertStmt.run(
          row.key,
          row.title,
          row.author,
          row.year,
          row.category,
          row.subjects,
        );
      }
    },
  );

  let batch: Array<{
    key: string;
    title: string;
    author: string | null;
    year: number | null;
    category: string;
    subjects: string | null;
  }> = [];
  let inserted = 0;
  let skipped = 0;
  const worksStart = performance.now();

  await streamDump(
    WORKS_CACHE,
    (record) => {
      const title = record.title;
      if (!title || typeof title !== "string" || !title.trim()) {
        skipped++;
        return;
      }

      const key = record.key ?? ""; // e.g. "/works/OL123W"

      // Resolve author name(s)
      let authorName: string | null = null;
      const authorRefs: any[] = record.authors ?? [];
      if (authorRefs.length > 0) {
        const names: string[] = [];
        for (const ref of authorRefs.slice(0, 3)) {
          // Each ref is { "author": { "key": "/authors/OL123A" }, ... }
          const authorKey =
            ref?.author?.key ?? ref?.key ?? null;
          if (authorKey && authors.has(authorKey)) {
            names.push(authors.get(authorKey)!);
          }
        }
        if (names.length > 0) {
          authorName = names.join(", ");
        }
      }

      // Year
      const year = parseYear(record.first_publish_date);

      // Subjects — keep the raw list (up to 10) and compute a category
      const rawSubjects: string[] = (record.subjects ?? [])
        .filter((s: any) => typeof s === "string")
        .slice(0, 10);
      const category = classifySubjects(rawSubjects);
      const subjectsJson =
        rawSubjects.length > 0 ? JSON.stringify(rawSubjects) : null;

      batch.push({
        key,
        title: title.trim(),
        author: authorName,
        year,
        category,
        subjects: subjectsJson,
      });

      if (batch.length >= BATCH_SIZE) {
        insertBatch(batch);
        inserted += batch.length;
        batch = [];

        // Progress
        const now = Date.now();
        process.stdout.write(
          `\r  ⏳ Inserted ${inserted.toLocaleString()} books...     `,
        );
      }
    },
    "works",
  );

  // Flush remaining
  if (batch.length > 0) {
    insertBatch(batch);
    inserted += batch.length;
  }

  const worksTime = performance.now() - worksStart;
  console.log(
    `\n  ✅ Inserted ${inserted.toLocaleString()} books, skipped ${skipped.toLocaleString()} (${fmtDuration(worksTime)})\n`,
  );

  // -------------------------------------------------------------------------
  // Step 5: Indexes
  // -------------------------------------------------------------------------

  console.log("  ── Step 5: Create indexes ──\n");

  const indexStart = performance.now();

  // Single-column indexes — used for WHERE filters and category/year range queries.
  db.run("CREATE INDEX idx_books_title ON books (title COLLATE NOCASE)");
  db.run("CREATE INDEX idx_books_author ON books (author COLLATE NOCASE)");
  db.run("CREATE INDEX idx_books_year ON books (first_publish_year)");
  db.run("CREATE INDEX idx_books_category ON books (subject_category)");

  // Composite indexes — required for O(log N) keyset pagination.
  // Without these, ORDER BY (col, id ASC) cannot be satisfied by the single-column
  // index and SQLite falls back to an O(N log N) filesort on every keyset query.
  db.run(
    "CREATE INDEX idx_books_title_id ON books (title COLLATE NOCASE, id)",
  );
  db.run(
    "CREATE INDEX idx_books_author_id ON books (author COLLATE NOCASE, id)",
  );
  db.run(
    "CREATE INDEX idx_books_year_id ON books (first_publish_year, id)",
  );
  db.run(
    "CREATE INDEX idx_books_category_id ON books (subject_category, id)",
  );

  // Filter+sort composite indexes — required for O(log N) keyset pagination on
  // category-filtered queries.  (subject_category, col, id) lets SQLite satisfy
  // both WHERE subject_category = ? and ORDER BY col ASC, id ASC from one index.
  db.run(
    "CREATE INDEX idx_books_cat_title_id ON books (subject_category, title COLLATE NOCASE, id)",
  );
  db.run(
    "CREATE INDEX idx_books_cat_author_id ON books (subject_category, author COLLATE NOCASE, id)",
  );
  db.run(
    "CREATE INDEX idx_books_cat_year_id ON books (subject_category, first_publish_year, id)",
  );

  console.log(
    `  ✅ Indexes created in ${fmtDuration(performance.now() - indexStart)}\n`,
  );

  // Reset pragmas for normal usage
  db.run("PRAGMA synchronous = NORMAL");

  // -------------------------------------------------------------------------
  // Step 6: Verify
  // -------------------------------------------------------------------------

  console.log("  ── Step 6: Verification ──\n");

  const totalCount = (
    db.query("SELECT COUNT(*) as count FROM books").get() as {
      count: number;
    }
  ).count;
  const withAuthor = (
    db
      .query(
        "SELECT COUNT(*) as count FROM books WHERE author IS NOT NULL",
      )
      .get() as { count: number }
  ).count;
  const withYear = (
    db
      .query(
        "SELECT COUNT(*) as count FROM books WHERE first_publish_year IS NOT NULL",
      )
      .get() as { count: number }
  ).count;

  const categories = db
    .query(
      "SELECT subject_category, COUNT(*) as count FROM books GROUP BY subject_category ORDER BY count DESC",
    )
    .all() as Array<{ subject_category: string; count: number }>;

  const oldest = db
    .query(
      "SELECT title, author, first_publish_year FROM books WHERE first_publish_year IS NOT NULL ORDER BY first_publish_year ASC LIMIT 3",
    )
    .all() as Array<{
    title: string;
    author: string | null;
    first_publish_year: number;
  }>;

  const sample = db
    .query("SELECT title, author, first_publish_year, subject_category FROM books ORDER BY RANDOM() LIMIT 5")
    .all() as Array<{
    title: string;
    author: string | null;
    first_publish_year: number | null;
    subject_category: string;
  }>;

  console.log("  📊 Summary:");
  console.log(`     Total books:    ${totalCount.toLocaleString()}`);
  console.log(
    `     With author:    ${withAuthor.toLocaleString()} (${((withAuthor / totalCount) * 100).toFixed(1)}%)`,
  );
  console.log(
    `     With year:      ${withYear.toLocaleString()} (${((withYear / totalCount) * 100).toFixed(1)}%)`,
  );

  console.log(`\n     Categories:`);
  for (const cat of categories) {
    const pct = ((cat.count / totalCount) * 100).toFixed(1);
    console.log(
      `       ${cat.subject_category.padEnd(20)} ${cat.count.toLocaleString().padStart(10)}  (${pct}%)`,
    );
  }

  console.log(`\n     Oldest books:`);
  for (const b of oldest) {
    console.log(
      `       ${b.first_publish_year}  ${b.title.slice(0, 50)}${b.title.length > 50 ? "…" : ""}  — ${b.author ?? "Unknown"}`,
    );
  }

  console.log(`\n     Random sample:`);
  for (const b of sample) {
    const year = b.first_publish_year ?? "????";
    const author = b.author ?? "Unknown";
    console.log(
      `       [${b.subject_category.padEnd(16)}] ${year}  ${b.title.slice(0, 45)}${b.title.length > 45 ? "…" : ""}  — ${author}`,
    );
  }

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------

  const fileSize = Bun.file(DB_PATH).size;
  const totalTime = performance.now() - worksStart; // from works start

  console.log(`\n  📦 Database size: ${fmtBytes(fileSize)}`);
  console.log(`  ⏱️  Total time:   ${fmtDuration(totalTime)}`);
  console.log(`\n  Done! 📚🎉\n`);

  db.close();
}

// =============================================================================
// Run
// =============================================================================

main().catch((err) => {
  console.error("\n  ❌ Fatal error:", err);
  process.exit(1);
});
