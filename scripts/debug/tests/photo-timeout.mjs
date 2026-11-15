/**
 * Debug: a photo that stays pending falls back to its committed SVG.
 *
 * picsum.photos accepts the connection and never answers — the owner's report,
 * and the reason the inline onerror swap from #141 never runs: neither `load`
 * nor `error` fires, so the slide stays blank. The browser harness aborts
 * foreign requests (the error path); this holds every picsum request open (the
 * hang path) and asserts the carousel's first slide shows its fallback within
 * ~5 s, with the fallback picture actually decoded.
 *
 * Usage:
 *   bun run scripts/debug/tests/photo-timeout.mjs
 *   VLIST_BASE=http://localhost:3338 bun run scripts/debug/tests/photo-timeout.mjs
 *
 * Needs the preview server (runBrowserSuite starts one); the examples must be
 * built — CI's Browser job does both.
 */

import { launchBrowser } from "../core.mjs";

const base =
  process.env.VLIST_BASE ||
  `http://localhost:${process.env.PORT || 3338}`;
const LIMIT_MS = 5000;
const PICSUM = /^https?:\/\/([a-z0-9-]+\.)*picsum\.photos\//i;

const browser = await launchBrowser({});
let failed = false;

function fail(message) {
  failed = true;
  console.log(`✗ ${message}`);
}

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });

  const held = [];
  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (PICSUM.test(request.url())) {
      // Never answer: this is the hang the owner saw, not a blocked host.
      held.push(request.url());
      return;
    }
    request.continue().catch(() => {});
  });

  await page.goto(`${base}/examples/carousel`, {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForSelector(
    ".vlist-carousel-slide img.photo-slide__img",
    { timeout: 10000 },
  );

  const startedAt = await page.evaluate(() => performance.now());
  const handle = await page.waitForFunction(
    () => {
      const img = document.querySelector(
        ".vlist-carousel-slide img.photo-slide__img",
      );
      if (!img) return null;
      const src = img.getAttribute("src") ?? "";
      if (!src.endsWith(".svg")) return null;
      return {
        src,
        marked: img.dataset.fallback === "1",
        swappedAt: performance.now(),
      };
    },
    { timeout: LIMIT_MS + 3000, polling: 50 },
  );
  const state = await handle.jsonValue();
  const elapsed = Math.round(state.swappedAt - startedAt);

  // The fallback must be a picture, not a request that failed on its own.
  await page.waitForFunction(
    () => {
      const img = document.querySelector(
        ".vlist-carousel-slide img.photo-slide__img",
      );
      return Boolean(img && img.complete && img.naturalWidth > 0);
    },
    { timeout: 3000, polling: 50 },
  );

  console.log(`held ${held.length} picsum request(s) open`);
  console.log(`fallback: ${state.src} after ${elapsed}ms`);

  if (held.length === 0) fail("no picsum request was hung — the page never asked");
  if (!state.marked) fail("the swap did not mark the element data-fallback");
  if (elapsed > LIMIT_MS) fail(`the fallback took ${elapsed}ms (limit ${LIMIT_MS}ms)`);
  if (!failed) console.log("✓ a pending photo fell back within the limit");
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
} finally {
  await browser.close();
}

process.exit(failed ? 1 : 0);
