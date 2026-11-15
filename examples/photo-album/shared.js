// Photo Album — Shared data, constants, template, and state
// Imported by all framework implementations to avoid duplication

import { rebuild } from "vlist";

// =============================================================================
// Constants
// =============================================================================

export const ITEM_COUNT = 900;
export let ASPECT_RATIO = 0.75; // 4:3 landscape

const CATEGORIES = [
  "Nature",
  "Urban",
  "Portrait",
  "Abstract",
  "Travel",
  "Food",
  "Animals",
  "Architecture",
  "Art",
  "Space",
];

// Variable aspect ratios for masonry mode (height/width)
const ASPECT_RATIOS = [0.75, 1.0, 1.33, 1.5, 0.66];

// =============================================================================
// Valid Picsum IDs — excludes first 8 and all known 404s
// =============================================================================

const DEAD_IDS = new Set([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 86, 97, 105, 138, 148, 150, 205,
  207, 224, 226, 245, 246, 262, 285, 286, 298, 303, 332, 333, 346, 359, 394,
  414, 422, 438, 462, 463, 470, 489, 540, 561, 578, 587, 589, 592, 595, 597,
  601, 624, 632, 636, 644, 647, 673, 697, 706, 707, 708, 709, 710, 711, 712,
  713, 714, 720, 725, 734, 745, 746, 747, 748, 749, 750, 751, 752, 753, 754,
  759, 761, 762, 763, 771, 792, 801, 812, 843, 850, 854, 895, 897, 899, 917,
  920, 934, 956, 963, 968, 1007, 1017, 1030, 1034, 1046,
]);

const VALID_IDS = [];
for (let id = 0; id <= 1084; id++) {
  if (!DEAD_IDS.has(id)) VALID_IDS.push(id);
}

// =============================================================================
// Data
// =============================================================================

const BASE_DATE = new Date(2026, 4, 31).getTime(); // May 31, 2026
const DAY_MS = 86_400_000;

export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = VALID_IDS[i % VALID_IDS.length];
  const category = CATEGORIES[i % CATEGORIES.length];
  const date = new Date(BASE_DATE - i * DAY_MS);
  const month = date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    date,
    month,
    likes: Math.floor(Math.abs(Math.sin(i * 2.1)) * 500),
    picId,
    aspectRatio: ASPECT_RATIOS[i % ASPECT_RATIOS.length],
  };
});

// =============================================================================
// Template
// =============================================================================

// The cards' pictures come from picsum.photos. When one fails to load — the
// host is down, or the browser test harness blocks it — the handler swaps the
// src once for the committed placeholder in examples/photo-album/images/ and
// removes itself, so a missing placeholder cannot loop. data-photo-fallback
// names that file to watchPhotosIn, which also swaps a picture that stays
// pending without ever firing load or error (see the section at the bottom).
export const itemTemplate = (item) => `
  <div class="card">
    <img
      class="card__img"
      src="https://picsum.photos/id/${item.picId}/300/225"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
      data-photo-fallback="/examples/photo-album/images/${item.picId}.svg"
      data-t="${performance.now()}"
      onload="if(performance.now()-this.dataset.t<100){this.style.transition='none';this.offsetHeight}this.classList.add('card__img--loaded')"
      onerror="this.onerror=null;this.src='/examples/photo-album/images/${item.picId}.svg';this.style.transition='none';this.classList.add('card__img--loaded')"
    />
    <div class="card__overlay">
      <span class="card__title">${item.title}</span>
      <span class="card__category">${item.category}</span>
    </div>
    <div class="card__likes">♥ ${item.likes}</div>
  </div>
`;

// =============================================================================
// State — mutable, shared across script.js and controls.js
// =============================================================================

export let currentMode = "grid";
export let currentOrientation = "vertical";
export let currentColumns = 4;
export let currentGap = 8;
export let currentRadius = 8;
export let followFocus = true;
export let useGroups = false;
export let list = null;

export function setCurrentMode(v) {
  currentMode = v;
}
export function setCurrentOrientation(v) {
  currentOrientation = v;
}
export function setCurrentColumns(v) {
  currentColumns = v;
}
export function setCurrentGap(v) {
  currentGap = v;
}
export function setCurrentRadius(v) {
  currentRadius = v;
}
export function setFollowFocus(v) {
  followFocus = v;
}
export function setUseGroups(v) {
  useGroups = v;
}
export function setAspectRatio(v) {
  ASPECT_RATIO = v;
}
export function setList(v) {
  list = v;
}

// =============================================================================
// View lifecycle
// =============================================================================

let _factory = null;
let _rebuildOptions = {};
let _readyCallbacks = [];
let _createViewFn = null;
let _viewVersion = 0;

export function setFactory(fn, options) {
  _factory = fn;
  _rebuildOptions = options || {};
  // The shell's native/synthetic switch calls this so the album rebuilds with
  // fresh plugins and its own snapshot, instead of reusing the live grid. Only
  // a variant that registers a factory (vanilla) can rebuild this way; the
  // framework variants import this file for its data and take the switch's
  // own rebuild (vlist.io#91).
  globalThis.__vlistRecreate = () => createView();
}

export function onReady(fn) {
  _readyCallbacks.push(fn);
}

export function setCreateView(fn) {
  _createViewFn = fn;
}

export async function createView() {
  if (_factory) {
    const version = ++_viewVersion;
    const newList = await rebuild(list, _factory, _rebuildOptions);
    if (version !== _viewVersion) {
      newList.destroy();
      return;
    }
    list = newList;
    for (const fn of _readyCallbacks) fn(list);
  } else if (_createViewFn) {
    _createViewFn();
  }
}

// =============================================================================
// Photo load timeout
// =============================================================================
//
// A card's picture comes from picsum.photos. When the host accepts the
// connection and never answers, neither `load` nor `error` fires, so the
// once-only onerror swap the template carries never runs and the card stays
// blank. Watch each picture and swap a still-pending one for its committed SVG
// after PHOTO_TIMEOUT_MS; the swap discards the pending request.
//
// The carousel example carries the same helper in its own shared.js — each
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
