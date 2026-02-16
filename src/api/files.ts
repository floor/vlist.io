// src/api/files.ts
// File browser API — serves filesystem data for vlist and vlist.dev projects

import { readdir, stat } from "fs/promises";
import { join, resolve, relative, extname, basename } from "path";

// =============================================================================
// Configuration
// =============================================================================

// Base directory to browse (parent of vlist.dev, should contain vlist and vlist.dev)
const BASE_DIR = resolve(import.meta.dir, "../../..");
const ALLOWED_ROOTS = ["vlist", "vlist.dev"];

// Patterns to ignore when listing directories
const IGNORE_PATTERNS = [
  "node_modules",
  "dist",
  "build",
  ".git",
  ".turbo",
  ".next",
  "coverage",
  ".cache",
  "__pycache__",
];

// =============================================================================
// Types
// =============================================================================

export interface FileItem {
  name: string;
  type: "directory" | "file";
  size: number;
  modified: string; // ISO date string
  extension: string | null;
}

export interface DirectoryListing {
  path: string;
  items: FileItem[];
}

// =============================================================================
// Security & Validation
// =============================================================================

/**
 * Check if a path is within allowed directories.
 * Prevents directory traversal attacks and restricts browsing to ALLOWED_ROOTS.
 */
function isPathAllowed(requestedPath: string): boolean {
  const resolvedPath = resolve(BASE_DIR, requestedPath || "");
  const relativePath = relative(BASE_DIR, resolvedPath);

  // Check if path is within BASE_DIR
  if (
    relativePath.startsWith("..") ||
    resolve(BASE_DIR, relativePath) !== resolvedPath
  ) {
    return false;
  }

  // If at root, allow
  if (!relativePath || relativePath === ".") {
    return true;
  }

  // Check if path starts with an allowed root
  const firstSegment = relativePath.split("/")[0];
  return ALLOWED_ROOTS.includes(firstSegment);
}

/**
 * Check if an entry should be ignored based on patterns.
 */
function shouldIgnore(name: string): boolean {
  // Hidden files (starting with .)
  if (name.startsWith(".")) return true;

  // Ignore patterns
  if (IGNORE_PATTERNS.includes(name)) return true;

  return false;
}

// =============================================================================
// File System Operations
// =============================================================================

/**
 * Get file/directory metadata.
 */
async function getFileInfo(
  fullPath: string,
  name: string,
): Promise<FileItem | null> {
  try {
    const stats = await stat(fullPath);
    const ext = extname(name).slice(1); // Remove leading dot

    return {
      name: name || basename(fullPath),
      type: stats.isDirectory() ? "directory" : "file",
      size: stats.size,
      modified: stats.mtime.toISOString(),
      extension: ext || null,
    };
  } catch (error) {
    // File may have been deleted or is inaccessible
    return null;
  }
}

/**
 * List directory contents with security checks.
 */
export async function listDirectory(
  requestedPath: string,
): Promise<DirectoryListing> {
  // Security check
  if (!isPathAllowed(requestedPath)) {
    throw new Error("Access denied");
  }

  const fullPath = requestedPath ? resolve(BASE_DIR, requestedPath) : BASE_DIR;

  try {
    const entries = await readdir(fullPath);
    const items: FileItem[] = [];

    // If at root, only show allowed directories
    const entriesToProcess =
      !requestedPath || requestedPath === ""
        ? entries.filter((e) => ALLOWED_ROOTS.includes(e))
        : entries;

    for (const entry of entriesToProcess) {
      // Skip ignored patterns
      if (shouldIgnore(entry)) {
        continue;
      }

      const entryPath = join(fullPath, entry);
      const info = await getFileInfo(entryPath, entry);

      if (info) {
        items.push(info);
      }
    }

    // Sort: directories first, then alphabetically by name
    items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      }
      return a.type === "directory" ? -1 : 1;
    });

    return {
      path: requestedPath || "",
      items,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to read directory: ${message}`);
  }
}

/**
 * Get information about the file browser API.
 */
export function getFilesBrowserInfo() {
  return {
    baseDir: BASE_DIR,
    allowedRoots: ALLOWED_ROOTS,
    ignorePatterns: IGNORE_PATTERNS,
    description: "Browse vlist and vlist.dev project files",
  };
}
