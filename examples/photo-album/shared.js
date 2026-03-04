// Photo Album — Shared data, constants, template, and state
// Imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const ITEM_COUNT = 900;
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

export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = VALID_IDS[i % VALID_IDS.length];
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
      data-t="${performance.now()}"
      onload="if(performance.now()-this.dataset.t<100){this.style.transition='none';this.offsetHeight}this.classList.add('card__img--loaded')"
      onerror="this.style.transition='none';this.classList.add('card__img--loaded')"
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
