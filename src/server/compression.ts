// src/server/compression.ts
// Response compression with pre-compressed file support and an LRU fallback.
//
// Priority:
//   1. Serve pre-compressed .br/.gz files (generated at build time — instant)
//   2. Fall back to synchronous compression with an LRU cache (slow first hit)

import { gzipSync, brotliCompressSync } from "zlib";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";

// =============================================================================
// Cache
// =============================================================================

interface CachedCompression {
  br?: Buffer;
  gzip?: Buffer;
  timestamp: number;
}

const compressionCache = new Map<string, CachedCompression>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 60_000; // 1 minute

function getCacheKey(pathname: string, contentHash: string): string {
  return `${pathname}:${contentHash}`;
}

function evictOldCache(): void {
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

// =============================================================================
// Public API
// =============================================================================

// =============================================================================
// Pre-compressed file lookup
// =============================================================================

/**
 * Resolve a URL pathname to a filesystem path for pre-compressed files.
 * Only works for /dist/* paths (build output).
 */
function resolveDistPath(pathname: string): string | null {
  if (!pathname.startsWith("/dist/")) return null;
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
  acceptEncoding: string,
  pathname: string,
): Response | null {
  const filePath = resolveDistPath(pathname);
  if (!filePath) return null;

  const lowerEncoding = acceptEncoding.toLowerCase();
  const headers = new Headers(response.headers);
  headers.set("Vary", "Accept-Encoding");

  // Prefer brotli
  if (lowerEncoding.includes("br")) {
    const brPath = filePath + ".br";
    if (existsSync(brPath)) {
      const content = readFileSync(brPath);
      headers.set("Content-Encoding", "br");
      headers.set("Content-Length", content.length.toString());
      return new Response(content, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }

  // Fallback to gzip
  if (lowerEncoding.includes("gzip")) {
    const gzPath = filePath + ".gz";
    if (existsSync(gzPath)) {
      const content = readFileSync(gzPath);
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", content.length.toString());
      return new Response(content, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }

  return null;
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Compress a response based on the Accept-Encoding header.
 *
 * 1. Try pre-compressed .br/.gz files (instant, generated at build time)
 * 2. Fall back to synchronous compression with an LRU cache
 *
 * Returns the original response unchanged for non-compressible content.
 */
export async function compressResponse(
  response: Response,
  acceptEncoding: string | null,
  pathname: string,
): Promise<Response> {
  const contentType = response.headers.get("Content-Type") || "";

  if (!shouldCompress(contentType)) return response;
  if (!acceptEncoding || response.headers.get("Content-Encoding")) {
    return response;
  }

  // ── Fast path: serve pre-compressed build output ──
  const preCompressed = tryPreCompressed(response, acceptEncoding, pathname);
  if (preCompressed) return preCompressed;

  // ── Slow path: compress on the fly with LRU cache ──
  try {
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Skip compression for small responses (< 1 KB)
    if (buffer.length < 1024) {
      return new Response(buffer, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    const contentHash = createHash("md5").update(buffer).digest("hex");
    const cacheKey = getCacheKey(pathname, contentHash);

    let cached = compressionCache.get(cacheKey);

    // Evict stale entry
    if (cached && Date.now() - cached.timestamp > CACHE_TTL) {
      compressionCache.delete(cacheKey);
      cached = undefined;
    }

    if (!cached) {
      evictOldCache();
      cached = { timestamp: Date.now() };
      compressionCache.set(cacheKey, cached);
    }

    const lowerEncoding = acceptEncoding.toLowerCase();
    const headers = new Headers(response.headers);
    headers.set("Vary", "Accept-Encoding");

    // Prefer brotli
    if (lowerEncoding.includes("br")) {
      if (!cached.br) cached.br = brotliCompressSync(buffer);
      headers.set("Content-Encoding", "br");
      headers.set("Content-Length", cached.br.length.toString());
      return new Response(cached.br, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // Fallback to gzip
    if (lowerEncoding.includes("gzip")) {
      if (!cached.gzip) cached.gzip = gzipSync(buffer);
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", cached.gzip.length.toString());
      return new Response(cached.gzip, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    // No supported encoding
    return new Response(buffer, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    console.error("Compression error:", error);
    return response;
  }
}
