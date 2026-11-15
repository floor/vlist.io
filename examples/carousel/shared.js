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
// A slide's picture comes from picsum.photos. When the host accepts the
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

// Pictures this module has armed, by element, so a recycled or removed picture
// is stopped instead of firing a swap at whatever it shows next.
const watched = new WeakMap();

/**
 * Watch one picture: swap it for `fallbackUrl` once when it errors, or when it
 * is still pending after `timeoutMs`. Returns a handle whose `stop()` clears
 * the timer, the listeners and any IntersectionObserver.
 *
 * Safe to call again on a recycled element — the previous watch is stopped and
 * the new picture gets its own clock.
 */
export function watchPhoto(img, fallbackUrl, timeoutMs = PHOTO_TIMEOUT_MS) {
  watched.get(img)?.stop();

  const state = { timer: null, observer: null, stopped: false };

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

  function swap() {
    if (state.stopped) return;
    stop();
    // The picture was recycled away from us, already shows the fallback (an
    // inline onerror got there first), or was swapped once already.
    if (!img.isConnected) return;
    if (img.getAttribute("src") === fallbackUrl || img.dataset.fallback) return;
    img.dataset.fallback = "1";
    // The templates' inline onerror, where one is still there, must not race a
    // second swap on the request this one discards.
    img.onerror = null;
    img.src = fallbackUrl;
  }

  function arm() {
    if (state.stopped || state.timer !== null) return;
    state.timer = setTimeout(swap, timeoutMs);
  }

  function onLoad() {
    stop();
  }

  function onError() {
    swap();
  }

  const handle = { stop };

  img.addEventListener("load", onLoad);
  img.addEventListener("error", onError);

  if (img.complete) {
    // Settled before we got here: a cached picture needs no clock, a broken one
    // (no pixels, its error already fired) needs the fallback now.
    if (img.naturalWidth === 0) swap();
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
    const fallbackUrl = img.getAttribute(FALLBACK_ATTR);
    if (!fallbackUrl) return;
    armed.get(img)?.stop();
    armed.delete(img);
    if (img.getAttribute("src") === fallbackUrl) return;
    armed.set(img, watchPhoto(img, fallbackUrl, timeoutMs));
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

  return () => {
    observer.disconnect();
    for (const handle of armed.values()) handle.stop();
    armed.clear();
  };
}
