---
test_file: test/plugins/groups/plugin.test.ts
source_files:
  - src/plugins/groups/plugin.ts
coverage:
  tests: 50
  passing: 50
status: passing
v1_delta: +14
tags: [plugin, groups, integration, sticky-header]
---

# Groups Plugin Tests

## What We Test

- Factory creation with getGroupForIndex and header config (name, priority, validation)
- Validation (missing getGroupForIndex, missing header template, non-positive header height)
- Setup wiring into PluginContext (CSS class, destroy handler, setSizeConfig, setVirtualTotal, setRenderFn, getGroupLayout method, sticky header creation)
- Render function replacement (header injection, item rendering with group context)
- Layout correctness (group boundaries, header positions, virtual total expansion)
- onAfterScroll hook (sticky header update on scroll position changes)
- Destroy cleanup (sticky header, layout, CSS class removal)
- Edge cases (empty items, single group, one item per group, function-based header height, custom classPrefix, horizontal mode)

## Test Groups

- **groups -- Factory** (10 tests): plugin creation, name/priority, validation (missing getGroupForIndex/template, non-positive height), config acceptance (sticky flag, function header height, classPrefix)
- **groups -- Setup** (14 tests): CSS class, destroy handler, setSizeConfig, setVirtualTotal, setRenderFn, getGroupLayout method registration, sticky header creation, onAfterScroll hook registration
- **groups -- Render Functions** (9 tests): header injection in render output, item template invocation, group context passed to templates, header template invocation, re-render behavior
- **groups -- Layout** (5 tests): group boundary computation, header positions, virtual total expansion, layout consistency
- **groups -- onAfterScroll Hook** (5 tests): sticky header update on scroll, push-out transitions, no-op when sticky disabled
- **groups -- Destroy** (3 tests): sticky header cleanup, layout cleanup, CSS class removal
- **groups -- Edge Cases** (4 tests): empty items, single group, one item per group, horizontal mode

## Known Gaps

- v1 had 36 tests; v2 has 50 tests (+14). The v2 adds expanded factory validation, setup wiring, and edge case tests.
- No missing coverage relative to v1.
