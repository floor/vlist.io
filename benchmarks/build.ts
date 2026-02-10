// benchmarks/build.ts — Build the benchmark page
//
// Usage:
//   bun run benchmarks/build.ts
//   bun run benchmarks/build.ts --watch

import { existsSync, readFileSync, writeFileSync, watch } from "fs";
import { join } from "path";

const isWatch = process.argv.includes("--watch");
const BENCHMARKS_DIR = "./benchmarks";

const BUILD_OPTIONS = {
  minify: true,
  format: "esm" as const,
  target: "browser" as const,
  sourcemap: "none" as const,
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

async function build(): Promise<void> {
  const start = performance.now();
  const entrypoint = join(BENCHMARKS_DIR, "script.js");
  const outdir = join(BENCHMARKS_DIR, "dist");

  if (!existsSync(entrypoint)) {
    console.error("❌ benchmarks/script.js not found");
    process.exit(1);
  }

  console.log("🔨 Building benchmarks...\n");

  try {
    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir,
      ...BUILD_OPTIONS,
    });

    if (!result.success) {
      const errors = result.logs.map((log) => log.message).join("\n");
      console.error("❌ Build failed:\n", errors);
      process.exit(1);
    }

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

  const dirs = [BENCHMARKS_DIR, join(BENCHMARKS_DIR, "suites")];

  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    watch(dir, { recursive: false }, async (_event, filename) => {
      if (
        filename &&
        !filename.includes("dist") &&
        (filename.endsWith(".js") || filename.endsWith(".css"))
      ) {
        console.log(`\n📝 benchmarks/${filename} changed`);
        await build();
      }
    });
  }
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
