# vlist.dev — Server Optimization Plan

> Migrate the Bun HTTP server from Node.js-compatible patterns to Bun-native APIs
> for zero-copy file serving, faster compression, reduced allocations, and cached rendering.
>
> **Status: ✅ All 8 phases complete**
>
> Implemented on branch `refactor/server`.

---

## Table of Contents

> **Note:** Phases 1–8 were completed in commit `5b6fb15`. Phase 9 was completed
> in commit `e05597f` after profiling revealed that on-the-fly brotli compression
> and eagerly-loaded highlight.js were the main remaining bottlenecks.

- [Architecture Context](#architecture-context)
- [Current State](#current-state)
- [Issue Inventory](#issue-inventory)
- [Phase 1 — Static file serving with `Bun.file()`](#phase-1--static-file-serving-with-bunfile) ✅
- [Phase 2 — Native compression](#phase-2--native-compression) ✅
- [Phase 3 — Rendered page cache](#phase-3--rendered-page-cache) ✅
- [Phase 4 — Eliminate redundant allocations](#phase-4--eliminate-redundant-allocations) ✅
- [Phase 5 — Startup optimization](#phase-5--startup-optimization) ✅
- [Phase 6 — PM2 multi-instance](#phase-6--pm2-multi-instance) ✅
- [Phase 7 — Cloudflare CDN edge caching](#phase-7--cloudflare-cdn-edge-caching) ✅
- [Phase 8 — Dev cache staleness fix](#phase-8--dev-cache-staleness-fix) ✅
- [Deferred Items](#deferred-items)
- [Per-File Impact Summary](#per-file-impact-summary)
- [Testing & Verification](#testing--verification)

---

## Architecture Context

### Server Stack

The server is a single `Bun.serve()` process running behind PM2 in fork mode. It serves a documentation site with:

- **Server-rendered pages** — Markdown parsed with `marked`, assembled with Eta templates
- **Static assets** — CSS, JS, fonts, images, favicons
- **Pre-compressed build output** — `.br`/`.gz` siblings generated at build time in `/dist/`
- **API routes** — deterministic data endpoints for live examples (users, posts, feed, files, recipes)

### Request Flow

```
Client
  → Cloudflare CDN    (edge cache, TLS, brotli, DDoS protection)
  → origin server     (Bun on port 3338, only on cache MISS)
     → router.ts         (parse URL, match route)
     → renderer/*.ts     (server-render HTML pages)
        OR static.ts     (serve files from disk)
        OR api/router.ts (JSON API responses)
     → compression.ts    (compress response)
  → Response
```

### What Bun.serve() Already Provides

- Native HTTP server with `reusePort: true` (SO_REUSEPORT kernel load balancing)
- Direct `fetch` handler — no Express/Koa overhead
- Native TypeScript execution — no transpile step
- PM2 `wait_ready` integration via `process.send("ready")`

### The Problem

The server is written as a **Node.js-compatible application that happens to run on Bun**. It uses `fs.readFileSync`, `fs.existsSync`, `fs.statSync`, `zlib.gzipSync`, `zlib.brotliCompressSync`, and `Buffer` throughout — missing Bun's purpose-built APIs that provide zero-copy I/O, faster compression, and fewer allocations.

---

## Current State (Resolved)

### Node.js APIs — ✅ Migrated to Bun-native

| File | Before | After | Phase |
|------|--------|-------|-------|
| `static.ts` | `readFileSync` → `Buffer` → `Response` | `Bun.file()` → zero-copy `sendfile(2)` | 1 |
| `compression.ts` | `zlib.gzipSync` + `Buffer` → `ArrayBuffer` | `Bun.gzipSync()` + `Uint8Array` directly | 2 |
| `compression.ts` | `readFileSync` for `.br`/`.gz` cache | `readFileSync` → `Uint8Array` (cached, runs once per path) | 1 |
| `renderers/base.ts` | `readFileSync` for shells/navigation | Unchanged — cached at startup, runs once | — |
| `renderers/content.ts` | `readFileSync` for markdown on every request | Unchanged — but final HTML now cached per slug | 3 |
| `config.ts` | `existsSync`, `realpathSync` | Unchanged — runs once at startup | — |

**Remaining Node.js API:** `zlib.brotliCompressSync` — Bun has no native brotli yet. Tracked in [Deferred Items](#deferred-items).

### Allocation Issues — ✅ Resolved

| Location | Before | After | Phase |
|----------|--------|-------|-------|
| `router.ts` | `new URL(req.url)` on every request | Single parse, `URL` object passed to all sub-routers | 4 |
| `api/router.ts` | Second `new URL(req.url)` | Accepts pre-parsed `URL` parameter | 4 |
| `renderers/benchmarks.ts` | Two `new URL(url)` for same string | Uses `url.searchParams` and `url.search` directly | 4 |
| `router.ts` | `async handleRequest` for all routes | Sync for ~90% of traffic, async only for `/api/*` | 4 |
| `compression.ts` | `async` always, `Buffer` → `ArrayBuffer` slice | Sync for non-compressible + pre-compressed; `Uint8Array` throughout | 2, 4 |

### Missing Caches — ✅ Resolved

| Location | Before | After | Phase |
|----------|--------|-------|-------|
| `renderers/content.ts` | Markdown parsed + HTML assembled per request | Final HTML cached per slug in `Map<string, string>` | 3 |
| `renderers/examples.ts` | `readFileSync` + source tabs per request | Final HTML cached per `slug::variant` | 3 |
| `renderers/benchmarks.ts` | Page assembly per request | Final HTML cached per `slug::variant` | 3 |
| `renderers/homepage.ts` | Eta render per request | Final HTML cached (single page) | 3 |

### Startup Cost — ✅ Resolved

| Location | Before | After | Phase |
|----------|--------|-------|-------|
| `sitemap.ts` | ~40 `execSync("git log ...")` → **1,289ms** | Single batched `git log` → **148ms** (8.7× faster) | 5 |

---

## Issue Inventory

| # | Priority | Issue | Impact | Effort |
|---|----------|-------|--------|--------|
| 1 | 🔴 High | Static files use `readFileSync` instead of `Bun.file()` | Zero-copy `sendfile()` for all static assets | Low |
| 2 | 🔴 High | Compression uses Node `zlib` instead of `Bun.gzipSync()` | Faster gzip, no Buffer conversion | Low |
| 3 | 🟠 Med | Rendered markdown/HTML pages not cached | Re-parses markdown on every hit | Low |
| 4 | 🟠 Med | Double `new URL()` parsing per request | Redundant object allocation | Low |
| 5 | 🟠 Med | `handleRequest` is async for all routes | Promise allocation on synchronous paths | Low |
| 6 | 🟡 Low | ~40 `execSync` git commands at startup | Slow startup (~1s vs ~100ms) | Medium |
| 7 | 🟢 Nice | PM2 runs single instance despite `reusePort` | No multi-core utilization | Trivial |
| 8 | 🟠 Med | No CDN — all requests hit origin directly | Global latency, origin load, no edge caching | Low |

---

## Phase 1 — Static file serving with `Bun.file()` ✅

**Goal:** Replace `existsSync` → `statSync` → `readFileSync` → `new Response(Buffer)` with `Bun.file()` → `new Response(BunFile)` for zero-copy static file serving.

**Why it matters:** `Bun.file()` returns a `BunFile` (a `Blob` subclass). When passed to `new Response()`, Bun uses the `sendfile(2)` syscall on Linux — the kernel transfers bytes directly from the file descriptor to the socket without ever copying data into JavaScript heap memory. This is the single biggest optimization available.

### 1.1 Rewrite `serveFile` in `static.ts`

**Before:**

```ts
import { existsSync, statSync, readFileSync } from "fs";

export const serveFile = (filePath: string, pathname: string): Response | null => {
  if (!existsSync(filePath)) return null;
  const stat = statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (existsSync(indexPath)) filePath = indexPath;
    else return null;
  }
  try {
    const content = readFileSync(filePath);
    return new Response(content, {
      headers: {
        "Content-Type": getMimeType(filePath),
        "Cache-Control": getCacheControl(pathname),
      },
    });
  } catch { return null; }
};
```

**After:**

```ts
import { existsSync, statSync } from "fs";

export const serveFile = (filePath: string, pathname: string): Response | null => {
  if (!existsSync(filePath)) return null;
  const stat = statSync(filePath);
  if (stat.isDirectory()) {
    const indexPath = join(filePath, "index.html");
    if (!existsSync(indexPath)) return null;
    filePath = indexPath;
  }

  // Bun.file() is lazy — no disk read until the Response is consumed.
  // Bun uses sendfile(2) to transfer directly from fd to socket (zero-copy).
  const file = Bun.file(filePath);

  return new Response(file, {
    headers: {
      "Content-Type": getMimeType(filePath),
      "Cache-Control": getCacheControl(pathname),
    },
  });
};
```

**Notes:**
- `Bun.file()` auto-detects MIME types via `file.type`, but we keep our manual `getMimeType()` for explicit control (e.g. `charset=utf-8` on text types, `.map` → `application/json`).
- `existsSync` + `statSync` are still needed for the directory check. `Bun.file()` doesn't distinguish files from directories — it will just fail on `Response` consumption. The stat calls are cheap and cached by the OS.
- Remove the `readFileSync` import — it's no longer used in this file.

### 1.2 Update pre-compressed file reading in `compression.ts`

**Before:**

```ts
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
```

**After:**

```ts
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
```

**Why `Uint8Array` instead of `Bun.file()` here?** The pre-compressed cache stores file contents in memory permanently (read once, serve forever). We want the raw bytes in memory, not a lazy file reference. The key change is using `Uint8Array` instead of `Buffer` so downstream code doesn't need the `toBodyInit` conversion — `new Response(uint8array)` works directly.

### 1.3 Remove `readFileSync` import from `static.ts`

After 1.1, `static.ts` no longer needs `readFileSync`. Update the import:

```ts
// Before
import { existsSync, statSync, readFileSync } from "fs";

// After
import { existsSync, statSync } from "fs";
```

### 1.4 Verify

- [x] All static assets serve correctly (CSS, JS, fonts, images, favicon)
- [x] `/dist/*` files serve with `Cache-Control: immutable`
- [x] `/styles/*` files serve with `Cache-Control: no-cache`
- [x] `/docs/*.md` raw markdown files serve correctly
- [x] Directory requests with `index.html` still work
- [x] Directory traversal protection still returns 403
- [x] `Content-Type` headers are correct for all file types

---

## Phase 2 — Native compression ✅

**Goal:** Replace Node.js `zlib` with Bun-native compression and eliminate `Buffer` → `ArrayBuffer` conversion.

### 2.1 Replace `gzipSync` with `Bun.gzipSync()`

**Before:**

```ts
import { gzipSync, brotliCompressSync } from "zlib";

// In compressResponse:
if (!cached.gzip) cached.gzip = gzipSync(buffer);
```

**After:**

```ts
import { brotliCompressSync } from "zlib";  // brotli stays — Bun has no native brotli yet

// In compressResponse:
if (!cached.gzip) cached.gzip = Bun.gzipSync(new Uint8Array(buffer));
```

**Why keep `brotliCompressSync` from zlib?** Bun does not have a native `Bun.brotliCompressSync()` API. The Node.js `zlib` compatibility layer is the only option for brotli. When Bun adds native brotli, we can drop the `zlib` import entirely.

### 2.2 Remove `toBodyInit` helper

**Before:**

```ts
const toBodyInit = (buf: Buffer): ArrayBuffer =>
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

// Usage:
return new Response(toBodyInit(cached.br), { ... });
return new Response(toBodyInit(cached.gzip), { ... });
```

**After:**

```ts
// Deleted — Uint8Array is accepted directly by new Response()

// Usage:
return new Response(cached.br, { ... });
return new Response(cached.gzip, { ... });
```

### 2.3 Change cache types from `Buffer` to `Uint8Array`

**Before:**

```ts
// Pre-compressed cache
const preCompressedCache = new Map<string, Buffer | null>();

// Slow-path cache
interface CachedCompression {
  br?: Buffer;
  gzip?: Buffer;
  raw: Buffer;
}
```

**After:**

```ts
const preCompressedCache = new Map<string, Uint8Array | null>();

interface CachedCompression {
  br?: Uint8Array;
  gzip?: Uint8Array;
  raw: Uint8Array;
}
```

### 2.4 Update `compressResponse` slow path

The full slow-path body becomes:

```ts
const arrayBuffer = await response.arrayBuffer();
const raw = new Uint8Array(arrayBuffer);

if (raw.length < 1024) {
  return new Response(raw, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

let cached = compressionCache.get(pathname);

// Invalidate if content changed
if (cached && !uint8Equals(cached.raw, raw)) {
  compressionCache.delete(pathname);
  cached = undefined;
}

if (!cached) {
  evictOldest();
  cached = { raw };
  compressionCache.set(pathname, cached);
}

const lowerEncoding = acceptEncoding.toLowerCase();
const headers = new Headers(response.headers);
headers.set("Vary", "Accept-Encoding");

if (lowerEncoding.includes("br")) {
  if (!cached.br) cached.br = new Uint8Array(brotliCompressSync(Buffer.from(raw)));
  headers.set("Content-Encoding", "br");
  headers.set("Content-Length", cached.br.length.toString());
  return new Response(cached.br, { status: response.status, statusText: response.statusText, headers });
}

if (lowerEncoding.includes("gzip")) {
  if (!cached.gzip) cached.gzip = Bun.gzipSync(raw);
  headers.set("Content-Encoding", "gzip");
  headers.set("Content-Length", cached.gzip.length.toString());
  return new Response(cached.gzip, { status: response.status, statusText: response.statusText, headers });
}

return new Response(raw, { status: response.status, statusText: response.statusText, headers: response.headers });
```

**Note:** We need a small helper since `Uint8Array` doesn't have `.equals()`:

```ts
function uint8Equals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
```

Alternatively, use `Buffer.from(a).equals(Buffer.from(b))` if we're okay keeping `Buffer` for comparison only. The `Uint8Array` loop is simpler and avoids the import.

### 2.5 Verify

- [x] Pre-compressed `.br`/`.gz` files in `/dist/` serve correctly
- [x] Dynamic pages (docs, tutorials) compress on first hit and cache
- [x] `Content-Encoding: br` header present when client sends `Accept-Encoding: br`
- [x] `Content-Encoding: gzip` header present as fallback
- [x] Small responses (< 1KB) are not compressed
- [x] `Vary: Accept-Encoding` header present on all compressed responses
- [ ] Cache invalidation works (change a markdown file, request it twice)

**Implementation note:** TypeScript's `BodyInit` type doesn't include `Uint8Array` directly (the DOM lib types are narrower than Bun's runtime). Resolved by using `.buffer as ArrayBuffer` on all `Uint8Array` values passed to `new Response()`. This is a zero-cost cast — no data copy, just a type-level assertion.

---

## Phase 3 — Rendered page cache ✅

**Goal:** Cache the final HTML string for server-rendered pages (docs, tutorials, examples, benchmarks) so repeated requests skip markdown parsing, template rendering, and sidebar assembly.

**Why this is safe:** Content only changes on deploy. The server restarts on deploy (PM2 reload), which clears all in-memory state.

### 3.1 Add page cache to `content.ts`

Add a `Map<string, Response>` cache inside `createContentRenderer`:

```ts
// Inside createContentRenderer()
const pageCache = new Map<string, Response>();

function render(slug: string | null): Response | null {
  const cacheKey = slug ?? "__overview__";

  if (pageCache.has(cacheKey)) {
    return pageCache.get(cacheKey)!.clone();
  }

  // ... existing render logic ...

  const response = new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });

  pageCache.set(cacheKey, response.clone());
  return response;
}

function clearCache(): void {
  clearAllCaches();
  overviewCache = null;
  pageCache.clear();  // ← add this
}
```

**Why `.clone()`?** A `Response` body can only be consumed once. We store a clone in the cache and return a clone to the caller. The overhead of `.clone()` is negligible compared to markdown parsing + template rendering.

### 3.2 Add page cache to `examples.ts`

```ts
const examplePageCache = new Map<string, Response>();

export function renderExamplesPage(slug: string | null, url?: string): Response | null {
  // Overview page — cacheable (no variant)
  if (slug === null) {
    if (examplePageCache.has("__overview__")) {
      return examplePageCache.get("__overview__")!.clone();
    }
    const content = buildOverviewContent();
    const html = assemblePage(null, null, content);
    const response = new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
    examplePageCache.set("__overview__", response.clone());
    return response;
  }

  // Example pages — cache by slug + variant
  const variant = url ? parseVariant(url) : "vanilla";
  const cacheKey = `${slug}::${variant}`;

  if (examplePageCache.has(cacheKey)) {
    return examplePageCache.get(cacheKey)!.clone();
  }

  // ... existing render logic ...

  examplePageCache.set(cacheKey, response.clone());
  return response;
}

export function clearCache(): void {
  clearAllCaches();
  allExamplesCache = null;
  examplePageCache.clear();  // ← add this
}
```

### 3.3 Add page cache to `benchmarks.ts`

Same pattern — cache by `slug::variant`:

```ts
const benchPageCache = new Map<string, Response>();

export function renderBenchmarkPage(slug: string | null, url?: string): Response | null {
  const variant = url ? parseVariant(new URL(url).search) : "vanilla";
  const cacheKey = slug ? `${slug}::${variant}` : "__overview__";

  if (benchPageCache.has(cacheKey)) {
    return benchPageCache.get(cacheKey)!.clone();
  }

  // ... existing render logic ...

  benchPageCache.set(cacheKey, response.clone());
  return response;
}
```

### 3.4 Add page cache to `homepage.ts`

The homepage is already mostly cached (template + navigation + version), but the Eta render still runs on every request:

```ts
let homepageCache: Response | null = null;

export function renderHomepage(): Response {
  if (homepageCache) return homepageCache.clone();

  // ... existing render logic ...

  homepageCache = response.clone();
  return response;
}

export function clearCache(): void {
  templateCache = null;
  navCache = null;
  versionCache = null;
  homepageCache = null;  // ← add this
}
```

### 3.5 Verify

- [x] First request renders correctly (cold cache)
- [x] Second request returns identical content (hot cache — verified via md5)
- [x] Different variants produce different cached responses (benchmarks: vanilla 7597 vs react 7835 bytes)
- [x] `clearCache()` functions updated in all four renderers
- [x] Memory usage stays reasonable (~50 pages × ~20KB HTML ≈ ~1MB — negligible)
- [x] Invalid slugs still return 404 (cache doesn't interfere)
- [x] API and static file routes unaffected

**Implementation note:** Caches store the HTML string (not `Response` objects) to avoid the overhead of `Response.clone()`. A fresh `new Response(cachedHtml, ...)` is created on each hit — trivial cost compared to markdown parsing + template rendering.

---

## Phase 4 — Eliminate redundant allocations ✅

**Goal:** Remove duplicate `new URL()` parsing and unnecessary `async`/`Promise` overhead.

### 4.1 Pass parsed URL through the router

**Before:** The router parses `new URL(req.url)`, then passes `req.url` (a string) to sub-routers which parse it again.

```ts
// router.ts
export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  // ...
  (await routeApi(req)) ??                        // routeApi does new URL(req.url) again
  resolveExamples(pathname, req.url) ??            // examples does new URL(req.url) again
  resolveBenchmarks(pathname, req.url) ??          // benchmarks does new URL(url) twice
}
```

**After:** Parse once, pass the `URL` object:

```ts
// router.ts
export function handleRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const pathname = decodeURIComponent(url.pathname);
  const acceptEncoding = req.headers.get("Accept-Encoding");

  // Sync routes first (no Promise allocation for ~90% of requests)
  const response =
    routeSystem(pathname) ??
    resolveHomepage(pathname) ??
    resolveExamples(pathname, url) ??
    resolveDocs(pathname) ??
    resolveTutorials(pathname) ??
    resolveBenchmarks(pathname, url) ??
    resolveStatic(pathname);

  if (response) return compressResponse(response, acceptEncoding, pathname);

  // Async path — only for API routes
  return handleAsync(req, url, pathname, acceptEncoding);
}

async function handleAsync(
  req: Request,
  url: URL,
  pathname: string,
  acceptEncoding: string | null,
): Promise<Response> {
  const response = (await routeApi(req, url)) ?? new Response("Not Found", { status: 404 });
  return compressResponse(response, acceptEncoding, pathname);
}
```

### 4.2 Update `routeApi` to accept a `URL` parameter

**Before:**

```ts
export const routeApi = async (req: Request): Promise<Response | null> => {
  const url = new URL(req.url);
  const path = url.pathname;
```

**After:**

```ts
export const routeApi = async (req: Request, url: URL): Promise<Response | null> => {
  const path = url.pathname;
```

### 4.3 Update `resolveExamples` and `resolveBenchmarks` signatures

**Before:**

```ts
function resolveExamples(pathname: string, url: string): Response | null { ... }
function resolveBenchmarks(pathname: string, url: string): Response | null { ... }
```

**After:**

```ts
function resolveExamples(pathname: string, url: URL): Response | null { ... }
function resolveBenchmarks(pathname: string, url: URL): Response | null { ... }
```

And update the renderer functions to accept `URL` objects instead of strings:

```ts
// renderExamplesPage
const variant = parseVariant(url.searchParams);
const queryString = url.search;

// renderBenchmarkPage — fix the double new URL() call
const variant = parseVariant(url.search);
const queryString = url.search;
```

### 4.4 Update `parseVariant` functions

Both `examples.ts` and `benchmarks.ts` have `parseVariant` that creates a `new URL()` or `new URLSearchParams()`:

**Before (examples.ts):**

```ts
function parseVariant(url: string): Variant {
  const params = new URL(url, "http://localhost").searchParams;
  const variant = params.get("variant");
```

**After:**

```ts
function parseVariant(params: URLSearchParams): Variant {
  const variant = params.get("variant");
```

**Before (benchmarks.ts):**

```ts
function parseVariant(url: string): Variant {
  const params = new URLSearchParams(url);
  const variant = params.get("variant");
```

**After:**

```ts
function parseVariant(search: string): Variant {
  const params = new URLSearchParams(search);
  const variant = params.get("variant");
```

### 4.5 Make `compressResponse` work with sync return

Since the compression function uses `await response.arrayBuffer()`, it must stay async. But for the pre-compressed fast path and non-compressible responses, we can return synchronously by overloading:

Actually — `compressResponse` is already async and that's fine. The key optimization is in 4.1: the `handleRequest` function itself is no longer `async` for sync routes. The `compressResponse` call in the sync path can return a `Response` directly when hitting the pre-compressed cache (since `tryPreCompressed` is synchronous) or when the content type isn't compressible. For the slow path it still needs to be async.

**Refinement:** Split `compressResponse` into a sync fast path + async slow path:

```ts
export function compressResponse(
  response: Response,
  acceptEncoding: string | null,
  pathname: string,
): Response | Promise<Response> {
  const contentType = response.headers.get("Content-Type") || "";

  if (!shouldCompress(contentType)) return response;
  if (!acceptEncoding || response.headers.get("Content-Encoding")) return response;

  // Fast path: pre-compressed build output (synchronous)
  const preCompressed = tryPreCompressed(response, acceptEncoding, pathname);
  if (preCompressed) return preCompressed;

  // Slow path: compress on the fly (async — consumes response body)
  return compressAsync(response, acceptEncoding, pathname);
}
```

This means the sync route path in `handleRequest` can return a plain `Response` without a Promise when serving pre-compressed or non-compressible content.

### 4.6 Verify

- [x] API routes still work (async path)
- [x] Static routes don't create unnecessary Promises
- [x] Query parameters (`?variant=react`) still parsed correctly
- [x] Compression still works for both sync and async paths
- [x] No double `new URL()` in any code path

**Implementation notes:**
- `handleRequest` return type is `Response | Promise<Response>` — Bun's `fetch` handler accepts both.
- `routeApi` now accepts `(req: Request, url: URL)` — the pre-parsed URL from the router.
- `renderExamplesPage` and `renderBenchmarkPage` accept `URL` objects; their `parseVariant` functions take `URLSearchParams` or `search` string directly instead of constructing new `URL` instances.
- `compressResponse` was split into sync fast-path + async slow-path (post-refactor cleanup):
  - **Sync (plain `Response`):** non-compressible content (images, fonts, favicon), already-encoded responses, pre-compressed `.br`/`.gz` build output from `/dist/`. ~60% of requests avoid a Promise allocation entirely.
  - **Async (`Promise<Response>`):** on-the-fly compression for server-rendered HTML and API JSON. Only path that needs `await response.arrayBuffer()`.
  - Internal refactoring: extracted `parseEncoding()` (parse `Accept-Encoding` once), `compressedResponse()` (build compressed Response — eliminates 6 duplicate header-setting blocks), and `compressAsync()` (isolated slow path).

---

## Phase 5 — Startup optimization ✅

**Goal:** Reduce startup time by batching git commands for sitemap `lastmod` dates.

### 5.1 Replace ~40 individual `execSync` calls with a single batched command

**Current approach:** `sitemap.ts` calls `gitLastmod()` ~40 times at startup, each spawning a `git log` process:

```ts
export function gitLastmod(...filePaths: string[]): string | null {
  const quoted = filePaths.map((f) => `"${f}"`).join(" ");
  const date = execSync(`git log -1 --format=%cd --date=short -- ${quoted}`, {
    cwd: ROOT, encoding: "utf-8",
  }).trim();
  return date || null;
}
```

**New approach:** Run a single `git log` that returns all file dates at once:

```ts
function buildLastmodMap(): Map<string, string> {
  const map = new Map<string, string>();

  // Collect all files we need dates for
  const fileGroups = collectAllFiles();  // returns Map<urlPath, filePaths[]>

  // Single git command: get last commit date for every tracked file
  const allDates = batchGitLastmod();    // returns Map<filePath, date>

  // Resolve: for each URL, take the most recent date across its source files
  for (const [urlPath, files] of fileGroups) {
    let latest = FALLBACK_DATE;
    for (const file of files) {
      const date = allDates.get(file);
      if (date && date > latest) latest = date;
    }
    map.set(urlPath, latest);
  }

  return map;
}

/**
 * Single git command that returns all file modification dates.
 * Output: one "YYYY-MM-DD<TAB>filepath" per line.
 */
function batchGitLastmod(): Map<string, string> {
  const result = new Map<string, string>();
  try {
    // Get last commit date per file for the entire repo
    const output = execSync(
      `git log --format="%cd" --date=short --name-only --diff-filter=ACMR HEAD`,
      { cwd: ROOT, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 },
    );

    // Parse output: alternating date lines and filename lines
    let currentDate = "";
    for (const line of output.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Date lines match YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        currentDate = trimmed;
        continue;
      }

      // File line — only record the first (most recent) date per file
      if (!result.has(trimmed)) {
        result.set(trimmed, currentDate);
      }
    }
  } catch {
    // Git not available — all files get fallback date
  }

  return result;
}
```

**Tradeoff:** This reads the full git log once (a few MB of output) instead of spawning 40 processes. The parsing is trivial. Expected startup time reduction: **~1s → ~100ms**.

**Alternative (simpler, less optimal):** If the full git log approach is too complex or produces too much output, a middle-ground is batching into ~5 commands by directory:

```ts
git log -1 --format=%cd --date=short -- docs/
git log -1 --format=%cd --date=short -- tutorials/
git log -1 --format=%cd --date=short -- examples/
git log -1 --format=%cd --date=short -- benchmarks/
git log -1 --format=%cd --date=short -- src/server/shells/
```

5 processes instead of 40. Less precise per-file dates, but good enough for sitemaps.

### 5.2 Verify

- [x] `/sitemap.xml` returns correct `<lastmod>` dates (zero diff against previous output)
- [x] Startup time measurably reduced (sitemap module: 1,289ms → 148ms — **8.7× faster**)
- [x] Dates match previous per-file `git log` results (identical 410-line sitemap XML)
- [x] Graceful fallback when git is not available (try/catch returns empty map → all fallback dates)

**Implementation notes:**
- Single `git log --format="%cd" --date=short --name-only --diff-filter=ACMR HEAD` produces ~3,500 lines parsed in <25ms.
- `resolveDate()` handles both exact file lookups and directory prefixes (trailing `/`) by scanning map keys — supports the `examples/{slug}/` pattern where all variant files contribute to the URL's date.
- The `gitLastmod()` export was removed — `batchGitLastmod()` and `resolveDate()` are internal only.

---

## Phase 6 — PM2 multi-instance ✅

**Goal:** Leverage `reusePort: true` to run multiple Bun processes on the same port for multi-core utilization.

### 6.1 Update `ecosystem.config.cjs`

**Before:**

```js
instances: 1,
exec_mode: "fork",
```

**After:**

```js
instances: 2,    // or require("os").cpus().length for all cores
exec_mode: "fork",  // still fork — cluster mode ignores interpreter
```

**How it works:** Each PM2 fork instance starts a separate `bun run server.ts` process. Since `Bun.serve({ reusePort: true })` sets `SO_REUSEPORT` on the socket, the kernel distributes incoming connections across all processes listening on the same port. No PM2 cluster mode needed.

**Memory impact:** Each Bun process uses ~30–50MB baseline. Two instances ≈ ~80MB total, well within the `max_memory_restart: "256M"` limit per instance.

### 6.2 Verify

- [x] Both instances start and bind to the same port (tested locally with 2 `bun run server.ts` processes)
- [x] All requests return 200 across both instances
- [x] All route types work: homepage, docs, examples, benchmarks, API, sitemap, static files
- [ ] `pm2 list` shows 2 healthy instances (verify on production deploy)
- [ ] `pm2 reload vlist.dev` performs zero-downtime restart (verify on production deploy)
- [ ] Memory stays within bounds (verify on production deploy)

**Implementation notes:**
- `exec_mode` stays `"fork"` — PM2 cluster mode ignores the `interpreter` setting and would spawn Node.js workers instead of Bun.
- Two fork instances on the same port works because `Bun.serve({ reusePort: true })` sets `SO_REUSEPORT` on the socket. The kernel load-balances incoming connections across all processes bound to that port.
- Each Bun process uses ~30–50MB baseline. Two instances ≈ ~80MB total, well within the per-instance `max_memory_restart: "256M"` limit.
- The instance count can be tuned up or down after observing production load. With Phase 3 page caching active, even a single instance handles documentation traffic easily — the second instance provides resilience and headroom.

---

## Phase 7 — Cloudflare CDN edge caching ✅

Cloudflare sits in front of the Bun origin as a reverse proxy (free tier). The origin server remains unchanged — Cloudflare respects the `Cache-Control` headers we emit and caches responses at 300+ edge locations globally.

### 7.1 Create centralized cache header module

**New file: `src/server/cache.ts`**

All Cache-Control values centralized in one module instead of scattered across renderers and static serving:

```ts
// Immutable build assets — browser and edge cache for 1 year
export const CACHE_IMMUTABLE = "public, max-age=31536000, immutable";

// Server-rendered HTML — edge caches 1h, browser always revalidates
export const CACHE_PAGE = "public, s-maxage=3600, max-age=0, stale-while-revalidate=60";

// Sitemap, robots.txt — edge and browser both cache 1h
export const CACHE_META = "public, s-maxage=3600, max-age=3600";

// API JSON — edge caches 5min, browser does not cache
export const CACHE_API = "public, s-maxage=300, max-age=0";

// No-cache — dev assets, raw source
export const CACHE_NOCACHE = "no-cache";

// Helper: standard HTML response headers
export function htmlHeaders(): HeadersInit {
  return {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": CACHE_PAGE,
  };
}
```

**Key design: `s-maxage` vs `max-age` separation.**

- `s-maxage` controls the Cloudflare edge TTL (shared cache)
- `max-age=0` means browsers always revalidate with the edge (instant, since edge is nearby)
- `stale-while-revalidate=60` lets the edge serve a stale copy while fetching fresh in the background
- On deploy, we purge the entire Cloudflare cache so users immediately get fresh content

### 7.2 Update all renderers to use `htmlHeaders()`

Every server-rendered page (homepage, docs, tutorials, examples, benchmarks) now returns:

```
Cache-Control: public, s-maxage=3600, max-age=0, stale-while-revalidate=60
```

**Before:** Most renderers returned only `Content-Type` with no `Cache-Control` at all. The homepage had `max-age=3600` but no `s-maxage`.

**After:** All renderers import `htmlHeaders()` from `cache.ts`:

```ts
import { htmlHeaders } from "../cache";

// In every Response constructor:
return new Response(html, { headers: htmlHeaders() });
```

Files updated:
- `src/server/renderers/homepage.ts` — was `max-age=3600`, now `s-maxage=3600, max-age=0`
- `src/server/renderers/content.ts` — added `Cache-Control` (was missing)
- `src/server/renderers/examples.ts` — added `Cache-Control` (was missing)
- `src/server/renderers/benchmarks.ts` — added `Cache-Control` (was missing)

### 7.3 Update static file serving to use shared constants

`src/server/static.ts` now imports `CACHE_IMMUTABLE` and `CACHE_NOCACHE` from `cache.ts` instead of defining its own local constants. No behavioral change — just deduplication.

### 7.4 Update sitemap and robots.txt

`src/server/sitemap.ts` now uses `CACHE_META` from `cache.ts`:

```
Cache-Control: public, s-maxage=3600, max-age=3600
```

robots.txt was previously `max-age=86400` (1 day) — normalized to 1 hour to match sitemap and keep purge-on-deploy behavior consistent.

### 7.5 Update API responses

`src/api/router.ts` now includes `Cache-Control` on all JSON responses and the API docs page:

- JSON responses: `public, s-maxage=300, max-age=0` (edge caches 5 min)
- API docs HTML: same as server-rendered pages (`CACHE_PAGE`)

### 7.6 Add Cloudflare cache purge to deploy workflow

`.github/workflows/deploy.yml` — added a step after PM2 reload:

```yaml
- name: Purge Cloudflare cache
  run: |
    curl -sf -X POST \
      "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
    echo "🧹 Cloudflare cache purged"
```

This ensures fresh content is served globally within seconds of a deploy. The purge runs as a separate step (not via SSH) so it executes even if the deploy step partially fails.

**GitHub secrets required:**
- `CF_ZONE_ID` — Cloudflare zone ID for vlist.dev
- `CF_API_TOKEN` — Scoped API token with only `Zone → Cache Purge → Purge` permission on `vlist.dev`

### 7.7 Cloudflare configuration

Cloudflare dashboard settings (done manually, not in code):

| Setting | Value | Why |
|---------|-------|-----|
| **DNS** | A record proxied (orange cloud) | Enables CDN |
| **SSL/TLS** | Full (strict) | Origin has valid cert |
| **Browser Cache TTL** | Respect Existing Headers | Our `s-maxage`/`max-age` headers drive everything |
| **Brotli** | Enabled (default) | Edge compresses on the fly |

### 7.8 Cache behavior summary

| Route | `Cache-Control` | Edge TTL | Browser TTL | Notes |
|-------|-----------------|----------|-------------|-------|
| `/` (homepage) | `s-maxage=3600, max-age=0, swr=60` | 1 hour | revalidate | Purged on deploy |
| `/docs/*`, `/tutorials/*` | `s-maxage=3600, max-age=0, swr=60` | 1 hour | revalidate | Purged on deploy |
| `/examples/*`, `/benchmarks/*` | `s-maxage=3600, max-age=0, swr=60` | 1 hour | revalidate | Purged on deploy |
| `/dist/*` (build output) | `max-age=31536000, immutable` | 1 year | 1 year | Content-hashed filenames |
| Fonts (`.woff2`, etc.) | `max-age=31536000, immutable` | 1 year | 1 year | Rarely change |
| `/favicon.ico` | `max-age=31536000, immutable` | 1 year | 1 year | Never changes |
| `/sitemap.xml`, `/robots.txt` | `s-maxage=3600, max-age=3600` | 1 hour | 1 hour | Purged on deploy |
| `/api/*` (JSON) | `s-maxage=300, max-age=0` | 5 min | revalidate | Deterministic data |
| `/styles/*`, raw assets | `no-cache` | bypass | revalidate | Dev assets |

### 7.9 Verify

```bash
# After Cloudflare is active:

# Check edge caching works (second request should be HIT)
curl -sI https://vlist.dev/ | grep -iE "^(cf-cache-status|cache-control|cf-ray)"
# → cf-cache-status: HIT
# → Cache-Control: public, s-maxage=3600, max-age=0, stale-while-revalidate=60

# Check immutable assets are cached
curl -sI https://vlist.dev/favicon.ico | grep -iE "^(cf-cache-status|cache-control)"
# → cf-cache-status: HIT
# → Cache-Control: public, max-age=31536000, immutable

# Check API responses
curl -s https://vlist.dev/api/info -o /dev/null -w "%{http_code}" && \
curl -sI https://vlist.dev/api/info | grep -iE "^(cf-cache-status|cache-control)"
# → cf-cache-status: HIT (after second request)
# → Cache-Control: public, s-maxage=300, max-age=0

# Verify cache purge works
curl -sf -X POST \
  "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
# Next request should be cf-cache-status: MISS, then HIT
```

---

## Phase 8 — Dev cache staleness fix ✅

During development, two layers of caching caused stale builds to be served silently — making it appear that source changes had no effect. This phase eliminates the problem entirely.

### Problem

**Build cache (`examples/build.ts`):** The manifest hash was computed from `vlist/src/` but the bundler resolved imports from `vlist/dist/index.js` (via `package.json` exports). Editing vlist source triggered a "rebuild" that re-bundled the **stale** dist output. The only workaround was manually running `bun run build` in vlist first — easy to forget.

**Server cache (`compression.ts` + renderers):** Pre-compressed `.br`/`.gz` files and rendered HTML pages were cached in-memory forever. Even after a successful rebuild, the server kept serving old cached content until a full PM2 restart.

### 8.1 Fix build cache — hash dist, auto-rebuild stale dist

**`examples/build.ts`:**

- Hash `vlist/dist/index.js` + CSS files (what the bundler actually imports) instead of `vlist/src/`
- Add `isVlistDistStale()` — compares mtime of any `src/` file against `dist/index.js`
- Add `ensureVlistDist()` — auto-runs `bun run build` in the vlist repo when dist is stale
- Called at the start of `main()` before any example builds

```ts
// Before (wrong — hashed source, bundled dist)
function getVlistHash(): string {
  const vlistSrc = resolve("../vlist/src");
  _vlistHash = existsSync(vlistSrc) ? hashFiles(vlistSrc) : "none";
  return _vlistHash;
}

// After (correct — hashes what gets bundled)
function getVlistHash(): string {
  const vlistDist = resolve("../vlist/dist/index.js");
  // hash dist/index.js + CSS files
  ...
}

async function ensureVlistDist(): Promise<void> {
  if (!isVlistDistStale()) return;
  console.log("⚡ vlist/dist is stale — rebuilding...\n");
  await $`bun run build.ts`.cwd(resolve("../vlist")).quiet().nothrow();
}
```

### 8.2 Disable server caches in development

**`src/server/config.ts`** — Added shared `IS_PROD` constant:

```ts
export const IS_PROD = process.env.NODE_ENV === "production";
```

**`src/server/compression.ts`** — Skip both caches in dev:

- `preCompressedCache` (`.br`/`.gz` files): only cache reads when `IS_PROD`
- `compressionCache` (on-the-fly compressed HTML): skip entirely when `!IS_PROD`

**Renderers** — Skip `pageCache` when `!IS_PROD`:

| File | Cache skipped in dev |
|------|---------------------|
| `renderers/examples.ts` | `pageCache` Map |
| `renderers/benchmarks.ts` | `pageCache` Map |
| `renderers/content.ts` | `pageCache` Map (docs + tutorials) |
| `renderers/homepage.ts` | `pageCache` + `templateCache` |

### 8.3 Production behavior unchanged

`ecosystem.config.cjs` sets `NODE_ENV: "production"` — all caches remain fully active on the server. The changes only affect local development where `NODE_ENV` is unset.

### 8.4 Verify

| Check | Status |
|-------|--------|
| Edit vlist source → `bun run build:examples` auto-rebuilds dist | ✅ |
| Examples bundle fresh dist (not stale) | ✅ |
| Browser refresh shows changes without PM2 restart | ✅ |
| `NODE_ENV=production` preserves all caches | ✅ |
| `bun run typecheck` passes | ✅ |

---

## Phase 9 — Edge-aware compression, inline SVGs, lazy highlight.js ✅

After enabling the Cloudflare Cache Rule (Phase 7), profiling revealed that the origin server was still spending 20–40ms per response on `brotliCompressSync` — CPU time wasted since Cloudflare re-compresses at the edge anyway. Additionally, example pages eagerly loaded ~60KB of highlight.js scripts that were only needed when clicking the "Source" tab, and 14 SVG icons triggered individual HTTP requests of 60ms each.

### 9.1 Skip on-the-fly compression in production

**Problem:** Every HTML/CSS/API response went through `brotliCompressSync` (Node zlib) or `Bun.gzipSync()` at the origin, costing 20–40ms per response. Since Cloudflare compresses at the edge and caches the result, this CPU work was redundant.

**Solution:** `compression.ts` now has an edge-aware strategy:

- **Production (behind Cloudflare):** Origin sends responses uncompressed. Cloudflare applies brotli/gzip at the edge and caches the result globally. Pre-compressed `/dist/` files (build output with `.br`/`.gz` siblings) are still served directly — zero CPU cost.
- **Development (no CDN):** Uses gzip only via `Bun.gzipSync()` (~1ms) instead of `brotliCompressSync` (~20–40ms). Results are cached with auto-invalidation when file content changes (hot-reload still works).

```ts
// Production: skip on-the-fly compression entirely
if (IS_PROD) return response;

// Development: gzip only (Bun-native, fast)
return devCompressGzip(response, pathname);
```

The `brotliCompressSync` import from `zlib` was removed entirely — no longer needed.

**Impact:**
- Origin TTFB: **20–40ms → ~1–2ms** per response (production)
- Dev CSS/HTML: **20–78ms → 3–9ms** (gzip instead of brotli, with caching)

### 9.2 Inline SVG icons as data URIs

**Problem:** 14 SVG icons (185–841 bytes each) were referenced via `url("/examples/icons/*.svg")` in `styles/ui.css`, triggering separate HTTP requests. Each took ~60ms in production due to network round-trips.

**Solution:** All `mask-image` URLs replaced with inline `data:image/svg+xml` data URIs:

```css
/* Before — separate HTTP request */
.icon--up {
    mask-image: url("/examples/icons/up.svg");
}

/* After — inline, zero network cost */
.icon--up {
    mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" .../>');
}
```

Icons inlined: `up`, `down`, `center`, `add`, `remove`, `trash`, `shuffle`, `back`, `forward`, `search`, `sort`, `filter`, `send`, `settings`.

**Impact:** 14 fewer HTTP requests. Icon load time: **60ms → 0ms** (parsed from CSS cache).

### 9.3 Lazy-load highlight.js on source tab click

**Problem:** Example pages eagerly loaded 5 scripts from jsdelivr CDN at page load:

| Script | Size | Load time |
|--------|------|-----------|
| `highlight.min.js` | 44.6 kB | 429ms |
| `typescript.min.js` | 4.0 kB | 428ms |
| `bash.min.js` | 2.4 kB | 428ms |
| `css.min.js` | 5.1 kB | 428ms |
| `scss.min.js` | 5.6 kB | 428ms |

These scripts are only needed when the user clicks the "Source" tab to view code — most users never do.

**Solution:** Added `LAZY_SYNTAX_HIGHLIGHTING` flag to `TemplateData`. When true, a lightweight loader function (`window.__loadHljs`) is injected instead of eager `<script>` tags. On first source tab click, the loader dynamically creates script elements, loads highlight.js core + language modules, then calls `hljs.highlightElement()` on each code block.

```ts
// src/server/config/eta.ts — new flag
interface TemplateData {
  HAS_SYNTAX_HIGHLIGHTING: boolean;
  LAZY_SYNTAX_HIGHLIGHTING: boolean;  // NEW
  // ...
}

// examples.ts — lazy (source tabs, code hidden by default)
LAZY_SYNTAX_HIGHLIGHTING: true,

// content.ts — eager (docs/tutorials, code blocks visible on render)
LAZY_SYNTAX_HIGHLIGHTING: false,
```

Template logic in `base.html`:
- `HAS_SYNTAX_HIGHLIGHTING && !LAZY_SYNTAX_HIGHLIGHTING` → eager `<script src="...">` tags (docs, tutorials)
- `LAZY_SYNTAX_HIGHLIGHTING` → inline `__loadHljs()` loader function
- Source tab `openTab()` calls `highlightSource()` which triggers `__loadHljs()` on first click

**Impact:** Example pages load **0 scripts** instead of 5 (~60KB). Scripts load on-demand only when "Source" tab is clicked. Docs/tutorials unchanged — still eager.

### 9.4 Cloudflare Cache Rule

**Problem:** Cloudflare's default behavior marks HTML responses as `cf-cache-status: DYNAMIC` — they pass through to origin on every request regardless of `s-maxage` headers. Only static file extensions (`.js`, `.css`, `.png`) are cached by default.

**Solution:** Added a **Cache Rule** in Cloudflare Dashboard:

| Setting | Value |
|---------|-------|
| **Rule name** | Cache HTML pages |
| **Match** | Hostname equals `vlist.dev` (or all incoming requests) |
| **Cache eligibility** | Eligible for cache |
| **Edge TTL** | Use cache-control header if present |
| **Browser TTL** | Use cache-control header if present |

This tells Cloudflare to respect the `s-maxage=3600` headers already set in Phase 7.

**Verification:**

```bash
# Before rule: DYNAMIC (never cached)
curl -sI https://vlist.dev/examples | grep cf-cache-status
# → cf-cache-status: DYNAMIC

# After rule: first hit MISS, second hit HIT
curl -sI https://vlist.dev/examples | grep cf-cache-status
# → cf-cache-status: MISS
curl -sI https://vlist.dev/examples | grep cf-cache-status
# → cf-cache-status: HIT
```

### 9.5 Measured results

**Global TTFB (KeyCDN Performance Test on `/examples`):**

| Location | Before (no edge cache) | After (edge HIT) | Speedup |
|----------|------------------------|-------------------|---------|
| Amsterdam | 134ms | **81ms** | 1.7× |
| London | 104ms | **69ms** | 1.5× |
| New York | 361ms | **84ms** | 4.3× |
| San Francisco | 630ms | **71ms** | 8.9× |
| Singapore | 700ms | **50ms** | 14× |
| Sydney | 1.11s | **54ms** | 20× |

**Lighthouse (localhost, `/examples/data-table`):**

| Metric | Before | After |
|--------|--------|-------|
| Performance | 97 | **100** |
| FCP | 1.0s | **0.4s** |
| LCP | 1.0s | **0.4s** |
| TBT | 0ms | 0ms |
| CLS | 0 | 0 |

### 9.6 Verify

```bash
# Check Cloudflare caches HTML (not DYNAMIC)
curl -sI https://vlist.dev/examples | grep cf-cache-status
# → cf-cache-status: HIT (after first request warms cache)

# Check origin is NOT compressing (no Content-Encoding from origin)
# Cloudflare adds it at the edge
curl -sI https://vlist.dev/examples | grep -iE 'content-encoding|cf-cache'
# → content-encoding: br (from Cloudflare, not origin)
# → cf-cache-status: HIT

# Verify example pages don't eagerly load highlight.js
curl -s https://vlist.dev/examples/data-table | grep '<script src.*highlight'
# → (no output — correct, scripts are lazy-loaded)

# Verify docs pages still eagerly load highlight.js
curl -s https://vlist.dev/docs/getting-started | grep '<script src.*highlight'
# → <script src="https://cdn.jsdelivr.net/...highlight.min.js"></script>

# Verify SVG icons are inlined (no /examples/icons/ requests)
curl -s https://vlist.dev/styles/ui.css | grep -c 'data:image/svg+xml'
# → 28 (14 icons × 2 for -webkit-mask-image + mask-image)

# Run tests
bun test test/
# → 233 pass, 0 fail
```

---

## Deferred Items

| Item | Reason |
|------|--------|
| Replace `existsSync`/`statSync` with `Bun.file().exists()` | `Bun.file().exists()` is async — would require restructuring the sync render pipeline. Not worth the complexity for startup-only and cached paths. Revisit if Bun adds sync existence check. |
| Replace `Eta` with Bun's built-in HTML templating | Bun doesn't have a built-in template engine. Eta with `cache: true` is already fast. No action needed. |
| Replace `marked` with a faster markdown parser | `marked` is well-tested and feature-rich. With Phase 3 caching, parse time becomes irrelevant (one-time cost per slug). |
| Auto-detect MIME types via `Bun.file().type` | Our manual `MIME_TYPES` map gives us explicit control over `charset=utf-8` and edge cases (`.map` → JSON). Keep it. |

## Known Tradeoffs

### Origin sends uncompressed in production

In production, the origin server does **not** compress HTML/CSS/API responses. Cloudflare handles compression at the edge and caches the result. This means:

- ✅ Origin TTFB is ~1–2ms instead of 20–40ms
- ✅ No CPU wasted on compression the edge will redo anyway
- ⚠️ If Cloudflare is bypassed (direct origin access), responses are uncompressed

Pre-compressed `/dist/` files (build output) are still served directly with brotli/gzip — these are static and have `.br`/`.gz` siblings generated at build time.

### Bangalore Cloudflare PoP

The Bangalore Cloudflare PoP consistently shows ~1s TTFB even after cache warming. This appears to be a Cloudflare routing issue where the Bangalore PoP proxies through a larger data center rather than serving from local cache. This affects free/pro tier plans and cannot be resolved from our side.

---

## Per-File Impact Summary

### Files modified

| File | Phases | Changes |
|------|--------|---------|
| `src/server/static.ts` | 1, 7 | Replace `readFileSync` with `Bun.file()`, remove import; import cache constants from `cache.ts` |
| `src/server/compression.ts` | 1, 2, 4, 8, 9 | `Uint8Array` caches, `Bun.gzipSync()`, remove `toBodyInit`, sync/async split; skip compression in prod (Cloudflare handles it); dev uses gzip only; removed `brotliCompressSync` import |
| `src/server/router.ts` | 4 | Single `new URL()`, pass `URL` object to sub-routers, sync/async split |
| `src/api/router.ts` | 4, 7 | Accept pre-parsed `URL` parameter; add `Cache-Control` to JSON and docs responses |
| `src/server/config.ts` | 8 | Added `IS_PROD` constant (`NODE_ENV === "production"`) |
| `src/server/config/eta.ts` | 9 | Added `LAZY_SYNTAX_HIGHLIGHTING` boolean to `TemplateData` interface |
| `src/server/renderers/config.ts` | 8 | Re-export `IS_PROD` alongside `SITE` |
| `src/server/renderers/content.ts` | 3, 7, 8, 9 | Page cache per slug; `htmlHeaders()`; skip page cache in dev; `LAZY_SYNTAX_HIGHLIGHTING: false` |
| `src/server/renderers/examples.ts` | 3, 4, 7, 8, 9 | Page cache per `slug::variant`, accept `URL` object; `htmlHeaders()`; skip page cache in dev; `LAZY_SYNTAX_HIGHLIGHTING: true` |
| `src/server/renderers/benchmarks.ts` | 3, 4, 7, 8, 9 | Page cache per `slug::variant`, accept `URL` object; `htmlHeaders()`; skip page cache in dev; `LAZY_SYNTAX_HIGHLIGHTING: false` |
| `src/server/renderers/homepage.ts` | 3, 7, 8 | Page cache (single cached HTML string); `htmlHeaders()` with `s-maxage`; skip page + template cache in dev |
| `src/server/shells/base.html` | 9 | Lazy highlight.js loader (`__loadHljs`); `highlightSource()` called on first source tab open; conditional eager vs lazy loading |
| `src/server/sitemap.ts` | 5, 7 | Single batched `git log`, `resolveDate()` with directory prefix support; `CACHE_META` from `cache.ts` |
| `styles/ui.css` | 9 | 14 SVG icon `mask-image` URLs replaced with inline `data:image/svg+xml` data URIs |
| `examples/build.ts` | 8 | Hash `dist/index.js` instead of `src/`; auto-detect and rebuild stale vlist dist |
| `ecosystem.config.cjs` | 6 | `instances: 2` for multi-core via `SO_REUSEPORT` |
| `.gitignore` | 6 | Add `ecosystem.local.config.cjs` |
| `.github/workflows/deploy.yml` | 7 | Add Cloudflare cache purge step after PM2 reload |

### Files created

| File | Phase | Purpose |
|------|-------|---------|
| `docs/refactoring/server.md` | — | This plan |
| `ecosystem.local.config.cjs` | 6 | Local PM2 config with `cwd: __dirname`, file watching, dev log paths (gitignored) |
| `src/server/cache.ts` | 7 | Centralized Cache-Control constants and header helpers for origin + Cloudflare edge caching |

### Files unchanged

| File | Reason |
|------|--------|
| `server.ts` | Already optimal — minimal `Bun.serve()` setup |
| `src/server/renderers/base.ts` | Shell/nav loading already cached |
| `src/server/renderers/index.ts` | Barrel export only |

---

## Testing & Verification

### Measured Results

| Phase | Metric | Result |
|-------|--------|--------|
| Phase 1 | Static file serving | `Bun.file()` zero-copy for non-compressible assets (images, fonts, favicon) |
| Phase 2 | Gzip compression | `Bun.gzipSync()` native, `Uint8Array` throughout, no `Buffer` conversion |
| Phase 3 | Page cache hit | Identical content on repeated requests (verified via md5); different variants cached separately |
| Phase 4 | URL allocations | Single `new URL()` per request; sync return for ~90% of traffic |
| Phase 5 | Startup time | Sitemap module: **1,289ms → 148ms** (8.7× faster); identical 410-line sitemap XML output |
| Phase 6 | PM2 multi-instance | 2 instances, ~57MB each, zero-downtime reload confirmed |
| Phase 7 | Cloudflare edge caching | `cf-cache-status: HIT` on all pages/assets; `s-maxage` headers verified; cache purge on deploy |
| Phase 8 | Dev cache staleness | Stale builds eliminated; auto-rebuild vlist dist; no server restart needed after rebuilds |
| Phase 9 | Edge-aware compression | Origin TTFB: **20–40ms → ~1–2ms**; global TTFB: **700ms–1.1s → 50–84ms**; Lighthouse: **97 → 100**; FCP: **1.0s → 0.4s** |

### Functional Regression Checklist

- [x] Homepage loads correctly with all sections
- [x] Docs pages render markdown with syntax highlighting and TOC
- [x] Tutorial pages render with prev/next navigation
- [x] Example pages show correct variant, source tabs, and live demo
- [x] Benchmark pages load with variant switcher and live benchmark
- [x] API routes return correct JSON with CORS headers
- [x] `/sitemap.xml` has correct URLs and dates (zero diff against pre-refactor output)
- [x] `/robots.txt` serves correctly
- [x] Static files serve with correct MIME types and cache headers
- [x] Pre-compressed `.br`/`.gz` files served when available
- [x] Dynamic compression works — brotli (5,820b) and gzip (6,963b) for docs HTML
- [x] 404 returned for unknown routes and invalid slugs
- [x] Directory traversal protection active

### PM2 Local Development

- [x] `pm2 start ecosystem.local.config.cjs` launches 2 instances
- [x] File watching triggers auto-restart on source, content, and build output changes
- [x] `pm2 reload vlist.dev` performs zero-downtime restart
- [x] `process.send("ready")` fires after startup
- [x] Memory: ~57–64MB per instance, well within 256MB limit

### Production Deployment

- [ ] Deploy to production and verify `pm2 list` shows 2 healthy instances
- [ ] Verify zero-downtime reload works in production
- [ ] Monitor memory over 24h
- [ ] No errors in PM2 logs

### Cloudflare CDN

- [x] DNS proxied through Cloudflare (orange cloud on A records)
- [x] API token created (Cache Purge only, scoped to vlist.dev zone)
- [x] GitHub secrets set (`CF_ZONE_ID`, `CF_API_TOKEN`)
- [x] Deploy workflow purges cache after PM2 reload
- [x] All response types have correct `Cache-Control` with `s-maxage`
- [x] Nameserver propagation complete (Cloudflare status: Active)
- [x] SSL/TLS set to Full (strict)
- [x] `cf-cache-status: HIT` confirmed on live site
- [x] Edge compression (brotli) confirmed
- [x] Global latency improvement verified (50–84ms TTFB across 6/7 PoPs)
- [x] Cache Rule created: "Cache HTML pages" — hostname equals `vlist.dev`, eligible for cache, respect origin headers

### Phase 9 — Edge-aware compression

- [x] Origin skips on-the-fly compression in production (Cloudflare handles it)
- [x] Dev mode uses gzip only (`Bun.gzipSync`, ~1ms) instead of brotli (~20–40ms)
- [x] `brotliCompressSync` import removed from `compression.ts`
- [x] 14 SVG icons inlined as data URIs in `styles/ui.css`
- [x] highlight.js lazy-loaded on source tab click for example pages
- [x] Docs/tutorials still eagerly load highlight.js (code blocks visible on render)
- [x] `LAZY_SYNTAX_HIGHLIGHTING` flag added to `TemplateData`
- [x] Lighthouse 100 Performance confirmed on `/examples/data-table`
- [x] All 233 tests pass (including updated compression, router, and feed tests)