// test/server/versions.test.ts
import { describe, test, expect } from "bun:test";
import {
  buildVersionSwitcher,
  canonicalPath,
  mapSlug,
  parseSearchVersion,
  versionFromPath,
  versionUrl,
  type SlugSets,
} from "../../src/server/versions";
import {
  SITE,
  docsV2Renderer,
  getDocSlugSets,
  tutorialsV2Renderer,
} from "../../src/server/renderers";
import { handleRequest } from "../../src/server/router";
import { searchSite } from "../../src/server/search";
import { renderSitemap } from "../../src/server/sitemap";

const docs: SlugSets = {
  v1: new Set(["getting-started", "features/scale", "api/reference", "api/types"]),
  v2: new Set(["getting-started", "plugins/scale", "api"]),
  v3: new Set(["getting-started", "api", "scroll-modes"]),
};

const hrefs = (html: string): string[] =>
  [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1] as string);

describe("docs versions", () => {
  describe("versionFromPath", () => {
    test("archives are v1 and v2, everything else is current", () => {
      expect(versionFromPath("/docs/v1")).toBe("v1");
      expect(versionFromPath("/docs/v1/api/reference")).toBe("v1");
      expect(versionFromPath("/tutorials/v2/")).toBe("v2");
      expect(versionFromPath("/docs/getting-started")).toBe("v3");
      expect(versionFromPath("/docs/v10/page")).toBe("v3");
      expect(versionFromPath("/examples/carousel")).toBe("v3");
    });
  });

  describe("versionUrl", () => {
    test("current pages have no version segment", () => {
      expect(versionUrl("/docs", "v3", "api")).toBe("/docs/api");
      expect(versionUrl("/docs", "v2", "api")).toBe("/docs/v2/api");
      expect(versionUrl("/tutorials", "v1", null)).toBe("/tutorials/v1/");
      expect(versionUrl("/tutorials", "v3", null)).toBe("/tutorials/");
    });
  });

  describe("mapSlug", () => {
    test("v2 and v3 share slugs when the target has the page", () => {
      expect(mapSlug("/docs", "v2", "v3", "api", docs)).toBe("api");
      expect(mapSlug("/docs", "v3", "v2", "api", docs)).toBe("api");
    });

    test("a page removed from the current docs maps to null", () => {
      expect(mapSlug("/docs", "v2", "v3", "plugins/scale", docs)).toBeNull();
    });

    test("v1 maps through the slug map in both directions", () => {
      expect(mapSlug("/docs", "v1", "v3", "api/types", docs)).toBe("api");
      expect(mapSlug("/docs", "v3", "v1", "api", docs)).toBe("api/reference");
      expect(mapSlug("/docs", "v1", "v2", "features/scale", docs)).toBe("plugins/scale");
      expect(mapSlug("/docs", "v1", "v3", "features/scale", docs)).toBeNull();
    });
  });

  describe("buildVersionSwitcher", () => {
    test("renders v1, v2 and v3 with the current version active", () => {
      const html = buildVersionSwitcher("/docs", "v3", "api", docs);
      expect(hrefs(html)).toEqual(["/docs/v1/api/reference", "/docs/v2/api", "/docs/"]);
      expect(html).toContain('class="ui-segmented__btn ui-segmented__btn--active">v3</a>');
    });

    test("falls back to the overview when a version lacks the page", () => {
      const html = buildVersionSwitcher("/docs", "v2", "plugins/scale", docs);
      expect(hrefs(html)).toEqual(["/docs/v1/features/scale", "/docs/v2/", "/docs/"]);
      expect(html).toContain('ui-segmented__btn--active">v2</a>');
    });

    test("links only overviews when slug matching is off", () => {
      const html = buildVersionSwitcher("/docs", "v1", "api/types", docs, false);
      expect(hrefs(html)).toEqual(["/docs/v1/", "/docs/v2/", "/docs/"]);
    });
  });

  describe("canonicalPath", () => {
    test("archived pages point to the current page when it exists", () => {
      expect(canonicalPath("/docs", "v2", "api", docs)).toBe("/docs/api");
      expect(canonicalPath("/docs", "v1", "api/types", docs)).toBe("/docs/api");
    });

    test("v1 falls back to v2 when the current docs dropped the page", () => {
      expect(canonicalPath("/docs", "v1", "features/scale", docs)).toBe("/docs/v2/plugins/scale");
      expect(canonicalPath("/docs", "v2", "plugins/scale", docs)).toBeNull();
    });

    test("current pages and overviews keep their own URL", () => {
      expect(canonicalPath("/docs", "v3", "api", docs)).toBeNull();
      expect(canonicalPath("/docs", "v2", null, docs)).toBeNull();
    });
  });

  describe("parseSearchVersion", () => {
    test("only archive names select an archive", () => {
      expect(parseSearchVersion("v1")).toBe("v1");
      expect(parseSearchVersion("v2")).toBe("v2");
      expect(parseSearchVersion("v3")).toBe("v3");
      expect(parseSearchVersion(null)).toBe("v3");
      expect(parseSearchVersion("latest")).toBe("v3");
    });
  });
});

describe("v2 archive (integration)", () => {
  test("the v2 renderers serve the archived pages", () => {
    expect(getDocSlugSets("/docs").v2.has("getting-started")).toBe(true);
    expect(getDocSlugSets("/tutorials").v2.has("quick-start")).toBe(true);
    const page = docsV2Renderer.render("getting-started");
    expect(page).not.toBeNull();
    expect(tutorialsV2Renderer.render("quick-start")).not.toBeNull();
  });

  test("an archived page shows the three-version switcher and a canonical to the current page", async () => {
    const html = await (docsV2Renderer.render("getting-started") as Response).text();
    expect(html).toContain('href="/docs/v1/getting-started" class="ui-segmented__btn">v1</a>');
    expect(html).toContain('ui-segmented__btn--active">v2</a>');
    expect(html).toContain('href="/docs/getting-started" class="ui-segmented__btn">v3</a>');
    expect(html).toContain(`<link rel="canonical" href="${SITE}/docs/getting-started" />`);
  });

  test("the router serves v2 pages and overviews", async () => {
    for (const path of ["/docs/v2/", "/docs/v2/getting-started", "/tutorials/v2", "/tutorials/v2/quick-start"]) {
      const res = await handleRequest(new Request(`http://localhost${path}`));
      expect(res.status).toBe(200);
    }
  });

  test("a page removed from the current docs redirects to its v2 copy", async () => {
    const slugs = getDocSlugSets("/docs");
    const removed = [...slugs.v2].filter((slug) => !slugs.v3.has(slug));
    for (const slug of removed) {
      const res = await handleRequest(new Request(`http://localhost/docs/${slug}`));
      expect(res.status).toBe(301);
      expect(res.headers.get("Location")).toBe(`/docs/v2/${slug}`);
    }
  });

  test("current pages are not redirected", async () => {
    const res = await handleRequest(new Request("http://localhost/docs/getting-started"));
    expect(res.status).toBe(200);
  });

  test("search keeps archives apart from the current docs", () => {
    const current = searchSite("createVList", 50);
    const v2 = searchSite("createVList", 50, "v2");
    expect(current.length).toBeGreaterThan(0);
    expect(v2.length).toBeGreaterThan(0);
    expect(current.every((hit) => versionFromPath(hit.url) === "v3")).toBe(true);
    expect(v2.every((hit) => versionFromPath(hit.url) === "v2")).toBe(true);
    expect(v2.every((hit) => hit.title.endsWith("(v2)"))).toBe(true);
  });

  test("the sitemap lists v2 pages as yearly archive entries", async () => {
    const xml = await renderSitemap().text();
    expect(xml).toContain(`<loc>${SITE}/docs/v2/</loc>`);
    const entry = xml.split("<url>").find((u) => u.includes(`<loc>${SITE}/docs/v2/getting-started</loc>`));
    expect(entry).toBeDefined();
    expect(entry).toContain("<changefreq>yearly</changefreq>");
    expect(entry).toContain("<priority>0.3</priority>");
  });
});
