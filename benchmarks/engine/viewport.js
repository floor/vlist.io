// engine/viewport.js — Shared Viewport Detection
//
// Robust viewport finder that works for vlist, React-based libraries,
// Vue-based libraries, and vanilla JS virtual list implementations.
//
// Uses a multi-strategy approach:
//   1. Check for vlist's known `.vlist-viewport` class
//   2. Depth-first search for elements with scrollable overflow CSS
//   3. Fallback: find deepest element where scrollHeight > clientHeight
//
// This is the single source of truth — used by both suites and comparisons.

// =============================================================================
// Main export
// =============================================================================

/**
 * Find the scrollable viewport element inside a container.
 *
 * Handles vlist (`.vlist-viewport` class), React-based libraries
 * (react-window, TanStack Virtual, Virtua), Vue-based libraries
 * (vue-virtual-scroller), and vanilla JS implementations (Clusterize).
 *
 * @param {HTMLElement} container - The benchmark container element
 * @returns {Element|null} The scrollable viewport, or null if not found
 */
export const findViewport = (container) => {
  if (!container) return null;

  // ── Strategy 1: Known vlist class ────────────────────────────────────
  const vp = container.querySelector(".vlist-viewport");
  if (vp) return vp;

  // ── Strategy 2: CSS overflow detection (depth-first) ─────────────────
  // Firefox can report the `overflow` shorthand differently from Chrome
  // (e.g. "" or "hidden auto") so we check both the shorthand and the
  // per-axis longhand properties.
  const isScrollable = (style) => {
    const vals = ["auto", "scroll"];
    if (vals.includes(style.overflowY)) return true;
    if (vals.includes(style.overflowX)) return true;
    // Shorthand — Chrome returns "auto", Firefox may return "hidden auto"
    const ov = style.overflow;
    if (vals.includes(ov)) return true;
    if (ov && ov.split(" ").some((v) => vals.includes(v))) return true;
    return false;
  };

  const walk = (el) => {
    for (const child of el.children) {
      const style = getComputedStyle(child);
      if (isScrollable(style)) return child;
      const found = walk(child);
      if (found) return found;
    }
    return null;
  };

  const found = walk(container);
  if (found) return found;

  // ── Strategy 3: scrollHeight heuristic ───────────────────────────────
  // Last resort: find the deepest element whose scrollHeight exceeds its
  // clientHeight — the library rendered content but the CSS overflow value
  // wasn't detected (e.g. set via a framework stylesheet Firefox applies
  // differently). This catches react-window, Virtua, etc.
  const walkScrollable = (el) => {
    for (const child of el.children) {
      if (child.scrollHeight > child.clientHeight + 1) {
        // Prefer a deeper match (the actual viewport, not just a wrapper)
        const deeper = walkScrollable(child);
        return deeper || child;
      }
    }
    return null;
  };

  return walkScrollable(container) || container.firstElementChild;
};
