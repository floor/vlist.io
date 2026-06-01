import { run } from "../runner.mjs";
await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;
  await page.evaluate(() => { const t = document.querySelector("#groups-toggle"); if (t && !t.checked) t.click(); });
  await s.wait(1000);
  await page.evaluate(() => document.querySelector('[data-orientation="horizontal"]')?.click());
  await s.wait(1000);
  const r = await page.evaluate(() => {
    const lc = document.getElementById("list-container");
    const vlist = document.querySelector(".vlist");
    return {
      listContainerClasses: lc?.className,
      listContainerHasHoriz: lc?.classList.contains("vlist--horizontal"),
      vlistClasses: vlist?.className?.substring(0, 60),
      vlistIsListContainer: lc === vlist,
    };
  });
  console.log(JSON.stringify(r, null, 2));
});
