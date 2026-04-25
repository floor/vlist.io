# vlist.io — Project Instructions

Interactive docs, examples, and benchmarks for the [vlist](https://github.com/floor/vlist) virtual list library.

- **Repo:** `github.com/floor/vlist.io`
- **Production:** [vlist.io](https://vlist.io)
- **Staging:** [staging.vlist.io](https://staging.vlist.io)
- **License:** GPL-3.0-or-later
- **Runtime:** Bun

## Git Workflow

**Working branch is `staging`.** The `main` branch is protected and requires a pull request.

- ❌ **NEVER push directly to `main`** — it is protected on GitHub and will be rejected
- ❌ **NEVER commit on `main`** — always work on `staging` or feature branches
- ❌ **NEVER commit or push without explicit user permission**
- ✅ Push to `staging`: `git push origin staging`
- ✅ Merge to `main` via PR: `staging` → `main`
- ✅ Feature branches branch off `staging`, merge back to `staging`

**Before any git operation**, verify you're on the right branch:
```
git branch --show-current  # Should show 'staging' or a feature branch, NEVER 'main'
```

## Commands

```bash
bun install                  # Install dependencies
bun run dev                  # Build examples + benchmarks, start server with watch
bun run dev:full             # Same + watch for example/benchmark changes
bun run start                # Start server (no build, no watch)
bun run build:examples       # Build all example bundles
bun run build:bench          # Build benchmark suites
bun test                     # Run tests
bun test --watch             # Watch mode
bun run typecheck            # TypeScript type checking
bun run deploy               # Trigger GitHub Actions deploy workflow
```

## Architecture

### Server
- **Entry point:** `server.ts` — Bun HTTP server (port 3338 production, 3339 staging)
- **Routing:** `src/server/router.ts` — all request handling
- **Config:** `src/server/config.ts` — PORT, paths, package resolution
- **Templates:** Eta templates in `src/server/shells/`
- **Content:** Markdown docs/tutorials rendered to HTML via Marked

### Key Paths
- `/` → Server-rendered landing page
- `/docs/*`, `/tutorials/*` → Markdown → HTML
- `/examples/*` → Interactive examples (18 total, multi-framework)
- `/benchmarks/*` → Performance suites + library comparisons
- `/api/*` → REST API (users, cities, tracks, posts, files, recipes)
- `/dist/*` → vlist library assets

### Build System
- `examples/build.ts` — esbuild-based, builds all 18 examples
- `benchmarks/build.ts` — builds benchmark suites + comparisons
- No client-side framework for the shell — Bun + Eta + Marked

## Project Structure

```
vlist.io/
├── src/
│   ├── api/                   # API routes
│   ├── data/                  # Deterministic data generators
│   └── server/                # Bun HTTP server
│       ├── router.ts          # Request routing
│       ├── config.ts          # Server config (PORT, paths)
│       ├── static.ts          # Static file serving
│       ├── compression.ts     # Response compression
│       ├── cache.ts           # Cache headers
│       ├── renderers/         # Page renderers (homepage, examples, docs, benchmarks)
│       └── shells/            # HTML templates (Eta)
├── examples/                  # 18 interactive examples (multi-framework)
├── benchmarks/                # Performance suites + library comparisons
├── docs/                      # Documentation (Markdown)
├── tutorials/                 # Step-by-step guides (Markdown)
├── styles/                    # Site-wide CSS
├── test/                      # Test suites
├── scripts/                   # Server setup, data seeders
├── .github/workflows/
│   ├── deploy.yml             # Production deploy (push to main)
│   └── deploy-staging.yml     # Staging deploy (push to staging + vlist dispatch)
├── server.ts                  # Entry point
├── ecosystem.config.cjs       # PM2 config (production, port 3338)
└── ecosystem.staging.config.cjs  # PM2 config (staging, port 3339)  [server-side only]
```

## Deployment

Two environments deployed via GitHub Actions:

| Environment | URL | Branch | vlist Source |
|-------------|-----|--------|-------------|
| **Production** | vlist.io | `main` | npm `latest` |
| **Staging** | staging.vlist.io | `staging` | Local clone (latest staging code) |

### Server Layout
```
/home/floor/
├── vlist/                 # vlist production (main)
├── vlist.io/              # vlist.io production (port 3338)
├── staging.vlist/         # vlist staging (staging branch)
└── staging.vlist.io/      # vlist.io staging (port 3339)
```

### Cross-Repo Deploy
Pushing to `vlist` staging triggers a `repository_dispatch` → `staging.vlist.io` auto-redeploys.

**Stack:** Bun → PM2 → nginx → Cloudflare

## Commits

Conventional Commits: `type(scope): description`

- **Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `perf`
- **Scopes:** `server`, `api`, `examples`, `benchmarks`, `docs`, `tutorials`, `styles`, `ci`, `staging`

## TypeScript Rules

- Strict mode enabled
- No `any` — use `unknown` or proper interfaces
- Explicit types on function parameters and return values
- `const` over `let` unless mutation is required
- Early returns over deep nesting

## Dependencies

| Package | Purpose |
|---------|---------|
| `vlist` | The library (`file:../vlist` locally, `latest` in production) |
| `vlist-react`, `vlist-vue`, `vlist-svelte`, `vlist-solidjs` | Framework adapters for examples |
| `eta` | HTML templating |
| `marked` | Markdown → HTML |

## Common Pitfalls

- **`file:` dependencies** — local dev uses `file:../vlist`, production swaps to npm `latest`, staging links to `../staging.vlist`. Never commit the swapped version.
- **Port conflicts** — production is 3338, staging is 3339. Don't mix them.
- **Example builds** — must run `bun run build:examples` after changing example source code.
- **vlist changes** — if you change the vlist library, staging.vlist.io picks it up automatically via cross-repo dispatch. Production requires a new npm publish.