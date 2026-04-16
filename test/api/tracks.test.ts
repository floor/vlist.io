// test/api/tracks.test.ts
import { describe, test, expect } from "bun:test";
import {
  getTracks,
  getTrackById,
  createTrack,
  updateTrack,
  deleteTrack,
  getCountries,
  getDecades,
  getCategories,
  getStats,
  parseQueryOptions,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "../../src/api/tracks";

describe("tracks", () => {
  describe("getTracks", () => {
    test("returns paginated results with defaults", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "id",
        direction: "desc",
      });

      expect(result.items).toHaveLength(10);
      expect(result.total).toBeGreaterThan(0);
      expect(typeof result.hasMore).toBe("boolean");
    });

    test("each track has all required fields", () => {
      const result = getTracks({
        offset: 0,
        limit: 1,
        sort: "id",
        direction: "desc",
      });

      const track = result.items[0];
      expect(track).toHaveProperty("id");
      expect(track).toHaveProperty("mongo_id");
      expect(track).toHaveProperty("title");
      expect(track).toHaveProperty("artist");
      expect(track).toHaveProperty("created_at");
    });

    test("respects offset parameter", () => {
      const page1 = getTracks({
        offset: 0,
        limit: 5,
        sort: "id",
        direction: "asc",
      });
      const page2 = getTracks({
        offset: 5,
        limit: 5,
        sort: "id",
        direction: "asc",
      });

      expect(page1.items[0].id).not.toBe(page2.items[0].id);
    });

    test("clamps limit to MAX_LIMIT", () => {
      const result = getTracks({
        offset: 0,
        limit: 999,
        sort: "id",
        direction: "desc",
      });

      expect(result.items.length).toBeLessThanOrEqual(MAX_LIMIT);
    });

    test("sorts by id descending", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "id",
        direction: "desc",
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].id).toBeGreaterThan(result.items[i].id);
      }
    });

    test("sorts ascending", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "id",
        direction: "asc",
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].id).toBeLessThan(result.items[i].id);
      }
    });

    test("sorts by title with COLLATE NOCASE", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "title",
        direction: "asc",
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("sorts by artist with COLLATE NOCASE", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "artist",
        direction: "asc",
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("falls back to id sort for invalid column", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "nonexistent",
        direction: "desc",
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("falls back to desc for invalid direction", () => {
      const result = getTracks({
        offset: 0,
        limit: 10,
        sort: "id",
        direction: "invalid",
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("filters by search term (title or artist)", () => {
      // Get a known track to search for
      const all = getTracks({
        offset: 0,
        limit: 1,
        sort: "id",
        direction: "asc",
      });
      const searchTerm = all.items[0].artist.split(" ")[0];

      const result = getTracks({
        offset: 0,
        limit: 50,
        sort: "id",
        direction: "desc",
        search: searchTerm,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("filters by country", () => {
      // Find a country that exists
      const countries = getCountries();
      if (countries.length === 0) return;

      const code = countries[0].code;
      const result = getTracks({
        offset: 0,
        limit: 50,
        sort: "id",
        direction: "desc",
        country: code,
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const track of result.items) {
        expect(track.country).toBe(code);
      }
    });

    test("filters by decade", () => {
      const decades = getDecades();
      if (decades.length === 0) return;

      const decade = decades[0].decade;
      const result = getTracks({
        offset: 0,
        limit: 50,
        sort: "id",
        direction: "desc",
        decade,
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const track of result.items) {
        expect(track.decade).toBe(decade);
      }
    });

    test("filters by category", () => {
      const categories = getCategories();
      if (categories.length === 0) return;

      const category = categories[0].category;
      const result = getTracks({
        offset: 0,
        limit: 50,
        sort: "id",
        direction: "desc",
        category,
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const track of result.items) {
        expect(track.category).toBe(category);
      }
    });

    test("filters by artist (partial match)", () => {
      const all = getTracks({
        offset: 0,
        limit: 1,
        sort: "id",
        direction: "asc",
      });
      const artist = all.items[0].artist;

      const result = getTracks({
        offset: 0,
        limit: 50,
        sort: "id",
        direction: "desc",
        artist,
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("filters by minYear and maxYear", () => {
      const result = getTracks({
        offset: 0,
        limit: 50,
        sort: "year",
        direction: "asc",
        minYear: 1990,
        maxYear: 2000,
      });

      for (const track of result.items) {
        if (track.year != null) {
          expect(track.year).toBeGreaterThanOrEqual(1990);
          expect(track.year).toBeLessThanOrEqual(2000);
        }
      }
    });

    test("hasMore is true when more results exist", () => {
      const result = getTracks({
        offset: 0,
        limit: 1,
        sort: "id",
        direction: "desc",
      });

      expect(result.hasMore).toBe(true);
    });
  });

  describe("getTrackById", () => {
    test("returns a track by ID", () => {
      // Get a known existing ID first
      const first = getTracks({
        offset: 0,
        limit: 1,
        sort: "id",
        direction: "asc",
      });
      const id = first.items[0].id;

      const track = getTrackById(id);
      expect(track).not.toBeNull();
      expect(track!.id).toBe(id);
    });

    test("returns null for non-existent ID", () => {
      const track = getTrackById(999_999_999);
      expect(track).toBeNull();
    });
  });

  describe("CRUD operations", () => {
    let createdId: number;

    test("createTrack creates a new track", () => {
      const track = createTrack({
        title: "Test Track",
        artist: "Test Artist",
        country: "US",
        year: 2024,
        decade: 2020,
        category: "Rock",
        duration: 180,
      });

      expect(track.id).toBeGreaterThan(0);
      expect(track.title).toBe("Test Track");
      expect(track.artist).toBe("Test Artist");
      expect(track.country).toBe("US");
      expect(track.year).toBe(2024);
      expect(track.decade).toBe(2020);
      expect(track.category).toBe("Rock");
      expect(track.duration).toBe(180);
      expect(track.mongo_id).toContain("track_");

      createdId = track.id;
    });

    test("createTrack with minimal fields", () => {
      const track = createTrack({
        title: "Minimal Track",
        artist: "Minimal Artist",
      });

      expect(track.title).toBe("Minimal Track");
      expect(track.artist).toBe("Minimal Artist");
      expect(track.country).toBeNull();
      expect(track.year).toBeNull();

      // Cleanup
      deleteTrack(track.id);
    });

    test("updateTrack updates specific fields", () => {
      const updated = updateTrack(createdId, {
        title: "Updated Title",
        year: 2025,
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("Updated Title");
      expect(updated!.year).toBe(2025);
      // Unchanged fields should stay the same
      expect(updated!.artist).toBe("Test Artist");
    });

    test("updateTrack with all fields", () => {
      const updated = updateTrack(createdId, {
        title: "Fully Updated",
        artist: "New Artist",
        country: "GB",
        year: 2023,
        decade: 2020,
        category: "Pop",
        duration: 240,
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe("Fully Updated");
      expect(updated!.artist).toBe("New Artist");
      expect(updated!.country).toBe("GB");
    });

    test("updateTrack with empty input returns existing track", () => {
      const existing = getTrackById(createdId);
      const updated = updateTrack(createdId, {});

      expect(updated).not.toBeNull();
      expect(updated!.id).toBe(existing!.id);
    });

    test("updateTrack returns null for non-existent ID", () => {
      const updated = updateTrack(999_999_999, { title: "Nope" });
      expect(updated).toBeNull();
    });

    test("deleteTrack removes the track", () => {
      const deleted = deleteTrack(createdId);
      expect(deleted).toBe(true);

      const track = getTrackById(createdId);
      expect(track).toBeNull();
    });

    test("deleteTrack returns false for non-existent ID", () => {
      const deleted = deleteTrack(999_999_999);
      expect(deleted).toBe(false);
    });
  });

  describe("getCountries", () => {
    test("returns country codes with counts", () => {
      const countries = getCountries();

      expect(countries.length).toBeGreaterThan(0);
      expect(countries[0]).toHaveProperty("code");
      expect(countries[0]).toHaveProperty("count");
      expect(countries[0].count).toBeGreaterThan(0);
    });

    test("is sorted by count descending", () => {
      const countries = getCountries();

      for (let i = 1; i < countries.length; i++) {
        expect(countries[i - 1].count).toBeGreaterThanOrEqual(
          countries[i].count,
        );
      }
    });
  });

  describe("getDecades", () => {
    test("returns decades with counts", () => {
      const decades = getDecades();

      expect(decades.length).toBeGreaterThan(0);
      expect(decades[0]).toHaveProperty("decade");
      expect(decades[0]).toHaveProperty("count");
    });

    test("is sorted by decade descending", () => {
      const decades = getDecades();

      for (let i = 1; i < decades.length; i++) {
        expect(decades[i - 1].decade).toBeGreaterThanOrEqual(
          decades[i].decade,
        );
      }
    });
  });

  describe("getCategories", () => {
    test("returns categories with counts", () => {
      const categories = getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0]).toHaveProperty("category");
      expect(categories[0]).toHaveProperty("count");
    });
  });

  describe("getStats", () => {
    test("returns aggregate statistics", () => {
      const stats = getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.countries).toBeGreaterThan(0);
      expect(stats.decades.length).toBeGreaterThan(0);
      expect(stats.categories.length).toBeGreaterThan(0);
      expect(stats.topArtists.length).toBeGreaterThan(0);
      expect(stats.topArtists.length).toBeLessThanOrEqual(10);
    });

    test("yearRange has min and max", () => {
      const stats = getStats();

      expect(stats.yearRange.min).not.toBeNull();
      expect(stats.yearRange.max).not.toBeNull();
      expect(stats.yearRange.max!).toBeGreaterThanOrEqual(stats.yearRange.min!);
    });
  });

  describe("parseQueryOptions", () => {
    test("returns defaults when no params", () => {
      const url = new URL("https://vlist.io/api/tracks");
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(0);
      expect(options.limit).toBe(DEFAULT_LIMIT);
      expect(options.sort).toBe("id");
      expect(options.direction).toBe("desc");
      expect(options.delay).toBe(0);
    });

    test("parses all query params", () => {
      const url = new URL(
        "https://vlist.io/api/tracks?offset=10&limit=25&sort=title&direction=asc&search=rock&country=US&decade=1990&category=Rock&artist=Beatles&minYear=1960&maxYear=1970&delay=100",
      );
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(10);
      expect(options.limit).toBe(25);
      expect(options.sort).toBe("title");
      expect(options.direction).toBe("asc");
      expect(options.search).toBe("rock");
      expect(options.country).toBe("US");
      expect(options.decade).toBe(1990);
      expect(options.category).toBe("Rock");
      expect(options.artist).toBe("Beatles");
      expect(options.minYear).toBe(1960);
      expect(options.maxYear).toBe(1970);
      expect(options.delay).toBe(100);
    });

    test("clamps values to min/max bounds", () => {
      const url = new URL(
        "https://vlist.io/api/tracks?offset=-5&limit=999&delay=99999",
      );
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(0);
      expect(options.limit).toBe(MAX_LIMIT);
      expect(options.delay).toBe(5000);
    });

    test("returns defaults for invalid numeric params", () => {
      const url = new URL(
        "https://vlist.io/api/tracks?offset=abc&limit=xyz",
      );
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(0);
      expect(options.limit).toBe(DEFAULT_LIMIT);
    });
  });
});
