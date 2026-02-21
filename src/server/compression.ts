// src/server/compression.ts
// Response compression with brotli/gzip and an LRU cache.

import { gzipSync, brotliCompressSync } from "zlib";
import { createHash } from "crypto";

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

/**
 * Compress a response based on the Accept-Encoding header.
 * Prefers brotli over gzip. Uses an LRU cache to avoid re-compressing.
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
