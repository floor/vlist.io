/**
 * Debug: carousel hero engine — trace dynamic sizing during scroll
 *
 * Diagnoses the hero variant's dynamic item sizing by logging
 * scroll position, focal index, item sizes, and offsets at each step.
 *
 * Usage:
 *   bun run scripts/debug/tests/carousel-hero-engine.mjs
 *   bun run scripts/debug/tests/carousel-hero-engine.mjs --headed
 */

import { launchBrowser } from "../core.mjs";

const browser = await launchBrowser({});
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));

await page.setViewport({ width: 1400, height: 900 });
await page.goto("http://localhost:3338/examples/carousel", {
  waitUntil: "networkidle2",
  timeout: 15000,
});
await new Promise((r) => setTimeout(r, 2000));

// Switch to hero
await page.click('[data-variant="hero"]');
await new Promise((r) => setTimeout(r, 1500));

async function dumpState(label) {
  const state = await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    const items = [...document.querySelectorAll(".vlist-content [data-index]")];

    return {
      scrollLeft: Math.round(vp?.scrollLeft ?? 0),
      scrollTop: Math.round(vp?.scrollTop ?? 0),
      vpWidth: vp?.clientWidth,
      vpScrollWidth: vp?.scrollWidth,
      contentWidth: document.querySelector(".vlist-content")?.style?.width,
      renderedCount: items.length,
      items: items.map(el => {
        const cs = getComputedStyle(el);
        const transform = cs.transform || el.style.transform;
        const match = transform?.match(/translateX\(([^)]+)\)/);
        const tx = match ? parseFloat(match[1]) : null;
        return {
          vi: el.dataset.index,
          width: el.offsetWidth,
          styleWidth: el.style.width,
          tx,
          left: el.getBoundingClientRect().left - (document.querySelector(".vlist-viewport")?.getBoundingClientRect().left ?? 0),
          role: el.style.getPropertyValue("--vlist-carousel-role"),
          progress: el.style.getPropertyValue("--vlist-carousel-progress"),
          offset: el.style.getPropertyValue("--vlist-carousel-offset"),
          carouselWidth: el.style.getPropertyValue("--vlist-carousel-width"),
        };
      }),
      step: document.getElementById("info-step")?.textContent,
    };
  });

  console.log(`\n=== ${label} ===`);
  console.log(`scrollLeft=${state.scrollLeft} vpWidth=${state.vpWidth} scrollWidth=${state.vpScrollWidth}`);
  console.log(`contentWidth=${state.contentWidth}`);
  console.log(`rendered=${state.renderedCount} step=${state.step}`);
  console.log("Items:");
  for (const item of state.items) {
    const leftInVP = Math.round(item.left);
    console.log(`  [${item.vi}] w=${item.styleWidth} offsetW=${item.width} tx=${Math.round(item.tx ?? 0)} vpLeft=${leftInVP} role=${item.role} progress=${item.progress} offset=${item.offset}`);
  }
}

// State at rest (hero, item 0)
await dumpState("Hero at rest");

// Click next
await page.click("#btn-next");
await new Promise((r) => setTimeout(r, 800));
await dumpState("After next() — should show item 1 as focal");

// Manually scroll a little with mouse wheel
await page.mouse.move(400, 400);
await page.mouse.wheel({ deltaX: 100 });
await new Promise((r) => setTimeout(r, 500));
await dumpState("After small wheel scroll (+100px)");

// Wait for snap
await new Promise((r) => setTimeout(r, 1500));
await dumpState("After snap settle");

// Click next again
await page.click("#btn-next");
await new Promise((r) => setTimeout(r, 800));
await dumpState("After second next()");

// Check: scroll a lot
await page.mouse.wheel({ deltaX: 500 });
await new Promise((r) => setTimeout(r, 500));
await dumpState("After large wheel scroll (+500px)");

await new Promise((r) => setTimeout(r, 1500));
await dumpState("After large scroll settle");

if (errors.length) {
  console.log("\n❌ Errors:", errors);
} else {
  console.log("\n✅ No errors");
}

await browser.close();
