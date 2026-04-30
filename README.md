# vlist.io

Documentation, examples, tutorials, and benchmarks site for the [vlist](https://github.com/floor/vlist) virtual list library.

**Live:** [https://vlist.io](https://vlist.io)
**Staging:** [https://staging.vlist.io](https://staging.vlist.io)

## What's Inside

| Section | Path | Description |
|---------|------|-------------|
| **Landing** | `/` | Feature overview, quick start, and navigation |
| **Examples** | `/examples/` | 18 interactive examples with multi-framework implementations |
| **Docs** | `/docs/` | API reference, features, getting started, optimization guides |
| **Tutorials** | `/tutorials/` | Step-by-step guides (quick start, builder pattern, chat UI, etc.) |
| **Benchmarks** | `/benchmarks/` | Performance suites and cross-library comparisons |
| **API** | `/api/` | Data endpoints for demos (users, cities, tracks, posts, files, recipes) |

## Examples

18 examples organized by feature, many with **multi-framework implementations** (Vanilla JS, React, Vue, Svelte, Solid):

| Example | Description |
|---------|-------------|
| **basic** | Getting started — Vanilla, React, Vue, Svelte, Solid |
| **large-list** | Scale feature with 1M+ items — Vanilla, React, Vue, Svelte |
| **photo-album** | Grid layout — Vanilla, React, Vue, Svelte |
| **horizontal** | Horizontal scrolling (basic + variable-width) |
| **carousel** | Carousel component — Vanilla, React, Svelte, Vue |
| **contact-list** | A–Z grouped contact list with sticky headers |
| **messaging** | Chat interface with reverse scrolling |
| **social-feed** | Social media feed with variable-height items |
| **data-table** | Tabular data with columns |
| **file-browser** | File system browser |
| **track-list** | Music track listing |
| **velocity-loading** | Async loading with velocity detection |
| **scroll-restore** | Snapshot-based scroll position restore |
| **window-scroll** | Page/window scroll integration |
| **wizard-nav** | Button-only navigation (no scroll) |
| **variable-sizes** | Mixed variable-height items |
| **accessibility** | ARIA-compliant virtual list |
| **icons** | Icon grid display |

## Benchmarks

### Performance Suites

Located in `benchmarks/suites/` — test vlist's own performance:

- **scroll** — Scroll FPS and frame timing
- **render** — Initial and incremental render time
- **memory** — Heap usage under load
- **scrollto** — Programmatic scroll-to accuracy and speed

Results are stored in SQLite (`data/benchmarks.db`) with historical tracking.

### Library Comparisons

Located in `benchmarks/comparison/` — head-to-head benchmarks against:

- React Virtual (TanStack)
- React Virtuoso
- React Window
- Virtua
- Legend List
- Clusterize.js
- Vue Virtual Scroller
- Solid Virtual (TanStack)

## Setup

**Prerequisites:**
- [Bun](https://bun.sh) runtime
- Sibling `vlist` repository for local development

**Directory structure:**
```
~/Code/floor/
├── vlist/          # The library itself
└── vlist.io/      # This repo
```

**Install and run:**

```bash
bun install
bun run dev
```

This builds examples and benchmarks, then starts the Bun server with `--watch` on port **3338**.

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Build examples + benchmarks, start server with watch |
| `dev:full` | Same as `dev` but also watches for example and benchmark changes |
| `start` | Start server (no build, no watch) |
| `build:examples` | Build all example bundles |
| `build:bench` | Build benchmark suites |
| `build:examples:watch` | Rebuild examples on file change |
| `build:bench:watch` | Rebuild benchmarks on file change |
| `seed:benchmarks` | Seed benchmark history database |
| `test` | Run tests |
| `test:watch` | Run tests in watch mode |
| `test:coverage` | Run tests with coverage |
| `typecheck` | TypeScript type checking |
| `deploy` | Trigger GitHub Actions deploy workflow |

## Project Structure

```
vlist.io/
├── src/
│   ├── api/                   # API routes (users, cities, tracks, posts, files, recipes)
│   │   └── router.ts
│   ├── data/                  # Deterministic data generators
│   └── server/                # Bun HTTP server
│       ├── router.ts          # Request routing
│       ├── config.ts          # Server configuration
│       ├── static.ts          # Static file serving
│       ├── sitemap.ts         # Dynamic sitemap generation
│       ├── compression.ts     # Response compression
│       ├── cache.ts           # Cache headers
│       ├── renderers/         # Server-side page renderers
│       │   ├── homepage.ts
│       │   ├── examples.ts
│       │   ├── content.ts     # Docs + tutorials (Markdown → HTML)
│       │   └── benchmarks.ts
│       └── shells/            # HTML templates (Eta)
│           ├── base.html
│           └── homepage.eta
├── examples/                  # Interactive examples (18)
│   ├── build.ts               # esbuild-based build script
│   ├── basic/                 # Multi-framework (Vanilla, React, Vue, Svelte, Solid)
│   ├── large-list/            # Multi-framework (Vanilla, React, Vue, Svelte)
│   ├── photo-album/           # Multi-framework (Vanilla, React, Vue, Svelte)
│   ├── carousel/              # Multi-framework (Vanilla, React, Svelte, Vue)
│   ├── horizontal/            # Sub-examples (basic, variable-width)
│   ├── contact-list/
│   ├── messaging/
│   ├── social-feed/
│   ├── data-table/
│   ├── file-browser/
│   ├── track-list/
│   ├── velocity-loading/
│   ├── scroll-restore/
│   ├── window-scroll/
│   ├── wizard-nav/
│   ├── variable-sizes/
│   ├── accessibility/
│   └── icons/
├── benchmarks/                # Performance benchmarks
│   ├── build.ts               # Benchmark build script
│   ├── suites/                # vlist performance suites (scroll, render, memory, scrollto)
│   └── comparison/            # Cross-library comparisons (9 libraries)
├── docs/                      # Documentation (Markdown, server-rendered)
│   ├── getting-started.md
│   ├── why-vlist.md
│   ├── accessibility.md
│   ├── changelog.md
│   ├── features/              # Feature guides (async, grid, groups, scale, etc.)
│   └── ...
├── tutorials/                 # Step-by-step tutorials (Markdown, server-rendered)
│   ├── quick-start.md
│   ├── builder-pattern.md
│   ├── chat-interface.md
│   ├── mobile.md
│   ├── optimization.md
│   └── styling.md
├── data/                      # SQLite databases (benchmarks, cities, tracks)
├── styles/                    # Site-wide CSS
├── images/                    # Favicons and branding
├── api/                       # API documentation page
├── test/                      # Test suites (api, benchmarks, server)
├── scripts/
│   ├── setup-server.sh        # One-time server provisioning
│   ├── seed-benchmarks.ts     # Benchmark data seeder
│   ├── seed-cities.ts         # Cities database seeder
│   ├── seed-tracks.ts         # Tracks database seeder
│   └── build-utils.ts         # Shared build utilities
├── .github/workflows/
│   ├── deploy.yml             # Production deploy → SSH + Cloudflare cache purge
│   └── deploy-staging.yml     # Staging deploy → SSH (triggered by push or vlist dispatch)
├── server.ts                  # Entry point (Bun.serve)
├── ecosystem.config.cjs       # PM2 process config (2 fork instances, SO_REUSEPORT)
├── package.json
└── tsconfig.json
```

## Server

`server.ts` is the entry point — a Bun HTTP server on port 3338. Routing is handled by `src/server/router.ts`:

1. `/` → Server-rendered landing page
2. `/docs/*`, `/tutorials/*` → Markdown content rendered to HTML
3. `/examples/*` → Server-rendered example pages
4. `/benchmarks/*` → Server-rendered benchmark pages
5. `/api/*` → REST API (users, cities, tracks, posts, files, recipes)
6. `/dist/*` → vlist library assets
7. `/sitemap.xml` → Dynamic sitemap
8. `/robots.txt` → Robots file

All pages are server-rendered using Eta templates. No client-side framework for the shell — just Bun, Eta, and Marked.

## Deployment

Two environments, both deployed via GitHub Actions:

| Environment | URL | Branch | Trigger |
|-------------|-----|--------|---------|
| **Production** | [vlist.io](https://vlist.io) | `main` | PR merge from `staging` |
| **Staging** | [staging.vlist.io](https://staging.vlist.io) | `staging` | Push to `staging` |

**Stack:** Bun → PM2 → nginx → Cloudflare

### Production (`vlist.io`)

1. Merge PR from `staging` → `main`
2. `.github/workflows/deploy.yml` triggers
3. SSHs into server, pulls `main`, installs npm vlist, builds, reloads PM2
4. Purges Cloudflare edge cache

### Staging (`staging.vlist.io`)

1. Push to `staging` (or vlist repo staging update triggers cross-repo dispatch)
2. `.github/workflows/deploy-staging.yml` triggers
3. SSHs into server, pulls `staging`, links local vlist staging clone, builds, reloads PM2
4. Staging uses the latest **unpublished** vlist code from the staging branch

### Server Layout

```
/home/floor/
├── vlist/                 # vlist — production (main branch)
├── vlist.io/              # vlist.io — production (main branch, port 3338)
├── staging.vlist/         # vlist — staging (staging branch)
└── staging.vlist.io/      # vlist.io — staging (staging branch, port 3339)
```

### Cross-Repo Deploy

When the `vlist` staging branch is updated, it automatically triggers a `staging.vlist.io` redeploy via `repository_dispatch`, so the staging site always reflects the latest library code.

**First-time server setup:**

```bash
bash scripts/setup-server.sh
```

**Required GitHub Actions secrets:**

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Server hostname or IP |
| `SERVER_USER` | SSH user |
| `SERVER_SSH_KEY` | SSH private key |
| `SERVER_PORT` | SSH port (optional, defaults to 22) |
| `CF_ZONE_ID` | Cloudflare zone ID |
| `CF_API_TOKEN` | Cloudflare API token |
| `DISPATCH_TOKEN` | Fine-grained PAT for cross-repo dispatch (on `vlist` repo) |

## Dependencies

| Package | Purpose |
|---------|---------|
| `vlist` | The library being documented (`file:../vlist` locally, `latest` in production) |
| `vlist-react`, `vlist-vue`, `vlist-svelte`, `vlist-solidjs` | Framework adapters for multi-framework examples |
| `eta` | HTML templating for server-rendered pages |
| `marked` | Markdown to HTML rendering |
| `mongodb` | Data storage |
| Various virtual list libs | Benchmark comparisons (React Virtual, Virtuoso, Virtua, etc.) |

## Testing

```bash
bun test               # Run all tests
bun test --watch       # Watch mode
bun test --coverage    # With coverage
```

Tests are in `test/` covering API routes, benchmarks, and server functionality.

## License

GPL-3.0-or-later — Built by [FloorIO](https://floor.io)
