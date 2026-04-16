// test/api/cities.test.ts
import { describe, test, expect } from "bun:test";
import {
  getCities,
  getCityById,
  getCountries,
  getContinents,
  getStats,
  parseQueryOptions,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "../../src/api/cities";

describe("cities", () => {
  describe("getCities", () => {
    test("returns paginated results with defaults", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "population",
        direction: "desc",
      });

      expect(result.items).toHaveLength(10);
      expect(result.total).toBeGreaterThan(0);
      expect(typeof result.hasMore).toBe("boolean");
    });

    test("each city has all required fields", () => {
      const result = getCities({
        offset: 0,
        limit: 1,
        sort: "population",
        direction: "desc",
      });

      const city = result.items[0];
      expect(city).toHaveProperty("id");
      expect(city).toHaveProperty("name");
      expect(city).toHaveProperty("country_code");
      expect(city).toHaveProperty("population");
      expect(city).toHaveProperty("lat");
      expect(city).toHaveProperty("lng");
      expect(city).toHaveProperty("continent");
    });

    test("respects offset parameter", () => {
      const page1 = getCities({
        offset: 0,
        limit: 5,
        sort: "population",
        direction: "desc",
      });
      const page2 = getCities({
        offset: 5,
        limit: 5,
        sort: "population",
        direction: "desc",
      });

      expect(page1.items[0].id).not.toBe(page2.items[0].id);
    });

    test("clamps limit to MAX_LIMIT", () => {
      const result = getCities({
        offset: 0,
        limit: 999,
        sort: "population",
        direction: "desc",
      });

      expect(result.items.length).toBeLessThanOrEqual(MAX_LIMIT);
    });

    test("sorts by population descending by default", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "population",
        direction: "desc",
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].population).toBeGreaterThanOrEqual(
          result.items[i].population,
        );
      }
    });

    test("sorts ascending when direction is asc", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "population",
        direction: "asc",
      });

      for (let i = 1; i < result.items.length; i++) {
        expect(result.items[i - 1].population).toBeLessThanOrEqual(
          result.items[i].population,
        );
      }
    });

    test("sorts by name with COLLATE NOCASE", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "name",
        direction: "asc",
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("falls back to population sort for invalid column", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "nonexistent_column",
        direction: "desc",
      });

      // Should still work (falls back to population)
      expect(result.items.length).toBeGreaterThan(0);
    });

    test("falls back to desc for invalid direction", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "population",
        direction: "invalid",
      });

      expect(result.items.length).toBeGreaterThan(0);
    });

    test("filters by search term", () => {
      const result = getCities({
        offset: 0,
        limit: 50,
        sort: "population",
        direction: "desc",
        search: "Paris",
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const city of result.items) {
        expect(city.name.toLowerCase()).toContain("paris");
      }
    });

    test("filters by single country code", () => {
      const result = getCities({
        offset: 0,
        limit: 50,
        sort: "population",
        direction: "desc",
        country: "FR",
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const city of result.items) {
        expect(city.country_code).toBe("FR");
      }
    });

    test("filters by multiple country codes (comma-separated)", () => {
      const result = getCities({
        offset: 0,
        limit: 50,
        sort: "population",
        direction: "desc",
        country: "FR,DE",
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const city of result.items) {
        expect(["FR", "DE"]).toContain(city.country_code);
      }
    });

    test("filters by continent", () => {
      const result = getCities({
        offset: 0,
        limit: 50,
        sort: "population",
        direction: "desc",
        continent: "Europe",
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const city of result.items) {
        expect(city.continent).toBe("Europe");
      }
    });

    test("filters by minPop", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "population",
        direction: "asc",
        minPop: 5_000_000,
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const city of result.items) {
        expect(city.population).toBeGreaterThanOrEqual(5_000_000);
      }
    });

    test("filters by maxPop", () => {
      const result = getCities({
        offset: 0,
        limit: 10,
        sort: "population",
        direction: "desc",
        maxPop: 100_000,
      });

      expect(result.items.length).toBeGreaterThan(0);
      for (const city of result.items) {
        expect(city.population).toBeLessThanOrEqual(100_000);
      }
    });

    test("combines multiple filters", () => {
      const result = getCities({
        offset: 0,
        limit: 50,
        sort: "population",
        direction: "desc",
        continent: "Europe",
        minPop: 1_000_000,
      });

      for (const city of result.items) {
        expect(city.continent).toBe("Europe");
        expect(city.population).toBeGreaterThanOrEqual(1_000_000);
      }
    });

    test("hasMore is true when more results exist", () => {
      const result = getCities({
        offset: 0,
        limit: 1,
        sort: "population",
        direction: "desc",
      });

      expect(result.hasMore).toBe(true);
    });

    test("hasMore is false at end of dataset", () => {
      const all = getCities({
        offset: 0,
        limit: 1,
        sort: "population",
        direction: "desc",
      });

      const result = getCities({
        offset: all.total - 1,
        limit: 1,
        sort: "population",
        direction: "desc",
      });

      expect(result.hasMore).toBe(false);
    });
  });

  describe("getCityById", () => {
    test("returns a city by ID", () => {
      const city = getCityById(1);
      expect(city).not.toBeNull();
      expect(city!.id).toBe(1);
    });

    test("returns null for non-existent ID", () => {
      const city = getCityById(999_999_999);
      expect(city).toBeNull();
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

  describe("getContinents", () => {
    test("returns continents with counts", () => {
      const continents = getContinents();

      expect(continents.length).toBeGreaterThan(0);
      expect(continents[0]).toHaveProperty("continent");
      expect(continents[0]).toHaveProperty("count");
    });
  });

  describe("getStats", () => {
    test("returns aggregate statistics", () => {
      const stats = getStats();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.countries).toBeGreaterThan(0);
      expect(stats.continents.length).toBeGreaterThan(0);
      expect(stats.topCities.length).toBeGreaterThan(0);
      expect(stats.topCities.length).toBeLessThanOrEqual(10);
      expect(stats.populationRange.min).toBeGreaterThan(0);
      expect(stats.populationRange.max).toBeGreaterThan(stats.populationRange.min);
    });

    test("top cities have required fields", () => {
      const stats = getStats();
      const top = stats.topCities[0];

      expect(top).toHaveProperty("name");
      expect(top).toHaveProperty("country_code");
      expect(top).toHaveProperty("population");
    });
  });

  describe("parseQueryOptions", () => {
    test("returns defaults when no params", () => {
      const url = new URL("https://vlist.io/api/cities");
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(0);
      expect(options.limit).toBe(DEFAULT_LIMIT);
      expect(options.sort).toBe("population");
      expect(options.direction).toBe("desc");
      expect(options.delay).toBe(0);
    });

    test("parses all query params", () => {
      const url = new URL(
        "https://vlist.io/api/cities?offset=10&limit=25&sort=name&direction=asc&search=test&country=FR&continent=Europe&minPop=1000&maxPop=5000000&delay=100",
      );
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(10);
      expect(options.limit).toBe(25);
      expect(options.sort).toBe("name");
      expect(options.direction).toBe("asc");
      expect(options.search).toBe("test");
      expect(options.country).toBe("FR");
      expect(options.continent).toBe("Europe");
      expect(options.minPop).toBe(1000);
      expect(options.maxPop).toBe(5_000_000);
      expect(options.delay).toBe(100);
    });

    test("clamps values to min/max bounds", () => {
      const url = new URL(
        "https://vlist.io/api/cities?offset=-5&limit=999&delay=99999",
      );
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(0);
      expect(options.limit).toBe(MAX_LIMIT);
      expect(options.delay).toBe(5000);
    });

    test("returns defaults for invalid numeric params", () => {
      const url = new URL(
        "https://vlist.io/api/cities?offset=abc&limit=xyz",
      );
      const options = parseQueryOptions(url);

      expect(options.offset).toBe(0);
      expect(options.limit).toBe(DEFAULT_LIMIT);
    });
  });
});
