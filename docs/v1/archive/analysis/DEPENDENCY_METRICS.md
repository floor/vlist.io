# VList Dependency Metrics Summary

Quick reference for dependency health monitoring.

## 🎯 Critical Metrics (Current)

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Circular Dependencies** | 0 | 0 | ✅ Perfect |
| **Avg Dependencies/File** | 2.85 | < 4.0 | ✅ Excellent |
| **Max Dependency Depth** | 9 | ≤ 10 | ✅ Good |
| **Cross-Feature Deps** | 1 | ≤ 2 | ✅ Excellent |
| **Total Files** | 46 | - | - |
| **Total Dependencies** | 131 | - | - |

## 📊 Complexity Distribution

```
🟢 Simple (0-2 deps):  27 files (59%)
🟡 Medium (3-4 deps):  12 files (26%)
🟠 Complex (5-6 deps):  4 files (9%)
🔴 High (7+ deps):      3 files (7%)
```

## 🏗️ Module Health

| Module | Files | Avg Deps | Internal % | Health |
|--------|-------|----------|------------|--------|
| Rendering | 5 | 2.40 | 67% | 🟢 Excellent |
| Events | 2 | 1.00 | 50% | 🟢 Excellent |
| Features | 28 | 2.64 | 50% | 🟢 Good |
| Builder | 5 | 4.00 | 30% | 🟡 Acceptable |
| Core | 2 | 0.00 | 100% | 🟢 Perfect |

## 🎖️ Top 5 Most Critical Files

1. **types.ts** (26 dependents) 🔴
2. **builder/types.ts** (12 dependents) 🔴
3. **rendering/heights.ts** (7 dependents) 🟠
4. **rendering/index.ts** (6 dependents) 🟠
5. **rendering/viewport.ts** (5 dependents) 🟡

## 📈 Trends to Monitor

- [ ] Keep circular dependencies at 0
- [ ] Keep avg deps/file below 4.0
- [ ] Keep cross-feature deps ≤ 2
- [ ] Watch depth if it approaches 12+
- [ ] Monitor types.ts for growth (26 deps is high)

## 🔍 Quick Health Check Commands

```bash
# Check for circular dependencies
madge --circular --extensions ts src/

# Get summary stats
madge --summary --extensions ts src/

# Find orphan files
madge --orphans --extensions ts src/

# Update dependency graph
madge --image deps-graph.svg --extensions ts src/
```

## 📅 Last Updated

- **Date:** February 18, 2026
- **Version:** 0.7.1
- **Madge Version:** 8.0.0
