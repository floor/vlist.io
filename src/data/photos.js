// The demo photos: where they are served from, their 2x sources and their credit.
//
// Every picture the examples show comes from the self-hosted set first — the
// separate vlist-io-photos repository, served at /photos/<id>-<w>x<h>.webp
// (server.ts). Its file names are the id and the 1x box, with the 2x file
// doubling both sides, so a page can name both without a manifest lookup.
// When a file is not there, the page falls back to picsum and then to the photo's
// committed SVG (see watchPhoto in each example's shared.js).

import { PHOTOS, getPhotoUrl } from "./lorem-picsum.js";

const byId = new Map(PHOTOS.map((photo) => [photo.id, photo]));

export const PHOTOS_BASE = "/photos";

/** The self-hosted WebP for photo `id` at the 1x box `width`×`height`. */
export function photoUrl(id, width, height) {
  return `${PHOTOS_BASE}/${id}-${width}x${height}.webp`;
}

/** `srcset` for the box and its 2x file. */
export function photoSrcSet(id, width, height) {
  return `${photoUrl(id, width, height)} 1x, ${photoUrl(id, width * 2, height * 2)} 2x`;
}

/** The picsum URL for the same box — the chain's second step. */
export function photoPicsumUrl(id, width, height) {
  return getPhotoUrl(id, width, height);
}

/** The committed SVG every example carries — the chain's last step. */
export function photoFallbackSvg(example, id) {
  return `/examples/${example}/images/${id}.svg`;
}

/** "Photo by <author> on Unsplash": the photographer and the photo's page. */
export function photoCredit(id) {
  const photo = byId.get(id);
  return photo ? { author: photo.author, url: photo.url } : null;
}

/** A detail panel's credit line, linked to the photo's Unsplash page. */
export function photoCreditHtml(id, escape = (value) => value) {
  const credit = photoCredit(id);
  if (!credit) return "";
  return `<a class="photo-credit" href="${escape(credit.url)}" target="_blank" rel="noopener">Photo by ${escape(credit.author)} on Unsplash</a>`;
}
