// server.ts
// vlist.io — Entry point. Starts the Bun HTTP server.
//
// Serves:
//   /                             → Landing page
//   /docs/*                       → Documentation (server-rendered)
//   /tutorials/*                  → Tutorials (server-rendered)
//   /examples/*                   → Examples (server-rendered)
//   /benchmarks/*                 → Benchmarks (server-rendered)
//   /api/*                        → API routes
//   /dist/*                       → vlist library assets
//   /sitemap.xml                  → Dynamic sitemap
//   /robots.txt                   → robots.txt

import { PORT, VLIST_ROOT } from "./src/server/config";
import { handleRequest } from "./src/server/router";

// =============================================================================
// Start
// =============================================================================

const packages = [
  VLIST_ROOT
    ? `  vlist:         ${VLIST_ROOT}`
    : "  vlist:         ⚠️  not found",
];

console.log(`
  🚀  vlist.io server

  Local:       http://localhost:${PORT}
  Docs:        http://localhost:${PORT}/docs
  Tutorials:   http://localhost:${PORT}/tutorials
  Examples:    http://localhost:${PORT}/examples
  Benchmarks:  http://localhost:${PORT}/benchmarks
  API:         http://localhost:${PORT}/api

  Packages resolved:
${packages.join("\n")}

  Press Ctrl+C to stop
`);

Bun.serve({
  port: PORT,
  fetch: handleRequest,
  reusePort: true,
});

// Signal PM2 cluster that this instance is ready to accept connections
if (process.send) process.send("ready");
