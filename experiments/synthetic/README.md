# Synthetic scroll device experiment

Primary URL: https://vlist.io/experiments/synthetic/

The existing https://floor.io/experiments/synthetic/ remains available independently.
Both pages use the same standalone candidate B motion driver. No production vlist
scroll behavior changes. This deployable experiment derives from the RFC-013
`gate-b/synthetic/` prototype; `native/` preserves the earlier native-runway comparison.

- Vertical: `/experiments/synthetic/`
- Horizontal: `/experiments/synthetic/?axis=x`
- Native runway: `/experiments/synthetic/native/`

Run the existing vlist.io server with `bun run server.ts` and open the same route
on its configured port (default 3338). The experiment renderer generates HTML through the existing shared Eta engine,
base shell, navigation and compression pipeline. Content lives in `index.eta`;
`styles.css` scopes test-area styles so the site header is unaffected. The native
comparison uses Eta with an isolated full-viewport template to preserve its
measurement setup. No generated HTML files are committed.

ES modules and CSS use the existing static handler. HTML and experiment assets
bypass caching. The router canonicalizes slashless paths and preserves queries.

Follow the on-page iOS/Android checklist. Enter device/browser information and
observations, then export each axis result before navigating away. Notes and
telemetry stay in the current page; there is no upload service or cross-reload
persistence. The JSON records its source URL, revision, motion trace and counters.

Same-axis touch deliberately stops at list boundaries without parent handoff;
physical-device assessment of this tradeoff, pinch zoom and feel remains open.
The native range slider is a prototype control, not production scrollbar work.

Verify routing with `bun test test/synthetic-experiment.test.ts` and run the existing
`scripts/debug/tests/synthetic-touch.mjs` browser harness with
`--base=https://vlist.io/experiments/synthetic/` (or a local server URL).
