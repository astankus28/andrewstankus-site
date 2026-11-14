// GET /api/photos?folder=<name>  →  list of photos in that R2 folder, in file-name order.
// The R2 bucket is bound to this Pages project as PHOTOS (Settings → Bindings).
const PUBLIC = 'https://photos.andrewstankus.com/';
const IMG = /\.(jpe?g|png|webp|avif)$/i;

export async function listFolder(env, folder) {
  const prefix = folder.replace(/^\/+|\/+$/g, '') + '/';
  const keys = [];
  let cursor;
  do {
    const page = await env.PHOTOS.list({ prefix, cursor, limit: 1000 });
    for (const o of page.objects) if (IMG.test(o.key)) keys.push(o.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return keys.map(k => PUBLIC + k.split('/').map(encodeURIComponent).join('/'));
}

export async function onRequestGet({ request, env }) {
  const folder = new URL(request.url).searchParams.get('folder') || '';
  if (!folder || folder.includes('..')) return Response.json({ error: 'folder required' }, { status: 400 });
  const photos = await listFolder(env, folder);
  return Response.json({ folder, photos }, { headers: { 'Cache-Control': 'public, max-age=300' } });
}
