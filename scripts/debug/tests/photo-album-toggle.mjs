import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Photo Album: Groups toggle ===\n");

  const before = await page.evaluate(() => ({
    grouped: !!document.querySelector(".vlist--grouped"),
    headers: document.querySelectorAll(".vlist-group-header").length,
    checked: document.querySelector("#groups-toggle")?.checked,
  }));
  console.log("Initial:", JSON.stringify(before));

  // Click the groups toggle
  await page.evaluate(() => document.querySelector("#groups-toggle")?.click());
  await s.wait(2000);

  const after = await page.evaluate(() => ({
    grouped: !!document.querySelector(".vlist--grouped"),
    headers: document.querySelectorAll(".vlist-group-header").length,
    checked: document.querySelector("#groups-toggle")?.checked,
    firstHeader: document.querySelector(".vlist-group-header")?.textContent?.trim(),
  }));
  console.log("After toggle ON:", JSON.stringify(after));
  console.log(after.grouped && after.headers > 0 ? "✅ Groups enabled" : "❌ Groups NOT enabled");

  console.log("");
});
