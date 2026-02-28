// Shared data and utilities for large-list example variants
// This file is imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const ITEM_HEIGHT = 48;

export const SIZES = {
  "100k": 100_000,
  "500k": 500_000,
  "1m": 1_000_000,
  "2m": 2_000_000,
  "5m": 5_000_000,
};

export const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#f5576c",
  "#4facfe",
  "#43e97b",
  "#fa709a",
  "#fee140",
];

// =============================================================================
// Utilities
// =============================================================================

// Simple hash for consistent per-item values
export function hash(n) {
  let h = (n + 1) * 2654435761;
  h ^= h >>> 16;
  return Math.abs(h);
}

// Generate items on the fly
export function generateItems(count) {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    value: hash(i) % 100,
    hash: hash(i).toString(16).slice(0, 8).toUpperCase(),
    color: COLORS[i % COLORS.length],
  }));
}

// =============================================================================
// Templates
// =============================================================================

// Item template
export const itemTemplate = (item, index) => `
  <div class="item-row">
    <div class="item-color" style="background:${item.color}"></div>
    <div class="item-info">
      <span class="item-label">#${(index + 1).toLocaleString()}</span>
      <span class="item-hash">${item.hash}</span>
    </div>
    <div class="item-bar-wrap">
      <div class="item-bar" style="width:${item.value}%;background:${item.color}"></div>
    </div>
    <span class="item-value">${item.value}%</span>
  </div>
`;

// =============================================================================
// Compression Info
// =============================================================================

export function getCompressionInfo(count, itemHeight = ITEM_HEIGHT) {
  const totalHeight = count * itemHeight;
  const maxHeight = 16_777_216; // browser limit ~16.7M px
  const isCompressed = totalHeight > maxHeight;
  const ratio = isCompressed ? (totalHeight / maxHeight).toFixed(1) : "1.0";

  return {
    isCompressed,
    virtualHeight: totalHeight,
    ratio,
  };
}

// Format virtualization percentage
export function calculateVirtualization(domNodes, total) {
  if (total > 0 && domNodes > 0) {
    return ((1 - domNodes / total) * 100).toFixed(4);
  }
  return "0.0000";
}
