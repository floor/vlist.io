---
test_file: test/integration/async-snapshots.test.ts
source_files:
  - src/plugins/async/plugin.ts
  - src/plugins/snapshots/plugin.ts
  - src/plugins/selection/plugin.ts
  - src/core/create.ts
coverage:
  tests: 6
  passing: 6
status: passing
v1_delta: null
tags: [integration, async, snapshots, selection]
---

# Async + Snapshots Integration

## What We Test
- Scroll snapshot capture after async data load
- Snapshot capture including selection state (async + selection + snapshots)
- Scroll position restore from snapshot
- Auto-save to sessionStorage with a key
- Restore from sessionStorage on new instance creation
- Selection restore from snapshot

## Test Groups
- **snapshot capture** (2 tests): capture after async load with index/total, capture with selection state (selectedIds)
- **snapshot restore** (1 test): restore scroll position from snapshot
- **auto-save with async** (2 tests): auto-save to sessionStorage, restore from sessionStorage on creation
- **snapshot with selection restore** (1 test): restore selection from snapshot after clearSelection

## Known Gaps
- No test for snapshot with scroll position mid-list after async loads
- No test for auto-save timing relative to async load events
