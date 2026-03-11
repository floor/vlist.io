// Shared data and utilities for track-list example
// This file provides track-specific templates and utilities for list, grid, and table modes

// =============================================================================
// API Configuration
// =============================================================================

export const API_BASE = "/api/tracks";

// =============================================================================
// Templates
// =============================================================================

// Cover artwork helper — returns { html, bg } where bg is the cover_color style for the parent container
// size: "thumb" (default, list mode) or "large" (grid mode)
function coverArt(track, cls, size = "thumb") {
  const initials = track.title
    ? track.title.substring(0, 2).toUpperCase()
    : "♪";
  const bg = track.cover_color
    ? ` style="background-color:${track.cover_color}"`
    : "";
  if (track.cover_url) {
    const src =
      size !== "thumb"
        ? track.cover_url.replace("/thumb/", `/${size}/`)
        : track.cover_url;
    const fallbackEl = `Object.assign(document.createElement('span'),{className:'${cls} ${cls}--fallback',textContent:'${initials}'})`;
    return {
      html: `<img class="${cls}" src="${src}" alt="" loading="lazy" decoding="async" data-t="${performance.now()}" onload="if(performance.now()-this.dataset.t<100){this.style.transition='none';this.offsetHeight}this.classList.add('${cls}--loaded')" onerror="this.replaceWith(${fallbackEl})"/>`,
      bg,
    };
  }
  return {
    html: `<span class="${cls} ${cls}--fallback"${bg}>${initials}</span>`,
    bg: "",
  };
}

// Track item template — list mode (row with artwork, title, artist, duration)
export const trackTemplate = (track, index) => {
  const duration =
    track.duration && Number.isFinite(track.duration)
      ? formatDuration(track.duration)
      : "";
  const artistInfo = `${escapeHtml(track.artist)}${track.country ? ` – ${track.country}` : ""}`;

  const cover = coverArt(track, "item-cover");

  return `
    <div class="item-content">
      <div class="item-artwork"${cover.bg}>${cover.html}</div>
      <div class="item-details">
        <div class="item-title">${escapeHtml(track.title)}</div>
        <div class="item-artist">${artistInfo}</div>
      </div>
      <div class="item-duration-main">${duration}</div>
      <div class="item-menu">⋮</div>
    </div>
  `;
};

// Track item template — grid mode (card with large artwork, title, artist)
export const trackGridTemplate = (track, index) => {
  const duration =
    track.duration && Number.isFinite(track.duration)
      ? formatDuration(track.duration)
      : "";
  const year = track.year || "";

  const cover = coverArt(track, "grid-cover", "large");

  return `
    <div class="grid-card">
      <div class="grid-card__artwork"${cover.bg}>${cover.html}</div>
      <div class="grid-card__body">
        <div class="grid-card__title">${escapeHtml(track.title)}</div>
        <div class="grid-card__artist">${escapeHtml(track.artist)}</div>
        <div class="grid-card__meta">
          ${track.country ? `<span>${track.country}</span>` : ""}
          ${year ? `<span>${year}</span>` : ""}
          ${duration ? `<span>${duration}</span>` : ""}
        </div>
      </div>
    </div>
  `;
};

// Track table — column definitions for withTable
export const trackTableColumns = [
  {
    key: "title",
    label: "Title",
    width: 280,
    minWidth: 120,
    sortable: true,
    cell: (track) =>
      `<span class="table-cell--title">${escapeHtml(track.title)}</span>`,
  },
  {
    key: "artist",
    label: "Artist",
    width: 200,
    minWidth: 100,
    sortable: true,
    cell: (track) => escapeHtml(track.artist),
  },
  {
    key: "country",
    label: "Country",
    width: 80,
    minWidth: 60,
    sortable: true,
    align: "center",
    cell: (track) => track.country || "",
  },
  {
    key: "year",
    label: "Year",
    width: 70,
    minWidth: 50,
    sortable: true,
    align: "center",
    cell: (track) => (track.year ? String(track.year) : ""),
  },
  {
    key: "duration",
    label: "Duration",
    width: 80,
    minWidth: 60,
    sortable: true,
    align: "right",
    cell: (track) =>
      track.duration && Number.isFinite(track.duration)
        ? formatDuration(track.duration)
        : "",
  },
];

// Fallback template for table mode (withTable uses cell renderers)
export const trackTableRowTemplate = () => "";

// =============================================================================
// Utilities
// =============================================================================

// Format selection count
export function formatSelectionCount(count) {
  return count === 0
    ? "0 tracks"
    : count === 1
      ? "1 track"
      : `${count.toLocaleString()} tracks`;
}

// Format scroll direction
export function formatDirection(direction) {
  return direction === "up" ? "↑ up" : "↓ down";
}

// Calculate memory savings percentage
export function calculateMemorySaved(domNodes, total) {
  return Math.round((1 - domNodes / total) * 100);
}

// Format duration from seconds to MM:SS
export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Escape HTML to prevent XSS
export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Format year range
export function formatYearRange(min, max) {
  if (!min && !max) return "All years";
  if (min && !max) return `${min}+`;
  if (!min && max) return `Up to ${max}`;
  return `${min}–${max}`;
}

// Format country code (could be enhanced with full names)
export function formatCountry(code) {
  return code || "Unknown";
}
