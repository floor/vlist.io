// test/api/feed/reddit.test.ts
import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { redditSource, REDDIT_PRESETS } from "../../../src/api/feed/reddit";

// Mock Reddit API response
const createMockRedditResponse = (posts: Array<Partial<MockRedditPost>> = []) => {
  const children = posts.map((post, i) => ({
    kind: "t3",
    data: {
      id: post.id ?? `abc${i}`,
      name: post.name ?? `t3_abc${i}`,
      title: post.title ?? `Test Post ${i}`,
      selftext: post.selftext ?? "",
      author: post.author ?? "testuser",
      subreddit: post.subreddit ?? "worldnews",
      score: post.score ?? 100,
      num_comments: post.num_comments ?? 10,
      created_utc: post.created_utc ?? Math.floor(Date.now() / 1000) - 3600,
      url: post.url ?? "https://example.com",
      permalink: post.permalink ?? "/r/worldnews/comments/abc123/test",
      is_self: post.is_self ?? false,
      link_flair_text: post.link_flair_text ?? null,
      preview: post.preview,
    },
  }));

  return {
    data: {
      after: posts.length > 0 ? "t3_nextcursor" : null,
      children,
      dist: children.length,
    },
  };
};

interface MockRedditPost {
  id: string;
  name: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  permalink: string;
  is_self: boolean;
  link_flair_text: string | null;
  preview?: {
    images: Array<{
      source: { url: string; width: number; height: number };
      resolutions: Array<{ url: string; width: number; height: number }>;
    }>;
  };
}

describe("feed/reddit", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("redditSource", () => {
    test("has correct id", () => {
      expect(redditSource.id).toBe("reddit");
    });

    test("has fetch function", () => {
      expect(typeof redditSource.fetch).toBe("function");
    });
  });

  describe("fetch", () => {
    test("fetches posts from subreddit", async () => {
      const mockResponse = createMockRedditResponse([
        { title: "Post 1", author: "user1" },
        { title: "Post 2", author: "user2" },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "worldnews",
        limit: 10,
      });

      expect(result.posts).toHaveLength(2);
      expect(result.source).toBe("reddit");
      expect(result.target).toBe("worldnews");
      expect(result.nextCursor).toBe("t3_nextcursor");
    });

    test("strips r/ prefix from target", async () => {
      const mockResponse = createMockRedditResponse([{ title: "Post 1" }]);

      let capturedUrl = "";
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      });

      await redditSource.fetch({
        target: "r/technology",
        limit: 10,
      });

      expect(capturedUrl).toContain("/r/technology/");
      expect(capturedUrl).not.toContain("/r/r/");
    });

    test("uses default subreddit when target is empty", async () => {
      const mockResponse = createMockRedditResponse([{ title: "Post 1" }]);

      let capturedUrl = "";
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      });

      await redditSource.fetch({
        target: "",
        limit: 10,
      });

      expect(capturedUrl).toContain("/r/worldnews/");
    });

    test("respects limit parameter", async () => {
      const mockResponse = createMockRedditResponse([
        { title: "Post 1" },
        { title: "Post 2" },
      ]);

      let capturedUrl = "";
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      });

      await redditSource.fetch({
        target: "news",
        limit: 25,
      });

      expect(capturedUrl).toContain("limit=25");
    });

    test("clamps limit to max 100", async () => {
      const mockResponse = createMockRedditResponse([]);

      let capturedUrl = "";
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      });

      await redditSource.fetch({
        target: "news",
        limit: 500,
      });

      expect(capturedUrl).toContain("limit=100");
    });

    test("passes after cursor for pagination", async () => {
      const mockResponse = createMockRedditResponse([]);

      let capturedUrl = "";
      globalThis.fetch = mock((url: string) => {
        capturedUrl = url;
        return Promise.resolve(new Response(JSON.stringify(mockResponse)));
      });

      await redditSource.fetch({
        target: "news",
        limit: 10,
        after: "t3_abc123",
      });

      expect(capturedUrl).toContain("after=t3_abc123");
    });

    test("throws on API error", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("Not Found", { status: 404 })),
      );

      await expect(
        redditSource.fetch({ target: "nonexistent", limit: 10 }),
      ).rejects.toThrow("Reddit API error 404");
    });

    test("normalises post data correctly", async () => {
      const mockResponse = createMockRedditResponse([
        {
          id: "test123",
          name: "t3_test123",
          title: "Test Title",
          selftext: "This is the post body",
          author: "TestAuthor",
          subreddit: "technology",
          score: 500,
          num_comments: 50,
          created_utc: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
          url: "https://example.com/article",
          permalink: "/r/technology/comments/test123/test",
          is_self: true,
          link_flair_text: "News",
        },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "technology",
        limit: 10,
      });

      const post = result.posts[0];
      expect(post.id).toBe("t3_test123");
      expect(post.user).toBe("TestAuthor");
      expect(post.title).toBe("Test Title");
      expect(post.text).toBe("This is the post body");
      expect(post.likes).toBe(500);
      expect(post.comments).toBe(50);
      expect(post.source).toBe("reddit");
      expect(post.url).toContain("reddit.com");
      expect(post.tags).toContain("News");
      expect(post.tags).toContain("r/technology");
    });

    test("generates initials from author name", async () => {
      const mockResponse = createMockRedditResponse([
        { author: "john_doe" },
        { author: "SingleName" },
        { author: "a" },
        { author: "" }, // empty author
        { author: "   " }, // whitespace only
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "test",
        limit: 10,
      });

      expect(result.posts[0].initials).toBe("JD");
      expect(result.posts[1].initials).toBe("SI");
      expect(result.posts[2].initials).toBe("A");
      expect(result.posts[3].initials).toBe("?"); // empty string fallback
      expect(result.posts[4].initials).toBe("?"); // whitespace fallback
    });

    test("generates deterministic avatar colors", async () => {
      const mockResponse = createMockRedditResponse([
        { author: "user1" },
        { author: "user1" }, // Same user
        { author: "user2" },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "test",
        limit: 10,
      });

      // Same author should have same color
      expect(result.posts[0].color).toBe(result.posts[1].color);
      // Color should be a valid hex
      expect(result.posts[0].color).toMatch(/^#[0-9a-f]{6}$/i);
    });

    test("extracts images from preview", async () => {
      const mockResponse = createMockRedditResponse([
        {
          title: "Post with image",
          preview: {
            images: [
              {
                source: { url: "https://i.redd.it/full.jpg", width: 1200, height: 800 },
                resolutions: [
                  { url: "https://i.redd.it/small.jpg", width: 320, height: 213 },
                  { url: "https://i.redd.it/medium.jpg", width: 640, height: 427 },
                ],
              },
            ],
          },
        },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "pics",
        limit: 10,
      });

      expect(result.posts[0].hasImage).toBe(true);
      expect(result.posts[0].image).not.toBeNull();
      expect(result.posts[0].image?.url).toContain("medium.jpg");
    });

    test("extracts images from direct URL", async () => {
      const mockResponse = createMockRedditResponse([
        {
          title: "Direct image",
          url: "https://i.imgur.com/test.jpg",
        },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "pics",
        limit: 10,
      });

      expect(result.posts[0].hasImage).toBe(true);
      expect(result.posts[0].image?.url).toBe("https://i.imgur.com/test.jpg");
    });

    test("handles posts without images", async () => {
      const mockResponse = createMockRedditResponse([
        {
          title: "Text post",
          url: "https://reddit.com/self",
          is_self: true,
        },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "askreddit",
        limit: 10,
      });

      expect(result.posts[0].hasImage).toBe(false);
      expect(result.posts[0].image).toBeNull();
    });

    test("truncates long selftext", async () => {
      const longText = "A".repeat(600);
      const mockResponse = createMockRedditResponse([
        {
          selftext: longText,
          is_self: true,
        },
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "test",
        limit: 10,
      });

      expect(result.posts[0].text.length).toBeLessThanOrEqual(500);
      expect(result.posts[0].text.endsWith("…")).toBe(true);
    });

    test("generates relative time strings", async () => {
      const now = Math.floor(Date.now() / 1000);
      const mockResponse = createMockRedditResponse([
        { created_utc: now - 30 }, // 30 seconds ago
        { created_utc: now - 1800 }, // 30 minutes ago
        { created_utc: now - 7200 }, // 2 hours ago
        { created_utc: now - 86400 }, // 1 day ago
        { created_utc: now - 86400 * 45 }, // 45 days ago (~1.5 months)
        { created_utc: now - 86400 * 400 }, // 400 days ago (~13 months)
      ]);

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(mockResponse))),
      );

      const result = await redditSource.fetch({
        target: "test",
        limit: 10,
      });

      expect(result.posts[0].time).toBe("just now");
      expect(result.posts[1].time).toBe("30m ago");
      expect(result.posts[2].time).toBe("2h ago");
      expect(result.posts[3].time).toBe("1d ago");
      expect(result.posts[4].time).toBe("1mo ago");
      expect(result.posts[5].time).toBe("1y ago");
    });

    test("filters out non-post items", async () => {
      const response = {
        data: {
          after: null,
          children: [
            { kind: "t3", data: { id: "post1", name: "t3_post1", title: "Real Post", selftext: "", author: "user", subreddit: "test", score: 10, num_comments: 1, created_utc: Date.now() / 1000, url: "", permalink: "/r/test/1", is_self: false, link_flair_text: null } },
            { kind: "t1", data: { id: "comment1" } }, // Comment, should be filtered
          ],
          dist: 2,
        },
      };

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify(response))),
      );

      const result = await redditSource.fetch({
        target: "test",
        limit: 10,
      });

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].title).toBe("Real Post");
    });
  });

  describe("REDDIT_PRESETS", () => {
    test("contains expected presets", () => {
      expect(REDDIT_PRESETS.length).toBeGreaterThan(5);

      const values = REDDIT_PRESETS.map((p) => p.value);
      expect(values).toContain("worldnews");
      expect(values).toContain("technology");
    });
  });
});
