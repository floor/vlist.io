/**
 * Debug: large-list grid scrollbar doesn't reach the very bottom
 *
 * Repro: Select "Grid" layout, drag the custom scrollbar to the very bottom.
 * Expected: The last items (#999,997 – #1,000,000) are visible.
 * Bug: Scrollbar max position was short by mainAxisPadding (16px for padding:8).
 */
import puppeteer from "puppeteer";

const URL = "http://localhost:5174/examples/large-list/vanilla/";

const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
const page = await browser.newPage();
await page.goto(URL, { waitUntil: "networkidle0" });

// Select Grid layout
await page.click('[data-layout="grid"]');
await page.waitForSelector(".vlist-grid-item");
await new Promise((r) => setTimeout(r, 300));

// Get scrollbar thumb and track
const thumb = await page.$(".vlist-scrollbar__thumb");
const track = await page.$(".vlist-scrollbar");

if (!thumb || !track) {
  console.error("Scrollbar not found");
  await browser.close();
  process.exit(1);
}

const trackBox = await track.boundingBox();
const thumbBox = await thumb.boundingBox();

// Drag thumb to the very bottom of the track
const startX = thumbBox.x + thumbBox.width / 2;
const startY = thumbBox.y + thumbBox.height / 2;
const endY = trackBox.y + trackBox.height - 5;

await page.mouse.move(startX, startY);
await page.mouse.down();
await page.mouse.move(startX, endY, { steps: 20 });
await page.mouse.up();
await new Promise((r) => setTimeout(r, 300));

// Check what items are visible
const lastItem = await page.evaluate(() => {
  const items = document.querySelectorAll(".vlist-grid-item");
  const indices = [];
  items.forEach((el) => indices.push(parseInt(el.getAttribute("data-index"))));
  return Math.max(...indices);
});

console.log(`Last visible item index after scrollbar drag: ${lastItem}`);
console.log(`Expected: 999999 (item #1,000,000)`);

if (lastItem === 999999) {
  console.log("✓ PASS — scrollbar reaches the very bottom");
} else {
  console.log(`✗ FAIL — scrollbar stops short (last index: ${lastItem})`);
}

// Compare with End key
await page.keyboard.press("End");
await new Promise((r) => setTimeout(r, 300));

const lastItemEnd = await page.evaluate(() => {
  const items = document.querySelectorAll(".vlist-grid-item");
  const indices = [];
  items.forEach((el) => indices.push(parseInt(el.getAttribute("data-index"))));
  return Math.max(...indices);
});

console.log(`\nLast visible item index after End key: ${lastItemEnd}`);
console.log(`Both should reach item #1,000,000 (index 999999)`);

await new Promise((r) => setTimeout(r, 5000));
await browser.close();
