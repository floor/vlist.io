# highlight.js 11.12.0 (self-hosted)

The syntax-highlighting scripts vlist.io serves, vendored from the npm package
`@highlightjs/cdn-assets@11.12.0` — the exact version the jsDelivr tag
`highlightjs/cdn-release@11` resolved to on 2026-10-03. All six script files here are
byte-identical to what that CDN served; they are copied unmodified.

- `highlight.min.js` — the core
- `languages/typescript.min.js`, `bash.min.js`, `css.min.js`, `scss.min.js`, `xml.min.js` —
  the five languages the site registers (with `vue`, `svelte` and `astro` aliased to `xml`)
- `LICENSE` — highlight.js is BSD-3-Clause (the minified files carry the same header)

`src/server/shells/base.html` loads these under `/vendor/highlightjs/` in both the eager
path (docs and tutorials with visible code blocks) and the lazy path (on demand, or on
first paint for content pages). The page therefore loads no asset from a third-party
origin.

To update: take the new release's `cdn-assets` package
(`https://registry.npmjs.org/@highlightjs/cdn-assets/-/cdn-assets-<version>.tgz`; paths
inside are `highlight.min.js`, `languages/*.min.js`, `LICENSE`), replace these files, and
update this file and the version above.
