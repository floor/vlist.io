// Carousel — Shared data re-exported from curated carousel data
// Each variant uses unique photos with hand-written descriptions

export {
  getItems,
  getItemCount,
  getItemWidth,
  getImageUrl,
  preloadImages,
} from "../../src/data/carousel.js";

// =============================================================================
// Photo load timeout
// =============================================================================
//
// A slide's picture comes from the self-hosted set, or from picsum when that file is missing. When the host accepts the
// connection and never answers, neither `load` nor `error` fires, so the
// once-only onerror swap the templates carry never runs and the slide stays
// blank. Watch each picture and swap a still-pending one for its committed
// SVG after PHOTO_TIMEOUT_MS; the swap discards the pending request.
//
// The photo-album example carries the same helper in its own shared.js — each
// example is meant to be read on its own. test/scripts/photo-load.test.ts runs
// one suite against both copies, so they cannot drift apart unnoticed.

export const PHOTO_TIMEOUT_MS = 4000;

const FALLBACK_ATTR = "data-photo-fallback";
const SVG_ATTR = "data-photo-svg";

// Pictures this module has armed, by element, so a recycled or removed picture
// is stopped instead of firing a swap at whatever it shows next.
const watched = new WeakMap();

/**
 * Watch one picture: when it errors, or when it is still pending after
 * `timeoutMs`, move it to the next URL in `fallbacks` — a single URL or a list,
 * the chain a page keeps: the self-hosted file, then picsum, then the photo's
 * committed SVG. Each step gets its own clock; reaching the end stops the watch.
 * Returns a handle whose `stop()` clears the timer, the listeners and any
 * IntersectionObserver.
 *
 * Safe to call again on a recycled element — the previous watch is stopped and
 * the new picture gets its own clock.
 */
export function watchPhoto(img, fallbacks, timeoutMs = PHOTO_TIMEOUT_MS) {
  watched.get(img)?.stop();

  const steps = (Array.isArray(fallbacks) ? fallbacks : [fallbacks]).filter(
    Boolean,
  );

  // An element is reused for the next picture (a pooled item, or a detail panel
  // that keeps its <img>): a src that is none of the fallbacks means a new
  // photo, so the marker from the picture before must not block its swap.
  if (!steps.includes(img.getAttribute("src"))) delete img.dataset.fallback;

  const state = { timer: null, observer: null, stopped: false, step: 0 };

  function stop() {
    if (state.stopped) return;
    state.stopped = true;
    if (state.timer !== null) clearTimeout(state.timer);
    state.timer = null;
    state.observer?.disconnect();
    state.observer = null;
    img.removeEventListener("load", onLoad);
    img.removeEventListener("error", onError);
    if (watched.get(img) === handle) watched.delete(img);
  }

  function advance() {
    if (state.stopped) return;
    if (!img.isConnected) {
      // Recycled away from us: never swap whatever it shows now.
      stop();
      return;
    }
    const current = img.getAttribute("src");
    while (state.step < steps.length && steps[state.step] === current) {
      state.step++;
    }
    if (state.step >= steps.length) {
      stop();
      return;
    }
    img.dataset.fallback = "1";
    // A template's inline onerror, where a page still carries one, must not
    // race the step this watch takes.
    img.onerror = null;
    img.src = steps[state.step++];
    // The next request is a new one: it gets its own clock.
    arm();
  }

  function arm() {
    if (state.stopped || state.timer !== null) return;
    state.timer = setTimeout(() => {
      state.timer = null;
      advance();
    }, timeoutMs);
  }

  function onLoad() {
    stop();
  }

  function onError() {
    advance();
  }

  const handle = { stop };

  img.addEventListener("load", onLoad);
  img.addEventListener("error", onError);

  if (img.complete) {
    // Settled before we got here: a cached picture needs no clock, a broken one
    // (no pixels, its error already fired) moves on now.
    if (img.naturalWidth === 0) advance();
    else stop();
    return handle;
  }

  if (img.loading === "lazy" && typeof IntersectionObserver === "function") {
    // A lazy picture the browser has not asked for yet is not pending; timing
    // it out now would flash the fallback on cards far below the fold. Start
    // the clock when the picture comes near the viewport instead.
    state.observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        state.observer?.disconnect();
        state.observer = null;
        arm();
      },
      { rootMargin: "200px" },
    );
    state.observer.observe(img);
  } else {
    arm();
  }

  watched.set(img, handle);
  return handle;
}

/**
 * Arm every picture under `root` that carries data-photo-fallback, including
 * the ones vlist renders later and the ones it recycles — a pooled item's
 * innerHTML is replaced, so its old timer is stopped and its new picture armed.
 * Returns a function that disconnects the observer and stops every watch.
 */
export function watchPhotosIn(root, timeoutMs = PHOTO_TIMEOUT_MS) {
  if (!root) return () => {};

  const armed = new Map();

  function armImage(img) {
    // A card names the chain in two attributes: picsum, then the SVG. An image
    // already showing one of its fallbacks is either mid-chain (its own watch
    // is running) or done — never re-armed over.
    const steps = [
      img.getAttribute(FALLBACK_ATTR),
      img.getAttribute(SVG_ATTR),
    ].filter(Boolean);
    if (steps.length === 0) return;
    if (steps.includes(img.getAttribute("src"))) return;
    armed.get(img)?.stop();
    armed.delete(img);
    armed.set(img, watchPhoto(img, steps, timeoutMs));
  }

  function stopImage(img) {
    armed.get(img)?.stop();
    armed.delete(img);
  }

  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.matches(`img[${FALLBACK_ATTR}]`)) armImage(node);
    for (const img of node.querySelectorAll(`img[${FALLBACK_ATTR}]`)) {
      armImage(img);
    }
  }

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === "attributes") {
        armImage(record.target);
        continue;
      }
      for (const node of record.addedNodes) scan(node);
      for (const node of record.removedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(`img[${FALLBACK_ATTR}]`)) stopImage(node);
        for (const img of node.querySelectorAll?.(`img[${FALLBACK_ATTR}]`) ??
          []) {
          stopImage(img);
        }
      }
    }
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"],
  });

  // The container can already hold pictures when this is called: a framework
  // variant creates its list in an effect that runs before its own watch, so
  // the initial cards are armed here, not only the ones the observer sees.
  scan(root);

  return () => {
    observer.disconnect();
    for (const handle of armed.values()) handle.stop();
    armed.clear();
  };
}
