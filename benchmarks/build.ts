// benchmarks/build.ts — Build the benchmark page
//
// Usage:
//   bun run benchmarks/build.ts
//   bun run benchmarks/build.ts --watch

import {
  existsSync,
  readFileSync,
  writeFileSync,
  watch,
  readdirSync,
} from "fs";
import { join } from "path";
import { preCompress, formatKB, gzipSize } from "../scripts/build-utils";

const isWatch = process.argv.includes("--watch");
const BENCHMARKS_DIR = "./benchmarks";
const OUT_DIR = "./dist/benchmarks";

const PROJECT_ROOT = "./";

const BUILD_OPTIONS = {
  format: "esm" as const,
  target: "browser" as const,
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

const frameworkDedupePlugin: import("bun").BunPlugin = {
  name: "dedupe-frameworks",
  setup(build) {
    // vlist — resolve bare imports via package.json imports map
    // "vlist" → "@floor/vlist"
    // "vlist/react" → "@floor/vlist/react"
    build.onResolve({ filter: /^vlist(\/.*)?$/ }, (args) => {
      try {
        const subpath = args.path.replace(/^vlist/, "@floor/vlist");
        const resolved = require.resolve(subpath, {
          paths: [PROJECT_ROOT],
        });
        return { path: resolved };
      } catch {
        return undefined;
      }
    });

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

const buildOptions = () => ({
  ...BUILD_OPTIONS,
  minify: !isWatch,
  sourcemap: isWatch ? ("inline" as const) : ("none" as const),
});

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // strip comments
    .replace(/\s*([{}:;,>~+])\s*/g, "$1") // collapse around symbols
    .replace(/;\}/g, "}") // drop trailing semicolons
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

/**
 * Discover all suite variants that need to be built.
 * Scans benchmarks/{name}/{variant}/suite.js
 */
function discoverSuites(): string[] {
  const suites: string[] = [];
  const entries = readdirSync(BENCHMARKS_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "suites") continue;

    const benchDir = join(BENCHMARKS_DIR, entry.name);
    const variants = readdirSync(benchDir, { withFileTypes: true });

    for (const variant of variants) {
      if (!variant.isDirectory()) continue;

      const suitePath = join(benchDir, variant.name, "suite.js");
      if (existsSync(suitePath)) {
        suites.push(`${entry.name}/${variant.name}`);
      }
    }
  }

  return suites;
}

async function build(): Promise<void> {
  const start = performance.now();
  const entrypoint = join(BENCHMARKS_DIR, "script.js");
  const runnerPath = join(BENCHMARKS_DIR, "runner.js");
  const outdir = OUT_DIR;

  if (!existsSync(entrypoint)) {
    console.error("❌ benchmarks/script.js not found");
    process.exit(1);
  }

  console.log("🔨 Building benchmarks...\n");

  try {
    // Build runner.js first as a shared module
    console.log("Building runner.js...");
    const runnerResult = await Bun.build({
      entrypoints: [runnerPath],
      outdir,
      ...buildOptions(),
      plugins: [frameworkDedupePlugin],
    });

    if (!runnerResult.success) {
      const errors = runnerResult.logs.map((log) => log.message).join("\n");
      console.error("❌ Runner build failed:\n", errors);
      process.exit(1);
    }
    console.log("✅ Runner built");

    // Build main script
    console.log("Building main script.js...");

    // Define Vue feature flags for production builds
    const define: Record<string, string> = {
      __VUE_OPTIONS_API__: "true",
      __VUE_PROD_DEVTOOLS__: "false",
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
    };

    let result;
    try {
      result = await Bun.build({
        entrypoints: [entrypoint],
        outdir,
        ...buildOptions(),
        plugins: [frameworkDedupePlugin],
        define,
      });
    } catch (err) {
      console.error("❌ Build exception:");
      console.error(err);
      process.exit(1);
    }

    if (!result.success) {
      const errors = result.logs.map((log) => log.message).join("\n");
      console.error("❌ Main script build failed:\n", errors);
      console.error("\nBuild logs:");
      result.logs.forEach((log) => {
        console.error(log);
      });
      process.exit(1);
    }
    console.log("✅ Main script built");

    // Suites are now bundled into main script.js, no separate builds needed

    // Minify CSS
    const cssPath = join(BENCHMARKS_DIR, "styles.css");
    let cssSize = 0;
    if (existsSync(cssPath)) {
      const raw = readFileSync(cssPath, "utf-8");
      const minified = minifyCss(raw);
      const cssOutPath = join(outdir, "styles.css");
      writeFileSync(cssOutPath, minified);
      cssSize = Buffer.byteLength(minified, "utf-8");
      preCompress(cssOutPath);
    }

    // Measure JS bundle size and pre-compress
    const jsPath = join(outdir, "script.js");
    const jsMin = Bun.file(jsPath).size;
    const jsGzip = gzipSize(jsPath);
    preCompress(jsPath);

    // Pre-compress runner.js as well
    const runnerOutPath = join(outdir, "runner.js");
    if (existsSync(runnerOutPath)) preCompress(runnerOutPath);

    const elapsed = (performance.now() - start).toFixed(0);

    console.log(
      `✅ benchmarks   ${elapsed}ms   ${formatKB(jsMin)} KB → ${formatKB(jsGzip)} KB gzip` +
        (cssSize > 0 ? `   css ${formatKB(cssSize)} KB` : ""),
    );
  } catch (err) {
    console.error(
      "❌ Build error:",
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}

async function watchMode(): Promise<void> {
  console.log("👀 Watching benchmarks for changes...\n");
  await build();

  // Watch main benchmarks directory and suite variants
  watch(BENCHMARKS_DIR, { recursive: true }, async (_event, filename) => {
    if (
      filename &&
      !filename.includes("dist") &&
      !filename.includes("node_modules") &&
      (filename.endsWith(".js") || filename.endsWith(".css"))
    ) {
      console.log(`\n📝 benchmarks/${filename} changed`);
      await build();
    }
  });
}

if (isWatch) {
  watchMode().catch((err) => {
    console.error("❌ Watch failed:", err);
    process.exit(1);
  });
} else {
  build().catch((err) => {
    console.error("❌ Build failed:", err);
    process.exit(1);
  });
}
