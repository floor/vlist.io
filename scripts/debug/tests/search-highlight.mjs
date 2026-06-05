/**
 * Debug: search highlight inconsistency
 *
 * Types a query in the code-explorer search and inspects the
 * resulting DOM marks to see if they wrap the full match.
 *
 * Usage:
 *   bun run scripts/debug/tests/search-highlight.mjs
 *   bun run scripts/debug/tests/search-highlight.mjs --headed
 */

import { run } from "../runner.mjs";

await run("/examples/code-explorer", { settle: 3000 }, async (s) => {
  const { page } = s;

  console.log("\n=== Search Highlight Debug ===\n");

  // Click the search input (Symbols tab should be active by default)
  await s.wait(1000);

  // Type query
  const query = "overscan";
  console.log(`Typing query: "${query}"`);

  // Focus the search input
  const input = await page.$(".vlist-search__input");
  if (!input) {
    console.log("❌ Search input not found — trying Ctrl+F");
    await page.keyboard.down("Meta");
    await page.keyboard.press("f");
    await page.keyboard.up("Meta");
    await s.wait(500);
  }

  const searchInput = await page.$(".vlist-search__input");
  if (!searchInput) {
    console.log("❌ Search input still not found");
    return { pass: false };
  }

  await searchInput.click();
  await searchInput.type(query, { delay: 50 });
  await s.wait(500);

  // Inspect the DOM for marks
  const results = await page.evaluate((q) => {
    const content = document.querySelector("#symbol-container .vlist-content");
    if (!content) return { error: "no content" };

    const items = Array.from(content.querySelectorAll("[data-index]"));
    const analysis = [];

    for (const item of items.slice(0, 5)) {
      const marks = item.querySelectorAll("mark");
      const nameEl = item.querySelector(".sym__name");
      const sigEl = item.querySelector(".sym__sig");

      const itemInfo = {
        id: item.getAttribute("data-id"),
        idx: item.dataset.index,
        nameText: nameEl?.textContent,
        nameHTML: nameEl?.innerHTML,
        sigText: sigEl?.textContent?.substring(0, 80),
        sigHTML: sigEl?.innerHTML?.substring(0, 200),
        marks: Array.from(marks).map(m => ({
          text: m.textContent,
          parent: m.parentElement?.className || m.parentElement?.tagName,
          fullParentText: m.parentElement?.textContent?.substring(0, 60),
        })),
      };

      // Check: does .sym__name contain the full query highlighted?
      if (nameEl) {
        const nameMarks = nameEl.querySelectorAll("mark");
        const markedText = Array.from(nameMarks).map(m => m.textContent).join("");
        itemInfo.nameMarkedText = markedText;
        itemInfo.nameFullyHighlighted = markedText.toLowerCase() === q.toLowerCase() ||
          nameEl.textContent.toLowerCase().includes(q.toLowerCase());
      }

      analysis.push(itemInfo);
    }

    return { itemCount: items.length, analysis };
  }, query);

  console.log(`Found ${results.itemCount} items\n`);

  for (const item of results.analysis || []) {
    console.log(`[${item.idx}] ${item.id}`);
    console.log(`  name text: "${item.nameText}"`);
    console.log(`  name HTML: ${item.nameHTML}`);
    if (item.sigHTML) console.log(`  sig HTML:  ${item.sigHTML}`);
    console.log(`  marks (${item.marks?.length}):`);
    for (const m of item.marks || []) {
      console.log(`    "${m.text}" in <${m.parent}> ("${m.fullParentText}")`);
    }
    if (item.nameMarkedText !== undefined) {
      const ok = item.nameMarkedText.toLowerCase() === query.toLowerCase();
      console.log(`  name marked text: "${item.nameMarkedText}" ${ok ? "✅" : "❌ PARTIAL"}`);
    }
    console.log();
  }

  return { pass: true };
});
