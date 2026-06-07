/**
 * Debug: carousel rapid next/prev button clicks — check for choppiness.
 * Runs headful so you can see the animation quality.
 */
import { launchBrowser, delay } from "../core.mjs";

const browser = await launchBrowser({ headless: false });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto("http://localhost:3338/examples/carousel", {
  waitUntil: "networkidle2", timeout: 15000,
});
await delay(2000);

// Hover to reveal nav buttons
await page.hover(".carousel-wrap");
await delay(300);

console.log("── Rapid next clicks (5x, 150ms apart) ──");
for (let i = 0; i < 5; i++) {
  await page.click(".carousel-nav--next");
  await delay(150);
}
await delay(1500);

// Capture state after rapid next
const afterNext = await page.evaluate(() => {
  const focal = [...document.querySelectorAll(".vlist-content [data-index]")]
    .find(el => el.style.getPropertyValue("--vlist-carousel-role") === "large");
  return {
    step: document.getElementById("info-step")?.textContent,
    focalIdx: focal?.dataset.index,
    scrollPos: document.querySelector(".vlist-viewport")?.scrollLeft,
  };
});
console.log("After 5x next:", afterNext);

console.log("\n── Rapid prev clicks (5x, 150ms apart) ──");
await page.hover(".carousel-wrap");
await delay(200);
for (let i = 0; i < 5; i++) {
  await page.click(".carousel-nav--prev");
  await delay(150);
}
await delay(1500);

const afterPrev = await page.evaluate(() => {
  const focal = [...document.querySelectorAll(".vlist-content [data-index]")]
    .find(el => el.style.getPropertyValue("--vlist-carousel-role") === "large");
  return {
    step: document.getElementById("info-step")?.textContent,
    focalIdx: focal?.dataset.index,
    scrollPos: document.querySelector(".vlist-viewport")?.scrollLeft,
  };
});
console.log("After 5x prev:", afterPrev);

console.log("\n── Rapid alternating next/prev (stress test) ──");
await page.hover(".carousel-wrap");
await delay(200);
for (let i = 0; i < 6; i++) {
  await page.click(i % 2 === 0 ? ".carousel-nav--next" : ".carousel-nav--prev");
  await delay(100);
}
await delay(1500);

const afterAlt = await page.evaluate(() => {
  const focal = [...document.querySelectorAll(".vlist-content [data-index]")]
    .find(el => el.style.getPropertyValue("--vlist-carousel-role") === "large");
  return {
    step: document.getElementById("info-step")?.textContent,
    focalIdx: focal?.dataset.index,
  };
});
console.log("After alternating:", afterAlt);

console.log("\nDone — keeping browser open 5s for visual inspection");
await delay(5000);
await browser.close();
