/**
 * Debug/investigation (issue 023): the carousel snap feels CHOPPY just before the
 * final position — only when scrolling LEFT (backward) on the hero-center variant.
 *
 * Prior traces recorded only the LOGICAL scroll position, which is smooth and
 * HIDES the chop. The chop is in what the user actually sees: the RENDERED
 * transform / on-screen position of the focal item. This test records, at display
 * rate, the on-screen left edge (getBoundingClientRect + style.transform) of EVERY
 * visible item through a wheel fling + snap, then isolates the item that ends up
 * focal and reports its per-frame motion — especially the final frames.
 *
 * Run:  cd vlist.io && bun scripts/debug/tests/carousel-snap-render-chop.mjs [--headful] [--dir=back|fwd] [--peak=110] [--decay=0.9]
 */
import { launchBrowser, openPage, delay, parseArgs } from "../core.mjs";

const args = parseArgs();
const browser = await launchBrowser({ headless: !args.headful });
const { page } = await openPage(browser, "/examples/carousel", { settle: 1500, width: 1400, height: 900 });

page.on("console", (m) => { const t = m.text(); if (t.startsWith("[chop]")) console.log(t); });
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

// Switch to hero-center (the variant the user reports).
await page.evaluate(() => {
  const btn = document.querySelector('#variant-buttons [data-variant="hero-center"]');
  if (btn) btn.click();
});
await delay(900);

// Ensure snap is ON.
const snapOn = await page.$eval("#toggle-snap", (el) => el.checked).catch(() => true);
if (!snapOn) { await page.click("#toggle-snap"); await delay(600); }

const dir = args.dir === "fwd" ? 1 : -1; // default backward (left)
const peak = (args.peak ?? 110) * dir;
const decay = args.decay ?? 0.9;

const data = await page.evaluate(async ({ peak, decay }) => {
  const vp = document.querySelector(".vlist-viewport");
  const content = document.querySelector(".vlist-content");
  const vpRect = vp.getBoundingClientRect();

  const txOf = (el) => {
    const m = /translate[XY]\((-?\d+(?:\.\d+)?)px\)/.exec(el.style.transform || "");
    return m ? parseFloat(m[1]) : NaN;
  };
  const snapshot = () => {
    const out = [];
    for (const el of content.querySelectorAll("[data-index]")) {
      if (el.style.display === "none") continue;
      const r = el.getBoundingClientRect();
      out.push({
        idx: el.dataset.index,
        role: el.style.getPropertyValue("--vlist-carousel-role").trim(),
        left: r.left - vpRect.left,     // on-screen left edge, viewport-relative
        width: r.width,
        tx: txOf(el),                    // raw transform px (pre-compositor)
      });
    }
    return out;
  };

  const frames = [];
  let flinging = true;
  const rec = () => {
    frames.push({ t: performance.now(), fling: flinging, items: snapshot() });
    if (frames.length < 500) requestAnimationFrame(rec);
  };
  requestAnimationFrame(rec);

  // Decaying wheel fling on an INDEPENDENT timer (NOT rAF). Real macOS trackpad
  // momentum arrives asynchronously between display frames with a long, low tail
  // that keeps trickling well after the predictive snap arms — so the momentum
  // and the snap spring run concurrently. Driving the fling off rAF (as before)
  // locked it to frame cadence and let it finish before the snap, hiding the bug.
  await new Promise((res) => {
    let d = peak;
    let lastReal = 0; // track the last event whose |delta| still moved the list
    const step = () => {
      // macOS keeps emitting momentum events with sub-pixel deltas for a while.
      // Stop only once the tail is truly spent (many consecutive tiny events).
      if (Math.abs(d) < 0.2) { flinging = false; res(); return; }
      vp.dispatchEvent(new WheelEvent("wheel", { deltaX: d, deltaY: 0, cancelable: true, bubbles: true }));
      if (Math.abs(d) >= 1) lastReal = performance.now();
      d *= decay;
      // ~120Hz momentum cadence, decoupled from the rAF render/snap loop.
      setTimeout(step, 8);
    };
    setTimeout(step, 8);
  });

  await new Promise((res) => setTimeout(res, 1400)); // let the spring settle
  return { frames, vpWidth: vpRect.width };
}, { peak, decay });

const frames = data.frames;
console.log(`[chop] captured ${frames.length} frames, viewport width ${data.vpWidth.toFixed(0)}px, dir=${peak < 0 ? "BACK/left" : "FWD/right"}`);

// The focal item at rest = the role=large item in the final frame.
const lastItems = frames[frames.length - 1].items;
const focal = lastItems.find((i) => i.role === "large") ?? lastItems.reduce((a, b) => (b.width > (a?.width ?? -1) ? b : a), null);
if (!focal) { console.log("[chop] no focal item found"); await browser.close(); process.exit(2); }
const focalIdx = focal.idx;
console.log(`[chop] resting focal item = #${focalIdx} left=${focal.left.toFixed(1)} width=${focal.width.toFixed(1)}`);

// Trajectory of that item's on-screen left edge across frames where it's visible.
const traj = [];
for (const f of frames) {
  const it = f.items.find((i) => i.idx === focalIdx);
  if (it) traj.push({ t: f.t - frames[0].t, fling: f.fling, left: it.left, tx: it.tx, width: it.width });
}

// A smooth settle is MONOTONE: the focal left edge approaches its rest value from
// one side, each frame's step ≤ the previous (decelerating). The chop the user
// sees is OSCILLATION — the position lurching forward then back as two drivers
// (wheel momentum via setLogical + the snap spring via ctx.scrollTo) alternate
// frames and disagree. A 1px-fwd/1px-back jitter never trips a ">2.5px jump"
// check yet reads as obvious chop on screen. So the real metric is REVERSALS.
function analyze(label, key) {
  // Build the rest-relative signed delta sequence for `key` over visible frames.
  const seq = [];
  for (let i = 1; i < traj.length; i++) {
    const d = traj[i][key] - traj[i - 1][key];
    if (Math.abs(d) < 0.01) continue; // ignore dead frames (rounding plateaus)
    seq.push({ t: traj[i].t, d, val: traj[i][key], fling: traj[i].fling });
  }
  // Count sign reversals (direction changes) — each one is a visible micro-jolt.
  let reversals = 0, backtrack = 0;
  const reversalFrames = [];
  for (let i = 1; i < seq.length; i++) {
    if (Math.sign(seq[i].d) !== Math.sign(seq[i - 1].d)) {
      reversals++;
      backtrack += Math.abs(seq[i].d);
      reversalFrames.push(seq[i]);
    }
  }
  console.log(`[chop] ${label}: ${reversals} direction REVERSALS, ${backtrack.toFixed(1)}px total backtrack`);
  if (reversals > 0) {
    for (const r of reversalFrames.slice(0, 12)) {
      console.log(`[chop]    reversal @t=${r.t.toFixed(0)}ms ${key}=${r.val.toFixed(1)} step=${r.d.toFixed(2)}px ${r.fling ? "(wheel)" : "(spring)"}`);
    }
  }
  return reversals;
}

console.log(`[chop] focal #${focalIdx} settle smoothness:`);
const revLeft = analyze("LEFT-edge", "left");
const revTx = analyze("raw tx   ", "tx");

// Find the LAST frame where the focal actually moved (the real settle point),
// then dump the window AROUND it — that's "just before reaching final position".
let settleIdx = traj.length - 1;
for (let i = traj.length - 1; i > 0; i--) {
  if (Math.abs(traj[i].left - traj[i - 1].left) >= 0.5 || Math.abs(traj[i].tx - traj[i - 1].tx) >= 0.5) { settleIdx = i; break; }
}
const from = Math.max(1, settleIdx - 30);
const to = Math.min(traj.length - 1, settleIdx + 4);
console.log(`[chop] focal #${focalIdx} trajectory around SETTLE (frame ${settleIdx}, t=${traj[settleIdx].t.toFixed(0)}ms):`);
console.log(`[chop]   t(ms)   left    dLeft     tx     dTx    width    dW   src`);
for (let i = from; i <= to; i++) {
  const p = traj[i - 1], c = traj[i];
  const dLeft = c.left - p.left;
  const prevD = i > 1 ? traj[i - 1].left - traj[i - 2].left : 0;
  const flip = dLeft !== 0 && prevD !== 0 && Math.sign(dLeft) !== Math.sign(prevD);
  console.log(`[chop] ${c.t.toFixed(0).padStart(7)} ${c.left.toFixed(1).padStart(7)} ${dLeft.toFixed(2).padStart(7)} ${c.tx.toFixed(1).padStart(8)} ${(c.tx - p.tx).toFixed(2).padStart(7)} ${c.width.toFixed(1).padStart(7)} ${(c.width - p.width).toFixed(1).padStart(5)}  ${c.fling ? "wheel" : "SPRING"}${flip ? "  <-- REVERSE" : ""}`);
}

const totalReversals = revLeft + revTx;
console.log(totalReversals > 2
  ? `[chop] ⚠️  CHOP — focal oscillates (${totalReversals} reversals): two drivers are fighting frame-to-frame.`
  : "[chop] ✓ focal settles monotonically (no oscillation).");

// =============================================================================
// Handoff seam — the "two-step" feel (momentum slows, THEN the snap takes over).
// A single continuous motion has a velocity curve that decelerates SMOOTHLY all
// the way to rest. The two-step feel shows up as a velocity DISCONTINUITY at the
// wheel→spring handoff (the spring is much slower/faster than the momentum it
// inherits) and/or a velocity PLATEAU (the spring sustains a near-constant crawl
// for many frames after the momentum already decelerated) — a visibly separate
// second motion. Measure both on the focal left-edge velocity (px/frame).
// =============================================================================
const vel = []; // per-frame focal velocity, only frames where the focal moved
for (let i = 1; i < traj.length; i++) {
  vel.push({ t: traj[i].t, v: traj[i].left - traj[i - 1].left, fling: traj[i].fling });
}
// First spring frame = wheel→spring transition.
const handoffIdx = vel.findIndex((p, i) => i > 0 && !p.fling && vel[i - 1].fling);
if (handoffIdx > 0) {
  const vLastWheel = vel[handoffIdx - 1].v;
  const vFirstSpring = vel[handoffIdx].v;
  const seam = Math.abs(vFirstSpring) - Math.abs(vLastWheel); // >0: spring faster, <0: spring slower
  console.log(`[chop] handoff @t=${vel[handoffIdx].t.toFixed(0)}ms: last wheel v=${vLastWheel.toFixed(2)}px/f → first spring v=${vFirstSpring.toFixed(2)}px/f (Δ=${seam.toFixed(2)}px/f)`);
  // Velocity profile around the handoff (px/frame).
  console.log(`[chop]   t(ms)   v(px/f)  src`);
  for (let i = Math.max(0, handoffIdx - 6); i <= Math.min(vel.length - 1, handoffIdx + 14); i++) {
    const p = vel[i];
    const mark = i === handoffIdx ? "  <-- HANDOFF" : "";
    console.log(`[chop] ${p.t.toFixed(0).padStart(7)} ${p.v.toFixed(2).padStart(8)}  ${p.fling ? "wheel" : "SPRING"}${mark}`);
  }
  // Plateau: count post-handoff spring frames whose speed stays within 25% of
  // the handoff speed (a sustained crawl rather than a decelerating ease).
  const hv = Math.abs(vFirstSpring);
  let plateau = 0;
  for (let i = handoffIdx; i < vel.length && !vel[i].fling; i++) {
    if (Math.abs(vel[i].v) >= hv * 0.75 && hv > 0.1) plateau++; else break;
  }
  // Spring duration: frames from handoff until the focal stops moving.
  let springFrames = 0;
  for (let i = handoffIdx; i < vel.length && !vel[i].fling; i++) {
    if (Math.abs(vel[i].v) >= 0.01) springFrames = i - handoffIdx + 1;
  }
  console.log(`[chop] spring phase: ${springFrames} moving frames (~${(springFrames * 8.3).toFixed(0)}ms), plateau=${plateau} frames`);
  const seamy = Math.abs(seam) > 0.6 || plateau >= 4;
  console.log(seamy
    ? `[chop] ⚠️  TWO-STEP — handoff seam Δ=${seam.toFixed(2)}px/f, plateau=${plateau}: momentum and spring read as separate motions.`
    : "[chop] ✓ single continuous deceleration (no perceptible two-step).");
} else {
  console.log("[chop] no wheel→spring handoff captured (snap may have driven the whole tail).");
}

if (args.headful) { console.log("[chop] keeping browser open 4s…"); await delay(4000); }
await browser.close();
