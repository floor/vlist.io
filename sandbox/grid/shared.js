// Shared data and utilities for grid sandbox variants
// This file is imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

// Picsum has photos with IDs 0–1084 (some gaps). We use 1000 items.
export const PHOTO_COUNT = 1084;

export const ITEM_COUNT = 1_000;

export const categories = [
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

export const DEFAULT_COLUMNS = 4;
export const DEFAULT_GAP = 8;

// =============================================================================
// Data Generation
// =============================================================================

// Generate photo items
export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const picId = i % PHOTO_COUNT;
  const category = categories[i % categories.length];
  return {
    id: i + 1,
    title: `Photo ${i + 1}`,
    category,
    likes: Math.floor(Math.random() * 500),
    picId,
  };
});

// =============================================================================
// Templates
// =============================================================================

// Item template for grid cards
export const itemTemplate = (item) => `
  <div class="card">
    <img
      class="card-img"
      src="https://picsum.photos/id/${item.picId}/400/300"
      alt="${item.title}"
      loading="lazy"
      decoding="async"
    />
    <div class="card-overlay">
      <div class="card-title">${item.title}</div>
      <div class="card-meta">
        <span class="card-category">${item.category}</span>
        <span class="card-likes">♥ ${item.likes}</span>
      </div>
    </div>
  </div>
`;

// =============================================================================
// Utilities
// =============================================================================

// Calculate row height based on column width to maintain 4:3 aspect ratio
export function calculateRowHeight(containerWidth, columns, gap) {
  const innerWidth = containerWidth - 2; // account for 1px border each side
  const colWidth = (innerWidth - (columns - 1) * gap) / columns;
  return Math.round(colWidth * 0.75);
}

// Calculate grid stats
export function calculateGridStats(domNodes, total, columns) {
  const rows = Math.ceil(total / columns);
  const saved = Math.round((1 - domNodes / total) * 100);
  return { rows, saved };
}

// Format stats HTML
export function formatStatsHtml(domNodes, total, columns) {
  const { rows, saved } = calculateGridStats(domNodes, total, columns);
  return `
    <span><strong>Total:</strong> ${total.toLocaleString()} photos</span>
    <span><strong>Rows:</strong> ${rows.toLocaleString()}</span>
    <span><strong>DOM nodes:</strong> ${domNodes}</span>
    <span><strong>Memory saved:</strong> ${saved}%</span>
  `;
}
