/**
 * Debug: carousel multi-aspect — inspect rendered item widths vs expected.
 *
 * Usage:
 *   node scripts/debug/tests/carousel-multi-aspect.mjs
 *   node scripts/debug/tests/carousel-multi-aspect.mjs --base=http://localhost:3339
 *   node scripts/debug/tests/carousel-multi-aspect.mjs --headless=false
 */

import { run, delay, parseArgs } from "../runner.mjs";

const cliOpts = parseArgs();
await run("/examples/carousel", { settle: 2000, ...cliOpts }, async (s) => {
  // Switch to multi-aspect variant
  await s.click('[data-variant="multi-aspect"]');
  await s.wait(1500);

  // Grab carousel item DOM state
  const state = await s.evaluate(() => {
    const container = document.querySelector("#list-container");
    const vp = container?.querySelector(".vlist-viewport");
    const content = container?.querySelector(".vlist-content");
    if (!vp || !content) return { error: "no vlist found" };

    const vpRect = vp.getBoundingClientRect();
    const children = Array.from(content.children);

    const items = children.map((el) => {
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const img = el.querySelector("img");
      return {
        dataIndex: el.dataset.index,
        inlineWidth: el.style.width,
        inlineHeight: el.style.height,
        transform: el.style.transform,
        computedWidth: Math.round(parseFloat(cs.width)),
        computedHeight: Math.round(parseFloat(cs.height)),
        rectLeft: Math.round(rect.left - vpRect.left),
        rectRight: Math.round(rect.right - vpRect.left),
        rectWidth: Math.round(rect.width),
        rectHeight: Math.round(rect.height),
        visible: rect.right > vpRect.left && rect.left < vpRect.right,
        carouselWidth: el.style.getPropertyValue("--vlist-carousel-width"),
        carouselProgress: el.style.getPropertyValue("--vlist-carousel-progress"),
        carouselRole: el.style.getPropertyValue("--vlist-carousel-role"),
        imgSrc: img?.src?.replace(/.*\/id\//, "/id/") || "",
        display: el.style.display,
      };
    });

    return {
      vpWidth: vpRect.width,
      vpHeight: vpRect.height,
      scrollLeft: Math.round(vp.scrollLeft),
      contentWidth: content.style.width,
      domCount: children.length,
      items,
    };
  });

  if (state.error) {
    console.log("ERROR:", state.error);
    return;
  }

  console.log("\n══════════════════════════════════════════════");
  console.log("  Carousel Multi-Aspect — DOM Inspection");
  console.log("══════════════════════════════════════════════\n");
  console.log(`  Viewport: ${state.vpWidth}x${state.vpHeight}`);
  console.log(`  ScrollLeft: ${state.scrollLeft}`);
  console.log(`  Content width: ${state.contentWidth}`);
  console.log(`  DOM elements: ${state.domCount}\n`);

  console.log("  Visible items:\n");
  const visible = state.items.filter((i) => i.visible && i.display !== "none");
  for (const it of visible) {
    console.log(`  [${it.dataIndex}] ${it.rectWidth}x${it.rectHeight}px  left=${it.rectLeft}  inline-w=${it.inlineWidth}  --carousel-w=${it.carouselWidth}`);
    console.log(`           transform=${it.transform}  progress=${it.carouselProgress}  role=${it.carouselRole}`);
    console.log(`           img=${it.imgSrc}`);
  }

  console.log("\n  All items (inline widths):\n");
  for (const it of state.items) {
    const vis = it.visible && it.display !== "none" ? "VIS" : "   ";
    console.log(`  ${vis} [${it.dataIndex}] w=${it.inlineWidth}  --carousel-w=${it.carouselWidth}  transform=${it.transform}  display=${it.display}`);
  }

  await s.screenshot("carousel-multi-aspect");
});
