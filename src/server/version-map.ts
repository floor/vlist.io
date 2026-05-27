// src/server/version-map.ts
// Slug mapping between v1 and v2 documentation.
// Used by the version switcher, canonical tags, and sitemap.
//
// Set MATCH_VERSION_SLUGS to false to disable all slug matching
// and always link to the docs overview instead.

export const MATCH_VERSION_SLUGS = true;

// v2 slug → v1 slug (docs)
export const V2_TO_V1_DOCS: Record<string, string> = {
  "getting-started": "getting-started",
  "accessibility": "accessibility",
  "api": "api/reference",
  "adapters": "api/adapters",
  "plugins/overview": "features/overview",
  "plugins/selection": "features/selection",
  "plugins/async": "features/async",
  "plugins/scrollbar": "features/scrollbar",
  "plugins/sortable": "features/sortable",
  "plugins/groups": "features/groups",
  "plugins/scale": "features/scale",
  "plugins/page": "features/page",
  "plugins/snapshots": "features/snapshots",
  "plugins/transition": "features/transition",
  "plugins/autosize": "features/autosize",
  "plugins/grid": "features/grid",
  "plugins/table": "features/table",
  "plugins/masonry": "features/masonry",
  "bundle-size": "resources/bundle-size",
  "benchmarks": "resources/benchmarks",
};

// v1 slug → v2 slug (reverse + many-to-one for consolidated API page)
export const V1_TO_V2_DOCS: Record<string, string> = {};
for (const [v2, v1] of Object.entries(V2_TO_V1_DOCS)) {
  if (!(v1 in V1_TO_V2_DOCS)) V1_TO_V2_DOCS[v1] = v2;
}
V1_TO_V2_DOCS["api/types"] = "api";
V1_TO_V2_DOCS["api/events"] = "api";
V1_TO_V2_DOCS["api/constants"] = "api";
V1_TO_V2_DOCS["api/exports"] = "api";

// v2 slug → v1 slug (tutorials)
export const V2_TO_V1_TUTORIALS: Record<string, string> = {
  "quick-start": "quick-start",
  "plugin-system": "builder-pattern",
  "chat-interface": "chat-interface",
  "mobile": "mobile",
  "optimization": "optimization",
  "styling": "styling",
};

// v1 slug → v2 slug (tutorials, reverse)
export const V1_TO_V2_TUTORIALS: Record<string, string> = {};
for (const [v2, v1] of Object.entries(V2_TO_V1_TUTORIALS)) {
  if (!(v1 in V1_TO_V2_TUTORIALS)) V1_TO_V2_TUTORIALS[v1] = v2;
}
