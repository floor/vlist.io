/**
 * debug/v1 — Manage the v1 vlist.io comparison server.
 *
 * Uses the persistent copy at ../vlist.io-v1 (staging branch, vlist v1.9.x).
 * The copy is set up once manually; this module just starts/stops the server.
 *
 * CLI:
 *   bun scripts/debug/v1.mjs start     # Start v1 server on 3340
 *   bun scripts/debug/v1.mjs stop      # Kill the server
 *   bun scripts/debug/v1.mjs status    # Check state
 *
 * Programmatic:
 *   import { ensureV1, stopV1 } from "./v1.mjs";
 *   const port = await ensureV1();   // start if not already running
 *   // ... run tests ...
 *   await stopV1();
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, join } from "path";
import { execSync, spawn } from "child_process";

const VLIST_IO_ROOT = resolve(import.meta.dir, "../..");
const V1_ROOT = resolve(VLIST_IO_ROOT, "../vlist.io-v1");
const V1_PORT = 3340;
const PID_FILE = join(import.meta.dir, ".v1-server.pid");

function log(msg) {
  console.log(`  [v1] ${msg}`);
}

// =============================================================================
// Start / Stop
// =============================================================================

export async function startV1() {
  if (!existsSync(V1_ROOT)) {
    throw new Error(`v1 copy not found at ${V1_ROOT}`);
  }

  if (isRunning()) {
    log(`Already running (pid ${readPid()}) on port ${V1_PORT}`);
    return V1_PORT;
  }

  log(`Starting v1 server on port ${V1_PORT}...`);
  const proc = spawn("bun", ["run", "server.ts"], {
    cwd: V1_ROOT,
    env: { ...process.env, PORT: String(V1_PORT) },
    stdio: "ignore",
    detached: true,
  });
  proc.unref();

  writeFileSync(PID_FILE, String(proc.pid));

  await waitForServer(V1_PORT, 10000);
  log(`Ready on http://localhost:${V1_PORT}`);
  return V1_PORT;
}

export async function stopV1() {
  const pid = readPid();
  if (!pid) {
    log("No server running.");
    return;
  }

  try {
    process.kill(pid, "SIGTERM");
    log(`Stopped (pid ${pid})`);
  } catch {
    log(`Process ${pid} already dead`);
  }
  rmPid();
}

export async function ensureV1() {
  return startV1();
}

export function v1Ready() {
  return isRunning();
}

export { V1_PORT };

// =============================================================================
// Helpers
// =============================================================================

function readPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = parseInt(readFileSync(PID_FILE, "utf-8").trim(), 10);
  if (isNaN(pid)) return null;
  try {
    process.kill(pid, 0);
    return pid;
  } catch {
    rmPid();
    return null;
  }
}

function rmPid() {
  try { execSync(`rm "${PID_FILE}"`, { stdio: "ignore" }); } catch {}
}

function isRunning() {
  return readPid() !== null;
}

async function waitForServer(port, timeout) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://localhost:${port}/`);
      if (res.ok || res.status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`v1 server did not start within ${timeout}ms`);
}

// =============================================================================
// CLI
// =============================================================================

const isMain = process.argv[1]?.endsWith("/v1.mjs");
const cmd = isMain ? process.argv[2] : null;
if (cmd) {
  const commands = {
    start: startV1,
    stop: stopV1,
    status: async () => {
      const exists = existsSync(V1_ROOT);
      const running = isRunning();
      const pid = readPid();
      console.log(`  v1 copy:  ${exists ? V1_ROOT : "NOT FOUND"}`);
      console.log(`  server:   ${running ? `running (pid ${pid}) on port ${V1_PORT}` : "stopped"}`);
    },
  };

  const fn = commands[cmd];
  if (!fn) {
    console.error(`Unknown command: ${cmd}\nUsage: bun scripts/debug/v1.mjs [start|stop|status]`);
    process.exit(1);
  }
  await fn();
}
