/**
 * Deterministic placeholder art for the examples' generated images.
 *
 * A photo id decides everything: the gradient hue, the three circles, the
 * rotated frame and — printed on the picture — the id itself. So a slide or a
 * card is visibly distinct from its neighbours, and regenerating produces the
 * same bytes. No download, no licensed photo.
 *
 * Geometry is proportional to the canvas, so one builder covers the sizes the
 * examples ask for (the carousel's 800x500, the photo album's 400x300), and the
 * caption and the id sit on the centre line so that a crop — a portrait card
 * with object-fit: cover keeps only part of a landscape file — never cuts them.
 */

export const escapeXml = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c],
  );

/** xorshift32 over the photo id: same id, same shapes. */
export function rng(seed) {
  let x = (seed * 2654435761) >>> 0 || 1;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

/**
 * One SVG for one photo id.
 *
 * @param {object} options
 * @param {number} options.picId   the photo id — decides the whole picture
 * @param {number} options.width   canvas width in px
 * @param {number} options.height  canvas height in px
 * @param {string} options.title   what the SVG's <title> says the picture is
 */
export function placeholderSvg({ picId, width, height, title }) {
  const hue = (picId * 137.508) % 360;
  const hue2 = (hue + 42) % 360;
  const next = rng(picId);

  const circles = Array.from({ length: 3 }, () => {
    const cx = Math.round(width * (0.075 + next() * 0.85));
    const cy = Math.round(height * (0.12 + next() * 0.76));
    const r = Math.round(width * (0.0625 + next() * 0.1875));
    const fill = next() > 0.5 ? "#ffffff" : "#000000";
    const opacity = (0.06 + next() * 0.09).toFixed(2);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>`;
  }).join("");

  const angle = Math.round(next() * 70 - 35);
  const cx = Math.round(width * (0.3 + next() * 0.4));
  const cy = Math.round(height * (0.34 + next() * 0.3));
  const rx = Math.round(width * (0.1375 + next() * 0.2375));
  const ry = Math.round(height * (0.16 + next() * 0.26));

  const caption = `PLACEHOLDER ${width}×${height}`;
  const captionY = Math.round(height * 0.12);
  const captionSize = Math.round(height * 0.036);
  const idY = Math.round(height * 0.58);
  const idSize = Math.round(height * 0.2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
<title>${escapeXml(title)}</title>
<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue.toFixed(1)} 62% 52%)"/>
<stop offset="1" stop-color="hsl(${hue2.toFixed(1)} 48% 24%)"/>
</linearGradient></defs>
<rect width="${width}" height="${height}" fill="url(#bg)"/>
${circles}
<rect x="${cx - rx}" y="${cy - ry}" width="${rx * 2}" height="${ry * 2}" rx="28" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="2" transform="rotate(${angle} ${cx} ${cy})"/>
<text x="${width / 2}" y="${captionY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-size="${captionSize}" letter-spacing="3" fill="rgba(255,255,255,0.72)">${caption}</text>
<text x="${width / 2}" y="${idY}" text-anchor="middle" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif" font-size="${idSize}" font-weight="700" fill="rgba(255,255,255,0.9)">${picId}</text>
</svg>
`;
}
