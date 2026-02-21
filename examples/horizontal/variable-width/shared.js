// Shared data and utilities for horizontal variable width example
// This file is imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const ITEM_COUNT = 1000;
export const ITEM_HEIGHT = 200;

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

export const categories = [
  "Photo",
  "Video",
  "Music",
  "Document",
  "Archive",
  "Code",
  "Design",
  "Text",
];

export const icons = ["📷", "🎬", "🎵", "📄", "📦", "💻", "🎨", "📝"];

// Width patterns - creates visual variety
const widthPatterns = [120, 180, 240, 160, 200, 140, 220, 190];

// =============================================================================
// Data Generation
// =============================================================================

// Generate items with variable widths
export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const categoryIndex = i % categories.length;
  const color = colors[i % colors.length];

  // Width varies based on pattern (simulating different content sizes)
  const width = widthPatterns[i % widthPatterns.length];

  // Some items are "featured" (wider)
  const isFeatured = i % 17 === 0;
  const finalWidth = isFeatured ? width + 100 : width;

  return {
    id: i + 1,
    title: isFeatured ? `⭐ Featured #${i + 1}` : `Item ${i + 1}`,
    category: categories[categoryIndex],
    icon: icons[categoryIndex],
    width: finalWidth,
    number: i + 1,
    gradientStart: color[0],
    gradientEnd: color[1],
    isFeatured,
  };
});

// =============================================================================
// Templates
// =============================================================================

// Card template - width is set by vlist
export const itemTemplate = (item) => {
  const featuredClass = item.isFeatured ? 'card--featured' : '';
  return `
    <div class="card ${featuredClass}" style="background: linear-gradient(135deg, ${item.gradientStart} 0%, ${item.gradientEnd} 100%);">
      <div class="card-icon">${item.icon}</div>
      <div class="card-content">
        <div class="card-title">${item.title}</div>
        <div class="card-category">${item.category}</div>
        <div class="card-width">${item.width}px</div>
      </div>
      ${item.isFeatured ? '<div class="card-badge">Featured</div>' : ''}
    </div>
  `;
};

// =============================================================================
// Utilities
// =============================================================================

// Calculate stats
export function calculateStats(domNodes, total) {
  const saved = Math.round((1 - domNodes / total) * 100);

  // Calculate width statistics
  const widths = items.map(item => item.width);
  const minWidth = Math.min(...widths);
  const maxWidth = Math.max(...widths);
  const avgWidth = Math.round(widths.reduce((a, b) => a + b, 0) / widths.length);
  const totalWidth = widths.reduce((a, b) => a + b, 0);

  return { saved, minWidth, maxWidth, avgWidth, totalWidth };
}

// Format stats HTML
export function formatStatsHtml(domNodes, total) {
  const { saved, minWidth, maxWidth, avgWidth } = calculateStats(domNodes, total);
  return `
    <span><strong>Total:</strong> ${total.toLocaleString()} items</span>
    <span><strong>DOM nodes:</strong> ${domNodes}</span>
    <span><strong>Memory saved:</strong> ${saved}%</span>
    <span><strong>Width:</strong> ${minWidth}–${maxWidth}px (avg ${avgWidth}px)</span>
  `;
}
