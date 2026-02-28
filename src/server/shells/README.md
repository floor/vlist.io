# VList Shell Templates

This directory contains HTML shell templates for the VList documentation site.

## 📁 Files

- **`base.html`** - **NEW**: Unified shell template with all features
- `examples.html` - Legacy: Examples section (use base.html instead)
- `content.html` - Legacy: Content pages (docs/tutorials) (use base.html instead)  
- `benchmarks.html` - Legacy: Benchmarks section (use base.html instead)

## 🎯 Unified Shell (`base.html`)

The new unified shell combines all features from the legacy shells:
- ✅ Palette dropdown (10 color themes)
- ✅ Light/dark mode toggle
- ✅ Table of contents support
- ✅ Syntax highlighting
- ✅ Source code tabs
- ✅ Import maps for benchmarks
- ✅ Enhanced SEO metadata
- ✅ Mobile responsive navigation

## 🔧 Template Variables

### Required Variables

```
{{TITLE}}        - Page title
{{DESCRIPTION}}  - Meta description
{{URL}}          - Canonical URL
{{SECTION}}      - Section name (Examples, Docs, Benchmarks, etc.)
{{SIDEBAR}}      - Sidebar navigation HTML
{{CONTENT}}      - Main content HTML
```

### Optional Variables

```
{{SECTION_LINK}}      - URL for section link (if clickable)
{{MAIN_CLASS}}        - Additional CSS class for <main> element
{{PAGE_ATTR}}         - data-page attribute value
{{TOC}}               - Table of contents HTML
{{EXTRA_HEAD}}        - Additional <head> content
{{EXTRA_BODY}}        - Additional <body> content (before scripts)
{{EXTRA_STYLES}}      - Page-specific stylesheets

{{OG_TYPE}}           - Open Graph type (default: website)
{{OG_SITE_NAME}}      - Open Graph site name
{{TWITTER_CARD}}      - Twitter card type (default: summary)
```

### Feature Flags (Conditional Blocks)

```
{{#if SEO_ENHANCED}}           - Enable enhanced SEO & structured data
{{#if HAS_IMPORTMAP}}          - Include import map for ES modules
{{#if HAS_TOC}}                - Enable table of contents & scroll spy
{{#if HAS_SYNTAX_HIGHLIGHTING}} - Include highlight.js
{{#if HAS_ACTIVE_NAV}}         - Auto-detect active nav link
{{#if HAS_SOURCE_TABS}}        - Enable source code tab switching
```

## 📝 Usage Examples

### Example: Docs Page

```javascript
const html = renderTemplate('base.html', {
  TITLE: 'Getting Started - VList',
  DESCRIPTION: 'Learn how to use VList virtual scrolling',
  URL: 'https://vlist.dev/docs/getting-started',
  SECTION: 'Docs',
  SECTION_LINK: '/docs/',
  SIDEBAR: renderSidebar(),
  CONTENT: renderMarkdown(content),
  TOC: renderTOC(headings),
  EXTRA_STYLES: '<link rel="stylesheet" href="/styles/content.css" />',
  
  // Feature flags
  SEO_ENHANCED: true,
  HAS_TOC: true,
  HAS_SYNTAX_HIGHLIGHTING: true,
  HAS_ACTIVE_NAV: true,
  
  // Metadata
  OG_TYPE: 'article',
  OG_SITE_NAME: 'VList',
  TWITTER_CARD: 'summary_large_image'
});
```

### Example: Examples Page

```javascript
const html = renderTemplate('base.html', {
  TITLE: 'Velocity Loading - VList Examples',
  DESCRIPTION: 'Smart data loading example',
  URL: 'https://vlist.dev/examples/velocity-loading',
  SECTION: 'Examples',
  SECTION_LINK: '/examples/',
  SIDEBAR: renderSidebar(),
  CONTENT: renderExample(content),
  MAIN_CLASS: ' content--with-source',
  EXTRA_STYLES: '<link rel="stylesheet" href="/dist/examples/styles.css" />',
  
  // Feature flags
  HAS_SOURCE_TABS: true,
  HAS_SYNTAX_HIGHLIGHTING: true,
  
  // Metadata
  OG_TYPE: 'website',
  TWITTER_CARD: 'summary'
});
```

### Example: Benchmarks Page

```javascript
const html = renderTemplate('base.html', {
  TITLE: 'VList Benchmarks',
  DESCRIPTION: 'Performance benchmarks for VList',
  URL: 'https://vlist.dev/benchmarks/',
  SECTION: 'Benchmarks',
  SIDEBAR: renderSidebar(),
  CONTENT: renderBenchmark(content),
  PAGE_ATTR: 'benchmark-suite',
  EXTRA_STYLES: `
    <link rel="stylesheet" href="/dist/vlist.css" />
    <link rel="stylesheet" href="/benchmarks/dist/styles.css" />
  `,
  EXTRA_BODY: '<script type="module" src="/benchmarks/suite.js"></script>',
  
  // Feature flags
  HAS_IMPORTMAP: true,
  
  // Metadata
  OG_TYPE: 'website',
  TWITTER_CARD: 'summary'
});
```

## 🎨 Theme System

The unified shell includes:

### Color Palettes (10 themes)

- Ocean
- Forest  
- Desert
- Spring
- Summer
- Autumn
- Winter
- Sunset
- Material
- High Contrast

### Mode Toggle

- Light mode
- Dark mode
- System preference detection

### Storage

Preferences are saved to localStorage:
- `vlist-palette` - Selected color palette
- `vlist-theme-mode` - Light/dark mode preference

## 🔄 Migration Guide

### From `examples.html`

1. Replace `examples.html` with `base.html`
2. Add `HAS_SOURCE_TABS: true` flag
3. Keep `MAIN_CLASS` for source panel styling
4. Palette dropdown is included by default ✅

### From `content.html`

1. Replace `content.html` with `base.html`  
2. Add `SEO_ENHANCED: true` flag
3. Add `HAS_TOC: true` if page has table of contents
4. Add `HAS_SYNTAX_HIGHLIGHTING: true` for code blocks
5. Add `HAS_ACTIVE_NAV: true` for nav highlighting
6. Palette dropdown is included by default ✅

### From `benchmarks.html`

1. Replace `benchmarks.html` with `base.html`
2. Add `HAS_IMPORTMAP: true` flag
3. Include vlist.css in `EXTRA_STYLES`
4. Palette dropdown is included by default ✅

## 🎯 Benefits

- **Single source of truth** - Update once, affects all pages
- **Consistent UX** - Same features everywhere
- **Easy maintenance** - Fix bugs in one place
- **Smaller codebase** - ~70% reduction in shell code
- **New features** - Palette dropdown on all pages

## 📦 Template System

The shell uses a simple template system with:
- `{{VARIABLE}}` - Variable substitution
- `{{#if FLAG}}...{{/if}}` - Conditional blocks

Your build system should support these patterns for the unified shell to work correctly.

---

**Note**: The legacy shell files (`examples.html`, `content.html`, `benchmarks.html`) can be removed once all pages are migrated to `base.html`.