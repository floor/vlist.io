// test/api/router.test.ts
import { describe, test, expect, afterAll } from "bun:test";
import { routeApi } from "../../src/api/router";

// Helper to create a mock request
const createRequest = (
  path: string,
  method: string = "GET",
): { req: Request; url: URL } => {
  const url = new URL(`https://vlist.dev${path}`);
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
      const { req, url } = createRequest("/api/files?path=vlist.dev");
      const result = await routeApi(req, url);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(200);

      const body = (await parseJson(result!)) as {
        path: string;
        items: unknown[];
      };
      expect(body.path).toBe("vlist.dev");
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
      expect(body.allowedRoots).toContain("vlist.dev");
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
      expect(body.name).toBe("vlist.dev API");
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
        Promise.resolve(new Response(JSON.stringify(mockRedditResponse)))) as typeof fetch;

      const { req, url } = createRequest("/api/feed?source=reddit&target=worldnews&limit=10");
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
      const { req, url } = createRequest("/api/feed?source=invalid&target=test");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(400);

      const body = (await parseJson(result!)) as { error: string };
      expect(body.error).toContain("Unknown source");
    });

    test("returns 502 on feed fetch failure", async () => {
      globalThis.fetch = (() =>
        Promise.resolve(new Response("Not Found", { status: 404 }))) as typeof fetch;

      const { req, url } = createRequest("/api/feed?source=reddit&target=nonexistent");
      const result = await routeApi(req, url);

      expect(result?.status).toBe(502);

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
});
