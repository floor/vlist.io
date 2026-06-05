/**
 * Debug: tree selection consistency
 *
 * Tests whether clicking a tree node consistently selects it.
 * Hypothesis: when expandOnClick triggers a DOM rebuild, the tree plugin
 * calls select(clickedId) and then the selection plugin's click handler
 * calls doToggle(id) — toggling the selection OFF immediately.
 *
 * Usage:
 *   bun run scripts/debug/tests/tree-selection-consistency.mjs
 *   bun run scripts/debug/tests/tree-selection-consistency.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/tree", { settle: 2000 }, async (s) => {
  const { page } = s;

  // ── Helpers ────────────────────────────────────────────────────

  async function getState() {
    return page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      const items = Array.from(content?.children ?? []);
      return {
        total: items.length,
        selected: items
          .filter(el => el.classList.contains("vlist-item--selected"))
          .map(el => ({ idx: el.dataset.index, id: el.getAttribute("data-id") })),
        focused: items
          .filter(el => el.classList.contains("vlist-item--focused"))
          .map(el => ({ idx: el.dataset.index, id: el.getAttribute("data-id") })),
        ariaSelected: items
          .filter(el => el.getAttribute("aria-selected") === "true")
          .map(el => ({ idx: el.dataset.index, id: el.getAttribute("data-id") })),
      };
    });
  }

  async function getItemInfo(dataIndex) {
    return page.evaluate((idx) => {
      const el = document.querySelector(`[data-index="${idx}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        id: el.getAttribute("data-id"),
        index: el.dataset.index,
        isFolder: el.querySelector(".tree-node__chevron") !== null,
        text: el.textContent?.replace(/\s+/g, " ").trim().substring(0, 60),
        rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
      };
    }, dataIndex);
  }

  async function clickItem(dataIndex) {
    const info = await getItemInfo(dataIndex);
    if (!info) return null;
    const x = (info.rect.left + info.rect.right) / 2;
    const y = (info.rect.top + info.rect.bottom) / 2;
    await page.mouse.click(x, y);
    await s.wait(300);
    return info;
  }

  let pass = true;
  let totalTests = 0;
  let failures = 0;

  function check(label, selectedIds, expectedId) {
    totalTests++;
    const found = selectedIds.some(s => s.id === expectedId);
    if (!found) {
      failures++;
      pass = false;
      console.log(`  ❌ ${label}: expected "${expectedId}" selected, got [${selectedIds.map(s => s.id).join(", ") || "none"}]`);
    } else {
      console.log(`  ✓  ${label}: "${expectedId}" selected`);
    }
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Tree Selection Consistency");
  console.log("═══════════════════════════════════════════════\n");

  // ── Test 1: Click file nodes (no expansion) ───────────────────

  console.log("── Test 1: File clicks (no expand/collapse) ──\n");

  const items = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    return Array.from(content?.children ?? [])
      .sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index))
      .map(el => ({
        idx: el.dataset.index,
        id: el.getAttribute("data-id"),
        hasChevron: !!el.querySelector(".tree-node__chevron--expanded, .tree-node__chevron--collapsed"),
      }));
  });

  const files = items.filter(i => !i.hasChevron);
  console.log(`  Found ${files.length} file nodes, ${items.length - files.length} folder nodes`);

  for (const file of files.slice(0, 5)) {
    const info = await clickItem(parseInt(file.idx));
    if (!info) continue;
    const state = await getState();
    check(`File "${info.id}"`, state.selected, info.id);
  }

  // ── Test 2: Click a folder that expands ───────────────────────

  console.log("\n── Test 2: Folder click (triggers expand) ──\n");

  // Find a collapsed folder
  const collapsedFolder = items.find(i => i.hasChevron);
  if (collapsedFolder) {
    // First check if it's already expanded — if so, collapse it first
    const beforeClick = await getItemInfo(parseInt(collapsedFolder.idx));
    console.log(`  Target folder: "${beforeClick?.id}" at index ${collapsedFolder.idx}`);

    // Get the total before click
    const beforeState = await getState();
    const beforeTotal = beforeState.total;

    const info = await clickItem(parseInt(collapsedFolder.idx));
    const afterState = await getState();
    const afterTotal = afterState.total;
    const domRebuilt = beforeTotal !== afterTotal;

    console.log(`  DOM rebuilt: ${domRebuilt} (${beforeTotal} → ${afterTotal} items)`);
    check(`Folder "${info?.id}" after expand/collapse`, afterState.selected, info?.id);
  }

  // ── Test 3: Repeated folder toggle ────────────────────────────

  console.log("\n── Test 3: Folder toggle 6x (expand/collapse/expand/...) ──\n");

  // Find first folder and test toggle consistency
  const folders = items.filter(i => i.hasChevron);
  if (folders.length > 0) {
    const targetIdx = parseInt(folders[0].idx);

    for (let i = 0; i < 6; i++) {
      const beforeState = await getState();
      const info = await clickItem(targetIdx);
      if (!info) { console.log(`  Click ${i + 1}: item at ${targetIdx} not found`); break; }

      // Re-read the actual state from DOM (item may have moved)
      const afterState = await getState();
      const domRebuilt = beforeState.total !== afterState.total;

      const selectedIds = afterState.selected.map(s => s.id);
      const isSelected = selectedIds.includes(info.id);

      totalTests++;
      if (!isSelected) {
        failures++;
        pass = false;
        console.log(`  ❌ Toggle ${i + 1}: "${info.id}" NOT selected (domRebuilt=${domRebuilt}, selected=[${selectedIds.join(", ") || "none"}])`);
      } else {
        console.log(`  ✓  Toggle ${i + 1}: "${info.id}" selected (domRebuilt=${domRebuilt})`);
      }
    }
  }

  // ── Test 4: Click folder then file rapidly ────────────────────

  console.log("\n── Test 4: Alternating folder/file clicks ──\n");

  if (folders.length > 0 && files.length > 0) {
    const folderIdx = parseInt(folders[0].idx);
    const fileIdx = parseInt(files[0].idx);

    for (let i = 0; i < 4; i++) {
      const isFolder = i % 2 === 0;
      const idx = isFolder ? folderIdx : fileIdx;

      const info = await clickItem(idx);
      if (!info) continue;
      const state = await getState();
      check(`Alternating #${i + 1} (${isFolder ? "folder" : "file"}) "${info.id}"`, state.selected, info.id);
    }
  }

  // ── Test 5: Click unexpanded folder (triggers async loadChildren) ──

  console.log("\n── Test 5: Unexpanded folder with async loadChildren ──\n");

  // Find a folder that hasn't been expanded yet (e.g., scripts, test, etc.)
  const unexpandedFolder = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    for (const el of items) {
      const chevron = el.querySelector(".tree-node__chevron--collapsed");
      if (chevron) {
        return {
          idx: el.dataset.index,
          id: el.getAttribute("data-id"),
        };
      }
    }
    return null;
  });

  if (unexpandedFolder) {
    console.log(`  Target: "${unexpandedFolder.id}" at index ${unexpandedFolder.idx}`);

    const beforeState = await getState();
    const info = await clickItem(parseInt(unexpandedFolder.idx));
    // Extra wait for async loadChildren
    await s.wait(500);
    const afterState = await getState();
    const domRebuilt = beforeState.total !== afterState.total;

    console.log(`  DOM rebuilt: ${domRebuilt} (${beforeState.total} → ${afterState.total} items)`);
    check(`Async folder "${info?.id}"`, afterState.selected, info?.id);
  } else {
    console.log("  (no collapsed folder found to test)");
  }

  // ── Test 6: Double-handling evidence ──────────────────────────

  console.log("\n── Test 6: Selection state trace during folder click ──\n");

  // Inject an event listener to trace the exact sequence of selection changes
  await page.evaluate(() => {
    window.__selectionTrace = [];
    const content = document.querySelector(".vlist-content");
    if (!content) return;

    // Observe class changes on all items
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          const el = m.target;
          const wasSelected = m.oldValue?.includes("vlist-item--selected");
          const isSelected = el.classList.contains("vlist-item--selected");
          if (wasSelected !== isSelected) {
            window.__selectionTrace.push({
              id: el.getAttribute("data-id"),
              idx: el.dataset.index,
              action: isSelected ? "SELECTED" : "DESELECTED",
              time: performance.now(),
            });
          }
        }
      }
    });
    observer.observe(content, { attributes: true, attributeOldValue: true, subtree: true });
    window.__selectionObserver = observer;
  });

  // Click a folder that will expand
  const traceFolder = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    for (const el of items) {
      const chevron = el.querySelector(".tree-node__chevron--expanded, .tree-node__chevron--collapsed");
      if (chevron) return { idx: el.dataset.index, id: el.getAttribute("data-id") };
    }
    return null;
  });

  if (traceFolder) {
    console.log(`  Tracing clicks on folder "${traceFolder.id}"`);

    await clickItem(parseInt(traceFolder.idx));

    const trace = await page.evaluate(() => {
      const t = window.__selectionTrace;
      window.__selectionTrace = [];
      return t;
    });

    if (trace.length === 0) {
      console.log("  (no class mutations observed — item may have been re-created in DOM)");
    } else {
      console.log(`  ${trace.length} selection mutations:`);
      for (const entry of trace) {
        console.log(`    ${entry.action} "${entry.id}" (idx=${entry.idx}) at t=${entry.time.toFixed(1)}`);
      }

      // Check for select-then-deselect pattern (the double-handling bug)
      const selectThenDeselect = trace.length >= 2
        && trace[0].action === "SELECTED"
        && trace[1].action === "DESELECTED"
        && trace[0].id === trace[1].id;

      if (selectThenDeselect) {
        console.log(`  🔴 DOUBLE-HANDLING DETECTED: "${trace[0].id}" selected then immediately deselected`);
      }
    }

    // Clean up observer
    await page.evaluate(() => {
      window.__selectionObserver?.disconnect();
    });
  }

  // ── Summary ───────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════════");
  console.log(`  ${totalTests - failures}/${totalTests} passed, ${failures} failed`);
  console.log("═══════════════════════════════════════════════\n");

  return { pass };
});
