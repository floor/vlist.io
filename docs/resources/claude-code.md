# Claude Code Integration

> Custom agents and skills for AI-assisted development with Claude Code.

## Overview

The vlist repository includes a suite of custom Claude Code **agents** and **skills** in `.claude/` to enforce project conventions, automate quality checks, and speed up common workflows.

**Prerequisite:** [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) must be installed. Agents and skills are automatically discovered when you run `claude` from the vlist project root.

- **Agents** are autonomous workers — they run in isolated subagent contexts, do their job, and return results. Invoke them with `@agent-name` or let Claude delegate automatically.
- **Skills** are inline slash commands — they expand directly into your conversation with pre-loaded context. Invoke them with `/skill-name`.
- **Hooks** are automated quality gates — they run automatically on tool calls (edits, commits, pushes) without manual invocation.

---

## Hooks

Hooks are configured in `.claude/settings.json` (project-level, checked into the repo). They enforce quality standards automatically.

### PostToolUse — Auto-typecheck on edits

Every time a file is edited or written, `bun run typecheck` runs automatically. Type errors surface immediately — no need to wait until commit time.

| Trigger | Action | Blocking? |
|---------|--------|-----------|
| `Edit` tool | `bun run typecheck` | No (feedback only) |
| `Write` tool | `bun run typecheck` | No (feedback only) |

### PreToolUse — Quality gates on commit and push

| Trigger | Action | Blocking? |
|---------|--------|-----------|
| `git commit` | Typecheck must pass | Yes — blocks commit on failure |
| `git push` | Typecheck + full test suite must pass | Yes — blocks push on failure |

These gates make `@pre-commit` optional — the hooks catch issues automatically. The agent is still useful for a comprehensive report including build and size checks.

---

## Agents

Agents live in `.claude/agents/`. Each is a Markdown file with YAML frontmatter defining its tools, model, and behavior.

### test-runner

Run tests with optional scoping and coverage analysis. Diagnoses failures by reading test and source files.

```
@test-runner run tests for the async feature
@test-runner full suite with coverage
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep, Bash |
| Model | Sonnet |

---

### perf-audit

Scan hot-path code for performance violations — allocations per frame, missing early-exit guards, repeated lookups, spread operators in render loops.

```
@perf-audit check the scroll handler
@perf-audit audit src/rendering/renderer.ts
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep |
| Model | Opus |
| Effort | High |
| Memory | Project — remembers past findings across sessions |

**What it checks:**

| Severity | Violation |
|----------|-----------|
| Critical | Spread operators in render/scroll code |
| Critical | `.map()` / `.filter()` creating arrays per frame |
| Critical | Object/array literals in scroll handlers |
| Critical | `new` keyword in per-frame code |
| Important | Missing early-exit guards |
| Important | Repeated deep property lookups |
| Important | Getters in tight loops |
| Important | Recomputing unchanged values |

---

### typecheck

Run `tsc --noEmit` in strict mode. Groups errors by file, diagnoses each, and flags any `any` usage (zero tolerance).

```
@typecheck
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep, Bash |
| Model | Sonnet |

---

### code-review

Review code changes against all project rules — TypeScript strict mode, dimension-agnostic design, CSS/BEM conventions, and feature architecture. Read-only — never edits files. Delegates to `@perf-audit` when changes touch hot-path files.

```
@code-review review my staged changes
@code-review check src/features/grid/feature.ts
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep, Bash, Agent |
| Sub-agents | perf-audit |
| Model | Opus |
| Effort | High |
| Memory | Project — learns team patterns and past review decisions |

**Rules checked:** TypeScript (no `any`, explicit types, `const` preference, early returns), dimension-agnostic naming, CSS (no inline styles, BEM, custom properties), feature conventions (`VListFeature<T>`, `with*` factories, no cross-feature imports).

**Hot-path delegation:** When changed files include scroll handlers, renderers, or range calculations, automatically spawns `@perf-audit` for specialized performance analysis.

---

### feature-scaffold

Scaffold a new feature with all required files, following project conventions exactly. The only agent that can write files. After creating files, spawns sub-agents to validate the scaffold.

```
@feature-scaffold create a "drag" feature for drag-to-reorder
@feature-scaffold new "filter" feature for client-side filtering
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep, Bash, Write, Edit, Agent |
| Sub-agents | typecheck, test-runner |
| Model | Sonnet |

**Creates:**
- `src/features/{name}/feature.ts` — `VListFeature<T>` implementation
- `src/features/{name}/index.ts` — barrel export
- `src/features/{name}/types.ts` — config types (if needed)
- `test/features/{name}/feature.test.ts` — test skeleton
- Export in `src/index.ts`

**Validation:** After creating files, spawns `@typecheck` and `@test-runner` in parallel to verify the scaffold compiles and tests pass.

---

### size-check

Build the library and measure gzipped bundle sizes per feature entry point. Flags anything over 5KB.

```
@size-check
```

| Field | Value |
|-------|-------|
| Tools | Read, Bash |
| Model | Sonnet |

---

### pre-commit

Full quality gate that orchestrates sub-agents for parallel execution. Stops at first failure.

```
@pre-commit
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep, Bash, Agent |
| Sub-agents | typecheck, test-runner, size-check |
| Model | Sonnet |

**Pipeline:**
1. **Phase 1 (parallel):** Spawns `@typecheck` and `@test-runner` concurrently
2. **Phase 2 (sequential):** If Phase 1 passes, runs build then spawns `@size-check`

---

### dev

Autonomous implementation agent. Writes code, validates with sub-agents, and iterates until all checks pass. Runs in a **git worktree** for isolation — changes stay in the worktree for you to review.

```
@dev fix the flaky scroll velocity test
@dev add horizontal support to withMasonry
claude --agent dev "implement withDrag feature for reorder"
```

| Field | Value |
|-------|-------|
| Tools | Read, Glob, Grep, Bash, Write, Edit, Agent |
| Sub-agents | typecheck, test-runner, code-review |
| Model | Opus |
| Effort | High |
| Max turns | 30 |
| Isolation | Worktree |

**Workflow:**
1. **Understand** — reads relevant source and tests
2. **Plan** — identifies files to change, considers test impact
3. **Implement** — writes code following all project rules
4. **Validate** — spawns `@typecheck` + `@test-runner` in parallel, then `@code-review`
5. **Iterate** — fixes issues and re-validates (max 3 attempts per issue)
6. **Report** — summarizes changes, test results, and any concerns

**Safety:** Max 3 fix iterations per issue before reporting a blocker. Never commits — leaves changes in the worktree for review.

---

## Skills

Skills live in `.claude/skills/`. Each is a directory with a `SKILL.md` file. They use dynamic context injection (`` !`command` ``) to pre-load relevant state before Claude processes the request.

### /changelog

Generate a categorized changelog entry from recent commits.

```
/changelog              # since last tag
/changelog v1.3.0       # since specific ref
```

Categorizes commits into **Added** (feat), **Changed** (refactor, perf), **Fixed** (fix), and **Testing** (test). Outputs markdown — does not write to any file.

---

### /coverage-gaps

Find untested code paths and suggest specific test cases to close gaps.

```
/coverage-gaps          # full project
/coverage-gaps async    # single feature
/coverage-gaps src/rendering/renderer.ts  # single file
```

Runs coverage, identifies functions below 100%, reads the source to determine which branches are uncovered, and suggests concrete test cases.

---

### /api-surface

List all public exports from `src/index.ts` and `src/internals.ts`. Flags anything that looks accidentally exported.

```
/api-surface
```

Categorizes exports into Functions, Types, Constants, and Classes. Useful before releases to catch unintended API changes.

---

### /diagnose-test

Debug a failing test with full context — runs the test, reads source and test files, identifies root cause.

```
/diagnose-test test/features/async/feature.test.ts
/diagnose-test test/rendering/renderer.test.ts
```

Reports the exact failure, reads all relevant files, checks recent git history for regressions, and provides a specific diagnosis with line numbers.

---

### /release-check

Full pre-release checklist: version validation, changelog, typecheck, tests, build, size, and git state.

```
/release-check          # check current version
/release-check 1.5.0    # check against target version
```

Pre-loads current version, latest tag, and unreleased commits. Outputs a pass/fail table for each check.

---

## File Structure

```
.claude/
├── CLAUDE.md                          # Project instructions
├── settings.json                      # Hooks (team-shared)
├── settings.local.json                # Local permissions (gitignored)
├── agents/
│   ├── dev.md                         # Autonomous implementation + validation
│   ├── test-runner.md                 # Test execution + diagnosis
│   ├── perf-audit.md                  # Hot-path performance audit
│   ├── typecheck.md                   # TypeScript strict checking
│   ├── code-review.md                 # Full convention review
│   ├── feature-scaffold.md            # New feature scaffolding
│   ├── size-check.md                  # Bundle size measurement
│   └── pre-commit.md                  # Full quality gate
└── skills/
    ├── changelog/SKILL.md             # Changelog generation
    ├── coverage-gaps/SKILL.md         # Coverage gap analysis
    ├── api-surface/SKILL.md           # Public API listing
    ├── diagnose-test/SKILL.md         # Test failure diagnosis
    └── release-check/SKILL.md         # Pre-release checklist
```

## Design Principles

- **Passive enforcement via hooks** — typecheck runs on every edit, tests gate every push — quality is automatic, not manual
- **Agents are read-only by default** — only `feature-scaffold` and `dev` can write files
- **Skills never edit** — they report and suggest, you decide
- **Right model for the job** — Opus with high effort for deep reasoning (`code-review`, `perf-audit`, `dev`), Sonnet for execution-focused agents
- **Scoped tools** — each agent/skill only has access to the tools it needs
- **Sub-agent composition** — orchestrator agents (`pre-commit`, `code-review`, `feature-scaffold`, `dev`) delegate to leaf agents (`typecheck`, `test-runner`, `perf-audit`, `size-check`) for parallel execution and separation of concerns
- **Persistent memory** — `code-review` and `perf-audit` remember past findings and team decisions across sessions (project-scoped)
- **Worktree isolation** — `dev` agent works in a separate git worktree, keeping your working tree clean
- **Dynamic context** — skills pre-load git state, file contents, and versions before Claude starts thinking
- **Project-aware** — all agents and skills encode vlist's specific rules (no `any`, zero allocations on hot paths, dimension-agnostic design, BEM CSS, etc.)
