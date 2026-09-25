// src/server/versions.ts
// Documentation versions. The current docs (v3) live at /docs and /tutorials; the archived
// v1 and v2 docs live under /docs/v1, /docs/v2, /tutorials/v1 and /tutorials/v2.
//
// Pure helpers shared by the version switcher, canonical tags, archive redirects, search
// and the sitemap. v2 and v3 share page slugs; v1 slugs map through version-map.ts.

import {
  MATCH_VERSION_SLUGS,
  V1_TO_V2_DOCS,
  V1_TO_V2_TUTORIALS,
  V2_TO_V1_DOCS,
  V2_TO_V1_TUTORIALS,
} from "./version-map";

export type DocVersion = "v1" | "v2" | "v3";
export type DocSection = "/docs" | "/tutorials";

/** Valid page slugs of every version, for one section. */
export type SlugSets = Readonly<Record<DocVersion, ReadonlySet<string>>>;

/** Versions in switcher order. */
export const DOC_VERSIONS: readonly DocVersion[] = ["v1", "v2", "v3"];

/** The version served at /docs and /tutorials. */
export const CURRENT_DOC_VERSION: DocVersion = "v3";

const ARCHIVE_PATH_RE = /^\/(?:docs|tutorials)\/(v1|v2)(?:\/|$)/;

/** The docs version a path belongs to. Paths outside the archives are current. */
export function versionFromPath(path: string): DocVersion {
  const match = path.match(ARCHIVE_PATH_RE);
  return match ? (match[1] as DocVersion) : CURRENT_DOC_VERSION;
}

/** URL of a page, or of the version overview when `slug` is null. */
export function versionUrl(section: DocSection, version: DocVersion, slug: string | null): string {
  const base = version === CURRENT_DOC_VERSION ? section : `${section}/${version}`;
  return slug ? `${base}/${slug}` : `${base}/`;
}

/**
 * The slug of the same page in another version, or null when that version has no such page.
 * v2 and v3 share slugs; v1 goes through the v1 slug map.
 */
export function mapSlug(
  section: DocSection,
  from: DocVersion,
  to: DocVersion,
  slug: string,
  slugs: SlugSets,
): string | null {
  let mapped: string | undefined;
  if (from === to) {
    mapped = slug;
  } else if (from === "v1") {
    mapped = (section === "/docs" ? V1_TO_V2_DOCS : V1_TO_V2_TUTORIALS)[slug];
  } else if (to === "v1") {
    mapped = (section === "/docs" ? V2_TO_V1_DOCS : V2_TO_V1_TUTORIALS)[slug];
  } else {
    mapped = slug;
  }
  return mapped !== undefined && slugs[to].has(mapped) ? mapped : null;
}

/**
 * The v1 / v2 / v3 segmented switcher. The active version links to its overview; the others
 * link to the same page when it exists there, otherwise to their overview.
 */
export function buildVersionSwitcher(
  section: DocSection,
  version: DocVersion,
  slug: string | null,
  slugs: SlugSets,
  matchSlugs: boolean = MATCH_VERSION_SLUGS,
): string {
  let links = "";
  for (const target of DOC_VERSIONS) {
    let href = versionUrl(section, target, null);
    if (slug && matchSlugs && target !== version) {
      const mapped = mapSlug(section, version, target, slug, slugs);
      if (mapped) href = versionUrl(section, target, mapped);
    }
    const active = target === version ? " ui-segmented__btn--active" : "";
    links += `<a href="${href}" class="ui-segmented__btn${active}">${target}</a>`;
  }
  return `<div class="ui-segmented version-switcher">${links}</div>`;
}

/**
 * Canonical path for an archived page: the current page when it exists, otherwise (for v1)
 * the v2 page. Current pages and overviews keep their own URL (null).
 */
export function canonicalPath(
  section: DocSection,
  version: DocVersion,
  slug: string | null,
  slugs: SlugSets,
): string | null {
  if (version === CURRENT_DOC_VERSION || !slug) return null;
  const current = mapSlug(section, version, CURRENT_DOC_VERSION, slug, slugs);
  if (current) return versionUrl(section, CURRENT_DOC_VERSION, current);
  if (version === "v1") {
    const v2 = mapSlug(section, "v1", "v2", slug, slugs);
    if (v2) return versionUrl(section, "v2", v2);
  }
  return null;
}

/** The `version` query parameter of /api/search. Anything but an archive means current. */
export function parseSearchVersion(value: string | null): DocVersion {
  return value === "v1" || value === "v2" ? value : CURRENT_DOC_VERSION;
}
