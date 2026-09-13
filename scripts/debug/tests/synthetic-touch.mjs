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
  const origin = await page.evaluate(({ box, vertical }) => {
    const candidates = [vertical ? 180 : 80, 30, 120, 210];
    for (const offset of candidates) {
      if (offset >= box.height) continue;
      const point = { x: box.x + Math.min(95, box.width / 3), y: box.y + offset, id: 1 };
      const hit = document.elementFromPoint(point.x, point.y);
      if (hit?.closest("#viewport") && !hit.closest("a,button,input,select,textarea")) return point;
    }
    throw new Error("No plain row origin after native cross-axis pan");
  }, { box, vertical });
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

// Each regression runs on a fresh page so an expected baseline failure cannot
// conceal another defect. --regressions-only also probes the deployed build.
async function regressions() {
  let failures = 0;
  const selected = process.argv.find(arg => arg.startsWith("--case="))?.slice(7);
  const cases = {
    async focus(axis) {
      const actual = await page.evaluate(async axis => {
        const stage = document.querySelector("#stage"), viewport = document.querySelector("#viewport");
        const rect = viewport.getBoundingClientRect();
        const link = [...stage.querySelectorAll("a")].find(a => {
          const r = a.getBoundingClientRect();
          return axis === "y" ? r.top > rect.bottom : r.left > rect.right;
        });
        if (!link) throw new Error("Missing overscan link");
        const overflow = getComputedStyle(stage)[axis === "y" ? "overflowY" : "overflowX"];
        link.focus();
        await new Promise(resolve => setTimeout(resolve, 80));
        return { overflow, stage: axis === "y" ? stage.scrollTop : stage.scrollLeft,
          viewport: axis === "y" ? viewport.scrollTop : viewport.scrollLeft,
          events: window.__rfc013.snapshot().counters.nativeMainScrollEvents };
      }, axis);
      assert.deepEqual(actual, { overflow: "clip", stage: 0, viewport: 0, events: 0 });
    },
    async link(axis) {
      const origin = await linkPoint(axis);
      await page.evaluate(() => {
        window.rowClicks = 0;
        window.pointerLog = [];
        for (const type of ["pointerdown", "pointerup", "click"]) window.addEventListener(type, e => window.pointerLog.push({ type, id: e.pointerId, detail: e.detail, state: window.__rfc013.snapshot().state }), true);
        document.querySelector("#stage").addEventListener("click", () => window.rowClicks++);
      });
      const before = await read(), url = page.url();
      await gesture(origin, axis);
      await wait(80);
      assert((await read()).logical > before.logical, "drag from Test link advances logical position");
      assert.equal(await page.evaluate(() => window.rowClicks), 0, "drag must not click");
      assert.equal(page.url(), url, "drag must not navigate");
    },
    async catch(axis) {
      await page.evaluate(() => {
        window.rowClicks = 0;
        window.pointerLog = [];
        for (const type of ["pointerdown", "pointerup", "click"]) window.addEventListener(type, e => window.pointerLog.push({ type, id: e.pointerId, detail: e.detail, state: window.__rfc013.snapshot().state }), true);
        document.querySelector("#stage").addEventListener("click", () => window.rowClicks++);
      });
      const origin = await plainPoint(axis);
      await gesture(origin, axis, 40);
      await wait(600);
      assert.equal((await read()).state, "inertia", "catch probe must still be flinging after 600ms");
      await touch("touchStart", [origin]); await touch("touchEnd", []); await wait(60);
      assert.equal(await page.evaluate(() => window.pointerLog.filter(e => e.type === "pointerdown").at(-1).state), "inertia", "pointer must catch live inertia, not a settled fling");
      assert.equal(await page.evaluate(() => window.rowClicks), 0, `catch must suppress pointer click: ${JSON.stringify(await page.evaluate(() => ({ pointers: window.pointerLog, events: window.__rfc013.snapshot().events })))}`);
      assert.equal((await read()).state, "idle");
      await touch("touchStart", [origin]); await touch("touchEnd", []); await wait(60);
      assert.equal(await page.evaluate(() => window.rowClicks), 1, "ordinary idle tap must click");
      await page.$eval("#smooth", el => el.click());
      await touch("touchStart", [origin]); await touch("touchEnd", []); await wait(60);
      assert.equal(await page.evaluate(() => window.pointerLog.filter(e => e.type === "pointerdown").at(-1).state), "animating", "pointer must catch smooth navigation");
      assert.equal(await page.evaluate(() => window.rowClicks), 1, "animation catch must suppress click");
      // A drag may have no browser-generated click. A delayed compatibility click
      // for that same pointer is still consumed, without swallowing other inputs.
      await gesture(origin, axis);
      await wait(650);
      const clicks = await page.evaluate(() => {
        const id = window.pointerLog.filter(e => e.type === "pointerup").at(-1).id;
        const row = document.querySelector(".row:not([hidden])");
        const send = (pointerId, detail) => row.dispatchEvent(new PointerEvent("click", { bubbles: true, cancelable: true, pointerId, detail }));
        send(id + 100, 1); const unrelated = window.rowClicks;
        send(-1, 0); const keyboard = window.rowClicks;
        send(id, 1); const suppressed = window.rowClicks;
        send(id, 1); const consumedOnce = window.rowClicks;
        return { unrelated, keyboard, suppressed, consumedOnce };
      });
      assert.deepEqual(clicks, { unrelated: 2, keyboard: 3, suppressed: 3, consumedOnce: 4 });
    },
    async keyboard(axis) {
      await linkPoint(axis);
      await page.evaluate(() => document.querySelector(".row:not([hidden]) a").focus({ preventScroll: true }));
      const before = await read();
      await page.keyboard.press(axis === "y" ? "ArrowDown" : "ArrowRight"); await wait(50);
      assert.equal((await read()).logical, before.logical + (axis === "y" ? 52 : 180), "focused link permits arrow navigation");
    },
    async clocks(axis) {
      const origin = await plainPoint(axis);
      const time = Date.now() / 1000 - 2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [origin], timestamp: time });
      for (let step = 1; step <= 3; step++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...origin,
          x: origin.x - (axis === "x" ? step * 20 : 0), y: origin.y - (axis === "y" ? step * 20 : 0) }], timestamp: time + step * 0.016 });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [], timestamp: time + 0.2 });
      const ended = await read();
      assert(ended.logical > 0, "timestamp probe must move");
      assert.equal(ended.state, "idle", "stale release uses event timestamp even when dispatched quickly");
    },
    async pause(axis) {
      await page.evaluate(() => {
        document.querySelector("#smooth").click();
        requestAnimationFrame(() => { const end = performance.now() + 160; while (performance.now() < end) {} });
      });
      await wait(250);
      assert.equal((await read()).logical, axis === "y" ? 5200 : 18000, "paused smooth navigation lands on target");
      assert.equal((await read()).state, "idle");
    },
  };
  for (const axis of ["y", "x"]) for (const [name, run] of Object.entries(cases)) {
    if (selected && selected !== name) continue;
    await page.close(); page = await browser.newPage();
    page.on("pageerror", error => errors.push(String(error)));
    await page.setViewport({ width: 430, height: 932, hasTouch: true, isMobile: true });
    cdp = await page.createCDPSession();
    await page.goto(`${base}?axis=${axis}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__rfc013?.snapshot().nodes > 0);
    await page.$eval("#viewport", el => el.scrollIntoView({ block: "center" }));
    try { await run(axis); console.log(`PASS regression ${axis}/${name}`); }
    catch (error) { failures++; console.error(`FAIL regression ${axis}/${name}: ${error.message}`); }
  }
  assert.equal(failures, 0, `${failures} regression probes failed`);
}
async function plainPoint(axis) {
  return page.$eval("#viewport", (el, axis) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + (axis === "x" ? 220 : 80), y: r.y + (axis === "y" ? 240 : 70), id: 1 };
  }, axis);
}
async function linkPoint(axis) {
  await page.evaluate(axis => {
    const viewport = document.querySelector("#viewport");
    const link = document.querySelector(".row:not([hidden]) a");
    if (axis === "y") viewport.scrollLeft = link.offsetLeft - 40;
  }, axis);
  await wait(50);
  return page.evaluate(() => {
    const v = document.querySelector("#viewport").getBoundingClientRect();
    const link = [...document.querySelectorAll(".row:not([hidden]) a")].find(a => {
      const r = a.getBoundingClientRect();
      return r.top > v.top + 70 && r.bottom < v.bottom && r.left >= v.left && r.right <= v.right;
    });
    if (!link) throw new Error("No visible Test link for real touch");
    const r = link.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 };
  });
}
async function gesture(origin, axis, distance = 10) {
  await touch("touchStart", [origin]);
  for (let step = 1; step <= 6; step++) {
    await touch("touchMove", [{ ...origin, x: origin.x - (axis === "x" ? step * distance : 0), y: origin.y - (axis === "y" ? step * distance : 0) }]);
    await wait(16);
  }
  await touch("touchEnd", []);
}

try {
  await regressions();
  if (process.argv.includes("--regressions-only")) process.exitCode = 0;
  else {
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
    await touch("touchEnd", [one]);
    await touch("touchEnd", []); await wait(80);
    const multi = await read();
    assert(multi.counters.multitouchCancels > 0, `${axis}: second finger cancels ownership`);
    assert.equal(multi.state, "idle", `${axis}: all fingers lifted clears cancellation`);
    const beforeRecovery = await read();
    await drag(axis === "y"); await wait(80);
    assert((await read()).logical > beforeRecovery.logical, `${axis}: same-page drag recovers after multitouch`);
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
  await page.screenshot({ path: "/tmp/rfc-014-synthetic.png", fullPage: true });
  assert.deepEqual(errors, [], "no browser runtime errors");
  console.log("PASS browser smoke. Physical-device feel, pinch and chaining validation remain pending.");
  }
} finally { await browser.close(); }
