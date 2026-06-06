/**
 * Debug: carousel hero variant — CSS variables and visual widths
 *
 * Verifies that hero variant produces different item widths via
 * --vlist-carousel-width CSS variable.
 *
 * Usage:
 *   bun run scripts/debug/tests/carousel-hero.mjs
 *   bun run scripts/debug/tests/carousel-hero.mjs --headed
 */

import { launchBrowser } from "../core.mjs";

const browser = await launchBrowser({});
const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
page.on("pageerror", (err) => errors.push("PAGE ERROR: " + err.message));

await page.setViewport({ width: 1200, height: 900 });
await page.goto("http://localhost:3338/examples/carousel", {
  waitUntil: "networkidle2",
  timeout: 15000,
});
await new Promise((r) => setTimeout(r, 2000));

// === Full variant (default) ===
console.log("=== Full Variant ===\n");

const fullState = await page.evaluate(() => {
  const items = [...document.querySelectorAll(".vlist-content [data-index]")];
  return items.slice(0, 3).map(el => ({
    index: el.dataset.index,
    role: el.style.getPropertyValue("--vlist-carousel-role"),
    progress: el.style.getPropertyValue("--vlist-carousel-progress"),
    offset: el.style.getPropertyValue("--vlist-carousel-offset"),
    width: el.style.getPropertyValue("--vlist-carousel-width"),
    slideW: el.querySelector(".photo-slide")?.offsetWidth,
    slotW: el.offsetWidth,
  }));
});

for (const s of fullState) {
  console.log(`  [${s.index}] role=${s.role} progress=${s.progress} offset=${s.offset} width=${s.width} slideW=${s.slideW} slotW=${s.slotW}`);
}

// === Switch to hero ===
await page.click('[data-variant="hero"]');
await new Promise((r) => setTimeout(r, 1500));

console.log("\n=== Hero Variant ===\n");

const heroState = await page.evaluate(() => {
  const items = [...document.querySelectorAll(".vlist-content [data-index]")];
  const container = document.querySelector("#list-container");
  return {
    containerW: container?.clientWidth,
    items: items.slice(0, 4).map(el => ({
      index: el.dataset.index,
      role: el.style.getPropertyValue("--vlist-carousel-role"),
      progress: el.style.getPropertyValue("--vlist-carousel-progress"),
      offset: el.style.getPropertyValue("--vlist-carousel-offset"),
      width: el.style.getPropertyValue("--vlist-carousel-width"),
      slideW: el.querySelector(".photo-slide")?.offsetWidth,
      slotW: el.offsetWidth,
    })),
  };
});

console.log(`Container width: ${heroState.containerW}px`);
for (const s of heroState.items) {
  console.log(`  [${s.index}] role=${s.role} progress=${s.progress} offset=${s.offset} width=${s.width} slideW=${s.slideW} slotW=${s.slotW}`);
}

// Check: focal item should be wider than peek item
const focal = heroState.items.find(i => i.role === "large");
const peek = heroState.items.find(i => i.role === "small");
if (focal && peek) {
  const focalW = parseInt(focal.width);
  const peekW = parseInt(peek.width);
  console.log(`\nFocal width: ${focalW}px, Peek width: ${peekW}px`);
  console.log(`Visually different: ${focalW > peekW ? "✅" : "❌"}`);
  console.log(`Focal slide rendered: ${focal.slideW}px, Peek slide rendered: ${peek.slideW}px`);
  console.log(`Slide sizes match CSS var: focal=${focal.slideW === focalW ? "✅" : "❌"} peek=${peek.slideW === peekW ? "✅" : "❌"}`);
} else {
  console.log("\n❌ Could not find focal/peek items");
}

// === Switch to hero-center ===
await page.click('[data-variant="hero-center"]');
await new Promise((r) => setTimeout(r, 1500));

console.log("\n=== Hero-Center Variant ===\n");

const centerState = await page.evaluate(() => {
  const items = [...document.querySelectorAll(".vlist-content [data-index]")];
  return items.slice(0, 4).map(el => ({
    index: el.dataset.index,
    role: el.style.getPropertyValue("--vlist-carousel-role"),
    width: el.style.getPropertyValue("--vlist-carousel-width"),
    slideW: el.querySelector(".photo-slide")?.offsetWidth,
  }));
});

for (const s of centerState) {
  console.log(`  [${s.index}] role=${s.role} width=${s.width} slideW=${s.slideW}`);
}

if (errors.length) {
  console.log("\n❌ Errors:", errors);
} else {
  console.log("\n✅ No errors");
}

await browser.close();
