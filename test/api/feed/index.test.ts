// test/api/feed/index.test.ts
import { describe, test, expect } from "bun:test";
import {
  feedSourceIds,
  getFeedSource,
  fetchFeed,
  REDDIT_PRESETS,
  type FeedSourceId,
} from "../../../src/api/feed/index";

describe("feed/index", () => {
  describe("feedSourceIds", () => {
    test("contains reddit and rss", () => {
      expect(feedSourceIds).toContain("reddit");
      expect(feedSourceIds).toContain("rss");
    });

    test("has exactly 2 sources", () => {
      expect(feedSourceIds).toHaveLength(2);
    });
  });

  describe("getFeedSource", () => {
    test("returns reddit source for 'reddit'", () => {
      const source = getFeedSource("reddit");
      expect(source).not.toBeNull();
      expect(source?.id).toBe("reddit");
      expect(typeof source?.fetch).toBe("function");
    });

    test("returns rss source for 'rss'", () => {
      const source = getFeedSource("rss");
      expect(source).not.toBeNull();
      expect(source?.id).toBe("rss");
      expect(typeof source?.fetch).toBe("function");
    });

    test("returns null for unknown source", () => {
      expect(getFeedSource("unknown")).toBeNull();
      expect(getFeedSource("twitter")).toBeNull();
      expect(getFeedSource("")).toBeNull();
    });
  });

  describe("fetchFeed", () => {
    test("throws for unknown source", () => {
      expect(() =>
        fetchFeed({
          source: "unknown" as FeedSourceId,
          target: "test",
          limit: 10,
        }),
      ).toThrow('Unknown feed source: "unknown"');
    });
  });

  describe("REDDIT_PRESETS", () => {
    test("is an array of presets", () => {
      expect(Array.isArray(REDDIT_PRESETS)).toBe(true);
      expect(REDDIT_PRESETS.length).toBeGreaterThan(0);
    });

    test("each preset has label and value", () => {
      for (const preset of REDDIT_PRESETS) {
        expect(preset).toHaveProperty("label");
        expect(preset).toHaveProperty("value");
        expect(typeof preset.label).toBe("string");
        expect(typeof preset.value).toBe("string");
      }
    });

    test("labels start with r/", () => {
      for (const preset of REDDIT_PRESETS) {
        expect(preset.label.startsWith("r/")).toBe(true);
      }
    });

    test("values are subreddit names without r/ prefix", () => {
      for (const preset of REDDIT_PRESETS) {
        expect(preset.value.startsWith("r/")).toBe(false);
      }
    });

    test("contains expected popular subreddits", () => {
      const values = REDDIT_PRESETS.map((p) => p.value);
      expect(values).toContain("worldnews");
      expect(values).toContain("technology");
      expect(values).toContain("science");
    });
  });
});
