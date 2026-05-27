---
created: 2026-05-27
updated: 2026-05-27
status: published
---

# SEO Strategy

Internal reference for vlist.io search engine optimization. Not served on the site.

## Sitemap Structure

| Section | Priority | Changefreq | Notes |
|---------|----------|------------|-------|
| `/` | 1.0 | weekly | Landing page |
| `/docs/*` (v2) | 0.7–0.9 | weekly/monthly | Primary docs |
| `/docs/v1/*` (with v2 match) | 0.3 | yearly | Canonical points to v2 equivalent |
| `/docs/v1/*` (v1-only) | 0.4 | yearly | Canonical points to self |
| `/tutorials/*` (v2) | 0.7–0.9 | weekly/monthly | Primary tutorials |
| `/tutorials/v1/*` (with v2 match) | 0.3 | yearly | Canonical points to v2 equivalent |
| `/tutorials/v1/*` (v1-only) | 0.4 | yearly | Canonical points to self |
| `/blog/*` | 0.6–0.8 | monthly | |
| `/examples/*` | 0.6–0.9 | monthly | |
| `/benchmarks/*` | 0.5–0.8 | monthly | |

## Canonical Tags

v1 docs pages with a v2 equivalent have `<link rel="canonical">` pointing to the v2 URL. This tells crawlers the v2 page is authoritative.

Mapping is defined in `src/server/version-map.ts`. Examples:

| v1 URL | Canonical (v2) |
|--------|---------------|
| `/docs/v1/features/grid` | `/docs/plugins/grid` |
| `/docs/v1/features/async` | `/docs/plugins/data` |
| `/docs/v1/api/reference` | `/docs/api` |
| `/docs/v1/api/types` | `/docs/api` |
| `/docs/v1/resources/bundle-size` | `/docs/bundle-size` |
| `/tutorials/v1/quick-start` | `/tutorials/quick-start` |
| `/tutorials/v1/builder-pattern` | `/tutorials/plugin-system` |
| `/tutorials/v1/chat-interface` | `/tutorials/chat-interface` |

v1 pages without a v2 equivalent (internals, refactoring) keep canonical pointing to themselves.

## Search Isolation

Search results are scoped by version via the `version` query param on `/api/search`:

- **v2 pages** (default): v1 results excluded
- **v1 pages**: only v1 results shown

Detection is client-side based on `window.location.pathname`.

## Version Switcher

Segmented button (v1 | v2) in the content area of docs and tutorials pages. Links to the equivalent page in the other version when a mapping exists, otherwise to the overview.

Controlled by `MATCH_VERSION_SLUGS` flag in `src/server/version-map.ts` — set to `false` to disable slug matching and always link to the overview.

## Google Search Console

**Property:** vlist.io

### Before v2 Launch (as of 2026-05-22)

- 50 pages indexed, 48 not indexed
- 27 pages "Discovered - currently not indexed" (likely new pages)
- 4 pages "Duplicate, Google chose different canonical than user"
- 3 pages "Alternate page with proper canonical tag"
- 1 page 404

### At v2 Launch

1. Deploy all changes to production (merge to `main`)
2. Go to Google Search Console > Sitemaps
3. Resubmit `https://vlist.io/sitemap.xml`
4. Monitor "Alternate page with proper canonical tag" — should grow as Google processes v1 canonicals
5. Check that "Duplicate, Google chose different canonical" drops as explicit canonicals take effect
6. Use URL Inspection tool to verify a few v1 pages show the correct canonical
