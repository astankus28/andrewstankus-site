// GET /api/share?folder=<name>[&photo=<file>]  →  the photo Facebook, iMessage, LinkedIn etc. show when a page is shared.
// Facebook only shows the big full-width preview for wide photos, so this picks a horizontal one:
//   - the photo named in ?photo= (the event's "Share photo" field), if it exists in the folder
//   - otherwise the first horizontal photo in the folder (file-name order)
//   - otherwise the first photo
// The photo is served straight from R2 (no redirect) so share scrapers read it in one request.
import { listFolder } from './photos.js';

const PUBLIC = 'https://photos.andrewstankus.com/';

// Width/height of a JPEG from its first bytes (SOF marker).
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

const keyOf = (url) => decodeURIComponent(url.slice(PUBLIC.length).split('?')[0]);

async function pickKey(env, folder, photo) {
  const keys = (await listFolder(env, folder)).map(keyOf);
  if (!keys.length) return null;
  if (photo) {
    const want = photo.split('/').pop().toLowerCase();
    const hit = keys.find((k) => k.split('/').pop().toLowerCase() === want);
    if (hit) return hit;
  }
  // First horizontal JPEG, checking at most the first 60 photos.
  for (const key of keys.slice(0, 60)) {
    if (!/\.jpe?g$/i.test(key)) continue;
    try {
      const head = await env.PHOTOS.get(key, { range: { offset: 0, length: 131072 } });
      const size = head && jpegSize(await head.arrayBuffer());
      if (size && size[0] > size[1] * 1.2) return key;
    } catch (e) {}
  }
  return keys[0];
}

export async function onRequestGet({ request, env, waitUntil }) {
  const params = new URL(request.url).searchParams;
  const folder = (params.get('folder') || '').replace(/^\/+|\/+$/g, '');
  const photo = params.get('photo') || '';
  if (!folder || folder.includes('..') || photo.includes('..')) return new Response('folder required', { status: 400 });

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const key = await pickKey(env, folder, photo);
  const obj = key && await env.PHOTOS.get(key);
  if (!obj) return new Response('no photos', { status: 404 });

  const res = new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || (/\.png$/i.test(key) ? 'image/png' : /\.webp$/i.test(key) ? 'image/webp' : 'image/jpeg'),
      'Cache-Control': 'public, max-age=3600',
      'ETag': obj.httpEtag,
    },
  });
  waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
