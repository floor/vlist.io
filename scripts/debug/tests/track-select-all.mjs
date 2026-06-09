/**
 * Debug: selectAll with async data in track-list.
 * Verifies that all items (including unloaded) get selected,
 * and that switching to single mode clears the selection.
 *
 *   bun scripts/debug/tests/track-select-all.mjs
 *   bun scripts/debug/tests/track-select-all.mjs --headless=false
 */
import { run, delay } from "../runner.mjs";

async function getSelectionState(session) {
  return session.evaluate(() => {
    const countEl = document.getElementById("selection-count");
    const items = document.querySelector(".vlist-content");
    if (!items) return { countText: "", visibleTotal: 0, visibleSelected: 0, visibleUnselected: [] };

    const children = Array.from(items.children);
    const selected = [];
    const unselected = [];
    for (const el of children) {
      const info = { idx: el.dataset.index, id: el.dataset.id };
      if (el.classList.contains("vlist-item--selected")) {
        selected.push(info);
      } else {
        unselected.push(info);
      }
    }
    return {
      countText: countEl?.textContent || "",
      visibleTotal: children.length,
      visibleSelected: selected.length,
      visibleUnselected: unselected,
    };
  });
}

await run("/examples/track-list", { settle: 2000 }, async (s) => {
  console.log("\n── Step 1: Switch to multiple selection ──");
  await s.click('[data-value="multiple"]');
  await s.wait(500);

  console.log("\n── Step 2: Click Select All ──");
  await s.click("#btn-select-all");
  await s.wait(1000);

  const after = await getSelectionState(s);
  console.log("  Count text:", after.countText);
  console.log("  Visible items:", after.visibleTotal);
  console.log("  Visible selected:", after.visibleSelected);
  const allVisibleSelected = after.visibleUnselected.length === 0;
  console.log(`  All visible items selected: ${allVisibleSelected ? "YES" : "NO — BUG"}`);

  console.log("\n── Step 3: Scroll to middle to check unloaded items ──");
  await s.scrollTo(5000);
  await s.wait(1500);

  const mid = await getSelectionState(s);
  console.log("  Visible items:", mid.visibleTotal);
  console.log("  Visible selected:", mid.visibleSelected);
  const midAllSelected = mid.visibleUnselected.length === 0;
  console.log(`  Middle items selected: ${midAllSelected ? "YES" : "NO — BUG"}`);

  console.log("\n── Step 4: Switch to single mode ──");
  await s.click('[data-value="single"]');
  await s.wait(1500);

  const single = await getSelectionState(s);
  console.log("  Count text:", single.countText);
  console.log("  Visible items:", single.visibleTotal);
  console.log("  Visible selected:", single.visibleSelected);
  const noneSelected = single.visibleSelected === 0;
  console.log(`  No items selected: ${noneSelected ? "YES" : "NO — BUG (${single.visibleSelected} still selected)"}`);

  console.log("\n── Result ──");
  const pass = allVisibleSelected && midAllSelected && noneSelected;
  console.log(pass ? "  PASS" : "  FAIL");

  return { pass };
});
