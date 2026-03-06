// examples/stats.js
// Shared footer stats module — universal left-side footer for all examples.
// Handles velocity tracking (current + running average), progress %,
// cumulative item count, and RAF-batched DOM updates.
//
// Usage:
//   import { createStats } from '../stats.js'
//
//   const stats = createStats({ getList, getTotal, getItemHeight, container: '#list-container' })
//   list.on('scroll', stats.scheduleUpdate)
//   list.on('range:change', ({ range }) => stats.onRange(range))
//   list.on('velocity:change', ({ velocity }) => stats.onVelocity(velocity))
//
//   // After rebuilding the list:
//   stats.update()

// =============================================================================
// Velocity — current + running average (filtered 0.1–50 px/ms)
// =============================================================================

const MAX_VELOCITY = 50;
const MIN_VELOCITY = 0.1;

// Browser pixel limit — must match vlist's MAX_VIRTUAL_SIZE
const MAX_VIRTUAL_SIZE = 16_000_000;

/**
 * Create the stats tracker for one example.
 *
 * @param {object} opts
 * @param {() => object|null} opts.getList      — returns current vlist instance (may change on recreate)
 * @param {() => number}      opts.getTotal     — returns current total item count
 * @param {() => number}      opts.getItemHeight — returns item height (fixed) or estimated height
 * @param {string}            opts.container    — selector for the list container (e.g. '#list-container')
 * @returns {object} stats API
 */
export function createStats({
  getList,
  getTotal,
  getItemHeight,
  container: containerSelector,
}) {
  // DOM references (footer left side — universal)
  const ftProgress = document.getElementById("ft-progress");
  const ftVelocity = document.getElementById("ft-velocity");
  const ftVelocityAvg = document.getElementById("ft-velocity-avg");
  const ftDom = document.getElementById("ft-dom");
  const ftTotal = document.getElementById("ft-total");

  // Velocity state
  let currentVelocity = 0;
  let velocitySum = 0;
  let velocityCount = 0;

  // RAF batching
  let raf = null;

  function getVelocityAverage() {
    return velocityCount > 0 ? velocitySum / velocityCount : 0;
  }

  function onVelocity(velocity) {
    currentVelocity = velocity;
    if (velocity > MIN_VELOCITY && velocity < MAX_VELOCITY) {
      velocitySum += velocity;
      velocityCount++;
    }
    scheduleUpdate();
  }

  function onRange() {
    scheduleUpdate();
  }

  function scheduleUpdate() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      update();
    });
  }

  /**
   * Compute cumulative item count from scroll position geometrically.
   *
   * scrollPosition is the DOM scrollTop — in compressed/scaled mode this is
   * the virtual (compressed) scroll position. We map it back to real item
   * indices using the same linear mapping vlist uses internally:
   *
   *   totalActualSize = total * itemHeight
   *   totalVirtualSize = min(totalActualSize, MAX_VIRTUAL_SIZE)
   *   maxVirtualScroll = totalVirtualSize - containerHeight
   *   maxActualScroll = totalActualSize - containerHeight
   *   ratio = maxActualScroll / maxVirtualScroll
   *   actualOffset = scrollPosition * ratio
   *   lastVisibleItem = ceil((actualOffset + containerHeight) / itemHeight)
   *
   *   Using scroll-range ratio (not size ratio) ensures that at max scroll
   *   the bottom of the viewport aligns exactly with the last item.
   */
  function getItemCount() {
    const total = getTotal();
    if (total === 0) return 0;

    const itemHeight = getItemHeight();
    if (itemHeight <= 0) return 0;

    const el = containerSelector
      ? document.querySelector(containerSelector)
      : null;
    const containerHeight = el ? el.clientHeight : 0;
    if (containerHeight <= 0) return 0;

    const list = getList();
    const scrollPosition =
      list && list.getScrollPosition ? list.getScrollPosition() : 0;

    // Map virtual scroll position back to actual content offset.
    // Use scroll-range ratio so maxScroll maps exactly to the last item.
    const totalActualSize = total * itemHeight;
    const totalVirtualSize = Math.min(totalActualSize, MAX_VIRTUAL_SIZE);
    const maxVirtualScroll = totalVirtualSize - containerHeight;
    const maxActualScroll = totalActualSize - containerHeight;
    const ratio = maxVirtualScroll > 0 ? maxActualScroll / maxVirtualScroll : 1;
    const actualOffset = scrollPosition * ratio;

    const lastVisible = Math.ceil(
      (actualOffset + containerHeight) / itemHeight,
    );
    return Math.min(lastVisible, total);
  }

  function update() {
    const total = getTotal();
    const itemCount = getItemCount();

    // Progress: cumulative items as 0–100% of total items
    const progress =
      total > 0 ? Math.min(100, Math.max(0, (itemCount / total) * 100)) : 0;

    if (ftProgress) ftProgress.textContent = progress.toFixed(0) + "%";
    if (ftVelocity) ftVelocity.textContent = currentVelocity.toFixed(2);
    if (ftVelocityAvg)
      ftVelocityAvg.textContent = getVelocityAverage().toFixed(2);
    if (ftDom) ftDom.textContent = itemCount.toLocaleString();
    if (ftTotal) ftTotal.textContent = total.toLocaleString();
  }

  return {
    update,
    scheduleUpdate,
    onVelocity,
    onRange,
  };
}
