import { run } from "../runner.mjs";

const PORT = process.env.PORT || 3338;

await run("/examples/photo-album", { settle: 2000, base: `http://localhost:${PORT}` }, async (s) => {
  const { page } = s;
  const layoutMode = process.env.LAYOUT || "grid";
  console.log(`\n=== Horizontal sticky header layout (${layoutMode}) ===\n`);

  // Enable groups
  await page.evaluate(() => {
    const t = document.querySelector("#groups-toggle");
    if (t && !t.checked) t.click();
  });
  await s.wait(1200);

  // Optionally switch to masonry
  if (layoutMode === "masonry") {
    await page.evaluate(() => {
      const btn = document.querySelector('#layout-mode [data-mode="masonry"]');
      if (btn) btn.click();
    });
    await s.wait(1200);
  }

  // Switch to horizontal (X) primary axis
  await page.evaluate(() => {
    const btn = document.querySelector('[data-orientation="horizontal"]');
    if (btn) btn.click();
  });
  await s.wait(1500);

  // Scroll a bit so the sticky header is shown (first group's sticky is 0-height)
  await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    if (vp) vp.scrollLeft = 600;
  });
  await s.wait(800);

  const r = await page.evaluate(() => {
    const root = document.querySelector(".vlist");
    const sticky = document.querySelector(".vlist-sticky-header");
    const stickyGroup = document.querySelector(".vlist-sticky-header .sticky-group");
    const vp = document.querySelector(".vlist-viewport");
    const rb = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const cs = sticky ? getComputedStyle(sticky) : null;
    const vpcs = vp ? getComputedStyle(vp) : null;
    return {
      horizontal: root?.classList.contains("vlist--horizontal"),
      rootBox: rb(root),
      stickyBox: rb(sticky),
      stickyGroupBox: rb(stickyGroup),
      vpBox: rb(vp),
      stickyPosition: cs?.position,
      stickyVisibility: cs?.visibility,
      stickyWidth: cs?.width,
      vpMarginLeft: vpcs?.marginLeft,
      vpWidth: vpcs?.width,
      stickyText: stickyGroup?.textContent?.trim(),
    };
  });

  console.log("horizontal:", r.horizontal ? "✅" : "❌");
  console.log("root box:   ", JSON.stringify(r.rootBox));
  console.log("sticky box: ", JSON.stringify(r.stickyBox), "pos:", r.stickyPosition, "vis:", r.stickyVisibility);
  console.log("sticky grp: ", JSON.stringify(r.stickyGroupBox), "text:", r.stickyText);
  console.log("viewport:   ", JSON.stringify(r.vpBox), "marginLeft:", r.vpMarginLeft, "width:", r.vpWidth);

  // Assertions
  const root = r.rootBox, sticky = r.stickyBox, vp = r.vpBox;
  if (root && sticky && vp) {
    const stickyAtLeft = Math.abs(sticky.x - root.x) <= 1;
    const stickyFullHeight = Math.abs(sticky.h - root.h) <= 2;
    const vpStartsAfterSticky = Math.abs(vp.x - (sticky.x + sticky.w)) <= 2;
    const noOverlap = vp.x >= sticky.x + sticky.w - 1;
    console.log("");
    console.log(stickyAtLeft ? "✅ sticky pinned to left edge" : `❌ sticky not at left (sticky.x=${sticky.x}, root.x=${root.x})`);
    console.log(stickyFullHeight ? "✅ sticky spans full height" : `❌ sticky height ${sticky.h} vs root ${root.h}`);
    console.log(vpStartsAfterSticky ? "✅ viewport sits right of the bar" : `❌ viewport overlaps/gap (vp.x=${vp.x}, bar end=${sticky.x + sticky.w})`);
    console.log(noOverlap ? "✅ no overlap" : "❌ viewport underlaps sticky bar");
  }
  console.log("");
});
