// build.ts - Auto-discover and build all examples examples in parallel
import {
  readdirSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  statSync,
  watch,
} from "fs";
import { spawnSync } from "child_process";
import { join, resolve, dirname } from "path";
import { preCompress, formatKB, gzipSize } from "../scripts/build-utils";
import { createHash } from "crypto";
import { transformSync } from "@babel/core";

const isWatch = process.argv.includes("--watch");
const isForce = process.argv.includes("--force");

const EXAMPLES_DIR = "./examples";
const PROJECT_ROOT = resolve(".");
const MANIFEST_PATH = join("dist", EXAMPLES_DIR, ".manifest.json");

const BUILD_OPTIONS = {
  minify: !isWatch,
  format: "esm" as const,
  target: "browser" as const,
  sourcemap: isWatch ? ("inline" as const) : ("none" as const),
};

// =============================================================================
// Framework dedupe plugin
// =============================================================================
// When vlist is linked (symlink), its node_modules/{react,vue} are separate
// copies from vlist.io/node_modules/. Framework hooks/reactivity crash if two
// copies coexist. This plugin forces all framework imports to resolve from
// vlist.io's node_modules, guaranteeing a single instance in the bundle.
//
// Vue: resolves to the compiler-included build (vue.esm-bundler.js) so that
// string `template` options work at runtime without .vue SFC compilation.
//
// vlist: resolves bare "vlist" imports to "@floor/vlist" via the package.json
// "imports" field mapping (which Bun's bundler doesn't natively support).

// =============================================================================
// SolidJS Babel plugin
// =============================================================================
// SolidJS requires babel-preset-solid to compile JSX into createComponent()
// calls — it does NOT use the standard React-style jsx/jsxs runtime.
// This plugin intercepts .jsx/.tsx files inside solidjs/ variant directories
// and transforms them through Babel before Bun processes the output.

// SolidJS needs two plugins:
// 1. Babel transform — compiles JSX into createComponent() / template() calls
//    (SolidJS does NOT use the standard React-style jsx/jsxs runtime)
// 2. Browser resolver — solid-js exports have "browser" and "node" conditions;
//    require.resolve picks "node" → server.js which throws "Client-only API
//    called on the server side". We resolve to browser entry points explicitly.

const solidJsxPlugin: import("bun").BunPlugin = {
  name: "solid-jsx",
  setup(build) {
    build.onLoad({ filter: /solidjs\/.*\.[jt]sx$/ }, async (args) => {
      const code = readFileSync(args.path, "utf-8");
      const result = transformSync(code, {
        filename: args.path,
        presets: [["babel-preset-solid"]],
        // Preserve ES modules for Bun to bundle
        parserOpts: {
          plugins: args.path.endsWith(".tsx") ? ["typescript", "jsx"] : ["jsx"],
        },
      });
      return {
        contents: result?.code ?? code,
        loader: args.path.endsWith(".tsx") ? "ts" : "js",
      };
    });
  },
};

const solidBrowserPlugin: import("bun").BunPlugin = {
  name: "solid-browser",
  setup(build) {
    build.onResolve({ filter: /^solid-js$/ }, () => ({
      path: resolve(join(PROJECT_ROOT, "node_modules/solid-js/dist/solid.js")),
    }));
    build.onResolve({ filter: /^solid-js\/web$/ }, () => ({
      path: resolve(
        join(PROJECT_ROOT, "node_modules/solid-js/web/dist/web.js"),
      ),
    }));
  },
};

const frameworkDedupePlugin: import("bun").BunPlugin = {
  name: "dedupe-frameworks",
  setup(build) {
    // Resolve vlist dist directory once — used for all "vlist" and "vlist/*" imports
    const vlistDist = dirname(
      require.resolve("@floor/vlist", { paths: [PROJECT_ROOT] }),
    );

    // vlist — resolve bare "vlist" and JS subpaths like "vlist/internals"
    // "vlist"           → dist/index.js
    // "vlist/internals" → dist/internals.js
    // Other subpaths (e.g. "vlist/styles") fall through to default resolution.
    const VLIST_JS_ENTRIES: Record<string, string> = {
      vlist: "index.js",
      "vlist/internals": "internals.js",
    };
    build.onResolve({ filter: /^vlist(\/.*)?$/ }, (args) => {
      const entry = VLIST_JS_ENTRIES[args.path];
      if (entry) return { path: join(vlistDist, entry) };
    });

    // vlist adapters — resolve to separate packages
    // "vlist-react" → "vlist-react"
    // "vlist-vue" → "vlist-vue"
    // "vlist-svelte" → "vlist-svelte"
    // "vlist-solidjs" → "vlist-solidjs"
    build.onResolve(
      { filter: /^vlist-(react|vue|svelte|solidjs)$/ },
      (args) => {
        try {
          const resolved = require.resolve(args.path, {
            paths: [PROJECT_ROOT],
          });
          return { path: resolved };
        } catch {
          return undefined;
        }
      },
    );

    // React + ReactDOM
    build.onResolve({ filter: /^react(-dom)?(\/.*)?$/ }, (args) => {
      try {
        const resolved = require.resolve(args.path, {
          paths: [PROJECT_ROOT],
        });
        return { path: resolved };
      } catch {
        return undefined;
      }
    });

    // Vue — resolve to compiler-included build for template string support
    build.onResolve({ filter: /^vue$/ }, () => {
      try {
        const resolved = require.resolve("vue/dist/vue.esm-bundler.js", {
          paths: [PROJECT_ROOT],
        });
        return { path: resolved };
      } catch {
        return undefined;
      }
    });

    // Vue sub-paths (@vue/runtime-core, @vue/reactivity, etc.)
    build.onResolve({ filter: /^@vue\// }, (args) => {
      try {
        const resolved = require.resolve(args.path, {
          paths: [PROJECT_ROOT],
        });
        return { path: resolved };
      } catch {
        return undefined;
      }
    });
  },
};

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip comments
    .replace(/\s*([{}:;,>~+])\s*/g, "$1") // collapse around symbols
    .replace(/;\}/g, "}") // drop trailing semicolons
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

interface SizeInfo {
  jsMin: number;
  jsGzip: number;
  css: number;
}

interface BuildResult {
  name: string;
  success: boolean;
  time: number;
  size?: SizeInfo;
  error?: string;
  cached?: boolean;
}

interface ManifestEntry {
  hash: string;
  size: SizeInfo;
}

type Manifest = Record<string, ManifestEntry>;

// ── Hashing ──

function hashFiles(dir: string): string {
  const h = createHash("sha1");
  const walk = (d: string): void => {
    if (!existsSync(d)) return;
    const entries = readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "dist" || e.name === "node_modules") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) {
        walk(p);
      } else {
        h.update(e.name);
        h.update(readFileSync(p));
      }
    }
  };
  walk(dir);
  return h.digest("hex");
}

/** Hash of vlist/dist/index.js — the actual file that gets bundled.
 *  Hashing src/ was wrong: the bundler resolves imports from dist/,
 *  so src changes without `bun run build` in vlist/ went undetected. */
let _vlistHash: string | null = null;
function getVlistHash(): string {
  if (_vlistHash) return _vlistHash;
  const vlistDistDir = isVlistLinked()
    ? resolve("../vlist/dist")
    : resolve("node_modules/@floor/vlist/dist");
  const vlistDist = join(vlistDistDir, "index.js");
  if (existsSync(vlistDist)) {
    const h = createHash("sha1");
    h.update(readFileSync(vlistDist));
    // Also hash the CSS files that get copied
    for (const css of ["vlist.css", "vlist-table.css", "vlist-extras.css"]) {
      const p = join(vlistDistDir, css);
      if (existsSync(p)) h.update(readFileSync(p));
    }
    _vlistHash = h.digest("hex");
  } else {
    _vlistHash = "none";
  }
  return _vlistHash;
}

/** Minimum valid size for @floor/vlist dist bundle (bytes).
 *  The real bundle is 100+ KB. A corrupted re-export stub is ~1.5 KB. */
const MIN_VALID_DIST_SIZE = 10_240;

/** True when @floor/vlist is a local file: link (dev), not an npm install (deploy). */
function isVlistLinked(): boolean {
  const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
  const spec = pkg.dependencies?.["@floor/vlist"] ?? "";
  return spec.startsWith("file:");
}

/** Check if @floor/vlist dist is missing, corrupted, or stale. */
function isVlistDistStale(): boolean {
  if (!isVlistLinked()) return false; // npm install — local dist irrelevant
  const distFile = resolve("../vlist/dist/index.js");
  if (!existsSync(distFile)) return true;

  const distStat = statSync(distFile);
  if (distStat.size < MIN_VALID_DIST_SIZE) return true;

  const distMtime = distStat.mtimeMs;
  const srcDir = resolve("../vlist/src");
  if (!existsSync(srcDir)) return false;

  const checkDir = (dir: string): boolean => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === "dist") continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (checkDir(p)) return true;
      } else if (statSync(p).mtimeMs > distMtime) {
        return true;
      }
    }
    return false;
  };

  return checkDir(srcDir);
}

/**
 * Ensure @floor/vlist dist is up-to-date before building examples.
 *
 * When the dist is stale, we auto-rebuild by spawning `bun run build.ts`
 * with cwd set to the vlist directory. This avoids the import map issue
 * (vlist.io's package.json maps "vlist" → "@floor/vlist" which would
 * create a circular reference if Bun.build() ran in this process).
 */
function ensureVlistDist(): void {
  if (!isVlistDistStale()) return;

  const vlistDir = resolve("../vlist");
  const distFile = join(vlistDir, "dist/index.js");
  const missing = !existsSync(distFile);
  const corrupt = !missing && statSync(distFile).size < MIN_VALID_DIST_SIZE;

  const label = missing ? "missing" : corrupt ? "corrupted" : "stale";
  console.log(`\n  ⚡ @floor/vlist dist is ${label} — rebuilding...\n`);

  const result = spawnSync("bun", ["run", "build.ts"], {
    cwd: vlistDir,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.error("\n  ❌  @floor/vlist build failed (exit code %d)", result.status);
    console.error("  Fix the issue and retry, or build manually:");
    console.error("\n    cd ../vlist && bun run build\n");
    process.exit(1);
  }

  console.log("");
}

function computeExampleHash(name: string): string {
  const h = createHash("sha1");
  const exampleDir = join(EXAMPLES_DIR, name);
  h.update(hashFiles(exampleDir));

  // Include parent shared files for variants
  const isVariant = ["vanilla", "react", "vue", "svelte", "solidjs"].some((v) =>
    name.endsWith(`/${v}`),
  );
  if (isVariant) {
    const parentDir = join(exampleDir, "..");
    for (const f of [
      "styles.css",
      "shared.js",
      "controls.js",
      "content.html",
    ]) {
      const p = join(parentDir, f);
      if (existsSync(p)) {
        h.update(f);
        h.update(readFileSync(p));
      }
    }
  }

  // Include global shared styles
  const globalCss = join(EXAMPLES_DIR, "styles.css");
  if (existsSync(globalCss)) {
    h.update(readFileSync(globalCss));
  }

  h.update(getVlistHash());
  h.update(isWatch ? "dev" : "prod");
  return h.digest("hex");
}

function loadManifest(): Manifest {
  if (existsSync(MANIFEST_PATH)) {
    try {
      return JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    } catch {
      return {};
    }
  }
  return {};
}

function saveManifest(manifest: Manifest): void {
  const dir = join("dist", EXAMPLES_DIR);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

/** Supported script entry point extensions, in priority order */
const SCRIPT_EXTENSIONS = ["script.tsx", "script.jsx", "script.js"] as const;

/** Find the script entry point for an example directory */
function findEntrypoint(dir: string): string | null {
  for (const name of SCRIPT_EXTENSIONS) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

async function discoverExamples(): Promise<string[]> {
  const examples: string[] = [];

  const scan = (dir: string, prefix: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "dist" || entry.name === "node_modules") continue;

      const slug = prefix ? `${prefix}/${entry.name}` : entry.name;
      const fullPath = join(dir, entry.name);

      if (findEntrypoint(fullPath)) {
        // This directory has a script entry point → it's an example
        examples.push(slug);
      } else {
        // No entry point → might be a category folder, recurse
        scan(fullPath, slug);
      }
    }
  };

  scan(EXAMPLES_DIR, "");
  return examples.sort();
}

async function buildExample(
  name: string,
  manifest?: Manifest,
): Promise<BuildResult> {
  const start = performance.now();
  const exampleDir = join(EXAMPLES_DIR, name);
  const entrypoint = findEntrypoint(exampleDir);
  const outdir = join("dist", EXAMPLES_DIR, name);

  if (!entrypoint) {
    return {
      name,
      success: false,
      time: performance.now() - start,
      error:
        "No script entry point found (script.js, script.jsx, or script.tsx)",
    };
  }

  try {
    // Check cache: skip if hash matches and output exists
    if (manifest && !isForce) {
      const hash = computeExampleHash(name);
      const cached = manifest[name];
      const jsPath = join(outdir, "script.js");
      if (cached && cached.hash === hash && existsSync(jsPath)) {
        return {
          name,
          success: true,
          time: performance.now() - start,
          size: cached.size,
          cached: true,
        };
      }
    }

    // Ensure output directory exists before building (prevents race conditions
    // with parallel builds on deeply nested paths like horizontal/basic/react)
    if (!existsSync(outdir)) {
      mkdirSync(outdir, { recursive: true });
    }

    // Shared styles support: examples with variants (vanilla/react/vue/svelte)
    // can have a shared styles.css at the example root that all variants use.
    // Example structure:
    //   photo-album/styles.css         → shared (built to dist/examples/photo-album/)
    //   photo-album/vanilla/*.js       → variant (built to dist/examples/photo-album/vanilla/)
    //   photo-album/react/*.jsx        → variant (built to dist/examples/photo-album/react/)
    // Each variant can optionally have its own styles.css for overrides.
    const isVariant = ["vanilla", "react", "vue", "svelte"].some((v) =>
      name.endsWith(`/${v}`),
    );
    if (isVariant) {
      const parentDir = join(exampleDir, "..");
      const sharedCssPath = join(parentDir, "styles.css");
      // Get parent example name (e.g., "photo-album" from "photo-album/vanilla")
      const parentName = name.split("/").slice(0, -1).join("/");
      const parentOutdir = join("dist", EXAMPLES_DIR, parentName);

      if (existsSync(sharedCssPath)) {
        if (!existsSync(parentOutdir)) {
          mkdirSync(parentOutdir, { recursive: true });
        }
        const raw = readFileSync(sharedCssPath, "utf-8");
        const minified = minifyCss(raw);
        writeFileSync(join(parentOutdir, "styles.css"), minified);
      }
    }
    // Always use dedupe plugin (needed for vlist imports + frameworks)
    // Add SolidJS Babel transform for solidjs variant directories
    const plugins: import("bun").BunPlugin[] = [frameworkDedupePlugin];
    if (name.includes("/solidjs") || name.startsWith("solidjs/")) {
      plugins.push(solidJsxPlugin, solidBrowserPlugin);
    }

    // Define Vue feature flags for production builds
    const define: Record<string, string> = {};
    if (name.includes("/vue") || name.startsWith("vue/")) {
      define["__VUE_OPTIONS_API__"] = "true";
      define["__VUE_PROD_DEVTOOLS__"] = "false";
      define["__VUE_PROD_HYDRATION_MISMATCH_DETAILS__"] = "false";
    }

    let result;
    try {
      result = await Bun.build({
        entrypoints: [entrypoint],
        outdir,
        ...BUILD_OPTIONS,
        plugins,
        define: Object.keys(define).length > 0 ? define : undefined,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`\n[${name}] ── Build exception ──`);
      console.error(`[${name}]   message: ${errorMsg}`);

      // Use Bun.inspect for full dump (catches non-enumerable + prototype props)
      if (err && typeof err === "object") {
        try {
          console.error(
            `[${name}]   inspect:\n${Bun.inspect(err, { depth: 4, colors: true })}`,
          );
        } catch {
          // fallback: dump own + prototype keys
          const allKeys = new Set([
            ...Object.getOwnPropertyNames(err),
            ...Object.keys(err as Record<string, unknown>),
          ]);
          for (const key of allKeys) {
            if (key === "stack") continue;
            const val = (err as any)[key];
            if (key === "logs" && Array.isArray(val)) {
              console.error(`[${name}]   logs (${val.length}):`);
              for (const log of val) {
                const pos = log.position
                  ? ` at ${log.position.file ?? "?"}:${log.position.line ?? "?"}:${log.position.column ?? "?"}`
                  : "";
                console.error(
                  `[${name}]     ${log.level ?? "error"}: ${log.message}${pos}`,
                );
              }
            } else {
              try {
                console.error(`[${name}]   ${key}: ${JSON.stringify(val)}`);
              } catch {
                console.error(`[${name}]   ${key}: ${String(val)}`);
              }
            }
          }
        }
      }

      if (err instanceof Error && err.stack) {
        console.error(`[${name}]   stack:\n${err.stack}`);
      }
      return {
        name,
        success: false,
        time: performance.now() - start,
        error: `Build exception: ${errorMsg}`,
      };
    }

    if (!result.success) {
      const errors = result.logs
        .map((log) => {
          console.error(`[${name}] ${log.level}: ${log.message}`);
          return log.message;
        })
        .join("\n");
      return {
        name,
        success: false,
        time: performance.now() - start,
        error: errors || "Unknown bundle error",
      };
    }

    // Minify CSS if styles.css exists (variant-specific or example-specific)
    const cssPath = join(exampleDir, "styles.css");
    let cssSize = 0;
    if (existsSync(cssPath)) {
      const raw = readFileSync(cssPath, "utf-8");
      const minified = minifyCss(raw);
      writeFileSync(join(outdir, "styles.css"), minified);
      cssSize = Buffer.byteLength(minified, "utf-8");
    }

    // If this is a variant, also account for shared styles size
    if (isVariant) {
      const parentDir = join(exampleDir, "..");
      const sharedCssPath = join(parentDir, "styles.css");
      if (existsSync(sharedCssPath)) {
        const sharedRaw = readFileSync(sharedCssPath, "utf-8");
        const sharedMinified = minifyCss(sharedRaw);
        cssSize += Buffer.byteLength(sharedMinified, "utf-8");
      }
    }

    // Measure JS bundle size and pre-compress
    const jsPath = join(outdir, "script.js");
    const jsMin = Bun.file(jsPath).size;
    const jsGzip = gzipSize(jsPath);
    preCompress(jsPath);

    return {
      name,
      success: true,
      time: performance.now() - start,
      size: { jsMin, jsGzip, css: cssSize },
    };
  } catch (err) {
    return {
      name,
      success: false,
      time: performance.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

function printResult(result: BuildResult): void {
  if (result.success) return;

  const time = `${result.time.toFixed(0)}ms`;
  console.log(`❌ ${result.name.padEnd(20)} ${time.padStart(5)}`);
  if (result.error) {
    console.log(`   └─ ${result.error}`);
  }
}

function printWatchResult(result: BuildResult): void {
  const time = `${result.time.toFixed(0)}ms`;
  if (result.success && result.size) {
    const { jsGzip, css } = result.size;
    const cssStr = css > 0 ? ` + ${formatKB(css)} css` : "";
    console.log(
      `✅ ${result.name}  ${formatKB(jsGzip)} KB gzip${cssStr}  (${time})`,
    );
  } else if (result.success) {
    console.log(`✅ ${result.name}  (${time})`);
  } else {
    console.log(`❌ ${result.name}  (${time})`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  }
}

function printSizeTable(results: BuildResult[]): void {
  const successful = results.filter((r) => r.success && r.size);
  if (successful.length === 0) return;

  let totalJsGzip = 0;
  let totalCss = 0;

  for (const r of successful) {
    const s = r.size!;
    totalJsGzip += s.jsGzip;
    totalCss += s.css;
  }

  const grandTotal = totalJsGzip + totalCss;
  console.log(
    `   Total: ${formatKB(totalJsGzip)} KB gzip + ${formatKB(totalCss)} KB css = ${formatKB(grandTotal)} KB`,
  );
}

function buildSharedCss(): void {
  const cssPath = join(EXAMPLES_DIR, "styles.css");
  const outdir = join("dist", EXAMPLES_DIR);

  if (!existsSync(cssPath)) return;

  if (!existsSync(outdir)) mkdirSync(outdir, { recursive: true });

  const raw = readFileSync(cssPath, "utf-8");
  const minified = minifyCss(raw);
  writeFileSync(join(outdir, "styles.css"), minified);
}

async function main() {
  const totalStart = performance.now();

  // Fail fast if @floor/vlist dist is missing, corrupted, or stale
  ensureVlistDist();

  // Force mode: clean everything
  const distExamplesDir = join("dist", EXAMPLES_DIR);
  if (isForce && existsSync(distExamplesDir)) {
    rmSync(distExamplesDir, { recursive: true });
  }

  // Load cache manifest
  const manifest = isForce ? {} : loadManifest();

  // Invalidate vlist hash so it's recomputed fresh
  _vlistHash = null;

  // Build shared CSS first
  buildSharedCss();

  // Discover all examples
  const examples = await discoverExamples();

  if (examples.length === 0) {
    console.log("⚠️  No examples found in", EXAMPLES_DIR);
    process.exit(0);
  }

  // Build all examples in parallel (with cache)
  const results = await Promise.all(
    examples.map((name) => buildExample(name, manifest)),
  );

  // Update manifest with successful builds
  const newManifest: Manifest = {};
  for (const r of results) {
    if (r.success && r.size) {
      const hash = r.cached
        ? (manifest[r.name]?.hash ?? computeExampleHash(r.name))
        : computeExampleHash(r.name);
      newManifest[r.name] = { hash, size: r.size };
    }
  }
  saveManifest(newManifest);

  // Report failures
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const cached = results.filter((r) => r.cached);
  const built = successful.filter((r) => !r.cached);

  for (const result of failed) {
    printResult(result);
  }

  const totalTime = (performance.now() - totalStart).toFixed(0);

  const parts: string[] = [];
  if (built.length > 0) parts.push(`${built.length} built`);
  if (cached.length > 0) parts.push(`${cached.length} cached`);
  if (failed.length > 0) parts.push(`${failed.length} failed`);

  console.log(
    `✨ ${successful.length}/${results.length} examples (${parts.join(", ")}) in ${totalTime}ms`,
  );
  printSizeTable(results);

  if (failed.length > 0) {
    process.exit(1);
  }
}

async function watchMode() {
  console.log("👀 Watching examples for changes...\n");

  // Initial build
  await main();

  // Watch shared styles.css
  watch(EXAMPLES_DIR, { recursive: false }, async (_event, filename) => {
    if (filename === "styles.css") {
      console.log(`\n📝 styles.css changed`);
      buildSharedCss();
    }
  });

  // Watch vlist dist directory for changes (not src — vlist has its own
  // watcher that rebuilds dist, so we react to the build output to avoid
  // racing with a mid-write dist).
  const vlistDistDir = resolve("../vlist/dist");
  if (existsSync(vlistDistDir)) {
    let debounce: ReturnType<typeof setTimeout> | null = null;
    console.log("👀 Watching vlist/dist for changes...\n");
    watch(vlistDistDir, { recursive: false }, async (_event, filename) => {
      if (filename && (filename.endsWith(".js") || filename.endsWith(".css"))) {
        // Debounce: vlist build writes multiple files in quick succession
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(async () => {
          debounce = null;
          console.log(`\n📝 vlist/dist changed — rebuilding all examples...`);
          _vlistHash = null; // invalidate cached hash
          await main();
        }, 200);
      }
    });
  }

  // Watch each examples directory (including nested category folders)
  const examples = await discoverExamples();
  const watchedDirs = new Set<string>();

  for (const name of examples) {
    const dir = join(EXAMPLES_DIR, name);

    // For nested examples like "builder/chat", also watch the parent
    // category folder so new examples are detected
    const parts = name.split("/");
    if (parts.length > 1) {
      const categoryDir = join(EXAMPLES_DIR, parts[0]);
      if (!watchedDirs.has(categoryDir)) {
        watchedDirs.add(categoryDir);
        watch(categoryDir, { recursive: true }, async (_event, filename) => {
          if (
            filename &&
            !filename.includes("dist") &&
            !filename.includes("node_modules")
          ) {
            const category = parts[0];

            // If the file is at the root of the category (no subfolder),
            // e.g. "styles.css" or "shared.js", rebuild all variants
            if (!filename.includes("/")) {
              console.log(
                `\n📝 ${category}/${filename} changed - rebuilding all variants...`,
              );
              const allExamples = await discoverExamples();
              const variants = allExamples.filter((e) =>
                e.startsWith(category + "/"),
              );
              for (const variant of variants) {
                const result = await buildExample(variant);
                printWatchResult(result);
              }

              // Also rebuild shared CSS if it was a styles.css change
              if (filename === "styles.css") {
                const sharedCssPath = join(categoryDir, "styles.css");
                const parentOutdir = join("dist", EXAMPLES_DIR, category);
                if (existsSync(sharedCssPath)) {
                  if (!existsSync(parentOutdir))
                    mkdirSync(parentOutdir, { recursive: true });
                  const raw = readFileSync(sharedCssPath, "utf-8");
                  const minified = minifyCss(raw);
                  writeFileSync(join(parentOutdir, "styles.css"), minified);
                  console.log(`✅ ${category}/styles.css rebuilt`);
                }
              }
            } else {
              // File is inside a variant subfolder, rebuild just that variant
              const exampleName = `${category}/${filename.split("/")[0]}`;
              console.log(
                `\n📝 ${exampleName}/${filename.split("/").slice(1).join("/")} changed`,
              );
              const result = await buildExample(exampleName);
              printWatchResult(result);
            }
          }
        });
      }
    } else {
      if (!watchedDirs.has(dir)) {
        watchedDirs.add(dir);
        watch(dir, { recursive: true }, async (_event, filename) => {
          if (
            filename &&
            !filename.includes("dist") &&
            !filename.includes("node_modules")
          ) {
            console.log(`\n📝 ${name}/${filename} changed`);
            const result = await buildExample(name);
            printWatchResult(result);
          }
        });
      }
    }
  }
}

if (isWatch) {
  watchMode().catch((err) => {
    console.error("❌ Watch failed:", err);
    process.exit(1);
  });
} else {
  main().catch((err) => {
    console.error("❌ Build failed:", err);
    process.exit(1);
  });
}
