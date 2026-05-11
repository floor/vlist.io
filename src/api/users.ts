// src/api/users.ts
// Deterministic user data generator — same index always produces same user
// Supports 1M+ items generated on-the-fly with zero storage
// Imports seed data from shared people module (single source of truth)

import {
  FIRST_NAMES,
  LAST_NAMES,
  EMAIL_DOMAINS,
  AVATAR_COLORS,
  COMPANIES,
  DEPARTMENTS,
  ROLES,
  CITIES,
  COUNTRIES,
  hash,
  pick,
} from "../data/people.js";

// =============================================================================
// API-only Seed Data
// =============================================================================

const STATUSES = [
  "active",
  "active",
  "active",
  "active",
  "active",
  "active",
  "active",
  "inactive",
  "pending",
  "suspended",
] as const;

// =============================================================================
// User Type
// =============================================================================

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  avatar: string;
  avatarColor: string;
  role: string;
  department: string;
  company: string;
  city: string;
  country: string;
  status: string;
  joinedYear: number;
}

// =============================================================================
// Configuration
// =============================================================================

export const TOTAL = 1_000_000;
export const MAX_LIMIT = 200;

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate a single user by index (1-based ID).
 * Fully deterministic — calling with the same index always returns the same user.
 */
export const generateUser = (index: number): User => {
  const id = index;
  const firstName = pick(FIRST_NAMES, index, 1);
  const lastName = pick(LAST_NAMES, index, 2);
  const domain = pick(EMAIL_DOMAINS, index, 3);

  // Email: lowercase first.last + suffix to avoid collisions
  const emailSuffix = index > 1000 ? index.toString(36) : "";
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${emailSuffix}@${domain}`;

  const avatar = firstName[0] + lastName[0];
  const avatarColor = pick(AVATAR_COLORS, index, 4);
  const role = pick(ROLES, index, 5);
  const department = pick(DEPARTMENTS, index, 6);
  const company = pick(COMPANIES, index, 7);
  const city = pick(CITIES, index, 8);
  const cityIndex = CITIES.indexOf(city);
  const country = cityIndex >= 0 ? COUNTRIES[cityIndex] : "United States";
  const status = pick(STATUSES, index, 10);
  const joinedYear = 2015 + (hash(index, 11) % 11); // 2015–2026

  return {
    id,
    firstName,
    lastName,
    email,
    avatar,
    avatarColor,
    role,
    department,
    company,
    city,
    country,
    status,
    joinedYear,
  };
};

/**
 * Generate a page of users.
 * Returns the exact shape vlist's AdapterResponse expects.
 */
export const getUsers = (
  offset: number,
  limit: number,
  total: number = TOTAL,
): { items: User[]; total: number; hasMore: boolean } => {
  const clamped = Math.min(limit, MAX_LIMIT);
  const start = Math.max(0, offset);
  const end = Math.min(start + clamped, total);

  const items: User[] = [];
  for (let i = start; i < end; i++) {
    items.push(generateUser(i + 1)); // 1-based IDs
  }

  return {
    items,
    total,
    hasMore: end < total,
  };
};

/**
 * Get a single user by ID (1-based).
 * Returns null if out of range.
 */
export const getUserById = (id: number, total: number = TOTAL): User | null => {
  if (id < 1 || id > total) return null;
  return generateUser(id);
};
