---
test_file: test/plugins/async/sparse.test.ts
source_files:
  - src/plugins/async/sparse.ts
coverage:
  tests: 134
  passing: 134
status: passing
v1_delta: 0
tags: [plugin, async, sparse-storage, data-structure, pure-functions]
---

# Async Sparse Storage Tests

## What We Test

- createSparseStorage factory (default config, custom chunk size, max cached items, eviction buffer, onEvict callback)
- Total management (get/set total, auto-expand on set beyond range)
- get/has/set individual items
- setRange for bulk insertion
- delete with index shifting and total update
- insert with index shifting and total update
- getRange for contiguous retrieval
- isRangeLoaded for range completeness checks
- getLoadedRanges for contiguous loaded segments
- findUnloadedRanges for gap detection
- Chunk operations (getChunkIndex, isChunkLoaded, isChunkFullyLoaded, touchChunk, touchChunksForRange)
- evictDistant (chunk-based eviction by distance from current position)
- evictToLimit (evict oldest chunks when over max cached items)
- getStats (total, cached, chunks, loaded ranges)
- getCachedCount
- Lifecycle (clear, reset)
- Integration scenarios (load, scroll, evict cycles)
- mergeRanges utility (standalone)
- calculateMissingRanges utility (standalone)

## Test Groups

- **createSparseStorage > factory** (5 tests): default config, custom chunk/max/buffer/onEvict
- **createSparseStorage > total management** (3 tests): get/set, auto-expand, no shrink
- **createSparseStorage > get** (6 tests): valid index, missing, boundary, undefined for unset
- **createSparseStorage > has** (5 tests): loaded/unloaded, boundary, after delete
- **createSparseStorage > set** (6 tests): single item, overwrite, auto-expand total, chunk creation
- **createSparseStorage > setRange** (7 tests): contiguous bulk set, overwrite, cross-chunk, auto-expand
- **createSparseStorage > delete** (22 tests): single delete, shift-down, boundary, multi-delete, chunk cleanup
- **createSparseStorage > insert** (7 tests): single insert, shift-up, boundary, total expand
- **createSparseStorage > getRange** (8 tests): full range, sparse, boundary, empty
- **createSparseStorage > isRangeLoaded** (5 tests): fully loaded, partial, empty range
- **createSparseStorage > getLoadedRanges** (10 tests): contiguous segments, gaps, single items
- **createSparseStorage > findUnloadedRanges** (11 tests): gaps in loaded data, fully loaded, fully unloaded
- **createSparseStorage > chunk operations > getChunkIndex** (2 tests): index-to-chunk mapping
- **createSparseStorage > chunk operations > isChunkLoaded** (3 tests): loaded/unloaded chunks
- **createSparseStorage > chunk operations > isChunkFullyLoaded** (6 tests): fully/partially loaded, boundary
- **createSparseStorage > chunk operations > touchChunk** (2 tests): LRU touch
- **createSparseStorage > chunk operations > touchChunksForRange** (4 tests): range-based LRU touch
- **createSparseStorage > evictDistant** (10 tests): distance-based eviction, onEvict callback, buffer
- **createSparseStorage > evictToLimit** (9 tests): limit-based eviction, oldest-first
- **createSparseStorage > getStats** (4 tests): stat reporting
- **createSparseStorage > getCachedCount** (2 tests): cached item count
- **createSparseStorage > lifecycle > clear** (3 tests): data clear, total preserved
- **createSparseStorage > lifecycle > reset** (2 tests): full reset including total
- **createSparseStorage > integration** (10 tests): load-scroll-evict cycles
- **mergeRanges (sparse module)** (6 tests): adjacent/overlapping range merging
- **calculateMissingRanges (sparse module)** (7 tests): gap detection

## Known Gaps

- None; v1 and v2 have identical test counts (134)
