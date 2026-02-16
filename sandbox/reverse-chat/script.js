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

import { createVList } from "vlist";

// =============================================================================
// Data — message corpus & users
// =============================================================================

const MESSAGES = [
  "Hey! 👋",
  "What's up?",
  "Not much, just listening to some music",
  "Check out this new album I found on Radiooooo 🎶",
  "Oh nice! What decade?",
  "1970s Brazilian funk. The groove is incredible.",
  "I've been on a 1960s Japanese city pop kick lately. The production quality is way ahead of its time — lush arrangements, incredible detail.",
  "lol",
  "👍",
  "brb",
  "Did you know you can scroll through music by country AND decade? I spent 3 hours exploring Soviet-era Georgian folk music yesterday. The polyphonic singing is out of this world — layers upon layers of voices.",
  "Ha, classic rabbit hole",
  "The best kind though",
  "true",
  "Anyone want to grab lunch?",
  "🎵🎵🎵",
  "I was thinking about how 1950s West African music has this incredible rhythmic complexity that influenced jazz, funk, afrobeat, and even modern electronic music.",
  "Totally agree",
  "Yes! Fela Kuti's early stuff especially",
  "omw",
  "k",
  "The thing about exploring music geographically is that you hear the connections between cultures — a melody traveling from North Africa through Spain into Latin America and back. An audible map of human migration.",
  "That's deep",
  "Mind = blown 🤯",
  "Wait, have you tried the random mode? It drops you into a random country and decade. Yesterday I landed on 1980s Iceland and discovered an amazing post-punk scene.",
  "No way, adding that to my list",
  "Do it. You won't regret it.",
  "🇮🇸 🎸",
  "So I went down the Iceland rabbit hole and found experimental electronic music from Reykjavik in the late 90s that basically paved the way for ambient and IDM",
  "Has anyone tried making a playlist that follows one genre across every continent? Like jazz from New Orleans to Paris to Tokyo to Lagos?",
  "That sounds amazing, how do I do that?",
  "Just pick a decade, click through countries one by one — you'll hear the local flavor each place added",
  "🔥🔥🔥",
  "ok I just tried 1940s Cuba and I can't stop dancing at my desk",
  "haha same thing happened to me last week",
  "The mambo recordings from that era are some of the most joyful music ever. Pérez Prado was doing things with brass that still sound fresh 80 years later.",
];

const USERS = [
  { name: "Alice", color: "#667eea", initials: "A" },
  { name: "Bob", color: "#e06595", initials: "B" },
  { name: "Charlie", color: "#38a169", initials: "C" },
  { name: "Diana", color: "#d97706", initials: "D" },
  { name: "You", color: "#667eea", initials: "Y" },
];

const SELF_USER = USERS[4];

const DATE_LABELS = [
  "December 10",
  "December 12",
  "December 14",
  "December 16",
  "Yesterday",
  "Today",
];

const DATE_HEADER_HEIGHT = 24;
const DEFAULT_MSG_HEIGHT = 56;

// Total messages available to "load" from the server
const TOTAL_HISTORY = 500;
// How many to load as the initial page (newest)
const INITIAL_PAGE = 100;
// How many to prepend when scrolling near the top
const PREPEND_PAGE = 60;
// Scroll threshold (px from top) to trigger loading older messages
const LOAD_THRESHOLD = 200;
// Simulated network delay (ms)
const LOAD_DELAY = 300;

// =============================================================================
// Message generation — produces a deterministic corpus
// =============================================================================

const generateMessage = (index) => {
  const text = MESSAGES[index % MESSAGES.length];
  const userIdx = index % (USERS.length - 1); // exclude "You" from history
  const user = USERS[userIdx];
  const hour = 8 + (index % 14);
  const minute = (index * 7) % 60;

  // Calculate which date section this message belongs to
  const messagesPerDate = Math.ceil(TOTAL_HISTORY / DATE_LABELS.length);
  const dateSection = Math.floor(index / messagesPerDate);

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
    if (globalIdx >= TOTAL_HISTORY) break;
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
const statsEl = document.getElementById("stats");
const statusEl = document.getElementById("channel-status");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

// ------------------------------------------------------------------
// Initial page: last N messages
// ------------------------------------------------------------------

let historyLoaded = INITIAL_PAGE;
let sentCounter = 1;

let isLoadingOlder = false;
const startIdx = Math.max(0, TOTAL_HISTORY - INITIAL_PAGE);
const initialItems = generatePage(startIdx, INITIAL_PAGE);

// Measure heights before creating the list
// (Use an estimated width; vlist will remeasure on resize)
measureHeights(initialItems, 600);

let currentItems = [...initialItems];

const updateStatus = () => {
  const remaining = TOTAL_HISTORY - historyLoaded;
  statusEl.textContent =
    remaining > 0
      ? `${remaining.toLocaleString()} older messages available`
      : `All ${TOTAL_HISTORY.toLocaleString()} messages loaded`;
};
updateStatus();

// ------------------------------------------------------------------
// Create vlist with reverse mode + groups (inline date headers)
// ------------------------------------------------------------------

const list = createVList({
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
  items: initialItems,
  // Groups plugin with inline headers (iMessage style)
  groups: {
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
  },
});

addLog(
  "init",
  `reverse: true + groups (sticky: false) — ${initialItems.length} items`,
);

// ------------------------------------------------------------------
// Load older messages on scroll near top (manual prependItems)
// ------------------------------------------------------------------

const loadOlderMessages = async () => {
  if (isLoadingOlder) return;

  const remaining = TOTAL_HISTORY - historyLoaded;
  if (remaining <= 0) return;

  isLoadingOlder = true;
  addLog("load", "fetching older messages…");

  // Simulate network delay
  await new Promise((r) => setTimeout(r, LOAD_DELAY));

  const count = Math.min(PREPEND_PAGE, remaining);
  const start = TOTAL_HISTORY - historyLoaded - count;
  const page = generatePage(Math.max(0, start), count);

  // Measure at the viewport width (scrollbar exists now)
  measureHeights(page, getMeasureWidth(container));

  currentItems = [...page, ...currentItems];
  list.prependItems(page);
  historyLoaded += count;

  addLog("prepend", `${page.length} older messages (scroll preserved)`);
  updateStatus();
  isLoadingOlder = false;
  scheduleStatsUpdate();
};

// ------------------------------------------------------------------
// Wire events
// ------------------------------------------------------------------

list.on("scroll", ({ scrollTop }) => {
  scheduleStatsUpdate();

  // Trigger "load older" when near the top
  if (scrollTop < LOAD_THRESHOLD) {
    loadOlderMessages();
  }
});

list.on("render", ({ range }) => {
  addLog("render", `items ${range.start}–${range.end}`);
});

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
  addLog("append", `sent message (auto-scroll if at bottom)`);
  scheduleStatsUpdate();
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
  list.scrollToBottom("smooth");
  addLog("scroll", "scrollToBottom()");
});

document.getElementById("add-batch").addEventListener("click", () => {
  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  const batch = [];
  const todaySection = DATE_LABELS.length - 1;

  for (let i = 0; i < 5; i++) {
    const userIdx = i % (USERS.length - 1);
    const user = USERS[userIdx];
    const text = MESSAGES[(currentItems.length + i) % MESSAGES.length];
    batch.push({
      id: `batch-${Date.now()}-${i}`,
      text,
      user: user.name,
      color: user.color,
      initials: user.initials,
      isSelf: false,
      time,
      height: DEFAULT_MSG_HEIGHT,
      dateSection: todaySection,
    });
  }

  measureHeights(batch, getMeasureWidth(container));
  currentItems = [...currentItems, ...batch];
  list.appendItems(batch);
  addLog("append", `5 messages added`);
  scheduleStatsUpdate();
});

document.getElementById("load-older").addEventListener("click", () => {
  loadOlderMessages();
});

// ------------------------------------------------------------------
// Stats update (debounced via rAF)
// ------------------------------------------------------------------

let statsRaf = null;

function scheduleStatsUpdate() {
  if (statsRaf) return;
  statsRaf = requestAnimationFrame(updateStats);
}

function updateStats() {
  statsRaf = null;
  const total = list.total;
  const domNodes = container.querySelectorAll("[data-index]").length;
  const virtualized =
    total > 0 ? (((total - domNodes) / total) * 100).toFixed(1) : 0;

  statsEl.innerHTML = `
    <strong>${total.toLocaleString()}</strong> items
    · <strong>${domNodes}</strong> DOM nodes
    · <strong>${virtualized}%</strong> virtualized
  `;
}

scheduleStatsUpdate();
