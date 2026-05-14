#!/usr/bin/env bun

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer";
import config from "./config.json" with { type: "json" };

const root = resolve(import.meta.dirname, "../..");
const vlistRoot = resolve(root, "../vlist");

const parseList = (value, fallback) => {
  if (!value) return fallback;
  return value.split(",").map((item) => item.trim()).filter(Boolean);
};

const parseNumberList = (value, fallback) => {
  if (!value) return fallback;
  return value.split(",").map((item) => Number(item.trim())).filter(Number.isFinite);
};

const args = new Map();
for (const arg of process.argv.slice(2)) {
  const match = arg.match(/^--([^=]+)(?:=(.*))?$/);
  if (match) args.set(match[1], match[2] ?? "true");
}

const baseUrl = args.get("url") ?? process.env.BENCH_URL ?? config.baseUrl;
const port = new URL(baseUrl).port || "3348";
const suiteIds = parseList(args.get("suites") ?? process.env.BENCH_SUITES, config.suiteIds);
const itemCounts = parseNumberList(args.get("item-counts") ?? process.env.BENCH_ITEM_COUNTS, config.itemCounts);
const outputDir = resolve(root, args.get("output-dir") ?? process.env.BENCH_OUTPUT_DIR ?? config.outputDir);
const skipBuild = args.has("skip-build") || process.env.BENCH_SKIP_BUILD === "1";
const externalServer = args.has("url") || process.env.BENCH_URL;
const scrollSpeed = Number(args.get("scroll-speed") ?? process.env.BENCH_SCROLL_SPEED ?? config.scrollSpeed ?? 0);
const stressMs = Number(args.get("stress-ms") ?? process.env.BENCH_STRESS_MS ?? config.stressMs ?? 0);

const metadata = {
  gitSha: process.env.GITHUB_SHA ?? process.env.BENCH_GIT_SHA ?? null,
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || process.env.BENCH_BRANCH || null,
  prNumber: process.env.GITHUB_EVENT_NAME === "pull_request"
    ? Number(process.env.GITHUB_REF_NAME?.split("/")?.[0]) || null
    : Number(process.env.BENCH_PR_NUMBER) || null,
  workflowRunId: process.env.GITHUB_RUN_ID ?? null,
  workflowName: process.env.GITHUB_WORKFLOW ?? null,
  runnerOs: process.env.RUNNER_OS ?? null,
  baselineSha: process.env.BENCH_BASELINE_SHA ?? null,
};

const run = async (cmd, cmdArgs, options = {}) => {
  console.log(`$ ${[cmd, ...cmdArgs].join(" ")}`);
  const proc = Bun.spawn([cmd, ...cmdArgs], {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...options.env },
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${cmd} ${cmdArgs.join(" ")} exited with ${code}`);
  }
};

const waitForServer = async (url, timeoutMs = 15_000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server is not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
};

const startServer = async () => {
  const proc = Bun.spawn(["bun", "server.ts"], {
    cwd: root,
    env: { ...process.env, PORT: port },
    stdout: "ignore",
    stderr: "inherit",
  });

  proc.exited.then((code) => {
    if (!stopping && code !== 0) {
      console.error(`[bench:ci] server exited with ${code}`);
    }
  });

  return proc;
};

const launchBrowser = async () => {
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  const channel = process.env.PUPPETEER_CHANNEL;
  const launchOptions = {
    headless: process.env.BENCH_HEADLESS === "false" ? false : "new",
    executablePath,
    channel,
    defaultViewport: { width: 1440, height: 1000, deviceScaleFactor: 1 },
    args: [
      "--js-flags=--expose-gc",
      "--enable-precise-memory-info",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-dev-shm-usage",
      ...(process.env.CI ? ["--no-sandbox"] : []),
    ],
  };

  try {
    return await puppeteer.launch(launchOptions);
  } catch (error) {
    if (executablePath || channel) throw error;
    return puppeteer.launch({ ...launchOptions, channel: "chrome" });
  }
};

let server = null;
let browser = null;
let stopping = false;

try {
  if (!skipBuild) {
    if (existsSync(resolve(vlistRoot, "package.json"))) {
      await run("bun", ["run", "build"], { cwd: vlistRoot });
    }
    await run("bun", ["run", "build:bench"]);
  }

  if (!externalServer) {
    server = await startServer();
    await waitForServer(`${baseUrl}/benchmarks/render?variant=vanilla`);
  }

  browser = await launchBrowser();
  const page = await browser.newPage();

  page.on("console", (msg) => {
    const text = msg.text();
    if (text.startsWith("[bench:ci]")) console.log(text);
  });

  await page.goto(`${baseUrl}/benchmarks/render?variant=vanilla`, {
    waitUntil: "networkidle0",
    timeout: 60_000,
  });

  await page.waitForFunction(() => globalThis.__vlistBenchmarks, {
    timeout: 30_000,
  });

  const results = await page.evaluate(async (options) => {
    const host = document.createElement("div");
    host.id = "bench-ci-host";
    host.style.cssText = [
      "position:fixed",
      "inset:0",
      "width:100vw",
      "height:100vh",
      "z-index:2147483647",
      "background:#fff",
      "overflow:hidden",
    ].join(";");
    document.body.appendChild(host);

    const api = globalThis.__vlistBenchmarks;
    const statusLog = [];
    const results = await api.runBenchmarks({
      itemCounts: options.itemCounts,
      suiteIds: options.suiteIds,
      scrollSpeed: options.scrollSpeed,
      stressMs: options.stressMs,
      container: host,
      getContainer: () => host,
      onStatus: (suiteId, itemCount, message) => {
        statusLog.push({ suiteId, itemCount, message });
        console.log(`[bench:ci] ${suiteId}/${itemCount}: ${message}`);
      },
    });

    host.remove();
    return {
      version: api.version(),
      userAgent: navigator.userAgent,
      hardwareConcurrency: navigator.hardwareConcurrency ?? null,
      deviceMemory: navigator.deviceMemory ?? null,
      statusLog,
      results,
    };
  }, { suiteIds, itemCounts, scrollSpeed, stressMs });

  const now = new Date().toISOString();
  const payload = {
    schemaVersion: 1,
    generatedAt: now,
    baseUrl,
    config: { suiteIds, itemCounts, scrollSpeed, stressMs },
    metadata,
    environment: {
      vlistVersion: results.version,
      userAgent: results.userAgent,
      hardwareConcurrency: results.hardwareConcurrency,
      deviceMemory: results.deviceMemory,
    },
    results: results.results,
  };

  await mkdir(outputDir, { recursive: true });
  const latestPath = resolve(outputDir, "latest.json");
  const datedPath = resolve(outputDir, `${now.replace(/[:.]/g, "-")}.json`);
  await writeFile(latestPath, `${JSON.stringify(payload, null, 2)}\n`);
  await writeFile(datedPath, `${JSON.stringify(payload, null, 2)}\n`);

  const summaryPath = resolve(outputDir, "summary.md");
  const lines = [
    "# vlist Performance Benchmark",
    "",
    `Generated: ${now}`,
    `vlist: ${results.version}`,
    "",
    "| Suite | Items | Metric | Value | Rating |",
    "| --- | ---: | --- | ---: | --- |",
  ];
  for (const result of results.results) {
    if (!result.success) {
      lines.push(`| ${result.suiteId} | ${result.itemCount} | Error | ${result.error ?? "failed"} | bad |`);
      continue;
    }
    for (const metric of result.metrics) {
      lines.push(`| ${result.suiteId} | ${result.itemCount} | ${metric.label} | ${metric.value} ${metric.unit ?? ""} | ${metric.rating ?? ""} |`);
    }
  }
  await writeFile(summaryPath, `${lines.join("\n")}\n`);

  console.log(`\nWrote ${latestPath}`);
  console.log(`Wrote ${summaryPath}`);
} finally {
  stopping = true;
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
}
