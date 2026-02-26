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
  clearDocsCache,
  clearTutorialsCache,
  docsRenderer,
  tutorialsRenderer,
  DOC_GROUPS,
  TUTORIAL_GROUPS,
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
