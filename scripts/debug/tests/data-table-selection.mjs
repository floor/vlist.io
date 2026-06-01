/**
 * Debug: data-table group selection — click should select the clicked row
 *
 * Usage:
 *   bun run scripts/debug/tests/data-table-selection.mjs
 *   bun run scripts/debug/tests/data-table-selection.mjs --headed
 */

import { run } from "../runner.mjs";

function clickAndCheck(page, rowIndex, label) {
  return page.evaluate((idx) => {
    const rows = Array.from(document.querySelectorAll(".vlist-table-row:not(.vlist-table-group-header)"));
    const row = rows[idx];
    if (!row) return { error: `Row ${idx} not found`, rowCount: rows.length };
    const name = row.querySelector(".table-name__text")?.textContent?.trim();
    row.click();
    const selected = document.querySelector("[aria-selected='true']");
    const selectedName = selected?.querySelector(".table-name__text")?.textContent?.trim();
    return { clickedName: name, selectedName, match: name === selectedName };
  }, rowIndex);
}

await run("/examples/data-table", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Data Table Group Selection Debug ===\n");

  // Row 1 (Shanghai) — first item, layout index 1 (after header)
  const r1 = await clickAndCheck(page, 0, "Row 1");
  console.log("Click Shanghai:", r1.match ? "✅" : `❌ clicked ${r1.clickedName}, selected ${r1.selectedName}`);

  // Row 4 (Guangzhou) — same group, layout index 4
  const r4 = await clickAndCheck(page, 3, "Row 4");
  console.log("Click Guangzhou:", r4.match ? "✅" : `❌ clicked ${r4.clickedName}, selected ${r4.selectedName}`);

  // Row 8 (Ho Chi Minh City) — second group (10M+), after header
  const r8 = await clickAndCheck(page, 7, "Row 8");
  console.log("Click Ho Chi Minh:", r8.match ? "✅" : `❌ clicked ${r8.clickedName}, selected ${r8.selectedName}`);

  // Row 10 (Lahore) — second group, deeper
  const r10 = await clickAndCheck(page, 9, "Row 10");
  console.log("Click Lahore:", r10.match ? "✅" : `❌ clicked ${r10.clickedName}, selected ${r10.selectedName}`);

  console.log("");
});
