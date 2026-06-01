import { run } from "../runner.mjs";

await run("/examples/data-table", { settle: 3000 }, async (s) => {
  const { page } = s;
  console.log("\n=== Snapshots: When does it save? ===\n");

  // Check initial snapshot
  const init = await page.evaluate(() => sessionStorage.getItem("data-table-list"));
  console.log("1. On load:", init ? "snapshot exists" : "NO snapshot");

  // Scroll
  await page.evaluate(() => {
    document.querySelector(".vlist-viewport").scrollTop = 500;
  });
  await s.wait(2000);
  const afterScroll = await page.evaluate(() => sessionStorage.getItem("data-table-list"));
  console.log("2. After scroll:", afterScroll ? JSON.parse(afterScroll).scrollTop : "NO snapshot");

  // Click a row
  await page.evaluate(() => {
    const rows = document.querySelectorAll(".vlist-table-row:not(.vlist-table-group-header)");
    if (rows[3]) rows[3].click();
  });
  await s.wait(2000);
  const afterClick = await page.evaluate(() => {
    const snap = sessionStorage.getItem("data-table-list");
    return snap ? JSON.parse(snap) : null;
  });
  console.log("3. After click:", afterClick ? JSON.stringify({ scrollTop: afterClick.scrollTop, selectedIds: afterClick.selectedIds }) : "NO snapshot");

  // Check if autoSave is configured
  const autoSave = await page.evaluate(() => {
    // Check if the snapshots plugin saved anything at all
    const keys = Object.keys(sessionStorage);
    return { keys, hasKey: keys.includes("data-table-list") };
  });
  console.log("4. SessionStorage keys:", JSON.stringify(autoSave.keys));

  // Try triggering idle (snapshots saves on idle)
  await s.wait(3000);
  const afterIdle = await page.evaluate(() => {
    const snap = sessionStorage.getItem("data-table-list");
    return snap ? "saved" : "NO snapshot";
  });
  console.log("5. After 3s idle:", afterIdle);

  // Check page console for snapshot-related messages
  const snapLogs = s.logs.filter(l => l.toLowerCase().includes("snapshot") || l.toLowerCase().includes("autosave") || l.toLowerCase().includes("session"));
  if (snapLogs.length) {
    console.log("6. Page logs:", snapLogs);
  }

  console.log("");
});
