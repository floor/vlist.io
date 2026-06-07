/**
 * Debug: carousel example — MD3-aligned photo carousel
 *
 * Verifies the carousel example loads correctly with real photos,
 * nav buttons, dots, variant switcher, and carousel plugin.
 *
 * Usage:
 *   bun run scripts/debug/tests/carousel-md3.mjs
 *   bun run scripts/debug/tests/carousel-md3.mjs --headed
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

// Check basic rendering
const state = await page.evaluate(() => {
  const vp = document.querySelector(".vlist-viewport");
  const content = document.querySelector(".vlist-content");
  const items = content?.querySelectorAll("[data-index]");
  const dots = document.querySelectorAll(".carousel-dot");
  const navPrev = document.querySelector(".carousel-nav--prev");
  const navNext = document.querySelector(".carousel-nav--next");
  const variantBtns = document.querySelectorAll("#variant-buttons .ui-ctrl-btn");
  const activeVariant = document.querySelector("#variant-buttons .ui-ctrl-btn--active");
  const firstImg = items?.[0]?.querySelector(".photo-slide__img");
  const firstTitle = items?.[0]?.querySelector(".photo-slide__title");

  return {
    vpExists: !!vp,
    vpHeight: vp?.clientHeight,
    vpScrollHeight: vp?.scrollHeight,
    contentHeight: content?.style?.height,
    renderedItems: items?.length ?? 0,
    firstItemIdx: items?.[0]?.dataset?.index,
    firstImgSrc: firstImg?.src?.substring(0, 40),
    firstImgLoaded: firstImg?.classList?.contains("photo-slide__img--loaded"),
    firstTitle: firstTitle?.textContent,
    dotCount: dots.length,
    activeDotIndex: [...dots].findIndex(d => d.classList.contains("carousel-dot--active")),
    hasNavPrev: !!navPrev,
    hasNavNext: !!navNext,
    variantCount: variantBtns.length,
    activeVariant: activeVariant?.dataset?.variant,
    infoStep: document.getElementById("info-step")?.textContent,
    infoVariant: document.getElementById("info-variant")?.textContent,
  };
});

console.log("=== Carousel MD3 Debug ===\n");
console.log("Viewport:", state.vpExists ? "✅" : "❌", state.vpHeight + "px height, scrollH=" + state.vpScrollHeight);
console.log("Content height:", state.contentHeight);
console.log("Rendered items:", state.renderedItems);
console.log("First item: [" + state.firstItemIdx + "]", state.firstTitle);
console.log("First img:", state.firstImgSrc + "...", state.firstImgLoaded ? "loaded ✅" : "loading...");
console.log("Dots:", state.dotCount, "active:", state.activeDotIndex);
console.log("Nav buttons:", state.hasNavPrev && state.hasNavNext ? "✅ prev+next" : "❌");
console.log("Variants:", state.variantCount, "active:", state.activeVariant);
console.log("Info bar:", "step=" + state.infoStep, "variant=" + state.infoVariant);

// Test: click next button
await page.hover(".carousel-wrap");
await new Promise((r) => setTimeout(r, 300));
await page.click(".carousel-nav--next");
await new Promise((r) => setTimeout(r, 600));

const afterNext = await page.evaluate(() => {
  const activeDot = document.querySelector(".carousel-dot--active");
  const dots = [...document.querySelectorAll(".carousel-dot")];
  return {
    activeDotIndex: dots.indexOf(activeDot),
    infoStep: document.getElementById("info-step")?.textContent,
  };
});

console.log("\nAfter next click:");
console.log("Active dot:", afterNext.activeDotIndex, afterNext.activeDotIndex === 1 ? "✅" : "❌");
console.log("Info step:", afterNext.infoStep);

// Test: click a variant button
await page.click('[data-variant="hero"]');
await new Promise((r) => setTimeout(r, 1000));

const afterVariant = await page.evaluate(() => {
  const activeVariant = document.querySelector("#variant-buttons .ui-ctrl-btn--active");
  const infoVariant = document.getElementById("info-variant")?.textContent;
  const items = document.querySelectorAll(".vlist-content [data-index]");
  return {
    activeVariant: activeVariant?.dataset?.variant,
    infoVariant,
    renderedItems: items?.length ?? 0,
  };
});

console.log("\nAfter variant switch to hero:");
console.log("Active variant:", afterVariant.activeVariant, afterVariant.activeVariant === "hero" ? "✅" : "❌");
console.log("Info variant:", afterVariant.infoVariant);
console.log("Rendered items:", afterVariant.renderedItems);

if (errors.length) {
  console.log("\n❌ Errors:", errors);
} else {
  console.log("\n✅ No errors");
}

await browser.close();
