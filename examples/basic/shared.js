// Shared data and utilities for basic list example variants
// This file is imported by all framework implementations to avoid duplication

import { makeUser, makeUsers } from "../../src/data/people.js";

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_COUNT = 10_000;
export const ITEM_HEIGHT = 56;

// =============================================================================
// Data Generation (re-export for convenience)
// =============================================================================

export { makeUser, makeUsers };

// =============================================================================
// Templates
// =============================================================================

export const itemTemplate = (user, i) => `
  <div class="item">
    <div class="item__avatar" style="background:${user.color}">${user.initials}</div>
    <div class="item__text">
      <div class="item__name">${user.name}</div>
      <div class="item__email">${user.email}</div>
    </div>
    <span class="item__index">#${i + 1}</span>
  </div>
`;
