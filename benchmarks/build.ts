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

const isWatch = process.argv.includes("--watch");
const BENCHMARKS_DIR = "./benchmarks";

const BUILD_OPTIONS = {
  format: "esm" as const,
  target: "browser" as const,
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

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

function gzipSize(path: string): number {
  const raw = readFileSync(path);
  return Bun.gzipSync(new Uint8Array(raw)).byteLength;
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
    if (entry.name === "dist" || entry.name === "suites") continue;

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
  const outdir = join(BENCHMARKS_DIR, "dist");

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
    });

    if (!runnerResult.success) {
      const errors = runnerResult.logs.map((log) => log.message).join("\n");
      console.error("❌ Runner build failed:\n", errors);
      process.exit(1);
    }
    console.log("✅ Runner built");

    // Build main script
    console.log("Building main script.js...");
    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir,
      ...buildOptions(),
    });

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
      writeFileSync(join(outdir, "styles.css"), minified);
      cssSize = Buffer.byteLength(minified, "utf-8");
    }

    // Measure JS bundle
    const jsPath = join(outdir, "script.js");
    const jsMin = Bun.file(jsPath).size;
    const jsGzip = gzipSize(jsPath);

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
