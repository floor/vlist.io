# vlist.dev

Documentation, sandbox, and benchmarks site for the [vlist](https://github.com/floor/vlist) virtual list library.

**Live:** [https://vlist.dev](https://vlist.dev)

## What's Inside

| Section | Path | Description |
|---------|------|-------------|
| **Landing** | `/` | Feature overview, quick start, and navigation |
| **Sandbox** | `/sandbox/` | 12 interactive examples — basic lists to million-item stress tests |
| **Docs** | `/docs/` | API reference, configuration, events, methods, styling |
| **Benchmarks** | `/benchmarks/` | Live performance suites — scroll FPS, render time, memory, bundle size |
| **API** | `/api/` | Deterministic user data endpoint for demos (1M+ items, zero storage) |

## Setup

**Prerequisites:** [Bun](https://bun.sh) and the following sibling repositories:

```
~/Code/floor/
├── vlist/          # The library itself
└── vlist.dev/      # This repo

~/Code/
├── mtrl/           # UI component library (used in sandbox)
└── mtrl-addons/    # mtrl extensions (used in sandbox)
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
| `build:sandbox` | `bun run build:sandbox` | Build all 12 sandbox examples |
| `build:sandbox:watch` | `bun run build:sandbox:watch` | Rebuild sandbox on change |
| `build:bench` | `bun run build:bench` | Build benchmark suites |
| `build:bench:watch` | `bun run build:bench:watch` | Rebuild benchmarks on change |
| `typecheck` | `bun run typecheck` | Run TypeScript type checking |
| `link:libs` | `bun run link:libs` | Link local vlist, mtrl, and mtrl-addons |

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
│   ├── basic/
│   ├── core/
│   ├── grid/
│   ├── infinite-scroll/
│   ├── million-items/
│   ├── reverse-chat/
│   ├── scroll-restore/
│   ├── selection/
│   ├── sticky-headers/
│   ├── variable-heights/
│   ├── velocity-loading/
│   └── window-scroll/
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
3. `/node_modules/mtrl/*` → mtrl package assets
4. `/node_modules/mtrl-addons/*` → mtrl-addons assets
5. `/sandbox/*`, `/docs/*`, `/benchmarks/*` → static files
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
| `vlist` | The library being documented | `file:../vlist` (local) → GitHub (production) |
| `mtrl` | UI components for sandbox examples | `file:../../mtrl` (local) → npm (production) |
| `mtrl-addons` | Extended components for sandbox | `file:../../mtrl-addons` (local) → npm (production) |

Local `file:` paths are used in development. The deploy script swaps them for registry versions before installing on the server.

## License

GPL-3.0-or-later — Built by [Floor IO](https://floor.io)