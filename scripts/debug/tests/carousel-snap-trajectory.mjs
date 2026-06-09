/**
 * Debug/investigation: record the carousel scroll-position trajectory through a
 * wheel fling + snap and analyse the SPRING phase for smoothness.
 *
 * Needs the TEMP `window.__list` instrumentation in
 * examples/carousel/vanilla/script.js.
 *
 * The fling is dispatched from INSIDE the page in a rAF loop (real display rate
 * ~120Hz), not via CDP mouse.wheel (which throttles to ~30Hz and contaminates
 * the trace). We tag each recorded sample with whether a wheel event was still
 * firing, so the post-fling samples isolate the snap spring.
 *
 * Two things to look for in the spring phase:
 *   - cadence: does pos advance EVERY display frame (smooth) or skip frames (stutter)?
 *   - profile: monotonic deceleration to rest (continuous) vs. dip-then-rise
 *              (spring re-accelerating toward a far ceil/floor target → two-step feel).
 */
import { launchBrowser, openPage, delay, parseArgs } from "../core.mjs";

const args = parseArgs();
const browser = await launchBrowser({ headless: !args.headful });
const { page } = await openPage(browser, "/examples/carousel", { settle: 1500, width: 1400, height: 900 });

page.on("console", (m) => { const t = m.text(); if (t.includes("[snap-dbg]") || t.includes("[aft]")) console.log(t); });

// Ensure snap is ON (the example defaults it on; only click if it's off).
const snapOn = await page.$eval("#toggle-snap", (el) => el.checked);
if (!snapOn) { await page.click("#toggle-snap"); await delay(800); }

const ok = await page.evaluate(() => typeof window.__list?.getScrollPosition === "function");
if (!ok) { console.error("window.__list not exposed — add the TEMP instrumentation"); await browser.close(); process.exit(2); }

const peak = args.peak ?? 110;
const decay = args.decay ?? 0.88;

const data = await page.evaluate(async ({ peak, decay }) => {
  const vp = document.querySelector(".vlist-viewport");
  // Derive stepSize: focal (role=large) item width + gap(8).
  const focalEl = [...document.querySelectorAll(".vlist-content [data-index]")]
    .find((el) => el.style.getPropertyValue("--vlist-carousel-role").trim() === "large");
  const stepSize = (parseFloat(getComputedStyle(focalEl).width) || 0) + 8;
  const out = [];
  let flinging = true;

  // Recorder at display rate.
  const recTick = () => {
    out.push({ t: performance.now(), pos: window.__list.getScrollPosition(), fling: flinging });
    if (out.length < 400) requestAnimationFrame(recTick);
  };
  requestAnimationFrame(recTick);

  // Fling: decaying horizontal wheel deltas, one per display frame.
  await new Promise((res) => {
    let d = peak;
    const fl = () => {
      if (Math.abs(d) < 1) { flinging = false; res(); return; }
      vp.dispatchEvent(new WheelEvent("wheel", { deltaX: d, deltaY: 0, cancelable: true, bubbles: true }));
      d *= decay;
      requestAnimationFrame(fl);
    };
    requestAnimationFrame(fl);
  });

  // Let the spring settle (recorder keeps running until it hits its cap).
  await new Promise((res) => setTimeout(res, 1200));
  return { out, stepSize };
}, { peak, decay });

const rec = data.out;
const stepSize = data.stepSize;

// Per-sample velocity.
const s = [];
for (let i = 1; i < rec.length; i++) {
  const dt = rec[i].t - rec[i - 1].t;
  if (dt <= 0) continue;
  s.push({ t: rec[i].t - rec[0].t, pos: rec[i].pos, dt, v: (rec[i].pos - rec[i - 1].pos) / dt, fling: rec[i].fling });
}

// Active window over the WHOLE motion (fling + spring), since the snap fires
// mid-tail and there is no clean flag boundary.
let lo = s.findIndex((x) => Math.abs(x.v) > 0.05);
let hi = s.length - 1;
while (hi > lo && Math.abs(s[hi].v) < 0.01 && Math.abs(s[hi - 1].v) < 0.01) hi--;
const act = s.slice(Math.max(0, lo), hi + 1);
const lastFling = act.findLastIndex((x) => x.fling);

const fr = (p) => { const f = p / stepSize; return (f - Math.floor(f)); }; // fractional pos within step
console.log(`samples=${s.length}  active=${act.length}  stepSize=${stepSize.toFixed(1)}  mean display dt=${(s.reduce((a, x) => a + x.dt, 0) / s.length).toFixed(1)}ms`);
const settle = act[lastFling];
console.log(`last wheel @ idx ${lastFling} t=${settle?.t.toFixed(0)}ms  frac=${fr(settle?.pos ?? 0).toFixed(3)}  finalFrac=${fr(act[act.length - 1].pos).toFixed(3)}\n`);

console.log("  t(ms)   dt    pos        frac   v(px/ms)  | src   moved?");
let still = 0;
for (let i = 0; i < act.length; i++) {
  const x = act[i];
  const moved = Math.abs(x.pos - (act[i - 1]?.pos ?? x.pos)) > 0.001;
  if (i > 0 && !moved) still++;
  const src = x.fling ? "wheel" : "SPRING";
  console.log(`${x.t.toFixed(0).padStart(7)} ${x.dt.toFixed(0).padStart(4)}  ${x.pos.toFixed(1).padStart(9)}  ${fr(x.pos).toFixed(3)}  ${x.v.toFixed(3).padStart(8)}  | ${src}  ${moved ? "·" : "STILL"}`);
}

const stutterPct = act.length > 1 ? (still / (act.length - 1)) * 100 : 0;
const sp = act.map((x) => Math.abs(x.v));
let pk = 0; for (let i = 1; i < sp.length; i++) if (sp[i] > sp[pk]) pk = i;
let mn = Infinity, mi = pk; for (let i = pk; i < sp.length; i++) if (sp[i] < mn) { mn = sp[i]; mi = i; }
let re = 0; for (let i = mi; i < sp.length; i++) re = Math.max(re, sp[i] - mn);

console.log(`\nframe cadence: ${stutterPct.toFixed(0)}% of motion frames did NOT advance position`);
console.log(stutterPct > 25 ? "⚠️  STUTTER — not updating every display frame." : "✓ advances ~every frame.");
console.log(`profile: peak=${sp[pk]?.toFixed(3)} @${act[pk]?.t.toFixed(0)}ms  min-after-peak=${mn.toFixed(3)} @${act[mi]?.t.toFixed(0)}ms  re-accel=${re.toFixed(3)}`);
console.log(re > 0.05 ? "⚠️  RE-ACCELERATION — speed dips then rises (two-step feel)." : "✓ monotonic deceleration after peak.");

if (args.headful) { console.log("keeping browser open 4s…"); await delay(4000); }
await browser.close();
