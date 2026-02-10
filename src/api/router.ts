// src/api/router.ts
// API router for vlist.dev — handles /api/* routes with CORS support

import { getUsers, getUserById, DEFAULT_TOTAL, MAX_LIMIT } from "./users";
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
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

// =============================================================================
// CORS
// =============================================================================

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (data: unknown, status: number = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
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
  const total = intParam(url, "total", DEFAULT_TOTAL, 1, 10_000_000);

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
  const total = intParam(url, "total", DEFAULT_TOTAL, 1, 10_000_000);

  await sleep(delay);

  const user = getUserById(id, total);
  if (!user) {
    return error("User not found", 404);
  }

  return json(user);
};

/**
 * GET /api/info
 *
 * Returns API metadata — available endpoints, defaults, limits.
 */
const handleInfo = (): Response =>
  json({
    name: "vlist.dev API",
    version: "0.1.0",
    description: "Deterministic user data API for vlist demos",
    endpoints: {
      "GET /api/users": {
        description: "Paginated user list",
        params: {
          offset: { type: "number", default: 0, min: 0, max: 10_000_000 },
          limit: { type: "number", default: 50, min: 1, max: MAX_LIMIT },
          delay: { type: "number", default: 0, min: 0, max: 5000, unit: "ms" },
          total: {
            type: "number",
            default: DEFAULT_TOTAL,
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
            default: DEFAULT_TOTAL,
            min: 1,
            max: 10_000_000,
          },
        },
        response: "User | { error: string }",
      },
      "GET /api/info": {
        description: "This endpoint — API metadata",
      },
    },
    defaults: {
      total: DEFAULT_TOTAL,
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
export const routeApi = async (req: Request): Promise<Response | null> => {
  const url = new URL(req.url);
  const path = url.pathname;

  // Only handle /api/* paths
  if (!path.startsWith("/api")) return null;

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Only allow GET
  if (req.method !== "GET") {
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

  return error("Not found", 404);
};
