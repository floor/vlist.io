/**
 * Debug: carousel trackpad scroll rendering — checks for blank/missing items during fast scroll.
 * Simulates macOS trackpad two-finger HORIZONTAL swipe (deltaX-dominant events).
 */
import { launchBrowser, delay } from "../core.mjs";

const browser = await launchBrowser({ headless: false });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto("http://localhost:3338/examples/carousel", {
  waitUntil: "networkidle2", timeout: 15000,
});
await delay(2000);

async function checkCarousel(label) {
  const result = await page.evaluate(() => {
    const viewport = document.querySelector(".vlist-viewport");
    const items = [...document.querySelectorAll(".vlist-content > [data-index]")];
    const vpRect = viewport.getBoundingClientRect();
    const inView = items.filter(el => {
      const r = el.getBoundingClientRect();
      return r.right > vpRect.left && r.left < vpRect.right && el.style.display !== "none";
    });
    const totalVisibleWidth = inView.reduce((s, el) => s + el.getBoundingClientRect().width, 0);
    const gapEstimate = Math.max(0, inView.length - 1) * 8;
    const coverageRatio = vpRect.width > 0 ? (totalVisibleWidth + gapEstimate) / vpRect.width : 0;
    return {
      domItems: items.length,
      visibleItems: inView.length,
      containerWidth: Math.round(vpRect.width),
      totalVisibleWidth: Math.round(totalVisibleWidth),
      coverageRatio: coverageRatio.toFixed(2),
      step: document.getElementById("info-step")?.textContent,
    };
  });
  console.log(`[${label}] DOM: ${result.domItems}, visible: ${result.visibleItems}, ` +
    `coverage: ${result.coverageRatio} (${result.totalVisibleWidth}/${result.containerWidth}px), step: ${result.step}`);
  if (Number(result.coverageRatio) < 0.85) {
    console.log(`  ⚠️  Coverage below 85% — items missing from viewport`);
  }
  return result;
}

const el = await page.$(".vlist-viewport");
const box = await el.boundingBox();
const cx = box.x + box.width / 2;
const cy = box.y + box.height / 2;
await page.mouse.move(cx, cy);

console.log("── Before scroll ──");
await checkCarousel("idle");

// Simulate fast trackpad horizontal swipe (deltaX-dominant, like macOS two-finger)
console.log("\n── Fast horizontal trackpad swipe (60 events, deltaX=80) ──");
for (let i = 0; i < 60; i++) {
  await page.mouse.wheel({ deltaX: 80, deltaY: 0 });
  if (i % 15 === 14) {
    await delay(1);
    await checkCarousel(`mid-scroll-${i + 1}`);
  }
}
await delay(100);
await checkCarousel("after-swipe");

// Reverse direction
console.log("\n── Fast reverse swipe ──");
for (let i = 0; i < 60; i++) {
  await page.mouse.wheel({ deltaX: -80, deltaY: 0 });
  if (i % 15 === 14) {
    await delay(1);
    await checkCarousel(`mid-reverse-${i + 1}`);
  }
}
await delay(100);
await checkCarousel("after-reverse");

console.log("\nDone — keeping browser open 5s for visual inspection");
await delay(5000);
await browser.close();
