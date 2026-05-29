/**
 * Debug: tree click → keyboard focus flow
 *
 * Tests that after clicking a tree item, ArrowDown moves focus
 * from the clicked item (not the last keyboard position).
 *
 * Usage:
 *   bun run scripts/debug/tests/tree-focus.mjs
 *   bun run scripts/debug/tests/tree-focus.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/tree", { settle: 1500 }, async (s) => {
  const { page } = s;

  // Helper: get the currently focused item's data-id via aria-activedescendant
  async function getFocusedId() {
    return page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      if (!content) return null;
      const desc = content.getAttribute("aria-activedescendant");
      if (!desc) return "(no aria-activedescendant)";
      const el = document.getElementById(desc);
      return el ? el.getAttribute("data-id") : `(${desc} not found)`;
    });
  }

  // Helper: get selection state
  async function getSelectionInfo() {
    return page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      const items = Array.from(content?.children ?? []);
      const selected = items.filter(el => el.classList.contains("vlist-item--selected"));
      const focused = items.filter(el => el.classList.contains("vlist-item--focused"));
      return {
        selectedIds: selected.map(el => el.getAttribute("data-id")),
        focusedIds: focused.map(el => el.getAttribute("data-id")),
        activedescendant: content?.getAttribute("aria-activedescendant") ?? null,
      };
    });
  }

  // Helper: get all visible item ids
  async function getVisibleIds() {
    return page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      return Array.from(content?.children ?? [])
        .sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index))
        .map(el => ({ idx: el.dataset.index, id: el.getAttribute("data-id") }));
    });
  }

  console.log("\n=== Tree Focus Debug ===\n");

  // Step 1: Show initial state
  const items = await getVisibleIds();
  console.log("Visible items:", items.slice(0, 8).map(i => `[${i.idx}] ${i.id}`).join(", "), items.length > 8 ? `... (${items.length} total)` : "");

  // Step 2: Wait for src to expand (it's pre-expanded)
  await s.wait(500);
  const items2 = await getVisibleIds();
  console.log("After settle:", items2.slice(0, 8).map(i => `[${i.idx}] ${i.id}`).join(", "));

  // Step 3: Click on a file (e.g., the 5th visible item)
  const targetIdx = 5;
  const targetId = items2[targetIdx]?.id;
  console.log(`\n--- Click on item [${targetIdx}] = ${targetId} ---`);

  await page.click(`[data-index="${targetIdx}"]`);
  await s.wait(200);

  const afterClick = await getSelectionInfo();
  console.log("After click:");
  console.log("  selected:", afterClick.selectedIds);
  console.log("  focused:", afterClick.focusedIds);
  console.log("  activedescendant:", afterClick.activedescendant);
  console.log("  getFocusedId:", await getFocusedId());

  // Step 4: Press ArrowDown
  console.log("\n--- Press ArrowDown ---");
  await page.keyboard.press("ArrowDown");
  await s.wait(200);

  const afterDown = await getSelectionInfo();
  const focusedAfter = await getFocusedId();
  console.log("After ArrowDown:");
  console.log("  selected:", afterDown.selectedIds);
  console.log("  focused:", afterDown.focusedIds);
  console.log("  activedescendant:", afterDown.activedescendant);
  console.log("  getFocusedId:", focusedAfter);

  // Step 5: Verify
  const expectedId = items2[targetIdx + 1]?.id;
  const pass = focusedAfter === expectedId;
  console.log(`\n--- Result ---`);
  console.log(`  Expected focus: ${expectedId}`);
  console.log(`  Actual focus:   ${focusedAfter}`);
  console.log(`  ${pass ? "✅ PASS" : "❌ FAIL"}`);

  // Step 6: Also test clicking a folder then pressing ArrowDown
  console.log("\n--- Click on folder (src) at [0], then ArrowDown ---");
  await page.click(`[data-index="0"]`);
  await s.wait(500);  // expandOnClick may trigger re-render

  const afterFolderClick = await getSelectionInfo();
  console.log("After folder click:");
  console.log("  selected:", afterFolderClick.selectedIds);
  console.log("  activedescendant:", afterFolderClick.activedescendant);
  console.log("  getFocusedId:", await getFocusedId());

  await page.keyboard.press("ArrowDown");
  await s.wait(200);

  const afterFolderDown = await getSelectionInfo();
  const focusAfterFolder = await getFocusedId();
  console.log("After ArrowDown:");
  console.log("  focused:", afterFolderDown.focusedIds);
  console.log("  getFocusedId:", focusAfterFolder);

  // src was clicked (and collapsed/expanded). ArrowDown should go to next visible item.
  const srcItems = await getVisibleIds();
  const srcIdx = srcItems.findIndex(i => i.id === "vlist/src");
  const nextId = srcItems[srcIdx + 1]?.id;
  const pass2 = focusAfterFolder === nextId;
  console.log(`  Expected: ${nextId}`);
  console.log(`  Actual:   ${focusAfterFolder}`);
  console.log(`  ${pass2 ? "✅ PASS" : "❌ FAIL"}`);

  console.log("");
  return { pass: pass && pass2 };
});
