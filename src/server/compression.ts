// src/server/compression.ts
// Response compression with pre-compressed file support and an LRU fallback.
//
// Priority:
//   1. Serve pre-compressed .br/.gz files (generated at build time — instant)
//   2. Fall back to synchronous compression with a bounded cache (slow first hit)

import { gzipSync, brotliCompressSync } from "zlib";
import { existsSync, readFileSync } from "fs";
import { resolve, join } from "path";

/** Convert a Node Buffer to an ArrayBuffer suitable for Response body. */
const toBodyInit = (buf: Buffer): ArrayBuffer =>
  buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength,
  ) as ArrayBuffer;

// =============================================================================
// Pre-compressed file cache
// =============================================================================
// Build artifacts (.br / .gz) are static — read once, serve forever.
// Maps absolute filesystem path → file contents (or null if missing).

const preCompressedCache = new Map<string, Buffer | null>();

function readPreCompressed(filePath: string): Buffer | null {
  if (preCompressedCache.has(filePath)) {
    return preCompressedCache.get(filePath)!;
  }

  let content: Buffer | null = null;
  if (existsSync(filePath)) {
    content = readFileSync(filePath);
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
  br?: Buffer;
  gzip?: Buffer;
  raw: Buffer;
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
    const content = readPreCompressed(filePath + ".br");
    if (content) {
      headers.set("Content-Encoding", "br");
      headers.set("Content-Length", content.length.toString());
      return new Response(toBodyInit(content), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }
  }

  // Fallback to gzip
  if (lowerEncoding.includes("gzip")) {
    const content = readPreCompressed(filePath + ".gz");
    if (content) {
      headers.set("Content-Encoding", "gzip");
      headers.set("Content-Length", content.length.toString());
      return new Response(toBodyInit(content), {
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
 * 2. Fall back to synchronous compression with a bounded cache
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

  // ── Slow path: compress on the fly with bounded cache ──
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

    // Cache by pathname — content is stable for server-rendered pages
    let cached = compressionCache.get(pathname);

    // Invalidate if the underlying content changed (e.g. hot-reload)
    if (cached && !cached.raw.equals(buffer)) {
      compressionCache.delete(pathname);
      cached = undefined;
    }

    if (!cached) {
      evictOldest();
      cached = { raw: buffer };
      compressionCache.set(pathname, cached);
    }

    const lowerEncoding = acceptEncoding.toLowerCase();
    const headers = new Headers(response.headers);
    headers.set("Vary", "Accept-Encoding");

    // Prefer brotli
    if (lowerEncoding.includes("br")) {
      if (!cached.br) cached.br = brotliCompressSync(buffer);
      headers.set("Content-Encoding", "br");
      headers.set("Content-Length", cached.br.length.toString());
      return new Response(toBodyInit(cached.br), {
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
      return new Response(toBodyInit(cached.gzip), {
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
