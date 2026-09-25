// src/server/renderers/index.ts
// Barrel export for all renderers

export { SITE } from "./config";

export { renderHomepage, clearCache as clearHomepageCache } from "./homepage";

export {
  loadShell,
  loadNavigation,
  buildSidebar,
  buildSidebarWithOverview,
  getValidSlugs,
  findNavItem,
  clearShellCache,
  clearNavCache,
  clearAllCaches,
  type RendererConfig,
  type BaseNavItem,
  type BaseNavGroup,
} from "./base";

export {
  renderDocsPage,
  renderTutorialPage,
  renderDocsV1Page,
  renderTutorialV1Page,
  renderDocsV2Page,
  renderTutorialV2Page,
  renderBlogPage,
  clearDocsCache,
  clearTutorialsCache,
  clearDocsV1Cache,
  clearTutorialsV1Cache,
  clearDocsV2Cache,
  clearTutorialsV2Cache,
  clearBlogCache,
  docsRenderer,
  tutorialsRenderer,
  docsV1Renderer,
  tutorialsV1Renderer,
  docsV2Renderer,
  tutorialsV2Renderer,
  blogRenderer,
  DOC_GROUPS,
  TUTORIAL_GROUPS,
  DOC_V1_GROUPS,
  TUTORIAL_V1_GROUPS,
  DOC_V2_GROUPS,
  TUTORIAL_V2_GROUPS,
  BLOG_GROUPS,
  getDocSlugSets,
  createContentRenderer,
  type NavItem,
  type NavGroup,
  type OverviewSection,
  type ContentConfig,
} from "./content";

export {
  renderExamplesPage,
  clearCache as clearExamplesCache,
  EXAMPLE_GROUPS,
  type ExampleItem,
  type ExampleGroup,
} from "./examples";

export {
  renderBenchmarkPage,
  clearCache as clearBenchmarksCache,
  BENCH_GROUPS,
  type BenchItem,
  type BenchGroup,
} from "./benchmarks";
