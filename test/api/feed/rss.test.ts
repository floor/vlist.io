// test/api/feed/rss.test.ts
import { describe, test, expect, mock, afterEach } from "bun:test";
import { rssSource } from "../../../src/api/feed/rss";

// Sample RSS 2.0 feed
const createRssFeed = (items: string[] = []) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Test Feed</title>
    <link>https://example.com</link>
    <description>A test RSS feed</description>
    ${items.join("\n")}
  </channel>
</rss>`;

// Sample Atom feed
const createAtomFeed = (entries: string[] = []) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Atom Feed</title>
  <link href="https://example.com"/>
  ${entries.join("\n")}
</feed>`;

const createRssItem = (options: Partial<{
  title: string;
  link: string;
  description: string;
  author: string;
  pubDate: string;
  guid: string;
  category: string;
  enclosure: string;
}> = {}) => `
<item>
  <title>${options.title ?? "Test Item"}</title>
  <link>${options.link ?? "https://example.com/article"}</link>
  <description>${options.description ?? "Test description"}</description>
  ${options.author ? `<author>${options.author}</author>` : ""}
  ${options.pubDate ? `<pubDate>${options.pubDate}</pubDate>` : ""}
  ${options.guid ? `<guid>${options.guid}</guid>` : ""}
  ${options.category ? `<category>${options.category}</category>` : ""}
  ${options.enclosure ?? ""}
</item>`;

const createAtomEntry = (options: Partial<{
  title: string;
  link: string;
  content: string;
  author: string;
  published: string;
  id: string;
}> = {}) => `
<entry>
  <title>${options.title ?? "Test Entry"}</title>
  <link href="${options.link ?? "https://example.com/entry"}"/>
  <content>${options.content ?? "Test content"}</content>
  ${options.author ? `<author><name>${options.author}</name></author>` : ""}
  ${options.published ? `<published>${options.published}</published>` : ""}
  ${options.id ? `<id>${options.id}</id>` : ""}
</entry>`;

describe("feed/rss", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("rssSource", () => {
    test("has correct id", () => {
      expect(rssSource.id).toBe("rss");
    });

    test("has fetch function", () => {
      expect(typeof rssSource.fetch).toBe("function");
    });
  });

  describe("fetch", () => {
    test("fetches and parses RSS feed", async () => {
      const feed = createRssFeed([
        createRssItem({ title: "Post 1" }),
        createRssItem({ title: "Post 2" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.source).toBe("rss");
      expect(result.target).toBe("https://example.com/feed.xml");
      expect(result.nextCursor).toBeNull(); // RSS doesn't paginate
    });

    test("fetches and parses Atom feed", async () => {
      const feed = createAtomFeed([
        createAtomEntry({ title: "Entry 1" }),
        createAtomEntry({ title: "Entry 2" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/atom.xml",
        limit: 10,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.posts[0].title).toBe("Entry 1");
    });

    test("throws for invalid URL", async () => {
      await expect(
        rssSource.fetch({ target: "not-a-url", limit: 10 }),
      ).rejects.toThrow("Invalid RSS feed URL");
    });

    test("throws for empty URL", async () => {
      await expect(
        rssSource.fetch({ target: "", limit: 10 }),
      ).rejects.toThrow("Invalid RSS feed URL");
    });

    test("respects limit parameter", async () => {
      const feed = createRssFeed([
        createRssItem({ title: "Post 1" }),
        createRssItem({ title: "Post 2" }),
        createRssItem({ title: "Post 3" }),
        createRssItem({ title: "Post 4" }),
        createRssItem({ title: "Post 5" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 3,
      });

      expect(result.posts).toHaveLength(3);
    });

    test("clamps limit to max 100", async () => {
      const feed = createRssFeed([createRssItem()]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      // Should not throw, just clamp
      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 500,
      });

      expect(result.posts.length).toBeLessThanOrEqual(100);
    });

    test("throws on fetch error", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("Not Found", { status: 404 })),
      );

      await expect(
        rssSource.fetch({ target: "https://example.com/missing.xml", limit: 10 }),
      ).rejects.toThrow("Feed returned 404");
    });

    test("normalises RSS item correctly", async () => {
      const feed = createRssFeed([
        createRssItem({
          title: "Test Article",
          link: "https://example.com/article/123",
          description: "This is the article description",
          author: "John Doe",
          pubDate: "Mon, 01 Jan 2024 12:00:00 GMT",
          guid: "article-123",
          category: "Technology",
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      const post = result.posts[0];
      expect(post.title).toBe("Test Article");
      expect(post.url).toBe("https://example.com/article/123");
      expect(post.text).toBe("This is the article description");
      expect(post.user).toBe("John Doe");
      expect(post.id).toBe("article-123");
      expect(post.tags).toContain("Technology");
      expect(post.source).toBe("rss");
    });

    test("normalises Atom entry correctly", async () => {
      const feed = createAtomFeed([
        createAtomEntry({
          title: "Atom Article",
          link: "https://example.com/atom/456",
          content: "Atom content here",
          author: "Jane Smith",
          published: "2024-01-15T10:30:00Z",
          id: "urn:uuid:atom-456",
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/atom.xml",
        limit: 10,
      });

      const post = result.posts[0];
      expect(post.title).toBe("Atom Article");
      expect(post.url).toBe("https://example.com/atom/456");
      expect(post.text).toBe("Atom content here");
      expect(post.user).toBe("Jane Smith");
      expect(post.id).toBe("urn:uuid:atom-456");
    });

    test("generates initials from author name", async () => {
      const feed = createRssFeed([
        createRssItem({ author: "John Doe" }),
        createRssItem({ author: "SingleName" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].initials).toBe("JD");
      expect(result.posts[1].initials).toBe("SI");
    });

    test("falls back to feed title when no author", async () => {
      const feed = createRssFeed([
        createRssItem({ title: "No Author Post" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].user).toBe("Test Feed");
    });

    test("generates deterministic avatar colors", async () => {
      const feed = createRssFeed([
        createRssItem({ author: "user1" }),
        createRssItem({ author: "user1" }),
        createRssItem({ author: "user2" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      // Same author should have same color
      expect(result.posts[0].color).toBe(result.posts[1].color);
      // Color should be valid hex
      expect(result.posts[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    test("extracts images from enclosure", async () => {
      const feed = createRssFeed([
        createRssItem({
          title: "Post with image",
          enclosure: '<enclosure url="https://example.com/image.jpg" type="image/jpeg" />',
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].hasImage).toBe(true);
      expect(result.posts[0].image?.url).toBe("https://example.com/image.jpg");
    });

    test("extracts images from description HTML", async () => {
      const feed = createRssFeed([
        createRssItem({
          description: '<p>Text</p><img src="https://example.com/inline.png" /><p>More text</p>',
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].hasImage).toBe(true);
      expect(result.posts[0].image?.url).toBe("https://example.com/inline.png");
    });

    test("strips HTML from description", async () => {
      const feed = createRssFeed([
        createRssItem({
          description: "<p>This is <strong>bold</strong> and <em>italic</em> text.</p>",
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].text).toBe("This is bold and italic text.");
    });

    test("handles CDATA sections", async () => {
      const feed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>CDATA Feed</title>
    <item>
      <title><![CDATA[Title with <special> chars]]></title>
      <description><![CDATA[Description with <html>tags</html>]]></description>
      <link>https://example.com/cdata</link>
    </item>
  </channel>
</rss>`;

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].title).toBe("Title with <special> chars");
    });

    test("decodes XML entities", async () => {
      const feed = createRssFeed([
        createRssItem({
          title: "Tom &amp; Jerry &lt;3",
          description: "&quot;Hello&quot; &apos;World&apos;",
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].title).toBe("Tom & Jerry <3");
      expect(result.posts[0].text).toBe('"Hello" \'World\'');
    });

    test("handles missing optional fields gracefully", async () => {
      const feed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Minimal Feed</title>
    <item>
      <title>Minimal Item</title>
    </item>
  </channel>
</rss>`;

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].title).toBe("Minimal Item");
      expect(result.posts[0].url).toBeNull();
      expect(result.posts[0].text).toBe("");
      expect(result.posts[0].hasImage).toBe(false);
    });

    test("truncates long text", async () => {
      const longText = "A".repeat(600);
      const feed = createRssFeed([
        createRssItem({ description: longText }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].text.length).toBeLessThanOrEqual(500);
    });

    test("extracts multiple categories as tags", async () => {
      const feed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Tagged Feed</title>
    <item>
      <title>Multi-category Post</title>
      <link>https://example.com</link>
      <category>Tech</category>
      <category>News</category>
      <category>Featured</category>
    </item>
  </channel>
</rss>`;

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].tags).toContain("Tech");
      expect(result.posts[0].tags).toContain("News");
      expect(result.posts[0].tags).toContain("Featured");
    });

    test("limits tags to 3", async () => {
      const feed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Many Tags Feed</title>
    <item>
      <title>Post</title>
      <link>https://example.com</link>
      <category>One</category>
      <category>Two</category>
      <category>Three</category>
      <category>Four</category>
      <category>Five</category>
    </item>
  </channel>
</rss>`;

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].tags.length).toBeLessThanOrEqual(3);
    });

    test("generates relative time from pubDate", async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const feed = createRssFeed([
        createRssItem({ pubDate: twoHoursAgo.toUTCString() }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].time).toBe("2h ago");
    });

    test("upgrades BBC image URLs", async () => {
      const feed = createRssFeed([
        createRssItem({
          enclosure: '<enclosure url="https://ichef.bbci.co.uk/news/standard/240/image.jpg" type="image/jpeg" />',
        }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://feeds.bbci.co.uk/news/rss.xml",
        limit: 10,
      });

      expect(result.posts[0].image?.url).toContain("/standard/800/");
    });

    test("returns total as posts length", async () => {
      const feed = createRssFeed([
        createRssItem({ title: "Post 1" }),
        createRssItem({ title: "Post 2" }),
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.total).toBe(2);
    });

    test("sets likes and comments to 0 for RSS", async () => {
      const feed = createRssFeed([createRssItem()]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(feed)),
      );

      const result = await rssSource.fetch({
        target: "https://example.com/feed.xml",
        limit: 10,
      });

      expect(result.posts[0].likes).toBe(0);
      expect(result.posts[0].comments).toBe(0);
    });
  });
});
