/**
 * Debug script: trace selection behavior during delete → restore in track-list.
 * Tests TWO scenarios: (1) restore after animation, (2) restore DURING animation.
 * Also checks for CSS transitions that could cause visual flicker.
 */
import { run } from "./debug.mjs";

async function getSelection(page) {
  return page.evaluate(() => {
    const items = document.querySelector(".vlist-items");
    if (!items) return { selected: [], focused: null };
    const selected = [];
    for (const el of items.children) {
      if (el.getAttribute("aria-selected") === "true" || el.classList.contains("vlist-item--selected")) {
        selected.push({
          idx: el.dataset.index,
          id: el.dataset.id,
          ariaSelected: el.getAttribute("aria-selected"),
          hasClass: el.classList.contains("vlist-item--selected"),
        });
      }
    }
    const focused = document.activeElement;
    const focusInfo = focused?.dataset?.id
      ? { id: focused.dataset.id, idx: focused.dataset.index }
      : { tag: focused?.tagName, id: focused?.id || null };
    return { selected, focused: focusInfo };
  });
}

function printSel(label, sel) {
  const items = sel.selected.map(s => `id=${s.id} idx=${s.idx}`).join(", ") || "(none)";
  console.log(`  ${label}: ${items}  focus=${JSON.stringify(sel.focused)}`);
}

await run("/examples/track-list", { settle: 2000 }, async (s) => {
  const { page } = s;

  // ── Check CSS transitions on selection styles ──
  console.log("\n=== CSS TRANSITION CHECK ===");
  const transitions = await page.evaluate(() => {
    const item = document.querySelector(".vlist-item");
    if (!item) return "no item found";
    const cs = getComputedStyle(item);
    return {
      transition: cs.transition,
      transitionProperty: cs.transitionProperty,
      transitionDuration: cs.transitionDuration,
    };
  });
  console.log("  Item transitions:", JSON.stringify(transitions));

  // ── Install fine-grained mutation tracker ──
  await page.evaluate(() => {
    window.__mutLog = [];
    const items = document.querySelector(".vlist-items");
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === "aria-selected" || m.attributeName === "class") {
          const el = m.target;
          window.__mutLog.push({
            t: Math.round(performance.now()),
            attr: m.attributeName,
            id: el.dataset.id,
            idx: el.dataset.index,
            val: m.attributeName === "aria-selected"
              ? el.getAttribute("aria-selected")
              : el.classList.contains("vlist-item--selected") ? "sel" : "unsel",
          });
        }
      }
    });
    obs.observe(items, { attributes: true, subtree: true, attributeFilter: ["aria-selected", "class"] });
  });

  // ══════════════════════════════════════════════════════════════
  // SCENARIO A: Restore DURING the remove animation
  // ══════════════════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  SCENARIO A: Restore DURING animation    ║");
  console.log("╚══════════════════════════════════════════╝");

  // Select 3rd item
  await page.click(".vlist-item:nth-child(3)");
  await s.wait(100);
  let sel = await getSelection(page);
  printSel("Before delete", sel);
  const selA = sel.selected[0];

  // Clear mutation log
  await page.evaluate(() => { window.__mutLog = []; });

  // Delete
  await page.click("#btn-delete-selected");
  await s.wait(200); // Still within 2000ms animation

  sel = await getSelection(page);
  printSel("200ms after delete", sel);

  // Restore IMMEDIATELY (animation still running)
  console.log("  → Clicking Restore while animation runs...");
  await page.click("#btn-add-track");
  await s.wait(10);
  sel = await getSelection(page);
  printSel("10ms after restore", sel);

  await s.wait(50);
  sel = await getSelection(page);
  printSel("60ms after restore", sel);

  // Dump mutation log for scenario A
  let mutLog = await page.evaluate(() => window.__mutLog);
  console.log(`\n  Mutation log (${mutLog.length} events):`);
  if (mutLog.length > 0) {
    const t0 = mutLog[0].t;
    // Group by batch (same timestamp)
    let lastT = -1;
    for (const m of mutLog) {
      const rel = m.t - t0;
      if (m.t !== lastT) {
        console.log(`  ── +${rel}ms ──`);
        lastT = m.t;
      }
      if (m.attr === "aria-selected") {
        console.log(`    [${m.idx}] id=${m.id} aria-selected=${m.val}`);
      } else {
        console.log(`    [${m.idx}] id=${m.id} class→${m.val}`);
      }
    }
  }

  // Wait for all animations to settle
  await s.waitForAnimations(3000);
  await s.wait(200);

  sel = await getSelection(page);
  printSel("Final state A", sel);

  // ══════════════════════════════════════════════════════════════
  // SCENARIO B: Restore AFTER the remove animation completes
  // ══════════════════════════════════════════════════════════════
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║  SCENARIO B: Restore AFTER animation     ║");
  console.log("╚══════════════════════════════════════════╝");

  // Select an item
  await page.click(".vlist-item:nth-child(4)");
  await s.wait(100);
  sel = await getSelection(page);
  printSel("Before delete", sel);

  // Clear mutation log
  await page.evaluate(() => { window.__mutLog = []; });

  // Delete and wait for animation to complete
  await page.click("#btn-delete-selected");
  await s.waitForAnimations(3000);
  await s.wait(200);

  sel = await getSelection(page);
  printSel("After delete+animation", sel);

  // Clear mutation log again
  await page.evaluate(() => { window.__mutLog = []; });

  // Now restore
  console.log("  → Clicking Restore after animation...");
  await page.click("#btn-add-track");
  await s.wait(10);
  sel = await getSelection(page);
  printSel("10ms after restore", sel);

  await s.wait(50);
  sel = await getSelection(page);
  printSel("60ms after restore", sel);

  // Dump mutation log for scenario B
  mutLog = await page.evaluate(() => window.__mutLog);
  console.log(`\n  Mutation log (${mutLog.length} events):`);
  if (mutLog.length > 0) {
    const t0 = mutLog[0].t;
    let lastT = -1;
    for (const m of mutLog) {
      const rel = m.t - t0;
      if (m.t !== lastT) {
        console.log(`  ── +${rel}ms ──`);
        lastT = m.t;
      }
      if (m.attr === "aria-selected") {
        console.log(`    [${m.idx}] id=${m.id} aria-selected=${m.val}`);
      } else {
        console.log(`    [${m.idx}] id=${m.id} class→${m.val}`);
      }
    }
  }

  await s.waitForAnimations(3000);
  await s.wait(200);

  sel = await getSelection(page);
  printSel("Final state B", sel);
});
