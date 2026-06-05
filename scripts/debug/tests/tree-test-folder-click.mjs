/**
 * Debug: clicking "test" root folder — opens but no selection/focus
 *
 * After reload, "test" is a collapsed folder with no children loaded.
 * Clicking it triggers async loadChildren + expand. This script traces
 * whether selection/focus are applied.
 *
 * Usage:
 *   bun run scripts/debug/tests/tree-test-folder-click.mjs
 *   bun run scripts/debug/tests/tree-test-folder-click.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/tree", { settle: 2000 }, async (s) => {
  const { page } = s;

  async function getState() {
    return page.evaluate(() => {
      const content = document.querySelector(".vlist-content");
      const items = Array.from(content?.children ?? []);
      return {
        total: items.length,
        items: items
          .sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index))
          .map(el => ({
            idx: el.dataset.index,
            id: el.getAttribute("data-id"),
            selected: el.classList.contains("vlist-item--selected"),
            focused: el.classList.contains("vlist-item--focused"),
            ariaSelected: el.getAttribute("aria-selected"),
          })),
        selected: items
          .filter(el => el.classList.contains("vlist-item--selected"))
          .map(el => el.getAttribute("data-id")),
        focused: items
          .filter(el => el.classList.contains("vlist-item--focused"))
          .map(el => el.getAttribute("data-id")),
      };
    });
  }

  console.log("\n=== Tree test-folder click Debug ===\n");

  const before = await getState();
  console.log(`Initial: ${before.total} items`);
  for (const item of before.items.slice(0, 10)) {
    console.log(`  [${item.idx}] ${item.id}`);
  }

  // Find "test" folder
  const testItem = before.items.find(i => i.id === "vlist/test");
  if (!testItem) {
    console.log("\n❌ vlist/test not found in DOM");
    return { pass: false };
  }
  console.log(`\nTarget: vlist/test at index ${testItem.idx}`);

  // Instrument
  await page.evaluate(() => {
    window.__trace = [];
    const content = document.querySelector(".vlist-content");
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes" && m.attributeName === "class") {
          const el = m.target;
          const wasSelected = m.oldValue?.includes("vlist-item--selected");
          const isSelected = el.classList.contains("vlist-item--selected");
          const wasFocused = m.oldValue?.includes("vlist-item--focused");
          const isFocused = el.classList.contains("vlist-item--focused");
          if (wasSelected !== isSelected || wasFocused !== isFocused) {
            window.__trace.push({
              id: el.getAttribute("data-id"),
              idx: el.dataset.index,
              selected: isSelected, focused: isFocused,
              wasSelected, wasFocused,
              t: performance.now(),
            });
          }
        }
        if (m.type === "childList") {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1 && node.dataset?.index !== undefined) {
              const id = node.getAttribute?.("data-id");
              if (id === "vlist/test" || id?.startsWith("vlist/test/")) {
                window.__trace.push({
                  type: "added", id, idx: node.dataset.index,
                  selected: node.classList?.contains("vlist-item--selected"),
                  focused: node.classList?.contains("vlist-item--focused"),
                  t: performance.now(),
                });
              }
            }
          }
        }
      }
    });
    observer.observe(content, {
      attributes: true, attributeOldValue: true,
      childList: true, subtree: true,
    });
    window.__traceObserver = observer;
  });

  // Click "test"
  console.log("\n--- Clicking vlist/test ---");
  const rect = await page.evaluate((idx) => {
    const el = document.querySelector(`[data-index="${idx}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  }, parseInt(testItem.idx));

  await page.mouse.click((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);

  // Wait for async loadChildren
  await s.wait(1000);

  // Read trace
  const trace = await page.evaluate(() => {
    window.__traceObserver?.disconnect();
    return window.__trace;
  });

  console.log(`\n--- Trace (${trace.length} events) ---`);
  const t0 = trace.length > 0 ? trace[0].t : 0;
  for (const e of trace) {
    const dt = (e.t - t0).toFixed(1);
    if (e.type === "added") {
      console.log(`  +${dt}ms  ADDED "${e.id}" (idx=${e.idx}) sel=${e.selected} foc=${e.focused}`);
    } else {
      const changes = [];
      if (e.wasSelected !== e.selected) changes.push(e.selected ? "SELECTED" : "DESELECTED");
      if (e.wasFocused !== e.focused) changes.push(e.focused ? "FOCUSED" : "UNFOCUSED");
      console.log(`  +${dt}ms  ${changes.join(" + ")} "${e.id}" (idx=${e.idx})`);
    }
  }

  // Final state
  const after = await getState();
  console.log(`\n--- Final state: ${after.total} items ---`);
  for (const item of after.items.slice(0, 15)) {
    const flags = [
      item.selected ? "SELECTED" : "",
      item.focused ? "FOCUSED" : "",
    ].filter(Boolean).join(" ");
    console.log(`  [${item.idx}] ${item.id}${flags ? ` — ${flags}` : ""}`);
  }

  const sel = after.selected.includes("vlist/test");
  const foc = after.focused.includes("vlist/test");
  console.log(`\nvlist/test selected: ${sel ? "✅" : "❌"}`);
  console.log(`vlist/test focused:  ${foc ? "✅" : "❌"}`);

  return { pass: sel && foc };
});
