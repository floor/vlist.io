// Photo Album — Shared data, constants, template, and state
// Imported by all framework implementations to avoid duplication

import { rebuild } from "vlist";
import {
  photoUrl,
  photoSrcSet,
  photoPicsumUrl,
} from "../../src/data/photos.js";

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

// A card's picture comes from the self-hosted set (/photos/<id>-300x225.webp),
// with its 2x file in srcset. data-photo-fallback and data-photo-svg name the
// rest of the chain to watchPhotosIn, which walks it when a source is missing,
// errors, or stays pending without ever firing load or error (see the section
// at the bottom).
export const itemTemplate = (item) => {
  const url = photoUrl(item.picId, 300, 225);
  const srcset = photoSrcSet(item.picId, 300, 225);
  const picsum = photoPicsumUrl(item.picId, 300, 225);
  const svg = `/examples/photo-album/images/${item.picId}.svg`;
  return `
  <div class="card">
    <img
      class="card__img"
      src="${url}"
      srcset="${srcset}"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
      data-photo-fallback="${picsum}"
      data-photo-svg="${svg}"
      data-t="${performance.now()}"
      onload="if(performance.now()-this.dataset.t<100){this.style.transition='none';this.offsetHeight}this.classList.add('card__img--loaded')"
    />
    <div class="card__overlay">
      <span class="card__title">${item.title}</span>
      <span class="card__category">${item.category}</span>
    </div>
    <div class="card__likes">♥ ${item.likes}</div>
  </div>
`;
};

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
// A card's picture comes from the self-hosted set, or from picsum when that file is missing. When the host accepts the
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
    // srcset wins over src: while a candidate list is there, the browser keeps
    // asking for the old box instead of the URL this step sets.
    img.removeAttribute?.("srcset");
    img.removeAttribute?.("sizes");
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
