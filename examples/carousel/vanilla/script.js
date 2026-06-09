// Carousel — MD3-aligned photo carousel using the carousel() plugin
// Demonstrates infinite loop, snap-to-item, variant layouts, and real photos

import { createVList, carousel } from "vlist";
import { getItems, getImageUrl, getItemWidth, preloadImages } from "../shared.js";
import { createStats } from "../../stats.js";
import { createInfoUpdater } from "../../info.js";

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

// =============================================================================
// State
// =============================================================================

let currentVariant = "hero";
let currentOrientation = "horizontal";
let snapEnabled = false;
let currentIndex = 0;
let list = null;
let imagesPreloaded = false;
let items = getItems(currentVariant);

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

function itemTemplate(item) {
  const isH = currentOrientation === "horizontal";
  const isMultiAspect = currentVariant === "multi-aspect";
  const itemW = isMultiAspect ? getItemWidth(item.index, ITEM_HEIGHT, currentVariant) : null;
  const imgW = isMultiAspect ? Math.max(itemW, 400) : isH ? 800 : 600;
  const imgH = isH ? 500 : 800;
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
  getItemSize: () =>
    currentOrientation === "horizontal" ? ITEM_WIDTH : ITEM_HEIGHT,
  getContainerSize: () => {
    const el = document.querySelector("#list-container");
    return currentOrientation === "horizontal"
      ? (el?.clientWidth ?? 0)
      : (el?.clientHeight ?? 0);
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
  const dot = e.target.closest(".carousel-dot");
  if (dot) {
    const idx = Number(dot.dataset.index);
    currentIndex = idx;
    list?.goTo(idx, { behavior: "smooth", duration: 400 });
    updateDots();
    updateDetail();
    updateStep();
  }
});

// =============================================================================
// Detail panel
// =============================================================================

function updateDetail() {
  const item = items[currentIndex];
  if (!item || !detailEl) return;
  const url = getImageUrl(item.picId, 400, 260);
  detailEl.innerHTML = `
    <div class="photo-detail">
      <img class="photo-detail__img" src="${url}" alt="${esc(item.title)}" />
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
// Create / Recreate list
// =============================================================================

function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  listContainerEl.innerHTML = "";

  items = getItems(currentVariant);
  imagesPreloaded = false;

  const isH = currentOrientation === "horizontal";
  const wrap = document.querySelector(".carousel-wrap");
  wrap.classList.toggle("carousel-wrap--vertical", !isH);

  const isMultiAspect = currentVariant === "multi-aspect";
  const itemWidth = isH
    ? isMultiAspect
      ? (index) => getItemWidth(index, ITEM_HEIGHT, currentVariant)
      : ITEM_WIDTH
    : undefined;

  list = createVList(
    {
      container: "#list-container",
      orientation: currentOrientation,
      scroll: { scrollbar: "none" },
      ariaLabel: "Photo carousel",
      item: {
        height: ITEM_HEIGHT,
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

  list.on("scroll", updateInfo);
  list.on("range:change", updateInfo);
  list.on("velocity:change", ({ velocity }) => {
    stats.onVelocity(velocity);
    updateInfo();
  });

  list.on("carousel:change", ({ index }) => {
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
// Orientation toggle
// =============================================================================

document.getElementById("orientation-mode").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-orientation]");
  if (!btn) return;
  const orientation = btn.dataset.orientation;
  if (orientation === currentOrientation) return;

  currentOrientation = orientation;
  document
    .querySelectorAll("#orientation-mode .ui-segmented__btn")
    .forEach((b) => {
      b.classList.toggle(
        "ui-segmented__btn--active",
        b.dataset.orientation === orientation,
      );
    });

  createList();
});

// =============================================================================
// Init
// =============================================================================

createList();
