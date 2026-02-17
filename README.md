# vlist.dev

Documentation, sandbox, and benchmarks site for the [vlist](https://github.com/floor/vlist) virtual list library.

**Live:** [https://vlist.dev](https://vlist.dev)

## Recent Updates

🎉 **VList v0.6.0** - Complete refactoring to builder-only API with optimal tree-shaking!

- **2-3x smaller bundles** (22 KB → 8-12 KB gzipped)
- **Builder pattern** with explicit plugins
- **Clear naming** - `withScale`, `withAsync`, `withSections`, `withPage`
- **All 34 examples updated** to demonstrate new API

See [BUNDLE_SIZE_COMPARISON.md](./BUNDLE_SIZE_COMPARISON.md) for detailed analysis.

## What's Inside

| Section | Path | Description |
|---------|------|-------------|
| **Landing** | `/` | Feature overview, quick start, and navigation |
| **Sandbox** | `/sandbox/` | 34 interactive examples — basic lists to million-item stress tests |
| **Docs** | `/docs/` | API reference, configuration, events, methods, styling |
| **Benchmarks** | `/benchmarks/` | Live performance suites — scroll FPS, render time, memory, bundle size |
| **API** | `/api/` | Deterministic user data endpoint for demos (1M+ items, zero storage) |

## Sandbox Examples

The sandbox includes **34 interactive examples** demonstrating the builder pattern with explicit plugins:

### By Feature

| Feature | Examples | Bundle Size (Gzipped) |
|---------|----------|-----------------------|
| **Getting Started** | Basic, Controls | 8.2 - 10.5 KB |
| **Core (Ultra-Light)** | Basic Core | **3.1 KB** (no plugins) |
| **Layout** | Grid (Photo Album, File Browser), Horizontal | 8.6 - 15.3 KB |
| **Grouped Lists** | Sticky Headers (Sections), Reverse Chat | 11.9 - 12.3 KB |
| **Large Datasets** | Large List (Scale), Velocity Loading | 9.9 - 15.0 KB |
| **Scroll Behaviors** | Scroll Restore, Page Scroll, Wizard Nav | 10.4 - 13.5 KB |
| **Advanced** | Variable Heights, Chat UI, Complex Combinations | 10.9 - 15.3 KB |

### Builder Pattern Examples

All examples now use the **builder API** with explicit plugins:

```typescript
import { vlist, withGrid, withSections } from 'vlist';

vlist({ ... })
  .use(withGrid({ columns: 4 }))
  .use(withSections({ ... }))
  .build();
```

Many examples include **multi-framework implementations** (JavaScript, React, Vue, Svelte) with identical VList API.

## Setup

**Prerequisites:** 
- [Bun](https://bun.sh) runtime
- Sibling `vlist` repository for local development

**Directory structure:**
```
~/Code/floor/
├── vlist/          # The library itself
└── vlist.dev/      # This repo
```

**Install and link:**

```bash
# Install dependencies
bun install

# Link local vlist for development
bun run link:libs
```

The `link:libs` script links the local `vlist` package, so changes are reflected immediately without republishing.

**Start development server:**

```bash
bun run dev
```

This builds the sandbox and benchmarks, then starts the Bun server with `--watch` on port **3338**.

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `bun run dev` | Build sandbox + benchmarks, start server with watch |
| `start` | `bun run start` | Start server (no build, no watch) |
| `build:sandbox` | `bun run build:sandbox` | Build all 14 sandbox examples |
| `build:sandbox:watch` | `bun run build:sandbox:watch` | Rebuild sandbox on change |
| `build:bench` | `bun run build:bench` | Build benchmark suites |
| `build:bench:watch` | `bun run build:bench:watch` | Rebuild benchmarks on change |
| `typecheck` | `bun run typecheck` | Run TypeScript type checking |
| `link:libs` | `bun run link:libs` | Link local vlist for development |

## Project Structure

```
vlist.dev/
├── src/
│   └── api/                # API routes (user data endpoint)
│       ├── router.ts
│       └── users.ts
├── sandbox/                # Interactive examples (34 total)
│   ├── build.ts            # Sandbox build script (esbuild)
│   ├── index.html          # Sandbox index page
│   ├── basic/              # Getting Started
│   ├── controls/           # (JavaScript, React, Vue, Svelte)
│   ├── core/               # Ultra-Lightweight Core (3.1 KB gzip)
│   │   └── basic/          # (JavaScript, React, Vue, Svelte)
│   ├── grid/               # Grid Layout Plugin
│   │   ├── photo-album/    # (JavaScript, React, Vue, Svelte)
│   │   └── file-browser/   # File browser demo
│   ├── data/               # Async Loading Plugin
│   │   ├── large-list/     # (JavaScript, React, Vue, Svelte)
│   │   └── velocity-loading/
│   ├── horizontal/         # Horizontal Direction
│   │   └── basic/          # (JavaScript, React, Vue, Svelte)
│   ├── groups/             # Sections Plugin (was: groups)
│   │   └── sticky-headers/
│   ├── scroll-restore/     # Snapshots Plugin
│   ├── window-scroll/      # Page Plugin (was: window)
│   ├── variable-heights/   # Advanced Examples
│   ├── reverse-chat/       # Reverse + Sections
│   ├── wizard-nav/         # Button-only navigation
│   └── builder/            # Builder Pattern Examples
│       ├── basic/
│       ├── controls/
│       ├── large-list/     # Scale plugin (was: compression)
│       ├── photo-album/
│       └── chat/
├── benchmarks/             # Performance test suites
├── docs/                   # Markdown documentation (API reference)
│   ├── README.md
│   ├── plugins.md          # Plugin system guide
│   ├── grid.md             # Grid plugin details
│   ├── data.md             # Async plugin details
│   ├── groups.md           # Sections plugin details
│   └── ...                 # More guides
├── nginx/                  # nginx vhost config
│   └── vlist.dev.conf
├── scripts/
│   └── setup-server.sh     # One-time server provisioning
├── .github/
│   └── workflows/
│       └── deploy.yml      # GitHub Actions → SSH deploy
├── server.ts               # Bun HTTP server (entry point)
├── index.html              # Landing page
├── ecosystem.config.cjs    # PM2 process config
├── package.json
└── tsconfig.json
```

## Server

`server.ts` is a plain Bun HTTP server that handles routing:

1. `/api/*` → API router
2. `/dist/*` → vlist package `dist/` (follows symlinks from `bun link`)
3. `/sandbox/*`, `/docs/*`, `/benchmarks/*` → static files
6. `/` → landing page

No frameworks, no bundler for the server — just `Bun.serve()`.

## Deployment

Deployed to **floor.io** via GitHub Actions on push to `main`.

**Stack:** Bun → PM2 → nginx reverse proxy → Let's Encrypt SSL

**How it works:**

1. Push to `main` triggers `.github/workflows/deploy.yml`
2. GitHub Actions SSHs into the server
3. Pulls latest, replaces `file:` dependencies with registry versions
4. Runs `bun install`, builds vlist, builds sandbox + benchmarks
5. Restores `package.json` and reloads PM2

**First-time server setup:**

```bash
bash scripts/setup-server.sh
```

This clones the repo, installs dependencies, starts PM2, links the nginx vhost, and prints instructions for SSL setup and GitHub Actions secrets.

**Required GitHub Actions secrets:**

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Server hostname or IP |
| `SERVER_USER` | SSH user |
| `SERVER_SSH_KEY` | SSH private key |
| `SERVER_PORT` | SSH port (optional, defaults to 22) |

## Dependencies

| Package | Purpose | Resolution |
|---------|---------|------------|
| `vlist` | The library being documented | `file:../vlist` (local) → `@floor/vlist` (production) |

Local `file:` paths are used in development. The deploy script swaps them for registry versions before installing on the server.

## Key Documentation

- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Complete refactoring overview
- **[BUNDLE_SIZE_COMPARISON.md](./BUNDLE_SIZE_COMPARISON.md)** - Before/after bundle analysis
- **[docs/plugins.md](./docs/plugins.md)** - Plugin system guide
- **[docs/builder.md](./docs/builder.md)** - Builder pattern documentation

## License

GPL-3.0-or-later — Built by [Floor IO](https://floor.io)