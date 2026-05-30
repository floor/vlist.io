/**
 * Debug: tree item spacing and connector lines
 *
 * Inspects computed styles, item heights, transforms, gaps,
 * and CSS custom properties on rendered tree items.
 *
 * Usage:
 *   bun run scripts/debug/tests/tree-spacing.mjs
 *   bun run scripts/debug/tests/tree-spacing.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/tree", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Tree Spacing Debug ===\n");

  const info = await page.evaluate(() => {
    const root = document.querySelector(".vlist");
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? [])
      .sort((a, b) => parseInt(a.dataset.index) - parseInt(b.dataset.index));

    const rootClasses = root?.className ?? "(no root)";
    const hasTreeLines = root?.classList.contains("vlist--tree-lines") ?? false;
    const contentH = content?.style.height ?? "(none)";

    const stylesheets = Array.from(document.styleSheets).map(ss => {
      try { return ss.href || "(inline)"; }
      catch { return "(cross-origin)"; }
    });

    const itemDetails = items.slice(0, 12).map(el => {
      const cs = getComputedStyle(el);
      const beforeCs = getComputedStyle(el, "::before");
      const afterCs = getComputedStyle(el, "::after");
      return {
        idx: el.dataset.index,
        id: el.getAttribute("data-id")?.split("/").pop(),
        classes: el.className.replace(/vlist-item /g, "").replace(/vlist-/g, ""),
        inlineH: el.style.height,
        offsetH: el.offsetHeight,
        computedH: cs.height,
        padTop: cs.paddingTop,
        padBot: cs.paddingBottom,
        padLeft: el.style.paddingLeft,
        transform: el.style.transform,
        treeDepth: el.style.getPropertyValue("--vlist-tree-depth"),
        treeIndent: el.style.getPropertyValue("--vlist-tree-indent"),
        beforeContent: beforeCs.content,
        beforeDisplay: beforeCs.display,
        beforeBg: beforeCs.backgroundColor,
        afterContent: afterCs.content,
        afterDisplay: afterCs.display,
      };
    });

    // Check gap between consecutive items
    const gaps = [];
    for (let i = 0; i < items.length - 1 && i < 10; i++) {
      const t1 = parseFloat(items[i].style.transform.match(/(\d+)px\)$/)?.[1] ?? "0");
      const h1 = parseFloat(items[i].style.height);
      const t2 = parseFloat(items[i + 1].style.transform.match(/(\d+)px\)$/)?.[1] ?? "0");
      gaps.push({ from: items[i].dataset.index, gap: t2 - t1 - h1 });
    }

    return { rootClasses, hasTreeLines, contentH, stylesheets, itemDetails, gaps };
  });

  console.log("Root classes:", info.rootClasses);
  console.log("Has tree-lines:", info.hasTreeLines);
  console.log("Content height:", info.contentH);
  console.log("\nStylesheets loaded:");
  for (const ss of info.stylesheets) console.log("  ", ss);

  console.log("\nItem details (first 12):");
  console.log("  idx  name              h    offH  padT  padB  padL   depth  indent  ::before  ::after");
  for (const item of info.itemDetails) {
    console.log(
      `  ${(item.idx ?? "?").toString().padEnd(4)} ${(item.id ?? "?").padEnd(16)}  ${item.inlineH.padEnd(4)} ${String(item.offsetH).padEnd(5)} ${item.padTop.padEnd(5)} ${item.padBot.padEnd(5)} ${(item.padLeft || "0").padEnd(6)} ${(item.treeDepth || "-").padEnd(6)} ${(item.treeIndent || "-").padEnd(7)} ${item.beforeContent.padEnd(9)} ${item.afterContent}`
    );
  }

  console.log("\nGaps between consecutive items:");
  for (const g of info.gaps) {
    const status = g.gap === 0 ? "✅" : `❌ gap=${g.gap}px`;
    console.log(`  after [${g.from}]: ${status}`);
  }

  console.log("");
});
