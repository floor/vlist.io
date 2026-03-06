// test/server/cache.test.ts
import { describe, test, expect } from "bun:test";
import {
  CACHE_IMMUTABLE,
  CACHE_PAGE,
  CACHE_META,
  CACHE_API,
  CACHE_API_DOCS,
  CACHE_NOCACHE,
  htmlHeaders,
  jsonHeaders,
} from "../../src/server/cache";

describe("cache", () => {
  describe("cache constants", () => {
    test("CACHE_IMMUTABLE is configured for long-term caching", () => {
      expect(CACHE_IMMUTABLE).toContain("public");
      expect(CACHE_IMMUTABLE).toContain("immutable");
      expect(CACHE_IMMUTABLE).toContain("max-age=31536000"); // 1 year
    });

    test("CACHE_PAGE has edge caching with browser revalidation", () => {
      expect(CACHE_PAGE).toContain("public");
      expect(CACHE_PAGE).toContain("s-maxage=3600"); // 1 hour edge cache
      expect(CACHE_PAGE).toContain("max-age=0"); // browser always revalidates
      expect(CACHE_PAGE).toContain("stale-while-revalidate");
    });

    test("CACHE_META has both edge and browser caching", () => {
      expect(CACHE_META).toContain("public");
      expect(CACHE_META).toContain("s-maxage=3600");
      expect(CACHE_META).toContain("max-age=3600");
    });

    test("CACHE_API has short edge caching, no browser cache", () => {
      expect(CACHE_API).toContain("public");
      expect(CACHE_API).toContain("s-maxage=300"); // 5 minutes
      expect(CACHE_API).toContain("max-age=0");
    });

    test("CACHE_API_DOCS matches CACHE_PAGE", () => {
      expect(CACHE_API_DOCS).toBe(CACHE_PAGE);
    });

    test("CACHE_NOCACHE prevents caching", () => {
      expect(CACHE_NOCACHE).toBe("no-cache");
    });
  });

  describe("htmlHeaders", () => {
    test("returns correct content type", () => {
      const headers = htmlHeaders();
      expect(headers["Content-Type"]).toBe("text/html; charset=utf-8");
    });

    test("includes cache control for pages", () => {
      const headers = htmlHeaders();
      expect(headers["Cache-Control"]).toBe(CACHE_PAGE);
    });

    test("returns object with expected keys", () => {
      const headers = htmlHeaders();
      expect(Object.keys(headers)).toContain("Content-Type");
      expect(Object.keys(headers)).toContain("Cache-Control");
    });
  });

  describe("jsonHeaders", () => {
    test("returns correct content type", () => {
      const headers = jsonHeaders();
      expect(headers["Content-Type"]).toBe("application/json; charset=utf-8");
    });

    test("includes cache control for API", () => {
      const headers = jsonHeaders();
      expect(headers["Cache-Control"]).toBe(CACHE_API);
    });

    test("returns object with expected keys", () => {
      const headers = jsonHeaders();
      expect(Object.keys(headers)).toContain("Content-Type");
      expect(Object.keys(headers)).toContain("Cache-Control");
    });
  });

  describe("cache header parsing", () => {
    test("CACHE_IMMUTABLE can be parsed", () => {
      const parts = CACHE_IMMUTABLE.split(", ");
      expect(parts).toContain("public");
      expect(parts).toContain("immutable");
    });

    test("CACHE_PAGE contains stale-while-revalidate directive", () => {
      expect(CACHE_PAGE).toMatch(/stale-while-revalidate=\d+/);
    });

    test("all cache values are non-empty strings", () => {
      const cacheValues = [
        CACHE_IMMUTABLE,
        CACHE_PAGE,
        CACHE_META,
        CACHE_API,
        CACHE_API_DOCS,
        CACHE_NOCACHE,
      ];

      for (const value of cacheValues) {
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    });
  });
});
