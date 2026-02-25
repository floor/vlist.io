# Eta Template Engine Migration Guide

This guide walks through migrating the VList shell rendering system from manual regex replacements to the Eta template engine.

## Why Eta?

**Current problems with regex replacement:**
- ❌ Order-dependent (conditionals must be replaced before variables)
- ❌ Error-prone (easy to miss template tags)
- ❌ Verbose (70+ lines of replacements per renderer)
- ❌ Hard to debug (no helpful error messages)
- ❌ No nested conditionals support

**Benefits of Eta:**
- ✅ TypeScript-first (built for modern tooling)
- ✅ Fast (pre-compiles templates)
- ✅ Small (5KB minified)
- ✅ Excellent error messages
- ✅ Clean syntax similar to our current templates
- ✅ Supports partials, helpers, loops
- ✅ Works perfectly with Bun

## Installation

```bash
bun add eta
```

## Eta Syntax

Eta uses slightly different syntax than Handlebars, but it's cleaner:

### Variables

```html
<!-- Before (our current syntax) -->
{{TITLE}}

<!-- After (Eta) -->
<%= it.TITLE %>
```

### Conditionals

```html
<!-- Before (our current syntax) -->
{{#if SEO_ENHANCED}}
  <meta name="author" content="Floor IO" />
{{/if}}

<!-- After (Eta) -->
<% if (it.SEO_ENHANCED) { %>
  <meta name="author" content="Floor IO" />
<% } %>
```

### Conditionals with else

```html
<!-- Eta syntax -->
<% if (it.SECTION_LINK) { %>
  <a href="<%= it.SECTION_LINK %>" class="header__section"><%= it.SECTION %></a>
<% } else { %>
  <span class="header__section"><%= it.SECTION %></span>
<% } %>
```

## Migration Steps

### Step 1: Convert base.html Template

Replace all template tags with Eta syntax:

```html
<!-- Variables: {{VAR}} → <%= it.VAR %> -->
<title><%= it.TITLE %></title>
<meta name="description" content="<%= it.DESCRIPTION %>" />

<!-- Conditionals: {{#if FLAG}}...{{/if}} → <% if (it.FLAG) { %>...<% } %> -->
<% if (it.SEO_ENHANCED) { %>
  <meta name="author" content="Floor IO" />
<% } %>

<!-- Conditional with content -->
<% if (it.OG_SITE_NAME) { %>
  <meta property="og:site_name" content="<%= it.OG_SITE_NAME %>" />
<% } %>
```

### Step 2: Update Renderers

Replace manual regex replacements with Eta.render():

**Before (examples.ts):**
```typescript
function assemblePage(...): string {
  const shell = loadShell();
  
  return shell
    .replace(/{{TITLE}}/g, title)
    .replace(/{{DESCRIPTION}}/g, description)
    .replace(/{{#if SEO_ENHANCED}}[\s\S]*?{{\/if}}/g, "")
    // ... 20+ more replacements
}
```

**After (examples.ts):**
```typescript
import * as Eta from 'eta';

function assemblePage(...): string {
  const shell = loadShell();
  
  return Eta.render(shell, {
    TITLE: title,
    DESCRIPTION: description,
    URL: url,
    SECTION: 'Examples',
    SECTION_LINK: '/examples/',
    SIDEBAR: sidebar,
    CONTENT: content,
    EXTRA_STYLES: '<link rel="stylesheet" href="/dist/examples/styles.css" />',
    EXTRA_HEAD: extraHead,
    EXTRA_BODY: extraBody,
    MAIN_CLASS: mainClass,
    
    // SEO metadata
    OG_TYPE: 'website',
    OG_SITE_NAME: null, // Don't show for examples
    TWITTER_CARD: 'summary',
    
    // Feature flags
    SEO_ENHANCED: false,
    HAS_IMPORTMAP: false,
    HAS_TOC: false,
    HAS_SYNTAX_HIGHLIGHTING: true,
    HAS_ACTIVE_NAV: false,
    HAS_SOURCE_TABS: true,
    PAGE_ATTR: null
  }) as string;
}
```

### Step 3: Configure Eta

Add configuration for better performance and TypeScript support:

```typescript
// src/server/config/eta.ts
import * as Eta from 'eta';

export const etaConfig = {
  // Use template caching for better performance
  cache: true,
  
  // Async rendering not needed (we have sync data)
  async: false,
  
  // Remove whitespace for smaller HTML
  rmWhitespace: true,
  
  // Throw on undefined variables (helps catch bugs)
  useWith: false,
  
  // Don't escape HTML (we control the content)
  autoEscape: false
};

// Helper for rendering with config
export function render(template: string, data: any): string {
  return Eta.render(template, data, etaConfig) as string;
}
```

## Complete Migration Example

### Before: benchmarks.ts (Old System)

```typescript
function assemblePage(
  slug: string | null,
  item: BenchItem | null,
  content: string,
  page: string,
  variant?: Variant,
  queryString?: string,
): string {
  const shell = loadShell();
  const title = item ? `VList — ${item.name} Benchmark` : "VList — Benchmarks";
  const description = item ? `VList ${item.name.toLowerCase()} benchmark — ${item.desc}` : "...";
  const sidebar = buildSidebar(slug, variant);
  const extraBody = page !== "overview" ? `<script type="module" src="/benchmarks/dist/script.js"></script>` : "";
  const url = slug ? `${SITE}/benchmarks/${slug}${queryString || ""}` : `${SITE}/benchmarks/`;

  return (
    shell
      // 30+ lines of replacements...
      .replace(/{{TITLE}}/g, title)
      .replace(/{{DESCRIPTION}}/g, description)
      // ... etc
  );
}
```

### After: benchmarks.ts (With Eta)

```typescript
import { render } from '../config/eta';

function assemblePage(
  slug: string | null,
  item: BenchItem | null,
  content: string,
  page: string,
  variant?: Variant,
  queryString?: string,
): string {
  const shell = loadShell();
  const title = item ? `VList — ${item.name} Benchmark` : "VList — Benchmarks";
  const description = item ? `VList ${item.name.toLowerCase()} benchmark — ${item.desc}` : "...";
  const url = slug ? `${SITE}/benchmarks/${slug}${queryString || ""}` : `${SITE}/benchmarks/`;

  return render(shell, {
    // Page content
    TITLE: title,
    DESCRIPTION: description,
    URL: url,
    SECTION: 'Benchmarks',
    SECTION_LINK: null,
    SIDEBAR: buildSidebar(slug, variant),
    CONTENT: content,
    
    // Styles & scripts
    EXTRA_STYLES: '<link rel="stylesheet" href="/dist/vlist.css" />\n    <link rel="stylesheet" href="/benchmarks/dist/styles.css" />',
    EXTRA_HEAD: '',
    EXTRA_BODY: page !== "overview" ? '<script type="module" src="/benchmarks/dist/script.js"></script>' : '',
    MAIN_CLASS: '',
    
    // SEO metadata
    OG_TYPE: 'website',
    OG_SITE_NAME: null,
    TWITTER_CARD: 'summary',
    
    // Feature flags
    SEO_ENHANCED: false,
    HAS_IMPORTMAP: true,
    HAS_TOC: false,
    HAS_SYNTAX_HIGHLIGHTING: false,
    HAS_ACTIVE_NAV: false,
    HAS_SOURCE_TABS: false,
    PAGE_ATTR: page
  });
}
```

**Code reduction: ~40 lines → ~20 lines (50% reduction per renderer)**

## Updated base.html Template

Here's what the converted template looks like:

```html
<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title><%= it.TITLE %></title>
    <meta name="description" content="<%= it.DESCRIPTION %>" />
    <link rel="canonical" href="<%= it.URL %>" />
    
    <!-- Open Graph -->
    <meta property="og:type" content="<%= it.OG_TYPE %>" />
    <meta property="og:url" content="<%= it.URL %>" />
    <meta property="og:title" content="<%= it.TITLE %>" />
    <meta property="og:description" content="<%= it.DESCRIPTION %>" />
    <% if (it.OG_SITE_NAME) { %>
    <meta property="og:site_name" content="<%= it.OG_SITE_NAME %>" />
    <% } %>
    
    <!-- Twitter -->
    <meta name="twitter:card" content="<%= it.TWITTER_CARD %>" />
    <meta name="twitter:url" content="<%= it.URL %>" />
    <meta name="twitter:title" content="<%= it.TITLE %>" />
    <meta name="twitter:description" content="<%= it.DESCRIPTION %>" />
    
    <% if (it.SEO_ENHANCED) { %>
    <!-- Additional SEO -->
    <meta name="author" content="Floor IO" />
    <meta name="robots" content="index, follow, max-snippet:-1" />
    
    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": "<%= it.TITLE %>",
      "description": "<%= it.DESCRIPTION %>",
      "url": "<%= it.URL %>"
    }
    </script>
    <% } %>
    
    <!-- Common styles -->
    <link rel="stylesheet" href="/styles/shell.css" />
    <link rel="stylesheet" href="/styles/themes/index.css" />
    
    <!-- Page-specific styles -->
    <%~ it.EXTRA_STYLES %>
    
    <% if (it.HAS_IMPORTMAP) { %>
    <!-- Import map -->
    <script type="importmap">
    {
      "imports": {
        "vlist": "/dist/index.js",
        "vlist/": "/dist/"
      }
    }
    </script>
    <% } %>
    
    <%~ it.EXTRA_HEAD %>
</head>
<body>
    <header class="header">
      <!-- ... header content ... -->
      
      <% if (it.SECTION_LINK) { %>
      <a href="<%= it.SECTION_LINK %>" class="header__section"><%= it.SECTION %></a>
      <% } else { %>
      <span class="header__section"><%= it.SECTION %></span>
      <% } %>
    </header>
    
    <div class="layout">
      <nav class="sidebar"><%~ it.SIDEBAR %></nav>
      <main class="content<%= it.MAIN_CLASS || '' %>"<% if (it.PAGE_ATTR) { %> id="content" data-page="<%= it.PAGE_ATTR %>"<% } %>>
        <%~ it.CONTENT %>
      </main>
      <% if (it.HAS_TOC) { %><%~ it.TOC %><% } %>
    </div>
    
    <%~ it.EXTRA_BODY %>
    
    <% if (it.HAS_SYNTAX_HIGHLIGHTING) { %>
    <!-- Syntax highlighting -->
    <script src="...highlight.min.js"></script>
    <script>hljs.highlightAll();</script>
    <% } %>
</body>
</html>
```

**Note:** `<%~ %>` outputs unescaped HTML (for SIDEBAR, CONTENT, etc.)

## Implementation Checklist

- [ ] Install Eta: `bun add eta`
- [ ] Create `src/server/config/eta.ts` with configuration
- [ ] Convert `base.html` to Eta syntax
- [ ] Update `benchmarks.ts` renderer
- [ ] Update `content.ts` renderer
- [ ] Update `examples.ts` renderer
- [ ] Test all page types
- [ ] Remove old regex replacement code
- [ ] Update documentation

## Testing Strategy

1. **Before migration:** Save rendered HTML output for comparison
2. **After migration:** Compare new output to old output
3. **Verify:** No changes in final HTML (except whitespace)

```bash
# Generate test pages before migration
bun run build
cp -r dist dist.before

# After migration
bun run build
diff -r dist.before dist

# Should show minimal/no differences
```

## Estimated Impact

**Code reduction:**
- `benchmarks.ts`: ~67 lines → ~30 lines (55% reduction)
- `content.ts`: ~84 lines → ~35 lines (58% reduction)
- `examples.ts`: ~72 lines → ~32 lines (56% reduction)

**Total:** ~220 lines → ~100 lines (54% reduction)

**Maintenance:** Much easier to add new features or template variables

## Alternative: Mustache

If you prefer zero-logic templates (closer to your original syntax):

```bash
bun add mustache
```

```typescript
import Mustache from 'mustache';

const html = Mustache.render(shell, {
  TITLE: title,
  SEO_ENHANCED: true,
  // Mustache uses same {{VAR}} and {{#if}} syntax you have now
});
```

**Mustache pros:**
- ✅ Zero migration effort (syntax matches perfectly)
- ✅ Logic-less (safer, simpler)

**Mustache cons:**
- ⚠️ Slower than Eta
- ⚠️ Weaker TypeScript support
- ⚠️ Less flexible for complex templates

## Recommendation

**Use Eta** for:
- Better TypeScript integration
- Faster performance
- More powerful features (helpers, partials)
- Modern, actively maintained

The syntax migration is straightforward, and the benefits are substantial.

---

**Ready to proceed?** I can implement the full Eta migration for you.