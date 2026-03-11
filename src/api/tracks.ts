// src/api/tracks.ts
// Tracks API — paginated, sortable, filterable, searchable with full CRUD.
// Backed by SQLite (data/tracks.db), seeded from MongoDB.
//
// Endpoints:
//   GET    /api/tracks          — paginated list with sort, filter, search
//   GET    /api/tracks/:id      — single track by ID
//   POST   /api/tracks          — create new track
//   PUT    /api/tracks/:id      — update track
//   DELETE /api/tracks/:id      — delete track
//   GET    /api/tracks/countries — distinct country codes
//   GET    /api/tracks/decades  — distinct decades with counts
//   GET    /api/tracks/stats    — aggregate statistics

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { resolve } from "path";
import { existsSync } from "fs";

// =============================================================================
// Database Connection (singleton, read-write)
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../../data/tracks.db");

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    if (!existsSync(DB_PATH)) {
      throw new Error(
        "tracks.db not found. Run: bun run scripts/seed-tracks.ts",
      );
    }
    db = new Database(DB_PATH);
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA cache_size = -8000"); // 8 MB cache
    db.run("PRAGMA foreign_keys = ON");
  }
  return db;
}

// =============================================================================
// Types
// =============================================================================

export interface Track {
  id: number;
  mongo_id: string;
  title: string;
  artist: string;
  country: string | null;
  year: number | null;
  decade: number | null;
  category: string | null;
  duration: number | null;
  cover_url: string | null;
  cover_color: string | null;
  created_at: string;
}

export interface TrackInput {
  title: string;
  artist: string;
  country?: string | null;
  year?: number | null;
  decade?: number | null;
  category?: string | null;
  duration?: number | null;
}

export interface TracksResponse {
  items: Track[];
  total: number;
  hasMore: boolean;
}

export interface TracksStatsResponse {
  total: number;
  countries: number;
  decades: { decade: number; count: number }[];
  categories: { category: string; count: number }[];
  topArtists: { artist: string; count: number }[];
  yearRange: { min: number | null; max: number | null };
}

// =============================================================================
// Configuration
// =============================================================================

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

const SORTABLE_COLUMNS = new Set([
  "id",
  "title",
  "artist",
  "country",
  "year",
  "decade",
  "category",
  "duration",
  "created_at",
]);

const VALID_DIRECTIONS = new Set(["asc", "desc"]);

// =============================================================================
// Query Builders
// =============================================================================

interface QueryFilters {
  search?: string;
  country?: string;
  decade?: number;
  category?: string;
  artist?: string;
  minYear?: number;
  maxYear?: number;
}

interface QueryOptions extends QueryFilters {
  offset: number;
  limit: number;
  sort: string;
  direction: string;
}

/**
 * Build WHERE clause and params from filters.
 * Returns [clause, params] — clause includes leading WHERE if non-empty.
 */
function buildWhere(filters: QueryFilters): [string, SQLQueryBindings[]] {
  const conditions: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (filters.search) {
    conditions.push("(title LIKE ? OR artist LIKE ?)");
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters.country) {
    conditions.push("country = ?");
    params.push(filters.country);
  }

  if (filters.decade != null) {
    conditions.push("decade = ?");
    params.push(filters.decade);
  }

  if (filters.category) {
    conditions.push("category = ?");
    params.push(filters.category);
  }

  if (filters.artist) {
    conditions.push("artist LIKE ?");
    params.push(`%${filters.artist}%`);
  }

  if (filters.minYear != null && filters.minYear > 0) {
    conditions.push("year >= ?");
    params.push(filters.minYear);
  }

  if (filters.maxYear != null && filters.maxYear > 0) {
    conditions.push("year <= ?");
    params.push(filters.maxYear);
  }

  const clause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return [clause, params];
}

// =============================================================================
// API Functions - READ
// =============================================================================

/**
 * GET /api/tracks
 *
 * Query params:
 *   offset    — start index (default: 0)
 *   limit     — page size (default: 50, max: 200)
 *   sort      — column to sort by (default: "id")
 *   direction — "asc" or "desc" (default: "desc")
 *   search    — case-insensitive title/artist search
 *   country   — filter by country code
 *   decade    — filter by decade (e.g. 1960, 1970)
 *   category  — filter by category
 *   artist    — filter by artist name (partial match)
 *   minYear   — minimum year
 *   maxYear   — maximum year
 */
export function getTracks(options: QueryOptions): TracksResponse {
  const database = getDb();

  // Validate sort column (prevent SQL injection)
  const sort = SORTABLE_COLUMNS.has(options.sort) ? options.sort : "id";
  const direction = VALID_DIRECTIONS.has(options.direction)
    ? options.direction
    : "desc";

  const collate =
    sort === "title" || sort === "artist" ? " COLLATE NOCASE" : "";

  const [whereClause, whereParams] = buildWhere(options);

  // Count total matching rows
  const countRow = database
    .query(`SELECT COUNT(*) as count FROM tracks${whereClause}`)
    .get(...whereParams) as { count: number };

  const total = countRow.count;

  // Fetch page
  const offset = Math.max(0, options.offset);
  const limit = Math.min(Math.max(1, options.limit), MAX_LIMIT);

  const items = database
    .query(
      `SELECT id, mongo_id, title, artist, country, year, decade, category, duration, cover_url, cover_color, created_at
       FROM tracks${whereClause}
       ORDER BY ${sort}${collate} ${direction.toUpperCase()}
       LIMIT ? OFFSET ?`,
    )
    .all(...whereParams, limit, offset) as Track[];

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * GET /api/tracks/:id
 */
export function getTrackById(id: number): Track | null {
  const database = getDb();
  const track = database
    .query(
      `SELECT id, mongo_id, title, artist, country, year, decade, category, duration, cover_url, cover_color, created_at
       FROM tracks WHERE id = ?`,
    )
    .get(id) as Track | null;
  return track;
}

// =============================================================================
// API Functions - CREATE
// =============================================================================

/**
 * POST /api/tracks
 */
export function createTrack(input: TrackInput): Track {
  const database = getDb();

  // Generate a unique mongo_id (or use UUID)
  const mongo_id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const result = database
    .prepare(
      `INSERT INTO tracks (mongo_id, title, artist, country, year, decade, category, duration)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      mongo_id,
      input.title,
      input.artist,
      input.country ?? null,
      input.year ?? null,
      input.decade ?? null,
      input.category ?? null,
      input.duration ?? null,
    );

  const insertedId = Number(result.lastInsertRowid);

  // Return the created track
  const track = getTrackById(insertedId);
  if (!track) {
    throw new Error("Failed to retrieve created track");
  }

  return track;
}

// =============================================================================
// API Functions - UPDATE
// =============================================================================

/**
 * PUT /api/tracks/:id
 */
export function updateTrack(
  id: number,
  input: Partial<TrackInput>,
): Track | null {
  const database = getDb();

  // Check if track exists
  const existing = getTrackById(id);
  if (!existing) {
    return null;
  }

  // Build dynamic UPDATE query based on provided fields
  const updates: string[] = [];
  const params: SQLQueryBindings[] = [];

  if (input.title !== undefined) {
    updates.push("title = ?");
    params.push(input.title);
  }
  if (input.artist !== undefined) {
    updates.push("artist = ?");
    params.push(input.artist);
  }
  if (input.country !== undefined) {
    updates.push("country = ?");
    params.push(input.country);
  }
  if (input.year !== undefined) {
    updates.push("year = ?");
    params.push(input.year);
  }
  if (input.decade !== undefined) {
    updates.push("decade = ?");
    params.push(input.decade);
  }
  if (input.category !== undefined) {
    updates.push("category = ?");
    params.push(input.category);
  }
  if (input.duration !== undefined) {
    updates.push("duration = ?");
    params.push(input.duration);
  }
  if (updates.length === 0) {
    // No fields to update
    return existing;
  }

  params.push(id);

  database
    .prepare(`UPDATE tracks SET ${updates.join(", ")} WHERE id = ?`)
    .run(...params);

  // Return updated track
  return getTrackById(id);
}

// =============================================================================
// API Functions - DELETE
// =============================================================================

/**
 * DELETE /api/tracks/:id
 */
export function deleteTrack(id: number): boolean {
  const database = getDb();

  const result = database.prepare("DELETE FROM tracks WHERE id = ?").run(id);

  return result.changes > 0;
}

// =============================================================================
// API Functions - AGGREGATES
// =============================================================================

/**
 * GET /api/tracks/countries
 *
 * Returns distinct country codes with track counts.
 */
export function getCountries(): { code: string; count: number }[] {
  const database = getDb();
  return database
    .query(
      `SELECT country as code, COUNT(*) as count
       FROM tracks
       WHERE country IS NOT NULL
       GROUP BY country
       ORDER BY count DESC`,
    )
    .all() as { code: string; count: number }[];
}

/**
 * GET /api/tracks/decades
 *
 * Returns distinct decades with track counts.
 */
export function getDecades(): { decade: number; count: number }[] {
  const database = getDb();
  return database
    .query(
      `SELECT decade, COUNT(*) as count
       FROM tracks
       WHERE decade IS NOT NULL
       GROUP BY decade
       ORDER BY decade DESC`,
    )
    .all() as { decade: number; count: number }[];
}

/**
 * GET /api/tracks/categories
 *
 * Returns distinct categories with track counts.
 */
export function getCategories(): { category: string; count: number }[] {
  const database = getDb();
  return database
    .query(
      `SELECT category, COUNT(*) as count
       FROM tracks
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC`,
    )
    .all() as { category: string; count: number }[];
}

/**
 * GET /api/tracks/stats
 *
 * Aggregate statistics about the dataset.
 */
export function getStats(): TracksStatsResponse {
  const database = getDb();

  const total = (
    database.query("SELECT COUNT(*) as count FROM tracks").get() as {
      count: number;
    }
  ).count;

  const countries = (
    database
      .query(
        "SELECT COUNT(DISTINCT country) as count FROM tracks WHERE country IS NOT NULL",
      )
      .get() as { count: number }
  ).count;

  const decades = database
    .query(
      `SELECT decade, COUNT(*) as count
       FROM tracks
       WHERE decade IS NOT NULL
       GROUP BY decade
       ORDER BY decade DESC`,
    )
    .all() as { decade: number; count: number }[];

  const categories = database
    .query(
      `SELECT category, COUNT(*) as count
       FROM tracks
       WHERE category IS NOT NULL
       GROUP BY category
       ORDER BY count DESC
       LIMIT 10`,
    )
    .all() as { category: string; count: number }[];

  const topArtists = database
    .query(
      `SELECT artist, COUNT(*) as count
       FROM tracks
       GROUP BY artist
       ORDER BY count DESC
       LIMIT 10`,
    )
    .all() as { artist: string; count: number }[];

  const yearRange = database
    .query(
      "SELECT MIN(year) as min, MAX(year) as max FROM tracks WHERE year IS NOT NULL",
    )
    .get() as { min: number | null; max: number | null };

  return {
    total,
    countries,
    decades,
    categories,
    topArtists,
    yearRange,
  };
}

// =============================================================================
// Utility - Parse Query Options
// =============================================================================

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

  return {
    offset: intParam("offset", 0, 0, 1_000_000),
    limit: intParam("limit", DEFAULT_LIMIT, 1, MAX_LIMIT),
    sort: url.searchParams.get("sort") ?? "id",
    direction: url.searchParams.get("direction") ?? "desc",
    search: url.searchParams.get("search") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    decade: intParam("decade", 0, 1900, 2100) || undefined,
    category: url.searchParams.get("category") ?? undefined,
    artist: url.searchParams.get("artist") ?? undefined,
    minYear: intParam("minYear", 0, 1900, 2100) || undefined,
    maxYear: intParam("maxYear", 0, 1900, 2100) || undefined,
    delay: intParam("delay", 0, 0, 5000),
  };
}
