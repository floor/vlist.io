/**
 * Debug: tree click issues
 *
 * 1. Click below text label — does it select?
 * 2. Click on folder — does it always select?
 *
 * Usage:
 *   bun run scripts/debug/tests/tree-click.mjs
 *   bun run scripts/debug/tests/tree-click.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/tree", { settle: 2000 }, async (s) => {
  const { page } = s;

  function getState() {
    return page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      const items = Array.from(content?.children ?? []);
      return {
        selected: items.filter(el => el.classList.contains("vlist-item--selected")).map(el => el.getAttribute("data-id")),
        focused: items.filter(el => el.classList.contains("vlist-item--focused")).map(el => el.getAttribute("data-id")),
      };
    });
  }

  function getItemRect(idx) {
    return page.evaluate((i) => {
      const el = document.querySelector(`[data-index="${i}"]`);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const treeNode = el.querySelector(".tree-node");
      const label = el.querySelector(".tree-node__label");
      return {
        id: el.getAttribute("data-id"),
        item: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, height: rect.height },
        treeNode: treeNode ? { height: treeNode.offsetHeight, computedH: getComputedStyle(treeNode).height } : null,
        label: label ? (() => { const r = label.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: r.height }; })() : null,
      };
    }, idx);
  }

  console.log("\n=== Tree Click Debug ===\n");

  // Inspect item geometry
  const rect = await getItemRect(2);
  console.log("Item [2] geometry:", JSON.stringify(rect, null, 2));

  // Test 1: Click at the bottom of an item (below text, within item bounds)
  console.log("\n--- Test 1: Click bottom edge of item ---");
  const itemRect = rect.item;
  const bottomY = itemRect.bottom - 2;
  const centerX = (itemRect.left + itemRect.right) / 2;
  console.log(`  Clicking at (${centerX.toFixed(0)}, ${bottomY.toFixed(0)}) — 2px from bottom edge`);

  await page.mouse.click(centerX, bottomY);
  await s.wait(200);
  const state1 = await getState();
  console.log("  selected:", state1.selected);
  console.log(`  ${state1.selected.includes(rect.id) ? "✅ PASS" : "❌ FAIL"}`);

  // Test 2: Click at the label vertical center
  console.log("\n--- Test 2: Click at label center ---");
  const labelCenterY = rect.label ? (rect.label.top + rect.label.bottom) / 2 : itemRect.top + 15;
  await page.mouse.click(centerX, labelCenterY);
  await s.wait(200);
  const state2 = await getState();
  console.log("  selected:", state2.selected);
  console.log(`  ${state2.selected.length > 0 ? "✅ PASS" : "❌ FAIL"}`);

  // Test 3: Click on folder that needs expansion (scripts at [0])
  console.log("\n--- Test 3: Click folder (scripts at [0]) 3 times ---");
  for (let i = 0; i < 3; i++) {
    const folderRect = await getItemRect(0);
    if (!folderRect) { console.log("  no item at [0]"); break; }
    const fy = (folderRect.item.top + folderRect.item.bottom) / 2;
    const fx = (folderRect.item.left + folderRect.item.right) / 2;
    await page.mouse.click(fx, fy);
    await s.wait(600);
    const state = await getState();
    console.log(`  click ${i + 1}: selected=${JSON.stringify(state.selected)}`);
  }

  // Test 4: Click in the gap between label bottom and item bottom
  console.log("\n--- Test 4: Click in gap below label ---");
  const rect4 = await getItemRect(5);
  if (rect4 && rect4.label) {
    const gapY = rect4.label.bottom + 2;
    const gapX = (rect4.item.left + rect4.item.right) / 2;
    console.log(`  Item height: ${rect4.item.height}px, label bottom: ${rect4.label.bottom.toFixed(0)}, item bottom: ${rect4.item.bottom.toFixed(0)}`);
    console.log(`  Gap: ${(rect4.item.bottom - rect4.label.bottom).toFixed(0)}px below label`);
    console.log(`  Clicking at (${gapX.toFixed(0)}, ${gapY.toFixed(0)})`);

    // Check what element is at that point
    const hitTarget = await page.evaluate((x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? { tag: el.tagName, class: el.className, dataIndex: el.closest("[data-index]")?.dataset.index ?? null } : null;
    }, gapX, gapY);
    console.log("  Hit target:", hitTarget);

    await page.mouse.click(gapX, gapY);
    await s.wait(200);
    const state4 = await getState();
    console.log("  selected:", state4.selected);
    console.log(`  ${state4.selected.includes(rect4.id) ? "✅ PASS" : "❌ FAIL"}`);
  }

  console.log("");
});
