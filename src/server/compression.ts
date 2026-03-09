// src/server/compression.ts
// Response compression — pre-compressed files and edge-aware strategy.
//
// Architecture:
//
//   Production (behind Cloudflare):
//     1. Pre-compressed .br/.gz files from /dist/ → served directly (zero CPU)
//     2. Everything else → sent uncompressed to Cloudflare, which compresses
//        at the edge and caches the result globally. This avoids wasting
//        origin CPU on brotli/gzip for content that Cloudflare will re-compress
//        anyway. Origin TTFB drops from ~20-40ms to ~1-2ms per response.
//
//   Development (no CDN):
//     1. Pre-compressed .br/.gz files from /dist/ → served directly
//     2. Everything else → gzip on the fly via Bun.gzipSync() (~1ms).
//        Brotli is skipped entirely — brotliCompressSync costs 20-40ms per
//        response and there's no edge cache to amortize it.
//     3. Compression results are cached by pathname with auto-invalidation
//        when file content changes, so hot-reload works correctly.
//
// compressResponse() returns Response | Promise<Response>:
//   - Sync (plain Response) for non-compressible, pre-compressed, and prod passthrough
//   - Async (Promise<Response>) only for dev on-the-fly gzip compression

import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { IS_PROD } from "./config";

// =============================================================================
// Pre-compressed file cache
// =============================================================================
// Build artifacts (.br / .gz) are static in production — read once, serve forever.
// In development, files are read fresh every time to avoid stale builds after
// rebuilding vlist or examples.

const preCompressedCache = new Map<string, Uint8Array | null>();

function readPreCompressed(filePath: string): Uint8Array | null {
  // In dev, always read from disk — cached .br/.gz go stale after rebuilds
  if (IS_PROD && preCompressedCache.has(filePath)) {
    return preCompressedCache.get(filePath)!;
  }

  let content: Uint8Array | null = null;
  if (existsSync(filePath)) {
    content = new Uint8Array(readFileSync(filePath));
  }

  if (IS_PROD) preCompressedCache.set(filePath, content);
  return content;
}

// =============================================================================
// Dev-only compression cache
// =============================================================================
// For dynamic responses (HTML pages, CSS) that don't have pre-compressed siblings.
// Keyed by pathname — content rarely changes unless files are edited.
// Only used in development; production delegates compression to Cloudflare.

interface CachedCompression {
  gzip: Uint8Array;
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
 * Matches any path that contains a /dist/ segment (e.g. /dist/*, /dist/benchmarks/*).
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
// Dev-only on-the-fly gzip compression (cached)
// =============================================================================

/**
 * Compress a response body with gzip on the fly, caching the result by pathname.
 * Only called in development — production skips this entirely.
 */
async function devCompressGzip(
  response: Response,
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

    let cached = compressionCache.get(pathname);

    // Invalidate if the underlying content changed (handles hot-reload)
    if (cached && !uint8Equals(cached.raw, raw)) {
      compressionCache.delete(pathname);
      cached = undefined;
    }

    if (!cached) {
      evictOldest();
      const gzip = Bun.gzipSync(raw);
      cached = { raw, gzip };
      compressionCache.set(pathname, cached);
    }

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
 * Production (behind Cloudflare):
 *   - Pre-compressed /dist/ files → served directly (sync, zero CPU)
 *   - Everything else → returned uncompressed. Cloudflare compresses at the
 *     edge with brotli/gzip and caches the result globally. This keeps origin
 *     TTFB at ~1-2ms instead of 20-40ms for brotli.
 *
 * Development (no CDN):
 *   - Pre-compressed /dist/ files → served directly (sync)
 *   - Everything else → gzip via Bun.gzipSync() with LRU cache (async, ~1ms)
 *
 * Returns sync (plain Response) for ~90% of production requests.
 * Returns async (Promise<Response>) only for dev gzip compression.
 */
export function compressResponse(
  response: Response,
  acceptEncoding: string | null,
  pathname: string,
): Response | Promise<Response> {
  const contentType = response.headers.get("Content-Type") || "";

  // Non-compressible content (images, fonts, etc.) — return as-is
  if (!shouldCompress(contentType)) return response;
  if (!acceptEncoding || response.headers.get("Content-Encoding")) {
    return response;
  }

  const encoding = parseEncoding(acceptEncoding);
  if (!encoding) return response;

  // Pre-compressed build output (.br/.gz siblings) — return sync, zero CPU
  const preCompressed = tryPreCompressed(response, encoding, pathname);
  if (preCompressed) return preCompressed;

  // ── Production: skip on-the-fly compression ──
  // Cloudflare compresses at the edge and caches the result. Doing it here
  // would waste 20-40ms of origin CPU per cold request for no benefit.
  if (IS_PROD) return response;

  // ── Development: gzip on the fly (Bun-native, ~1ms) ──
  // No CDN in front, so we need to compress for the browser.
  // Brotli is skipped — too slow without an edge cache to amortize it.
  if (encoding === "gzip" || encoding === "br") {
    // Use gzip for both — Bun.gzipSync is fast, brotliCompressSync is not
    return devCompressGzip(response, pathname);
  }

  return response;
}
