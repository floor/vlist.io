/**
 * Debug: clicking pre-expanded src folder does not select it
 *
 * After page load, src is pre-expanded. Clicking it collapses but
 * does not select. This script traces the exact sequence of events.
 *
 * Usage:
 *   bun run scripts/debug/tests/tree-src-click.mjs
 *   bun run scripts/debug/tests/tree-src-click.mjs --headed
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
            classes: el.className,
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

  console.log("\n=== Tree src-click Debug ===\n");

  // ── Step 1: Show initial state ─────────────────────────────────

  const before = await getState();
  console.log(`Initial: ${before.total} items`);
  for (const item of before.items.slice(0, 8)) {
    const flags = [
      item.selected ? "SELECTED" : "",
      item.focused ? "FOCUSED" : "",
    ].filter(Boolean).join(" ");
    console.log(`  [${item.idx}] ${item.id}${flags ? ` — ${flags}` : ""}`);
  }
  if (before.items.length > 8) console.log(`  ... (${before.items.length} total)`);

  // Find src — it should be pre-expanded with children visible
  const srcItem = before.items.find(i => i.id === "vlist/src");
  if (!srcItem) {
    console.log("\n❌ vlist/src not found in DOM");
    return { pass: false };
  }
  console.log(`\nTarget: vlist/src at index ${srcItem.idx}`);

  // ── Step 2: Instrument to trace selection mutations ────────────

  await page.evaluate(() => {
    window.__trace = [];
    const content = document.querySelector(".vlist-content");

    // Trace attribute/class changes
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === "attributes") {
          const el = m.target;
          if (m.attributeName === "class") {
            const wasSelected = m.oldValue?.includes("vlist-item--selected");
            const isSelected = el.classList.contains("vlist-item--selected");
            if (wasSelected !== isSelected) {
              window.__trace.push({
                type: "class",
                id: el.getAttribute("data-id"),
                idx: el.dataset.index,
                action: isSelected ? "SELECTED" : "DESELECTED",
                t: performance.now(),
              });
            }
          }
          if (m.attributeName === "aria-selected") {
            window.__trace.push({
              type: "aria",
              id: el.getAttribute("data-id"),
              idx: el.dataset.index,
              value: el.getAttribute("aria-selected"),
              t: performance.now(),
            });
          }
        }
        if (m.type === "childList") {
          for (const node of m.removedNodes) {
            if (node.nodeType === 1) {
              window.__trace.push({
                type: "removed",
                id: node.getAttribute?.("data-id"),
                idx: node.dataset?.index,
                t: performance.now(),
              });
            }
          }
          for (const node of m.addedNodes) {
            if (node.nodeType === 1 && node.dataset?.index !== undefined) {
              window.__trace.push({
                type: "added",
                id: node.getAttribute?.("data-id"),
                idx: node.dataset?.index,
                selected: node.classList?.contains("vlist-item--selected"),
                t: performance.now(),
              });
            }
          }
        }
      }
    });
    observer.observe(content, {
      attributes: true,
      attributeOldValue: true,
      childList: true,
      subtree: true,
    });
    window.__traceObserver = observer;
  });

  // ── Step 3: Click the src folder ───────────────────────────────

  console.log("\n--- Clicking vlist/src ---");

  const rect = await page.evaluate((idx) => {
    const el = document.querySelector(`[data-index="${idx}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
  }, parseInt(srcItem.idx));

  const x = (rect.left + rect.right) / 2;
  const y = (rect.top + rect.bottom) / 2;
  console.log(`  Click at (${x.toFixed(0)}, ${y.toFixed(0)})`);

  // Also check if selection click handler's findItemFromEvent works on detached DOM
  await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    window.__clickHandlerTrace = [];
    content.addEventListener("click", (e) => {
      const el = e.target.closest?.("[data-index]");
      window.__clickHandlerTrace.push({
        targetTag: e.target.tagName,
        targetClass: e.target.className,
        closestFound: !!el,
        closestIndex: el?.dataset?.index,
        closestId: el?.getAttribute?.("data-id"),
        closestInDOM: el ? document.contains(el) : null,
        t: performance.now(),
      });
    }, true); // capture phase — fires before plugin handlers
  });

  await page.mouse.click(x, y);
  await s.wait(500);

  const clickTrace = await page.evaluate(() => window.__clickHandlerTrace);
  console.log("\n--- Click handler trace ---");
  for (const entry of clickTrace) {
    console.log(`  target: <${entry.targetTag} class="${entry.targetClass}">`);
    console.log(`  closest [data-index]: ${entry.closestFound ? `found idx=${entry.closestIndex} id="${entry.closestId}"` : "NOT FOUND"}`);
    console.log(`  closest in DOM: ${entry.closestInDOM}`);
  }

  // ── Step 4: Read trace ─────────────────────────────────────────

  const trace = await page.evaluate(() => {
    window.__traceObserver?.disconnect();
    return window.__trace;
  });

  console.log(`\n--- DOM mutation trace (${trace.length} events) ---`);
  const t0 = trace.length > 0 ? trace[0].t : 0;
  for (const entry of trace) {
    const dt = (entry.t - t0).toFixed(1);
    if (entry.type === "class") {
      console.log(`  +${dt}ms  ${entry.action} "${entry.id}" (idx=${entry.idx})`);
    } else if (entry.type === "aria") {
      console.log(`  +${dt}ms  aria-selected=${entry.value} "${entry.id}" (idx=${entry.idx})`);
    } else if (entry.type === "removed") {
      console.log(`  +${dt}ms  REMOVED "${entry.id}" (idx=${entry.idx})`);
    } else if (entry.type === "added") {
      console.log(`  +${dt}ms  ADDED "${entry.id}" (idx=${entry.idx}) selected=${entry.selected}`);
    }
  }

  // ── Step 5: Check final state ──────────────────────────────────

  const after = await getState();
  console.log(`\n--- Final state: ${after.total} items ---`);
  for (const item of after.items) {
    const flags = [
      item.selected ? "SELECTED" : "",
      item.focused ? "FOCUSED" : "",
    ].filter(Boolean).join(" ");
    console.log(`  [${item.idx}] ${item.id}${flags ? ` — ${flags}` : ""}`);
  }

  const srcSelected = after.selected.includes("vlist/src");
  const srcFocused = after.focused.includes("vlist/src");
  console.log(`\nvlist/src selected: ${srcSelected ? "✅ YES" : "❌ NO"}`);
  console.log(`vlist/src focused:  ${srcFocused ? "✅ YES" : "❌ NO"}`);
  console.log(`Selected items: [${after.selected.join(", ") || "none"}]`);
  console.log(`Focused items:  [${after.focused.join(", ") || "none"}]`);

  return { pass: srcSelected && srcFocused };
});
