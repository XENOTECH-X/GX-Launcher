// GX Launcher - Cloudflare Worker
//
// Static files are served straight from Workers Static Assets (./dist). The
// Worker only runs when a request misses the asset store, which is exactly the
// case for game files larger than Cloudflare's 25 MiB per-asset limit.
// scripts/build.mjs splits those into parts under /__chunks/ and records them
// in /__chunks/manifest.json; this Worker streams the parts back together so
// every URL that works on main works here, byte-for-byte.

const MANIFEST_PATH = '/__chunks/manifest.json';

let manifestPromise;

function loadManifest(env, url) {
  if (!manifestPromise) {
    manifestPromise = env.ASSETS.fetch(new Request(new URL(MANIFEST_PATH, url)))
      .then((res) => {
        if (!res.ok) throw new Error(`manifest HTTP ${res.status}`);
        return res.json();
      })
      .catch((err) => {
        manifestPromise = undefined; // retry on the next request
        throw err;
      });
  }
  return manifestPromise;
}

function decodePath(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return pathname;
  }
}

// Mirrors the asset store's "auto-trailing-slash" behaviour for split files.
function lookup(manifest, url) {
  const path = decodePath(url.pathname);
  if (manifest[path]) return { entry: manifest[path] };
  if (path.endsWith('/') && manifest[path + 'index.html']) {
    return { entry: manifest[path + 'index.html'] };
  }
  if (!path.endsWith('/') && manifest[path + '/index.html']) {
    const to = new URL(url);
    to.pathname = url.pathname + '/';
    return { redirect: to };
  }
  if (!path.endsWith('/') && manifest[path + '.html']) {
    return { entry: manifest[path + '.html'] };
  }
  return null;
}

// Parses a single "bytes=a-b" range. Returns null for no/unsupported range,
// or false when the range cannot be satisfied.
function parseRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  let start;
  let end;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (suffix === 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) return false;
  return { start, end };
}

function partRequest(url, entry, i) {
  return new Request(new URL(`/__chunks/${entry.id}/${i}.bin`, url));
}

async function fetchPart(env, url, entry, i) {
  const res = await env.ASSETS.fetch(partRequest(url, entry, i));
  if (!res.ok || !res.body) throw new Error(`chunk ${entry.id}/${i} HTTP ${res.status}`);
  return res.body;
}

// Streams bytes [start, end] of the original file into `writable`.
async function pump(env, url, entry, start, end, writable) {
  try {
    let offset = 0;
    for (let i = 0; i < entry.parts.length && offset <= end; i++) {
      const partStart = offset;
      const partEnd = offset + entry.parts[i] - 1;
      offset += entry.parts[i];
      if (partEnd < start) continue;

      const body = await fetchPart(env, url, entry, i);

      if (partStart >= start && partEnd <= end) {
        // Whole part is needed: let the runtime pipe it natively.
        await body.pipeTo(writable, { preventClose: true });
        continue;
      }

      // Partial part (only happens for Range requests): slice in JS.
      const from = Math.max(start, partStart) - partStart;
      const to = Math.min(end, partEnd) - partStart + 1;
      const reader = body.getReader();
      const writer = writable.getWriter();
      let pos = 0;
      try {
        while (pos < to) {
          const { done, value } = await reader.read();
          if (done) break;
          const s = Math.max(from - pos, 0);
          const e = Math.min(to - pos, value.byteLength);
          if (e > s) await writer.write(value.subarray(s, e));
          pos += value.byteLength;
        }
      } finally {
        writer.releaseLock();
        reader.cancel().catch(() => {});
      }
    }
    await writable.close();
  } catch (err) {
    await writable.abort(err).catch(() => {});
  }
}

async function serveSplit(request, env, ctx, url, entry) {
  const headers = new Headers({
    'content-type': entry.type,
    'accept-ranges': 'bytes',
    'etag': entry.etag,
    'cache-control': 'public, max-age=0, must-revalidate',
  });

  const inm = request.headers.get('if-none-match');
  if (inm && inm.split(',').some((t) => t.trim().replace(/^W\//, '') === entry.etag)) {
    return new Response(null, { status: 304, headers });
  }

  let start = 0;
  let end = entry.size - 1;
  let status = 200;

  const ifRange = request.headers.get('if-range');
  const range = !ifRange || ifRange === entry.etag
    ? parseRange(request.headers.get('range'), entry.size)
    : null;
  if (range === false) {
    headers.set('content-range', `bytes */${entry.size}`);
    return new Response(null, { status: 416, headers });
  }
  if (range) {
    ({ start, end } = range);
    status = 206;
    headers.set('content-range', `bytes ${start}-${end}/${entry.size}`);
  }

  const length = end - start + 1;

  if (request.method === 'HEAD') {
    headers.set('content-length', String(length));
    return new Response(null, { status, headers });
  }

  const { readable, writable } = new FixedLengthStream(length);
  ctx.waitUntil(pump(env, url, entry, start, end, writable));
  return new Response(readable, { status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET' || request.method === 'HEAD') {
      let manifest;
      try {
        manifest = await loadManifest(env, url);
      } catch (err) {
        console.error('GX: could not load chunk manifest', err);
        manifest = {};
      }
      const hit = lookup(manifest, url);
      if (hit?.redirect) return Response.redirect(hit.redirect.toString(), 307);
      if (hit?.entry) return serveSplit(request, env, ctx, url, hit.entry);
    }

    return env.ASSETS.fetch(request);
  },
};
