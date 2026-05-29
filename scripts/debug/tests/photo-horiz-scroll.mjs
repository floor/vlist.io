/**
 * Debug: Photo Album scroll breaks after switching primary axis + aspect ratio.
 * Reproduces: switch to X, change ratio, scroll — layout/scroll breaks.
 *
 *   bun scripts/debug/tests/photo-horiz-scroll.mjs
 *   bun scripts/debug/tests/photo-horiz-scroll.mjs --headless=false
 */
import { run } from "../runner.mjs";

await run("/examples/photo-album", { settle: 2000 }, async (s) => {
  const { page } = s;

  console.log("\n=== PHOTO ALBUM — AXIS + RATIO SCROLL BUG ===\n");

  async function getState(label) {
    const state = await page.evaluate(() => {
      const container = document.getElementById("list-container");
      const vp = container?.querySelector(".vlist-viewport");
      const content = container?.querySelector(".vlist-content");
      const vlist = container?.querySelector(".vlist");
      if (!vp || !content) return { error: "missing elements" };

      const items = content.querySelectorAll(
        ".vlist-grid-item, .vlist-masonry-item, .vlist-item",
      );
      const firstItems = Array.from(items)
        .slice(0, 4)
        .map((el) => ({
          idx: el.dataset.index,
          w: el.offsetWidth,
          h: el.offsetHeight,
          transform: el.style.transform,
        }));

      return {
        containerW: container.clientWidth,
        containerH: container.clientHeight,
        vpW: vp.clientWidth,
        vpH: vp.clientHeight,
        scrollW: vp.scrollWidth,
        scrollH: vp.scrollHeight,
        scrollLeft: Math.round(vp.scrollLeft),
        scrollTop: Math.round(vp.scrollTop),
        maxScrollLeft: vp.scrollWidth - vp.clientWidth,
        maxScrollTop: vp.scrollHeight - vp.clientHeight,
        overflowX: getComputedStyle(vp).overflowX,
        overflowY: getComputedStyle(vp).overflowY,
        contentW: content.style.width,
        contentH: content.style.height,
        vlistClasses: vlist?.className || "",
        domCount: items.length,
        firstItems,
        snapshot: sessionStorage.getItem("photo-album") || "(none)",
      };
    });

    if (label) {
      console.log(`\n── ${label} ──`);
      if (state.error) {
        console.log(`  ERROR: ${state.error}`);
        return state;
      }
      console.log(
        `  container: ${state.containerW}x${state.containerH}  vp: ${state.vpW}x${state.vpH}`,
      );
      console.log(
        `  content: w=${state.contentW} h=${state.contentH}  scroll: ${state.scrollW}x${state.scrollH}`,
      );
      console.log(
        `  maxScroll: left=${state.maxScrollLeft} top=${state.maxScrollTop}`,
      );
      console.log(`  overflow: x=${state.overflowX} y=${state.overflowY}`);
      console.log(`  vlist classes: ${state.vlistClasses}`);
      console.log(`  DOM items: ${state.domCount}`);
      for (const item of state.firstItems) {
        console.log(
          `    [${item.idx}] ${item.w}x${item.h} ${item.transform}`,
        );
      }
      const canScrollH = state.maxScrollLeft > 10;
      const canScrollV = state.maxScrollTop > 10;
      const isHoriz = state.vlistClasses.includes("horizontal");
      console.log(
        `  scrollable: horiz=${canScrollH} vert=${canScrollV}  isHorizontal=${isHoriz}`,
      );
      if (isHoriz && !canScrollH)
        console.log("  *** BUG: horizontal mode but cannot scroll left ***");
      if (!isHoriz && !canScrollV)
        console.log("  *** BUG: vertical mode but cannot scroll down ***");
      if (state.domCount > 100)
        console.log(
          `  *** BUG: ${state.domCount} DOM items — virtualization broken ***`,
        );
    }
    return state;
  }

  // Clear any saved snapshot first
  await page.evaluate(() => sessionStorage.removeItem("photo-album"));

  // Step 0: Baseline — Y + 4:3
  await getState("Step 0: Y + 4:3 (initial)");

  // Step 1: Switch to X
  console.log("\n  [action] click X axis");
  await page.click('[data-orientation="horizontal"]');
  await s.wait(1500);
  await getState("Step 1: X + 4:3");

  // Step 2: Change ratio to 1:1
  console.log("\n  [action] click 1:1 ratio");
  await page.click('[data-ratio="1"]');
  await s.wait(1500);
  await getState("Step 2: X + 1:1");

  // Step 3: Scroll right
  console.log("\n  [action] wheel scroll");
  const vpBox = await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    if (!vp) return null;
    const r = vp.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (vpBox) {
    await page.mouse.move(vpBox.x, vpBox.y);
    await page.mouse.wheel({ deltaY: 500 });
    await s.wait(1000);
  }
  await getState("Step 3: X + 1:1 after scroll");

  // Step 4: Change ratio to 3:4
  console.log("\n  [action] click 3:4 ratio");
  await page.click('[data-ratio="1.33"]');
  await s.wait(1500);
  await getState("Step 4: X + 3:4");

  // Step 5: Scroll again
  if (vpBox) {
    await page.mouse.move(vpBox.x, vpBox.y);
    await page.mouse.wheel({ deltaY: 500 });
    await s.wait(1000);
  }
  await getState("Step 5: X + 3:4 after scroll");

  // Step 6: Switch back to Y
  console.log("\n  [action] click Y axis");
  await page.click('[data-orientation="vertical"]');
  await s.wait(1500);
  await getState("Step 6: Y + 3:4");

  // Step 7: Scroll in vertical mode
  if (vpBox) {
    await page.mouse.move(vpBox.x, vpBox.y);
    await page.mouse.wheel({ deltaY: 500 });
    await s.wait(1000);
  }
  await getState("Step 7: Y + 3:4 after scroll");

  // Step 8: Change ratio back to 4:3 in Y mode
  console.log("\n  [action] click 4:3 ratio");
  await page.click('[data-ratio="0.75"]');
  await s.wait(1500);
  await getState("Step 8: Y + 4:3");

  // Step 9: Scroll
  if (vpBox) {
    await page.mouse.move(vpBox.x, vpBox.y);
    await page.mouse.wheel({ deltaY: 500 });
    await s.wait(1000);
  }
  await getState("Step 9: Y + 4:3 after scroll");

  console.log("\n=== CONSOLE LOG ===");
  const errors = s.logs.filter((l) => /error|warn/i.test(l));
  console.log(errors.length ? errors.join("\n  ") : "  No errors/warnings");
});
