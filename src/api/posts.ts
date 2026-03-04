// src/api/posts.ts
// Deterministic post data generator for the variable-sizes example.
// Same index always produces the same post — supports pagination like users.ts.

// =============================================================================
// Seed Data
// =============================================================================

const FIRST_NAMES = [
  "Charlie",
  "Skylar",
  "Jamie",
  "Morgan",
  "Riley",
  "Alex",
  "Taylor",
  "Jordan",
  "Casey",
  "Quinn",
  "Drew",
  "Sage",
  "Avery",
  "Blake",
  "Dakota",
  "Emerson",
  "Finley",
  "Hayden",
  "Kendall",
  "Logan",
  "Parker",
  "Reese",
  "Rowan",
  "Spencer",
];

const LAST_NAMES = [
  "Wright",
  "Patel",
  "Foster",
  "Chen",
  "Brooks",
  "Kim",
  "Singh",
  "Lee",
  "Murphy",
  "Adams",
  "Rivera",
  "Thompson",
  "Garcia",
  "Wilson",
  "Mitchell",
  "Clark",
  "Hall",
  "Young",
  "Walker",
  "Allen",
  "King",
  "Scott",
  "Torres",
  "Hill",
];

const BODY_TEXTS = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
  "Lorem ipsum dolor sit amet.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.",
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.",
  "Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Donec sed odio dui.",
  "Cras mattis consectetur purus sit amet fermentum. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh.",
  "Nullam quis risus eget urna mollis ornare vel eu leo. Cras justo odio, dapibus ut facilisis in, egestas eget quam.",
  "Maecenas faucibus mollis interdum. Etiam porta sem malesuada magna mollis euismod. Vestibulum id ligula porta felis euismod semper.",
];

// =============================================================================
// Deterministic Hash
// =============================================================================

const hash = (index: number, seed: number = 0): number => {
  let h = 2166136261 ^ seed;
  h = Math.imul(h ^ (index & 0xff), 16777619);
  h = Math.imul(h ^ ((index >> 8) & 0xff), 16777619);
  h = Math.imul(h ^ ((index >> 16) & 0xff), 16777619);
  h = Math.imul(h ^ ((index >> 24) & 0xff), 16777619);
  return h >>> 0;
};

const pick = <T>(arr: readonly T[], index: number, seed: number = 0): T =>
  arr[hash(index, seed) % arr.length];

// =============================================================================
// Post Type
// =============================================================================

export interface Post {
  id: string;
  user: string;
  title: string;
  body: string;
  time: string;
  avatarUrl: string;
  likes: number;
  comments: number;
  shares: number;
}

// =============================================================================
// Configuration
// =============================================================================

export const DEFAULT_TOTAL = 5000;
export const MAX_LIMIT = 200;

// =============================================================================
// Generator
// =============================================================================

/**
 * Generate a single post by index (0-based).
 * Fully deterministic — calling with the same index always returns the same post.
 */
export const generatePost = (index: number, total: number): Post => {
  const firstName = pick(FIRST_NAMES, index, 1);
  const lastName = pick(LAST_NAMES, index, 2);
  const body = pick(BODY_TEXTS, index, 3);
  const hoursAgo = 1 + (hash(index, 4) % 23);
  const avatarId = hash(index, 5) % 70;
  const itemNum = total - index;

  // Deterministic but varied engagement numbers
  const likes = 5 + (hash(index, 6) % 200);
  const comments = hash(index, 7) % 50;
  const shares = hash(index, 8) % 30;

  return {
    id: `post-${index}`,
    user: `${firstName} ${lastName}`,
    title: `Item #-${itemNum}`,
    body,
    time: `${hoursAgo}h ago`,
    avatarUrl: `https://i.pravatar.cc/72?img=${avatarId}`,
    likes,
    comments,
    shares,
  };
};

/**
 * Generate a page of posts.
 * Returns the exact shape vlist's paginated response expects.
 */
export const getPosts = (
  offset: number,
  limit: number,
  total: number = DEFAULT_TOTAL,
): { items: Post[]; total: number; hasMore: boolean } => {
  const clamped = Math.min(limit, MAX_LIMIT);
  const start = Math.max(0, offset);
  const end = Math.min(start + clamped, total);

  const items: Post[] = [];
  for (let i = start; i < end; i++) {
    items.push(generatePost(i, total));
  }

  return {
    items,
    total,
    hasMore: end < total,
  };
};

/**
 * Generate all posts at once (for client-side examples).
 * Use getPosts() for paginated API usage instead.
 */
export const getAllPosts = (total: number = DEFAULT_TOTAL): Post[] => {
  const items: Post[] = [];
  for (let i = 0; i < total; i++) {
    items.push(generatePost(i, total));
  }
  return items;
};
