/**
 * Debug: data-table keyboard navigation with groups + selection
 *
 * Usage:
 *   bun run scripts/debug/tests/data-table-keyboard.mjs
 *   bun run scripts/debug/tests/data-table-keyboard.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/data-table", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Data Table Keyboard Nav Debug ===\n");

  // Check DOM structure: tabindex, roles
  const domInfo = await page.evaluate(() => {
    const root = document.querySelector(".vlist");
    const content = document.querySelector(".vlist-content");
    const viewport = document.querySelector(".vlist-viewport");
    return {
      rootTabindex: root?.getAttribute("tabindex"),
      rootRole: root?.getAttribute("role"),
      contentTabindex: content?.getAttribute("tabindex"),
      contentRole: content?.getAttribute("role"),
    };
  });
  console.log("DOM:", JSON.stringify(domInfo));

  // Add keydown spy on root
  await page.evaluate(() => {
    window.__keydownCount = 0;
    document.querySelector(".vlist").addEventListener("keydown", () => { window.__keydownCount++; });
  });

  // Focus the list by clicking the first data row
  await page.evaluate(() => {
    const row = document.querySelector(".vlist-table-row:not(.vlist-table-group-header)");
    if (row) row.click();
  });
  await s.wait(200);

  // Check initial focus
  const initial = await page.evaluate(() => {
    const root = document.querySelector(".vlist");
    const content = document.querySelector(".vlist-content");
    return {
      selected: document.querySelector("[aria-selected='true']")?.querySelector(".table-name__text")?.textContent?.trim() ?? "(none)",
      activeEl: document.activeElement?.className ?? "(none)",
      rootFocused: root === document.activeElement,
      contentFocused: content === document.activeElement,
    };
  });
  console.log("After click:", JSON.stringify(initial));

  // Press ArrowDown
  await page.keyboard.press("ArrowDown");
  await s.wait(100);

  const after1 = await page.evaluate(() => {
    const focused = document.querySelector(".vlist-item--focused");
    const selected = document.querySelector("[aria-selected='true']");
    return {
      focusedName: focused?.querySelector(".table-name__text")?.textContent?.trim() ?? "(none)",
      selectedName: selected?.querySelector(".table-name__text")?.textContent?.trim() ?? "(none)",
      keydownCount: window.__keydownCount,
    };
  });
  console.log("After ArrowDown:", after1.focusedName, "selected:", after1.selectedName, "keydowns:", after1.keydownCount);

  // Press ArrowDown 5 more times (should cross the group header)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowDown");
    await s.wait(50);
  }

  const after6 = await page.evaluate(() => {
    const focused = document.querySelector(".vlist-item--focused");
    const selected = document.querySelector("[aria-selected='true']");
    return {
      focusedName: focused?.querySelector(".table-name__text")?.textContent?.trim() ?? "(none)",
      focusedIndex: focused?.dataset?.index,
      selectedName: selected?.querySelector(".table-name__text")?.textContent?.trim() ?? "(none)",
    };
  });
  console.log("After 6x ArrowDown:", after6.focusedName, `(idx ${after6.focusedIndex})`, "selected:", after6.selectedName);

  // Press ArrowUp to go back
  await page.keyboard.press("ArrowUp");
  await s.wait(100);

  const afterUp = await page.evaluate(() => {
    const focused = document.querySelector(".vlist-item--focused");
    return {
      focusedName: focused?.querySelector(".table-name__text")?.textContent?.trim() ?? "(none)",
      focusedIndex: focused?.dataset?.index,
    };
  });
  console.log("After ArrowUp:", afterUp.focusedName, `(idx ${afterUp.focusedIndex})`);

  console.log("");
});
