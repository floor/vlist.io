import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Photo Album: Masonry + Groups ===\n");

  // Switch to masonry mode
  await page.evaluate(() => {
    const btn = document.querySelector('[data-mode="masonry"]');
    if (btn) btn.click();
  });
  await s.wait(2000);

  const info = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const items = Array.from(content?.children ?? []);
    const headers = items.filter(el => el.classList.contains("vlist-group-header"));
    const sticky = document.querySelector(".vlist-sticky-header");
    return {
      totalChildren: items.length,
      headerCount: headers.length,
      firstHeader: headers[0]?.textContent?.trim(),
      stickyText: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
      hasGrouped: !!document.querySelector(".vlist--grouped"),
    };
  });

  console.log("Children:", info.totalChildren, "Headers:", info.headerCount);
  console.log("First header:", info.firstHeader);
  console.log("Sticky:", info.stickyText);
  console.log("Grouped:", info.hasGrouped ? "✅" : "❌");

  // Scroll to check transitions
  await s.scrollTo(3000);
  await s.wait(500);

  const after = await page.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    const headers = Array.from(content?.querySelectorAll(".vlist-group-header") ?? []);
    const sticky = document.querySelector(".vlist-sticky-header");
    return {
      headers: headers.map(el => el.textContent?.trim()),
      sticky: sticky?.textContent?.trim().substring(0, 30) || "(empty)",
    };
  });
  console.log("\n@3000px:");
  console.log("Headers:", after.headers);
  console.log("Sticky:", after.sticky);

  console.log("");
});
