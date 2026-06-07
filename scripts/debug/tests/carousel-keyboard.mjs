/**
 * Debug: carousel + keyboard navigation
 *
 * Traces what happens when ArrowRight is pressed in hero mode.
 * Checks scroll position, item layout, and carousel state after each key.
 *
 * Usage:
 *   bun run scripts/debug/tests/carousel-keyboard.mjs
 *   bun run scripts/debug/tests/carousel-keyboard.mjs --headed
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

async function dumpState(label) {
  const state = await page.evaluate(() => {
    const vp = document.querySelector(".vlist-viewport");
    const content = document.querySelector(".vlist-content");
    const items = [...(content?.querySelectorAll("[data-index]") ?? [])];

    return {
      scrollLeft: Math.round(vp?.scrollLeft ?? 0),
      vpWidth: vp?.clientWidth,
      step: document.getElementById("info-step")?.textContent,
      dotActive: [...document.querySelectorAll(".carousel-dot--active")].map(d => d.dataset.index).join(","),
      renderedCount: items.length,
      items: items.map(el => {
        const w = el.offsetWidth;
        const vpLeft = Math.round(el.getBoundingClientRect().left - (vp?.getBoundingClientRect().left ?? 0));
        return {
          dataIndex: el.dataset.index,
          id: el.id,
          w,
          vpLeft,
          display: el.style.display,
          role: el.style.getPropertyValue("--vlist-carousel-role"),
          progress: el.style.getPropertyValue("--vlist-carousel-progress"),
          title: el.querySelector(".photo-slide__title")?.textContent || "",
        };
      }),
    };
  });

  console.log(`\n=== ${label} ===`);
  console.log(`scrollLeft=${state.scrollLeft} vpWidth=${state.vpWidth} step=${state.step}`);
  console.log(`rendered=${state.renderedCount}`);

  // Show visible items (not display:none, within viewport)
  const visible = state.items.filter(i => i.display !== "none" && i.vpLeft >= -10 && i.vpLeft < state.vpWidth + 10);
  console.log("Visible items:");
  for (const item of visible) {
    console.log(`  [${item.dataIndex}] id=${item.id} w=${item.w} vpLeft=${item.vpLeft} role=${item.role} progress=${item.progress} "${item.title}"`);
  }

  // Show hidden items count
  const hidden = state.items.filter(i => i.display === "none");
  console.log(`Hidden: ${hidden.length} items (${hidden.map(i => i.dataIndex).join(",")})`);

  // Show all items with their display state for debugging
  console.log("All items:");
  for (const item of state.items) {
    console.log(`  [${item.dataIndex}] id=${item.id} w=${item.w} vpLeft=${item.vpLeft} display=${item.display || "visible"} role=${item.role}`);
  }
}

// Initial state
await dumpState("Initial (hero, item 0)");

// Focus the list first
await page.click("#list-container");
await new Promise((r) => setTimeout(r, 200));

// Press ArrowRight
await page.keyboard.press("ArrowRight");
await new Promise((r) => setTimeout(r, 500));
await dumpState("After ArrowRight #1");

// Press ArrowRight again
await page.keyboard.press("ArrowRight");
await new Promise((r) => setTimeout(r, 500));
await dumpState("After ArrowRight #2");

// Press ArrowRight again
await page.keyboard.press("ArrowRight");
await new Promise((r) => setTimeout(r, 500));
await dumpState("After ArrowRight #3");

if (errors.length) {
  console.log("\n❌ Errors:", errors);
} else {
  console.log("\n✅ No errors");
}

await browser.close();
