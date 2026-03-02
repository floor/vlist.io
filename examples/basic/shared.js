// Shared data and utilities for basic list example variants
// This file is imported by all framework implementations to avoid duplication

// =============================================================================
// Constants
// =============================================================================

export const DEFAULT_COUNT = 100_000;
export const ITEM_HEIGHT = 64;

// =============================================================================
// Data generator
// =============================================================================

// Deterministic hash (murmurhash-inspired)
const hash = (i, seed = 0) => {
  let h = Math.imul(i ^ seed ^ 0x5bd1e995, 0x5bd1e995);
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  return (h ^ (h >>> 15)) >>> 0;
};

const pick = (arr, i, seed) => arr[hash(i, seed) % arr.length];

const STATUSES = [
  "shipped",
  "delivered",
  "pending",
  "processing",
  "cancelled",
  "returned",
];

// Date clustering — each day gets a random batch of orders (50–350)
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const DAY = 24 * 60 * 60 * 1000;
const formatDate = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format;

// Pre-build a date for each order index (0 = most recent)
const buildDates = (count) => {
  const dates = new Array(count);
  let idx = 0;
  let day = 0;
  while (idx < count) {
    const batch = (hash(day, 99) % 301) + 50; // 50–350 orders per day
    const base = TODAY.getTime() - day * DAY;
    const end = Math.min(idx + batch, count);
    for (let j = idx; j < end; j++) dates[j] = base + (hash(j, 88) % DAY);
    idx = end;
    day++;
  }
  return dates;
};

let ORDER_DATES = buildDates(DEFAULT_COUNT);

const ensureDates = (count) => {
  if (count > ORDER_DATES.length) ORDER_DATES = buildDates(count);
};

const formatAmount = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
}).format;

/**
 * Generate a single order item by index.
 * Deterministic — same index always produces the same item.
 * @param {number} i - 0-based item index (order id = i + 1)
 * @returns {{ id: number, customer: number, amount: string, date: string, status: string }}
 */
export const makeItem = (i) => {
  const status = pick(STATUSES, i, 1);
  const amount = ((hash(i, 2) % 999900) + 100) / 100; // 1.00 – 9,999.99
  const customer = (hash(i, 4) % 90000) + 10000; // 10000–99999

  ensureDates(i + 1);

  return {
    id: i + 1,
    customer,
    amount: formatAmount(amount),
    date: formatDate(ORDER_DATES[i] ?? Date.now()),
    status,
  };
};

/**
 * Generate a batch of order items, highest id first (most recent at top).
 * @param {number} count - number of items
 * @param {number} [startIndex=0] - base index for id generation
 * @returns {Array}
 */
export const makeItems = (count, startIndex = 0) => {
  ensureDates(count);
  return Array.from({ length: count }, (_, i) => {
    const itemIndex = startIndex + count - 1 - i;
    return {
      ...makeItem(itemIndex),
      date: formatDate(ORDER_DATES[i]),
    };
  });
};

// =============================================================================
// Template
// =============================================================================

export const itemTemplate = (item, i) => `
  <div class="item__row">
    <span class="item__label">Order #${item.id} — C-${item.customer}</span>
    <span class="item__badge item__badge--${item.status}">${item.status}</span>
  </div>
  <div class="item__row">
    <span class="item__date">${item.date}</span>
    <span class="item__amount">${item.amount}</span>
  </div>
`;
