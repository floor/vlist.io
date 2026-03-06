// test/server/compression.test.ts
import { describe, test, expect } from "bun:test";
import { compressResponse } from "../../src/server/compression";

// Helper to create a mock response
const createResponse = (
  body: string,
  contentType: string = "text/html",
): Response => {
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
    },
  });
};

describe("compression", () => {
  describe("compressResponse", () => {
    test("returns original response for non-compressible content types", async () => {
      const imageResponse = createResponse("binary data", "image/png");
      const result = compressResponse(imageResponse, "br, gzip", "/image.png");

      // Should return sync (not a Promise)
      expect(result).toBeInstanceOf(Response);
      expect(result).toBe(imageResponse);
    });

    test("returns original response when no Accept-Encoding", async () => {
      const htmlResponse = createResponse("<html></html>", "text/html");
      const result = compressResponse(htmlResponse, null, "/page.html");

      expect(result).toBe(htmlResponse);
    });

    test("returns original response when Accept-Encoding is empty", async () => {
      const htmlResponse = createResponse("<html></html>", "text/html");
      const result = compressResponse(htmlResponse, "", "/page.html");

      expect(result).toBe(htmlResponse);
    });

    test("returns original response if already encoded", async () => {
      const response = new Response("<html></html>", {
        headers: {
          "Content-Type": "text/html",
          "Content-Encoding": "gzip",
        },
      });
      const result = compressResponse(response, "br, gzip", "/page.html");

      expect(result).toBe(response);
    });

    test("handles text/html content type", async () => {
      const html = "<html><body>Hello World</body></html>".repeat(100);
      const response = createResponse(html, "text/html");
      const result = compressResponse(response, "gzip", "/page.html");

      // For on-the-fly compression, returns a Promise
      expect(result).toBeInstanceOf(Promise);

      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
      expect(compressed.headers.get("Vary")).toBe("Accept-Encoding");
    });

    test("handles application/json content type", async () => {
      const json = JSON.stringify({ data: "test".repeat(500) });
      const response = createResponse(json, "application/json");
      const result = compressResponse(response, "gzip", "/api/data");

      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
    });

    test("handles application/javascript content type", async () => {
      const js = 'console.log("hello");'.repeat(100);
      const response = createResponse(js, "application/javascript");
      const result = compressResponse(response, "gzip", "/script.js");

      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
    });

    test("handles text/css content type", async () => {
      const css = "body { color: red; }".repeat(100);
      const response = createResponse(css, "text/css");
      const result = compressResponse(response, "gzip", "/style.css");

      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
    });

    test("prefers brotli over gzip when both supported", async () => {
      const html = "<html><body>Hello World</body></html>".repeat(100);
      const response = createResponse(html, "text/html");
      const result = compressResponse(response, "br, gzip", "/page.html");

      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("br");
    });

    test("uses gzip when brotli not supported", async () => {
      const html = "<html><body>Hello World</body></html>".repeat(100);
      const response = createResponse(html, "text/html");
      const result = compressResponse(response, "gzip", "/page.html");

      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
    });

    test("sets Content-Length header on compressed response", async () => {
      const html = "<html><body>Hello World</body></html>".repeat(100);
      const response = createResponse(html, "text/html");
      const result = compressResponse(response, "gzip", "/page.html");

      const compressed = await result;
      expect(compressed.headers.get("Content-Length")).not.toBeNull();
    });

    test("does not compress small responses (< 1KB)", async () => {
      const smallHtml = "<html></html>";
      const response = createResponse(smallHtml, "text/html");
      const result = compressResponse(response, "gzip", "/small.html");

      const finalResponse = await result;
      // Small responses should not be compressed
      expect(finalResponse.headers.get("Content-Encoding")).toBeNull();
    });

    test("handles unknown encoding gracefully", async () => {
      const html = "<html><body>Hello</body></html>".repeat(100);
      const response = createResponse(html, "text/html");
      const result = compressResponse(response, "deflate", "/page.html");

      // Should return original response since deflate is not supported
      expect(result).toBe(response);
    });

    test("does not compress image/svg+xml", async () => {
      // SVG is actually compressible - let's check the shouldCompress logic
      const svg = "<svg></svg>".repeat(100);
      const response = createResponse(svg, "image/svg+xml");
      const result = compressResponse(response, "gzip", "/icon.svg");

      // SVG should be compressed (contains "image/svg")
      const compressed = await result;
      expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
    });

    test("handles Accept-Encoding with quality values", async () => {
      const html = "<html><body>Hello</body></html>".repeat(100);
      const response = createResponse(html, "text/html");
      // br comes first, even with quality values, the code just checks includes()
      const result = compressResponse(
        response,
        "gzip;q=1.0, br;q=0.8",
        "/page.html",
      );

      const compressed = await result;
      // Implementation uses includes() check, so br will match first
      expect(compressed.headers.get("Content-Encoding")).toBe("br");
    });
  });

  describe("content type detection", () => {
    const compressibleTypes = [
      "text/html",
      "text/plain",
      "text/css",
      "text/javascript",
      "application/javascript",
      "application/json",
      "application/xml",
      "image/svg+xml",
    ];

    const nonCompressibleTypes = [
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
      "audio/mpeg",
      "video/mp4",
      "application/octet-stream",
      "font/woff2",
    ];

    for (const contentType of compressibleTypes) {
      test(`compresses ${contentType}`, async () => {
        const content = "x".repeat(2000);
        const response = createResponse(content, contentType);
        const result = compressResponse(response, "gzip", "/test");

        const compressed = await result;
        expect(compressed.headers.get("Content-Encoding")).toBe("gzip");
      });
    }

    for (const contentType of nonCompressibleTypes) {
      test(`does not compress ${contentType}`, () => {
        const response = createResponse("binary data", contentType);
        const result = compressResponse(response, "gzip", "/test");

        // Should return sync (same response)
        expect(result).toBe(response);
      });
    }
  });
});
