// src/server/compression.ts
// Response compression with pre-compressed file support and an LRU fallback.
//
// Priority:
//   1. Serve pre-compressed .br/.gz files (generated at build time — instant)
//   2. Fall back to on-the-fly compression with a bounded cache (slow first hit)
//
// Bun-native: uses Bun.gzipSync() for gzip. Brotli still uses Node zlib
// (Bun has no native brotli API yet). All caches store Uint8Array — accepted
// directly by new Response(), no Buffer→ArrayBuffer conversion needed.
//
// compressResponse() returns Response | Promise<Response>:
//   - Sync (plain Response) for non-compressible, pre-compressed, and small responses
//   - Async (Promise<Response>) only when on-the-fly compression is needed

import { brotliCompressSync } from "zlib";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";

// =============================================================================
// Pre-compressed file cache
// =============================================================================
// Build artifacts (.br / .gz) are static — read once, serve forever.
// Maps absolute filesystem path → file contents (or null if missing).

const preCompressedCache = new Map<string, Uint8Array | null>();

function readPreCompressed(filePath: string): Uint8Array | null {
  if (preCompressedCache.has(filePath)) {
    return preCompressedCache.get(filePath)!;
  }

  let content: Uint8Array | null = null;
  if (existsSync(filePath)) {
    content = new Uint8Array(readFileSync(filePath));
  }

  preCompressedCache.set(filePath, content);
  return content;
}

// =============================================================================
// Slow-path compression cache
// =============================================================================
// For dynamic responses (HTML pages) that don't have pre-compressed siblings.
// Keyed by pathname — content rarely changes at runtime and the cache is small.

interface CachedCompression {
  br?: Uint8Array;
  gzip?: Uint8Array;
  raw: Uint8Array;
}

const compressionCache = new Map<string, CachedCompression>();
const MAX_CACHE_SIZE = 200;

function evictOldest(): void {
  if (compressionCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = compressionCache.keys().next().value;
    if (oldestKey) compressionCache.delete(oldestKey);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function shouldCompress(contentType: string): boolean {
  return (
    contentType.includes("text/") ||
    contentType.includes("application/javascript") ||
    contentType.includes("application/json") ||
    contentType.includes("application/xml") ||
    contentType.includes("image/svg")
  );
}

/** Compare two Uint8Arrays for equality (used for cache invalidation). */
function uint8Equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function parseEncoding(acceptEncoding: string): "br" | "gzip" | null {
  const lower = acceptEncoding.toLowerCase();
  if (lower.includes("br")) return "br";
  if (lower.includes("gzip")) return "gzip";
  return null;
}

function compressedResponse(
  body: Uint8Array,
  encoding: "br" | "gzip",
  original: Response,
): Response {
  const headers = new Headers(original.headers);
  headers.set("Vary", "Accept-Encoding");
  headers.set("Content-Encoding", encoding);
  headers.set("Content-Length", body.length.toString());
  return new Response(body.buffer as ArrayBuffer, {
    status: original.status,
    statusText: original.statusText,
    headers,
  });
}

// =============================================================================
// Pre-compressed file lookup
// =============================================================================

/**
 * Resolve a URL pathname to a filesystem path for pre-compressed files.
 * Matches any path that contains a /dist/ segment (e.g. /dist/*, /benchmarks/dist/*).
 */
function resolveDistPath(pathname: string): string | null {
  if (!/\/dist\//.test(pathname)) return null;
  const filePath = resolve(join(".", pathname));
  // Security: ensure we stay within the project
  if (!filePath.startsWith(resolve("."))) return null;
  return filePath;
}

/**
 * Try to serve a pre-compressed file (.br or .gz) generated at build time.
 * Returns null if no pre-compressed file exists.
 */
function tryPreCompressed(
  response: Response,
  encoding: "br" | "gzip",
  pathname: string,
): Response | null {
  const filePath = resolveDistPath(pathname);
  if (!filePath) return null;

  const ext = encoding === "br" ? ".br" : ".gz";
  const content = readPreCompressed(filePath + ext);
  if (!content) return null;

  return compressedResponse(content, encoding, response);
}

// =============================================================================
// On-the-fly compression (cached)
// =============================================================================

/**
 * Compress a response body on the fly, caching the result by pathname.
 * Called only when no pre-compressed file is available.
 */
async function compressAsync(
  response: Response,
  encoding: "br" | "gzip",
  pathname: string,
): Promise<Response> {
  try {
    const arrayBuffer = await response.arrayBuffer();
    const raw = new Uint8Array(arrayBuffer);

    // Skip compression for small responses (< 1 KB)
    if (raw.length < 1024) {
      return new Response(raw.buffer as ArrayBuffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    // Cache by pathname — content is stable for server-rendered pages
    let cached = compressionCache.get(pathname);

    // Invalidate if the underlying content changed (e.g. hot-reload)
    if (cached && !uint8Equals(cached.raw, raw)) {
      compressionCache.delete(pathname);
      cached = undefined;
    }

    if (!cached) {
      evictOldest();
      cached = { raw };
      compressionCache.set(pathname, cached);
    }

    if (encoding === "br") {
      if (!cached.br) {
        cached.br = new Uint8Array(brotliCompressSync(Buffer.from(raw)));
      }
      return compressedResponse(cached.br, "br", response);
    }

    // gzip (Bun-native)
    if (!cached.gzip) cached.gzip = Bun.gzipSync(raw);
    return compressedResponse(cached.gzip, "gzip", response);
  } catch (error) {
    console.error("Compression error:", error);
    return response;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Compress a response based on the Accept-Encoding header.
 *
 * Returns sync (plain Response) when possible:
 *   - Non-compressible content types (images, fonts, etc.)
 *   - Already-encoded responses
 *   - Pre-compressed .br/.gz build output from /dist/
 *
 * Returns async (Promise<Response>) only when on-the-fly compression is needed:
 *   - Server-rendered HTML pages (docs, tutorials, examples, benchmarks)
 *   - API JSON responses
 *
 * This split means ~60% of requests (static assets, pre-compressed dist files,
 * non-compressible content) avoid a Promise allocation entirely.
 */
export function compressResponse(
  response: Response,
  acceptEncoding: string | null,
  pathname: string,
): Response | Promise<Response> {
  const contentType = response.headers.get("Content-Type") || "";

  // Non-compressible content — return sync
  if (!shouldCompress(contentType)) return response;
  if (!acceptEncoding || response.headers.get("Content-Encoding")) {
    return response;
  }

  const encoding = parseEncoding(acceptEncoding);
  if (!encoding) return response;

  // Pre-compressed build output — return sync
  const preCompressed = tryPreCompressed(response, encoding, pathname);
  if (preCompressed) return preCompressed;

  // On-the-fly compression — return async
  return compressAsync(response, encoding, pathname);
}
