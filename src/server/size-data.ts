// src/server/size-data.ts
// Reads size.json from the vlist package and replaces {{size:...}} placeholders
// in markdown strings with actual bundle-size values.

import { readFileSync } from "fs";
import { join } from "path";
import { VLIST_ROOT } from "./config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SizeEntry {
  minified: string;
  gzipped: string;
}

type SizeData = Record<string, SizeEntry>;

// ---------------------------------------------------------------------------
// Load & cache size data at module init
// ---------------------------------------------------------------------------

let sizeData: SizeData | null = null;

if (VLIST_ROOT) {
  const filePath = join(VLIST_ROOT, "dist", "size.json");
  try {
    sizeData = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    console.warn(`[size-data] Could not read ${filePath} — size placeholders will not be replaced.`);
  }
} else {
  console.warn("[size-data] VLIST_ROOT is not resolved — size placeholders will not be replaced.");
}

// ---------------------------------------------------------------------------
// Placeholder replacement
// ---------------------------------------------------------------------------

const SIZE_PLACEHOLDER_RE = /\{\{size:([^:}]+):([^}]+)\}\}/g;

/**
 * Replace `{{size:...}}` placeholders in a markdown string.
 *
 * Supported formats:
 *   {{size:base:min}}          → minified KB
 *   {{size:base:gz}}           → gzipped KB
 *   {{size:withGrid:delta}}    → feature gzipped minus base gzipped  (1 decimal)
 *   {{size:withGrid:delta-min}} → feature minified minus base minified (1 decimal)
 */
export function replaceSizePlaceholders(markdown: string): string {
  if (!sizeData) return markdown;

  return markdown.replace(SIZE_PLACEHOLDER_RE, (match, key: string, variant: string) => {
    const entry = sizeData![key];
    if (!entry) return match;

    switch (variant) {
      case "min":
        return entry.minified;
      case "gz":
        return entry.gzipped;
      case "delta": {
        const base = sizeData!.base;
        if (!base) return match;
        return (parseFloat(entry.gzipped) - parseFloat(base.gzipped)).toFixed(1);
      }
      case "delta-min": {
        const base = sizeData!.base;
        if (!base) return match;
        return (parseFloat(entry.minified) - parseFloat(base.minified)).toFixed(1);
      }
      default:
        return match;
    }
  });
}
