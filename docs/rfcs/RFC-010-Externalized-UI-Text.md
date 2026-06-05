---
created: 2026-06-02
updated: 2026-06-02
status: draft
---

# RFC-010: Externalized UI Text

**Status:** Draft  
**Author:** floor  
**Type:** Architecture / Accessibility  
**Created:** 2026-06-02  
**Origin:** [RFC-008](./RFC-008-Search-Plugin.md) Search plugin follow-up

---

## Summary

vlist is a UI library, not an application. It renders structure and behavior; the *words* belong to the consumer. Until the search plugin, vlist held to this implicitly — the only human-readable string it ever exposed was `ariaLabel`, and that is supplied by the consumer through config, never hardcoded.

The search plugin broke that rule. It ships English text baked into the library: a root `aria-label="Search list"`, four icon-button labels (`"Search"`, `"Previous match"`, `"Next match"`, `"Clear search"`), a default placeholder (`"Search…"`), and the counter/status text — `"No results"`, `"1 of 3"`, `"3 results"` (with English singular/plural logic). This is the first time vlist embeds language. The counter is especially load-bearing: it is rendered in an `aria-live="polite"` region, so it is both visible *and* announced to screen readers.

This RFC establishes the policy that **vlist ships no inline human-language strings**: all consumer-facing text is either supplied by the consumer or isolated to a single documented, fully-overridable default constant per plugin. It defines the rule, the rationale (grounded in WAI-ARIA and WCAG), the API shape, and the convention for any future plugin that needs text.

---

## Background

vlist's text surface has always been thin by design:

- **Visible text** comes from the consumer's `template` — vlist never writes words into items.
- **Accessible names** for the list come from `ariaLabel`, a config option the consumer passes (`createVList({ ariaLabel: "Notable people" }, …)`). The core stamps it onto the list container and never invents one.
- **CSS** is themed entirely through `--vlist-*` custom properties — no embedded copy.

So the library was effectively language-agnostic without ever stating it as a rule. The search plugin, in the course of building an MD3-aligned search bar, introduced labels inline in `searchbar.ts`, a default `placeholder`, and counter formatting in `plugin.ts`. None of these are consumer-supplied; they are English literals compiled into the bundle.

The full inventory of baked-in strings:

| Source | String | Surface |
|--------|--------|---------|
| `searchbar.ts` root | `"Search list"` | `aria-label` on `role="search"` |
| `searchbar.ts` leading icon | `"Search"` | button `aria-label` |
| `searchbar.ts` prev / next | `"Previous match"` / `"Next match"` | button `aria-label` |
| `searchbar.ts` clear | `"Clear search"` | button `aria-label` |
| `plugin.ts` placeholder default | `"Search…"` | input `placeholder` + `aria-label` |
| `plugin.ts:169` | `"No results"` | visible + `aria-live` |
| `plugin.ts:171` | `` `${current + 1} of ${matches.length}` `` | visible + `aria-live` |
| `plugin.ts:173` | `` `${n} result${n === 1 ? "" : "s"}` `` | visible + `aria-live` (English plural) |

An audit of `src/` confirms search is the *only* offender — every other occurrence of "placeholder" refers to the skeleton-loading concept, not text, and every `aria-label` write reads from consumer config.

---

## What the specs say about language

The instinct that a library shouldn't hardcode language is backed by the accessibility standards.

### ARIA inherits language; it cannot tag it

`aria-label` and `aria-labelledby` are plain strings. **ARIA provides no mechanism to declare the language of an accessible name.** The language of that text is taken from the nearest `lang` attribute in the DOM — both the [Accessible Name and Description Computation](https://www.w3.org/TR/accname-1.2/) and the assistive technology's pronunciation engine rely on it. An `aria-label` is therefore *implicitly* in whatever language the surrounding document declares.

### WCAG sets the actual requirements

- **SC 3.1.1 Language of Page (Level A)** — the page's default human language must be programmatically determinable (`<html lang="…">`).
- **SC 3.1.2 Language of Parts (Level AA)** — any passage in a language *other than* the page default must be marked with its own `lang`. Accessible names exposed to assistive technology are content subject to this.
- **SC 4.1.2 Name, Role, Value (Level A)** — every interactive control must expose a non-empty accessible name.

### The implication

Put together: if a consumer ships a French page (`lang="fr"`) and our search bar injects `aria-label="Clear search"`, that English string is **untagged foreign-language content inside a French document** — an SC 3.1.2 failure — and a French screen-reader voice will pronounce it with French phonetics (garbled). The library cannot fix this from the inside: it would have to stamp `lang="en"` on each label, which is still wrong the moment the consumer localizes, and wrong for the document as a whole.

**Only the consumer knows and controls the document's `lang`.** Therefore the correct home for these strings is the consumer's code — exactly as `ariaLabel` already works.

The one nuance is the fallback. SC 4.1.2 (Level A) is a *stricter* bar than the SC 3.1.2 (Level AA) language-tagging concern: a control with **no** accessible name fails everyone, whereas an English default merely mismatches non-English documents. So shipping a working English default is more accessible than shipping none — it must simply be overridable.

---

## Policy

> **vlist ships no inline human-language strings.** All consumer-facing text is either (a) supplied by the consumer through config, or (b) isolated to a single, documented, fully-overridable default constant per plugin.

This formalizes the contract the core already honored and makes it a requirement for every current and future plugin.

---

## Design

Applied to the search plugin, the policy produces four changes. The API shape
below reflects the committee review (see *Review* at the end): a **single flat
text object** covering labels, placeholder, *and* the counter/status formatters,
with **function signatures** for the dynamic strings — not just a `labels` map.

### 1. One flat text config surface

Add an optional `text` object to `SearchPluginConfig`, threaded into the bar and
the counter. The consumer — who owns the document `lang` — supplies localized
text. This is the same contract the core uses for `ariaLabel`. Static strings
are plain values; dynamic counter text uses formatter functions, so
pluralization and ordering stay in the consumer's closure (no template-string
parsing, no embedded English grammar):

```ts
interface SearchText {
  /** Input placeholder + accessible name. */
  placeholder?: string;
  /** Accessible name for the clear (×) button. */
  clear?: string;
  /** Accessible name for the previous-match button (navigate mode). */
  previous?: string;
  /** Accessible name for the next-match button (navigate mode). */
  next?: string;
  /** Counter text when there are no matches. */
  noResults?: string;
  /** Counter text in filter mode: total match count. */
  results?: (count: number) => string;
  /** Counter text in navigate mode: current position within matches. */
  position?: (current: number, total: number) => string;
}

interface SearchPluginConfig {
  // …existing options…
  /** Localized UI text. Falls back to English defaults (see DEFAULT_SEARCH_TEXT). */
  text?: SearchText;
}
```

A single flat object is preferred over splitting into `labels` + `formatters`:
the surface is small, and one object means future audits have exactly **one
place** to inspect for language.

### 2. English survives only as one isolated default constant

Keep working, screen-reader-correct defaults (so we never fail SC 4.1.2), but
collect them into a single marked constant — the lone i18n surface — instead of
scattering literals across `searchbar.ts` and `plugin.ts`:

```ts
/**
 * Default English UI text for the search plugin.
 * This is the ONLY human-language text in the library. Consumers localizing
 * for a non-English document MUST override these via `text` and set `lang`
 * on the page (see RFC-010).
 */
const DEFAULT_SEARCH_TEXT: Required<SearchText> = {
  placeholder: "Search…",
  clear: "Clear search",
  previous: "Previous match",
  next: "Next match",
  noResults: "No results",
  results: (n) => `${n} result${n === 1 ? "" : "s"}`,
  position: (current, total) => `${current} of ${total}`,
};
```

### 3. Drop strings we don't need

- The **leading magnifier** only refocuses the input, which is already the
  meaningful, labeled control. Per the review, make it a **decorative
  non-button element** (a `<span aria-hidden="true">`), not an `aria-hidden`
  focusable button — removing it from the tab order *and* the accessible-name
  set. One fewer string, one fewer tab stop.
- The redundant root `aria-label="Search list"` is removed. `role="search"`
  already establishes the landmark; the landmark is left **unnamed by default**.
  Note this is *not* the same as the list's `ariaLabel`: that label names the
  list/listbox container, not the separate `role="search"` region, so it cannot
  be reused to name the landmark. If named search landmarks matter (e.g.
  multiple search regions on a page), we expose an optional localized region
  label rather than inventing one.
- The **input's** accessible name continues to come from `placeholder`, now part
  of the documented `text` surface.

The localizable set is thus **seven entries in one object** — `placeholder`,
`clear`, `previous`, `next`, `noResults`, `results()`, `position()` — down from
the nine scattered literals in the inventory above (the root label and the
magnifier label are eliminated, not relocated).

### 4. Documentation

The search plugin doc gains an **i18n** section showing the `labels` option, stating that non-English pages must pass localized labels and set `lang`, with a one-line WCAG 3.1.2 / 4.1.2 rationale.

---

## Convention for future plugins

This becomes a standing rule, to be noted in the project conventions:

- **Never inline human text in a plugin.** No literal accessible names, button text, or messages in `*.ts`.
- If a plugin needs text, expose a single flat `text` config object and a single `DEFAULT_*_TEXT` constant. Use formatter functions (`(n) => string`) for any dynamic/pluralized text.
- Prefer removing the need for a string (decorative `aria-hidden`, reusing `role`, reusing the consumer's `ariaLabel`) over adding one.
- Visible copy always comes from the consumer's `template`.

---

## Scope

**In scope:** the search plugin's hardcoded strings; the library-wide policy; the future-plugin convention; the search plugin doc i18n note.

**Out of scope:** a full i18n framework (locale negotiation, message catalogs, pluralization, ICU formatting). vlist does not need one — the text surface is seven entries in one object, and the formatter functions let the consumer handle their own pluralization. If a future plugin ever needs rich localized formatting, that warrants its own RFC.

---

## Migration & impact

- **API:** purely additive — one optional `text` field on `SearchPluginConfig`. No breaking change.
- **Default behavior:** unchanged for English consumers (same accessible names, same placeholder, same counter text). One behavior tweak: the magnifier stops being a tab stop (it was a redundant one).
- **Bundle:** negligible — strings move from inline literals to one constant; no new machinery.
- **Consumers:** non-English apps gain a correct localization path; English apps need do nothing.

---

## Alternatives considered

**Zero defaults (no English at all).** Truly removes language from the library, but leaves the clear/prev/next buttons with empty accessible names when a consumer forgets to configure — an SC 4.1.2 (Level A) failure, which is stricter than the language-mismatch concern it avoids. Rejected: degrades a11y for everyone to satisfy a purity goal.

**Per-attribute `lang` tagging.** Stamp `lang="en"` on each default label. Does not help — it is still wrong for the document and wrong once localized, and ARIA has no per-name language override anyway. Rejected.

**Full i18n framework.** Message catalogs, locale resolution, formatting. Disproportionate to a seven-entry surface and adds bytes and complexity to a zero-dependency library. The formatter-function approach gives consumers pluralization/ordering control without any framework. Rejected for now; revisit only if a future plugin demands it.

---

## Resolved questions

These were open in the first draft and settled by the committee review:

1. **Placeholder default.** *Resolved:* keep the English default (`"Search…"`) inside `DEFAULT_SEARCH_TEXT`. Making it required adds friction for the majority who never localize; an overridable default is the ergonomic, accessible choice.
2. **Text shape.** *Resolved:* one flat `text` object covering labels, placeholder, and counter formatters — not split `labels` / `formatters`. Dynamic strings use function signatures.
3. **Convention home.** *Resolved:* the no-inline-text rule lives in a repo-level `CONTRIBUTING.md` (or equivalent contributor guidelines) so all future contributions are bound by it; cross-referenced from `CLAUDE.md`.

---

## Review

Reviewed by the AI committee in [discussion #103](https://github.com/floor/vlist/discussions/103). Both **GPT (Codex)** and **Antigravity** endorsed adopting the policy, and both independently raised the same amendment — the **counter/status text** (`No results`, `1 of 3`, `N results`) is consumer-facing language *and* `aria-live` content, and was missing from the first draft's scope. This revision folds that in: the API broadened from a `labels` map to a single flat `SearchText` object with formatter functions for the dynamic strings, and the open questions were resolved per the consensus above. The magnifier-as-decorative-element and unnamed-landmark-by-default points are also incorporated.

---

## Decision

Reviewed and revised; ready to implement. **Adopt the policy**, implement the search-plugin changes (single `text` config + `DEFAULT_SEARCH_TEXT` constant covering labels/placeholder/counter formatters + decorative non-button magnifier + drop root label), document the i18n surface, and record the convention in `CONTRIBUTING.md`.
