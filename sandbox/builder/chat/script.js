// Builder Chat — Composable entry point with reverse mode
// Uses vlist/builder with withScrollbar plugin + reverse: true
// Demonstrates a chat-style messaging UI using the builder API
//
// Features:
//   - reverse: true → starts scrolled to bottom
//   - appendItems() auto-scrolls when user is at bottom
//   - prependItems() preserves scroll position (older messages)
//   - withScrollbar for custom scrollbar in the chat window

import { vlist } from "vlist/builder";
import { withScrollbar } from "vlist/scroll";

// =============================================================================
// Data — message corpus & users
// =============================================================================

const MESSAGES = [
  "Hey! 👋",
  "What's up?",
  "Have you heard this new track?",
  "It's amazing 🎶",
  "Where is that from?",
  "Brazil, 1970s I think",
  "The bossa nova vibes are incredible",
  "I've been listening to it on repeat all day",
  "You should check out the whole decade",
  "There's so much good music from that era",
  "Let me send you a playlist",
  "Yes please!",
  "Done ✅",
  "Thanks! Listening now",
  "What do you think of the second track?",
  "So groovy 🕺",
  "Right?? The guitar work is insane",
  "I wish I could travel back in time to see them live",
  "Same here. Time machine when? 😄",
  "That's literally what Radiooooo is for!",
  "Haha true true",
  "Ok I need to go, talk later!",
  "See you! 👋",
  "Don't forget to check the 1960s section",
  "Will do! Bye 🎵",
  "The percussion on track 5 though...",
  "I know! So clean",
  "Makes you want to dance",
  "Already dancing in my chair 💃",
  "lol same",
  "Ok for real now, gotta run",
  "Later! ✌️",
];

const USERS = [
  { name: "Alice", color: "#667eea", initials: "A" },
  { name: "Bob", color: "#f5576c", initials: "B" },
  { name: "Charlie", color: "#43e97b", initials: "C" },
  { name: "Diana", color: "#feca57", initials: "D" },
];

const SELF_USER = { name: "You", color: "#4facfe", initials: "Y" };

const DATE_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Today",
];

const DATE_HEADER_HEIGHT = 36;
const DEFAULT_MSG_HEIGHT = 72;

// Total simulated history
const TOTAL_HISTORY = 500;

// Page sizes
const INITIAL_PAGE = 40;
const PREPEND_PAGE = 30;

// =============================================================================
// Message generation
// =============================================================================

const generateMessage = (globalIndex) => {
  const text = MESSAGES[globalIndex % MESSAGES.length];
  const userIdx = globalIndex % (USERS.length + 1); // +1 for self
  const isSelf = userIdx === USERS.length;
  const user = isSelf ? SELF_USER : USERS[userIdx];
  const hour = 8 + (globalIndex % 14);
  const minute = (globalIndex * 7) % 60;

  return {
    id: `msg-${globalIndex}`,
    isHeader: false,
    text,
    user: user.name,
    color: user.color,
    initials: user.initials,
    isSelf,
    time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
    height: DEFAULT_MSG_HEIGHT,
  };
};

/**
 * Generate a page of messages with date separators.
 * startIdx = global start index (0 = oldest message in history)
 * count = number of messages to generate
 */
const generatePage = (startIdx, count) => {
  const items = [];
  const messagesPerDate = 8;

  for (let i = 0; i < count; i++) {
    const globalIdx = startIdx + i;
    const dateSection = Math.floor(globalIdx / messagesPerDate);
    const prevSection =
      i > 0
        ? Math.floor((globalIdx - 1) / messagesPerDate)
        : dateSection - 1;

    // Insert date header at section boundaries
    if (dateSection !== prevSection) {
      const label = DATE_LABELS[dateSection % DATE_LABELS.length];
      items.push({
        id: `date-${dateSection}`,
        isHeader: true,
        text: label,
        height: DATE_HEADER_HEIGHT,
      });
    }

    items.push(generateMessage(globalIdx));
  }

  return items;
};

// =============================================================================
// Rendering
// =============================================================================

const renderDateSep = (item) => `
  <div class="date-sep">
    <div class="date-sep__line"></div>
    <span class="date-sep__text">${item.text}</span>
    <div class="date-sep__line"></div>
  </div>
`;

const renderMessage = (item) => {
  const selfClass = item.isSelf ? " msg--self" : "";
  return `
    <div class="msg${selfClass}">
      <div class="msg__avatar" style="background:${item.color}">${item.initials}</div>
      <div class="msg__bubble">
        <div class="msg__header">
          <span class="msg__name">${item.user}</span>
          <span class="msg__time">${item.time}</span>
        </div>
        <div class="msg__text">${item.text}</div>
      </div>
    </div>
  `;
};

const renderItem = (item) => {
  return item.isHeader ? renderDateSep(item) : renderMessage(item);
};

// =============================================================================
// DOM references
// =============================================================================

const statsEl = document.getElementById("stats");
const statusEl = document.getElementById("channel-status");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

// =============================================================================
// State
// =============================================================================

let historyLoaded = 0; // how many history messages we've prepended
let sentCounter = 0;
let isLoadingOlder = false;

// Start with the most recent page
const startIdx = TOTAL_HISTORY - INITIAL_PAGE;
const initialItems = generatePage(startIdx, INITIAL_PAGE);
let currentItems = [...initialItems];
historyLoaded = INITIAL_PAGE;

// =============================================================================
// Create list via builder
// =============================================================================

const list = vlist({
  container: "#list-container",
  ariaLabel: "Chat messages",
  reverse: true,
  item: {
    height: (index) => {
      const item = currentItems[index];
      return item ? item.height : DEFAULT_MSG_HEIGHT;
    },
    template: (item) => renderItem(item),
  },
  items: currentItems,
})
  .use(withScrollbar({ autoHide: true }))
  .build();

// =============================================================================
// Load older messages (prepend)
// =============================================================================

const loadOlderMessages = async () => {
  if (isLoadingOlder) return;

  const remaining = TOTAL_HISTORY - historyLoaded;
  if (remaining <= 0) {
    updateStatus("All history loaded");
    return;
  }

  isLoadingOlder = true;
  updateStatus("Loading older messages…");

  // Simulate network delay
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

  const count = Math.min(PREPEND_PAGE, remaining);
  const start = TOTAL_HISTORY - historyLoaded - count;
  const page = generatePage(start, count);

  // Prepend
  currentItems = [...page, ...currentItems];
  list.prependItems(page);
  historyLoaded += count;

  isLoadingOlder = false;
  updateStatus(
    `${TOTAL_HISTORY - historyLoaded} older messages remaining`,
  );
  scheduleStatsUpdate();
  addLog("prepend", `+${page.length} items (${count} messages)`);
};

// =============================================================================
// Send message (append)
// =============================================================================

const sendMessage = () => {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";

  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const msg = {
    id: `sent-${++sentCounter}`,
    isHeader: false,
    text,
    user: SELF_USER.name,
    color: SELF_USER.color,
    initials: SELF_USER.initials,
    isSelf: true,
    time,
    height: DEFAULT_MSG_HEIGHT,
  };

  currentItems = [...currentItems, msg];
  list.appendItems([msg]);
  scheduleStatsUpdate();
  addLog("append", `"${text.slice(0, 30)}${text.length > 30 ? "…" : ""}"`);
};

// =============================================================================
// Scroll detection for loading older messages
// =============================================================================

list.on("scroll", ({ scrollTop }) => {
  // When near the top (< 200px), trigger load older
  if (scrollTop < 200 && !isLoadingOlder && historyLoaded < TOTAL_HISTORY) {
    loadOlderMessages();
  }
});

// =============================================================================
// Event log
// =============================================================================

const MAX_LOG = 20;
const logEntries = [];
const logEl = document.getElementById("event-log");

const addLog = (event, data) => {
  const time = new Date().toLocaleTimeString("en", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  logEntries.push({ time, event, data });
  if (logEntries.length > MAX_LOG) logEntries.shift();
  renderLog();
};

const renderLog = () => {
  logEl.innerHTML = logEntries
    .map(
      (e) =>
        `<div class="event-log__entry">` +
        `<span class="event-log__time">${e.time}</span>` +
        `<span class="event-log__event">${e.event}</span>` +
        `<span class="event-log__data">${e.data}</span>` +
        `</div>`,
    )
    .join("");
  logEl.scrollTop = logEl.scrollHeight;
};

// =============================================================================
// Status & stats
// =============================================================================

const updateStatus = (text) => {
  statusEl.textContent = text;
};

let statsRaf = null;

function scheduleStatsUpdate() {
  if (statsRaf) return;
  statsRaf = requestAnimationFrame(() => {
    statsRaf = null;
    updateStats();
  });
}

function updateStats() {
  const total = currentItems.length;
  const domNodes = document.querySelectorAll(".vlist-item").length;
  const virtualized =
    total > 0 ? ((1 - domNodes / total) * 100).toFixed(1) : "0";

  statsEl.innerHTML =
    `<strong>Messages:</strong> ${total}` +
    ` · <strong>DOM:</strong> ${domNodes}` +
    ` · <strong>Virtualized:</strong> ${virtualized}%` +
    ` · <strong>History:</strong> ${historyLoaded}/${TOTAL_HISTORY}` +
    ` · <strong>Sent:</strong> ${sentCounter}`;
}

// =============================================================================
// Input & controls
// =============================================================================

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener("click", sendMessage);

document.getElementById("jump-bottom").addEventListener("click", () => {
  list.scrollToIndex(currentItems.length - 1, "end");
});

document.getElementById("add-batch").addEventListener("click", () => {
  const count = 5;
  const now = new Date();
  const time = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const batch = [];
  for (let i = 0; i < count; i++) {
    const userIdx = (sentCounter + i) % USERS.length;
    const user = USERS[userIdx];
    const text = MESSAGES[(sentCounter + i) % MESSAGES.length];

    batch.push({
      id: `batch-${++sentCounter}`,
      isHeader: false,
      text,
      user: user.name,
      color: user.color,
      initials: user.initials,
      isSelf: false,
      time,
      height: DEFAULT_MSG_HEIGHT,
    });
  }

  currentItems = [...currentItems, ...batch];
  list.appendItems(batch);
  scheduleStatsUpdate();
  addLog("append", `+${count} batch messages`);
});

document.getElementById("load-older").addEventListener("click", () => {
  loadOlderMessages();
});

// =============================================================================
// Initialise
// =============================================================================

updateStatus(`${TOTAL_HISTORY - historyLoaded} older messages remaining`);
updateStats();
addLog("init", `Loaded ${INITIAL_PAGE} initial messages (reverse mode)`);
