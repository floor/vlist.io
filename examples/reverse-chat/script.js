// script.js - vlist Reverse Mode with Groups Example
// Chat-style messaging UI demonstrating reverse: true + inline date headers
//
// Features shown:
//   - reverse: true → starts scrolled to bottom
//   - groups with sticky: false → date headers (iMessage style)
//   - appendItems() auto-scrolls to bottom (new messages)
//   - prependItems() preserves scroll position (older messages)
//   - Manual "load older" on scroll near top
//   - Variable heights via DOM measurement

import { vlist, withSections } from "vlist";

// =============================================================================
// Data — load messages from JSON
// =============================================================================

let MESSAGES = [];
let USERS = [];

// Load messages and users from JSON files
const loadMessages = async () => {
  const response = await fetch("/examples/reverse-chat/messages.json");
  MESSAGES = await response.json();
};

const loadUsers = async () => {
  const response = await fetch("/examples/reverse-chat/users.json");
  USERS = await response.json();
};

let SELF_USER;

// Generate date labels from beginning of year to now
const generateDateLabels = () => {
  const labels = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYear = new Date(now.getFullYear(), 0, 1); // Jan 1

  const daysSinceStart = Math.floor(
    (today - startOfYear) / (1000 * 60 * 60 * 24),
  );

  for (let i = daysSinceStart; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    if (i === 0) {
      labels.push("Today");
    } else if (i === 1) {
      labels.push("Yesterday");
    } else {
      labels.push(
        date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      );
    }
  }

  return labels;
};

const DATE_LABELS = generateDateLabels();

const DATE_HEADER_HEIGHT = 28;
const DEFAULT_MSG_HEIGHT = 56;

// Total messages to display
const TOTAL_MESSAGES = 5000;

// =============================================================================
// Message generation — produces a deterministic corpus
// =============================================================================

const generateMessage = (index) => {
  const text = MESSAGES[index % MESSAGES.length];
  const userIdx = index % (USERS.length - 1); // exclude "You" from history
  const user = USERS[userIdx];

  // Distribute messages across the year (from Jan 1 to today)
  // index 0 = oldest (Jan 1), index TOTAL_MESSAGES-1 = newest (today)
  const dayIndex = Math.floor((index / TOTAL_MESSAGES) * DATE_LABELS.length);
  const dateSection = Math.min(dayIndex, DATE_LABELS.length - 1);

  // Generate realistic time within the day
  const messagesPerDay = TOTAL_MESSAGES / DATE_LABELS.length;
  const indexInDay = index % messagesPerDay;
  const hour = 8 + Math.floor((indexInDay / messagesPerDay) * 14); // 8am to 10pm
  const minute = (index * 7) % 60;

  return {
    id: `msg-${index}`,
    text,
    user: user.name,
    color: user.color,
    initials: user.initials,
    isSelf: false,
    time: `${hour}:${String(minute).padStart(2, "0")}`,
    height: 0, // measured below
    dateSection: Math.min(dateSection, DATE_LABELS.length - 1), // for grouping
  };
};

/**
 * Generate a page of messages in chronological order.
 * No need to manually insert date headers - groups plugin handles it!
 */
const generatePage = (startIndex, count) => {
  const items = [];

  for (let i = 0; i < count; i++) {
    const globalIdx = startIndex + i;
    if (globalIdx >= TOTAL_MESSAGES) break;
    items.push(generateMessage(globalIdx));
  }

  return items;
};

// =============================================================================
// Templates (return HTML strings)
// =============================================================================

const renderMessage = (item) => {
  const selfClass = item.isSelf ? " msg--self" : "";
  return `
    <div class="msg${selfClass}">
      <div class="msg__avatar" style="background:${item.color}">${item.initials}</div>
      <div class="msg__bubble">
        <div class="msg__header">
          <div class="msg__name">${item.user}</div>
          <div class="msg__time">${item.time}</div>
        </div>
        <div class="msg__text">${item.text}</div>
      </div>
    </div>
  `;
};

// =============================================================================
// DOM Measurement
// =============================================================================

/**
 * Measure heights for a batch of items.
 * Creates a temporary container, renders items, measures, then cleans up.
 */
const contentCache = new Map();

const measureHeights = (items, width) => {
  const measurer = document.createElement("div");
  measurer.style.cssText = `
    position: absolute;
    visibility: hidden;
    width: ${width}px;
    pointer-events: none;
  `;
  document.body.appendChild(measurer);

  for (const item of items) {
    const key = `${item.id}-${width}`;
    if (contentCache.has(key)) {
      item.height = contentCache.get(key);
      continue;
    }

    measurer.innerHTML = renderMessage(item);
    const measured = measurer.firstElementChild.offsetHeight;
    item.height = measured;
    contentCache.set(key, measured);
  }

  document.body.removeChild(measurer);
};

/**
 * Get the actual content width (viewport minus scrollbar).
 */
const getMeasureWidth = (container) => {
  const viewport = container.querySelector(".vlist-viewport");
  return viewport ? viewport.clientWidth : container.clientWidth;
};

// =============================================================================
// Event logging (shows in bottom panel)
// =============================================================================

const MAX_LOG = 40;
const logEntries = [];

const addLog = (event, data) => {
  const time = new Date().toLocaleTimeString("en-US", { timeStyle: "medium" });
  logEntries.push({ time, event, data });
  if (logEntries.length > MAX_LOG) logEntries.shift();
  renderLog();
};

const renderLog = () => {
  const el = document.getElementById("event-log");
  el.innerHTML = logEntries
    .map(
      ({ time, event, data }) => `
    <div class="event-log__entry">
      <span class="event-log__time">${time}</span>
      <span class="event-log__event">${event}</span>
      <span class="event-log__data">${data}</span>
    </div>
  `,
    )
    .join("");
};

// =============================================================================
// Init
// =============================================================================

const container = document.getElementById("list-container");
const statusEl = document.getElementById("channel-status");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newMessagesBar = document.getElementById("new-messages-bar");
const newMessagesBtn = document.getElementById("new-messages-btn");
const newMessagesCount = document.getElementById("new-messages-count");

// ------------------------------------------------------------------
// Helper: Check if user is at bottom
// ------------------------------------------------------------------

const isAtBottom = () => {
  const total = list.total;

  // In reverse mode, we're at bottom if viewing the last items
  // Allow a small margin (within 5 items of the end)
  const atBottom = currentRange && currentRange.end >= total - 5;

  return atBottom;
};

// ------------------------------------------------------------------
// New messages notification
// ------------------------------------------------------------------

let unreadCount = 0;

const showNewMessagesNotification = (count) => {
  unreadCount = count;
  newMessagesCount.textContent =
    count === 1 ? "1 new message" : `${count} new messages`;
  newMessagesBar.style.display = "block";
};

const hideNewMessagesNotification = () => {
  unreadCount = 0;
  newMessagesBar.style.display = "none";
};

newMessagesBtn.addEventListener("click", () => {
  const lastIndex = list.total - 1;
  list.scrollToIndex(lastIndex, {
    align: "start",
    behavior: "smooth",
    duration: 600,
  });
  hideNewMessagesNotification();
  addLog("scroll", "scrolled to bottom (via new messages button)");
});

// ------------------------------------------------------------------
// Initial page: last N messages
// ------------------------------------------------------------------

let sentCounter = 1;
let currentItems = [];
let list;
let currentRange = { start: 0, end: 0 }; // Track visible range from events

// ------------------------------------------------------------------
// Initialize - Load messages and create list
// ------------------------------------------------------------------

const init = async () => {
  // Load messages and users from JSON
  await Promise.all([loadMessages(), loadUsers()]);

  // Set self user after loading
  SELF_USER = { name: "You", color: "#667eea", initials: "YOU" };

  // Generate all messages from the start
  const allItems = generatePage(0, TOTAL_MESSAGES);

  // Measure heights before creating the list
  measureHeights(allItems, 600);

  currentItems = [...allItems];

  const updateStatus = () => {
    statusEl.textContent = `${TOTAL_MESSAGES.toLocaleString()} messages from Jan 1 to today`;
  };
  updateStatus();

  // Create vlist with reverse mode + groups (inline date headers)
  list = vlist({
    container,
    ariaLabel: "Chat messages",
    reverse: true,
    item: {
      height: (index) => {
        const item = currentItems[index];
        return (item && item.height) || DEFAULT_MSG_HEIGHT;
      },
      template: (item) => {
        const el = document.createElement("div");
        el.innerHTML = renderMessage(item);
        return el.firstElementChild;
      },
    },
    items: allItems,
  })
    .use(
      withSections({
        getGroupForIndex: (index) => {
          const item = currentItems[index];
          return item ? DATE_LABELS[item.dateSection] : "Unknown";
        },
        headerHeight: DATE_HEADER_HEIGHT,
        headerTemplate: (dateLabel) => {
          const el = document.createElement("div");
          el.className = "date-sep";
          el.innerHTML = `
        <span class="date-sep__line"></span>
        <span class="date-sep__text">${dateLabel}</span>
        <span class="date-sep__line"></span>
      `;
          return el;
        },
        sticky: true, // Try sticky: true for Telegram-style (header sticks at top while scrolling)
      }),
    )
    .build();

  addLog("init", `reverse: true + groups — ${allItems.length} items loaded`);

  // Wire events
  wireEvents();

  // Start auto-message generation
  scheduleNextMessage();
};

// ------------------------------------------------------------------
// Wire events (after list is created)
// ------------------------------------------------------------------

const wireEvents = () => {
  list.on("render", ({ range }) => {
    addLog("render", `items ${range.start}–${range.end}`);
  });

  list.on("range:change", ({ range }) => {
    // Track current visible range
    currentRange = range;

    // Hide notification when user scrolls to bottom manually
    if (isAtBottom() && unreadCount > 0) {
      hideNewMessagesNotification();
    }
  });
};

// ------------------------------------------------------------------
// Send message
// ------------------------------------------------------------------

const sendMessage = () => {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  // New messages go in the "Today" section
  const todaySection = DATE_LABELS.length - 1;

  const msg = {
    id: `sent-${sentCounter++}`,
    text,
    user: SELF_USER.name,
    color: SELF_USER.color,
    initials: SELF_USER.initials,
    isSelf: true,
    time,
    height: DEFAULT_MSG_HEIGHT,
    dateSection: todaySection,
  };

  // Measure height
  measureHeights([msg], getMeasureWidth(container));

  currentItems = [...currentItems, msg];
  list.appendItems([msg]);

  // Always scroll to bottom when user sends a message
  const lastIndex = list.total - 1;
  list.scrollToIndex(lastIndex, {
    align: "start",
    behavior: "smooth",
    duration: 300,
  });

  addLog("append", `sent message → scrolled to bottom`);
};

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// ------------------------------------------------------------------
// Control buttons
// ------------------------------------------------------------------

document.getElementById("jump-bottom").addEventListener("click", () => {
  const lastIndex = list.total - 1;
  if (lastIndex >= 0) {
    list.scrollToIndex(lastIndex, {
      align: "start",
      behavior: "smooth",
      duration: 600,
    });
  }
  addLog("scroll", "scrollToIndex(last, start, smooth)");
});

// ------------------------------------------------------------------
// Auto-generate random messages (1-2 messages every 3-8 seconds)
// ------------------------------------------------------------------

const generateRandomMessage = () => {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const todaySection = DATE_LABELS.length - 1;

  // Generate a single random message
  const userIdx = Math.floor(Math.random() * USERS.length);
  const user = USERS[userIdx];
  const text = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  const msg = {
    id: `auto-${Date.now()}`,
    text,
    user: user.name,
    color: user.color,
    initials: user.initials,
    isSelf: false,
    time,
    height: DEFAULT_MSG_HEIGHT,
    dateSection: todaySection,
  };

  measureHeights([msg], getMeasureWidth(container));
  currentItems = [...currentItems, msg];
  list.appendItems([msg]);

  // Show notification if user is not at bottom, or auto-scroll if at bottom
  const atBottom = isAtBottom();

  if (!atBottom) {
    showNewMessagesNotification(unreadCount + 1);
  } else {
    // Auto-scroll to show new message
    const lastIndex = list.total - 1;
    list.scrollToIndex(lastIndex, {
      align: "start",
      behavior: "smooth",
      duration: 300,
    });
  }

  addLog(
    "auto",
    `message received${atBottom ? " → scrolled to bottom" : " (notification shown)"}`,
  );

  // Schedule next random message
  scheduleNextMessage();
};

const scheduleNextMessage = () => {
  const delay = 1000 + Math.random() * 7000; // 3-20 seconds
  setTimeout(generateRandomMessage, delay);
};

// Start initialization
init();
