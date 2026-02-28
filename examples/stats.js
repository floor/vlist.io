// examples/stats.js
// Shared footer stats module — universal left-side footer for all examples.
// Handles velocity tracking (current + running average), progress %,
// visible item count, and RAF-batched DOM updates.
//
// Usage:
//   import { createStats } from '../stats.js'
//
//   const stats = createStats({ list, getTotal, getItemHeight, container: '#list-container' })
//   list.on('scroll', stats.scheduleUpdate)
//   list.on('range:change', stats.scheduleUpdate)
//   list.on('velocity:change', ({ velocity }) => stats.onVelocity(velocity))
//
//   // After rebuilding the list:
//   stats.setList(newList)
//   stats.update()

// =============================================================================
// Velocity — current + running average (filtered 0.1–50 px/ms)
// =============================================================================

const MAX_VELOCITY = 50
const MIN_VELOCITY = 0.1

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
export function createStats ({ getList, getTotal, getItemHeight, container }) {
  // DOM references (footer left side — universal)
  const ftProgress = document.getElementById('ft-progress')
  const ftVelocity = document.getElementById('ft-velocity')
  const ftVelocityAvg = document.getElementById('ft-velocity-avg')
  const ftDom = document.getElementById('ft-dom')
  const ftTotal = document.getElementById('ft-total')

  // Velocity state
  let currentVelocity = 0
  let velocitySum = 0
  let velocityCount = 0

  // RAF batching
  let raf = null

  function getVelocityAverage () {
    return velocityCount > 0 ? velocitySum / velocityCount : 0
  }

  function onVelocity (velocity) {
    currentVelocity = velocity
    if (velocity > MIN_VELOCITY && velocity < MAX_VELOCITY) {
      velocitySum += velocity
      velocityCount++
    }
    scheduleUpdate()
  }

  function scheduleUpdate () {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = null
      update()
    })
  }

  function update () {
    const list = getList()
    const total = getTotal()
    const itemHeight = getItemHeight()

    let progress = 0
    let visibleEnd = 0

    if (list) {
      const scrollPos = list.getScrollPosition()
      const viewport = document.querySelector(`${container} .vlist-viewport`)
      const viewportHeight = viewport ? viewport.clientHeight : 0
      const totalHeight = total * itemHeight
      const maxScroll = totalHeight - viewportHeight

      // Progress: scroll position as 0–100%
      if (maxScroll > 0) {
        progress = Math.min(100, Math.max(0, (scrollPos / maxScroll) * 100))
      }

      // Visible end: items above scroll + items in viewport
      const firstVisible = Math.floor(scrollPos / itemHeight)
      const visibleCount = Math.ceil(viewportHeight / itemHeight)
      visibleEnd = Math.min(firstVisible + visibleCount, total)
    }

    if (ftProgress) ftProgress.textContent = progress.toFixed(0) + '%'
    if (ftVelocity) ftVelocity.textContent = currentVelocity.toFixed(2)
    if (ftVelocityAvg) ftVelocityAvg.textContent = getVelocityAverage().toFixed(2)
    if (ftDom) ftDom.textContent = visibleEnd.toLocaleString()
    if (ftTotal) ftTotal.textContent = total.toLocaleString()
  }

  return {
    update,
    scheduleUpdate,
    onVelocity
  }
}
