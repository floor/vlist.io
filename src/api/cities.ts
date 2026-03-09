// src/api/cities.ts
// Cities API — paginated, sortable, filterable, searchable.
// Backed by SQLite (data/cities.db), seeded from src/data/cities.js.
//
// Endpoints:
//   GET /api/cities          — paginated list with sort, filter, search
//   GET /api/cities/:id      — single city by ID
//   GET /api/cities/countries — distinct country codes
//   GET /api/cities/stats    — aggregate statistics

import { Database, type SQLQueryBindings } from "bun:sqlite";
import { resolve } from "path";
import { existsSync } from "fs";

// =============================================================================
// Database Connection (singleton, read-only)
// =============================================================================

const DB_PATH = resolve(import.meta.dir, "../../data/cities.db");

let db: Database | null = null;

function getDb(): Database {
  if (!db) {
    if (!existsSync(DB_PATH)) {
      throw new Error(
        "cities.db not found. Run: bun run scripts/seed-cities.ts",
      );
    }
    db = new Database(DB_PATH, { readonly: true });
    db.run("PRAGMA journal_mode = WAL");
    db.run("PRAGMA cache_size = -8000"); // 8 MB cache
  }
  return db;
}

// =============================================================================
// Types
// =============================================================================

export interface City {
  id: number;
  name: string;
  country_code: string;
  population: number;
  lat: number;
  lng: number;
  continent: string;
}

export interface CitiesResponse {
  items: City[];
  total: number;
  hasMore: boolean;
}

export interface CitiesStatsResponse {
  total: number;
  countries: number;
  continents: { continent: string; count: number }[];
  topCities: { name: string; country_code: string; population: number }[];
  populationRange: { min: number; max: number };
}

// =============================================================================
// Configuration
// =============================================================================

export const MAX_LIMIT = 200;
export const DEFAULT_LIMIT = 50;

const SORTABLE_COLUMNS = new Set([
  "id",
  "name",
  "country_code",
  "population",
  "lat",
  "lng",
  "continent",
]);

const VALID_DIRECTIONS = new Set(["asc", "desc"]);

// =============================================================================
// Query Builders
// =============================================================================

interface QueryFilters {
  search?: string;
  country?: string;
  continent?: string;
  minPop?: number;
  maxPop?: number;
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
    conditions.push("name LIKE ?");
    params.push(`%${filters.search}%`);
  }

  if (filters.country) {
    // Support comma-separated country codes: "FR,DE,US"
    const codes = filters.country
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (codes.length === 1) {
      conditions.push("country_code = ?");
      params.push(codes[0]);
    } else if (codes.length > 1) {
      const placeholders = codes.map(() => "?").join(", ");
      conditions.push(`country_code IN (${placeholders})`);
      params.push(...codes);
    }
  }

  if (filters.continent) {
    conditions.push("continent = ?");
    params.push(filters.continent);
  }

  if (filters.minPop != null && filters.minPop > 0) {
    conditions.push("population >= ?");
    params.push(filters.minPop);
  }

  if (filters.maxPop != null && filters.maxPop > 0) {
    conditions.push("population <= ?");
    params.push(filters.maxPop);
  }

  const clause =
    conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  return [clause, params];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * GET /api/cities
 *
 * Query params:
 *   offset    — start index (default: 0)
 *   limit     — page size (default: 50, max: 200)
 *   sort      — column to sort by (default: "population")
 *   direction — "asc" or "desc" (default: "desc")
 *   search    — case-insensitive name search (LIKE %term%)
 *   country   — filter by ISO country code(s), comma-separated (e.g. "FR" or "FR,DE,US")
 *   continent — filter by continent name (e.g. "Europe")
 *   minPop    — minimum population
 *   maxPop    — maximum population
 *   delay     — simulated latency in ms (default: 0, max: 5000)
 */
export function getCities(options: QueryOptions): CitiesResponse {
  const database = getDb();

  // Validate sort column (prevent SQL injection)
  const sort = SORTABLE_COLUMNS.has(options.sort) ? options.sort : "population";
  const direction = VALID_DIRECTIONS.has(options.direction)
    ? options.direction
    : "desc";

  const collate = sort === "name" ? " COLLATE NOCASE" : "";

  const [whereClause, whereParams] = buildWhere(options);

  // Count total matching rows
  const countRow = database
    .query(`SELECT COUNT(*) as count FROM cities${whereClause}`)
    .get(...whereParams) as { count: number };

  const total = countRow.count;

  // Fetch page
  const offset = Math.max(0, options.offset);
  const limit = Math.min(Math.max(1, options.limit), MAX_LIMIT);

  const items = database
    .query(
      `SELECT id, name, country_code, population, lat, lng, continent
       FROM cities${whereClause}
       ORDER BY ${sort}${collate} ${direction.toUpperCase()}
       LIMIT ? OFFSET ?`,
    )
    .all(...whereParams, limit, offset) as City[];

  return {
    items,
    total,
    hasMore: offset + limit < total,
  };
}

/**
 * GET /api/cities/:id
 */
export function getCityById(id: number): City | null {
  const database = getDb();
  const city = database
    .query(
      "SELECT id, name, country_code, population, lat, lng, continent FROM cities WHERE id = ?",
    )
    .get(id) as City | null;
  return city;
}

/**
 * GET /api/cities/countries
 *
 * Returns distinct country codes with city counts, sorted by count descending.
 */
export function getCountries(): { code: string; count: number }[] {
  const database = getDb();
  return database
    .query(
      `SELECT country_code as code, COUNT(*) as count
       FROM cities
       GROUP BY country_code
       ORDER BY count DESC`,
    )
    .all() as { code: string; count: number }[];
}

/**
 * GET /api/cities/continents
 *
 * Returns distinct continents with city counts.
 */
export function getContinents(): { continent: string; count: number }[] {
  const database = getDb();
  return database
    .query(
      `SELECT continent, COUNT(*) as count
       FROM cities
       GROUP BY continent
       ORDER BY count DESC`,
    )
    .all() as { continent: string; count: number }[];
}

/**
 * GET /api/cities/stats
 *
 * Aggregate statistics about the dataset.
 */
export function getStats(): CitiesStatsResponse {
  const database = getDb();

  const total = (
    database.query("SELECT COUNT(*) as count FROM cities").get() as {
      count: number;
    }
  ).count;

  const countries = (
    database
      .query("SELECT COUNT(DISTINCT country_code) as count FROM cities")
      .get() as { count: number }
  ).count;

  const continents = database
    .query(
      `SELECT continent, COUNT(*) as count
       FROM cities GROUP BY continent ORDER BY count DESC`,
    )
    .all() as { continent: string; count: number }[];

  const topCities = database
    .query(
      `SELECT name, country_code, population
       FROM cities ORDER BY population DESC LIMIT 10`,
    )
    .all() as { name: string; country_code: string; population: number }[];

  const popRange = database
    .query("SELECT MIN(population) as min, MAX(population) as max FROM cities")
    .get() as { min: number; max: number };

  return {
    total,
    countries,
    continents,
    topCities,
    populationRange: popRange,
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

  return {
    offset: intParam("offset", 0, 0, 1_000_000),
    limit: intParam("limit", DEFAULT_LIMIT, 1, MAX_LIMIT),
    sort: url.searchParams.get("sort") ?? "population",
    direction: url.searchParams.get("direction") ?? "desc",
    search: url.searchParams.get("search") ?? undefined,
    country: url.searchParams.get("country") ?? undefined,
    continent: url.searchParams.get("continent") ?? undefined,
    minPop: intParam("minPop", 0, 0, 100_000_000),
    maxPop: intParam("maxPop", 0, 0, 100_000_000),
    delay: intParam("delay", 0, 0, 5000),
  };
}
