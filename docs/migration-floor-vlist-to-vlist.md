---
created: 2026-04-14
updated: 2026-04-14
status: draft
---

# npm Migration Plan: `@floor/vlist` → `vlist`

The deprecated `vlist` npm package (last published 2017, Angular virtual scroll) is being transferred to us by its original owner, Alexander Klaiber. This document outlines the transition plan to migrate from `@floor/vlist` to `vlist` without breaking existing users.

## Context

- **Current package:** `@floor/vlist` on npm
- **Target package:** `vlist` on npm
- **Domain:** vlist.io (already owned)
- **Transfer:** Alexander Klaiber (npm: `alexander.klaiber`) agreed on 2026-04-14 to transfer ownership

---

## Phase 1 — Claim & Prepare

Once Alexander runs `npm owner add caoutchouc vlist`:

1. **Remove his ownership**
   ```sh
   npm owner rm alexander.klaiber vlist
   ```

2. **Remove deprecation notice**
   ```sh
   npm deprecate vlist ""
   ```

3. **Unpublish old versions** (optional — clears the legacy Angular code)
   ```sh
   npm unpublish vlist@0.1.3
   npm unpublish vlist@0.1.2
   npm unpublish vlist@0.1.1
   npm unpublish vlist@0.1.0
   ```

---

## Phase 2 — Publish Under the New Name

### A. Main package: `vlist`

1. Update `package.json` name from `@floor/vlist` to `vlist`
2. Build and publish:
   ```sh
   bun run build --types
   npm publish
   ```

### B. Wrapper package: `@floor/vlist`

Create a thin wrapper so existing users aren't broken. This lives in a separate directory (e.g. `packages/floor-vlist/`):

**package.json:**
```json
{
  "name": "@floor/vlist",
  "version": "2.0.0",
  "description": "This package has moved to 'vlist'.",
  "type": "module",
  "main": "./index.js",
  "types": "./index.d.ts",
  "dependencies": {
    "vlist": "^1.5.3"
  },
  "exports": {
    ".": {
      "types": "./index.d.ts",
      "import": "./index.js"
    },
    "./internals": {
      "types": "./internals.d.ts",
      "import": "./internals.js"
    },
    "./styles": "./node_modules/vlist/dist/vlist.css",
    "./styles/grid": "./node_modules/vlist/dist/vlist-grid.css",
    "./styles/masonry": "./node_modules/vlist/dist/vlist-masonry.css",
    "./styles/table": "./node_modules/vlist/dist/vlist-table.css",
    "./styles/extras": "./node_modules/vlist/dist/vlist-extras.css"
  }
}
```

**index.js:**
```js
export * from 'vlist'
```

**index.d.ts:**
```ts
export * from 'vlist'
```

**internals.js:**
```js
export * from 'vlist/internals'
```

**internals.d.ts:**
```ts
export * from 'vlist/internals'
```

This ensures all existing `@floor/vlist` imports continue working transparently.

---

## Phase 3 — Update Downstream

### Framework adapters

Update `peerDependencies` in each adapter repo from `@floor/vlist` to `vlist`:

- `vlist-react`
- `vlist-vue`
- `vlist-svelte`
- `vlist-solidjs`

### Documentation (vlist.io)

- Installation: `npm install @floor/vlist` → `npm install vlist`
- Imports: `import { vlist } from '@floor/vlist'` → `import { vlist } from 'vlist'`
- Internals: `import { ... } from '@floor/vlist/internals'` → `import { ... } from 'vlist/internals'`
- Styles: `import '@floor/vlist/styles'` → `import 'vlist/styles'`

### Repository

- `README.md` — update install/import examples
- `CLAUDE.md` — update package name reference
- `CONTRIBUTING.md` — update any references

---

## Phase 4 — Deprecate `@floor/vlist`

After a transition period (3–6 months), deprecate the scoped package:

```sh
npm deprecate @floor/vlist "This package has moved to 'vlist'. Please update your dependency."
```

---

## Timeline

| Step | When | Status |
|---|---|---|
| Ownership transfer | Waiting on Alexander | Pending |
| Claim package, undeprecate | Day 1 after transfer | — |
| Publish `vlist` | Day 1 | — |
| Publish `@floor/vlist` wrapper | Day 1 | — |
| Update framework adapters | Week 1 | — |
| Update docs & README | Week 1 | — |
| Deprecate `@floor/vlist` | After 3–6 months | — |

## Principles

- **No breakage.** Existing `@floor/vlist` users keep working at every step.
- **No rush.** The wrapper package buys us time — no need to force users to migrate immediately.
- **One source of truth.** Only `vlist` gets real updates. `@floor/vlist` is a pass-through.
