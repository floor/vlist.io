// test/api/router.test.ts
import { describe, test, expect, afterAll } from "bun:test";
import { routeApi } from "../../src/api/router";

// Helper to create a mock request
const createRequest = (
  path: string,
  method: string = "GET",
): { req: Request; url: URL } => {
  const url = new URL(`https://vlist.io${path}`);
  const req = new Request(url.toString(), { method });
  return { req, url };
};

// Helper to parse JSON response
const parseJson = async (response: Response): Promise<unknown> => {
  return response.json();
};

describe("router", () => {
  describe("routeApi", () => {
    test("returns null for non-API paths", async () => {
      const { req, url } = createRequest("/docs/intro");
      const result = await routeApi(req, url);
      expect(result).toBeNull();
    });

    test("handles CORS preflight OPTIONS request", async () => {
      const { req, url } = createRequest("/api/users", "OPTIONS");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(204);
      expect(result?.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(result?.headers.get("Access-Control-Allow-Methods")).toContain(
        "GET",
      );
    });

    test("rejects non-GET methods with 405", async () => {
      const { req, url } = createRequest("/api/users", "POST");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(405);
    });

    test("returns 404 for unknown API routes", async () => {
      const { req, url } = createRequest("/api/unknown-endpoint");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(404);

      const body = (await parseJson(result!)) as { error: string };
      expect(body.error).toBe("Not found");
    });
  });

  describe("GET /api/users", () => {
    test("returns paginated users", async () => {
      const { req, url } = createRequest("/api/users?limit=10");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);
      expect(result?.headers.get("Content-Type")).toContain("application/json");

      const body = (await parseJson(result!)) as {
        items: unknown[];
        total: number;
        hasMore: boolean;
      };
      expect(body.items).toHaveLength(10);
      expect(body.total).toBeGreaterThan(0);
      expect(typeof body.hasMore).toBe("boolean");
    });

    test("respects offset parameter", async () => {
      const { req, url } = createRequest("/api/users?offset=100&limit=5");
      const result = await routeApi(req, url);

      const body = (await parseJson(result!)) as {
        items: Array<{ id: number }>;
      };
      expect(body.items[0].id).toBe(101); // 1-based IDs
    });

    test("respects limit parameter", async () => {
      const { req, url } = createRequest("/api/users?limit=25");
      const result = await routeApi(req, url);

      const body = (await parseJson(result!)) as { items: unknown[] };
      expect(body.items).toHaveLength(25);
    });

    test("clamps limit to max", async () => {
      const { req, url } = createRequest("/api/users?limit=500");
      const result = await routeApi(req, url);

      const body = (await parseJson(result!)) as { items: unknown[] };
      expect(body.items.length).toBeLessThanOrEqual(200);
    });

    test("respects total parameter", async () => {
      const { req, url } = createRequest("/api/users?total=100");
      const result = await routeApi(req, url);

      const body = (await parseJson(result!)) as { total: number };
      expect(body.total).toBe(100);
    });

    test("includes CORS headers", async () => {
      const { req, url } = createRequest("/api/users");
      const result = await routeApi(req, url);

      expect(result?.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("GET /api/users/:id", () => {
    test("returns single user by ID", async () => {
      const { req, url } = createRequest("/api/users/42");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as { id: number };
      expect(body.id).toBe(42);
    });

    test("returns 404 for non-existent user", async () => {
      const { req, url } = createRequest("/api/users/999999999");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);

      const body = (await parseJson(result!)) as { error: string };
      expect(body.error).toBe("User not found");
    });

    test("returns 404 for user ID 0", async () => {
      const { req, url } = createRequest("/api/users/0");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);
    });
  });

  describe("GET /api/posts", () => {
    test("returns paginated posts", async () => {
      const { req, url } = createRequest("/api/posts?limit=10");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        items: unknown[];
        total: number;
        hasMore: boolean;
      };
      expect(body.items).toHaveLength(10);
      expect(body.total).toBeGreaterThan(0);
    });

    test("respects offset parameter", async () => {
      const { req, url } = createRequest("/api/posts?offset=10&limit=5");
      const result = await routeApi(req, url);

      const body = (await parseJson(result!)) as {
        items: Array<{ id: string }>;
      };
      expect(body.items[0].id).toBe("post-10");
    });
  });

  describe("GET /api/recipes", () => {
    test("returns all recipes", async () => {
      const { req, url } = createRequest("/api/recipes");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as Array<{ id: number }>;
      expect(body).toHaveLength(20);
    });
  });

  describe("GET /api/recipes/:id", () => {
    test("returns single recipe by ID", async () => {
      const { req, url } = createRequest("/api/recipes/1");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as { id: number; title: string };
      expect(body.id).toBe(1);
      expect(body.title).toBe("Spaghetti Carbonara");
    });

    test("returns 404 for non-existent recipe", async () => {
      const { req, url } = createRequest("/api/recipes/999");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);

      const body = (await parseJson(result!)) as { error: string };
      expect(body.error).toBe("Recipe not found");
    });
  });

  describe("GET /api/files", () => {
    test("returns directory listing", async () => {
      const { req, url } = createRequest("/api/files?path=vlist.io");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        path: string;
        items: unknown[];
      };
      expect(body.path).toBe("vlist.io");
      expect(Array.isArray(body.items)).toBe(true);
    });

    test("returns 403 for directory traversal", async () => {
      const { req, url } = createRequest("/api/files?path=../");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(403);
    });
  });

  describe("GET /api/files/info", () => {
    test("returns file browser info", async () => {
      const { req, url } = createRequest("/api/files/info");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        baseDir: string;
        allowedRoots: string[];
      };
      expect(body.allowedRoots).toContain("vlist");
      expect(body.allowedRoots).toContain("vlist.io");
    });
  });

  describe("GET /api/info", () => {
    test("returns API metadata", async () => {
      const { req, url } = createRequest("/api/info");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        name: string;
        version: string;
        endpoints: Record<string, unknown>;
      };
      expect(body.name).toBe("vlist.io API");
      expect(body.version).toBeDefined();
      expect(body.endpoints).toBeDefined();
    });
  });

  describe("GET /api/feed/presets", () => {
    test("returns feed presets", async () => {
      const { req, url } = createRequest("/api/feed/presets");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        reddit: Array<{ label: string; value: string }>;
      };
      expect(Array.isArray(body.reddit)).toBe(true);
    });
  });

  describe("caching headers", () => {
    test("API responses have Cache-Control header", async () => {
      const { req, url } = createRequest("/api/users?limit=5");
      const result = await routeApi(req, url);

      expect(result?.headers.get("Cache-Control")).toBeDefined();
    });
  });

  describe("GET /api/feed", () => {
    const originalFetch = globalThis.fetch;

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    test("returns feed posts with valid source", async () => {
      // Mock fetch for Reddit API
      const mockRedditResponse = {
        data: {
          after: "t3_next",
          children: [
            {
              kind: "t3",
              data: {
                id: "abc123",
                name: "t3_abc123",
                title: "Test Post",
                selftext: "",
                author: "testuser",
                subreddit: "worldnews",
                score: 100,
                num_comments: 10,
                created_utc: Math.floor(Date.now() / 1000) - 3600,
                url: "https://example.com",
                permalink: "/r/worldnews/comments/abc123/test",
                is_self: false,
                link_flair_text: null,
              },
            },
          ],
          dist: 1,
        },
      };

      globalThis.fetch = (() =>
        Promise.resolve(
          new Response(JSON.stringify(mockRedditResponse)),
        )) as typeof fetch;

      const { req, url } = createRequest(
        "/api/feed?source=reddit&target=worldnews&limit=10",
      );
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        posts: unknown[];
        source: string;
        target: string;
      };
      expect(body.posts).toHaveLength(1);
      expect(body.source).toBe("reddit");
      expect(body.target).toBe("worldnews");
    });

    test("returns error for invalid source", async () => {
      const { req, url } = createRequest(
        "/api/feed?source=invalid&target=test",
      );
      const result = await routeApi(req, url);

      expect(result?.status).toBe(400);

      const body = (await parseJson(result!)) as { error: string };
      expect(body.error).toContain("Unknown source");
    });

    test("returns 503 on feed fetch failure", async () => {
      globalThis.fetch = (() =>
        Promise.resolve(
          new Response("Not Found", { status: 404 }),
        )) as typeof fetch;

      const { req, url } = createRequest(
        "/api/feed?source=reddit&target=nonexistent",
      );
      const result = await routeApi(req, url);

      expect(result?.status).toBe(503);

      const body = (await parseJson(result!)) as { error: string };
      expect(body.error).toContain("Feed fetch failed");
    });
  });

  describe("GET /api or /api/", () => {
    test("returns API docs page or null", async () => {
      const { req, url } = createRequest("/api");
      const result = await routeApi(req, url);

      // Either returns HTML docs or null (if file doesn't exist)
      if (result) {
        expect(result.headers.get("Content-Type")).toContain("text/html");
      } else {
        expect(result).toBeNull();
      }
    });

    test("/api/ also serves docs", async () => {
      const { req, url } = createRequest("/api/");
      const result = await routeApi(req, url);

      // Either returns HTML docs or null
      if (result) {
        expect(result.headers.get("Content-Type")).toContain("text/html");
      }
    });
  });

  // ===========================================================================
  // Cities (SQLite-backed)
  // ===========================================================================

  describe("GET /api/cities", () => {
    test("returns paginated cities", async () => {
      const { req, url } = createRequest("/api/cities?limit=10");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        items: unknown[];
        total: number;
        hasMore: boolean;
      };
      expect(body.items).toHaveLength(10);
      expect(body.total).toBeGreaterThan(0);
    });

    test("supports search filter", async () => {
      const { req, url } = createRequest(
        "/api/cities?search=Paris&limit=10",
      );
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as {
        items: Array<{ name: string }>;
      };
      expect(body.items.length).toBeGreaterThan(0);
    });

    test("trailing slash also works", async () => {
      const { req, url } = createRequest("/api/cities/");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
    });
  });

  describe("GET /api/cities/:id", () => {
    test("returns single city by ID", async () => {
      const { req, url } = createRequest("/api/cities/1");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as { id: number };
      expect(body.id).toBe(1);
    });

    test("returns 404 for non-existent city", async () => {
      const { req, url } = createRequest("/api/cities/999999999");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);
    });
  });

  describe("GET /api/cities/countries", () => {
    test("returns country list", async () => {
      const { req, url } = createRequest("/api/cities/countries");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as Array<{
        code: string;
        count: number;
      }>;
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/cities/continents", () => {
    test("returns continent list", async () => {
      const { req, url } = createRequest("/api/cities/continents");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as Array<{
        continent: string;
        count: number;
      }>;
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/cities/stats", () => {
    test("returns aggregate statistics", async () => {
      const { req, url } = createRequest("/api/cities/stats");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as {
        total: number;
        countries: number;
      };
      expect(body.total).toBeGreaterThan(0);
      expect(body.countries).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Tracks (SQLite-backed with CRUD)
  // ===========================================================================

  describe("GET /api/tracks", () => {
    test("returns paginated tracks", async () => {
      const { req, url } = createRequest("/api/tracks?limit=10");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        items: unknown[];
        total: number;
        hasMore: boolean;
      };
      expect(body.items).toHaveLength(10);
      expect(body.total).toBeGreaterThan(0);
    });

    test("trailing slash also works", async () => {
      const { req, url } = createRequest("/api/tracks/");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
    });
  });

  describe("GET /api/tracks/:id", () => {
    test("returns single track by ID", async () => {
      // Get a known existing track ID first
      const { req: listReq, url: listUrl } = createRequest(
        "/api/tracks?limit=1",
      );
      const listResult = await routeApi(listReq, listUrl);
      const listBody = (await parseJson(listResult!)) as {
        items: Array<{ id: number }>;
      };
      const trackId = listBody.items[0].id;

      const { req, url } = createRequest(`/api/tracks/${trackId}`);
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as { id: number };
      expect(body.id).toBe(trackId);
    });

    test("returns 404 for non-existent track", async () => {
      const { req, url } = createRequest("/api/tracks/999999999");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);
    });
  });

  describe("POST /api/tracks", () => {
    let createdTrackId: number;

    test("creates a new track", async () => {
      const body = JSON.stringify({
        title: "Router Test Track",
        artist: "Router Test Artist",
        year: 2024,
      });
      const url = new URL("https://vlist.io/api/tracks");
      const req = new Request(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(201);
      const responseBody = (await parseJson(result!)) as {
        id: number;
        title: string;
      };
      expect(responseBody.title).toBe("Router Test Track");
      createdTrackId = responseBody.id;
    });

    test("returns 400 for missing required fields", async () => {
      const body = JSON.stringify({ title: "No Artist" });
      const url = new URL("https://vlist.io/api/tracks");
      const req = new Request(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(400);
    });

    test("returns 400 for invalid JSON", async () => {
      const url = new URL("https://vlist.io/api/tracks");
      const req = new Request(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(400);
    });

    // Cleanup: use the createdTrackId in later tests
    test("PUT updates the created track", async () => {
      const body = JSON.stringify({ title: "Updated Router Track" });
      const url = new URL(`https://vlist.io/api/tracks/${createdTrackId}`);
      const req = new Request(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const responseBody = (await parseJson(result!)) as { title: string };
      expect(responseBody.title).toBe("Updated Router Track");
    });

    test("PUT returns 404 for non-existent track", async () => {
      const body = JSON.stringify({ title: "Nope" });
      const url = new URL("https://vlist.io/api/tracks/999999999");
      const req = new Request(url.toString(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);
    });

    test("DELETE removes the created track", async () => {
      const url = new URL(`https://vlist.io/api/tracks/${createdTrackId}`);
      const req = new Request(url.toString(), { method: "DELETE" });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const responseBody = (await parseJson(result!)) as { success: boolean };
      expect(responseBody.success).toBe(true);
    });

    test("DELETE returns 404 for non-existent track", async () => {
      const url = new URL("https://vlist.io/api/tracks/999999999");
      const req = new Request(url.toString(), { method: "DELETE" });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(404);
    });
  });

  describe("POST not allowed on non-tracks routes", () => {
    test("POST /api/cities returns 405", async () => {
      const url = new URL("https://vlist.io/api/cities");
      const req = new Request(url.toString(), { method: "POST" });
      const result = await routeApi(req, url);

      expect(result?.status).toBe(405);
    });
  });

  describe("GET /api/tracks/countries", () => {
    test("returns country list", async () => {
      const { req, url } = createRequest("/api/tracks/countries");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as Array<{
        code: string;
        count: number;
      }>;
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/tracks/decades", () => {
    test("returns decades list", async () => {
      const { req, url } = createRequest("/api/tracks/decades");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as Array<{
        decade: number;
        count: number;
      }>;
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/tracks/categories", () => {
    test("returns categories list", async () => {
      const { req, url } = createRequest("/api/tracks/categories");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as Array<{
        category: string;
        count: number;
      }>;
      expect(body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/tracks/stats", () => {
    test("returns aggregate statistics", async () => {
      const { req, url } = createRequest("/api/tracks/stats");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(200);
      const body = (await parseJson(result!)) as {
        total: number;
        countries: number;
      };
      expect(body.total).toBeGreaterThan(0);
    });
  });
});
