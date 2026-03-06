// test/api/posts.test.ts
import { describe, test, expect } from "bun:test";
import {
  generatePost,
  getPosts,
  getAllPosts,
  TOTAL,
  MAX_LIMIT,
  type Post,
} from "../../src/api/posts";

describe("posts", () => {
  describe("generatePost", () => {
    test("returns a post with all required fields", () => {
      const post = generatePost(0, 100);

      expect(post).toHaveProperty("id");
      expect(post).toHaveProperty("user");
      expect(post).toHaveProperty("title");
      expect(post).toHaveProperty("body");
      expect(post).toHaveProperty("time");
      expect(post).toHaveProperty("avatarUrl");
      expect(post).toHaveProperty("likes");
      expect(post).toHaveProperty("comments");
      expect(post).toHaveProperty("shares");
    });

    test("is deterministic - same index produces same post", () => {
      const post1 = generatePost(42, 100);
      const post2 = generatePost(42, 100);

      expect(post1).toEqual(post2);
    });

    test("different indices produce different posts", () => {
      const post1 = generatePost(0, 100);
      const post2 = generatePost(1, 100);

      expect(post1.id).not.toBe(post2.id);
    });

    test("post ID format is correct", () => {
      const post = generatePost(5, 100);
      expect(post.id).toBe("post-5");
    });

    test("user is a full name", () => {
      const post = generatePost(0, 100);
      expect(post.user).toMatch(/^[A-Z][a-z]+ [A-Z][a-z]+$/);
    });

    test("title contains item number", () => {
      const post = generatePost(0, 100);
      expect(post.title).toMatch(/^Item #-\d+$/);
    });

    test("title item number is total - index", () => {
      const post = generatePost(10, 100);
      expect(post.title).toBe("Item #-90");
    });

    test("time format is hours ago", () => {
      const post = generatePost(0, 100);
      expect(post.time).toMatch(/^\d+h ago$/);
    });

    test("time is between 1h and 23h ago", () => {
      for (let i = 0; i < 50; i++) {
        const post = generatePost(i, 100);
        const hours = parseInt(post.time.replace("h ago", ""));
        expect(hours).toBeGreaterThanOrEqual(1);
        expect(hours).toBeLessThanOrEqual(23);
      }
    });

    test("avatarUrl is a pravatar.cc URL", () => {
      const post = generatePost(0, 100);
      expect(post.avatarUrl).toMatch(
        /^https:\/\/i\.pravatar\.cc\/72\?img=\d+$/,
      );
    });

    test("engagement numbers are within expected ranges", () => {
      for (let i = 0; i < 50; i++) {
        const post = generatePost(i, 100);
        expect(post.likes).toBeGreaterThanOrEqual(5);
        expect(post.likes).toBeLessThan(205);
        expect(post.comments).toBeGreaterThanOrEqual(0);
        expect(post.comments).toBeLessThan(50);
        expect(post.shares).toBeGreaterThanOrEqual(0);
        expect(post.shares).toBeLessThan(30);
      }
    });

    test("body is non-empty lorem ipsum text", () => {
      const post = generatePost(0, 100);
      expect(post.body.length).toBeGreaterThan(0);
      expect(post.body).toMatch(/Lorem|Praesent|Cras|Nullam|Maecenas/);
    });
  });

  describe("getPosts", () => {
    test("returns items, total, and hasMore", () => {
      const result = getPosts(0, 10);

      expect(result).toHaveProperty("items");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("hasMore");
      expect(Array.isArray(result.items)).toBe(true);
    });

    test("respects limit parameter", () => {
      const result = getPosts(0, 25);
      expect(result.items.length).toBe(25);
    });

    test("clamps limit to MAX_LIMIT", () => {
      const result = getPosts(0, 500);
      expect(result.items.length).toBe(MAX_LIMIT);
    });

    test("respects offset parameter", () => {
      const result = getPosts(10, 5);
      expect(result.items[0].id).toBe("post-10"); // 0-based IDs
    });

    test("returns correct total", () => {
      const result = getPosts(0, 10);
      expect(result.total).toBe(TOTAL);

      const customTotal = getPosts(0, 10, 1000);
      expect(customTotal.total).toBe(1000);
    });

    test("hasMore is true when more items exist", () => {
      const result = getPosts(0, 10, 100);
      expect(result.hasMore).toBe(true);
    });

    test("hasMore is false at end of dataset", () => {
      const result = getPosts(90, 10, 100);
      expect(result.hasMore).toBe(false);
    });

    test("handles offset beyond total gracefully", () => {
      const result = getPosts(1000, 10, 100);
      expect(result.items.length).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    test("handles negative offset by clamping to 0", () => {
      const result = getPosts(-10, 5, 100);
      expect(result.items[0].id).toBe("post-0");
    });
  });

  describe("getAllPosts", () => {
    test("returns all posts for given total", () => {
      const posts = getAllPosts(50);
      expect(posts.length).toBe(50);
    });

    test("uses TOTAL when no argument provided", () => {
      const posts = getAllPosts();
      expect(posts.length).toBe(TOTAL);
    });

    test("posts are in order", () => {
      const posts = getAllPosts(10);
      for (let i = 0; i < posts.length; i++) {
        expect(posts[i].id).toBe(`post-${i}`);
      }
    });

    test("each post is a valid Post object", () => {
      const posts = getAllPosts(10);
      for (const post of posts) {
        expect(post).toHaveProperty("id");
        expect(post).toHaveProperty("user");
        expect(post).toHaveProperty("title");
        expect(post).toHaveProperty("body");
      }
    });
  });

  describe("constants", () => {
    test("TOTAL is 5000", () => {
      expect(TOTAL).toBe(5000);
    });

    test("MAX_LIMIT is 200", () => {
      expect(MAX_LIMIT).toBe(200);
    });
  });
});
