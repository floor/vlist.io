# vlist.dev

Documentation, sandbox, and benchmarks site for the [vlist](https://github.com/floor/vlist) virtual list library.

**Live:** [https://vlist.dev](https://vlist.dev)

## What's Inside

| Section | Path | Description |
|---------|------|-------------|
| **Landing** | `/` | Feature overview, quick start, and navigation |
| **Sandbox** | `/sandbox/` | 19 interactive examples — basic lists to million-item stress tests |
| **Docs** | `/docs/` | API reference, configuration, events, methods, styling |
| **Benchmarks** | `/benchmarks/` | Live performance suites — scroll FPS, render time, memory, bundle size |
| **API** | `/api/` | Deterministic user data endpoint for demos (1M+ items, zero storage) |

## Sandbox Examples

The sandbox includes 19 interactive examples organized by feature category:

| Category | Examples | Description |
|----------|----------|-------------|
| **Getting Started** | Basic, Controls | Minimal setup and full API exploration |
| **Core (Lightweight)** | Basic Core | 4.2KB build — 83% smaller than full bundle |
| **Grid Plugin** | Photo Album, File Browser | Grid layouts with multiple framework implementations |
| **Data Plugin** | Large List (Compression), Velocity Loading | 100K–5M items with smart loading strategies |
| **Horizontal** | Basic Horizontal | Horizontal carousel with 10K cards |
| **Groups Plugin** | Sticky Headers | A–Z contact list with sticky section headers |
| **Other Plugins** | Scroll Restore, Window Scroll | Save/restore scroll position, document-level scrolling |
| **Advanced** | Variable Heights, Reverse Chat, Wizard Nav | DOM-measured heights, reverse mode, button-only navigation |
| **Builder Pattern** | Basic, Controls, Large List, Photo Album, Chat | Fluent API with plugin composition (5 examples) |

Many examples include **multi-framework implementations** (JavaScript, React, Svelte, Vue) demonstrating framework-agnostic usage.

## Setup

**Prerequisites:** [Bun](https://bun.sh) and the following sibling repositories:

```
~/Code/floor/
├── vlist/          # The library itself
└── vlist.dev/      # This repo
```

**Install and link:**

```bash
bun install
bun run link:libs
```

`link:libs` runs `bun link` in each sibling package and links them into this project, so local changes are reflected immediately.

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
| `build:sandbox` | `bun run build:sandbox` | Build all 19 sandbox examples |
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
├── sandbox/                # Interactive examples
│   ├── build.ts            # Sandbox build script
│   ├── index.html          # Sandbox index page
│   ├── basic/              # Getting Started
│   ├── controls/
│   ├── core/               # Core (Lightweight)
│   │   └── basic/
│   ├── grid/               # Grid Plugin
│   │   ├── photo-album/
│   │   └── file-browser/
│   ├── data/               # Data Plugin
│   │   ├── large-list/
│   │   └── velocity-loading/
│   ├── horizontal/         # Horizontal
│   │   └── basic/
│   ├── groups/             # Groups Plugin
│   │   └── sticky-headers/
│   ├── scroll-restore/     # Other Plugins
│   ├── window-scroll/
│   ├── variable-heights/   # Advanced Examples
│   ├── reverse-chat/
│   ├── wizard-nav/
│   └── builder/            # Builder Pattern
│       ├── basic/
│       ├── controls/
│       ├── large-list/
│       ├── photo-album/
│       └── chat/
├── benchmarks/             # Performance test suites
├── docs/                   # Markdown documentation
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

## License

GPL-3.0-or-later — Built by [Floor IO](https://floor.io)