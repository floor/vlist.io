/**
 * Debug: plugin-wizard carousel check
 */
import { launchBrowser } from "../core.mjs";

const browser = await launchBrowser({});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto("http://localhost:3338/examples/plugin-wizard", {
  waitUntil: "networkidle2",
  timeout: 15000,
});
await new Promise((r) => setTimeout(r, 2000));

const state = await page.evaluate(() => {
  const items = [...document.querySelectorAll(".vlist-content [data-index]")];
  return items.map(el => ({
    vi: el.dataset.index,
    h: el.offsetHeight,
    w: el.offsetWidth,
    styleH: el.style.height,
    vpTop: Math.round(el.getBoundingClientRect().top - document.querySelector(".vlist-viewport").getBoundingClientRect().top),
    role: el.style.getPropertyValue("--vlist-carousel-role"),
    progress: el.style.getPropertyValue("--vlist-carousel-progress"),
    offset: el.style.getPropertyValue("--vlist-carousel-offset"),
    display: el.style.display,
  }));
});

console.log("Plugin Wizard items:");
for (const s of state) {
  console.log(`  [${s.vi}] h=${s.styleH} offsetH=${s.h} vpTop=${s.vpTop} role=${s.role} progress=${s.progress} offset=${s.offset} display=${s.display}`);
}

await browser.close();
