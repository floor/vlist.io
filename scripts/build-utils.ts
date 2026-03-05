// scripts/build-utils.ts
// Shared build utilities used by examples/build.ts and benchmarks/build.ts.

import { readFileSync, writeFileSync } from "fs";
import { brotliCompressSync, gzipSync, constants } from "zlib";

// =============================================================================
// Compression
// =============================================================================

/**
 * Pre-compress a file with brotli and gzip, writing .br and .gz siblings.
 * This avoids expensive synchronous compression at serve time — the server's
 * fast-path picks up the pre-compressed files and serves them directly.
 *
 * Skips files smaller than 1 KB (compression overhead not worth it).
 */
export function preCompress(filePath: string): void {
  const raw = readFileSync(filePath);
  if (raw.length < 1024) return;

  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 6, // good balance of speed vs ratio
    },
  });
  writeFileSync(filePath + ".br", br);

  const gz = gzipSync(raw, { level: 6 });
  writeFileSync(filePath + ".gz", gz);
}

// =============================================================================
// Size reporting
// =============================================================================

/** Format a byte count as a KB string with one decimal place. */
export function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

/** Return the gzip-compressed size of a file in bytes. */
export function gzipSize(filePath: string): number {
  const raw = readFileSync(filePath);
  return Bun.gzipSync(new Uint8Array(raw)).byteLength;
}
