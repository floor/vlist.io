// Shared data and utilities for carousel example
// Supports both fixed-width and variable-width modes via a toggle

// =============================================================================
// Constants
// =============================================================================

export const ITEM_COUNT = 10_000;
export const DEFAULT_HEIGHT = 240;
export const ASPECT_RATIO = 260 / 320; // width / height ≈ 0.8125

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

export const emojis = [
  "🎵",
  "🎶",
  "🎸",
  "🥁",
  "🎹",
  "🎺",
  "🎻",
  "🎷",
  "🪗",
  "🪘",
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

// Width patterns — creates visual variety in variable-width mode
const widthPatterns = [120, 180, 240, 160, 200, 140, 220, 190];

// =============================================================================
// Data Generation
// =============================================================================

// Generate card items (used in both modes)
export const items = Array.from({ length: ITEM_COUNT }, (_, i) => {
  const color = colors[i % colors.length];
  const categoryIndex = i % categories.length;

  // Variable-width fields
  const baseWidth = widthPatterns[i % widthPatterns.length];
  const isFeatured = i % 17 === 0;
  const variableWidth = isFeatured ? baseWidth + 100 : baseWidth;

  return {
    id: i + 1,
    title: `Card ${i + 1}`,
    subtitle: `Item #${(i + 1).toLocaleString()}`,
    emoji: emojis[i % emojis.length],
    gradientStart: color[0],
    gradientEnd: color[1],
    // Variable-width extras
    category: categories[categoryIndex],
    icon: icons[categoryIndex],
    width: variableWidth,
    isFeatured,
  };
});

// =============================================================================
// Templates
// =============================================================================

// Fixed-width card template
const fixedTemplate = (item) => `
  <div class="card" style="background: linear-gradient(135deg, ${item.gradientStart} 0%, ${item.gradientEnd} 100%);">
    <div class="card-emoji">${item.emoji}</div>
    <div class="card-title">${item.title}</div>
    <div class="card-subtitle">${item.subtitle}</div>
  </div>
`;

// Variable-width card template
const variableTemplate = (item) => {
  const featuredClass = item.isFeatured ? " card--featured" : "";
  return `
    <div class="card${featuredClass}" style="background: linear-gradient(135deg, ${item.gradientStart} 0%, ${item.gradientEnd} 100%);">
      <div class="card-emoji">${item.icon}</div>
      <div class="card-content">
        <div class="card-title">${item.isFeatured ? `⭐ Featured #${item.id}` : item.title}</div>
        <div class="card-category">${item.category}</div>
        <div class="card-width">${item.width}px</div>
      </div>
      ${item.isFeatured ? '<div class="card-badge">Featured</div>' : ""}
    </div>
  `;
};

// Returns the correct template for the current mode
export function getTemplate(variableWidth) {
  return variableWidth ? variableTemplate : fixedTemplate;
}

// =============================================================================
// Config builder
// =============================================================================

// Build vlist config for the given mode, height, and gap.
// Gap is added to item dimensions so vlist spaces items correctly.
export function buildConfig(variableWidth, height = DEFAULT_HEIGHT, gap = 0) {
  const cardWidth = Math.round(height * ASPECT_RATIO);
  return {
    orientation: "horizontal",
    scroll: { wheel: true },
    ariaLabel: "Horizontal card carousel",
    item: {
      height,
      width: variableWidth
        ? (index) => items[index].width + gap
        : cardWidth + gap,
      template: getTemplate(variableWidth),
    },
    items,
  };
}

// =============================================================================
// Utilities
// =============================================================================

// Calculate stats
export function calculateStats(domNodes, total, variableWidth) {
  const saved = Math.round((1 - domNodes / total) * 100);

  if (variableWidth) {
    const widths = items.map((item) => item.width);
    const minWidth = Math.min(...widths);
    const maxWidth = Math.max(...widths);
    const avgWidth = Math.round(
      widths.reduce((a, b) => a + b, 0) / widths.length,
    );
    return { saved, minWidth, maxWidth, avgWidth };
  }

  return { saved };
}

// Detail panel HTML
export function getDetailHtml(item, index, variableWidth) {
  return `
    <div class="detail-card" style="background: linear-gradient(135deg, ${item.gradientStart} 0%, ${item.gradientEnd} 100%);">
      <div class="detail-card__emoji">${variableWidth ? item.icon : item.emoji}</div>
      <div class="detail-card__title">${item.title}</div>
    </div>
    <div class="detail-meta">
      <strong>${item.title}</strong>
      <span>Index ${index}${variableWidth ? ` · ${item.category} · ${item.width}px` : ` · ${item.subtitle}`}</span>
      ${item.isFeatured && variableWidth ? '<span class="detail-meta__badge">⭐ Featured</span>' : ""}
    </div>
  `;
}

// Format stats HTML
export function formatStatsHtml(domNodes, total, variableWidth) {
  const stats = calculateStats(domNodes, total, variableWidth);
  let html = `
    <span><strong>Total:</strong> ${total.toLocaleString()} items</span>
    <span><strong>DOM nodes:</strong> ${domNodes}</span>
    <span><strong>Memory saved:</strong> ${stats.saved}%</span>
  `;

  if (variableWidth && stats.minWidth != null) {
    html += `<span><strong>Width:</strong> ${stats.minWidth}–${stats.maxWidth}px (avg ${stats.avgWidth}px)</span>`;
  }

  return html;
}
