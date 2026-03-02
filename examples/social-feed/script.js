// Social Feed Example
// Demonstrates two strategies for variable-height items:
//   Mode A: Pre-measure all items at init via hidden DOM element
//   Mode B: estimatedHeight — vlist renders with a guess, ResizeObserver
//           measures actual DOM height, caches the result, corrects scroll

import { vlist } from "vlist";
import { createStats } from "../stats.js";

// =============================================================================
// Data — social feed posts with wildly varying content lengths
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
      hasImage = seed % 3 === 0; // 1/3 of medium posts have images
    } else if (type <= 7) {
      text = LONG_POSTS[i % LONG_POSTS.length];
      hasImage = false;
    } else {
      // Image post with short caption
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
      text,
      hasImage,
      image: image || null,
      tags,
      time: timeStr,
      likes,
      comments,
      height: 0, // filled by Mode A pre-measurement
    });
  }

  return posts;
};

// =============================================================================
// Template — variable-height social feed cards
// =============================================================================

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

const renderPost = (post) => `
  <article class="post">
    <div class="post__header">
      <div class="post__avatar" style="background:${post.color}">${post.initials}</div>
      <div class="post__meta">
        <span class="post__user">${post.user}</span>
        <span class="post__time">${post.time}</span>
      </div>
    </div>
    <div class="post__body">${post.text}</div>
    ${renderImagePlaceholder(post.image)}
    <div class="post__tags">${post.tags.map((t) => `<span class="post__tag">${t}</span>`).join(" ")}</div>
    <div class="post__actions">
      <button class="post__action">♡ ${post.likes}</button>
      <button class="post__action">💬 ${post.comments}</button>
      <button class="post__action">↗ Share</button>
    </div>
  </article>
`;

// =============================================================================
// Mode A — Pre-measure all items via hidden DOM element
// =============================================================================

/**
 * Measure the actual rendered height of every item by inserting its HTML
 * into a hidden element that matches the list's inner width.
 *
 * We cache by a content key (text + hasImage + aspect) so items with
 * identical templates share a single measurement. For 5 000 items with
 * ~40 unique combinations this means ~40 DOM measurements, not 5 000.
 */
const measureHeights = (posts, container) => {
  const measurer = document.createElement("div");
  measurer.style.cssText =
    "position:absolute;top:0;left:0;visibility:hidden;pointer-events:none;" +
    `width:${container.offsetWidth}px;`;
  document.body.appendChild(measurer);

  const cache = new Map();
  let uniqueCount = 0;

  for (const post of posts) {
    const key = post.text + (post.image ? post.image.aspect : "");

    if (cache.has(key)) {
      post.height = cache.get(key);
      continue;
    }

    measurer.innerHTML = renderPost(post);
    const measured = measurer.firstElementChild.offsetHeight;
    post.height = measured;
    cache.set(key, measured);
    uniqueCount++;
  }

  measurer.remove();
  return uniqueCount;
};

// =============================================================================
// Setup
// =============================================================================

const TOTAL = 5000;
const ESTIMATED_HEIGHT = 120;
const posts = generatePosts(TOTAL);

// =============================================================================
// DOM references
// =============================================================================

const containerEl = document.getElementById("list-container");
const modeBadgeEl = document.getElementById("mode-badge");
const modeToggleEl = document.getElementById("mode-toggle");

// Panel info elements
const infoStrategyEl = document.getElementById("info-strategy");
const infoInitEl = document.getElementById("info-init");
const infoUniqueEl = document.getElementById("info-unique");

// Footer right side
const ftModeEl = document.getElementById("ft-mode");

// =============================================================================
// Shared footer stats (left side — progress, velocity, items)
// =============================================================================

const stats = createStats({
  getList: () => list,
  getTotal: () => TOTAL,
  getItemHeight: () => ESTIMATED_HEIGHT,
  container: "#list-container",
});

// =============================================================================
// State
// =============================================================================

let currentMode = "b";
let list = null;

// =============================================================================
// Create / recreate list
// =============================================================================

function createList(mode) {
  // Destroy previous
  if (list) {
    list.destroy();
    list = null;
  }
  containerEl.innerHTML = "";

  let initTime = 0;
  let uniqueHeights = 0;

  if (mode === "a") {
    // Mode A: pre-measure all items, then use height function
    const start = performance.now();
    uniqueHeights = measureHeights(posts, containerEl);
    initTime = performance.now() - start;

    list = vlist({
      container: containerEl,
      ariaLabel: "Social feed",
      items: posts,
      item: {
        height: (index) => posts[index]?.height ?? ESTIMATED_HEIGHT,
        template: renderPost,
      },
    }).build();
  } else {
    // Mode B: estimated height, auto-measured by ResizeObserver
    const start = performance.now();

    list = vlist({
      container: containerEl,
      ariaLabel: "Social feed",
      items: posts,
      item: {
        estimatedHeight: ESTIMATED_HEIGHT,
        template: renderPost,
      },
    }).build();

    initTime = performance.now() - start;
    uniqueHeights = 0; // not known upfront
  }

  // Wire up events
  list.on("scroll", stats.scheduleUpdate);
  list.on("range:change", stats.scheduleUpdate);
  list.on("velocity:change", ({ velocity }) => stats.onVelocity(velocity));

  list.on("item:click", ({ item, index }) => {
    console.log(
      `Clicked post by ${item.user}: "${item.text.slice(0, 50)}…" at index ${index}`,
    );
  });

  // Update stats + panel info
  stats.update();
  updatePanelInfo(mode, initTime, uniqueHeights);
}

// =============================================================================
// Panel info + footer context
// =============================================================================

function updatePanelInfo(mode, initTime, uniqueHeights) {
  const isA = mode === "a";
  const label = isA ? "Mode A" : "Mode B";

  modeBadgeEl.textContent = label;
  ftModeEl.textContent = label;

  infoStrategyEl.textContent = isA
    ? "height: (index) => px"
    : "estimatedHeight: 120";

  infoInitEl.textContent = `${initTime.toFixed(0)}ms`;

  infoUniqueEl.textContent = isA ? String(uniqueHeights) : "–";
}

// =============================================================================
// Mode toggle
// =============================================================================

modeToggleEl.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-mode]");
  if (!btn) return;

  const mode = btn.dataset.mode;
  if (mode === currentMode) return;

  currentMode = mode;

  // Update active state
  modeToggleEl.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("panel-segmented__btn--active", b.dataset.mode === mode);
  });

  createList(mode);
});

// =============================================================================
// Navigation controls
// =============================================================================

document.getElementById("jump-top").addEventListener("click", () => {
  list.scrollToIndex(0, { behavior: "smooth" });
});

document.getElementById("jump-middle").addEventListener("click", () => {
  list.scrollToIndex(Math.floor(posts.length / 2), {
    align: "center",
    behavior: "smooth",
  });
});

document.getElementById("jump-bottom").addEventListener("click", () => {
  list.scrollToIndex(posts.length - 1, {
    align: "end",
    behavior: "smooth",
  });
});

document.getElementById("jump-random").addEventListener("click", () => {
  const idx = Math.floor(Math.random() * posts.length);
  list.scrollToIndex(idx, { align: "center", behavior: "smooth" });
});

// =============================================================================
// Initialise with Mode B
// =============================================================================

createList(currentMode);
