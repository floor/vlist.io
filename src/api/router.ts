// src/api/router.ts
// API router for vlist.io — handles /api/* routes with CORS support

import { routeBenchmarks } from "./benchmarks";
import { CACHE_API, CACHE_API_DOCS, CACHE_API_MUTABLE } from "../server/cache";
import { getUsers, getUserById, TOTAL, MAX_LIMIT } from "./users";
import {
  getPosts,
  TOTAL as POSTS_TOTAL,
  MAX_LIMIT as POSTS_MAX_LIMIT,
} from "./posts";
import { getRecipes, getRecipeById } from "./recipes";
import { listDirectory, getFilesBrowserInfo } from "./files";
import { fetchFeed, feedSourceIds, REDDIT_PRESETS } from "./feed/index";
import type { FeedSourceId } from "./feed/index";
import {
  getCities,
  getCityById,
  getCountries,
  getContinents,
  getStats as getCitiesStats,
  parseQueryOptions as parseCitiesParams,
  MAX_LIMIT as CITIES_MAX_LIMIT,
  DEFAULT_LIMIT as CITIES_DEFAULT_LIMIT,
} from "./cities";
import {
  getBooks,
  getBookById,
  getCategories as getBookCategories,
  getStats as getBooksStats,
  parseQueryOptions as parseBooksParams,
} from "./books";
import {
  getTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  restoreTrack,
  getDeletedTracks,
  getCountries as getTrackCountries,
  getDecades,
  getCategories,
  getStats as getTracksStats,
  parseQueryOptions as parseTracksParams,
} from "./tracks";
import type { TrackInput } from "./tracks";
import { searchSite } from "../server/search";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

// =============================================================================
// API Docs Page
// =============================================================================

const API_DOCS_PATH = resolve(import.meta.dir, "../../api/index.html");
const API_DOCS_HTML = existsSync(API_DOCS_PATH)
  ? readFileSync(API_DOCS_PATH, "utf-8")
  : null;

const serveApiDocs = (): Response | null => {
  if (!API_DOCS_HTML) return null;
  return new Response(API_DOCS_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": CACHE_API_DOCS,
    },
  });
};

// =============================================================================
// CORS
// =============================================================================

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (
  data: unknown,
  status: number = 200,
  cache: string = CACHE_API,
): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache,
      ...CORS_HEADERS,
    },
  });

const error = (message: string, status: number = 400): Response =>
  json({ error: message }, status);

// =============================================================================
// Route Matching
// =============================================================================

/** Parse integer query param with bounds, returning defaultVal if missing/invalid */
const intParam = (
  url: URL,
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

/** Sleep for delay ms (resolves immediately if delay <= 0) */
const sleep = (ms: number): Promise<void> =>
  ms > 0
    ? new Promise((resolve) => setTimeout(resolve, ms))
    : Promise.resolve();

// =============================================================================
// Route Handlers
// =============================================================================

/**
 * GET /api/users?offset=0&limit=50&delay=0&total=1000000
 *
 * Query params:
 *   offset  — start index (default: 0, min: 0)
 *   limit   — page size (default: 50, min: 1, max: 200)
 *   delay   — simulated latency in ms (default: 0, min: 0, max: 5000)
 *   total   — total dataset size (default: 1_000_000, min: 1, max: 10_000_000)
 *
 * Response: { items: User[], total: number, hasMore: boolean }
 */
const handleGetUsers = async (url: URL): Promise<Response> => {
  const offset = intParam(url, "offset", 0, 0, 10_000_000);
  const limit = intParam(url, "limit", 50, 1, MAX_LIMIT);
  const delay = intParam(url, "delay", 0, 0, 5000);
  const total = intParam(url, "total", TOTAL, 1, 10_000_000);

  await sleep(delay);

  const result = getUsers(offset, limit, total);

  return json(result);
};

/**
 * GET /api/users/:id?delay=0&total=1000000
 *
 * Path params:
 *   id — user ID (1-based)
 *
 * Query params:
 *   delay — simulated latency in ms (default: 0)
 *   total — dataset size for bounds checking (default: 1_000_000)
 *
 * Response: User | { error: string }
 */
const handleGetUser = async (url: URL, id: number): Promise<Response> => {
  const delay = intParam(url, "delay", 0, 0, 5000);
  const total = intParam(url, "total", TOTAL, 1, 10_000_000);

  await sleep(delay);

  const user = getUserById(id, total);
  if (!user) {
    return error("User not found", 404);
  }

  return json(user);
};

/**
 * GET /api/files?path=<path>
 *
 * Query params:
 *   path — relative path from base directory (default: "")
 *
 * Response: { path: string, items: FileItem[] }
 */
const handleGetFiles = async (url: URL): Promise<Response> => {
  try {
    const requestedPath = url.searchParams.get("path") || "";
    const result = await listDirectory(requestedPath);
    return json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status = message.includes("Access denied") ? 403 : 500;
    return error(message, status);
  }
};

/**
 * GET /api/files/info
 *
 * Returns file browser configuration and allowed roots.
 */
const handleFilesInfo = (): Response => json(getFilesBrowserInfo());

/**
 * GET /api/posts?offset=0&limit=50&delay=0&total=5000
 *
 * Query params:
 *   offset  — start index (default: 0, min: 0)
 *   limit   — page size (default: 50, min: 1, max: 200)
 *   delay   — simulated latency in ms (default: 0, min: 0, max: 5000)
 *   total   — total dataset size (default: 5000, min: 1, max: 100_000)
 *
 * Response: { items: Post[], total: number, hasMore: boolean }
 */
const handleGetPosts = async (url: URL): Promise<Response> => {
  const offset = intParam(url, "offset", 0, 0, 100_000);
  const limit = intParam(url, "limit", 50, 1, POSTS_MAX_LIMIT);
  const delay = intParam(url, "delay", 0, 0, 5000);
  const total = intParam(url, "total", POSTS_TOTAL, 1, 100_000);

  await sleep(delay);

  const result = getPosts(offset, limit, total);

  return json(result);
};

/**
 * GET /api/feed?source=reddit&target=worldnews&limit=25&after=t3_xxx&delay=0
 *
 * Query params:
 *   source  — feed source id: "reddit" | "rss" (default: "reddit")
 *   target  — subreddit name (reddit) or feed URL (rss) (default: "worldnews")
 *   limit   — number of posts to return (default: 25, min: 1, max: 100)
 *   after   — pagination cursor from previous response (default: "")
 *   delay   — simulated latency in ms (default: 0, min: 0, max: 5000)
 *
 * Response: FeedResponse { posts, nextCursor, total, source, target }
 */
const handleGetFeed = async (url: URL): Promise<Response> => {
  const source = (url.searchParams.get("source") ?? "reddit") as FeedSourceId;
  const target = url.searchParams.get("target") ?? "worldnews";
  const limit = intParam(url, "limit", 25, 1, 100);
  const delay = intParam(url, "delay", 0, 0, 5000);
  const after = url.searchParams.get("after") ?? undefined;

  if (!feedSourceIds.includes(source)) {
    return error(
      `Unknown source "${source}". Valid sources: ${feedSourceIds.join(", ")}`,
      400,
    );
  }

  await sleep(delay);

  try {
    const result = await fetchFeed({ source, target, limit, after });
    return json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(`Feed fetch failed: ${message}`, 503);
  }
};

/**
 * GET /api/feed/presets
 *
 * Returns the curated list of available presets per source.
 * Response: { reddit: Array<{ label, value }> }
 */
const handleFeedPresets = (): Response =>
  json({
    reddit: REDDIT_PRESETS,
  });

/**
 * GET /api/recipes
 *
 * Returns all recipes.
 * Response: Recipe[]
 */
const handleGetRecipes = (): Response => json(getRecipes());

/**
 * GET /api/recipes/:id
 *
 * Path params:
 *   id — recipe ID (1-based)
 *
 * Response: Recipe | { error: string }
 */
const handleGetRecipe = (_url: URL, id: number): Response => {
  const recipe = getRecipeById(id);
  if (!recipe) {
    return error("Recipe not found", 404);
  }
  return json(recipe);
};

// =============================================================================
// Cities (SQLite-backed)
// =============================================================================

/**
 * GET /api/cities?offset=0&limit=50&sort=population&direction=desc&search=&country=&continent=&minPop=&maxPop=&delay=0
 *
 * Query params:
 *   offset    — start index (default: 0)
 *   limit     — page size (default: 50, min: 1, max: 200)
 *   sort      — column to sort by (default: "population")
 *   direction — "asc" or "desc" (default: "desc")
 *   search    — case-insensitive name search
 *   country   — ISO country code(s), comma-separated (e.g. "FR,DE,US")
 *   continent — continent name (e.g. "Europe")
 *   minPop    — minimum population filter
 *   maxPop    — maximum population filter
 *   delay     — simulated latency in ms (default: 0, max: 5000)
 *
 * Response: { items: City[], total: number, hasMore: boolean }
 */
const handleGetCities = async (url: URL): Promise<Response> => {
  const params = parseCitiesParams(url);
  await sleep(params.delay);

  try {
    const result = getCities(params);
    return json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/cities/:id
 *
 * Path params:
 *   id — city ID (1-based)
 *
 * Response: City | { error: string }
 */
const handleGetCity = (_url: URL, id: number): Response => {
  try {
    const city = getCityById(id);
    if (!city) return error("City not found", 404);
    return json(city);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/cities/countries
 *
 * Returns distinct country codes with city counts.
 * Response: Array<{ code: string, count: number }>
 */
const handleGetCountries = (): Response => {
  try {
    return json(getCountries());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/cities/continents
 *
 * Returns distinct continents with city counts.
 * Response: Array<{ continent: string, count: number }>
 */
const handleGetContinents = (): Response => {
  try {
    return json(getContinents());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/cities/stats
 *
 * Returns aggregate statistics.
 */
const handleGetCitiesStats = (): Response => {
  try {
    return json(getCitiesStats());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

// ── Books handlers ──────────────────────────────────────────────────────────

const handleGetBooks = async (url: URL): Promise<Response> => {
  const params = parseBooksParams(url);
  await sleep(params.delay);

  try {
    const result = getBooks(params);
    return json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

const handleGetBook = (_url: URL, id: number): Response => {
  try {
    const book = getBookById(id);
    if (!book) return error("Book not found", 404);
    return json(book);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

const handleGetBookCategories = (): Response => {
  try {
    return json(getBookCategories());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

const handleGetBooksStats = (): Response => {
  try {
    return json(getBooksStats());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

// =============================================================================
// Tracks (SQLite-backed with CRUD)
// =============================================================================

/**
 * GET /api/tracks?offset=0&limit=50&sort=id&direction=desc&search=&country=&decade=&category=&artist=&minYear=&maxYear=&delay=0
 *
 * Query params:
 *   offset    — start index (default: 0)
 *   limit     — page size (default: 50, min: 1, max: 200)
 *   sort      — column to sort by (default: "id")
 *   direction — "asc" or "desc" (default: "desc")
 *   search    — case-insensitive title/artist search
 *   country   — country code filter
 *   decade    — decade filter (e.g. 1960, 1970)
 *   category  — category filter
 *   artist    — artist name filter (partial match)
 *   minYear   — minimum year filter
 *   maxYear   — maximum year filter
 *   delay     — simulated latency in ms (default: 0, max: 5000)
 *
 * Response: { items: Track[], total: number, hasMore: boolean }
 */
const handleGetTracks = async (url: URL, delay: number): Promise<Response> => {
  const params = parseTracksParams(url);
  await sleep(delay);

  try {
    const result = getTracks(params);
    return json(result, 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/tracks/:id
 *
 * Path params:
 *   id — track ID (1-based)
 *
 * Response: Track | { error: string }
 */
const handleGetTrack = (_url: URL, id: number): Response => {
  try {
    const track = getTrackById(id);
    if (!track) return error("Track not found", 404);
    return json(track, 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * POST /api/tracks
 *
 * Body: TrackInput (JSON)
 *
 * Response: Track | { error: string }
 */
const handleCreateTrack = async (req: Request): Promise<Response> => {
  try {
    const body = (await req.json()) as TrackInput;

    // Validate required fields
    if (!body.title || !body.artist) {
      return error("Title and artist are required", 400);
    }

    const track = createTrack(body);
    return json(track, 201, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    return error(message, 400);
  }
};

/**
 * PUT /api/tracks/:id
 *
 * Path params:
 *   id — track ID
 *
 * Body: Partial<TrackInput> (JSON)
 *
 * Response: Track | { error: string }
 */
const handleUpdateTrack = async (
  req: Request,
  id: number,
): Promise<Response> => {
  try {
    const body = (await req.json()) as Partial<TrackInput>;

    const track = updateTrack(id, body);
    if (!track) return error("Track not found", 404);

    return json(track, 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON";
    return error(message, 400);
  }
};

/**
 * DELETE /api/tracks/:id
 *
 * Path params:
 *   id — track ID
 *
 * Response: { success: true } | { error: string }
 */
const handleDeleteTrack = (id: number): Response => {
  try {
    const deleted = deleteTrack(id);
    if (!deleted) return error("Track not found", 404);

    return json({ success: true }, 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * PATCH /api/tracks/:id/restore
 *
 * Restores a soft-deleted track. Returns the restored track.
 */
const handleRestoreTrack = (id: number): Response => {
  try {
    const track = restoreTrack(id);
    if (!track) return error("Track not found or not deleted", 404);

    return json(track, 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/tracks/countries
 *
 * Returns distinct country codes with track counts.
 * Response: Array<{ code: string, count: number }>
 */
const handleGetTrackCountries = (): Response => {
  try {
    return json(getTrackCountries(), 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/tracks/decades
 *
 * Returns distinct decades with track counts.
 * Response: Array<{ decade: number, count: number }>
 */
const handleGetDecades = (): Response => {
  try {
    return json(getDecades(), 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/tracks/categories
 *
 * Returns distinct categories with track counts.
 * Response: Array<{ category: string, count: number }>
 */
const handleGetTrackCategories = (): Response => {
  try {
    return json(getCategories(), 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

/**
 * GET /api/tracks/stats
 *
 * Returns aggregate statistics.
 */
const handleGetTracksStats = (): Response => {
  try {
    return json(getTracksStats(), 200, CACHE_API_MUTABLE);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return error(message, 500);
  }
};

// GET /api/search?q=...&limit=...
const handleSearch = (url: URL) => {
  const q = url.searchParams.get("q") || "";
  const limit = intParam(url, "limit", 10, 1, 50);
  const results = searchSite(q, limit);
  return json({ query: q, results });
};

/**
 * GET /api/info
 *
 * Returns API metadata — available endpoints, defaults, limits.
 */
const handleInfo = (): Response =>
  json({
    name: "vlist.io API",
    version: "0.1.0",
    description: "Deterministic user data API for vlist demos",
    endpoints: {
      "GET /api/posts": {
        description: "Paginated social feed posts (deterministic)",
        params: {
          offset: { type: "number", default: 0, min: 0, max: 100_000 },
          limit: {
            type: "number",
            default: 50,
            min: 1,
            max: POSTS_MAX_LIMIT,
          },
          delay: { type: "number", default: 0, min: 0, max: 5000, unit: "ms" },
          total: {
            type: "number",
            default: POSTS_TOTAL,
            min: 1,
            max: 100_000,
          },
        },
        response: "{ items: Post[], total: number, hasMore: boolean }",
      },
      "GET /api/feed": {
        description: "Live social feed from external sources",
        params: {
          source: { type: "string", default: "reddit", enum: feedSourceIds },
          target: {
            type: "string",
            default: "worldnews",
            description: "Subreddit (reddit) or feed URL (rss)",
          },
          limit: { type: "number", default: 25, min: 1, max: 100 },
          after: {
            type: "string",
            default: "",
            description: "Pagination cursor",
          },
          delay: { type: "number", default: 0, min: 0, max: 5000, unit: "ms" },
        },
        response:
          "{ posts: FeedPost[], nextCursor: string | null, total: number | null, source: string, target: string }",
      },
      "GET /api/feed/presets": {
        description: "Curated list of presets per source",
        response: "{ reddit: Array<{ label, value }> }",
      },
      "GET /api/users": {
        description: "Paginated user list",
        params: {
          offset: { type: "number", default: 0, min: 0, max: 10_000_000 },
          limit: { type: "number", default: 50, min: 1, max: MAX_LIMIT },
          delay: { type: "number", default: 0, min: 0, max: 5000, unit: "ms" },
          total: {
            type: "number",
            default: TOTAL,
            min: 1,
            max: 10_000_000,
          },
        },
        response: "{ items: User[], total: number, hasMore: boolean }",
      },
      "GET /api/users/:id": {
        description: "Single user by ID (1-based)",
        params: {
          delay: { type: "number", default: 0, min: 0, max: 5000, unit: "ms" },
          total: {
            type: "number",
            default: TOTAL,
            min: 1,
            max: 10_000_000,
          },
        },
        response: "User | { error: string }",
      },
      "GET /api/files": {
        description: "List directory contents",
        params: {
          path: {
            type: "string",
            default: "",
            description: "Relative path from base directory",
          },
        },
        response: "{ path: string, items: FileItem[] }",
      },
      "GET /api/recipes": {
        description: "All recipe cards",
        response: "Recipe[]",
      },
      "GET /api/recipes/:id": {
        description: "Single recipe by ID (1-based)",
        response: "Recipe | { error: string }",
      },
      "GET /api/files/info": {
        description: "File browser configuration",
      },
      "GET /api/info": {
        description: "This endpoint — API metadata",
      },
      "GET /api/cities": {
        description: "Paginated city list (SQLite-backed, 33K real cities)",
        params: {
          offset: { type: "number", default: 0, min: 0, max: 1_000_000 },
          limit: {
            type: "number",
            default: CITIES_DEFAULT_LIMIT,
            min: 1,
            max: CITIES_MAX_LIMIT,
          },
          sort: {
            type: "string",
            default: "population",
            enum: [
              "id",
              "name",
              "country_code",
              "population",
              "lat",
              "lng",
              "continent",
            ],
          },
          direction: { type: "string", default: "desc", enum: ["asc", "desc"] },
          search: {
            type: "string",
            default: "",
            description: "Case-insensitive name search",
          },
          country: {
            type: "string",
            default: "",
            description: "ISO country code(s), comma-separated",
          },
          continent: {
            type: "string",
            default: "",
            description: "Continent name filter",
          },
          minPop: {
            type: "number",
            default: 0,
            description: "Minimum population",
          },
          maxPop: {
            type: "number",
            default: 0,
            description: "Maximum population",
          },
          delay: { type: "number", default: 0, min: 0, max: 5000, unit: "ms" },
        },
        response: "{ items: City[], total: number, hasMore: boolean }",
      },
      "GET /api/cities/:id": {
        description: "Single city by ID",
        response: "City | { error: string }",
      },
      "GET /api/cities/countries": {
        description: "Distinct country codes with city counts",
        response: "Array<{ code: string, count: number }>",
      },
      "GET /api/cities/continents": {
        description: "Distinct continents with city counts",
        response: "Array<{ continent: string, count: number }>",
      },
      "GET /api/cities/stats": {
        description: "Aggregate statistics about the cities dataset",
        response: "CitiesStatsResponse",
      },
    },
    defaults: {
      total: TOTAL,
      limit: 50,
      maxLimit: MAX_LIMIT,
    },
  });

// =============================================================================
// Router
// =============================================================================

// Match /api/users/:id where :id is a positive integer
const USER_BY_ID = /^\/api\/users\/(\d+)$/;

/**
 * Route an API request.
 * Returns a Response if the path matches /api/*, or null to fall through to static serving.
 */
export const routeApi = async (
  req: Request,
  url: URL,
): Promise<Response | null> => {
  const path = url.pathname;

  // Only handle /api/* paths
  if (!path.startsWith("/api")) return null;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Benchmarks API (supports GET + POST, has its own method handling)
  if (path.startsWith("/api/benchmarks")) {
    const benchResponse = await routeBenchmarks(req, url);
    if (benchResponse) return benchResponse;
  }

  // Allow GET, POST, PUT, PATCH, DELETE for tracks API
  const isMutationMethod =
    req.method === "POST" || req.method === "PUT" || req.method === "PATCH" || req.method === "DELETE";
  const isTracksPath = path.startsWith("/api/tracks");

  if (!isTracksPath && req.method !== "GET") {
    return error("Method not allowed", 405);
  }

  if (isMutationMethod && !isTracksPath) {
    return error("Method not allowed", 405);
  }

  // /api or /api/ → serve HTML docs page (fall through to static if missing)
  if (path === "/api" || path === "/api/") {
    return serveApiDocs();
  }

  // GET /api/info → JSON metadata
  if (path === "/api/info") {
    return handleInfo();
  }

  // GET /api/search
  if (path === "/api/search" || path === "/api/search/") {
    return handleSearch(url);
  }

  // GET /api/users
  if (path === "/api/users" || path === "/api/users/") {
    return handleGetUsers(url);
  }

  // GET /api/users/:id
  const match = path.match(USER_BY_ID);
  if (match) {
    const id = parseInt(match[1], 10);
    return handleGetUser(url, id);
  }

  // GET /api/posts
  if (path === "/api/posts" || path === "/api/posts/") {
    return handleGetPosts(url);
  }

  // GET /api/feed/presets
  if (path === "/api/feed/presets") {
    return handleFeedPresets();
  }

  // GET /api/feed
  if (path === "/api/feed" || path === "/api/feed/") {
    return handleGetFeed(url);
  }

  // GET /api/recipes/:id
  const recipeMatch = path.match(/^\/api\/recipes\/(\d+)$/);
  if (recipeMatch) {
    const id = parseInt(recipeMatch[1], 10);
    return handleGetRecipe(url, id);
  }

  // GET /api/recipes
  if (path === "/api/recipes" || path === "/api/recipes/") {
    return handleGetRecipes();
  }

  // GET /api/files/info
  if (path === "/api/files/info") {
    return handleFilesInfo();
  }

  // GET /api/files
  if (path === "/api/files" || path === "/api/files/") {
    return handleGetFiles(url);
  }

  // GET /api/cities/countries
  if (path === "/api/cities/countries") {
    return handleGetCountries();
  }

  // GET /api/cities/continents
  if (path === "/api/cities/continents") {
    return handleGetContinents();
  }

  // GET /api/cities/stats
  if (path === "/api/cities/stats") {
    return handleGetCitiesStats();
  }

  // GET /api/cities/:id
  const cityMatch = path.match(/^\/api\/cities\/(\d+)$/);
  if (cityMatch) {
    const id = parseInt(cityMatch[1], 10);
    return handleGetCity(url, id);
  }

  // GET /api/cities
  if (path === "/api/cities" || path === "/api/cities/") {
    return handleGetCities(url);
  }

  // GET /api/books/categories
  if (path === "/api/books/categories") {
    return handleGetBookCategories();
  }

  // GET /api/books/stats
  if (path === "/api/books/stats") {
    return handleGetBooksStats();
  }

  // GET /api/books/:id
  const bookMatch = path.match(/^\/api\/books\/(\d+)$/);
  if (bookMatch) {
    const id = parseInt(bookMatch[1], 10);
    return handleGetBook(url, id);
  }

  // GET /api/books
  if (path === "/api/books" || path === "/api/books/") {
    return handleGetBooks(url);
  }

  // GET /api/tracks/deleted
  if (path === "/api/tracks/deleted" && req.method === "GET") {
    try {
      return json(getDeletedTracks());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return error(message, 500);
    }
  }

  // GET /api/tracks/countries
  if (path === "/api/tracks/countries") {
    return handleGetTrackCountries();
  }

  // GET /api/tracks/decades
  if (path === "/api/tracks/decades") {
    return handleGetDecades();
  }

  // GET /api/tracks/categories
  if (path === "/api/tracks/categories") {
    return handleGetTrackCategories();
  }

  // GET /api/tracks/stats
  if (path === "/api/tracks/stats") {
    return handleGetTracksStats();
  }

  // PATCH /api/tracks/:id/restore
  const restoreMatch = path.match(/^\/api\/tracks\/(\d+)\/restore$/);
  if (restoreMatch && req.method === "PATCH") {
    const id = parseInt(restoreMatch[1], 10);
    return handleRestoreTrack(id);
  }

  // GET /api/tracks/:id
  // PUT /api/tracks/:id
  // DELETE /api/tracks/:id
  const trackMatch = path.match(/^\/api\/tracks\/(\d+)$/);
  if (trackMatch) {
    const id = parseInt(trackMatch[1], 10);
    if (req.method === "GET") {
      return handleGetTrack(url, id);
    } else if (req.method === "PUT") {
      return handleUpdateTrack(req, id);
    } else if (req.method === "DELETE") {
      return handleDeleteTrack(id);
    }
  }

  // GET /api/tracks
  // POST /api/tracks
  if (path === "/api/tracks" || path === "/api/tracks/") {
    if (req.method === "GET") {
      const delay = intParam(url, "delay", 0, 0, 5000);
      return handleGetTracks(url, delay);
    } else if (req.method === "POST") {
      return handleCreateTrack(req);
    }
  }

  return error("Not found", 404);
};
