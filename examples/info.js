// examples/info.js
// Stateless DOM writer for the standard example info bar.
// Reads a stats state object and writes to the info elements by ID.
// Also provides a RAF-batched render helper for convenient event wiring.
//
// Usage:
//   import { createStats } from '../stats.js'
//   import { renderInfo, createInfoUpdater } from '../info.js'
//
//   // Option A: manual rendering
//   renderInfo(stats.getState())
//
//   // Option B: RAF-batched updater (most common)
//   const updateInfo = createInfoUpdater(stats)
//   list.on('scroll', updateInfo)
//   list.on('range:change', updateInfo)
//   list.on('velocity:change', ({ velocity }) => { stats.onVelocity(velocity); updateInfo() })
//   updateInfo() // initial render

/**
 * Write a stats state object to the standard info bar elements.
 * Looks up elements by ID on each call — safe to call before or after
 * the info bar is in the DOM.
 *
 * @param {{ progress: number, velocity: number, velocityAvg: number, itemCount: number, total: number }} state
 */
export function renderInfo(state) {
  const infoProgress = document.getElementById("info-progress");
  const infoVelocity = document.getElementById("info-velocity");
  const infoVelocityAvg = document.getElementById("info-velocity-avg");
  const infoDom = document.getElementById("info-dom");
  const infoTotal = document.getElementById("info-total");

  if (infoProgress) infoProgress.textContent = state.progress.toFixed(0) + "%";
  if (infoVelocity) infoVelocity.textContent = state.velocity.toFixed(2);
  if (infoVelocityAvg) infoVelocityAvg.textContent = state.velocityAvg.toFixed(2);
  if (infoDom) infoDom.textContent = state.itemCount.toLocaleString();
  if (infoTotal) infoTotal.textContent = state.total.toLocaleString();
}

/**
 * Create a RAF-batched info bar updater bound to a stats instance.
 * Returns a function that can be called from any event — multiple calls
 * within the same frame are coalesced into a single render.
 *
 * @param {{ getState: () => object }} stats — a createStats instance
 * @returns {() => void} scheduleRender
 */
export function createInfoUpdater(stats) {
  let raf = null;

  function render() {
    raf = null;
    renderInfo(stats.getState());
  }

  return function scheduleRender() {
    if (!raf) raf = requestAnimationFrame(render);
  };
}
