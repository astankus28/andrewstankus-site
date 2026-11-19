// GET /api/photos?folder=<name>  →  list of photos in that R2 folder, in file-name order.
// The R2 bucket is bound to this Pages project as PHOTOS (Settings → Bindings).
const PUBLIC = 'https://photos.andrewstankus.com/';
const IMG = /\.(jpe?g|png|webp|avif)$/i;

export async function listFolder(env, folder) {
  const prefix = folder.replace(/^\/+|\/+$/g, '') + '/';
  // Private client galleries (_proofing/…) are never listed here; see functions/_lib/proofing.js.
  if (prefix.startsWith('_') || prefix === '/') return [];
  const keys = [];
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1000 });
    for (const o of page.objects) if (IMG.test(o.key)) keys.push({ key: o.key, v: (o.etag || '').replace(/"/g, '').slice(0, 8) });
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  keys.sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
  // ?v=<etag> changes whenever a photo is replaced, so browsers and the CDN never show a stale copy.
  return keys.map(({ key, v }) => PUBLIC + key.split('/').map(encodeURIComponent).join('/') + (v ? `?v=${v}` : ''));
}

// Width/height of a JPEG from its first bytes (SOF marker), so the gallery can reserve space before photos load.
function jpegSize(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 0xFF || b[1] !== 0xD8) return null;
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    if ((m >= 0xC0 && m <= 0xCF) && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return [(b[i + 7] << 8) | b[i + 8], (b[i + 5] << 8) | b[i + 6]];
    }
    i += 2 + len;
  }
  return null;
}

async function sizesFor(env, urls) {
  const out = new Array(urls.length).fill(null);
  for (let s = 0; s < urls.length; s += 40) {
    await Promise.all(urls.slice(s, s + 40).map(async (u, j) => {
      try {
        const key = decodeURIComponent(u.slice(PUBLIC.length).split('?')[0]);
        if (!/\.jpe?g$/i.test(key)) return;
        const obj = await env.PHOTOS.get(key, { range: { offset: 0, length: 131072 } });
        if (obj) out[s + j] = jpegSize(await obj.arrayBuffer());
      } catch (e) {}
    }));
  }
  return out;
}

export async function onRequestGet({ request, env, waitUntil }) {
  const folder = new URL(request.url).searchParams.get('folder') || '';
  if (!folder || folder.includes('..')) return Response.json({ error: 'folder required' }, { status: 400 });
  const photos = await listFolder(env, folder);
  // Sizes are cached per exact photo list (URLs carry each photo's version), so they're read from R2 only once.
  const sig = photos.join('|');
  let h = 0; for (let i = 0; i < sig.length; i++) h = (h * 31 + sig.charCodeAt(i)) | 0;
  const cacheKey = new Request(`https://cache.internal/photo-sizes/${encodeURIComponent(folder)}/${h >>> 0}`);
  const cache = caches.default;
  let sizes = null;
  const hit = await cache.match(cacheKey);
  if (hit) sizes = await hit.json();
  if (!sizes || sizes.length !== photos.length) {
    sizes = await sizesFor(env, photos);
    waitUntil(cache.put(cacheKey, new Response(JSON.stringify(sizes), { headers: { 'Cache-Control': 'public, max-age=2592000' } })));
  }
  return Response.json({ folder, photos, sizes }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
