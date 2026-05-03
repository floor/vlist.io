---
created: 2026-04-16
updated: 2026-04-16
status: draft
---

# Cloudflare Pro setup — vlist.io

**Date:** 2026-04-16
**Plan:** Cloudflare Pro
**Stack:** Bun → PM2 (fork mode, 2 workers) → nginx → Cloudflare → user
**Origin:** Gandi.net, Let's Encrypt cert auto-renewed

This document records the Cloudflare configuration applied to vlist.io, why each choice was made, and what was deliberately skipped. Use it as a reference before changing CF settings, and as a recovery guide if something breaks.

---

## Summary

The site serves documentation, examples, benchmarks, and tutorials for the [vlist](https://github.com/floor/vlist) virtual scrolling library. Traffic is low (~1.3k req/day at time of setup) but we want global performance and sensible defense.

After setup:

- HTML pages and `/dist/*` assets are cached at the Cloudflare edge
- Compression (Brotli) flows end-to-end with single `Cache-Control` headers
- WAF blocks XSS and known exploits without breaking legit docs traffic
- Deploys automatically purge the CF cache via GitHub Actions
- AI training crawlers are allowed (for library discoverability)
- Markdown for Agents serves clean markdown to AI clients

Lighthouse score remains 100/100/100/100. The Bun origin sees substantially less traffic between deploys because the edge handles most requests.

---

## Architecture

```
┌──────────┐    ┌────────────┐    ┌───────┐    ┌────────────┐
│  Client  │ ←→ │ Cloudflare │ ←→ │ nginx │ ←→ │ Bun (PM2)  │
│ (browser)│    │  (edge)    │    │ :443  │    │ 127.0.0.1  │
└──────────┘    └────────────┘    └───────┘    │   :3338    │
                                               └────────────┘
                 ↑ WAF, cache,      ↑ thin       ↑ cache-control
                   bot detection,     pass-       source of truth
                   brotli, H/3        through     per cache.ts
```

**Single source of truth for caching:** `src/server/cache.ts` in the Bun app. nginx passes headers through unchanged; Cloudflare honors them via a Cache Rule.

---

## Section 1 — SSL / TLS ✅

| Setting | Value | Location |
|---|---|---|
| Encryption mode | **Full (strict)** | SSL/TLS → Overview |
| Minimum TLS version | **1.2** | SSL/TLS → Edge Certificates |
| TLS 1.3 | **On** | SSL/TLS → Edge Certificates |
| Always Use HTTPS | **On** | SSL/TLS → Edge Certificates |
| Automatic HTTPS Rewrites | **On** | SSL/TLS → Edge Certificates |
| Opportunistic Encryption | **On** | SSL/TLS → Edge Certificates |
| Edge certificate | Universal SSL (free, auto-renewed) | default |
| Origin certificate | Let's Encrypt via certbot + nginx | origin |

### HSTS — deferred

HSTS is **not enabled**. It should be enabled later, after the site has run stably for a few days with no mixed-content issues. Recommended rollout:

1. Enable with `max-age=300` (5 minutes) for testing
2. Verify nothing breaks for a day
3. Raise to `max-age=15768000` (6 months) with `includeSubDomains`
4. Optionally, months later, raise to 1 year and submit to [hstspreload.org](https://hstspreload.org)

HSTS is a one-way door — browsers cache it and enforce HTTPS for the configured duration even if the site goes down. Don't enable it until fully confident.

### Why we skipped Advanced Certificate Manager ($10/mo)

Universal SSL covers vlist.io and `*.vlist.io`, auto-renews, and costs nothing. ACM is only useful for custom cipher suites, custom SANs, or compliance requirements we don't have.

---

## Section 2 — Speed / Optimization ✅

### Settings applied

| Setting | State | Why |
|---|---|---|
| Brotli | Auto-on (CF default, 2024+) | No toggle needed |
| Early Hints | **On** | Speed → Optimization → Content Optimization |
| HTTP/2 | **On** | default |
| HTTP/3 (with QUIC) | **On** | Speed → Settings → Protocol Optimization |
| 0-RTT Connection Resumption | **On** | same section |
| Enhanced HTTP/2 Prioritization | Default | same section |
| Tiered Cache | **On** (Smart Tiered Caching) | Caching → Tiered Cache |
| Always Online | **On** | Caching → Configuration |

### Settings deliberately off

| Setting | State | Why |
|---|---|---|
| Rocket Loader | **Off** | Breaks ESM / importmaps used in `base.html` |
| Auto Minify | **N/A** (deprecated Aug 2024) | `/dist/*` already minified |
| Polish | **Off** | Few raster images on site |
| Mirage | **Off** | No benefit for a dev library |
| HTTP/2 to Origin | **Off** | Not needed; nginx handles origin leg fine over HTTP/1.1 |

**Critical side effect:** Mirage, Polish, and Rocket Loader all force CF to decompress and re-compress responses, which would defeat the pre-compressed `.br`/`.gz` files served from `/dist/*`. Keeping them off preserves the zero-CPU compression path.

### Verify compression is working

```bash
curl -sI -H "Accept-Encoding: br, gzip, zstd" https://vlist.io/ | grep -i content-encoding
# Expected: content-encoding: br
```

---

## Section 3 — Caching ✅ (the big one)

### What was broken before

1. **Duplicate `Cache-Control` headers** — nginx was appending its own via `expires 7d;` + `add_header`, conflicting with what Bun sent
2. **Wrong TTL on `/dist/*`** — 7 days instead of 1 year
3. **Gzip instead of brotli** — nginx was re-compressing Bun's pre-compressed `.br` output
4. **HTML pages not cached at edge** — `cf-cache-status: DYNAMIC` on every request; origin was hit for every page load

### What was fixed

**nginx config rewrite** (`/etc/nginx/sites-enabled/vlist.conf`):

- Removed `gzip on;` and `gzip_types` (CF compresses at edge)
- Removed the entire `location ~* \.(js|css|...)` block with `expires` and `add_header` directives
- Single `location /` now forwards everything transparently to Bun
- Preserved `proxy_set_header` lines for `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`
- Kept security headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`)

**Cloudflare Cache Rule** (Caching → Cache Rules):

| Field | Value |
|---|---|
| Name | Cache HTML pages (respect origin Cache-Control) |
| Match | All incoming requests |
| Cache eligibility | Eligible for cache |
| Edge TTL | Use cache-control header if present, use default Cloudflare caching behavior if not |
| Browser TTL | Respect origin |

This makes CF honor Bun's `s-maxage=3600` on HTML, which by default CF ignores (it only caches static extensions).

### How it works now

Bun's `src/server/cache.ts` defines four categories:

| Category | Cache-Control | Applies to |
|---|---|---|
| `CACHE_IMMUTABLE` | `public, max-age=31536000, immutable` | `/dist/*`, fonts, favicon |
| `CACHE_STATIC` | `public, max-age=604800, s-maxage=604800` | `/styles/*` |
| `CACHE_PAGE` | `public, s-maxage=3600, max-age=0, stale-while-revalidate=60` | all rendered HTML |
| `CACHE_META` | `public, s-maxage=3600, max-age=3600` | sitemap, robots |
| `CACHE_API` | `public, s-maxage=300, max-age=0` | `/api/*` |

nginx passes these through unchanged. CF respects them via the Cache Rule.

### Verify

```bash
# Should be HIT (after cache warms)
for path in / /docs/ /dist/index.js; do
  curl -sI "https://vlist.io$path" | grep -i "^cf-cache-status:"
done
```

---

## Section 4 — Security / WAF ✅

### What's enabled

| Component | State | Configuration |
|---|---|---|
| Automated Security Level | **Auto** (can't be changed since March 2025) | n/a |
| Cloudflare Managed Ruleset | **Active** | Default settings |
| OWASP Core Ruleset | **Active** | PL1 / Block / Anomaly threshold 40 |
| DDoS protection | **Active** | Automatic |

### What's deliberately off

| Component | State | Why |
|---|---|---|
| Super Bot Fight Mode detailed config | Defaults (mostly Allow) | Risk of blocking legit developer tools (curl, etc.); gains negligible for a dev library site |
| AI Labyrinth | **Off** | Modifies every HTML response, breaks pre-compressed path; threat model doesn't apply to open-source docs |
| Block AI training bots | **Off** | Library benefits from LLM training inclusion |
| Leaked credentials detection | **Off** | No login forms on site |
| Under Attack Mode | **Off** | Emergency-only |

### OWASP PL1 trade-off (documented here for future reference)

PL1 at threshold 40 catches high-confidence attacks (naked `<script>` XSS, known exploit patterns) but **does NOT** always catch:

- Simple path traversal (`?f=../../etc/passwd`)
- Basic SQLi (`?id=1' OR '1'='1`)

This is intentional. Higher paranoia levels block legitimate docs pages containing code examples. Since vlist.io has:

- No database (SQLi has nothing to hit)
- No file-reading endpoints (path traversal has nothing to read)
- No auth or user input beyond query strings

...the uncaught payloads have no practical impact.

### Optional follow-up: block path traversal via custom rule

If you want belt-and-suspenders, create a WAF Custom Rule:

- **Expression:** `(http.request.uri.query contains "../")`
- **Action:** Block

Near-zero false positive risk; blocks path traversal attempts at the edge regardless of paranoia level.

---

## Section 5 — Bots & AI crawlers ✅

| Setting | State |
|---|---|
| Block AI training bots | **Do not block (allow crawlers)** |
| robots.txt for Agents | **Off** (server generates its own `/robots.txt`) |
| Markdown for Agents (Beta) | **On** |

### Rationale

For an open-source library, maximizing exposure in LLM training data is a growth channel. When a developer asks Claude/ChatGPT "what's a good virtual scrolling library?", we want the answer to include vlist.

The `robots.txt` toggle is off because `src/server/sitemap.ts` generates the file dynamically — having CF inject a competing version would cause silent drift.

Markdown for Agents converts rendered HTML to clean markdown on the fly when clients send `Accept: text/markdown`. Agents get structured content with YAML frontmatter instead of HTML boilerplate.

### Verify

```bash
# HTML for browsers
curl -sS https://vlist.io/docs/ | head -1
# Expected: <!doctype html>

# Markdown for agents
curl -sS -H "Accept: text/markdown" https://vlist.io/docs/ | head -5
# Expected: YAML frontmatter + # headings
```

---

## Section 6 — Origin hardening ⏭️ (skipped, appropriate for this site)

Not implemented. Considered and declined because:

- No user data to protect
- No auth to brute-force
- Attackers bypassing CF only reach static public docs
- Bun origin handles load easily
- Operational complexity (CF IP list maintenance, cert renewal exceptions) outweighs the benefit

If the site ever grows authentication, payment flows, or PII, revisit this section.

### If revisiting later

The two sub-changes would be:

1. **Trust CF IPs for real client IPs in logs** (low risk, useful for debugging):
   - Add `set_real_ip_from <CF-ranges>` and `real_ip_header CF-Connecting-IP;` to nginx
   - List: https://www.cloudflare.com/ips-v4/ + /ips-v6/

2. **Restrict port 443 to CF IPs only** (higher risk, security win):
   - Add `allow <CF-ranges>; deny all;` to nginx
   - Keep `/.well-known` exempt for Let's Encrypt renewals
   - Requires cron to refresh IP list weekly

---

## Section 7 — Deploy cache-purge automation ✅

### What it does

On every push to `main`, after the SSH deploy succeeds, GitHub Actions calls Cloudflare's API to purge the edge cache. This ensures users see fresh HTML immediately after deploy instead of waiting up to 1 hour for the `s-maxage=3600` TTL to expire.

### Configuration

**GitHub secrets** (Settings → Secrets and variables → Actions):

| Secret | Purpose |
|---|---|
| `CF_API_TOKEN` | Scoped CF token with `Zone → Cache Purge → Purge` permission on vlist.io zone |
| `CF_ZONE_ID` | vlist.io zone ID from CF dashboard Overview page |
| `SERVER_HOST`, `SERVER_USER`, `SERVER_SSH_KEY`, `SERVER_PORT` | Unchanged from existing deploy |

**Workflow step** (`.github/workflows/deploy.yml`):

```yaml
- name: Purge Cloudflare cache
  run: |
    curl -sf -X POST \
      "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
    echo "🧹 Cloudflare cache purged"
```

### Known issue fixed

`CF_API_TOKEN` was previously an empty value in GitHub secrets (created 2 weeks ago but never populated). Deploys were silently not purging. Token was rotated and re-added during setup.

### Optional hardening

The current purge step uses `curl -sf` which fails on HTTP error codes but not on `{"success": false}` in the body. For stricter validation, replace with:

```yaml
- name: Purge Cloudflare cache
  run: |
    response=$(curl -sS -X POST \
      "https://api.cloudflare.com/client/v4/zones/${{ secrets.CF_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CF_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}')
    echo "$response"
    if ! echo "$response" | grep -q '"success":true'; then
      echo "::error::Cloudflare purge failed"
      exit 1
    fi
    echo "🧹 Cloudflare cache purged"
```

---

## Section 8 — Verification ✅

`scripts/verify-cloudflare.sh` runs all tests in one pass. Uses absolute paths to survive shell PATH issues.

```bash
./scripts/verify-cloudflare.sh
```

Tests:

1. Cache hit rates across 7 path types
2. Compression + cache headers (single header, brotli)
3. WAF (legit passes, XSS blocked)
4. HTTP/2 + HTTP/3 + Alt-Svc
5. Markdown for Agents
6. SSL/TLS and HTTP→HTTPS redirect

Run after any CF configuration change or major deploy.

---

## What remains / future work

### High value (do when you have time)

| Item | Effort | Impact |
|---|---|---|
| Enable HSTS | 5 min + 1 week observation | Security (prevents downgrade attacks) |
| Add path-traversal custom rule | 2 min | Security belt-and-suspenders |

### Low value (probably not worth it)

| Item | Why it's low value |
|---|---|
| nginx CF real-IP | Logs are already sufficient for current traffic volume |
| Restrict port 443 to CF IPs | Operationally fragile; low real-world risk given site has no sensitive data |
| Super Bot Fight Mode detailed tuning | Risk of blocking legit dev tools > benefit |
| Argo Smart Routing ($5/mo) | LCP already 0.3s; no benefit |

### Revisit in 1-2 months

- Check **Security → Events** log for WAF false positives. If clean, consider raising OWASP paranoia to PL2.
- Review **Analytics** for cache hit ratio. Should trend toward 80-90% `Served by Cloudflare`.
- Review WAF logs for real attack patterns to understand what's actually hitting the site.

---

## Troubleshooting

### Headers look wrong or inconsistent

**First check**: Is nginx re-adding them?

```bash
# On the server, hit Bun directly (bypass nginx + CF)
curl -I http://127.0.0.1:3338/dist/index.js | grep -i cache-control
```

Should return a single `Cache-Control` header matching `cache.ts` constants.

If Bun's output is correct but `curl https://vlist.io/...` shows different headers, nginx is rewriting them. Check `/etc/nginx/sites-enabled/vlist.conf` for `expires` or `add_header Cache-Control` directives — remove them.

### `cf-cache-status: DYNAMIC` on HTML pages

Cache Rule isn't applying. Check:

1. Caching → Cache Rules — is the rule still deployed?
2. The rule's matcher — does it cover the path? (should be "All incoming requests")
3. Cache eligibility — must be "Eligible for cache"
4. Is the response setting `Set-Cookie`? CF won't cache responses with cookies even if eligible. Check with `curl -I ... | grep -i set-cookie`.

### `NODE_ENV=development` headers in production

Bun's `cache.ts` returns `"no-cache, no-store"` when `IS_PROD` is false. Verify:

```bash
# On the server
pm2 env <pid> | grep NODE_ENV
# Must show: NODE_ENV: production
```

If not, fix `ecosystem.config.cjs` and do `pm2 delete vlist.io && pm2 start ecosystem.config.cjs && pm2 save`. Note: `pm2 reload` doesn't always re-read env vars.

### Deploy cache purge silently failing

```bash
# Test the token manually
curl -sS -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer <token>"
# Should return "status":"active","success":true
```

If invalid, rotate the token in CF dashboard and update `CF_API_TOKEN` in GitHub secrets.

### HTTP/3 not advertised

Toggle location has moved multiple times. As of April 2026: **Speed → Settings → Protocol Optimization**.

Sometimes the dashboard toggle state desyncs from the backend. Fix by double-toggling (off → wait 5s → on).

---

## Change log

| Date | Change |
|---|---|
| 2026-04-16 | Initial Cloudflare Pro setup completed. SSL, Speed, Caching, WAF, Bots, Deploy automation all configured. Nginx rewritten. HTTP/3 enabled. |

---

## References

- [Cloudflare Cache Rules settings](https://developers.cloudflare.com/cache/how-to/cache-rules/settings/)
- [Cloudflare Origin Cache Control](https://developers.cloudflare.com/cache/concepts/cache-control/)
- [Content compression on Cloudflare](https://developers.cloudflare.com/speed/optimization/content/compression/)
- [HTTP/3 (with QUIC) docs](https://developers.cloudflare.com/speed/optimization/protocol/http3/)
- [Automated Security Level announcement](https://blog.cloudflare.com/enhanced-security-and-simplified-controls-with-automated-botnet-protection/)
- Repo: `src/server/cache.ts`, `nginx/vlist.conf`, `.github/workflows/deploy.yml`
