// Shared data and utilities for track-list example
// This file provides track-specific templates and utilities

// =============================================================================
// API Configuration
// =============================================================================

export const API_BASE = "/api/tracks";

// =============================================================================
// Templates
// =============================================================================

// Track item template
export const trackTemplate = (track, index) => {
  const duration = track.duration ? formatDuration(track.duration) : "—";
  const artistInfo = `${escapeHtml(track.artist)}${track.country ? ` – ${track.country}` : ""}`;

  // Generate initials for artwork placeholder
  const initials = track.title
    ? track.title.substring(0, 2).toUpperCase()
    : "♪";

  return `
    <div class="item-content">
      <div class="item-artwork">${initials}</div>
      <div class="item-details">
        <div class="item-title">${escapeHtml(track.title)}</div>
        <div class="item-artist">${artistInfo}</div>
      </div>
      <div class="item-duration-main">${duration}</div>
      <div class="item-menu">⋮</div>
    </div>
  `;
};

// =============================================================================
// SVG Icons
// =============================================================================

export const icons = {
  arrow: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
  </svg>`,

  first: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
  </svg>`,

  middle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm-7 7H3v4c0 1.1.9 2 2 2h4v-2H5v-4zM5 5h4V3H5c-1.1 0-2 .9-2 2v4h2V5zm14-2h-4v2h4v4h2V5c0-1.1-.9-2-2-2zm0 16h-4v2h4c1.1 0 2-.9 2-2v-4h-2v4z" />
  </svg>`,

  last: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
  </svg>`,

  random: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
  </svg>`,

  up: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" />
  </svg>`,

  down: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
  </svg>`,

  selectAll: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 5h2V3c-1.1 0-2 .9-2 2zm0 8h2v-2H3v2zm4 8h2v-2H7v2zM3 9h2V7H3v2zm10-6h-2v2h2V3zm6 0v2h2c0-1.1-.9-2-2-2zM5 21v-2H3c0 1.1.9 2 2 2zm-2-4h2v-2H3v2zM9 3H7v2h2V3zm2 18h2v-2h-2v2zm8-8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2zm0-12h2V7h-2v2zm0 8h2v-2h-2v2zm-4 4h2v-2h-2v2zm0-16h2V3h-2v2zM7 17h10V7H7v10zm2-8h6v6H9V9z" />
  </svg>`,

  clear: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>`,

  search: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>`,

  filter: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
  </svg>`,

  add: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
  </svg>`,

  delete: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
  </svg>`,

  edit: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
  </svg>`,
};

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
