/**
 * debug/presets — Reusable assertions and test helpers.
 *
 * Each preset returns { pass, ...details } for use in suite tests.
 */

// =============================================================================
// DOM checks
// =============================================================================

export async function checkRenders(session, minItems = 1) {
  const state = await session.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    if (!content) return { error: "no content element" };
    const items = content.querySelectorAll("[data-index]");
    return {
      domCount: items.length,
      contentHeight: content.style.height,
      firstIdx: items[0]?.dataset?.index,
      firstText: items[0]?.textContent?.substring(0, 80)?.trim(),
      hasContent: items.length > 0 && items[0]?.textContent?.trim()?.length > 0,
    };
  });
  console.log("  State:", JSON.stringify(state, null, 2));
  return { pass: state.domCount >= minItems && state.hasContent, ...state };
}

export async function checkNoClipping(session) {
  const clipped = await session.clipped();
  if (clipped.length > 0) {
    console.log(`  ${clipped.length} clipped items`);
    for (const c of clipped.slice(0, 5)) {
      console.log(`    [${c.idx}] h=${c.styleH} offset=${c.offsetH} scroll=${c.scrollH}`);
    }
  }
  return { pass: clipped.length === 0, clippedCount: clipped.length };
}

// =============================================================================
// Scroll checks
// =============================================================================

export async function checkScrollable(session) {
  const state = await session.scrollState();
  if (!state) return { pass: false, error: "no viewport" };
  const scrollable = state.maxScrollTop > 0 || state.maxScrollLeft > 0;
  console.log(`  scrollable=${scrollable}  maxScroll=${state.maxScrollTop || state.maxScrollLeft}`);
  return { pass: scrollable, ...state };
}

export async function checkScrollTo(session, target, expectedResult) {
  await session.scrollTo(target);
  const state = await session.scrollState();
  if (!state) return { pass: false, error: "no viewport" };
  const pass = typeof expectedResult === "function"
    ? expectedResult(state)
    : state.scrollTop > 0 || state.scrollLeft > 0;
  return { pass, ...state };
}

// =============================================================================
// Performance — blank frame detection
// =============================================================================

/**
 * Scroll rapidly and count frames where visible items < threshold.
 * Returns { pass, blankFrames, totalFrames, blankRatio }.
 */
export async function checkNoBlankFrames(session, opts = {}) {
  const {
    scrollDelta = 800,
    frames = 30,
    minVisible = 3,
    interval = 16,
  } = opts;

  const result = await session.evaluate(
    (params) => {
      return new Promise((resolve) => {
        const vp = document.querySelector(".vlist-viewport");
        const items = document.querySelector(".vlist-items") || document.querySelector(".vlist-content");
        if (!vp || !items) return resolve({ error: "no viewport/items" });

        const useWheel = getComputedStyle(vp).overflow === "hidden"
          || getComputedStyle(vp).overflowY === "hidden";

        let blankFrames = 0;
        let totalFrames = 0;
        let framesDone = 0;

        const tick = () => {
          if (useWheel) {
            vp.dispatchEvent(new WheelEvent("wheel", {
              deltaY: params.scrollDelta,
              bubbles: true,
              cancelable: true,
            }));
          } else {
            vp.scrollTop += params.scrollDelta;
          }

          requestAnimationFrame(() => {
            totalFrames++;
            const vpRect = vp.getBoundingClientRect();
            const children = items.children;
            let visible = 0;
            for (let i = 0; i < children.length; i++) {
              const r = children[i].getBoundingClientRect();
              if (r.bottom > vpRect.top && r.top < vpRect.bottom) visible++;
            }
            if (visible < params.minVisible) blankFrames++;

            framesDone++;
            if (framesDone < params.frames) {
              setTimeout(tick, params.interval);
            } else {
              resolve({ blankFrames, totalFrames, blankRatio: blankFrames / totalFrames });
            }
          });
        };

        tick();
      });
    },
    { scrollDelta, frames, minVisible, interval },
  );

  if (result.error) {
    console.log(`  Error: ${result.error}`);
    return { pass: false, ...result };
  }

  console.log(`  blank=${result.blankFrames}/${result.totalFrames} (${(result.blankRatio * 100).toFixed(1)}%)`);
  return { pass: result.blankFrames === 0, ...result };
}

/**
 * Burst scroll — fires many wheel events in rapid succession (like real
 * trackpad input), then samples visibility each rAF. More realistic than
 * the single-event-per-frame approach above.
 */
export async function checkNoBlankFramesBurst(session, opts = {}) {
  const {
    burstSize = 8,
    burstDelta = 120,
    rounds = 20,
    minVisible = 3,
  } = opts;

  const result = await session.evaluate(
    (params) => {
      return new Promise((resolve) => {
        const vp = document.querySelector(".vlist-viewport");
        const items = document.querySelector(".vlist-items") || document.querySelector(".vlist-content");
        if (!vp || !items) return resolve({ error: "no viewport/items" });

        const useWheel = getComputedStyle(vp).overflow === "hidden"
          || getComputedStyle(vp).overflowY === "hidden";

        let blankFrames = 0;
        let totalFrames = 0;
        let round = 0;

        const burst = () => {
          for (let i = 0; i < params.burstSize; i++) {
            if (useWheel) {
              vp.dispatchEvent(new WheelEvent("wheel", {
                deltaY: params.burstDelta,
                bubbles: true,
                cancelable: true,
              }));
            } else {
              vp.scrollTop += params.burstDelta;
            }
          }

          requestAnimationFrame(() => {
            totalFrames++;
            const vpRect = vp.getBoundingClientRect();
            const children = items.children;
            let visible = 0;
            for (let i = 0; i < children.length; i++) {
              const r = children[i].getBoundingClientRect();
              if (r.bottom > vpRect.top && r.top < vpRect.bottom) visible++;
            }
            if (visible < params.minVisible) blankFrames++;

            round++;
            if (round < params.rounds) {
              setTimeout(burst, 0);
            } else {
              resolve({ blankFrames, totalFrames, blankRatio: blankFrames / totalFrames });
            }
          });
        };

        burst();
      });
    },
    { burstSize, burstDelta, rounds, minVisible },
  );

  if (result.error) {
    console.log(`  Error: ${result.error}`);
    return { pass: false, ...result };
  }

  console.log(`  blank=${result.blankFrames}/${result.totalFrames} (${(result.blankRatio * 100).toFixed(1)}%) [burst ${burstSize}x${burstDelta}px]`);
  return { pass: result.blankFrames === 0, ...result };
}

// =============================================================================
// Selection checks
// =============================================================================

export async function checkSelection(session) {
  const sel = await session.evaluate(() => {
    const content = document.querySelector(".vlist-content");
    if (!content) return { selected: [], focused: null };
    const selected = [];
    for (const el of content.children) {
      if (el.getAttribute("aria-selected") === "true" || el.classList.contains("vlist-item--selected")) {
        selected.push({ idx: el.dataset.index, id: el.dataset.id });
      }
    }
    const focused = document.activeElement;
    const focusInfo = focused?.dataset?.id
      ? { id: focused.dataset.id, idx: focused.dataset.index }
      : { tag: focused?.tagName };
    return { selected, focused: focusInfo };
  });
  return sel;
}

// =============================================================================
// Timing utility
// =============================================================================

export function timer() {
  const start = performance.now();
  return {
    elapsed() { return Math.round(performance.now() - start); },
    log(label) { console.log(`  ${label}: ${this.elapsed()}ms`); },
  };
}
