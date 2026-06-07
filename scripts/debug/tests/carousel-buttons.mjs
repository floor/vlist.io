/**
 * Debug: carousel button + dot navigation stress test
 */
import { launchBrowser } from "../core.mjs";

const browser = await launchBrowser({});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 900 });
await page.goto("http://localhost:3338/examples/carousel", {
  waitUntil: "networkidle2", timeout: 15000,
});
await new Promise((r) => setTimeout(r, 2000));

async function dump(label) {
  const s = await page.evaluate(() => {
    const items = [...document.querySelectorAll(".vlist-content [data-index]")];
    const visible = items.filter(el => el.style.display !== "none" && el.offsetWidth > 50);
    const focal = visible.find(el => el.style.getPropertyValue("--vlist-carousel-role") === "large");
    const peek = visible.find(el => el.style.getPropertyValue("--vlist-carousel-role") === "small");
    return {
      step: document.getElementById("info-step")?.textContent,
      dotActive: document.querySelector(".carousel-dot--active")?.dataset.index,
      focalIdx: focal?.dataset.index,
      focalW: focal?.offsetWidth,
      focalTitle: focal?.querySelector(".photo-slide__title")?.textContent,
      peekIdx: peek?.dataset.index,
      peekW: peek?.offsetWidth,
      detail: document.getElementById("current-name")?.textContent
        || document.querySelector(".photo-detail__meta strong")?.textContent,
    };
  });
  const ok = s.focalIdx !== undefined && s.focalW > 200;
  console.log(
    `${ok ? "✅" : "❌"} ${label.padEnd(25)} step=${(s.step ?? "?").padEnd(8)} `
    + `dot=${(s.dotActive ?? "?").padStart(2)} `
    + `focal=[${(s.focalIdx ?? "?").toString().padStart(2)}] w=${String(s.focalW ?? 0).padStart(3)} `
    + `peek=[${(s.peekIdx ?? "?").toString().padStart(2)}] w=${String(s.peekW ?? 0).padStart(3)} `
    + `"${s.focalTitle ?? "NONE"}"`
  );
  return ok;
}

let pass = 0;
let fail = 0;
function count(ok) { if (ok) pass++; else fail++; }

// Hover to reveal nav buttons
await page.hover(".carousel-wrap");
await new Promise((r) => setTimeout(r, 200));

count(await dump("Initial"));

// Click next 10 times
for (let i = 1; i <= 10; i++) {
  await page.click(".carousel-nav--next");
  await new Promise((r) => setTimeout(r, 600));
  count(await dump(`Next #${i}`));
}

// Click prev 3 times
for (let i = 1; i <= 3; i++) {
  await page.click(".carousel-nav--prev");
  await new Promise((r) => setTimeout(r, 600));
  count(await dump(`Prev #${i}`));
}

// Dot navigation: jump to specific items
for (const dotIdx of [0, 10, 15, 23, 5, 12]) {
  await page.click(`.carousel-dot[data-index="${dotIdx}"]`);
  await new Promise((r) => setTimeout(r, 600));
  count(await dump(`Dot ${dotIdx}`));
}

// Rapid next clicks (no wait between)
for (let i = 0; i < 5; i++) {
  await page.click(".carousel-nav--next");
  await new Promise((r) => setTimeout(r, 100));
}
await new Promise((r) => setTimeout(r, 800));
count(await dump("After rapid 5x next"));

// Wrap around: from current, click next until we pass item 23
const current = await page.evaluate(() => {
  const focal = [...document.querySelectorAll(".vlist-content [data-index]")]
    .find(el => el.style.getPropertyValue("--vlist-carousel-role") === "large");
  return Number(focal?.dataset.index ?? 0);
});
const stepsToWrap = 24 - current + 2;
for (let i = 0; i < stepsToWrap; i++) {
  await page.click(".carousel-nav--next");
  await new Promise((r) => setTimeout(r, 500));
}
count(await dump("After wrap around"));

console.log(`\n${pass} passed, ${fail} failed out of ${pass + fail} checks`);

await browser.close();
