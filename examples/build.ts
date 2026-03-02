// build.ts - Auto-discover and build all examples examples in parallel
import {
  readdirSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  watch,
} from "fs";
import { join, resolve } from "path";
import { brotliCompressSync, gzipSync, constants } from "zlib";
import { transformSync } from "@babel/core";

const isWatch = process.argv.includes("--watch");

const EXAMPLES_DIR = "./examples";
const PROJECT_ROOT = resolve(".");

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
// copies from vlist.dev/node_modules/. Framework hooks/reactivity crash if two
// copies coexist. This plugin forces all framework imports to resolve from
// vlist.dev's node_modules, guaranteeing a single instance in the bundle.
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
    // vlist — resolve bare imports via package.json imports map
    // "vlist" → "@floor/vlist"
    build.onResolve({ filter: /^vlist$/ }, (args) => {
      try {
        const resolved = require.resolve("@floor/vlist", {
          paths: [PROJECT_ROOT],
        });
        return { path: resolved };
      } catch {
        return undefined;
      }
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

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

function gzipSize(path: string): number {
  const raw = readFileSync(path);
  return Bun.gzipSync(new Uint8Array(raw)).byteLength;
}

/**
 * Pre-compress a file with brotli and gzip, writing .br and .gz siblings.
 * This avoids expensive synchronous compression at serve time.
 */
function preCompress(filePath: string): void {
  const raw = readFileSync(filePath);
  if (raw.length < 1024) return; // skip tiny files

  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 6, // good balance of speed vs ratio
    },
  });
  writeFileSync(filePath + ".br", br);

  const gz = gzipSync(raw, { level: 6 });
  writeFileSync(filePath + ".gz", gz);
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
  error?: string;
  size?: SizeInfo;
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

async function buildExample(name: string): Promise<BuildResult> {
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
  const icon = result.success ? "✅" : "❌";
  const time = `${result.time.toFixed(0)}ms`;

  if (result.success && result.size) {
    const { jsMin, jsGzip, css } = result.size;
    const sizeStr = `${formatKB(jsMin)} KB → ${formatKB(jsGzip)} KB gzip`;
    const cssStr = css > 0 ? `  css ${formatKB(css)} KB` : "";
    console.log(
      `${icon} ${result.name.padEnd(20)} ${time.padStart(5)}   ${sizeStr}${cssStr}`,
    );
  } else {
    console.log(`${icon} ${result.name.padEnd(20)} ${time.padStart(5)}`);
    if (result.error) {
      console.log(`   └─ ${result.error}`);
    }
  }
}

function printSizeTable(results: BuildResult[]): void {
  const successful = results.filter((r) => r.success && r.size);
  if (successful.length === 0) return;

  console.log("");
  console.log(
    `${"  Example".padEnd(24)} ${"JS min".padStart(9)} ${"JS gzip".padStart(9)} ${"CSS".padStart(9)} ${"Total".padStart(9)}`,
  );
  console.log(`  ${"─".repeat(58)}`);

  let totalJsMin = 0;
  let totalJsGzip = 0;
  let totalCss = 0;

  for (const r of successful) {
    const s = r.size!;
    const total = s.jsGzip + s.css;
    totalJsMin += s.jsMin;
    totalJsGzip += s.jsGzip;
    totalCss += s.css;

    console.log(
      `  ${r.name.padEnd(22)} ${(formatKB(s.jsMin) + " KB").padStart(9)} ${(formatKB(s.jsGzip) + " KB").padStart(9)} ${s.css > 0 ? (formatKB(s.css) + " KB").padStart(9) : "—".padStart(9)} ${(formatKB(total) + " KB").padStart(9)}`,
    );
  }

  const grandTotal = totalJsGzip + totalCss;
  console.log(`  ${"─".repeat(58)}`);
  console.log(
    `  ${"Total".padEnd(22)} ${(formatKB(totalJsMin) + " KB").padStart(9)} ${(formatKB(totalJsGzip) + " KB").padStart(9)} ${(formatKB(totalCss) + " KB").padStart(9)} ${(formatKB(grandTotal) + " KB").padStart(9)}`,
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
  const size = Buffer.byteLength(minified, "utf-8");
  console.log(`✅ ${"styles.css".padEnd(20)}          ${formatKB(size)} KB\n`);
}

async function main() {
  const totalStart = performance.now();

  console.log("🔨 Building examples...\n");

  // Build shared CSS first
  buildSharedCss();

  // Discover all examples
  const examples = await discoverExamples();

  if (examples.length === 0) {
    console.log("⚠️  No examples found in", EXAMPLES_DIR);
    process.exit(0);
  }

  console.log(`📦 Found ${examples.length} examples: ${examples.join(", ")}\n`);

  // Build all examples in parallel
  const results = await Promise.all(examples.map(buildExample));

  // Report results
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  for (const result of results) {
    printResult(result);
  }

  // Size summary table
  printSizeTable(results);

  const totalTime = (performance.now() - totalStart).toFixed(0);

  console.log("\n" + "─".repeat(40));
  console.log(
    `✨ Built ${successful.length}/${results.length} examples in ${totalTime}ms`,
  );

  if (failed.length > 0) {
    console.log(`\n⚠️  ${failed.length} example(s) failed to build`);
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

  // Watch vlist src directory for changes
  const vlistSrcDir = resolve("../vlist/src");
  if (existsSync(vlistSrcDir)) {
    console.log("👀 Watching vlist/src for changes...\n");
    watch(vlistSrcDir, { recursive: true }, async (_event, filename) => {
      if (
        filename &&
        (filename.endsWith(".ts") ||
          filename.endsWith(".tsx") ||
          filename.endsWith(".js") ||
          filename.endsWith(".jsx"))
      ) {
        console.log(
          `\n📝 vlist/src/${filename} changed - rebuilding all examples...`,
        );
        await main();
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
            // Determine which example changed from the filename path
            const exampleName = `${parts[0]}/${filename.split("/")[0]}`;
            console.log(
              `\n📝 ${exampleName}/${filename.split("/").slice(1).join("/")} changed`,
            );
            const result = await buildExample(exampleName);
            printResult(result);
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
            printResult(result);
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
