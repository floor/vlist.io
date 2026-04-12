// src/server/renderers/homepage.ts
// Homepage renderer using Eta template

import { Eta } from "eta";
import { join, resolve } from "path";
import { readFileSync, existsSync } from "fs";

import { SITE, IS_PROD } from "./config";
import { VLIST_ROOT } from "../config";
import { htmlHeaders } from "../cache";

// =============================================================================
// Types
// =============================================================================

interface NavItem {
  label: string;
  href: string;
  external: boolean;
  key?: string;
}

interface ExampleItem {
  slug: string;
  name: string;
  desc: string;
  features?: string[];
}

interface ExampleGroup {
  label: string;
  items: ExampleItem[];
}

// =============================================================================
// Eta Configuration
// =============================================================================

const eta = new Eta({
  cache: true,
  rmWhitespace: true,
  autoEscape: false,
  useWith: false,
  varName: "it",
});

// =============================================================================
// Quick Start Code Block (preserved outside Eta to avoid rmWhitespace stripping)
// =============================================================================

const QUICKSTART_CODE = `<span class="kw">import</span> { <span class="fn">vlist</span> } <span class="kw">from</span> <span class="str">"@floor/vlist"</span>

<span class="kw">const</span> list <span class="op">=</span> <span class="fn">vlist</span>({
  <span class="prop">container</span><span class="par">:</span> <span class="str">"#list"</span>,
  <span class="prop">item</span><span class="par">:</span> {
    <span class="prop">height</span><span class="par">:</span> <span class="num">56</span>,
    <span class="prop">template</span><span class="par">:</span> (item) <span class="op">=&gt;</span> <span class="str">\`
      &lt;div class="user"&gt;
        &lt;span class="avatar"&gt;\${</span>item.<span class="prop">avatar</span><span class="str">}&lt;/span&gt;
        &lt;div&gt;
          &lt;b&gt;\${</span>item.<span class="prop">firstName</span><span class="str">} \${</span>item.<span class="prop">lastName</span><span class="str">}&lt;/b&gt;
          &lt;small&gt;\${</span>item.<span class="prop">role</span><span class="str">} · \${</span>item.<span class="prop">company</span><span class="str">}&lt;/small&gt;
        &lt;/div&gt;
      &lt;/div&gt;\`</span>
  }
}).<span class="fn">build</span>()

list.<span class="fn">setItems</span>(<span class="fn">generateUsers</span>(<span class="num">100_000</span>))`;

// =============================================================================
// Template & Navigation Loading
// =============================================================================

let templateCache: string | null = null;
let navCache: NavItem[] | null = null;
let exampleGroupsCache: ExampleGroup[] | null = null;
let versionCache: string | null = null;
let bundleSizeCache: string | null = null;
let pageCache: string | null = null;

function loadTemplate(): string {
  if (!templateCache || !IS_PROD) {
    const templatePath = resolve("src/server/shells/homepage.eta");
    templateCache = readFileSync(templatePath, "utf-8");
  }
  return templateCache;
}

function loadNavigation(): NavItem[] {
  if (!navCache) {
    const navPath = resolve("src/server/config/navigation.json");
    const navData = readFileSync(navPath, "utf-8");
    navCache = JSON.parse(navData);
  }
  return navCache!;
}

function loadExampleGroups(): ExampleGroup[] {
  if (!exampleGroupsCache || !IS_PROD) {
    const navPath = join(resolve("./examples"), "navigation.json");
    const raw = readFileSync(navPath, "utf-8");
    exampleGroupsCache = JSON.parse(raw) as ExampleGroup[];
  }
  return exampleGroupsCache;
}

function loadVersion(): string {
  if (!versionCache && VLIST_ROOT) {
    try {
      const pkgPath = resolve(VLIST_ROOT, "package.json");
      const pkgData = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(pkgData);
      versionCache = pkg.version || "1.0.0";
    } catch {
      versionCache = "1.0.0";
    }
  }
  return versionCache || "1.0.0";
}

function loadBundleSize(): string {
  return bundleSizeCache || "~9";
}

/**
 * Measure the real gzipped base bundle size via a minified tree-shaken build.
 * Called once at startup; result is cached for all subsequent renders.
 */
async function initBundleSize(): Promise<void> {
  if (bundleSizeCache && IS_PROD) return;
  if (!VLIST_ROOT) {
    bundleSizeCache = "~9";
    return;
  }
  try {
    // Prefer src/index.ts (local dev), fall back to dist/index.js (production deploy)
    const srcEntry = resolve(VLIST_ROOT, "src/index.ts");
    const distEntry = resolve(VLIST_ROOT, "dist/index.js");
    const entry = existsSync(srcEntry) ? srcEntry : distEntry;

    if (!existsSync(entry)) {
      bundleSizeCache = "~9";
      return;
    }

    const code = `import { vlist } from "${entry}"; globalThis._v = [vlist];`;
    const tmpFile = "/tmp/_vlist_homepage_size.ts";
    await Bun.write(tmpFile, code);

    const build = await Bun.build({
      entrypoints: [tmpFile],
      minify: true,
      target: "browser",
      format: "esm",
    });

    if (build.success) {
      const output = await build.outputs[0]!.arrayBuffer();
      const compressed = Bun.gzipSync(new Uint8Array(output));
      bundleSizeCache = (compressed.byteLength / 1024).toFixed(1);
    } else {
      bundleSizeCache = "~9";
    }
  } catch {
    bundleSizeCache = "~9";
  }
}

// Kick off measurement at startup (non-blocking)
initBundleSize();

// =============================================================================
// Homepage Renderer
// =============================================================================

/**
 * Render the homepage
 */
export function renderHomepage(): Response {
  // In dev, always re-render so changes are picked up without restarting
  if (!pageCache || !IS_PROD) {
    const template = loadTemplate();
    pageCache = eta.renderString(template, {
      title: "VList — Virtual List for the Web",
      description:
        "VList — a lightweight, high-performance virtual list for the web. Zero dependencies, infinite scroll, selection, grid layout, and more.",
      canonicalUrl: SITE,
      version: loadVersion(),
      bundleSize: loadBundleSize(),
      navItems: loadNavigation(),
      exampleGroups: loadExampleGroups(),
      quickstartCode: QUICKSTART_CODE,
    });
  }

  return new Response(pageCache, {
    headers: htmlHeaders(),
  });
}

/**
 * Clear homepage cache (for development)
 */
export function clearCache(): void {
  templateCache = null;
  navCache = null;
  exampleGroupsCache = null;
  versionCache = null;
  bundleSizeCache = null;
  pageCache = null;
}
