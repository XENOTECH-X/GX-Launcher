// Builds the static-asset directory that Cloudflare Workers uploads (./dist).
//
// Cloudflare Workers Static Assets rejects any single file larger than 25 MiB,
// but many game builds (index.html, assets.epk, classes.js, ...) are 25-100 MB.
// Rather than dropping them from the deploy, every oversized file is split into
// 20 MiB parts under dist/__chunks/ and listed in dist/__chunks/manifest.json.
// worker/index.js stitches the parts back together at request time, so the
// browser receives byte-for-byte the same file it would get from main.
//
// Everything else is hard-linked (or copied) into dist/ unchanged.

import { createHash } from 'node:crypto';
import {
  closeSync, copyFileSync, linkSync, mkdirSync, openSync, readSync,
  readdirSync, rmSync, statSync, writeFileSync, writeSync,
} from 'node:fs';
import { dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'dist');
const CHUNK_DIR = '__chunks';

const MAX_ASSET_BYTES = 25 * 1024 * 1024; // Cloudflare per-file limit
const PART_BYTES = 20 * 1024 * 1024;      // size of each split part

// Repo files that are deploy tooling, not website content.
const EXCLUDE = new Set([
  '.git', '.github', '.wrangler', 'node_modules', 'dist', 'worker', 'scripts',
  'wrangler.jsonc', 'package.json', 'package-lock.json', '.gitignore',
  '.assetsignore',
]);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.jar': 'application/java-archive',
};

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (dir === ROOT && EXCLUDE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

function place(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  try {
    linkSync(src, dest);
  } catch {
    copyFileSync(src, dest);
  }
}

function split(src, size, id) {
  const dir = join(OUT, CHUNK_DIR, id);
  mkdirSync(dir, { recursive: true });
  const parts = [];
  const buf = Buffer.allocUnsafe(PART_BYTES);
  const fd = openSync(src, 'r');
  try {
    for (let offset = 0, i = 0; offset < size; i++) {
      const len = Math.min(PART_BYTES, size - offset);
      let read = 0;
      while (read < len) read += readSync(fd, buf, read, len - read, offset + read);
      const out = openSync(join(dir, `${i}.bin`), 'w');
      try { writeSync(out, buf, 0, len); } finally { closeSync(out); }
      parts.push(len);
      offset += len;
    }
  } finally {
    closeSync(fd);
  }
  return parts;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const manifest = {};
let plain = 0;

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const { size } = statSync(file);

  if (size <= MAX_ASSET_BYTES) {
    place(file, join(OUT, rel));
    plain++;
    continue;
  }

  const id = createHash('sha256').update(rel).digest('hex').slice(0, 32);
  const parts = split(file, size, id);
  manifest['/' + rel] = {
    id,
    size,
    parts,
    type: TYPES[extname(rel).toLowerCase()] || 'application/octet-stream',
    etag: `"${createHash('sha256').update(rel + ':' + size + ':' + parts.join(',')).digest('hex').slice(0, 32)}"`,
  };
  console.log(`split ${rel} (${(size / 1048576).toFixed(1)} MiB) -> ${parts.length} parts`);
}

mkdirSync(join(OUT, CHUNK_DIR), { recursive: true });
writeFileSync(join(OUT, CHUNK_DIR, 'manifest.json'), JSON.stringify(manifest));

console.log(`dist ready: ${plain} files as-is, ${Object.keys(manifest).length} files split into chunks`);
