import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Photo Album Selection Debug ===\n");

  // Click the 3rd photo and check what the detail panel shows vs what was clicked
  const r = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll("[data-index]:not(.vlist-group-header)"));
    // Get info about each of the first 5 items
    const info = items.slice(0, 5).map(el => {
      const overlay = el.querySelector(".card__title");
      return {
        idx: el.dataset.index,
        title: overlay?.textContent?.trim() ?? "(none)",
      };
    });

    // Click the 3rd one
    const target = items[2];
    if (!target) return { error: "no item" };
    const clickedTitle = target.querySelector(".card__title")?.textContent?.trim();
    target.click();

    // Wait a tick for event to propagate
    return new Promise(resolve => {
      setTimeout(() => {
        const detail = document.getElementById("photo-detail");
        const detailTitle = detail?.querySelector("strong")?.textContent?.trim();
        const selected = document.querySelector("[aria-selected='true']");
        const selectedTitle = selected?.querySelector(".card__title")?.textContent?.trim();
        resolve({
          items: info,
          clickedIdx: target.dataset.index,
          clickedTitle,
          selectedIdx: selected?.dataset?.index,
          selectedTitle,
          detailTitle,
          clickMatchesSelected: clickedTitle === selectedTitle,
          clickMatchesDetail: clickedTitle === detailTitle,
        });
      }, 100);
    });
  });

  console.log("First 5 items:", JSON.stringify(r.items));
  console.log("Clicked:", r.clickedTitle, `(idx ${r.clickedIdx})`);
  console.log("Selected:", r.selectedTitle, `(idx ${r.selectedIdx})`);
  console.log("Detail panel:", r.detailTitle);
  console.log("Click=Selected:", r.clickMatchesSelected ? "✅" : "❌");
  console.log("Click=Detail:", r.clickMatchesDetail ? "✅" : "❌");

  console.log("");
});
