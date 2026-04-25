# vlist.io — Project Instructions

Interactive docs, examples, and benchmarks for the vlist virtual list library.

- **Repo:** `github.com/floor/vlist.io`
- **Live:** [vlist.io](https://vlist.io)

## Git Workflow

**Working branch is `staging`.** The `main` branch is protected and requires a pull request.

- ❌ **NEVER push directly to `main`** — it is protected on GitHub and will be rejected
- ❌ **NEVER commit on `main`** — always work on `staging` or feature branches
- ✅ Push to `staging`: `git push origin staging`
- ✅ Merge to `main` via PR: `staging` → `main`
- ✅ Feature branches branch off `staging`, merge back to `staging`

**Before any git operation**, verify you're on the right branch:
```
git branch --show-current  # Should show 'staging' or a feature branch, NEVER 'main'
```

## Deploy

Deployment is triggered by GitHub Actions on push to `main`. The workflow SSHs into the server and runs the deploy script. Merging a PR from `staging` → `main` triggers a deploy.

## Commits

Conventional Commits: `type(scope): description`

- **Types:** `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore`, `perf`
