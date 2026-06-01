import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000, width: 1440, height: 900 }, async (s) => {
  const { page } = s;
  console.log("\n=== Photo Album: Selected vs Detail ===\n");

  // Scroll to bottom (URBAN group)
  await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    if (vp) vp.scrollTop = vp.scrollHeight;
  });
  await s.wait(1000);

  // Click 5 photos one at a time, check BOTH --selected AND detail
  for (let n = 0; n < 5; n++) {
    const r = await page.evaluate((offset) => {
      const items = Array.from(document.querySelectorAll("[data-index]:not(.vlist-group-header)"));
      const target = items[items.length - 3 - offset];
      if (!target) return { error: "no target" };

      const cardTitle = target.querySelector(".card__title")?.textContent?.trim();
      const targetIdx = target.dataset.index;
      
      target.click();

      // Check BOTH focused and selected
      const focused = document.querySelector(".vlist-item--focused");
      const selected = document.querySelector(".vlist-item--selected");
      const ariaSel = document.querySelector("[aria-selected='true']");
      const detail = document.querySelector("#photo-detail strong")?.textContent?.trim();

      return {
        clickedIdx: targetIdx,
        cardTitle,
        detail,
        focusedIdx: focused?.dataset?.index ?? "NONE",
        focusedTitle: focused?.querySelector(".card__title")?.textContent?.trim() ?? "NONE",
        selectedIdx: selected?.dataset?.index ?? "NONE",
        selectedTitle: selected?.querySelector(".card__title")?.textContent?.trim() ?? "NONE",
        ariaIdx: ariaSel?.dataset?.index ?? "NONE",
      };
    }, n);

    await s.wait(200);

    console.log(`Click #${n + 1}:`);
    console.log(`  Clicked:  idx=${r.clickedIdx} "${r.cardTitle}"`);
    console.log(`  Selected: idx=${r.selectedIdx} "${r.selectedTitle}"`);
    console.log(`  Focused:  idx=${r.focusedIdx} "${r.focusedTitle}"`);
    console.log(`  Detail:   "${r.detail}"`);
    console.log(`  Card=Detail: ${r.cardTitle === r.detail ? "✅" : "❌"}`);
    console.log(`  Card=Selected: ${r.cardTitle === r.selectedTitle ? "✅" : "❌"}`);
  }

  console.log("");
});
