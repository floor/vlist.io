// Experiments use the same Eta, navigation, shell loading and response pipeline
// as docs/examples. Only their input drivers and test surfaces are independent.
import { resolve } from "path";
import { render, loadNavigation, type TemplateData } from "../config/eta";
import { loadShell, clearShellCache } from "./base";
import { htmlHeaders } from "../cache";
import { SITE, IS_PROD } from "./config";

function template(path: string): string {
  if (!IS_PROD) clearShellCache(path);
  return loadShell(resolve(path));
}

export function resolveExperiment(pathname: string): Response | null {
  const root = "/experiments/synthetic/";
  const native = pathname === `${root}native/` || pathname === `${root}native/index.html`;
  if (!native && pathname !== root && pathname !== `${root}index.html`) return null;

  const data: TemplateData = {
    TITLE: native ? "Native runway comparison — vlist" : "Synthetic scroll experiment — vlist",
    DESCRIPTION: "RFC-013 device experiment: test logical scrolling, gesture ownership and touch inertia on iOS and Android.",
    URL: `${SITE}${root}${native ? "native/" : ""}`,
    SECTION: "Experiments",
    SECTION_LINK: root,
    SECTION_KEY: null,
    SIDEBAR: `<div class="sidebar__group"><div class="sidebar__label">RFC-013</div><a class="sidebar__link sidebar__link--active" href="${root}">Synthetic touch</a><a class="sidebar__link" href="${root}native/">Native runway</a></div>`,
    CONTENT: "",
    EXTRA_STYLES: `<link rel="stylesheet" href="${root}styles.css">`,
    EXTRA_HEAD: '<meta name="robots" content="noindex">',
    EXTRA_BODY: `<script type="module" src="${root}app.mjs"></script>`,
    MAIN_CLASS: " experiment-page",
    OG_TYPE: "website",
    OG_SITE_NAME: "vlist",
    TWITTER_CARD: "summary",
    SEO_ENHANCED: false,
    HAS_LIST: false,
    HAS_IMPORTMAP: false,
    HAS_TOC: false,
    HAS_SYNTAX_HIGHLIGHTING: false,
    LAZY_SYNTAX_HIGHLIGHTING: false,
    HAS_ACTIVE_NAV: false,
    HAS_SOURCE_TABS: false,
    PAGE_ATTR: "synthetic-experiment",
    NAV_ITEMS: loadNavigation(),
    TOC: "",
  };

  // The full-viewport native comparison deliberately retains its isolated shell:
  // its content box is the native momentum measurement apparatus.
  const html = native
    ? render(template("experiments/synthetic/native/index.eta"), data)
    : render(template("src/server/shells/base.html"), {
        ...data,
        CONTENT: render(template("experiments/synthetic/index.eta"), data),
      });
  const headers = new Headers(htmlHeaders());
  headers.set("Cache-Control", "no-store");
  return new Response(html, { headers });
}
