// Photo Album — Shared data, constants, template, and state
// Imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const PHOTO_COUNT = 1084;
export const ITEM_COUNT = 600;
export const ASPECT_RATIO = 0.75; // 4:3 landscape

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
// Data
// =============================================================================

export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = CATEGORIES[i % CATEGORIES.length];
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.abs(Math.sin(i * 2.1)) * 500),
    picId,
    aspectRatio: ASPECT_RATIOS[i % ASPECT_RATIOS.length],
  };
});

// =============================================================================
// Template
// =============================================================================

export const itemTemplate = (item) => `
  <div class="card">
    <img
      class="card__img"
      src="https://picsum.photos/id/${item.picId}/300/225"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
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
export function setList(v) {
  list = v;
}

// =============================================================================
// View lifecycle — set by each variant's script.js
// =============================================================================

let _createView = () => {};

export function createView() {
  _createView();
}

export function setCreateView(fn) {
  _createView = fn;
}
