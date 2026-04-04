// src/api/feed/rss.ts
// RSS/Atom feed adapter.
// Fetches any public RSS or Atom feed, parses the XML, and normalises items
// into the shared FeedPost shape.
//
// No external dependencies — uses native fetch + simple XML text parsing.
// Runs server-side only (Bun), so no CORS issues.

import type {
  FeedSource,
  FeedParams,
  FeedResponse,
  FeedPost,
  FeedImage,
} from "./types";

// =============================================================================
// Constants
// =============================================================================

const USER_AGENT = "vlist.io/1.0 (https://vlist.io; demo feed reader)";
const MAX_LIMIT = 100;
const FETCH_TIMEOUT_MS = 10_000;

// =============================================================================
// Avatar colour — deterministic from string
// =============================================================================

const AVATAR_COLORS = [
  "#e53935",
  "#d81b60",
  "#8e24aa",
  "#5e35b1",
  "#3949ab",
  "#1e88e5",
  "#039be5",
  "#00acc1",
  "#00897b",
  "#43a047",
  "#7cb342",
  "#fb8c00",
  "#f4511e",
  "#6d4c41",
  "#546e7a",
  "#26a69a",
  "#ec407a",
  "#ab47bc",
  "#7e57c2",
  "#5c6bc0",
];

const colorFromString = (str: string): string => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// =============================================================================
// Initials
// =============================================================================

const toInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/[\s_\-]+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// =============================================================================
// Relative time
// =============================================================================

const relativeTime = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "just now";
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
};

// =============================================================================
// Minimal XML helpers — no dependency, just text extraction
// =============================================================================

/**
 * Extract the text content of the first occurrence of a tag.
 * Handles both <tag>text</tag> and <tag><![CDATA[text]]></tag>.
 */
const getTagText = (xml: string, tag: string): string | null => {
  // Try namespaced and non-namespaced variants
  const patterns = [
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i"),
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"),
  ];
  for (const re of patterns) {
    const match = xml.match(re);
    if (match) return decodeXmlEntities(match[1].trim());
  }
  return null;
};

/**
 * Extract an attribute value from a tag.
 * e.g. getAttr('<enclosure url="http://..." />', 'url') → 'http://...'
 */
const getAttr = (xml: string, attr: string): string | null => {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*?)["']`, "i");
  const match = xml.match(re);
  return match ? decodeXmlEntities(match[1]) : null;
};

/** Decode common XML entities */
const decodeXmlEntities = (str: string): string =>
  str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16)),
    );

/** Strip all HTML tags */
const stripHtml = (html: string): string =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

// =============================================================================
// Feed type detection + item splitting
// =============================================================================

interface RawItem {
  xml: string;
}

interface ParsedFeed {
  feedTitle: string;
  items: RawItem[];
  isAtom: boolean;
}

/**
 * Split a feed XML string into individual item chunks.
 * Supports both RSS 2.0 (<item>) and Atom (<entry>).
 */
const parseFeedXml = (xml: string): ParsedFeed => {
  const isAtom = /<feed[\s>]/i.test(xml);

  // Feed title
  let feedTitle = "";
  if (isAtom) {
    // Atom: <feed><title>...</title> — but avoid picking up <entry><title>
    const feedMatch = xml.match(/<feed[\s\S]*?(?=<entry[\s>])/i);
    if (feedMatch) {
      feedTitle = getTagText(feedMatch[0], "title") ?? "";
    }
  } else {
    // RSS: <channel><title>...</title> — before <item>
    const channelMatch = xml.match(/<channel[\s\S]*?(?=<item[\s>])/i);
    if (channelMatch) {
      feedTitle = getTagText(channelMatch[0], "title") ?? "";
    }
  }

  const tag = isAtom ? "entry" : "item";
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, "gi");
  const items: RawItem[] = [];
  let match: RegExpExecArray | null;

  while ((match = re.exec(xml)) !== null) {
    items.push({ xml: match[0] });
  }

  return { feedTitle, items, isAtom };
};

// =============================================================================
// Image extraction from RSS/Atom items
// =============================================================================

/**
 * Upgrade thumbnail URLs to higher-resolution variants where the CDN supports it.
 * Many feeds serve tiny thumbnails (240px) but the same CDN path accepts larger sizes.
 */
const upgradeImageUrl = (url: string): string => {
  // BBC: /standard/240/ → /standard/800/
  if (url.includes("ichef.bbci.co.uk") && url.includes("/standard/")) {
    return url.replace(/\/standard\/\d+\//, "/standard/800/");
  }
  // NYT: -thumbStandard, -thumbLarge → -superJumbo (or remove size suffix)
  if (url.includes("nytimes.com") && /-thumb(Standard|Large)/.test(url)) {
    return url.replace(/-thumb(Standard|Large)/, "-superJumbo");
  }
  // Ars Technica: crop dimensions in URL → remove to get full image
  if (url.includes("cdn.arstechnica.net") && /\/\d+x\d+\//.test(url)) {
    return url.replace(/\/\d+x\d+\//, "/");
  }
  return url;
};

const extractImage = (itemXml: string): FeedImage | null => {
  let url: string | null = null;

  // 1. <enclosure type="image/..." url="...">
  const enclosureMatch =
    itemXml.match(/<enclosure[^>]*type\s*=\s*["']image\/[^"']*["'][^>]*>/i) ??
    itemXml.match(
      /<enclosure[^>]*url\s*=\s*["'][^"']*\.(jpe?g|png|gif|webp)[^"']*["'][^>]*>/i,
    );
  if (enclosureMatch) {
    url = getAttr(enclosureMatch[0], "url");
    if (url) return { url: upgradeImageUrl(url), alt: "", aspect: "wide" };
  }

  // 2. <media:content url="..."> or <media:thumbnail url="...">
  const mediaMatch = itemXml.match(
    /<media:(content|thumbnail)[^>]*url\s*=\s*["']([^"']+)["'][^>]*>/i,
  );
  if (mediaMatch) {
    url = decodeXmlEntities(mediaMatch[2]);
    return { url: upgradeImageUrl(url), alt: "", aspect: "wide" };
  }

  // 3. First <img src="..."> in description/content
  const descHtml =
    getTagText(itemXml, "description") ??
    getTagText(itemXml, "content:encoded") ??
    getTagText(itemXml, "content") ??
    "";
  const imgMatch = descHtml.match(/<img[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/i);
  if (imgMatch) {
    url = decodeXmlEntities(imgMatch[1]);
    // Skip tracking pixels and tiny icons
    if (
      !url.includes("feedburner") &&
      !url.includes("piwik") &&
      !url.includes("1x1")
    ) {
      return { url: upgradeImageUrl(url), alt: "", aspect: "wide" };
    }
  }

  return null;
};

// =============================================================================
// Normalise a single RSS/Atom item → FeedPost
// =============================================================================

let itemCounter = 0;

const normaliseItem = (
  raw: RawItem,
  isAtom: boolean,
  feedTitle: string,
): FeedPost => {
  const xml = raw.xml;

  // Title
  const title = getTagText(xml, "title") ?? null;

  // Link
  let link: string | null = null;
  if (isAtom) {
    // Atom: <link href="..." rel="alternate" /> or just <link href="...">
    const linkMatch = xml.match(/<link[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/i);
    if (linkMatch) link = decodeXmlEntities(linkMatch[1]);
  } else {
    link = getTagText(xml, "link");
  }

  // Author — getTagText returns null for missing tags, but some feeds have
  // empty tags (e.g. <dc:creator>\n</dc:creator>). Treat blank as missing.
  const authorRaw =
    getTagText(xml, "author") ||
    getTagText(xml, "dc:creator") ||
    getTagText(xml, "name") || // Atom nests <name> inside <author>
    feedTitle ||
    "Unknown";
  const author = authorRaw.trim() || feedTitle || "Unknown";

  // Date
  const dateStr =
    getTagText(xml, "pubDate") ??
    getTagText(xml, "published") ??
    getTagText(xml, "updated") ??
    getTagText(xml, "dc:date");
  const date = dateStr ? new Date(dateStr) : new Date();
  const time = isNaN(date.getTime()) ? "recently" : relativeTime(date);

  // Body text — strip HTML
  const rawDesc =
    getTagText(xml, "description") ??
    getTagText(xml, "content:encoded") ??
    getTagText(xml, "content") ??
    getTagText(xml, "summary") ??
    "";
  const text = stripHtml(rawDesc).slice(0, 500);

  // Image
  const image = extractImage(xml);

  // ID
  const id =
    getTagText(xml, "guid") ??
    getTagText(xml, "id") ??
    link ??
    `rss-${itemCounter++}`;

  // Tags — use categories if available
  const categories: string[] = [];
  const catRe =
    /<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
  let catMatch: RegExpExecArray | null;
  while ((catMatch = catRe.exec(xml)) !== null && categories.length < 3) {
    const cat = stripHtml(catMatch[1]).slice(0, 24);
    if (cat) categories.push(cat);
  }

  return {
    id,
    user: stripHtml(author),
    initials: toInitials(stripHtml(author)),
    color: colorFromString(stripHtml(author)),
    title,
    text,
    hasImage: image !== null,
    image,
    tags: categories,
    time,
    likes: 0,
    comments: 0,
    source: "rss",
    url: link,
  };
};

// =============================================================================
// Fetch
// =============================================================================

const fetchRss = async (params: FeedParams): Promise<FeedResponse> => {
  const feedUrl = params.target;
  const limit = Math.min(Math.max(1, params.limit), MAX_LIMIT);

  if (!feedUrl || !feedUrl.startsWith("http")) {
    throw new Error(`Invalid RSS feed URL: "${feedUrl}"`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let xml: string;
  try {
    const res = await fetch(feedUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Feed returned ${res.status}: ${body.slice(0, 120)}`);
    }

    xml = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const { feedTitle, items, isAtom } = parseFeedXml(xml);

  const posts = items
    .slice(0, limit)
    .map((item) => normaliseItem(item, isAtom, feedTitle));

  return {
    posts,
    nextCursor: null, // RSS feeds don't paginate via cursor
    total: posts.length,
    source: "rss",
    target: feedUrl,
  };
};

// =============================================================================
// Adapter export
// =============================================================================

export const rssSource: FeedSource = {
  id: "rss",
  fetch: fetchRss,
};
