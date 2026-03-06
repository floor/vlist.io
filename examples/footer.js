// examples/footer.js
// Stateless DOM writer for the standard example footer.
// Reads a stats state object and writes to the footer elements by ID.
// Also provides a RAF-batched render helper for convenient event wiring.
//
// Usage:
//   import { createStats } from '../stats.js'
//   import { renderFooter, createFooterUpdater } from '../footer.js'
//
//   // Option A: manual rendering
//   renderFooter(stats.getState())
//
//   // Option B: RAF-batched updater (most common)
//   const updateFooter = createFooterUpdater(stats)
//   list.on('scroll', updateFooter)
//   list.on('range:change', updateFooter)
//   list.on('velocity:change', ({ velocity }) => { stats.onVelocity(velocity); updateFooter() })
//   updateFooter() // initial render

/**
 * Write a stats state object to the standard footer elements.
 * Looks up elements by ID on each call — safe to call before or after
 * the footer is in the DOM.
 *
 * @param {{ progress: number, velocity: number, velocityAvg: number, itemCount: number, total: number }} state
 */
export function renderFooter(state) {
  const ftProgress = document.getElementById("ft-progress");
  const ftVelocity = document.getElementById("ft-velocity");
  const ftVelocityAvg = document.getElementById("ft-velocity-avg");
  const ftDom = document.getElementById("ft-dom");
  const ftTotal = document.getElementById("ft-total");

  if (ftProgress) ftProgress.textContent = state.progress.toFixed(0) + "%";
  if (ftVelocity) ftVelocity.textContent = state.velocity.toFixed(2);
  if (ftVelocityAvg) ftVelocityAvg.textContent = state.velocityAvg.toFixed(2);
  if (ftDom) ftDom.textContent = state.itemCount.toLocaleString();
  if (ftTotal) ftTotal.textContent = state.total.toLocaleString();
}

/**
 * Create a RAF-batched footer updater bound to a stats instance.
 * Returns a function that can be called from any event — multiple calls
 * within the same frame are coalesced into a single render.
 *
 * @param {{ getState: () => object }} stats — a createStats instance
 * @returns {() => void} scheduleRender
 */
export function createFooterUpdater(stats) {
  let raf = null;

  function render() {
    raf = null;
    renderFooter(stats.getState());
  }

  return function scheduleRender() {
    if (!raf) raf = requestAnimationFrame(render);
  };
}
