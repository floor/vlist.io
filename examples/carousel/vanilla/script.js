// Carousel — MD3-aligned photo carousel using the carousel() plugin
// Demonstrates infinite loop, snap-to-item, variant layouts, and real photos

import { createVList, carousel, rebuild, registerPreset, full } from "vlist";
import { getItems, getImageUrl, getItemWidth, preloadImages } from "../shared.js";
import { createStats } from "../../stats.js";
import { createInfoUpdater } from "../../info.js";

registerPreset("full-h", full);

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

// =============================================================================
// State
// =============================================================================

let currentVariant = "hero";
let snapEnabled = false;
let currentIndex = 0;
let list = null;
let imagesPreloaded = false;
let items = getItems(currentVariant);
let viewVersion = 0;

// =============================================================================
// DOM references
// =============================================================================

const listContainerEl = document.getElementById("list-container");
const dotsEl = document.getElementById("carousel-dots");
const detailEl = document.getElementById("photo-detail");
const infoVariantEl = document.getElementById("info-variant");
const infoStepEl = document.getElementById("info-step");

// =============================================================================
// Template
// =============================================================================

const ITEM_HEIGHT = 480;
const ITEM_WIDTH = 720;

function isVertical() {
  return currentVariant === "full";
}

function isFull() {
  return currentVariant === "full" || currentVariant === "full-h";
}

function itemTemplate(item) {
  const isH = !isVertical();
  const isMultiAspect = currentVariant === "multi-aspect";
  const pw = item.w ?? 1;
  const ph = item.h ?? 1;
  let imgW, imgH;
  if (isMultiAspect) {
    const scale = 600 / Math.max(pw, ph);
    imgW = Math.round(pw * scale);
    imgH = Math.round(ph * scale);
  } else {
    imgW = isH ? 800 : 600;
    imgH = isH ? 500 : 800;
  }
  const url = getImageUrl(item.picId, imgW, imgH);

  if (imagesPreloaded) {
    return `
      <div class="photo-slide">
        <img
          class="photo-slide__img photo-slide__img--loaded"
          src="${url}"
          alt="${esc(item.title)}"
          decoding="sync"
        />
        <div class="photo-slide__overlay">
          <span class="photo-slide__title">${esc(item.title)}</span>
          <span class="photo-slide__location">${esc(item.location)}</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="photo-slide">
      <img
        class="photo-slide__img"
        src="${url}"
        alt="${esc(item.title)}"
        decoding="async"
        data-t="${performance.now()}"
        onload="if(performance.now()-this.dataset.t<100){this.style.transition='none';this.offsetHeight}this.classList.add('photo-slide__img--loaded')"
        onerror="this.style.transition='none';this.classList.add('photo-slide__img--loaded')"
      />
      <div class="photo-slide__overlay">
        <span class="photo-slide__title">${esc(item.title)}</span>
        <span class="photo-slide__location">${esc(item.location)}</span>
      </div>
    </div>
  `;
}

// =============================================================================
// Stats
// =============================================================================

const stats = createStats({
  getScrollPosition: () => list?.getScrollPosition() ?? 0,
  getTotal: () => items.length,
  getItemSize: () => isVertical() ? ITEM_HEIGHT : ITEM_WIDTH,
  getContainerSize: () => {
    const el = document.querySelector("#list-container");
    return isVertical() ? (el?.clientHeight ?? 0) : (el?.clientWidth ?? 0);
  },
});

const updateInfo = createInfoUpdater(stats);

// =============================================================================
// Dots
// =============================================================================

function updateDots() {
  dotsEl.innerHTML = items
    .map(
      (_, i) =>
        `<span class="carousel-dot ${i === currentIndex ? "carousel-dot--active" : ""}" data-index="${i}"></span>`,
    )
    .join("");
}

dotsEl.addEventListener("click", (e) => {
  const dots = dotsEl.querySelectorAll(".carousel-dot");
  if (!dots.length) return;
  const x = e.clientX;
  let closest = 0;
  let minDist = Infinity;
  dots.forEach((dot, i) => {
    const rect = dot.getBoundingClientRect();
    const dist = Math.abs(x - (rect.left + rect.width / 2));
    if (dist < minDist) { minDist = dist; closest = i; }
  });
  currentIndex = closest;
  list?.goTo(closest, { behavior: "smooth", duration: 400 });
  updateDots();
  updateDetail();
  updateStep();
});

// =============================================================================
// Detail panel
// =============================================================================

function updateDetail() {
  const item = items[currentIndex];
  if (!item || !detailEl) return;
  const pw = item.w ?? 300;
  const ph = item.h ?? 300;
  const scale = 300 / Math.max(pw, ph);
  const url = getImageUrl(item.picId, Math.round(pw * scale), Math.round(ph * scale));
  detailEl.innerHTML = `
    <div class="photo-detail">
      <div class="photo-detail__frame">
        <img class="photo-detail__img" src="${url}" alt="${esc(item.title)}" />
      </div>
      <div class="photo-detail__meta">
        <strong>${esc(item.title)}</strong>
        <span>${esc(item.location)} · #${item.id}</span>
      </div>
    </div>
  `;
}

function updateStep() {
  if (infoStepEl)
    infoStepEl.textContent = `${currentIndex + 1} / ${items.length}`;
}

// =============================================================================
// Factory + rebuild
// =============================================================================

function factory() {
  const isH = !isVertical();
  const isMultiAspect = currentVariant === "multi-aspect";
  const containerH = listContainerEl.clientHeight || ITEM_HEIGHT;
  const itemWidth = isH
    ? isMultiAspect
      ? (index) => getItemWidth(index, containerH, currentVariant)
      : ITEM_WIDTH
    : undefined;

  return createVList(
    {
      container: "#list-container",
      orientation: isH ? "horizontal" : "vertical",
      scroll: { scrollbar: "none" },
      ariaLabel: "Photo carousel",
      item: {
        height: isMultiAspect ? containerH : ITEM_HEIGHT,
        width: itemWidth,
        template: itemTemplate,
      },
      items,
    },
    [
      carousel({
        variant: currentVariant,
        snap: snapEnabled,
        snapDuration: 400,
        initialIndex: currentIndex,
        gap: 8,
      }),
    ],
  );
}

function onReady(l) {
  l.on("scroll", updateInfo);
  l.on("range:change", updateInfo);
  l.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });
  l.on("carousel:change", ({ index }) => {
    currentIndex = index;
    updateDots();
    updateDetail();
    updateStep();
  });

  updateInfo();
  updateDots();
  updateDetail();
  updateStep();
  if (infoVariantEl) infoVariantEl.textContent = currentVariant;
}

async function createList() {
  items = getItems(currentVariant);
  imagesPreloaded = false;

  const wrap = document.querySelector(".carousel-wrap");
  wrap.classList.toggle("carousel-wrap--vertical", isVertical());

  const version = ++viewVersion;
  const newList = await rebuild(list, factory, {
    key: "carousel",
    transition: { fadeIn: 160, fadeOut: 120, fadeOutDelay: 40 },
  });
  if (version !== viewVersion) {
    newList.destroy();
    return;
  }
  list = newList;
  onReady(list);

  const isH = !isVertical();
  const preloadW = isH ? 800 : 600;
  const preloadH = isH ? 500 : 800;
  preloadImages(currentVariant, preloadW, preloadH).then(() => {
    imagesPreloaded = true;
    listContainerEl
      .querySelectorAll(".photo-slide__img:not(.photo-slide__img--loaded)")
      .forEach((img) => {
        img.style.transition = "none";
        img.classList.add("photo-slide__img--loaded");
      });
  });
}

// =============================================================================
// Prev / Next buttons
// =============================================================================

document.getElementById("btn-prev").addEventListener("click", () => {
  list?.prev(1, { behavior: "smooth", duration: 400 });
});

document.getElementById("btn-next").addEventListener("click", () => {
  list?.next(1, { behavior: "smooth", duration: 400 });
});

// =============================================================================
// Variant buttons
// =============================================================================

document.getElementById("variant-buttons").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-variant]");
  if (!btn) return;
  const variant = btn.dataset.variant;
  if (variant === currentVariant) return;

  currentVariant = variant;
  document.querySelectorAll("#variant-buttons .ui-ctrl-btn").forEach((b) => {
    b.classList.toggle("ui-ctrl-btn--active", b.dataset.variant === variant);
  });

  createList();
});

// =============================================================================
// Snap toggle
// =============================================================================

document.getElementById("toggle-snap").addEventListener("change", (e) => {
  snapEnabled = e.target.checked;
  createList();
});

// =============================================================================
// Init
// =============================================================================

createList();
