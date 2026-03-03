// Social Feed Example
// Demonstrates variable-size items with three independent axes:
//   Source: Reddit (live feed via /api/feed) | RSS (any feed URL)
//   Layout: Card (social-card style) | Compact (title-dominant, thumbnail right)
//   Mode:   A (pre-measure all items at init) | B (estimatedSize + ResizeObserver)
//
// Any combination works — you can pre-measure Reddit posts or auto-size RSS items.

import { vlist } from "vlist";
import { createStats } from "../stats.js";

// =============================================================================
// Reddit feed — fetcher + state
// =============================================================================

// Preload-ahead: fetch pages before the user reaches the boundary
const PRELOAD_THRESHOLD = 15; // trigger fetch when within N items of the end
const INITIAL_PAGES = 3; // pages to fetch on init (75 posts)
const INITIAL_PAGE_DELAY = 1500; // ms between initial burst requests
const MIN_FETCH_INTERVAL = 2000; // minimum ms between requests

// =============================================================================
// Preferences — persist source, mode, subreddit, RSS feed in localStorage
// =============================================================================

const STORAGE_KEY = "vlist-social-feed";

const loadPrefs = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
};

const savePrefs = (patch) => {
  try {
    const prefs = { ...loadPrefs(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — ignore
  }
};

const feedState = {
  posts: [],
  nextCursor: null,
  subreddit: "worldnews",
  loading: false,
  endOfFeed: false,
  lastFetchTime: 0,
};

const rssState = {
  posts: [],
  feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml",
  loading: false,
};

/**
 * Fetch a page of posts from /api/feed (proxied through the Bun server).
 * @param {string} subreddit
 * @param {string|null} after  pagination cursor (null = first page)
 * @returns {Promise<{posts: object[], nextCursor: string|null}>}
 */
const loadFeedPage = async (subreddit, after = null) => {
  const url = new URL("/api/feed", location.origin);
  url.searchParams.set("source", "reddit");
  url.searchParams.set("target", subreddit);
  url.searchParams.set("limit", "25");
  if (after) url.searchParams.set("after", after);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Feed API error ${res.status}`);
  return res.json();
};

const loadRssFeed = async (feedUrl) => {
  const url = new URL("/api/feed", location.origin);
  url.searchParams.set("source", "rss");
  url.searchParams.set("target", feedUrl);
  url.searchParams.set("limit", "50");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS API error ${res.status}`);
  return res.json();
};

// =============================================================================
// Helpers
// =============================================================================

/** Format large numbers like Reddit: 1234 → "1.2K", 35000 → "35K" */
const formatCount = (n) => {
  if (n >= 100_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) {
    const k = n / 1000;
    return k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1)}K`;
  }
  return String(n);
};

/** Extract domain from URL for display: "https://apnews.com/article/..." → "apnews.com" */
const extractDomain = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// =============================================================================
// Template — renders any post (Reddit or RSS)
// =============================================================================

/** Image slot for measurement — same container, no <img> tag */
const renderImageSlot = (image) => {
  if (!image) return "";
  return `<div class="post__image post__image--real"></div>`;
};

/** Thumbnail slot for measurement — compact layout */
const renderThumbnailSlot = (image) => {
  if (!image) return "";
  return `<div class="rpost__thumb"></div>`;
};

const renderImageReal = (image) => {
  if (!image) return "";
  if (image.url) {
    return `
      <div class="post__image post__image--real">
        <img src="${image.url}" alt="${image.alt ?? ""}" loading="lazy" onerror="this.parentElement.style.display='none'">
      </div>
    `;
  }
  return "";
};

/**
 * Light markdown → HTML for body text.
 * Converts [text](url) links and bare URLs to clickable <a> tags.
 */
const markdownToHtml = (text) => {
  // 1. Convert [text](url) markdown links
  let html = text.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>',
  );
  // 2. Convert remaining bare URLs (not already inside an href="...")
  html = html.replace(
    /(?<!href="|">)(https?:\/\/[^\s<]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>',
  );
  return html;
};

/** End-of-feed sentinel renderer */
const renderEndOfFeed = (post) => `
  <div class="post-end">
    <div class="post-end__line"></div>
    <span class="post-end__label">End of feed · ${post.count} items</span>
    <div class="post-end__line"></div>
  </div>
`;

/** Card post renderer — social-card style (default) */
const renderCardPost = (post, { measure = false } = {}) => {
  if (post._endOfFeed) return renderEndOfFeed(post);

  const titleHtml = post.title
    ? `<div class="post__title">${post.title}</div>`
    : "";

  const imageHtml = measure
    ? renderImageSlot(post.image)
    : renderImageReal(post.image);

  const openAction = post.url
    ? `<a class="post__action post__action--link" href="${post.url}" target="_blank" rel="noopener">↗ Open</a>`
    : "";

  const tagsHtml =
    post.tags.length > 0
      ? `<div class="post__tags">${post.tags.map((t) => `<span class="post__tag">${t}</span>`).join(" ")}</div>`
      : "";

  const likesHtml =
    post.likes > 0
      ? `<button class="post__action">♡ ${post.likes}</button>`
      : "";
  const commentsHtml =
    post.comments > 0
      ? `<button class="post__action">💬 ${post.comments}</button>`
      : "";

  return `
    <article class="post${post.source ? ` post--${post.source}` : ""}">
      <div class="post__header">
        <div class="post__avatar" style="background:${post.color}">${post.initials}</div>
        <div class="post__meta">
          <span class="post__user">${post.user}</span>
          <span class="post__time">${post.time}</span>
        </div>
      </div>
      ${titleHtml}
      ${imageHtml}
      ${post.text ? `<div class="post__body">${markdownToHtml(post.text)}</div>` : ""}
      ${tagsHtml}
      <div class="post__actions">
        ${likesHtml}
        ${commentsHtml}
        ${openAction}
      </div>
    </article>
  `;
};

/** Reddit-native post renderer — title-dominant, thumbnail right, vote pills */
const renderRedditPost = (post, { measure = false } = {}) => {
  if (post._endOfFeed) return renderEndOfFeed(post);

  const thumbHtml = measure
    ? renderThumbnailSlot(post.image)
    : post.image?.url
      ? `<a class="rpost__thumb" href="${post.url || "#"}" target="_blank" rel="noopener">
          <img src="${post.image.url}" alt="${post.image.alt ?? ""}" loading="lazy" onerror="this.parentElement.classList.add('rpost__thumb--broken')">
        </a>`
      : "";

  const titleHtml = post.title
    ? `<h3 class="rpost__title">${post.title}</h3>`
    : "";

  const linkDomain = post.url ? extractDomain(post.url) : "";
  const linkHtml = post.url
    ? `<a class="rpost__link" href="${post.url}" target="_blank" rel="noopener">${linkDomain}</a>`
    : "";

  const tagsHtml =
    post.tags.length > 0
      ? `<span class="rpost__tags">${post.tags.map((t) => `<span class="rpost__tag">${t}</span>`).join("")}</span>`
      : "";

  return `
    <article class="rpost">
      <div class="rpost__header">
        <div class="rpost__avatar" style="background:${post.color}">${post.initials}</div>
        <span class="rpost__user">u/${post.user}</span>
        <span class="rpost__dot">·</span>
        <span class="rpost__time">${post.time}</span>
      </div>
      <div class="rpost__body">
        <div class="rpost__content">
          ${titleHtml}
          ${linkHtml}
          ${post.text && !post.title ? `<div class="rpost__text">${markdownToHtml(post.text)}</div>` : ""}
        </div>
        ${thumbHtml}
      </div>
      <div class="rpost__actions">
        <span class="rpost__pill">
          <span class="rpost__vote rpost__vote--up">⬆</span>
          <span class="rpost__count">${post.likes > 0 ? formatCount(post.likes) : "Vote"}</span>
          <span class="rpost__vote rpost__vote--down">⬇</span>
        </span>
        <span class="rpost__pill">
          <span class="rpost__pill-icon">💬</span>
          <span class="rpost__count">${post.comments > 0 ? formatCount(post.comments) : "0"}</span>
        </span>
        ${tagsHtml}
        <a class="rpost__pill rpost__pill--link" href="${post.url || "#"}" target="_blank" rel="noopener">
          <span class="rpost__pill-icon">↗</span>
          <span class="rpost__count">Open</span>
        </a>
      </div>
    </article>
  `;
};

/** Dispatch to the right renderer based on current layout */
const renderPost = (post, opts) =>
  currentLayout === "compact"
    ? renderRedditPost(post, opts)
    : renderCardPost(post, opts);

// =============================================================================
// Mode A — Pre-measure all items via hidden DOM element
// =============================================================================

/**
 * Measure the actual rendered size of every item by inserting its HTML
 * into a hidden element that matches the list's inner width.
 *
 * We cache by a content key (text + hasImage + aspect) so items with
 * identical templates share a single measurement.
 */
const measureSizes = (items, container) => {
  const measurer = document.createElement("div");
  measurer.style.cssText =
    "position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;" +
    `width:${container.offsetWidth}px;`;
  document.body.appendChild(measurer);

  const cache = new Map();
  let uniqueCount = 0;

  for (const item of items) {
    const key =
      (item.title ?? "") + item.text + (item.image ? item.image.aspect : "");

    if (cache.has(key)) {
      item.size = cache.get(key);
      continue;
    }

    measurer.innerHTML = renderPost(item, { measure: true });
    const measured = measurer.firstElementChild.offsetHeight;
    item.size = measured;
    cache.set(key, measured);
    uniqueCount++;
  }

  measurer.remove();
  return uniqueCount;
};

// =============================================================================
// Constants
// =============================================================================

const ESTIMATED_SIZE = 160;
const ESTIMATED_SIZE_COMPACT = 120;

// =============================================================================
// DOM references
// =============================================================================

// Source panel
const sourceToggleEl = document.getElementById("feed-source");
const sectionRedditEl = document.getElementById("section-reddit");
const sectionRssEl = document.getElementById("section-rss");
const feedSubredditEl = document.getElementById("feed-subreddit");
const layoutToggleEl = document.getElementById("layout-toggle");
const infoFeedStatusEl = document.getElementById("info-feed-status");
const infoFeedCountEl = document.getElementById("info-feed-count");
const feedRssEl = document.getElementById("feed-rss");
const infoRssStatusEl = document.getElementById("info-rss-status");
const infoRssCountEl = document.getElementById("info-rss-count");

// Mode panel
const modeToggleEl = document.getElementById("mode-toggle");
const sectionMeasurementEl = document.getElementById("section-measurement");

// Measurement info
const infoStrategyEl = document.getElementById("info-strategy");
const infoInitEl = document.getElementById("info-init");
const infoUniqueEl = document.getElementById("info-unique");

// List + badge + footer + feed name
const feedNameEl = document.getElementById("feed-name");
const containerEl = document.getElementById("list-container");
const modeBadgeEl = document.getElementById("mode-badge");
const ftModeEl = document.getElementById("ft-mode");
const ftSourceEl = document.getElementById("ft-source");

// =============================================================================
// Stats (footer left — progress, velocity, items)
// =============================================================================

const stats = createStats({
  getList: () => list,
  getTotal: () => getActiveItems().length,
  getItemHeight: () => ESTIMATED_SIZE,
  container: "#list-container",
});

// =============================================================================
// State — two independent axes
// =============================================================================

const prefs = loadPrefs();
let currentSource = prefs.source === "rss" ? "rss" : "reddit";
let currentMode = prefs.mode || "a";
let currentLayout = prefs.layout || "card";
let list = null;

/** Return the items array for the active source */
const getActiveItems = () =>
  currentSource === "reddit" ? feedState.posts : rssState.posts;

// =============================================================================
// Create / recreate list — called when source OR mode changes
// =============================================================================

function createList() {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }
  containerEl.innerHTML = "";

  // Apply layout class to container
  containerEl.classList.toggle("layout--compact", currentLayout === "compact");

  const items = getActiveItems();
  const ariaLabel =
    currentSource === "reddit" ? "Live Reddit feed" : "RSS feed";

  const isCompact = currentLayout === "compact";
  const estimatedSize = isCompact ? ESTIMATED_SIZE_COMPACT : ESTIMATED_SIZE;

  let initTime = 0;
  let uniqueSizes = 0;

  if (currentMode === "a") {
    // Mode A: pre-measure all items, then use size function
    const start = performance.now();
    if (items.length > 0) {
      uniqueSizes = measureSizes(items, containerEl);
    }
    initTime = performance.now() - start;

    list = vlist({
      container: containerEl,
      ariaLabel,
      items,
      item: {
        height: (index) => getActiveItems()[index]?.size ?? estimatedSize,
        template: renderPost,
      },
    }).build();
  } else {
    // Mode B: estimated size, auto-measured by ResizeObserver
    const start = performance.now();

    list = vlist({
      container: containerEl,
      ariaLabel,
      items,
      item: {
        estimatedHeight: estimatedSize,
        template: renderPost,
      },
    }).build();

    initTime = performance.now() - start;
  }

  // Wire up events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", ({ range }) => {
    stats.scheduleUpdate();
    preloadIfNeeded(range.end);
  });
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  list.on("item:click", ({ item, event }) => {
    // Only open URL if the click was on the "Open" link itself
    const target = event?.target;
    if (target && target.closest && target.closest(".post__action--link"))
      return;
    console.log(
      `Clicked post by ${item.user}: "${(item.title || item.text || "").slice(0, 50)}…"`,
    );
  });

  // If no posts loaded yet, trigger initial fetch
  if (currentSource === "reddit" && feedState.posts.length === 0) {
    loadInitialPages();
  }
  if (currentSource === "rss" && rssState.posts.length === 0) {
    loadRssItems();
  }

  stats.update();
  updatePanelInfo(initTime, uniqueSizes);
}

// =============================================================================
// Reddit feed loading
// =============================================================================

async function loadNextFeedPage({ skipRateLimit = false } = {}) {
  if (feedState.loading || feedState.endOfFeed) return;

  // Rate-limit: don't fetch faster than MIN_FETCH_INTERVAL
  if (!skipRateLimit) {
    const now = Date.now();
    const elapsed = now - feedState.lastFetchTime;
    if (elapsed < MIN_FETCH_INTERVAL) {
      setTimeout(() => loadNextFeedPage(), MIN_FETCH_INTERVAL - elapsed);
      return;
    }
  }

  feedState.loading = true;
  feedState.lastFetchTime = Date.now();
  setFeedStatus("loading…");

  try {
    const data = await loadFeedPage(feedState.subreddit, feedState.nextCursor);

    feedState.posts.push(...data.posts);
    feedState.nextCursor = data.nextCursor;

    if (!data.nextCursor) {
      feedState.endOfFeed = true;
      // Append end-of-feed sentinel
      feedState.posts.push({
        id: "__end__",
        _endOfFeed: true,
        count: feedState.posts.length,
        tags: [],
        size: 0,
      });
    }

    // Update the live vlist with the new items
    if (list && currentSource === "reddit") {
      // If Mode A, measure BEFORE setItems so heights are available
      let uniqueSizes = 0;
      if (currentMode === "a") {
        uniqueSizes = measureSizes(data.posts, containerEl);
      }

      list.setItems(feedState.posts);
      stats.update();
      updatePanelInfo(0, uniqueSizes);
    }

    setFeedStatus(feedState.endOfFeed ? "end of feed" : "ready");
    infoFeedCountEl.textContent = String(feedState.posts.length);
  } catch (err) {
    console.error("Feed fetch failed:", err);
    setFeedStatus(`error: ${err.message}`);
  } finally {
    feedState.loading = false;
  }
}

/**
 * Preload-ahead: called on range:change to auto-fetch more posts
 * when the user scrolls near the end of loaded data.
 */
function preloadIfNeeded(rangeEnd) {
  if (currentSource !== "reddit") return;
  if (feedState.endOfFeed || feedState.loading) return;

  const remaining = feedState.posts.length - rangeEnd;
  if (remaining <= PRELOAD_THRESHOLD) {
    loadNextFeedPage();
  }
}

/**
 * Load multiple pages sequentially on init for a comfortable buffer.
 * Stops early if end-of-feed is reached.
 */
async function loadInitialPages() {
  for (let i = 0; i < INITIAL_PAGES; i++) {
    if (feedState.endOfFeed) break;
    await loadNextFeedPage({ skipRateLimit: true });
    // Delay between pages to avoid Reddit rate-limiting
    if (i < INITIAL_PAGES - 1 && !feedState.endOfFeed) {
      await new Promise((r) => setTimeout(r, INITIAL_PAGE_DELAY));
    }
  }
}

/** @param {string} msg */
function setFeedStatus(msg) {
  if (infoFeedStatusEl) infoFeedStatusEl.textContent = msg;
}

// =============================================================================
// RSS feed loading
// =============================================================================

async function loadRssItems() {
  if (rssState.loading) return;

  rssState.loading = true;
  setRssStatus("loading…");

  try {
    const data = await loadRssFeed(rssState.feedUrl);

    // Append end-of-feed sentinel
    rssState.posts = [
      ...data.posts,
      {
        id: "__end__",
        _endOfFeed: true,
        count: data.posts.length,
        tags: [],
        size: 0,
      },
    ];

    if (list && currentSource === "rss") {
      // If Mode A, measure BEFORE setItems so heights are available
      let uniqueSizes = 0;
      if (currentMode === "a") {
        uniqueSizes = measureSizes(rssState.posts, containerEl);
      }

      list.setItems(rssState.posts);
      stats.update();
      updatePanelInfo(0, uniqueSizes);
    }

    setRssStatus("ready");
    infoRssCountEl.textContent = String(rssState.posts.length);
  } catch (err) {
    console.error("RSS fetch failed:", err);
    setRssStatus(`error: ${err.message}`);
  } finally {
    rssState.loading = false;
  }
}

/** @param {string} msg */
function setRssStatus(msg) {
  if (infoRssStatusEl) infoRssStatusEl.textContent = msg;
}

// =============================================================================
// Panel info — update badge, footer, measurement section
// =============================================================================

function updateFeedName() {
  if (!feedNameEl) return;
  if (currentSource === "reddit") {
    const sub = feedSubredditEl.value;
    feedNameEl.textContent = `r/${sub}`;
  } else {
    const selected = feedRssEl.options[feedRssEl.selectedIndex];
    feedNameEl.textContent = selected ? selected.textContent.trim() : "RSS";
  }
}

function updatePanelInfo(initTime, uniqueSizes) {
  const modeLabel = currentMode === "a" ? "Mode A" : "Mode B";
  const sourceLabel = currentSource === "reddit" ? "Reddit" : "RSS";

  modeBadgeEl.textContent = modeLabel;
  ftModeEl.textContent = modeLabel;
  ftSourceEl.textContent = sourceLabel;

  infoStrategyEl.textContent =
    currentMode === "a" ? "size: (index) => px" : "estimatedSize";

  infoInitEl.textContent = `${initTime.toFixed(0)}ms`;
  infoUniqueEl.textContent = currentMode === "a" ? String(uniqueSizes) : "–";
}

// =============================================================================
// Panel visibility — show/hide source-specific sections
// =============================================================================

function updateSourceSections() {
  sectionRedditEl.classList.toggle(
    "panel-section--hidden",
    currentSource !== "reddit",
  );
  sectionRssEl.classList.toggle(
    "panel-section--hidden",
    currentSource !== "rss",
  );
}

function updateLayoutToggle() {
  if (!layoutToggleEl) return;
  layoutToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "panel-segmented__btn--active",
      b.dataset.layout === currentLayout,
    );
  });
}

// =============================================================================
// Source toggle
// =============================================================================

sourceToggleEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-source]");
  if (!btn || btn.disabled) return;

  const source = btn.dataset.source;
  if (source === currentSource) return;

  currentSource = source;
  savePrefs({ source });

  // Update active button
  sourceToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle(
      "panel-segmented__btn--active",
      b.dataset.source === source,
    );
  });

  // Ensure state is ready for the selected source
  if (source === "reddit" && feedState.posts.length === 0) {
    feedState.subreddit = feedSubredditEl.value;
  }
  if (source === "rss" && rssState.posts.length === 0) {
    rssState.feedUrl = feedRssEl.value;
  }

  updateSourceSections();
  updateFeedName();
  createList();
});

// =============================================================================
// Layout toggle
// =============================================================================

layoutToggleEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-layout]");
  if (!btn) return;

  const layout = btn.dataset.layout;
  if (layout === currentLayout) return;

  currentLayout = layout;
  savePrefs({ layout });

  updateLayoutToggle();

  // Clear cached sizes — layout changes dimensions
  for (const item of getActiveItems()) {
    item.size = 0;
  }

  createList();
});

// =============================================================================
// Mode toggle
// =============================================================================

modeToggleEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;

  const mode = btn.dataset.mode;
  if (mode === currentMode) return;

  currentMode = mode;
  savePrefs({ mode });

  // Update active button
  modeToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("panel-segmented__btn--active", b.dataset.mode === mode);
  });

  createList();
});

// =============================================================================
// Reddit controls — subreddit picker
// =============================================================================

feedSubredditEl.addEventListener("change", () => {
  if (currentSource !== "reddit") return;

  // Reset feed for the new subreddit
  feedState.posts = [];
  feedState.nextCursor = null;
  feedState.endOfFeed = false;
  feedState.lastFetchTime = 0;
  feedState.subreddit = feedSubredditEl.value;
  savePrefs({ subreddit: feedSubredditEl.value });
  infoFeedCountEl.textContent = "–";

  updateFeedName();
  createList();
});

// =============================================================================
// RSS controls — feed picker
// =============================================================================

feedRssEl.addEventListener("change", () => {
  if (currentSource !== "rss") return;

  rssState.posts = [];
  rssState.feedUrl = feedRssEl.value;
  savePrefs({ rssFeed: feedRssEl.value });
  infoRssCountEl.textContent = "–";

  updateFeedName();
  createList();
});

// =============================================================================
// Navigation controls
// =============================================================================

document.getElementById("jump-top").addEventListener("click", () => {
  list.scrollToIndex(0, { behavior: "smooth" });
});

document.getElementById("jump-middle").addEventListener("click", () => {
  const total = getActiveItems().length;
  list.scrollToIndex(Math.floor(total / 2), {
    align: "center",
    behavior: "smooth",
  });
});

document.getElementById("jump-bottom").addEventListener("click", () => {
  const total = getActiveItems().length;
  list.scrollToIndex(Math.max(0, total - 1), {
    align: "end",
    behavior: "smooth",
  });
});

document.getElementById("jump-random").addEventListener("click", () => {
  const total = getActiveItems().length;
  const idx = Math.floor(Math.random() * total);
  list.scrollToIndex(idx, { align: "center", behavior: "smooth" });
});

// =============================================================================
// Initialise — restore preferences and boot
// =============================================================================

// Restore saved selections into UI controls
if (
  prefs.subreddit &&
  feedSubredditEl.querySelector(`option[value="${prefs.subreddit}"]`)
) {
  feedSubredditEl.value = prefs.subreddit;
  feedState.subreddit = prefs.subreddit;
}
if (
  prefs.rssFeed &&
  feedRssEl.querySelector(`option[value="${prefs.rssFeed}"]`)
) {
  feedRssEl.value = prefs.rssFeed;
  rssState.feedUrl = prefs.rssFeed;
}

// Restore source toggle UI
sourceToggleEl.querySelectorAll("button").forEach((b) => {
  b.classList.toggle(
    "panel-segmented__btn--active",
    b.dataset.source === currentSource,
  );
});

// Restore mode toggle UI
modeToggleEl.querySelectorAll("button").forEach((b) => {
  b.classList.toggle(
    "panel-segmented__btn--active",
    b.dataset.mode === currentMode,
  );
});

// Restore layout toggle UI
updateLayoutToggle();

// Update badge / footer to match restored state
modeBadgeEl.textContent = currentMode === "a" ? "Mode A" : "Mode B";
ftModeEl.textContent = currentMode === "a" ? "Mode A" : "Mode B";
ftSourceEl.textContent = currentSource === "reddit" ? "Reddit" : "RSS";

updateSourceSections();
updateFeedName();
createList();
