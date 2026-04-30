// src/api/books.ts
// Books API — paginated, sortable, filterable, searchable.
// Backed by SQLite (data/books.db), ~40.8M rows / 10 GB.
//
// Endpoints:
//   GET /api/books          — paginated list with sort, filter, search
//   GET /api/books/:id      — single book by ID
//   GET /api/books/categories — distinct subject categories with counts
//   GET /api/books/stats    — aggregate statistics

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { resolve } from "path";
import { existsSync } from "fs";

// =============================================================================
// Database Connection (singleton, read-only)
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../../data/books.db");

let db: Database | null = null;

/**
 * One-time startup migration: add composite (col, id) indexes to the existing DB.
 *
 * The seed script creates single-column NOCASE indexes, but the keyset pagination
 * query orders by (col COLLATE NOCASE, id ASC). SQLite cannot satisfy a two-column
 * ORDER BY from a one-column index and falls back to an O(N log N) filesort of all
 * matching rows — causing multi-minute queries at deep offsets.
 *
 * Composite indexes (title COLLATE NOCASE, id) etc. let SQLite seek and scan in a
 * single index pass, making keyset seeks O(log N) regardless of depth.
 *
 * This runs once, persists in the DB file, and is skipped on all subsequent starts.
 */
let _indexesEnsured = false;
function ensureCompositeIndexes(): void {
  if (_indexesEnsured) return;
  _indexesEnsured = true;

  const writeDb = new Database(DB_PATH);
  try {
    writeDb.run("PRAGMA journal_mode = WAL");
    writeDb.run("PRAGMA cache_size = -65536"); // 64 MB for index builds

    // Migration 1: sort-column composite indexes for unfiltered keyset pagination.
    // (col COLLATE NOCASE, id) lets SQLite do O(log N) seeks for any sort depth.
    const hasTitleId = writeDb
      .query("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_books_title_id'")
      .get();
    if (!hasTitleId) {
      process.stderr.write("[books] Adding sort composite indexes (one-time setup)...\n");
      const t = Date.now();
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_title_id ON books (title COLLATE NOCASE, id)");
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_author_id ON books (author COLLATE NOCASE, id)");
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_year_id ON books (first_publish_year, id)");
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_category_id ON books (subject_category, id)");
      process.stderr.write(`[books] Sort composite indexes ready (${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
    }

    // Migration 2: filter+sort composite indexes for category-filtered queries.
    // (subject_category, col, id) allows SQLite to use a single index for both
    // the WHERE category = ? equality and the ORDER BY col range scan — no filesort.
    const hasCatTitleId = writeDb
      .query("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_books_cat_title_id'")
      .get();
    if (!hasCatTitleId) {
      process.stderr.write("[books] Adding filter+sort composite indexes (one-time setup)...\n");
      const t = Date.now();
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_cat_title_id ON books (subject_category, title COLLATE NOCASE, id)");
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_cat_author_id ON books (subject_category, author COLLATE NOCASE, id)");
      writeDb.run("CREATE INDEX IF NOT EXISTS idx_books_cat_year_id ON books (subject_category, first_publish_year, id)");
      process.stderr.write(`[books] Filter+sort indexes ready (${((Date.now() - t) / 1000).toFixed(1)}s)\n`);
    }
  } finally {
    writeDb.close();
  }
}

/**
 * Background startup: pre-populate position samples for all unfiltered sort columns.
 *
 * Collects one sample every SAMPLE_MAX_DELTA rows by chaining keyset jumps:
 *   WHERE col > prevVal ORDER BY col LIMIT 1 OFFSET SAMPLE_MAX_DELTA - 1
 *
 * Each jump uses the composite (col, id) index — O(log N) seek + O(SAMPLE_MAX_DELTA)
 * index scan ≈ 2–5 ms. For 40.8 M rows at 100 K intervals: ~408 jumps ≈ 1 s per
 * column/direction, ~8 s total. Runs in the background; yields every 10 iterations.
 *
 * NULL handling: many columns have NULL values that sort before all non-null values
 * in ASC order. We count them once, skip the NULL region, find the first non-null
 * anchor, and assign logical offsets correctly so delta calculations remain exact.
 */
async function initPositionSamples(): Promise<void> {
  const database = getDb();
  const total = getTotalCount();

  const columns: { sort: string; col: string }[] = [
    { sort: "title", col: "title COLLATE NOCASE" },
    { sort: "author", col: "author COLLATE NOCASE" },
    { sort: "first_publish_year", col: "first_publish_year" },
    { sort: "subject_category", col: "subject_category COLLATE NOCASE" },
  ];

  for (const { sort, col } of columns) {
    for (const direction of ["asc", "desc"] as const) {
      const dir = direction.toUpperCase() as "ASC" | "DESC";
      const op = direction === "asc" ? ">" : "<";
      const t = Date.now();

      // Count NULLs — SQLite places NULL < all values, so they lead in ASC and
      // trail in DESC. We only collect samples in the non-null region.
      const { count: nullCount } = database
        .query(`SELECT COUNT(*) as count FROM books WHERE ${sort} IS NULL`)
        .get() as { count: number };

      const nullLeadCount = direction === "asc" ? nullCount : 0;

      // Find the first non-null value: the anchor all keyset jumps start from.
      const anchor = database
        .query(
          `SELECT ${sort} as val, id FROM books
           WHERE ${sort} IS NOT NULL
           ORDER BY ${col} ${dir}, id ASC LIMIT 1`,
        )
        .get() as { val: string | number; id: number } | null;

      if (!anchor) continue; // Column is entirely NULL

      let prevVal = anchor.val;

      // First sample logical offset: the first SAMPLE_MAX_DELTA boundary that
      // falls inside the non-null region. The jump from anchor to it in non-null
      // space is (firstSampleLogical - nullLeadCount) rows.
      const firstSampleLogical =
        Math.ceil((nullLeadCount + 1) / SAMPLE_MAX_DELTA) * SAMPLE_MAX_DELTA;
      let nonNullFromPrev = firstSampleLogical - nullLeadCount;
      let nextLogical = firstSampleLogical;
      let collected = 0;

      while (nextLogical < total) {
        const row = database
          .query(
            `SELECT ${sort} as val, id FROM books
             WHERE ${col} ${op} ?
             ORDER BY ${col} ${dir}, id ASC
             LIMIT 1 OFFSET ?`,
          )
          .get(prevVal, nonNullFromPrev - 1) as {
          val: string | number;
          id: number;
        } | null;

        if (!row) break; // Past end of non-null data

        storeSample(sort, direction, nextLogical, row.val, row.id);
        prevVal = row.val;
        collected++;

        // All subsequent jumps are exactly SAMPLE_MAX_DELTA in non-null space
        // (no NULLs can appear between non-null rows in sorted order).
        nonNullFromPrev = SAMPLE_MAX_DELTA;
        nextLogical += SAMPLE_MAX_DELTA;

        // Yield every 10 iterations so incoming HTTP requests aren't starved.
        if (collected % 10 === 0) await new Promise<void>((r) => setImmediate(r));
      }

      process.stderr.write(
        `[books] samples ${sort}:${direction} — ${collected} in ${((Date.now() - t) / 1000).toFixed(1)}s\n`,
      );
    }
  }
  process.stderr.write("[books] Position samples ready.\n");
}

function getDb(): Database {
  if (!db) {
    if (!existsSync(DB_PATH)) {
      throw new Error("books.db not found. Expected at: " + DB_PATH);
    }
    ensureCompositeIndexes();
    db = new Database(DB_PATH, { readonly: true });
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA cache_size = -16000"); // 16 MB cache (larger DB)
    // db is set before this call — safe to call getDb() inside.
    initPositionSamples().catch((err) => {
      process.stderr.write(`[books] Sample init error: ${err.message}\n`);
    });
  }
  return db;
}

// =============================================================================
// Types
// =============================================================================

export interface Book {
  id: number;
  key: string;
  title: string;
  author: string | null;
  first_publish_year: number | null;
  subject_category: string;
  subjects_json: string | null;
}

export interface BooksResponse {
  items: Book[];
  total: number;
  hasMore: boolean;
}

export interface BooksStatsResponse {
  total: number;
  categories: { category: string; count: number }[];
  withAuthor: number;
  withYear: number;
  yearRange: { min: number; max: number };
}

// =============================================================================
// Configuration
// =============================================================================

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

const SORTABLE_COLUMNS = new Set([
  "id",
  "title",
  "author",
  "first_publish_year",
  "subject_category",
]);

const VALID_DIRECTIONS = new Set(["asc", "desc"]);

// =============================================================================
// Cached Total + Max ID (avoid COUNT(*) / MAX(id) full scans on 40M+ rows)
// =============================================================================

let cachedTotal: number | null = null;
let cachedMaxId: number | null = null;
const cachedCategoryCounts = new Map<string, number>();

function getTotalCount(): number {
  if (cachedTotal === null) {
    const database = getDb();
    const row = database.query("SELECT COUNT(*) as count FROM books").get() as {
      count: number;
    };
    cachedTotal = row.count;
  }
  return cachedTotal;
}

function getMaxId(): number {
  if (cachedMaxId === null) {
    const database = getDb();
    const row = database
      .query("SELECT MAX(id) as maxId FROM books")
      .get() as { maxId: number };
    cachedMaxId = row.maxId;
  }
  return cachedMaxId;
}

/** Cached COUNT(*) per category — DB is read-only so counts never change. */
function getCategoryCount(category: string): number {
  const cached = cachedCategoryCounts.get(category);
  if (cached !== undefined) return cached;
  const database = getDb();
  const row = database
    .query("SELECT COUNT(*) as count FROM books WHERE subject_category = ?")
    .get(category) as { count: number };
  cachedCategoryCounts.set(category, row.count);
  return row.count;
}

// =============================================================================
// Lazy position sample index
//
// After every OFFSET-based or cursor-based query (non-id, no filters), we
// store the last item as a position sample: "at offset N, the sort value is V
// and the id is I".  Future queries within SAMPLE_MAX_DELTA rows of a stored
// sample use it as a keyset starting point, cutting the effective OFFSET from
// millions down to at most SAMPLE_MAX_DELTA rows (< 10 ms).
//
// No startup cost — samples accumulate naturally from user requests.
// No invalidation needed — the DB is read-only.
// =============================================================================

interface PositionSample {
  offset: number;
  val: string | number;
  id: number;
}

/** Max row distance from a stored sample to still use it as a seek anchor. */
const SAMPLE_MAX_DELTA = 100_000;

/** sort:direction → array of samples sorted by offset */
const positionSamples = new Map<string, PositionSample[]>();

function storeSample(
  sort: string,
  direction: string,
  offset: number,
  val: string | number,
  id: number,
): void {
  const key = `${sort}:${direction}`;
  let arr = positionSamples.get(key);
  if (!arr) {
    arr = [];
    positionSamples.set(key, arr);
  }
  // Binary insert, sorted by offset
  let lo = 0,
    hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].offset < offset) lo = mid + 1;
    else hi = mid;
  }
  if (arr[lo]?.offset === offset) arr[lo] = { offset, val, id };
  else arr.splice(lo, 0, { offset, val, id });
}

/**
 * Find the closest stored sample at or before `offset` within
 * SAMPLE_MAX_DELTA rows.  Returns null when nothing useful is available.
 */
function findSampleBefore(
  sort: string,
  direction: string,
  offset: number,
): PositionSample | null {
  const arr = positionSamples.get(`${sort}:${direction}`);
  if (!arr || arr.length === 0) return null;
  let lo = 0,
    hi = arr.length - 1,
    best = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].offset <= offset) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (best < 0) return null;
  const s = arr[best];
  return offset - s.offset <= SAMPLE_MAX_DELTA ? s : null;
}

// =============================================================================
// Query Builders
// =============================================================================

interface QueryFilters {
  search?: string;
  author?: string;
  category?: string;
  minYear?: number;
  maxYear?: number;
}

interface QueryOptions extends QueryFilters {
  offset: number;
  limit: number;
  sort: string;
  direction: string;
  /** Keyset cursor: sort-column value of the last item in the previous chunk */
  cursorVal?: string | number;
  /** Keyset cursor: id of the last item in the previous chunk */
  cursorId?: number;
}

/**
 * Build WHERE clause and params from filters.
 * Returns [clause, params] — clause includes leading WHERE if non-empty.
 */
function buildWhere(filters: QueryFilters): [string, SQLQueryBindings[]] {
  const conditions: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (filters.search) {
    conditions.push("title LIKE ?");
    params.push(`%${filters.search}%`);
  }

  if (filters.author) {
    conditions.push("author LIKE ?");
    params.push(`%${filters.author}%`);
  }

  if (filters.category) {
    conditions.push("subject_category = ?");
    params.push(filters.category);
  }

  if (filters.minYear != null && filters.minYear !== 0) {
    conditions.push("first_publish_year >= ?");
    params.push(filters.minYear);
  }

  if (filters.maxYear != null && filters.maxYear !== 0) {
    conditions.push("first_publish_year <= ?");
    params.push(filters.maxYear);
  }

  const clause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return [clause, params];
}

/**
 * Returns true when none of the filter fields are active.
 */
function hasNoFilters(filters: QueryFilters): boolean {
  return (
    !filters.search &&
    !filters.author &&
    !filters.category &&
    (filters.minYear == null || filters.minYear === 0) &&
    (filters.maxYear == null || filters.maxYear === 0)
  );
}

/**
 * Returns true when `category` is the only active filter.
 * Used to enable keyset cursor pagination and fast count caching for filtered queries.
 */
function isCategoryOnlyFilter(filters: QueryFilters): boolean {
  return !!(
    filters.category &&
    !filters.search &&
    !filters.author &&
    (filters.minYear == null || filters.minYear === 0) &&
    (filters.maxYear == null || filters.maxYear === 0)
  );
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * GET /api/books
 *
 * Query params:
 *   offset    — start index (default: 0)
 *   limit     — page size (default: 50, max: 200)
 *   sort      — column to sort by (default: "id")
 *   direction — "asc" or "desc" (default: "asc")
 *   search    — case-insensitive title search (LIKE %term%)
 *   author    — case-insensitive author search (LIKE %term%)
 *   category  — exact match on subject_category
 *   minYear   — minimum first_publish_year
 *   maxYear   — maximum first_publish_year
 *   delay     — simulated latency in ms (default: 0, max: 5000)
 */
export function getBooks(options: QueryOptions): BooksResponse {
  const database = getDb();

  // Validate sort column (prevent SQL injection)
  const sort = SORTABLE_COLUMNS.has(options.sort) ? options.sort : "id";
  const direction = VALID_DIRECTIONS.has(options.direction)
    ? options.direction
    : "asc";

  const collate =
    sort === "title" || sort === "author" || sort === "subject_category"
      ? " COLLATE NOCASE"
      : "";

  const [whereClause, whereParams] = buildWhere(options);

  // Count total matching rows — use caches where possible (40M+ rows, full scan otherwise)
  let total: number;
  if (hasNoFilters(options)) {
    total = getTotalCount();
  } else if (isCategoryOnlyFilter(options)) {
    total = getCategoryCount(options.category!);
  } else {
    const countRow = database
      .query(`SELECT COUNT(*) as count FROM books${whereClause}`)
      .get(...whereParams) as { count: number };
    total = countRow.count;
  }

  // Fetch page
  const offset = Math.max(0, options.offset);
  const limit = Math.min(Math.max(1, options.limit), MAX_LIMIT);

  const SELECT_COLS = `SELECT id, key, title, author, first_publish_year, subject_category, subjects_json FROM books`;

  // Keyset (cursor) pagination — O(log n) at any depth for any sort column.
  //
  // When the client provides cursorVal + cursorId (the last item from the
  // previous chunk), we use a two-pass seek instead of LIMIT/OFFSET:
  //   Pass 1: exact cursor value, id > cursorId (handles duplicate sort values)
  //   Pass 2: sort value strictly past cursor (the common case)
  // The OR-based single-pass approach (col > ? OR (col = ? AND id > ?)) forces
  // a full index SCAN; two separate range seeks both use SEARCH (O(log n)).
  //
  // Fallback 1 (sort=id, no cursor): treat offset ≈ id (AUTOINCREMENT ≈ 1..N)
  //   → WHERE id > offset, still O(log n) for any depth.
  // Fallback 2 (all other cases): classic LIMIT/OFFSET — O(n), slow for deep
  //   positions but only reached on cold jumps to non-id sort columns.
  const { cursorVal, cursorId } = options;
  const hasCursor =
    cursorVal !== undefined &&
    cursorVal !== null &&
    cursorId !== undefined &&
    (hasNoFilters(options) || isCategoryOnlyFilter(options));

  const col = sort + collate; // e.g. "title COLLATE NOCASE" or "first_publish_year"
  const dir = direction.toUpperCase() as "ASC" | "DESC";
  const op = direction === "asc" ? ">" : "<";

  /** Store the last item of a page as a position sample for future nearby seeks. */
  const recordSample = (pageItems: Book[]): void => {
    if (sort === "id" || !hasNoFilters(options) || pageItems.length === 0) return;
    const last = pageItems[pageItems.length - 1];
    const val = (last as unknown as Record<string, unknown>)[sort];
    if (val != null) storeSample(sort, direction, offset, val as string | number, last.id);
  };

  let items: Book[];
  if (sort === "id" && hasNoFilters(options)) {
    // For the PK column, cursorId IS the id — always use the simple range form.
    // Avoids the OR condition that the query planner may handle sub-optimally
    // when col = id and cursorVal = cursorId (the second branch is always false).
    if (direction === "asc") {
      const startId = hasCursor ? (cursorId as number) : offset;
      items = database
        .query(`${SELECT_COLS} WHERE id > ? ORDER BY id ASC LIMIT ?`)
        .all(startId, limit) as Book[];
    } else {
      const maxId = getMaxId();
      const startId = hasCursor ? (cursorId as number) : maxId - offset;
      items = database
        .query(`${SELECT_COLS} WHERE id < ? ORDER BY id DESC LIMIT ?`)
        .all(startId, limit) as Book[];
    }
  } else if (hasCursor) {
    // Two-pass keyset: avoids the OR condition that forces O(N) full index scans.
    //
    // SQLite cannot range-seek into an OR condition on the same column —
    //   WHERE (col > ? OR (col = ? AND id > ?))
    // — the planner falls back to a full index SCAN even with a NOCASE index.
    // Splitting into two simple range seeks fixes this:
    //   Pass 1: col = cursorVal AND id > cursorId → SEARCH (O(log N))
    //   Pass 2: col > cursorVal (or < for DESC)   → SEARCH (O(log N))
    //
    // When category-only filter is active, both queries include
    //   subject_category = ? as the leading condition, which lets SQLite use
    //   the composite index (subject_category, col, id) for O(log N) seeks
    //   through the filtered result set.
    // For category-filtered queries, subject_category = ? is placed first so
    // SQLite can use the leading column of (subject_category, col, id) for seek.
    const isFiltered = isCategoryOnlyFilter(options);
    const catPrefix = isFiltered ? `subject_category = ? AND ` : "";
    const catParam: (string | number)[] = isFiltered ? [options.category!] : [];

    const boundary = database
      .query(
        `${SELECT_COLS}
         WHERE ${catPrefix}${col} = ? AND id > ?
         ORDER BY id ASC
         LIMIT ?`,
      )
      .all(...catParam, cursorVal, cursorId, limit) as Book[];

    const afterCursor = database
      .query(
        `${SELECT_COLS}
         WHERE ${catPrefix}${col} ${op} ?
         ORDER BY ${col} ${dir}, id ASC
         LIMIT ?`,
      )
      .all(...catParam, cursorVal, limit) as Book[];

    // In both ASC and DESC order, boundary items (col = cursorVal, id > cursorId)
    // come directly after the cursor position, followed by afterCursor items.
    items = [...boundary, ...afterCursor].slice(0, limit);
    recordSample(items);
  } else {
    // General OFFSET fallback — check for a nearby position sample first to
    // reduce the effective OFFSET from millions to at most SAMPLE_MAX_DELTA rows.
    const sample =
      sort !== "id" && hasNoFilters(options)
        ? findSampleBefore(sort, direction, offset)
        : null;

    if (sample) {
      const delta = offset - sample.offset;
      // Strict inequality (no OR) — enables an O(log N) index range seek.
      // Items at the boundary (col = sample.val, id > sample.id) are skipped,
      // but duplicate sort values are rare in practice and the slight positional
      // inaccuracy is imperceptible at million-row depths.
      items = database
        .query(
          `${SELECT_COLS}
           WHERE ${col} ${op} ?
           ORDER BY ${col} ${dir}, id ASC
           LIMIT ? OFFSET ?`,
        )
        .all(sample.val, limit, delta) as Book[];
    } else {
      items = database
        .query(
          `${SELECT_COLS}${whereClause}
           ORDER BY ${col} ${dir}
           LIMIT ? OFFSET ?`,
        )
        .all(...whereParams, limit, offset) as Book[];
    }
    recordSample(items);
  }

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * GET /api/books/:id
 */
export function getBookById(id: number): Book | null {
  const database = getDb();
  const book = database
    .query(
      "SELECT id, key, title, author, first_publish_year, subject_category, subjects_json FROM books WHERE id = ?",
    )
    .get(id) as Book | null;
  return book;
}

/**
 * GET /api/books/categories
 *
 * Returns distinct subject_category values with counts, sorted by count descending.
 */
export function getCategories(): { category: string; count: number }[] {
  const database = getDb();
  return database
    .query(
      `SELECT subject_category as category, COUNT(*) as count
       FROM books
       GROUP BY subject_category
       ORDER BY count DESC`,
    )
    .all() as { category: string; count: number }[];
}

/**
 * GET /api/books/stats
 *
 * Aggregate statistics about the dataset.
 */
export function getStats(): BooksStatsResponse {
  const database = getDb();

  const total = getTotalCount();

  const categories = database
    .query(
      `SELECT subject_category as category, COUNT(*) as count
       FROM books GROUP BY subject_category ORDER BY count DESC`,
    )
    .all() as { category: string; count: number }[];

  const withAuthor = (
    database
      .query(
        "SELECT COUNT(*) as count FROM books WHERE author IS NOT NULL AND author != ''",
      )
      .get() as { count: number }
  ).count;

  const withYear = (
    database
      .query(
        "SELECT COUNT(*) as count FROM books WHERE first_publish_year IS NOT NULL",
      )
      .get() as { count: number }
  ).count;

  const yearRange = database
    .query(
      "SELECT MIN(first_publish_year) as min, MAX(first_publish_year) as max FROM books WHERE first_publish_year IS NOT NULL",
    )
    .get() as { min: number; max: number };

  return {
    total,
    categories,
    withAuthor,
    withYear,
    yearRange,
  };
}

/**
 * Parse query options from a URL.
 * Centralizes all param parsing so the router stays clean.
 */
export function parseQueryOptions(url: URL): QueryOptions & { delay: number } {
  const intParam = (
    name: string,
    defaultVal: number,
    min: number,
    max: number,
  ): number => {
    const raw = url.searchParams.get(name);
    if (raw === null) return defaultVal;
    const n = parseInt(raw, 10);
    if (isNaN(n)) return defaultVal;
    return Math.max(min, Math.min(max, n));
  };

  // Parse cursorVal: coerce to number when it looks numeric (year, id sorts)
  const rawCursorVal = url.searchParams.get("cursorVal");
  const cursorVal =
    rawCursorVal !== null
      ? isNaN(Number(rawCursorVal))
        ? rawCursorVal
        : Number(rawCursorVal)
      : undefined;

  const rawCursorId = url.searchParams.get("cursorId");
  const cursorId =
    rawCursorId !== null ? parseInt(rawCursorId, 10) || undefined : undefined;

  return {
    offset: intParam("offset", 0, 0, 100_000_000),
    limit: intParam("limit", DEFAULT_LIMIT, 1, MAX_LIMIT),
    sort: url.searchParams.get("sort") ?? "id",
    direction: url.searchParams.get("direction") ?? "asc",
    search: url.searchParams.get("search") ?? undefined,
    author: url.searchParams.get("author") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    minYear: intParam("minYear", 0, -5000, 9999),
    maxYear: intParam("maxYear", 0, -5000, 9999),
    delay: intParam("delay", 0, 0, 5000),
    cursorVal,
    cursorId,
  };
}
