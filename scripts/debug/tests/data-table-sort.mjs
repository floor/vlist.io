import assert from "node:assert/strict";
import { DEFAULTS, launchBrowser } from "../core.mjs";

// Serve deterministic city pages through the same requests as the real API.
// The site's browser gate runs without the optional cities database.
const cities = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  name: `City ${String(120 - i).padStart(3, "0")}`,
  country_code: "FR",
  continent: "Europe",
  population: 100000 + i,
  lat: 0,
  lng: 0,
}));

function waitForRead(promise, label) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`No ${label} request`)), 8000).unref();
  });
  return Promise.race([promise, timeout]);
}

const browser = await launchBrowser();
const base = new URL(DEFAULTS.base);
console.log(await browser.version());
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  const sortedRead = Promise.withResolvers();
  const sortResponse = Promise.withResolvers();
  const descendingRead = Promise.withResolvers();
  const descendingResponse = Promise.withResolvers();
  let sortReads = 0;
  await page.setRequestInterception(true);
  page.on("request", async (request) => {
    const url = new URL(request.url());
    if (url.origin !== base.origin) return request.abort();
    if (url.pathname !== "/api/cities") return request.continue();
    const { sort, direction, offset, limit } = Object.fromEntries(url.searchParams);
    const descendingIds = sort === "name" ? direction === "asc" : direction === "desc";
    const rows = descendingIds ? cities.toReversed() : cities;
    if (sort === "id" && direction === "asc" && offset === "0") {
      sortReads++;
      sortedRead.resolve();
      await sortResponse.promise;
    }
    if (sort === "id" && direction === "desc" && offset === "0") {
      descendingRead.resolve();
      await descendingResponse.promise;
    }
    const items = rows.slice(Number(offset), Number(offset) + Number(limit));
    const body = JSON.stringify({
      items,
      total: cities.length,
      hasMore: Number(offset) + items.length < cities.length,
    });
    await request.respond({ contentType: "application/json", body }).catch((error) => {
      // Chrome can cancel the intercepted request when a newer sort wins.
      if (sort !== "id" || direction !== "desc") throw error;
    });
  });

  await page.goto(new URL("/examples/data-table", base).href, { waitUntil: "domcontentloaded" });
  const rowSelector = "#list-container .vlist-item[data-id]";
  const firstRealRow = `${rowSelector}[data-id="120"]`;
  await page.waitForSelector(firstRealRow);
  const snapshot = () => page.$$eval(rowSelector, (rows) => ({
    ids: rows.filter((row) => !row.classList.contains("vlist-item--placeholder"))
      .map((row) => row.dataset.id),
    placeholders: rows.filter((row) => row.classList.contains("vlist-item--placeholder")).length,
  }));
  const before = await snapshot();
  assert.equal(before.ids[0], "120");
  assert.equal(before.placeholders, 0);

  await page.click('[data-column-key="id"]');
  await waitForRead(sortedRead.promise, "sorted first-page");
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const pending = await snapshot();
  sortResponse.resolve();
  await page.waitForSelector(`${rowSelector}[data-id="1"]`);
  const after = await snapshot();

  console.log(`initial: first=${before.ids[0]}, real=${before.ids.length}, placeholders=${before.placeholders}`);
  console.log(`pending: first=${pending.ids[0]}, real=${pending.ids.length}, placeholders=${pending.placeholders}`);
  console.log(`sorted: first=${after.ids[0]}, real=${after.ids.length}, placeholders=${after.placeholders}, first-page reads=${sortReads}`);
  assert.deepEqual(pending, before, "the same rows must stay visible until the sorted page arrives");
  assert.equal(after.ids[0], "1");
  assert.equal(after.placeholders, 0);
  assert.equal(sortReads, 1);

  await page.click('[data-column-key="id"]');
  await waitForRead(descendingRead.promise, "descending first-page");
  await page.click('[data-column-key="name"]');
  await page.waitForFunction(() => document.querySelector("#info-sort")?.textContent === "name asc");
  descendingResponse.resolve();
  await page.waitForNetworkIdle();
  assert.equal((await snapshot()).ids[0], "120");
  assert.equal(await page.$eval("#info-sort", (el) => el.textContent), "name asc");
  console.log("rapid sorts: the city-name sort wins over the held ID sort");
} finally {
  await browser.close();
}
