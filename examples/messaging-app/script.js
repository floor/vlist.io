// Messaging — Chat UI with reverse mode + date headers
// Demonstrates reverse: true, withGroups, DOM measurement,
// auto-scroll, incoming messages, send input.

import { vlist, withGroups } from "vlist";
import {
  getChatUser,
  pickMessage,
  CHAT_NAMES,
  CHAT_COLORS,
} from "../../src/data/messages.js";
import { createStats } from "../stats.js";
import "./controls.js";

// =============================================================================
// Constants
// =============================================================================

const TOTAL_MESSAGES = 5000;
const DATE_HEADER_HEIGHT = 28;
const DEFAULT_MSG_HEIGHT = 56;

const SELF_USER = { name: "You", color: "#667eea", initials: "YO" };

// =============================================================================
// Date labels — Jan 1 to today
// =============================================================================

const generateDateLabels = () => {
  const labels = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const daysSinceStart = Math.floor(
    (today - startOfYear) / (1000 * 60 * 60 * 24),
  );

  for (let i = daysSinceStart; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    if (i === 0) labels.push("Today");
    else if (i === 1) labels.push("Yesterday");
    else
      labels.push(
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      );
  }
  return labels;
};

const DATE_LABELS = generateDateLabels();

// =============================================================================
// Data — generate deterministic messages
// =============================================================================

const generateMessage = (index) => {
  const user = getChatUser(index % CHAT_NAMES.length);
  const text = pickMessage(index);

  const dayIndex = Math.floor((index / TOTAL_MESSAGES) * DATE_LABELS.length);
  const dateSection = Math.min(dayIndex, DATE_LABELS.length - 1);

  const messagesPerDay = TOTAL_MESSAGES / DATE_LABELS.length;
  const indexInDay = index % messagesPerDay;
  const hour = 8 + Math.floor((indexInDay / messagesPerDay) * 14);
  const minute = (index * 7) % 60;

  return {
    id: `msg-${index}`,
    text,
    user: user.name,
    color: user.color,
    initials: user.initials,
    isSelf: false,
    time: `${hour}:${String(minute).padStart(2, "0")}`,
    height: 0,
    dateSection,
  };
};

export let currentItems = Array.from({ length: TOTAL_MESSAGES }, (_, i) =>
  generateMessage(i),
);

// =============================================================================
// State — exported so controls.js can read/write
// =============================================================================

export let currentHeaderMode = "sticky"; // "sticky" | "inline" | "off"
export let autoMessages = true;
export let list = null;
let sentCounter = 1;
let autoTimer = null;

export function setCurrentHeaderMode(v) {
  currentHeaderMode = v;
}
export function setAutoMessages(v) {
  autoMessages = v;
  if (v) scheduleNextMessage();
  else if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

// =============================================================================
// Templates
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

const renderDateHeader = (dateLabel) => {
  const el = document.createElement("div");
  el.className = "date-sep";
  el.innerHTML = `
    <span class="date-sep__line"></span>
    <span class="date-sep__text">${dateLabel}</span>
    <span class="date-sep__line"></span>
  `;
  return el;
};

// =============================================================================
// DOM Measurement
// =============================================================================

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

const getMeasureWidth = () => {
  const viewport = container.querySelector(".vlist-viewport");
  return viewport ? viewport.clientWidth : container.clientWidth;
};

// =============================================================================
// Stats — shared footer
// =============================================================================

export const stats = createStats({
  getList: () => list,
  getTotal: () => currentItems.length,
  getItemHeight: () => DEFAULT_MSG_HEIGHT,
  container: "#list-container",
});

// =============================================================================
// DOM references
// =============================================================================

const container = document.getElementById("list-container");
const statusEl = document.getElementById("channel-status");
const inputEl = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const newMessagesBar = document.getElementById("new-messages-bar");
const newMessagesBtn = document.getElementById("new-messages-btn");
const newMessagesCount = document.getElementById("new-messages-count");

// =============================================================================
// New messages notification
// =============================================================================

let unreadCount = 0;
let currentRange = { start: 0, end: 0 };

const isAtBottom = () => {
  if (!list) return true;
  return currentRange && currentRange.end >= list.total - 5;
};

const showNewMessages = (count) => {
  unreadCount = count;
  newMessagesCount.textContent =
    count === 1 ? "1 new message" : `${count} new messages`;
  newMessagesBar.style.display = "block";
};

const hideNewMessages = () => {
  unreadCount = 0;
  newMessagesBar.style.display = "none";
};

newMessagesBtn.addEventListener("click", () => {
  if (!list) return;
  list.scrollToIndex(list.total - 1, {
    align: "start",
    behavior: "smooth",
    duration: 600,
  });
  hideNewMessages();
});

// =============================================================================
// Create / Recreate list
// =============================================================================

let firstVisibleIndex = 0;

export function createList() {
  if (list) {
    list.destroy();
    list = null;
  }

  container.innerHTML = "";

  // Measure all items before creating
  measureHeights(currentItems, 600);

  const builder = vlist({
    container: "#list-container",
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
    items: currentItems,
  });

  if (currentHeaderMode !== "off") {
    builder.use(
      withGroups({
        getGroupForIndex: (index) => {
          const item = currentItems[index];
          return item ? DATE_LABELS[item.dateSection] : "Unknown";
        },
        headerHeight: DATE_HEADER_HEIGHT,
        headerTemplate: renderDateHeader,
        sticky: currentHeaderMode === "sticky",
      }),
    );
  }

  list = builder.build();

  // Wire events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", ({ range }) => {
    currentRange = range;
    firstVisibleIndex = range.start;
    stats.scheduleUpdate();

    // Hide notification when user scrolls to bottom
    if (isAtBottom() && unreadCount > 0) {
      hideNewMessages();
    }
  });
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  // Restore scroll position
  if (firstVisibleIndex > 0) {
    list.scrollToIndex(firstVisibleIndex, "start");
  }

  statusEl.textContent = `${currentItems.length.toLocaleString()} messages`;
  stats.update();
  updateContext();
}

// =============================================================================
// Send message
// =============================================================================

const sendMessage = () => {
  if (!list) return;
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const msg = {
    id: `sent-${sentCounter++}`,
    text,
    user: SELF_USER.name,
    color: SELF_USER.color,
    initials: SELF_USER.initials,
    isSelf: true,
    time,
    height: DEFAULT_MSG_HEIGHT,
    dateSection: DATE_LABELS.length - 1,
  };

  measureHeights([msg], getMeasureWidth());
  currentItems = [...currentItems, msg];
  list.appendItems([msg]);

  // Always scroll to bottom when sending
  list.scrollToIndex(list.total - 1, {
    align: "start",
    behavior: "smooth",
    duration: 300,
  });

  statusEl.textContent = `${currentItems.length.toLocaleString()} messages`;
  stats.update();
};

sendBtn.addEventListener("click", sendMessage);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// =============================================================================
// Auto-generate incoming messages
// =============================================================================

const generateRandomMessage = () => {
  if (!list || !autoMessages) return;

  const now = new Date();
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const userIdx = Math.floor(Math.random() * CHAT_NAMES.length);
  const user = getChatUser(userIdx);
  const text = pickMessage(Date.now());

  const msg = {
    id: `auto-${Date.now()}`,
    text,
    user: user.name,
    color: user.color,
    initials: user.initials,
    isSelf: false,
    time,
    height: DEFAULT_MSG_HEIGHT,
    dateSection: DATE_LABELS.length - 1,
  };

  measureHeights([msg], getMeasureWidth());
  currentItems = [...currentItems, msg];
  list.appendItems([msg]);

  const atBottom = isAtBottom();

  if (!atBottom) {
    showNewMessages(unreadCount + 1);
  } else {
    list.scrollToIndex(list.total - 1, {
      align: "start",
      behavior: "smooth",
      duration: 300,
    });
  }

  statusEl.textContent = `${currentItems.length.toLocaleString()} messages`;
  stats.update();

  scheduleNextMessage();
};

const scheduleNextMessage = () => {
  if (!autoMessages) return;
  const delay = 2000 + Math.random() * 6000;
  autoTimer = setTimeout(generateRandomMessage, delay);
};

// =============================================================================
// Footer — right side (contextual)
// =============================================================================

const ftHeaders = document.getElementById("ft-headers");

export function updateContext() {
  ftHeaders.textContent = currentHeaderMode;
}

// =============================================================================
// Initialise
// =============================================================================

createList();
scheduleNextMessage();
