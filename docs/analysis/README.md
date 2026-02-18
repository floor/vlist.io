# VList Dependency Analysis

This directory contains comprehensive dependency analysis reports and visualizations for the VList project, generated using Madge.

## 📚 Documentation Files

### Quick Start

**👉 Start here:** [DEPENDENCY_REPORTS_INDEX.md](./DEPENDENCY_REPORTS_INDEX.md)

This index provides an overview of all reports and how to use them.

### Reports

1. **[MADGE_ANALYTICS_REPORT.md](./MADGE_ANALYTICS_REPORT.md)** (15KB) ⭐
   - **Main comprehensive report**
   - Executive summary with key metrics
   - Architecture analysis (9-level dependency hierarchy)
   - Module analysis by directory
   - Most critical files (types.ts: 26 dependents)
   - Coupling analysis
   - Feature plugin consistency analysis (100% pattern compliance)
   - Architectural patterns
   - Risk analysis and recommendations
   - **Overall Grade: A+** (Maintainability Score: 95/100)

2. **[DEPENDENCY_METRICS.md](./DEPENDENCY_METRICS.md)** (1.9KB)
   - Quick reference dashboard
   - At-a-glance metrics for monitoring
   - Critical metrics summary
   - Complexity distribution
   - Module health scores
   - Top 5 most critical files

3. **[DEPENDENCY_ANALYSIS.md](./DEPENDENCY_ANALYSIS.md)** (3.1KB)
   - Initial analysis summary
   - Summary statistics
   - Most depended upon files
   - Orphan files (entry points)
   - Core architecture overview

## 📊 Visualizations (SVG)

### [deps-graph.svg](./deps-graph.svg) (87KB)
Complete dependency graph showing all 46 TypeScript files and their 131 dependencies.

**Use for:** Understanding overall project structure and relationships.

### [deps-features.svg](./deps-features.svg) (62KB)
Feature modules dependency graph (28 files across 8 feature plugins).

**Use for:** Understanding plugin architecture and feature isolation.

### [deps-builder.svg](./deps-builder.svg) (23KB)
Builder system dependency graph (5 files).

**Use for:** Understanding builder context, core, data, and types relationships.

### [deps-rendering.svg](./deps-rendering.svg) (8.5KB)
Rendering layer dependency graph (5 files).

**Use for:** Understanding heights, renderer, scale, and viewport relationships.

## 💾 Data Files

### [deps-analysis.json](./deps-analysis.json) (5KB)
Raw dependency data in JSON format for custom analysis or tooling integration.

## 🎯 Key Findings Summary

### ✅ Strengths

- **Zero circular dependencies** - Clean acyclic dependency graph
- **Low coupling** - 2.85 avg dependencies per file (target: <4.0)
- **High consistency** - All 8 feature plugins follow identical pattern
- **Strong type safety** - Central types.ts with 26 dependents
- **Feature isolation** - Only 1 cross-feature dependency (scale → scrollbar)

### 📊 Metrics at a Glance

| Metric | Value | Assessment |
|--------|-------|------------|
| Total Files | 46 | Medium-sized |
| Total Dependencies | 131 | Healthy |
| Avg Deps/File | 2.85 | ✅ Excellent |
| Max Deps | 13 (index.ts) | ✅ Expected |
| Circular Deps | 0 | ✅ Perfect |
| Max Depth | 9 levels | ✅ Good |
| Cross-Feature Deps | 1 | ✅ Excellent |

### 🏆 Overall Grade: A+

**Maintainability Score:** 95/100

The VList codebase demonstrates exemplary dependency management with best-in-class patterns consistently applied.

## 🔍 How to Use These Reports

### For New Contributors
1. Start with **DEPENDENCY_REPORTS_INDEX.md** for quick overview
2. Read **MADGE_ANALYTICS_REPORT.md** for detailed understanding
3. View **deps-graph.svg** to see visual relationships

### For Code Reviews
1. Check **DEPENDENCY_METRICS.md** for metric changes
2. Verify new code follows plugin pattern consistency
3. Ensure no new circular dependencies introduced

### For Refactoring
1. Consult **MADGE_ANALYTICS_REPORT.md** section on "Most Critical Files"
2. Use **deps-*.svg** to understand impact radius
3. Check coupling analysis before moving code

### For Monitoring
1. Track metrics in **DEPENDENCY_METRICS.md** over time
2. Alert if avg deps/file exceeds 4.0
3. Watch for any circular dependencies

## 🛠️ Regenerating Analysis

To regenerate these reports in the VList project:

```bash
cd ~/Code/floor/vlist

# Check for circular dependencies
madge --circular --extensions ts src/

# Get summary statistics
madge --summary --extensions ts src/

# Find orphan files
madge --orphans --extensions ts src/

# Find leaf nodes (no dependencies)
madge --leaves --extensions ts src/

# Generate complete dependency graph
madge --image deps-graph.svg --extensions ts src/

# Generate feature module graph
madge --image deps-features.svg --extensions ts src/features/

# Generate builder module graph
madge --image deps-builder.svg --extensions ts src/builder/

# Generate rendering module graph
madge --image deps-rendering.svg --extensions ts src/rendering/

# Export JSON data
madge --json --extensions ts src/ > deps-analysis.json

# Move to docs
mv deps-*.svg deps-*.json ~/Code/floor/vlist.dev/docs/analysis/
```

Or use the npm scripts defined in package.json:

```bash
npm run analyze:deps          # Check circular dependencies
npm run analyze:orphans       # Find orphan files
npm run analyze:tree          # Show dependency tree
npm run analyze:graph         # Generate main graph
npm run analyze:graphs        # Generate all graphs
npm run analyze:all           # Run all checks
```

## 📅 Analysis Info

- **Generated:** February 18, 2025
- **Tool:** Madge 8.0.0
- **Project Version:** @floor/vlist 0.7.1
- **Files Analyzed:** 46 TypeScript files
- **Total Dependencies:** 131 relationships

## 🔗 Related Documentation

- [VList Documentation](../) - Main documentation
- [Architecture Guide](../internals/) - Internal architecture details
- [Contributing Guide](../../../CONTRIBUTING.md) - Contribution guidelines

---

**Questions or need additional analysis?** Refer to [DEPENDENCY_REPORTS_INDEX.md](./DEPENDENCY_REPORTS_INDEX.md) or the [Madge documentation](https://github.com/pahen/madge).