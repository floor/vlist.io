// Mirror the demo photos: one backup pull per id, then every WebP box derived
// from that backup.
//
//   bun run scripts/mirror-photos.mjs backup   # the heavy run: one picture per id
//   bun run scripts/mirror-photos.mjs derive   # every 1x/2x box, from the backup
//   bun run scripts/mirror-photos.mjs          # both
//
// `backup` pulls each used id ONCE from picsum at the photo's native aspect with
// the long side capped to 2560 px, re-encodes it as JPEG q85 and keeps it in
// PHOTOS_BACKUP_DIR with a manifest (bytes and sha256 per file) — so the site's
// whole WebP set can be regenerated without picsum. A miss falls back to the
// photo's Unsplash slug at w=2560, then to the largest usable Wayback copy, and
// is otherwise listed as waiting. Resumable: an id whose file still matches its
// recorded sha256 is skipped.
//
// `derive` reads the backup, centre-crops each box the demos request (cover, so
// it matches picsum's own centre crop and is scale-invariant), and writes the
// 1x and 2x WebP q80 files plus manifest.json and README.md into PHOTOS_DIR.
//
// One-off: never runs in CI or at site runtime. Not a module the site imports.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { PHOTOS } from "../src/data/lorem-picsum.js";
import { boxesFor, usedIds } from "./photo-boxes.mjs";

const ROOT = resolve(import.meta.dir, "..");
const BACKUP_DIR =
  process.env.PHOTOS_BACKUP_DIR || resolve(ROOT, "..", "vlist-io-photos-backup");
const PHOTOS_DIR =
  process.env.PHOTOS_DIR || resolve(ROOT, "..", "vlist-io-photos");
const BACKUP_MANIFEST = join(BACKUP_DIR, "manifest.json");
const BACKUP_LONG_SIDE = 2560;
const BACKUP_QUALITY = 85;
const WEBP_QUALITY = 80;
const CONCURRENCY = Number(process.env.MIRROR_CONCURRENCY || 3);
const START_SPACING_MS = Number(process.env.MIRROR_SPACING_MS || 100);

const byId = new Map(PHOTOS.map((photo) => [photo.id, photo]));

const argv = new Set(process.argv.slice(2));
const force = argv.has("--force");
const runBackup = argv.has("backup") || argv.size === 0;
const runDerive = argv.has("derive") || argv.size === 0;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));
const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

function readManifest(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return { ids: {}, waiting: [] };
  }
}

function writeJson(path, value) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

// =============================================================================
// Backup — one picture per id
// =============================================================================

/** The native aspect with the long side capped: what to ask picsum for. */
function cappedSize(photo) {
  const scale = Math.min(1, BACKUP_LONG_SIDE / Math.max(photo.w, photo.h));
  return {
    w: Math.round(photo.w * scale),
    h: Math.round(photo.h * scale),
  };
}

async function download(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

/** The largest usable archived copy at either picsum host, or null. */
async function waybackLargest(id) {
  const endpoints = [
    `https://web.archive.org/cdx/search/cdx?url=picsum.photos/id/${id}/*&output=json&filter=statuscode:200&fl=timestamp,original,length`,
    `https://web.archive.org/cdx/search/cdx?url=fastly.picsum.photos/id/${id}/*&output=json&filter=statuscode:200&fl=timestamp,original,length`,
  ];
  const usable = [];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) continue;
      const rows = JSON.parse(await response.text());
      const header = rows.shift() ?? [];
      const at = (row, name) => row[header.indexOf(name)];
      for (const row of rows) {
        const original = at(row, "original");
        if (!original || /[?&](blur|grayscale)=/.test(original)) continue;
        const numbers = new URL(original).pathname
          .split("/")
          .filter(Boolean)
          .slice(2)
          .map((part) => parseInt(part, 10))
          .filter((n) => Number.isFinite(n));
        const w = numbers[0] ?? 0;
        const h = numbers[1] ?? w;
        if (w > 0) usable.push({ original, timestamp: at(row, "timestamp"), w, h });
      }
    } catch {
      // A CDX hiccup is not evidence of absence; try the other host.
    }
    await sleep(1000);
  }
  usable.sort((a, b) => b.w * b.h - a.w * a.h);
  return usable[0] ?? null;
}

async function backupOne(id) {
  const photo = byId.get(id);
  if (!photo) return { id, source: null, reason: "no metadata" };

  const { w, h } = cappedSize(photo);
  const attempts = [
    {
      source: "picsum",
      url: `https://picsum.photos/id/${id}/${w}/${h}`,
    },
  ];

  const slug = photo.url?.match(/\/photos\/([^/?#]+)/)?.[1];
  if (slug) {
    attempts.push({
      source: "unsplash",
      url: `https://unsplash.com/photos/${slug}/download?force=true&w=${BACKUP_LONG_SIDE}`,
    });
  }

  let buffer = null;
  let source = null;
  let reason = null;
  for (const attempt of attempts) {
    try {
      buffer = await download(attempt.url);
      source = attempt.source;
      break;
    } catch (error) {
      reason = error instanceof Error ? error.message : String(error);
    }
  }

  if (!buffer) {
    const archived = await waybackLargest(id);
    if (archived) {
      try {
        buffer = await download(archived.original);
        source = "wayback";
      } catch (error) {
        reason = error instanceof Error ? error.message : String(error);
      }
    }
  }

  if (!buffer) return { id, source: null, reason: reason ?? "no archived copy" };

  // JPEG q85, no resize: the aspect and the cap are already the request's.
  const jpeg = await sharp(buffer).jpeg({ quality: BACKUP_QUALITY }).toBuffer();
  const meta = await sharp(jpeg).metadata();
  const file = `${id}.jpg`;
  const path = join(BACKUP_DIR, file);
  writeFileSync(`${path}.tmp`, jpeg);
  renameSync(`${path}.tmp`, path);

  return {
    id,
    author: photo.author,
    url: photo.url,
    nativeW: photo.w,
    nativeH: photo.h,
    file,
    bytes: jpeg.length,
    sha256: sha256(jpeg),
    width: meta.width,
    height: meta.height,
    source,
    fetchedAt: new Date().toISOString(),
  };
}

async function backup() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const manifest = readManifest(BACKUP_MANIFEST);
  manifest.ids ??= {};
  manifest.waiting ??= [];

  const ids = usedIds();
  const todo = [];
  for (const id of ids) {
    const entry = manifest.ids[id];
    const path = join(BACKUP_DIR, `${id}.jpg`);
    if (!force && entry && existsSync(path) && sha256(readFileSync(path)) === entry.sha256) {
      continue;
    }
    todo.push(id);
  }

  console.log(
    `backup: ${ids.length} ids used, ${ids.length - todo.length} already in the backup, ${todo.length} to pull (concurrency ${CONCURRENCY})`,
  );

  const waiting = new Set(manifest.waiting);
  const queue = [...todo];
  let done = 0;
  let bytes = 0;

  async function worker() {
    while (queue.length > 0) {
      const id = queue.shift();
      try {
        const entry = await backupOne(id);
        if (entry.source) {
          manifest.ids[id] = entry;
          waiting.delete(id);
          bytes += entry.bytes;
        } else {
          delete manifest.ids[id];
          waiting.add(id);
          manifest.reasons ??= {};
          manifest.reasons[id] = entry.reason;
        }
      } catch (error) {
        waiting.add(id);
        manifest.reasons ??= {};
        manifest.reasons[id] = error instanceof Error ? error.message : String(error);
      }
      done++;
      if (done % 10 === 0 || done === todo.length) {
        manifest.waiting = [...waiting].sort((a, b) => a - b);
        manifest.generated = new Date().toISOString();
        writeJson(BACKUP_MANIFEST, manifest);
        console.log(`  ${done}/${todo.length} pulled (+${(bytes / 1e6).toFixed(1)} MB this run)`);
      }
      await sleep(START_SPACING_MS);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  manifest.waiting = [...waiting].sort((a, b) => a - b);
  manifest.generated = new Date().toISOString();
  writeJson(BACKUP_MANIFEST, manifest);

  const totalBytes = Object.values(manifest.ids).reduce((sum, entry) => sum + entry.bytes, 0);
  const sources = Object.values(manifest.ids).reduce((counts, entry) => {
    counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    return counts;
  }, {});
  console.log(
    `backup done: ${Object.keys(manifest.ids).length} files, ${(totalBytes / 1e6).toFixed(1)} MB, sources ${JSON.stringify(sources)}, waiting ${manifest.waiting.length}`,
  );
  if (manifest.waiting.length) console.log(`waiting: ${manifest.waiting.join(", ")}`);
  return manifest;
}

// =============================================================================
// Derive — every 1x/2x box, from the backup
// =============================================================================

async function derive() {
  const backupManifest = readManifest(BACKUP_MANIFEST);
  const photosRoot = join(PHOTOS_DIR, "photos");
  mkdirSync(photosRoot, { recursive: true });

  const ids = usedIds();
  const manifest = { generated: null, photos: {} };
  const written = new Set();
  let files = 0;
  let bytes = 0;

  for (const id of ids) {
    const entry = backupManifest.ids?.[id];
    const backupPath = join(BACKUP_DIR, `${id}.jpg`);
    if (!entry || !existsSync(backupPath)) {
      manifest.photos[id] = { files: [], missing: "not in the backup" };
      continue;
    }

    const box = boxesFor(id);
    const photoFiles = [];

    for (const { w, h } of box) {
      for (const scale of [1, 2]) {
        const width = w * scale;
        const height = h * scale;
        const name = `${id}-${width}x${height}.webp`;
        const path = join(photosRoot, name);
        written.add(name);
        photoFiles.push(`photos/${name}`);

        if (!force && existsSync(path)) {
          bytes += statSync(path).size;
          files++;
          continue;
        }
        // cover + centre: the same crop picsum makes, at any source scale.
        const webp = await sharp(backupPath)
          .resize(width, height, { fit: "cover", position: "centre" })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();
        writeFileSync(`${path}.tmp`, webp);
        renameSync(`${path}.tmp`, path);
        files++;
        bytes += webp.length;
      }
    }

    manifest.photos[id] = {
      // One id can ask for the same file twice (a 1x box that equals another
      // box's 2x): name it once.
      files: [...new Set(photoFiles)].sort(),
      author: entry.author,
      url: entry.url,
      nativeW: entry.nativeW,
      nativeH: entry.nativeH,
      source: entry.source,
    };
    if (files % 200 === 0) console.log(`  ${files} files, ${(bytes / 1e6).toFixed(1)} MB`);
  }

  // A box the pages no longer request leaves a stale file behind: drop it, so
  // the repo holds exactly what the manifest names.
  let removed = 0;
  for (const name of readdirSync(photosRoot)) {
    if (!name.endsWith(".webp") || written.has(name)) continue;
    unlinkSync(join(photosRoot, name));
    removed++;
  }

  const missing = Object.entries(manifest.photos)
    .filter(([, photo]) => photo.files.length === 0)
    .map(([id]) => Number(id));
  manifest.generated = new Date().toISOString();
  manifest.missing = missing.sort((a, b) => a - b);
  writeJson(join(PHOTOS_DIR, "manifest.json"), manifest);
  writeFileSync(join(PHOTOS_DIR, "README.md"), readme(Object.keys(manifest.photos).length, files));

  // The site keeps its own copy of just the file names: the test that holds the
  // set to the boxes the pages request runs in CI, where the photo files (a
  // separate repository) are not checked out.
  const siteManifest = { generated: manifest.generated, photos: {} };
  for (const [id, photo] of Object.entries(manifest.photos)) {
    siteManifest.photos[id] = { files: photo.files };
  }
  writeJson(join(ROOT, "src/data/photos-manifest.json"), siteManifest);

  console.log(
    `derive done: ${files} files (${written.size} names), ${(bytes / 1e6).toFixed(1)} MB, ${removed} stale removed, ${missing.length} ids without a backup`,
  );
  return manifest;
}

function readme(ids, files) {
  return `# vlist.io demo photos

The pictures the vlist.io examples show, mirrored from [Lorem Picsum](https://picsum.photos)
(the demo ids are picsum ids) and derived from the original photos on Unsplash.

Every photo is here as WebP q80 at the sizes the demos request: \`photos/<id>-<w>x<h>.webp\`
at 1x, where the 1x boxes are centre crops of the photos' native aspect (card 300x225,
album detail 400x300, carousel slides 800x500 / 600x800 / long side 600, carousel detail
long side 300) and the 2x files double each box. \`manifest.json\` lists, per id, the files,
the photographer, the Unsplash page and the photo's native size.

The photos are used under the [Unsplash License](https://unsplash.com/license); credit is in
the manifest and shown on vlist.io as "Photo by <author> on Unsplash" with a link to the
photo's page.

To regenerate the set (needs the JPEG backup of the original photos, not in this repo):

    bun run scripts/mirror-photos.mjs derive

in a checkout of vlist.io, with \`PHOTOS_DIR\` pointing here and \`PHOTOS_BACKUP_DIR\` at the
backup. Nothing in this repository is generated by the site at runtime.
`;
}

// =============================================================================
// Run
// =============================================================================

if (runBackup) await backup();
if (runDerive) await derive();
