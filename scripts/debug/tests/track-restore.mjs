/**
 * Debug: selection behavior during delete -> restore in track-list.
 * Tests TWO scenarios: (1) restore DURING animation, (2) restore AFTER animation.
 * Also checks CSS transitions that could cause visual flicker.
 *
 *   bun scripts/debug/tests/track-restore.mjs
 */
import { run } from "../runner.mjs";

async function getSelection(session) {
  return session.evaluate(() => {
    const items = document.querySelector(".vlist-content");
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
  const items = sel.selected.map((s) => `id=${s.id} idx=${s.idx}`).join(", ") || "(none)";
  console.log(`  ${label}: ${items}  focus=${JSON.stringify(sel.focused)}`);
}

await run("/examples/track-list", { settle: 2000 }, async (s) => {
  console.log("\n=== CSS TRANSITION CHECK ===");
  const transitions = await s.evaluate(() => {
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

  await s.evaluate(() => {
    window.__mutLog = [];
    const items = document.querySelector(".vlist-content");
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

  // ── SCENARIO A: Restore DURING animation ──
  console.log("\n=== SCENARIO A: Restore DURING animation ===");

  await s.click(".vlist-item:nth-child(3)");
  await s.wait(100);
  let sel = await getSelection(s);
  printSel("Before delete", sel);

  await s.evaluate(() => { window.__mutLog = []; });

  await s.click("#btn-delete-selected");
  await s.wait(200);

  sel = await getSelection(s);
  printSel("200ms after delete", sel);

  console.log("  -> Clicking Restore while animation runs...");
  await s.click("#btn-add-track");
  await s.wait(10);
  sel = await getSelection(s);
  printSel("10ms after restore", sel);

  await s.wait(50);
  sel = await getSelection(s);
  printSel("60ms after restore", sel);

  let mutLog = await s.evaluate(() => window.__mutLog);
  console.log(`\n  Mutation log (${mutLog.length} events):`);
  if (mutLog.length > 0) {
    const t0 = mutLog[0].t;
    let lastT = -1;
    for (const m of mutLog) {
      const rel = m.t - t0;
      if (m.t !== lastT) {
        console.log(`  -- +${rel}ms --`);
        lastT = m.t;
      }
      if (m.attr === "aria-selected") {
        console.log(`    [${m.idx}] id=${m.id} aria-selected=${m.val}`);
      } else {
        console.log(`    [${m.idx}] id=${m.id} class->${m.val}`);
      }
    }
  }

  await s.waitForAnimations(3000);
  await s.wait(200);

  sel = await getSelection(s);
  printSel("Final state A", sel);

  // ── SCENARIO B: Restore AFTER animation ──
  console.log("\n=== SCENARIO B: Restore AFTER animation ===");

  await s.click(".vlist-item:nth-child(4)");
  await s.wait(100);
  sel = await getSelection(s);
  printSel("Before delete", sel);

  await s.evaluate(() => { window.__mutLog = []; });

  await s.click("#btn-delete-selected");
  await s.waitForAnimations(3000);
  await s.wait(200);

  sel = await getSelection(s);
  printSel("After delete+animation", sel);

  await s.evaluate(() => { window.__mutLog = []; });

  console.log("  -> Clicking Restore after animation...");
  await s.click("#btn-add-track");
  await s.wait(10);
  sel = await getSelection(s);
  printSel("10ms after restore", sel);

  await s.wait(50);
  sel = await getSelection(s);
  printSel("60ms after restore", sel);

  mutLog = await s.evaluate(() => window.__mutLog);
  console.log(`\n  Mutation log (${mutLog.length} events):`);
  if (mutLog.length > 0) {
    const t0 = mutLog[0].t;
    let lastT = -1;
    for (const m of mutLog) {
      const rel = m.t - t0;
      if (m.t !== lastT) {
        console.log(`  -- +${rel}ms --`);
        lastT = m.t;
      }
      if (m.attr === "aria-selected") {
        console.log(`    [${m.idx}] id=${m.id} aria-selected=${m.val}`);
      } else {
        console.log(`    [${m.idx}] id=${m.id} class->${m.val}`);
      }
    }
  }

  await s.waitForAnimations(3000);
  await s.wait(200);

  sel = await getSelection(s);
  printSel("Final state B", sel);
});
