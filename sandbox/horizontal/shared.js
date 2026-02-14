// Shared data and utilities for horizontal sandbox variants
// This file is imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const ITEM_COUNT = 10_000;
export const ITEM_HEIGHT = 220;
export const ITEM_WIDTH = 180;

// Color palette for cards
export const colors = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#fccb90", "#d57eeb"],
  ["#e0c3fc", "#8ec5fc"],
  ["#f5576c", "#ff9a9e"],
  ["#667eea", "#00f2fe"],
];

export const emojis = ["🎵", "🎶", "🎸", "🥁", "🎹", "🎺", "🎻", "🎷", "🪗", "🪘"];

// =============================================================================
// Data Generation
// =============================================================================

// Generate card items
export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const color = colors[i % colors.length];
  return {
    id: i + 1,
    title: `Card ${i + 1}`,
    subtitle: `Item #${(i + 1).toLocaleString()}`,
    emoji: emojis[i % emojis.length],
    gradientStart: color[0],
    gradientEnd: color[1],
  };
});

// =============================================================================
// Templates
// =============================================================================

// Card template
export const itemTemplate = (item) => `
  <div class="card" style="background: linear-gradient(135deg, ${item.gradientStart} 0%, ${item.gradientEnd} 100%);">
    <div class="card-emoji">${item.emoji}</div>
    <div class="card-title">${item.title}</div>
    <div class="card-subtitle">${item.subtitle}</div>
  </div>
`;

// =============================================================================
// Utilities
// =============================================================================

// Calculate stats
export function calculateStats(domNodes, total) {
  const saved = Math.round((1 - domNodes / total) * 100);
  return { saved };
}

// Format stats HTML
export function formatStatsHtml(domNodes, total) {
  const { saved } = calculateStats(domNodes, total);
  return `
    <span><strong>Total:</strong> ${total.toLocaleString()}</span>
    <span><strong>DOM nodes:</strong> ${domNodes}</span>
    <span><strong>Memory saved:</strong> ${saved}%</span>
  `;
}
