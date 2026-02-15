// Shared data and utilities for velocity-loading sandbox variants
// This file is imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const CANCEL_LOAD_VELOCITY_THRESHOLD = 15; // px/ms
export const TOTAL_ITEMS = 1000000;
export const API_BASE = "http://localhost:3338";
export const ITEM_HEIGHT = 72;

// =============================================================================
// API State
// =============================================================================

let apiDelay = 0;
let useRealApi = false; // Start with simulated by default

export const setApiDelay = (delay) => {
  apiDelay = delay;
};

export const setUseRealApi = (value) => {
  useRealApi = value;
};

export const getUseRealApi = () => useRealApi;

// =============================================================================
// Real API — fetches from vlist.dev backend
// =============================================================================

const fetchFromApi = async (offset, limit) => {
  const params = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
    total: String(TOTAL_ITEMS),
  });
  if (apiDelay > 0) params.set("delay", String(apiDelay));

  const res = await fetch(`${API_BASE}/api/users?${params}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// =============================================================================
// Simulated API — deterministic in-memory fallback
// =============================================================================

const generateItem = (id) => ({
  id,
  name: `User ${id}`,
  email: `user${id}@example.com`,
  role: ["Admin", "Editor", "Viewer"][id % 3],
  avatar: String.fromCharCode(65 + (id % 26)),
});

const fetchSimulated = async (offset, limit) => {
  if (apiDelay > 0) await new Promise((r) => setTimeout(r, apiDelay));
  const items = [];
  const end = Math.min(offset + limit, TOTAL_ITEMS);
  for (let i = offset; i < end; i++) items.push(generateItem(i + 1));
  return { items, total: TOTAL_ITEMS, hasMore: end < TOTAL_ITEMS };
};

// =============================================================================
// Unified fetch
// =============================================================================

export const fetchItems = (offset, limit) =>
  useRealApi ? fetchFromApi(offset, limit) : fetchSimulated(offset, limit);

// =============================================================================
// Templates
// =============================================================================

export const placeholderTemplate = () => `
  <div class="item-content">
    <div class="item-avatar item-avatar--placeholder"></div>
    <div class="item-details">
      <div class="item-name item-name--placeholder"></div>
      <div class="item-email item-email--placeholder"></div>
    </div>
  </div>
`;

export const itemTemplate = (item, index) => {
  if (item._isPlaceholder) return placeholderTemplate();

  const displayName = item.firstName
    ? `${item.firstName} ${item.lastName}`
    : item.name;
  const avatarText = item.avatar || displayName[0];

  return `
    <div class="item-content">
      <div class="item-avatar">${avatarText}</div>
      <div class="item-details">
        <div class="item-name">${displayName} (#${index + 1})</div>
        <div class="item-email">${item.email}</div>
        <div class="item-role">${item.role}</div>
      </div>
    </div>
  `;
};

// =============================================================================
// Utilities
// =============================================================================

export const formatApiSource = (useRealApi) =>
  useRealApi ? "⚡ Live API" : "🧪 Simulated";

export const formatVelocity = (velocity) => velocity.toFixed(1);

export const formatLoadedCount = (count) => count.toLocaleString();
