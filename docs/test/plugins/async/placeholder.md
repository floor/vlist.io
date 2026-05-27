---
test_file: test/plugins/async/placeholder.test.ts
source_files:
  - src/plugins/async/placeholder.ts
coverage:
  tests: 48
  passing: 48
status: passing
v1_delta: 0
tags: [plugin, async, placeholder, pure-functions]
---

# Async Placeholder Tests

## What We Test

- createPlaceholderManager factory with default and custom config
- Structure analysis from sample items (per-item length profiles)
- analyzeStructure guards (empty array, already analyzed, maxSampleSize)
- generate single placeholder items with correct structure
- generateRange for contiguous placeholder arrays
- clear to reset analyzed state
- Edge cases (items with nested objects, arrays, empty strings, null values)
- isPlaceholderItem utility (detects __placeholder flag)
- filterPlaceholders utility (separates real items from placeholders)
- countRealItems utility (counts non-placeholder items in array)

## Test Groups

- **createPlaceholderManager > initialization** (2 tests): factory creation, initial state (not analyzed)
- **createPlaceholderManager > analyzeStructure** (14 tests): sample analysis, empty array guard, re-analyze guard, maxSampleSize, field type preservation (string lengths, numbers, booleans), nested objects
- **createPlaceholderManager > generate** (10 tests): single placeholder generation, __placeholder flag, string length matching, number zeroing, boolean preservation, ID uniqueness
- **createPlaceholderManager > generateRange** (5 tests): range generation, count accuracy, unique IDs across range, cycling through profiles
- **createPlaceholderManager > clear** (3 tests): reset analyzed state, re-analyze after clear
- **createPlaceholderManager > edge cases** (8 tests): null values, empty strings, arrays in items, deeply nested objects, items with no string fields, single-field items
- **isPlaceholderItem** (3 tests): placeholder detection, real item detection, undefined/null handling
- **filterPlaceholders** (2 tests): separation of real and placeholder items
- **countRealItems** (1 test): count non-placeholder items

## Known Gaps

- None; v1 and v2 have identical test counts (48)
