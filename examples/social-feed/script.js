// Social Feed Example
// Demonstrates variable-size items with two independent axes:
//   Source: Reddit (live feed via /api/feed) | Generated (5 000 mock posts) | RSS
//   Mode:   A (pre-measure all items at init) | B (estimatedSize + ResizeObserver)
//
// Any combination works — you can pre-measure Reddit posts or auto-size generated ones.

import { vlist } from "vlist";
import { createStats } from "../stats.js";

// =============================================================================
// Reddit feed — fetcher + state
// =============================================================================

const feedState = {
  posts: [],
  nextCursor: null,
  subreddit: "worldnews",
  loading: false,
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
// Generated data — social feed posts with wildly varying content lengths
// =============================================================================

const AVATARS = [
  { name: "Alice Chen", initials: "AC", color: "#667eea" },
  { name: "Bob Martinez", initials: "BM", color: "#e06595" },
  { name: "Charlie Park", initials: "CP", color: "#38a169" },
  { name: "Diana Okafor", initials: "DO", color: "#d97706" },
  { name: "Eve Larsson", initials: "EL", color: "#4facfe" },
  { name: "Frank Rossi", initials: "FR", color: "#f5576c" },
  { name: "Grace Kim", initials: "GK", color: "#764ba2" },
  { name: "Hugo Dubois", initials: "HD", color: "#43e97b" },
];

const SHORT_POSTS = [
  "🎵",
  "Nice!",
  "love this",
  "👍👍👍",
  "haha same",
  "brb",
  "omw!",
  "🔥🔥🔥",
  "mood",
  "facts",
  "this >>>",
  "💯",
];

const MEDIUM_POSTS = [
  "Just discovered 1970s Brazilian funk on Radiooooo and I can't stop dancing at my desk. The groove is absolutely infectious.",
  "Has anyone tried exploring music from Mongolia? The throat singing combined with modern production is mind-blowing.",
  "Spent my entire Sunday afternoon going through 1960s Ethiopian jazz. Mulatu Astatke was way ahead of his time.",
  "The algorithm dropped me into 1980s Japanese city pop and now I understand the hype. The production quality is unreal.",
  "Today I learned that psychedelic rock had a massive scene in 1960s Turkey. The guitar tones are completely unique.",
  "Listening to 1950s Cuban mambo at 7am on a Monday and honestly it's the best decision I've made this week.",
  "Can we talk about how good 1990s Malian blues is? Ali Farka Touré basically invented a genre.",
  "Random mode dropped me into 1940s Argentina tango and now I'm emotionally compromised.",
];

const LONG_POSTS = [
  "I've been going down the deepest rabbit hole exploring how music traveled along the Silk Road. You can trace melodic patterns from Chinese traditional music through Central Asian folk songs into Persian classical music and eventually into Andalusian flamenco. It's like an audible map of human migration spanning thousands of years. The pentatonic scales, the ornamentation techniques, the rhythmic patterns — they mutate and evolve but you can hear the common DNA running through all of it.",

  "OK so I just spent 4 hours exploring Soviet-era Georgian polyphonic singing and I need everyone to stop what they're doing and listen to this immediately. The way multiple voices weave together in these complex harmonic structures that predate Western classical harmony by centuries is absolutely staggering. UNESCO recognized it as a masterpiece of intangible cultural heritage and honestly they undersold it. Each voice operates independently but they lock together into these resonant overtone patterns that feel almost mathematical in their precision.",

  "The thing about exploring music geographically is that you start to hear connections that history books don't teach you. Like how West African griot traditions traveled across the Atlantic with enslaved people and became the foundation for blues, which became jazz, which became funk, which became hip-hop — but simultaneously those same rhythmic patterns went to Cuba and became son, which became salsa, which influenced Afrobeat back in West Africa. It's a giant feedback loop spanning centuries and continents. Once you hear it, you can never unhear it. Every genre is a conversation with every other genre.",

  "I made a playlist that follows the evolution of electronic music across continents and decades: starting with Delia Derbyshire and the BBC Radiophonic Workshop in 1960s UK, through Kraftwerk in 1970s Germany, to Yellow Magic Orchestra in 1970s Japan, then Chicago house and Detroit techno in the 1980s, Goa trance from India in the 1990s, and finally the minimal techno scene in 2000s Romania. What strikes me is how each scene took the technology of the previous one and filtered it through their own cultural lens, creating something genuinely new each time.",
];

const IMAGE_SUBJECTS = [
  {
    label: "Sunset over the mountains",
    aspect: "wide",
    palette: ["#ff6b35", "#ffa94d", "#c92a2a", "#2b2d42"],
  },
  {
    label: "Street market in Marrakech",
    aspect: "tall",
    palette: ["#e07a5f", "#f2cc8f", "#81b29a", "#3d405b"],
  },
  {
    label: "Cherry blossoms in Kyoto",
    aspect: "wide",
    palette: ["#ffb7c5", "#f8bbd0", "#4a7c59", "#2d3436"],
  },
  {
    label: "Northern lights in Iceland",
    aspect: "wide",
    palette: ["#00b4d8", "#06d6a0", "#073b4c", "#118ab2"],
  },
  {
    label: "Vinyl record collection",
    aspect: "square",
    palette: ["#1a1a2e", "#16213e", "#e94560", "#0f3460"],
  },
  {
    label: "Café in Paris",
    aspect: "tall",
    palette: ["#d4a373", "#ccd5ae", "#e9edc9", "#606c38"],
  },
  {
    label: "Festival crowd at sunset",
    aspect: "wide",
    palette: ["#ff006e", "#fb5607", "#ffbe0b", "#3a0ca3"],
  },
  {
    label: "Old radio dial close-up",
    aspect: "square",
    palette: ["#6b705c", "#a5a58d", "#cb997e", "#ddbea9"],
  },
];

const TAGS = [
  ["#music", "#discovery"],
  ["#worldmusic", "#culture"],
  ["#vinyl", "#analog"],
  ["#jazz", "#soul"],
  ["#electronic", "#ambient"],
  ["#folk", "#traditional"],
  ["#radiooooo", "#timetraveling"],
  ["#playlist", "#vibes"],
];

// =============================================================================
// Post generation — each post is a unique combination of content types
// =============================================================================

const generatePosts = (count) => {
  const posts = [];

  for (let i = 0; i < count; i++) {
    const user = AVATARS[i % AVATARS.length];
    const seed = i * 7 + 3;
    const type = seed % 10; // 0-1: short, 2-5: medium, 6-7: long, 8-9: image

    let text, hasImage, image;

    if (type <= 1) {
      text = SHORT_POSTS[i % SHORT_POSTS.length];
      hasImage = false;
    } else if (type <= 5) {
      text = MEDIUM_POSTS[i % MEDIUM_POSTS.length];
      hasImage = seed % 3 === 0;
    } else if (type <= 7) {
      text = LONG_POSTS[i % LONG_POSTS.length];
      hasImage = false;
    } else {
      text = SHORT_POSTS[(i + 5) % SHORT_POSTS.length];
      hasImage = true;
    }

    if (hasImage) {
      image = IMAGE_SUBJECTS[i % IMAGE_SUBJECTS.length];
    }

    const tags = TAGS[i % TAGS.length];
    const hours = Math.floor(i / 4);
    const timeStr =
      hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;

    const likes = Math.floor(Math.abs(Math.sin(i * 2.1)) * 500);
    const comments = Math.floor(Math.abs(Math.cos(i * 1.7)) * 80);

    posts.push({
      id: i,
      user: user.name,
      initials: user.initials,
      color: user.color,
      title: null,
      text,
      hasImage,
      image: image || null,
      tags,
      time: timeStr,
      likes,
      comments,
      source: "generated",
      url: null,
      size: 0, // filled by Mode A pre-measurement
    });
  }

  return posts;
};

// =============================================================================
// Template — renders any post (generated or live)
// =============================================================================

/** Gradient placeholder image (generated posts) */
const renderImagePlaceholder = (image) => {
  if (!image) return "";
  const height =
    image.aspect === "wide" ? 180 : image.aspect === "tall" ? 260 : 200;
  const gradient = `linear-gradient(135deg, ${image.palette[0]} 0%, ${image.palette[1]} 35%, ${image.palette[2]} 70%, ${image.palette[3]} 100%)`;
  return `
    <div class="post__image" style="height:${height}px;background:${gradient}">
      <span class="post__image-label">${image.label}</span>
    </div>
  `;
};

/** Real image from URL (Reddit posts) */
const renderImageReal = (image) => {
  if (!image) return "";
  if (image.url) {
    return `
      <div class="post__image post__image--real">
        <img src="${image.url}" alt="${image.alt ?? ""}" loading="lazy" onerror="this.parentElement.style.display='none'">
      </div>
    `;
  }
  return renderImagePlaceholder(image);
};

/** Unified post renderer — works for both generated and live posts */
const renderPost = (post) => {
  const titleHtml = post.title
    ? `<div class="post__title">${post.title}</div>`
    : "";

  const imageHtml =
    post.source === "generated" || !post.source
      ? renderImagePlaceholder(post.image)
      : renderImageReal(post.image);

  const openAction = post.url
    ? `<a class="post__action post__action--link" href="${post.url}" target="_blank" rel="noopener">↗ Open</a>`
    : `<button class="post__action">↗ Share</button>`;

  const tagsHtml =
    post.tags.length > 0
      ? `<div class="post__tags">${post.tags.map((t) => `<span class="post__tag">${t}</span>`).join(" ")}</div>`
      : "";

  const isLive = post.source && post.source !== "generated";
  const likesHtml =
    !isLive || post.likes > 0
      ? `<button class="post__action">♡ ${post.likes}</button>`
      : "";
  const commentsHtml =
    !isLive || post.comments > 0
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
      ${post.text ? `<div class="post__body">${post.text}</div>` : ""}
      ${tagsHtml}
      <div class="post__actions">
        ${likesHtml}
        ${commentsHtml}
        ${openAction}
      </div>
    </article>
  `;
};

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

    measurer.innerHTML = renderPost(item);
    const measured = measurer.firstElementChild.offsetHeight;
    item.size = measured;
    cache.set(key, measured);
    uniqueCount++;
  }

  measurer.remove();
  return uniqueCount;
};

// =============================================================================
// Setup — generated data
// =============================================================================

const TOTAL_GENERATED = 5000;
const ESTIMATED_SIZE = 120;
const generatedPosts = generatePosts(TOTAL_GENERATED);

// =============================================================================
// DOM references
// =============================================================================

// Source panel
const sourceToggleEl = document.getElementById("feed-source");
const sectionRedditEl = document.getElementById("section-reddit");
const sectionRssEl = document.getElementById("section-rss");
const feedSubredditEl = document.getElementById("feed-subreddit");
const infoFeedStatusEl = document.getElementById("info-feed-status");
const infoFeedCountEl = document.getElementById("info-feed-count");
const feedLoadMoreEl = document.getElementById("feed-load-more");
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

// List + badge + footer
const containerEl = document.getElementById("list-container");
const modeBadgeEl = document.getElementById("mode-badge");
const ftModeEl = document.getElementById("ft-mode");
const ftSourceEl = document.getElementById("ft-source");

// =============================================================================
// Stats (footer left — progress, velocity, items)
// =============================================================================

const stats = createStats({
  getList: () => list,
  getTotal: () => getActiveItems().length || TOTAL_GENERATED,
  getItemHeight: () => ESTIMATED_SIZE,
  container: "#list-container",
});

// =============================================================================
// State — two independent axes
// =============================================================================

let currentSource = "reddit"; // "reddit" | "generated" | "rss"
let currentMode = "b"; // "a" | "b"
let list = null;

/** Return the items array for the active source */
const getActiveItems = () =>
  currentSource === "reddit"
    ? feedState.posts
    : currentSource === "rss"
      ? rssState.posts
      : generatedPosts;

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

  const items = getActiveItems();
  const isLive = currentSource !== "generated";
  const ariaLabel =
    currentSource === "reddit"
      ? "Live Reddit feed"
      : currentSource === "rss"
        ? "RSS feed"
        : "Social feed";

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
        height: (index) => items[index]?.size ?? ESTIMATED_SIZE,
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
        estimatedHeight: isLive ? 160 : ESTIMATED_SIZE,
        template: renderPost,
      },
    }).build();

    initTime = performance.now() - start;
  }

  // Wire up events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", stats.scheduleUpdate);
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

  // If live source and no posts loaded yet, trigger first fetch
  if (currentSource === "reddit" && feedState.posts.length === 0) {
    loadNextFeedPage();
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

async function loadNextFeedPage() {
  if (feedState.loading) return;

  feedState.loading = true;
  feedLoadMoreEl.disabled = true;
  setFeedStatus("loading…");

  try {
    const data = await loadFeedPage(feedState.subreddit, feedState.nextCursor);

    feedState.posts.push(...data.posts);
    feedState.nextCursor = data.nextCursor;

    // Update the live vlist with the new items
    if (list && currentSource === "reddit") {
      list.setItems(feedState.posts);

      // If Mode A, re-measure the new items
      if (currentMode === "a") {
        measureSizes(feedState.posts, containerEl);
      }

      stats.update();
    }

    setFeedStatus(feedState.nextCursor ? "ready" : "end of feed");
    infoFeedCountEl.textContent = String(feedState.posts.length);
    feedLoadMoreEl.disabled = feedState.nextCursor === null;
  } catch (err) {
    console.error("Feed fetch failed:", err);
    setFeedStatus(`error: ${err.message}`);
    feedLoadMoreEl.disabled = false;
  } finally {
    feedState.loading = false;
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

    rssState.posts = data.posts;

    if (list && currentSource === "rss") {
      list.setItems(rssState.posts);

      if (currentMode === "a") {
        measureSizes(rssState.posts, containerEl);
      }

      stats.update();
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

function updatePanelInfo(initTime, uniqueSizes) {
  const modeLabel = currentMode === "a" ? "Mode A" : "Mode B";
  const sourceLabel =
    currentSource === "reddit"
      ? "Reddit"
      : currentSource === "rss"
        ? "RSS"
        : "Generated";

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

// =============================================================================
// Source toggle
// =============================================================================

sourceToggleEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-source]");
  if (!btn || btn.disabled) return;

  const source = btn.dataset.source;
  if (source === currentSource) return;

  currentSource = source;

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

  // Update active button
  modeToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("panel-segmented__btn--active", b.dataset.mode === mode);
  });

  createList();
});

// =============================================================================
// Reddit controls — subreddit picker + load more
// =============================================================================

feedSubredditEl.addEventListener("change", () => {
  if (currentSource !== "reddit") return;

  // Reset feed for the new subreddit
  feedState.posts = [];
  feedState.nextCursor = null;
  feedState.subreddit = feedSubredditEl.value;
  infoFeedCountEl.textContent = "–";

  createList();
});

feedLoadMoreEl.addEventListener("click", () => {
  if (currentSource === "reddit") loadNextFeedPage();
});

// =============================================================================
// RSS controls — feed picker
// =============================================================================

feedRssEl.addEventListener("change", () => {
  if (currentSource !== "rss") return;

  rssState.posts = [];
  rssState.feedUrl = feedRssEl.value;
  infoRssCountEl.textContent = "–";

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
// Initialise — Generated source, Mode B
// =============================================================================

updateSourceSections();
createList();
