/** Real Chrome wiring/geometry smoke test, NOT physical-device sign-off. */
import assert from "node:assert/strict";
import { launchBrowser } from "../core.mjs";

const base = process.argv.find(arg => arg.startsWith("--base="))?.slice(7) ?? "http://localhost:3338/experiments/synthetic/";
const browser = await launchBrowser();
let page = await browser.newPage();
const errors = [];
page.on("pageerror", error => errors.push(String(error)));
await page.setViewport({ width: 430, height: 932, hasTouch: true, isMobile: true });
let cdp = await page.createCDPSession();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const read = () => page.evaluate(() => window.__rfc013.snapshot());
const touch = (type, points) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points });
async function drag(vertical, cross = false, release = true) {
  const box = await page.$eval("#viewport", el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  // Avoid the interactive link and hit ordinary row content.
  const origin = { x: box.x + Math.min(95, box.width / 3), y: box.y + (vertical ? 180 : 80), id: 1 };
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return { tag: el?.tagName, inViewport: !!el?.closest("#viewport"), interactive: !!el?.closest("a,button,input,select,textarea"), scale: visualViewport.scale };
  }, origin);
  assert(hit.inViewport && !hit.interactive, `gesture must start on plain row: ${JSON.stringify({ origin, hit })}`);
  await touch("touchStart", [origin]);
  for (let step = 1; step <= 6; step++) {
    const alongY = cross ? !vertical : vertical;
    await touch("touchMove", [{ ...origin, x: origin.x - (alongY ? 0 : step * 10), y: origin.y - (alongY ? step * 10 : 0) }]);
    await wait(16);
  }
  if (release) await touch("touchEnd", []);
}
async function geometry() {
  return page.$eval("#viewport", el => {
    const vertical = !document.body.classList.contains("horizontal");
    const frame = el.getBoundingClientRect();
    const start = vertical ? frame.top : frame.left;
    const length = vertical ? el.clientHeight : el.clientWidth;
    const ranges = [...el.querySelectorAll(".row:not([hidden])")].map(row => {
      const r = row.getBoundingClientRect(); return [vertical ? r.top : r.left, vertical ? r.bottom : r.right];
    }).sort((a, b) => a[0] - b[0]);
    let covered = start;
    for (const [a, b] of ranges) { if (a > covered + 1) break; covered = Math.max(covered, b); }
    return { covered: covered >= start + length - 1, length, scrollExtent: vertical ? el.scrollHeight : el.scrollWidth };
  });
}
try {
  console.log(`Browser: ${await browser.version()}`);
  for (const axis of ["y", "x"]) {
    if (axis === "x") {
      // Isolate CDP touch/zoom recognizer state between axis scenarios.
      await page.close();
      page = await browser.newPage();
      page.on("pageerror", error => errors.push(String(error)));
      await page.setViewport({ width: 430, height: 932, hasTouch: true, isMobile: true });
      cdp = await page.createCDPSession();
    }
    await page.goto(`${base}?axis=${axis}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__rfc013?.snapshot().nodes > 0);
    await page.$eval("#viewport", el => el.scrollIntoView({ block: "center" }));
    const g = await geometry();
    assert(g.covered, `${axis}: initial paint coverage`);
    assert.equal(g.length, g.scrollExtent, `${axis}: content stays viewport-sized`);
    await page.click("#middle"); await wait(80);
    const middle = await read();
    await page.$eval("#viewport", el => el.scrollIntoView({ block: "center" }));
    await drag(axis === "y"); await wait(80);
    const touched = await read();
    assert(touched.logical > middle.logical, `${axis}: touch advances logical position: ${JSON.stringify(touched)}`);
    // New pointer catches inertia; cancelling it cannot start another fling.
    await drag(axis === "y", false, false);
    await touch("touchCancel", []); await wait(80);
    const cancelled = await read(); await wait(100);
    assert.equal((await read()).logical, cancelled.logical, `${axis}: cancel stops motion`);
    assert.equal(cancelled.nativeMainOffset, 0);
    assert((await geometry()).covered, `${axis}: actual DOM covers viewport`);
    // Real cross-axis touch is browser-owned and must not shift logical position.
    const beforeCross = await read();
    await drag(axis === "y", true); await wait(150);
    const afterCross = await read();
    assert.equal(afterCross.logical, beforeCross.logical, `${axis}: cross-axis has no main drift`);
    const crossOffset = await page.$eval("#viewport", (el, a) => a === "y" ? el.scrollLeft : el.scrollTop, axis);
    assert(crossOffset > 0, `${axis}: native cross-axis touch scrolls`);
    if (axis === "y") {
      const synced = await page.$eval("#header", el => el.style.transform);
      assert(synced.includes(`-${crossOffset}`), "table-like header follows native pan");
    }
    await page.click("#last"); await wait(80);
    const last = await read(); assert.equal(last.logical, last.max);
    assert((await geometry()).covered, `${axis}: final item coverage`);
    await page.click("#resize"); await wait(80);
    assert((await geometry()).covered, `${axis}: resize coverage`);
    await page.click("#first"); await wait(80);
    assert.equal((await read()).logical, 0);
    await page.focus("#viewport"); await page.keyboard.press("End"); await wait(80);
    const end = await read(); assert.equal(end.logical, end.max);
    assert.equal(end.counters.coverageFailures, 0);
    assert.equal(end.counters.nativeMainScrollEvents, 0);
    assert(end.nodes < 40, `${axis}: DOM node budget`);
    // Exercise animation arbitration through browser controls, not the pure model.
    await page.click("#first"); await wait(50);
    await page.click("#smooth"); await wait(60);
    assert((await read()).logical > 0, `${axis}: smooth navigation starts`);
    await page.focus("#viewport"); await page.keyboard.press("Home"); await wait(450);
    assert.equal((await read()).logical, 0, `${axis}: keyboard cancels smooth navigation`);
    await page.$eval("#viewport", el => el.scrollIntoView({ block: "center" }));
    const box = await page.$eval("#viewport", el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y }; });
    const one = { x: box.x + 70, y: box.y + 80, id: 1 };
    const two = { x: box.x + 130, y: box.y + 100, id: 2 };
    await touch("touchStart", [one]);
    await touch("touchStart", [one, two]);
    await touch("touchEnd", []); await wait(80);
    const multi = await read();
    assert(multi.counters.multitouchCancels > 0, `${axis}: second finger cancels ownership`);
    assert.equal(multi.state, "idle", `${axis}: all fingers lifted clears cancellation`);
    console.log(`PASS ${axis}: touch, cancel, native cross-axis, navigation, resize, keyboard, geometry`);
  }
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.goto(base, { waitUntil: "networkidle0" });
  await page.click("#smooth"); await wait(30);
  const reduced = await read();
  assert.equal(reduced.state, "idle", "reduced motion has no interpolation");
  assert.equal(reduced.logical, 5200, "reduced motion jumps to exact target");
  await page.emulateMediaFeatures([]);
  await page.goto(base, { waitUntil: "networkidle0" });
  await page.screenshot({ path: "/tmp/rfc-013-synthetic.png", fullPage: true });
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log("PASS browser smoke. Physical-device feel, pinch and chaining validation remain pending.");
} finally { await browser.close(); }
